# MBSPro Technical Brief

## Executive Summary

MBSPro is a modern AI-powered Medicare Benefits Schedule (MBS) item suggestion system built with Next.js, NestJS, and Supabase. The system provides real-time MBS item recommendations based on clinical notes, with comprehensive rule validation, compliance checking, and patient context integration.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (Supabase)    │
│   Port 3000     │    │   Port 4000     │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  External APIs  │
                    │  - OpenAI GPT   │
                    │  - Pinecone     │
                    │  - Cohere       │
                    └─────────────────┘
```

### Component Architecture

```
Frontend (Next.js App Router)
├── pages/
│   └── page.tsx (Main interface)
├── components/
│   ├── VoiceTranscribeButton.tsx
│   └── PatientSelector.tsx
└── types/ (Shared TypeScript interfaces)

Backend (NestJS Microservices)
├── suggest/ (Core suggestion engine)
│   ├── suggest.service.ts
│   ├── signal-extractor.service.ts
│   ├── ranker.service.ts
│   └── rule-engine.service.ts
├── rag/ (Retrieval-Augmented Generation)
│   ├── rag.service.ts
│   └── rag.controller.ts
├── rules/ (Compliance validation)
│   ├── rules.service.ts
│   └── rules.controller.ts
├── mbs/ (MBS data management)
│   ├── mbs.service.ts
│   └── admin.controller.ts

```

## Core Technologies

### Frontend Stack
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **React Hooks**: State management

### Backend Stack
- **NestJS**: Enterprise Node.js framework
- **TypeScript**: Full-stack type safety
- **Swagger/OpenAPI**: API documentation
- **Jest**: Testing framework

### Database & Storage
- **Supabase**: PostgreSQL with real-time capabilities
- **Row Level Security**: Data protection
- **Automatic backups**: Data persistence

### AI/ML Services
- **OpenAI GPT-4o-mini**: Natural language processing
- **Pinecone**: Vector database for embeddings
- **Cohere**: Reranking and semantic search
- **Text-embedding-3-small**: Document embeddings

## Data Flow Architecture

### 1. Suggestion Pipeline

```
Clinical Note Input
       │
       ▼
┌─────────────────┐
│ Signal Extractor│ ──► Extract: duration, mode, after_hours, chronic
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Lexical Retriever│ ──► BM25 + Trigram similarity search
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Rule Engine     │ ──► Apply MBS compliance rules
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Linear Ranker   │ ──► Score = α×BM25 + β×FeatureBoost
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Response Format │ ──► JSON with candidates, scores, explanations
└─────────────────┘
```

### 2. RAG Pipeline

```
Clinical Query
       │
       ▼
┌─────────────────┐
│ Text Embedding  │ ──► OpenAI text-embedding-3-small
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Vector Search   │ ──► Pinecone similarity search
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Reranking       │ ──► Cohere rerank-english-v3.0
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ LLM Generation  │ ──► GPT-4o-mini with context
└─────────────────┘
```

## Rule Engine Implementation

### Rule Categories Covered

1. **Frequency Limits**
   - Calendar year limits (e.g., max 50 psychiatrist consultations)
   - Rolling period limits
   - Per-episode constraints

2. **Provider Type Validation**
   - GP vs Specialist requirements
   - Nurse Practitioner scope
   - Registrar supervision rules

3. **Location Constraints**
   - Hospital-only items
   - Nursing home specific codes
   - Telehealth eligibility

4. **Temporal Rules**
   - After-hours premiums
   - Business hours restrictions
   - Consultation duration requirements

5. **Referral Requirements**
   - Specialist referral validation
   - Self-referral restrictions
   - Referral expiry checking

6. **Mutual Exclusivity**
   - Conflicting item combinations
   - Same-day restrictions
   - Bundled service rules

### Rule Processing Flow

```
Patient Context + Selected Items
              │
              ▼
    ┌─────────────────┐
    │ Load Rules JSON │
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │ Apply Filters   │ ──► Provider, Location, Referral
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │ Check Frequency │ ──► Query last_claimed_items
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │ Validate Combo  │ ──► Mutual exclusivity check
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │ Generate Result │ ──► Pass/Warn/Block + Evidence
    └─────────────────┘
```

## API Endpoints

### Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/suggest` | Main suggestion pipeline |
| POST | `/api/rag/query` | RAG-based suggestions |
| POST | `/api/rules/validate-selection` | Rule validation |
| POST | `/api/mbs-codes` | Alternative MBS lookup |
| GET | `/api/health` | System health check |

### Administrative Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/mbs-admin/reload` | Hot reload rules/data |
| GET | `/api/mbs-admin/metrics/snapshot` | System metrics |
| GET | `/api/patients` | Test patient data |

