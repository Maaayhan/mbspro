import { MbsCodesService } from './mbs.service';
import { MbsExtractorService } from './extractor.service';
import { LexicalRetrieverService } from './retriever.service';
import { KBRulesLoader } from './loader';
import { MetricsService } from './metrics.service';
import { AuditLogService } from './audit-log.service';

describe('MbsCodesService', () => {
  const extractor = new MbsExtractorService();
  const retriever = new LexicalRetrieverService();
  const loader = new KBRulesLoader();
  const metrics = new MetricsService();
  const audit = new AuditLogService();
  const svc = new MbsCodesService(extractor, retriever, loader, metrics, audit);

  it('returns items with confidence and rule_results', async () => {
    const body = {
      note_text: 'Video consult 25 minutes after-hours at clinic. Referral provided.',
      options: { top_k: 3 },
    } as any;
    const res = await svc.handle(body);
    expect(Array.isArray(res.items)).toBe(true);
    if (res.items.length > 0) {
      expect(typeof res.items[0].confidence).toBe('number');
      expect(Array.isArray(res.items[0].rule_results)).toBe(true);
      expect(Array.isArray(res.items[0].evidence)).toBe(true);
    }
    expect(res.meta).toBeDefined();
  });
});



