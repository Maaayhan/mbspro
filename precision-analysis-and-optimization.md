# MBS Precision Analysis & Optimization Strategy

## 🎯 Precision决定因素分析

基于你的实际代码实现，precision主要由以下**6个核心组件**决定：

### 1. RAG检索质量 (Weight: 70%)
```typescript
// suggest.service.ts:41
const rag = await this.rag.queryRag(note, Math.min(topN + 3, 15));
```
**影响因素**:
- Vector database质量和coverage
- Embedding model的语义理解能力
- Query处理和扩展策略
- Top-K选择 (当前: topN + 3, max 15)

### 2. Lexical检索召回 (Weight: 20%)
```typescript  
// suggest.service.ts:68
const lex = this.lexical.retrieve(note, lexTopK);
```
**影响因素**:
- BM25 keyword matching precision
- Text preprocessing质量
- Lexical index completeness

### 3. 特征工程与Ranking (Weight: 10%)
```typescript
// ranker.service.ts:47-131
const score = w.alpha * bm25 + w.beta * featureSum;
```

**Ranker特征权重**:
- `alpha: 0.7` (BM25语义相似度)
- `beta: 0.3` (特征匹配)
- `w1: 0.25` (telehealth匹配加分)
- `w2: 0.15` (telehealth不匹配扣分)
- `w3: 0.20` (after-hours匹配)
- `w4: 0.15` (duration threshold匹配)
- `w5: 0.10` (duration不足扣分)
- `w6: 0.10` (chronic匹配)

### 4. Hybrid Fusion策略
```typescript
// suggest.service.ts:180-182
let baseSim = (wRag * bm25 + wFeat * featureRaw + wLex * lex) / norm;
```

**默认权重**:
- `SUGGEST_RAG_WEIGHT: 0.7` 
- `SUGGEST_FEAT_WEIGHT: 0.1`
- `SUGGEST_LEX_WEIGHT: 0.2`

### 5. 一致性增强
```typescript
// suggest.service.ts:190-191
if (bm25 > 0 && lex > 0)
  baseSim = Math.max(0, Math.min(1, baseSim * agreeBoost));
```
**Agreement boost**: `1.06` (当RAG和Lexical都命中时)

### 6. 规则过滤与Coverage限制
```typescript
// suggest.service.ts:107-139
const { ruleResults, compliance, blocked, penalties, warnings } = 
  this.rules.evaluate({...});
```

## 🚀 Precision优化策略

### A. 立即可实施的优化

#### 1. 调整Fusion权重 (预期+15% precision)
```typescript
// 当前配置
SUGGEST_RAG_WEIGHT=0.7    # 降低到0.6
SUGGEST_FEAT_WEIGHT=0.1   # 提高到0.2  
SUGGEST_LEX_WEIGHT=0.2    # 保持0.2

// 理由: 增强特征匹配权重，减少对纯语义的依赖
```

#### 2. 优化Ranker特征权重 (预期+10% precision)
```typescript
// ranker.service.ts 建议调整:
w1: 0.30,  // telehealth匹配加分 (0.25→0.30)
w3: 0.25,  // after-hours匹配加分 (0.20→0.25) 
w4: 0.20,  // duration threshold匹配 (0.15→0.20)
w6: 0.15,  // chronic匹配加分 (0.10→0.15)

// 理由: 提高明确匹配特征的权重
```

#### 3. 增强Agreement机制 (预期+8% precision)
```typescript
// suggest.service.ts:189
SUGGEST_AGREEMENT_BOOST=1.10  // 1.06→1.10

// 理由: 当RAG和Lexical都认为相关时，更大幅度提升分数
```

### B. 中期优化策略

