import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { CohereClient } from 'cohere-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { CharacterTextSplitter } from 'langchain/text_splitter';
// Fallback lightweight Document type to avoid optional dependency in tests
type Document = { pageContent: string; metadata?: any };

export interface RagQueryRequest { query: string; top?: number }

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private pinecone?: Pinecone;
  private pineconeIndex: any;
  private vectorStore?: PineconeStore;
  private embeddings?: OpenAIEmbeddings;
  private cohere?: CohereClient | null;
  private cache: Map<string, { expires: number; value: any }> = new Map();

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
      return { pageContent: content, metadata: { ...item, _id: item.id || String(idx) } } as Document;
    });

    const splitter = new CharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const chunks = await splitter.splitDocuments(docs as any);
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
    const RERANK_ENABLED = String(process.env.RERANK_ENABLED || 'true').toLowerCase() === 'true';
    const LLM_JSON_ENABLED = String(process.env.RAG_LLM_JSON || 'true').toLowerCase() === 'true';
    const TIMEOUT_MS = Math.min(Math.max(parseInt(process.env.RAG_TIMEOUT_MS || '4000') || 4000, 500), 15000);
    const CACHE_TTL = Math.min(Math.max(parseInt(process.env.RAG_CACHE_TTL_MS || '60000') || 60000, 0), 10 * 60 * 1000);

    const cacheKey = `${top}|${query}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > now) {
      return cached.value;
    }

    const topK = Math.min(Math.max(parseInt(String(top)) || 5, 1), 15);
    const candidateDocs: any[] = await this.vectorStore!.similaritySearch(query, RERANK_CANDIDATES);

    let reranked: { doc: any; score: number }[] = candidateDocs.map((d: any) => ({ doc: d, score: 0 }));
    if (this.cohere && RERANK_ENABLED) {
      try {
        const rerankPromise: Promise<any> = this.cohere.rerank({
          model: COHERE_MODEL,
          query,
          documents: candidateDocs.map((d) => ({ text: d.pageContent })),
          topN: Math.min(candidateDocs.length, Math.max(topK + 3, topK)),
        });
        const rerankResp: any = await Promise.race([
          rerankPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('RERANK_TIMEOUT')), TIMEOUT_MS)),
        ]);
        if (rerankResp && Array.isArray(rerankResp.results)) {
          const resultsArray = (rerankResp.results || []).map((r: any) => ({ index: r.index, score: r.relevanceScore ?? r.relevance_score ?? 0 }));
          reranked = resultsArray
            .filter((r: any) => r.index >= 0 && r.index < candidateDocs.length)
            .map((r: any) => ({ doc: candidateDocs[r.index], score: r.score }))
            .sort((a: any, b: any) => b.score - a.score);
        }
      } catch (err) {
        this.logger.warn(`Cohere rerank skipped: ${String(err)}`);
      }
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

    // If LLM JSON is disabled, or times out, fall back to vector-based results
    if (!LLM_JSON_ENABLED) {
      const fallback = this.buildResultsFromSource(source, topK, itemBestScore);
      const value = { ok: true, results: fallback };
      if (CACHE_TTL > 0) this.cache.set(cacheKey, { expires: now + CACHE_TTL, value });
      return value;
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

    let parsedResults: any = null;
    try {
      const resp: any = await Promise.race([
        llm.invoke([{ role: 'user', content: prompt }]) as any,
        new Promise((_, reject) => setTimeout(() => reject(new Error('LLM_TIMEOUT')), TIMEOUT_MS)),
      ]);
      const content = (resp as any).content as string;
      const jsonMatch = typeof content === 'string' ? content.match(/\{[\s\S]*\}/) : null;
      if (jsonMatch) parsedResults = JSON.parse(jsonMatch[0]);
    } catch (err) {
      this.logger.warn(`LLM JSON generation skipped: ${String(err)}`);
    }
    if (!parsedResults) {
      const fallback = this.buildResultsFromSource(source, topK, itemBestScore);
      const value = { ok: true, results: fallback };
      if (CACHE_TTL > 0) this.cache.set(cacheKey, { expires: now + CACHE_TTL, value });
      return value;
    }

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
    const value = { ok: true, ...parsedResults };
    if (CACHE_TTL > 0) this.cache.set(cacheKey, { expires: now + CACHE_TTL, value });
    return value;
  }

  private buildResultsFromSource(
    source: Array<{ doc: any; score: number }>,
    topK: number,
    itemBestScore: Map<string, number>,
  ) {
    const byItem: Map<string, { itemNum: string; title?: string; match_reason?: string; match_score: number | null }> = new Map();
    for (const { doc, score } of source) {
      const meta: any = doc.metadata || {};
      const itemNum = meta.ItemNum ?? meta.itemNum ?? meta._id;
      if (itemNum === undefined || itemNum === null) continue;
      const key = String(itemNum);
      const prev = byItem.get(key);
      const best = itemBestScore.has(key) ? (itemBestScore.get(key) as number) : (typeof score === 'number' ? score : 0);
      if (!prev || best > (prev.match_score ?? 0)) {
        byItem.set(key, {
          itemNum: key,
          title: meta.title || meta.Title || '',
          match_reason: (doc.pageContent || '').slice(0, 120),
          match_score: Number.isFinite(best as number) ? Number((best as number).toFixed(4)) : null,
        });
      }
    }
    return Array.from(byItem.values()).sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0)).slice(0, topK);
  }
}


