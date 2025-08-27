import { Injectable } from '@nestjs/common';
import type { ExtractedEpisode, EvidenceSpan } from './types';

@Injectable()
export class MbsExtractorService {
  extract(note: string): ExtractedEpisode {
    const src = note || '';
    const text = src.toLowerCase();
    const evidence: EvidenceSpan[] = [];
    const negations: string[] = [];

    // duration minutes (e.g., 15 minutes, 20 min, 1h)
    let durationMin: number | undefined;
    let m = /(\d{1,3})\s*(minutes?|mins?|m)\b/i.exec(src);
    if (m) {
      durationMin = Math.min(480, parseInt(m[1], 10));
      evidence.push(this.span('duration', src, m.index, m[0].length));
    } else {
      m = /(\d{1,2}(?:\.\d+)?)\s*(hours?|hrs?|h)\b/i.exec(src);
      if (m) {
        durationMin = Math.min(480, Math.round(parseFloat(m[1]) * 60));
        evidence.push(this.span('duration', src, m.index, m[0].length));
      }
    }

    // telehealth/video/phone mode
    let telehealthMode: ExtractedEpisode['telehealthMode'];
    let idx = text.search(/\bvideo\b|zoom|teams|facetime|视频/);
    if (idx >= 0) {
      telehealthMode = 'video';
      evidence.push(this.span('mode', src, idx, Math.min(20, src.length - idx)));
    } else if ((idx = text.search(/\bphone\b|telephone|call|电话/)) >= 0) {
      telehealthMode = 'phone';
      evidence.push(this.span('mode', src, idx, Math.min(20, src.length - idx)));
    } else if ((idx = text.search(/telehealth|telemedicine|远程/)) >= 0) {
      telehealthMode = 'telehealth';
      evidence.push(this.span('mode', src, idx, Math.min(20, src.length - idx)));
    } else if ((idx = text.search(/in[- ]?person|face[- ]?to[- ]?face|clinic visit|office visit|面诊/)) >= 0) {
      telehealthMode = 'in_person';
      evidence.push(this.span('mode', src, idx, Math.min(20, src.length - idx)));
    }

    // location
    let location: ExtractedEpisode['location'];
    idx = text.search(/hospital|inpatient|病房/);
    if (idx >= 0) {
      location = 'hospital';
      evidence.push(this.span('location', src, idx, Math.min(30, src.length - idx)));
    } else if ((idx = text.search(/nursing home|residential aged care|养老院/)) >= 0) {
      location = 'nursing_home';
      evidence.push(this.span('location', src, idx, Math.min(30, src.length - idx)));
    } else if ((idx = text.search(/home visit|house call|domiciliary|居家/)) >= 0) {
      location = 'home';
      evidence.push(this.span('location', src, idx, Math.min(30, src.length - idx)));
    } else if ((idx = text.search(/clinic|consulting rooms|门诊/)) >= 0) {
      location = 'clinic';
      evidence.push(this.span('location', src, idx, Math.min(30, src.length - idx)));
    }

    // hours bucket
    let hoursBucket: ExtractedEpisode['hoursBucket'] = 'business';
    let hbIdx = text.search(/public holiday|public holidays|法定节假日|公休日/);
    if (hbIdx >= 0) {
      hoursBucket = 'public_holiday';
      evidence.push(this.span('hoursBucket', src, hbIdx, Math.min(30, src.length - hbIdx)));
    } else if ((hbIdx = text.search(/after[- ]?hours|evening|weekend|下班后|夜诊/)) >= 0) {
      hoursBucket = 'after_hours';
      evidence.push(this.span('hoursBucket', src, hbIdx, Math.min(20, src.length - hbIdx)));
    }

    // referral present
    let referralPresent = false;
    let reportPresent = false;
    idx = text.search(/referral (provided|present|given|attached)|has referral|转诊/);
    if (idx >= 0) { referralPresent = true; evidence.push(this.span('referral', src, idx, Math.min(30, src.length - idx))); }
    // report present
    let ridx = text.search(/report (provided|attached|ready|available)|interpretation|报告(已)?(提供|上传|完成)/);
    if (ridx >= 0) { reportPresent = true; evidence.push(this.span('report', src, ridx, Math.min(30, src.length - ridx))); }
    // negations
    if (/no referral|without referral|referral not|referral pending|awaiting referral|未见转诊|无转诊/i.test(src)) {
      negations.push('no_referral'); referralPresent = false;
    }
    if (/no report|without report|report not|report pending|awaiting report|无报告|报告待回/i.test(src)) {
      negations.push('no_report'); reportPresent = false;
    }

    // tests/procedures lexicon
    const testsPresent: string[] = [];
    const procedures: ExtractedEpisode['procedures'] = [];
    const testsLex = [
      { k: 'ecg', r: /\becg\b|12\s*lead|12l/i },
      { k: 'spirometry', r: /spirometry|肺功能/i },
      { k: 'suturing', r: /suture|suturing|缝合/i },
      { k: 'imaging', r: /x[- ]?ray|ct|mri|ultrasound|影像/i },
    ];
    for (const t of testsLex) {
      const hit = t.r.exec(src);
      if (hit) {
        testsPresent.push(t.k);
        evidence.push(this.span(`test:${t.k}`, src, hit.index, hit[0].length));
        const evs = [this.span(`procedure:${t.k}`, src, hit.index, hit[0].length)];
        // with report indicator near by
        const windowText = src.slice(Math.max(0, hit.index - 30), Math.min(src.length, hit.index + hit[0].length + 30)).toLowerCase();
        const withReport = /(report|interpretation|结果|报告)/i.test(windowText) && !/(pending|awaiting|待|未)/i.test(windowText);
        procedures.push({ name: t.k, withReport, evidence: evs });
      }
    }

    // age extraction: English and Chinese. Examples: "45-year-old", "45 year old", "45yo", "45 y/o", "35岁"
    let ageYears: number | undefined;
    let ageMatch = /(?:\b|^)(\d{1,2})\s*(?:-?\s*year-?old|years?\s*old|yo\b|y\/o\b)/i.exec(src);
    if (!ageMatch) {
      ageMatch = /(\d{1,2})\s*岁/i.exec(src);
    }
    if (ageMatch) {
      const val = parseInt(ageMatch[1], 10);
      if (!isNaN(val)) { ageYears = val; evidence.push(this.span('age', src, ageMatch.index, ageMatch[0].length)); }
    }

    const encounterType: ExtractedEpisode['encounterType'] =
      telehealthMode && telehealthMode !== 'in_person' ? 'telehealth' : (testsPresent.includes('imaging') ? 'imaging' : 'gp');

    return {
      encounterType,
      location,
      hoursBucket,
      durationMin,
      telehealthMode,
      reportPresent,
      referralPresent,
      ageYears,
      procedures,
      testsPresent,
      temporalHints: [],
      negations,
      evidence,
    };
  }

  private span(field: string, src: string, idx: number, len: number): EvidenceSpan {
    return { field, text: src.slice(idx, idx + len), start: idx, end: idx + len };
  }
}
