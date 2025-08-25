# @mbspro/shared

Shared TypeScript type definitions and utilities for MBSPro applications.

## Usage

```typescript
import type { 
  SuggestRequest, 
  SuggestCandidate, 
  SuggestResponse,
  Signals,
  RuleResult 
} from '@mbspro/shared';
```

## Type Definitions

### SuggestRequest
Request interface for suggestion operations.
- `note: string` - The input note/text
- `topN?: number` - Optional limit for number of suggestions

### SuggestCandidate  
Individual suggestion candidate.
- `code: string` - Unique identifier code
- `title: string` - Display title
- `score: number` - Relevance score
- `score_breakdown?: Record<string, number>` - Optional detailed scoring
- `feature_hits?: string[]` - Optional matched features
- `short_explain?: string` - Optional brief explanation

### Signals
Metadata about the suggestion context.
- `duration: number` - Processing duration
- `mode: string` - Operation mode
- `after_hours: boolean` - Whether request was after hours
- `chronic: boolean` - Whether this is a recurring pattern

### SuggestResponse
Complete response from suggestion endpoint.
- `candidates: SuggestCandidate[]` - Array of suggestion candidates
- `signals?: Signals` - Optional context signals

### RuleResult
Result from rule processing.
- `id: string` - Rule identifier
- `status: string` - Rule execution status
- `reason: string` - Explanation of result
- `refs?: string[]` - Optional reference materials
