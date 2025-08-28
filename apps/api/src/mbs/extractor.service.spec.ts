import { MbsExtractorService } from './extractor.service';

describe('MbsExtractorService', () => {
  const svc = new MbsExtractorService();

  it('extracts basic facts: duration, mode, location, after-hours', () => {
    const note = 'Patient attended clinic, video consult for 30 minutes after-hours.';
    const ep = svc.extract(note);
    expect(ep.durationMin).toBe(30);
    expect(ep.telehealthMode).toBe('video');
    expect(ep.location).toBe('clinic');
    expect(ep.hoursBucket).toBe('after_hours');
    expect(ep.evidence.length).toBeGreaterThan(0);
  });

  it('detects public holiday hours bucket', () => {
    const ep = svc.extract('Seen on a public holiday at the hospital.');
    expect(ep.hoursBucket).toBe('public_holiday');
    expect(ep.location).toBe('hospital');
  });

  it('separates referralPresent and reportPresent with negations', () => {
    const ep1 = svc.extract('Referral provided. Report attached.');
    expect(ep1.referralPresent).toBe(true);
    expect(ep1.reportPresent).toBe(true);
    const ep2 = svc.extract('No referral; awaiting report.');
    expect(ep2.referralPresent).toBe(false);
    expect(ep2.reportPresent).toBe(false);
    expect(ep2.negations).toEqual(expect.arrayContaining(['no_referral', 'no_report']));
  });

  it('extracts age from English and Chinese patterns', () => {
    const ep1 = svc.extract('A 45-year-old male with chest pain.');
    expect(ep1.ageYears).toBe(45);
    const ep2 = svc.extract('患者，35岁，主诉咳嗽。');
    expect(ep2.ageYears).toBe(35);
  });

  it('detects procedures and withReport for ECG', () => {
    const ep = svc.extract('Ordered ECG 12 lead with interpretation/report.');
    expect(ep.testsPresent).toEqual(expect.arrayContaining(['ecg']));
    expect(ep.procedures?.some(p => p.name === 'ecg' && p.withReport === true)).toBe(true);
  });
});