## Database Schema

### Core Tables

```sql
-- MBS Items (Supabase)
CREATE TABLE mbs_items (
    code VARCHAR PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    fee DECIMAL(10,2),
    benefit DECIMAL(10,2),
    telehealth BOOLEAN DEFAULT FALSE,
    keywords TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE mbs_items ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_mbs_items_keywords ON mbs_items USING GIN(keywords);
CREATE INDEX idx_mbs_items_telehealth ON mbs_items(telehealth);
```

### Extensions

```sql
-- Enable full-text search and similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Trigram indexes for fuzzy matching
CREATE INDEX idx_mbs_items_title_trgm ON mbs_items USING GIN(title gin_trgm_ops);
CREATE INDEX idx_mbs_items_desc_trgm ON mbs_items USING GIN(description gin_trgm_ops);
```

## Integration Points

### FHIR Compatibility

The system provides FHIR-compatible data structures:

```typescript
// FHIR Claim Resource stub
interface FHIRClaim {
  resourceType: "Claim";
  id: string;
  status: "active" | "cancelled" | "draft";
  type: CodeableConcept;
  patient: Reference;
  provider: Reference;
  item: ClaimItem[];
}

// MBS Item mapping to FHIR
const mapToFHIR = (mbsItem: MBSItem): ClaimItem => ({
  sequence: 1,
  productOrService: {
    coding: [{
      system: "http://www.mbsonline.gov.au",
      code: mbsItem.code,
      display: mbsItem.title
    }]
  },
  unitPrice: {
    value: mbsItem.fee,
    currency: "AUD"
  }
});
```

### PMS Integration Stubs

```typescript
// Practice Management System interface
interface PMSIntegration {
  getPatientHistory(patientId: string): Promise<ClaimHistory[]>;
  submitClaim(claim: FHIRClaim): Promise<ClaimResponse>;
  validateProvider(providerId: string): Promise<ProviderDetails>;
}

// Example implementation stub
class MockPMSService implements PMSIntegration {
  async getPatientHistory(patientId: string) {
    // Stub: Return mock claim history
    return mockClaimHistory[patientId] || [];
  }
}
```

## Performance Optimizations

### Database Optimizations
- **Trigram indexes**: Fast fuzzy text matching
- **GIN indexes**: Efficient array and full-text search
- **Connection pooling**: Supabase managed connections
- **Query optimization**: Selective field loading

### Caching Strategy
- **In-memory caching**: Rules and MBS data
- **Hot reload**: Runtime rule updates
- **Vector caching**: Pinecone index optimization

### API Performance
- **Parallel processing**: Concurrent rule evaluation
- **Streaming responses**: Real-time result delivery
- **Request batching**: Efficient external API usage

## Security Implementation

### Authentication & Authorization
- **Supabase Auth**: Built-in user management
- **Row Level Security**: Database-level access control
- **API key management**: Secure external service integration

### Data Protection
- **Environment variables**: Secure credential storage
- **SSL/TLS**: Encrypted data transmission
- **Input validation**: Prevent injection attacks
- **Rate limiting**: API abuse prevention

## Monitoring & Observability

### Metrics Collection
```typescript
interface SystemMetrics {
  total_requests: number;
  avg_duration_ms: number;
  last_reload_at: string;
  versions: {
    kb: string;
    rules: string;
  };
  counters: {
    low_confidence: number;
  };
}
```

### Health Checks
- **Database connectivity**: Supabase connection status
- **External API health**: OpenAI, Pinecone availability
- **Rule engine status**: Configuration validation
- **Memory usage**: System resource monitoring

## Deployment Architecture

### Development Environment
```bash
# Local development stack
pnpm dev          # Frontend: localhost:3000
pnpm start:dev    # Backend: localhost:4000
# Database: Supabase cloud instance
```

### Production Considerations
- **Container deployment**: Docker/Kubernetes ready
- **Environment separation**: Dev/staging/production configs
- **Horizontal scaling**: Stateless service design
- **Load balancing**: Multiple backend instances
- **CDN integration**: Static asset optimization

## Future Enhancements

### Planned Features
1. **Real-time collaboration**: Multi-user claim building
2. **Advanced analytics**: Usage pattern analysis
3. **Mobile application**: React Native implementation
4. **Offline capability**: Progressive Web App features
5. **Integration APIs**: Third-party PMS connectors

### Scalability Roadmap
1. **Microservices decomposition**: Service mesh architecture
2. **Event-driven architecture**: Async processing
3. **Multi-tenant support**: Organization isolation
4. **Global deployment**: Regional data centers

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Contact**: Development Team