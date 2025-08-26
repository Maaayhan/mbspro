import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { CohereClient } from 'cohere-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';

export interface RagQueryRequest { query: string; top?: number }

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private pinecone?: Pinecone;
  private pineconeIndex: any;
  private vectorStore?: PineconeStore;
  private embeddings?: OpenAIEmbeddings;
  private cohere?: CohereClient | null;

  async initIfNeeded(): Promise<void> {
    if (this.vectorStore) return;

    const indexName = process.env.PINECONE_INDEX || 'mbspro-langchain-api';
    const embedModel = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

    if (!process.env.PINECONE_API_KEY) {
      throw new Error('Missing PINECONE_API_KEY');
    }

    this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    this.pineconeIndex = this.pinecone.Index(indexName);
    this.embeddings = new OpenAIEmbeddings({ model: embedModel });
    this.vectorStore = new PineconeStore(this.embeddings, {
      pineconeIndex: this.pineconeIndex,
      namespace: 'default',
    });

    this.cohere = process.env.COHERE_API_KEY ? new CohereClient({ token: process.env.COHERE_API_KEY }) : null;
  }

  async ingestFromJsonFile(filename: string): Promise<{ chunks: number }> {
    await this.initIfNeeded();
    const fs = await import('fs');
    const path = await import('path');

    const DATA_FILE = path.resolve(process.cwd(), 'data', filename);
    if (!fs.existsSync(DATA_FILE)) {
      throw new Error(`Data file not found: ${DATA_FILE}`);
    }

    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('JSON file must contain an array');

    const docs: Document[] = data.map((item: any, idx: number) => {
      const content = item.text || JSON.stringify(item);
      return new Document({ pageContent: content, metadata: { ...item, _id: item.id || String(idx) } });
    });

    const splitter = new CharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const chunks = await splitter.splitDocuments(docs);
    await PineconeStore.fromDocuments(chunks, this.embeddings!, {
      pineconeIndex: this.pineconeIndex,
      namespace: 'default',
    });
    return { chunks: chunks.length };
  }

  async queryRag(query: string, top: number = 5) {
    await this.initIfNeeded();

    const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
    const COHERE_MODEL = process.env.COHERE_RERANK_MODEL || 'rerank-english-v3.0';
    const RERANK_CANDIDATES = Math.min(Math.max(parseInt(process.env.RERANK_CANDIDATES || '60') || 60, 5), 200);

    const topK = Math.min(Math.max(parseInt(String(top)) || 5, 1), 15);
    const candidateDocs: Document[] = await this.vectorStore!.similaritySearch(query, RERANK_CANDIDATES);

    let reranked: { doc: Document; score: number }[] = candidateDocs.map((d) => ({ doc: d, score: 0 }));
    if (this.cohere) {
      const rerankResp: any = await this.cohere.rerank({
        model: COHERE_MODEL,
        query,
        documents: candidateDocs.map((d) => ({ text: d.pageContent })),
        topN: Math.min(candidateDocs.length, Math.max(topK + 3, topK)),
      });
      const resultsArray = (rerankResp?.results || []).map((r: any) => ({ index: r.index, score: r.relevanceScore ?? r.relevance_score ?? 0 }));
      reranked = resultsArray
        .filter((r: any) => r.index >= 0 && r.index < candidateDocs.length)
        .map((r: any) => ({ doc: candidateDocs[r.index], score: r.score }))
        .sort((a: any, b: any) => b.score - a.score);
    }

    const contextLimit = Math.min(topK + 3, reranked.length);
    const source = reranked.length > 0 ? reranked : candidateDocs.map((d) => ({ doc: d, score: 0 }));
    const context = source.slice(0, contextLimit).map((r: any) => r.doc.pageContent).join('\n---\n');

    const itemBestScore = new Map<string, number>();
    for (const { doc, score } of source) {
      const meta: any = doc.metadata || {};
      const itemNum = meta.ItemNum ?? meta.itemNum ?? meta._id;
      if (itemNum === undefined || itemNum === null) continue;
      const key = String(itemNum);
      const prev = itemBestScore.get(key);
      const val = typeof score === 'number' ? score : 0;
      if (prev === undefined || val > prev) itemBestScore.set(key, val);
    }

    const llm = new ChatOpenAI({ modelName: MODEL, temperature: 0 });
    const currentDate = new Date().toISOString().split('T')[0];
    const prompt = `Return the top ${topK} most relevant MBS candidates (single items or bundles). Each must follow MBS rules (validity, no conflicts).

Current date: ${currentDate}.

Context:
${context}

Case: ${query}
Answer (JSON only):

{
  "results": [
    {
      "itemNum": "123",
      "title": "brief description",
      "match_reason": "why this bundle or item matches the query",
      "match_score": 0.0,
      "fee": "",
      "benefit": ""
    }
  ]
}`;

    const resp = await llm.invoke([{ role: 'user', content: prompt }]);
    const content = (resp as any).content as string;
    const jsonMatch = typeof content === 'string' ? content.match(/\{[\s\S]*\}/) : null;
    let parsedResults: any = null;
    if (jsonMatch) parsedResults = JSON.parse(jsonMatch[0]);
    if (!parsedResults) return { ok: true, answer: (resp as any).content };

    if (parsedResults && Array.isArray(parsedResults.results)) {
      parsedResults.results = parsedResults.results.map((item: any) => {
        const num = item.itemNum ?? item.ItemNum;
        const nums: any[] = item.itemNums || item.ItemNums;
        let score: number | null = null;
        if (num !== undefined && num !== null) {
          const key = String(num);
          score = itemBestScore.has(key) ? (itemBestScore.get(key) as number) : null;
        } else if (Array.isArray(nums) && nums.length > 0) {
          const scores = nums.map((n: any) => String(n)).map((k: string) => (itemBestScore.has(k) ? (itemBestScore.get(k) as number) : null)).filter((s: number | null) => s !== null) as number[];
          if (scores.length > 0) score = Math.max(...scores);
        }
        const formatted = typeof score === 'number' ? Number(score.toFixed(4)) : null;
        return { ...item, match_score: formatted };
      });
    }
    return { ok: true, ...parsedResults };
  }
}


