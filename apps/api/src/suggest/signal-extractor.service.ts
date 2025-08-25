import { Injectable } from '@nestjs/common';
import { extractSignals, Signals } from '@mbspro/shared';

export interface ExtractedSignalsInternal {
  mode: string;
  afterHours: boolean;
  chronic: boolean;
  telehealth: boolean;
  homeVisit: boolean;
  emergency: boolean;
  keywords: string[];
  duration: number;
}

@Injectable()
export class SignalExtractorService {
  extract(note: string): ExtractedSignalsInternal {
    const shared: Signals = extractSignals(note);
    const text = (note || '').toLowerCase();

    const telehealth = /(telehealth|video consult|phone consult|telephone|telemedicine)/i.test(text);
    const homeVisit = /(home visit|house call|domiciliary)/i.test(text);
    const emergency = /(emergency|urgent|急诊|急救|急性)/i.test(text);

    const keywords = this.extractKeywords(text);

    return {
      mode: shared.mode,
      afterHours: shared.after_hours,
      chronic: shared.chronic,
      duration: shared.duration,
      telehealth,
      homeVisit,
      emergency,
      keywords,
    };
  }

  private extractKeywords(text: string): string[] {
    const candidates = [
      'consultation', 'general practitioner', 'gp', 'telehealth', 'after hours', 'home visit',
      'emergency', 'review', 'follow up', 'assessment', 'pain', 'medication', 'physiotherapy',
      '会诊', '面诊', '复诊', '慢性', '电话', '视频'
    ];
    const hits = new Set<string>();
    for (const k of candidates) {
      if (text.includes(k)) hits.add(k);
    }
    return Array.from(hits);
  }
}
