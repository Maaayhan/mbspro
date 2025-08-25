import { SignalExtractorService } from '../signal-extractor.service';

describe('SignalExtractorService', () => {
  const svc = new SignalExtractorService();

  it('extracts telehealth (video) and duration (minutes)', () => {
    const note = 'Video consult for follow up, total 12 minutes';
    const s = svc.extract(note);
    expect(['video','phone','telehealth','in-person']).toContain(s.mode);
    expect(s.mode === 'video' || s.mode === 'telehealth').toBeTruthy();
    expect(s.duration).toBe(12);
    expect(s.chronic).toBeTruthy(); // follow up triggers chronic synonyms
  });

  it('extracts after-hours context', () => {
    const s = svc.extract('Seen after-hours urgent consultation 30 minutes');
    expect(s.afterHours).toBe(true);
    expect(s.duration).toBe(30);
  });

  it('extracts Chinese telehealth and duration', () => {
    const s = svc.extract('视频问诊 15 分钟 随访');
    expect(s.mode === 'video' || s.mode === 'telehealth').toBeTruthy();
    expect(s.duration).toBe(15);
    expect(s.chronic).toBeTruthy();
  });

  it('parses hours and half-hour', () => {
    expect(svc.extract('review for 1.5 hours').duration).toBe(90);
    expect(svc.extract('复诊 半小时').duration).toBe(30);
  });

  it('defaults when no cues present', () => {
    const s = svc.extract('brief note');
    expect(s.mode).toBeDefined();
    expect(s.afterHours).toBeFalsy();
    expect(s.chronic).toBeFalsy();
  });
});


