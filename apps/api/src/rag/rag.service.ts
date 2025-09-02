import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { MistralAIEmbeddings } from '@langchain/mistralai';
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
  private embeddings?: MistralAIEmbeddings | OpenAIEmbeddings;
  private cohere?: CohereClient | null;

  async initIfNeeded(): Promise<void> {
    if (this.vectorStore) return;

    const indexName = process.env.PINECONE_INDEX || 'mbspro-langchain-api';
    const embedProvider = process.env.EMBED_PROVIDER || 'mistral'; // mistral or openai
    const embedModel = embedProvider === 'mistral' 
      ? process.env.MISTRAL_EMBED_MODEL || 'mistral-embed'
      : process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

    if (!process.env.PINECONE_API_KEY) {
      throw new Error('Missing PINECONE_API_KEY');
    }

    // Initialize embeddings based on provider
    if (embedProvider === 'mistral') {
      if (!process.env.MISTRAL_API_KEY) {
        throw new Error('Missing MISTRAL_API_KEY');
      }
      this.embeddings = new MistralAIEmbeddings({
        apiKey: process.env.MISTRAL_API_KEY,
        model: embedModel,
      });
    } else {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('Missing OPENAI_API_KEY');
      }
      this.embeddings = new OpenAIEmbeddings({ model: embedModel });
    }

    this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    this.pineconeIndex = this.pinecone.Index(indexName);
    this.vectorStore = new PineconeStore(this.embeddings, {
      pineconeIndex: this.pineconeIndex,
      namespace: 'default',
    });

    this.cohere = process.env.COHERE_API_KEY ? new CohereClient({ token: process.env.COHERE_API_KEY }) : null;
    this.logger.log(
      `RAG init: pinecone index=${indexName}, embedProvider=${embedProvider}, embedModel=${embedModel}, cohere=${this.cohere ? 'on' : 'off'}`
    );
  }

  getStatus() {
    const indexName = process.env.PINECONE_INDEX || 'mbspro-langchain-api';
    const cohereModel = process.env.COHERE_RERANK_MODEL || 'rerank-english-v3.0';
    const rerankCandidates = parseInt(process.env.RERANK_CANDIDATES || '60') || 60;
    return {
      pineconeConfigured: !!process.env.PINECONE_API_KEY,
      cohereConfigured: !!process.env.COHERE_API_KEY,
      indexName,
      cohereModel,
      rerankCandidates,
    };
  }

  async ingestFromJsonFile(filename: string): Promise<{ chunks: number }> {
    await this.initIfNeeded();
    const fs = await import('fs');
    const path = await import('path');

    const DATA_FILE = path.resolve(process.cwd(), 'data', filename);
    if (!fs.existsSync(DATA_FILE)) {
      throw new Error(`Data file not found: ${DATA_FILE}`);
    }

    this.logger.log(`Starting ingestion from: ${DATA_FILE}`);
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('JSON file must contain an array');

    this.logger.log(`Processing ${data.length} items...`);

    const docs: Document[] = data.map((item: any, idx: number) => {
      // Create searchable content for MBS items
      let content = '';
      
      if (item.ItemNum) {
        // This is an MBS item
        content = `MBS Item ${item.ItemNum}\n`;
        content += `Description: ${item.Description || ''}\n`;
        content += `Category: ${item.Category || ''}\n`;
        content += `Group: ${item.Group || ''}\n`;
        content += `Schedule Fee: ${item.ScheduleFee || 'Not specified'}\n`;
        
        if (item.ItemStartDate) content += `Start Date: ${item.ItemStartDate}\n`;
        if (item.ItemEndDate) content += `End Date: ${item.ItemEndDate}\n`;
      } else {
        // Fallback for other data formats
        content = item.text || JSON.stringify(item);
      }

      const metadata = {
        ...item,
        _id: item.ItemNum || item.id || String(idx),
        _type: 'mbs_item'
      };

      return { pageContent: content, metadata } as Document;
    });

    this.logger.log(`Created ${docs.length} documents, starting embedding...`);

    // Use larger chunks for MBS items since they're already structured
    const splitter = new CharacterTextSplitter({ 
      chunkSize: 2000, 
      chunkOverlap: 100,
      separator: '\n'
    });
    
    const chunks = await splitter.splitDocuments(docs as any);
    this.logger.log(`Split into ${chunks.length} chunks, uploading to Pinecone...`);

    // Process in batches to avoid rate limits
    const batchSize = 100;
    let totalProcessed = 0;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await PineconeStore.fromDocuments(batch, this.embeddings!, {
        pineconeIndex: this.pineconeIndex,
        namespace: 'default',
      });
      totalProcessed += batch.length;
      this.logger.log(`Processed ${totalProcessed}/${chunks.length} chunks`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.logger.log(`Ingestion complete: ${chunks.length} chunks stored in Pinecone`);
    return { chunks: chunks.length };
  }

  async queryRag(query: string, top: number = 5) {
    await this.initIfNeeded();

    const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
    const COHERE_MODEL = process.env.COHERE_RERANK_MODEL || 'rerank-english-v3.0';
    const RERANK_CANDIDATES = Math.min(Math.max(parseInt(process.env.RERANK_CANDIDATES || '60') || 60, 5), 200);

    const topK = Math.min(Math.max(parseInt(String(top)) || 5, 1), 15);
    const candidateDocs: any[] = await this.vectorStore!.similaritySearch(query, RERANK_CANDIDATES);

    let reranked: { doc: any; score: number }[] = candidateDocs.map((d: any) => ({ doc: d, score: 0 }));
    if (this.cohere) {
      const topN = Math.min(candidateDocs.length, Math.max(topK + 3, topK));
      this.logger.log(
        `RAG rerank: using Cohere model=${COHERE_MODEL}, candidates=${candidateDocs.length}, topN=${topN}`
      );
      const rerankResp: any = await this.cohere.rerank({
        model: COHERE_MODEL,
        query,
        documents: candidateDocs.map((d) => ({ text: d.pageContent })),
        topN,
      });
      const resultsArray = (rerankResp?.results || []).map((r: any) => ({ index: r.index, score: r.relevanceScore ?? r.relevance_score ?? 0 }));
      reranked = resultsArray
        .filter((r: any) => r.index >= 0 && r.index < candidateDocs.length)
        .map((r: any) => ({ doc: candidateDocs[r.index], score: r.score }))
        .sort((a: any, b: any) => b.score - a.score);
      this.logger.log(`RAG rerank: results=${resultsArray.length}`);
    } else {
      this.logger.log('RAG rerank: skipped (Cohere not configured)');
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


