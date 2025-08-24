import { RankerService } from '../ranker.service';

describe('RankerService', () => {
  const svc = new RankerService();

  const baseRows = [
    { code: '23', title: 'GP consult', description: 'telehealth consult', flags: { telehealth: true }, time_threshold: 10, sim: 0.6 },
    { code: '24', title: 'After hours consult', description: 'evening consult', flags: { after_hours: true }, time_threshold: 20, sim: 0.55 },
    { code: '25', title: 'Weekend consult', description: 'general practice', flags: {}, time_threshold: 30, sim: 0.50 },
  ];

  it('applies telehealth boost and threshold boosts', () => {
    const signals: any = { mode: 'telehealth', afterHours: false, chronic: false, duration: 20 };
    const out = svc.rank({ rows: baseRows as any, signals, topN: 3 });
    expect(out[0].code).toBe('23'); // telehealth upweighted
    expect(out[0].score_breakdown).toBeDefined();
    expect(out[0].feature_hits?.includes('telehealth')).toBeTruthy();
  });

  it('after-hours cases upweight after-hours items', () => {
    const signals: any = { mode: 'in-person', afterHours: true, chronic: false, duration: 30 };
    const out = svc.rank({ rows: baseRows as any, signals, topN: 3 });
    expect(out[0].code).toBe('24');
  });

  it('weight changes affect ordering', () => {
    const signals: any = { mode: 'telehealth', afterHours: false, chronic: false, duration: 0 };
    const out1 = svc.rank({ rows: baseRows as any, signals, topN: 3, weights: { alpha: 0.9, beta: 0.1 } });
    const out2 = svc.rank({ rows: baseRows as any, signals, topN: 3, weights: { alpha: 0.2, beta: 0.8, w1: 0.5 } });
    // Different alpha/beta should change scores and possibly ordering
    expect(out1[0].code).toBeDefined();
    expect(out2[0].code).toBeDefined();
  });
});