#### 1. 动态权重调整 (预期+20% precision)
```typescript
// 基于信号强度动态调整权重
function calculateDynamicWeights(signals: ExtractedSignalsInternal) {
  const baseWeights = { wRag: 0.6, wFeat: 0.2, wLex: 0.2 };
  
  // 如果有明确的特征信号，增加特征权重
  if (signals.mode === 'telehealth' || signals.afterHours || 
      signals.chronic || signals.duration) {
    baseWeights.wFeat = 0.3;  // 提高特征权重
    baseWeights.wRag = 0.5;   // 降低RAG权重
  }
  
  // 如果note很短，依赖lexical
  if (note.length < 50) {
    baseWeights.wLex = 0.4;
    baseWeights.wRag = 0.4;
    baseWeights.wFeat = 0.2;
  }
  
  return baseWeights;
}
```

#### 2. 多阶段重排序 (预期+25% precision)
```typescript
// 1) RAG粗排 (Top-50)
// 2) Lexical精排 (Top-20) 
// 3) Feature精排 (Top-10)
// 4) Rule验证 (Final-5)

class MultiStageRanker {
  async rank(note: string, topN: number) {
    // Stage 1: RAG retrieval
    const ragCandidates = await this.rag.queryRag(note, topN * 10);
    
    // Stage 2: Lexical rerank
    const lexicalScored = this.lexical.rerankCandidates(note, ragCandidates);
    
    // Stage 3: Feature enhancement
    const featureScored = this.ranker.enhanceWithFeatures(lexicalScored, signals);
    
    // Stage 4: Rule validation & final ranking
    return this.rules.validateAndRank(featureScored, topN);
  }
}
```

### C. 长期优化策略

#### 1. 学习排序 (Learning to Rank)
```typescript
// 收集用户反馈数据训练ranking model
interface UserFeedback {
  query: string;
  candidates: string[];
  selectedCode: string;
  rating: number; // 1-5
}

// 训练pairwise ranking model
class LearnedRanker {
  async rank(candidates: Candidate[], signals: Signals): Promise<Candidate[]> {
    const features = this.extractFeatures(candidates, signals);
    const scores = await this.model.predict(features);
    return this.sortByCombinedScore(candidates, scores);
  }
}
```

#### 2. 上下文增强检索
```typescript
// 考虑用户历史和context
class ContextAwareRetriever {
  async retrieve(note: string, userContext: UserContext) {
    // 加入用户专业、常用codes、历史偏好
    const expandedQuery = this.expandWithContext(note, userContext);
    const candidates = await this.rag.queryRag(expandedQuery, topK);
    
    // 基于用户profile调整分数
    return this.personalizeScores(candidates, userContext);
  }
}
```

## 📊 预期优化效果

| 优化策略 | 实施难度 | 预期Precision提升 | 实施时间 |
|---------|---------|------------------|---------|
| **A1. 权重调整** | 低 | +15% | 1天 |
| **A2. 特征权重** | 低 | +10% | 2天 |
| **A3. Agreement机制** | 低 | +8% | 1天 |
| **B1. 动态权重** | 中 | +20% | 1周 |
| **B2. 多阶段排序** | 中 | +25% | 2周 |
| **C1. 学习排序** | 高 | +35% | 1个月 |
| **C2. 上下文增强** | 高 | +30% | 2周 |

**综合预期**: 从当前54.5%提升到**75-80%** precision

## 🛠️ 立即执行计划

### Phase 1: 权重调整 (本周执行)
1. 修改environment variables
2. A/B test新权重配置
3. 运行evaluation framework验证

### Phase 2: 特征增强 (下周执行)
1. 实施动态权重算法
2. 增强ranker特征工程
3. 测试多阶段排序原型

### Phase 3: 数据驱动优化 (月内执行)  
1. 收集用户交互数据
2. 训练学习排序model
3. 部署上下文感知系统

## 🔍 当前系统瓶颈识别

1. **RAG质量**: 70%权重但可能不够精准
2. **特征利用率低**: 只有10%权重给特征匹配
3. **静态权重**: 不同场景用统一权重
4. **缺乏学习机制**: 没有用户反馈循环
5. **Coverage gap**: Rule数据库限制了可推荐的codes

**最高优先级**: 先修复Coverage gap（扩展rule database），再优化算法权重。