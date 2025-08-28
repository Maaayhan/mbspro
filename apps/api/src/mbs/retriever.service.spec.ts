import { LexicalRetrieverService } from './retriever.service';
import { KBRulesLoader } from './loader';

describe('LexicalRetrieverService (weighted)', () => {
  const retr = new LexicalRetrieverService();
  const loader = new KBRulesLoader();

  it('ranks telehealth video item higher for a video consult query', () => {
    const note = 'Video telehealth consult via Zoom for 15 minutes';
    const ep = {
      telehealthMode: 'video',
      evidence: [],
    } as any;
    const res = retr.retrieve(note, 10, ep);
    const codes = res.map(r => r.item.item);
    // Expect 91800 (video telehealth) to appear and be ranked before face-to-face 23 in most cases
    const idxTele = codes.indexOf('91800');
    const idxFace = codes.indexOf('23');
    expect(idxTele).toBeGreaterThanOrEqual(0);
    if (idxFace >= 0) expect(idxTele).toBeLessThan(idxFace);
  });

  it('after-hours phone query lifts 597 over room consults', () => {
    const note = 'After-hours phone attendance for patient at home';
    const ep = { hoursBucket: 'after_hours', telehealthMode: 'phone', evidence: [] } as any;
    const res = retr.retrieve(note, 10, ep);
    const codes = res.map(r => r.item.item);
    const idx597 = codes.indexOf('597');
    const idx23 = codes.indexOf('23');
    expect(idx597).toBeGreaterThanOrEqual(0);
    if (idx23 >= 0) expect(idx597).toBeLessThan(idx23);
  });
});


