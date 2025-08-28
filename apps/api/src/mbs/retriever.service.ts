import { Injectable } from '@nestjs/common';
import { KBRulesLoader } from './loader';
import type { ExtractedEpisode, KBItem } from './types';

const STOPWORDS = new Set<string>([
  'a','an','the','and','or','of','to','for','with','on','in','at','by','from','via','that','this','these','those','is','are','was','were','be','been','being','patient','male','female','years','year','old','minutes','minute','min','m','consult','attendance'
]);

function normalizeToken(tok: string): string | undefined {
  const t = tok.toLowerCase();
  if (!t || t.length < 2) return undefined;
  if (STOPWORDS.has(t)) return undefined;
  // synonyms mapping
  if (/(zoom|teams|facetime|video)/.test(t)) return 'video';
  if (/(telephone|phone|call)/.test(t)) return 'phone';
  if (/(telehealth|telemedicine|远程)/.test(t)) return 'telehealth';
  if (/(clinic|consulting|rooms)/.test(t)) return 'clinic';
  if (/(hospital|inpatient|ward)/.test(t)) return 'hospital';
  if (/(after-hours|after|hours|evening|weekend)/.test(t)) return 'afterhours';
  if (/(public|holiday)/.test(t)) return 'publicholiday';
  if (/(face[- ]?to[- ]?face|in[- ]?person)/.test(t)) return 'inperson';
  if (/(ecg|12l|12|lead)/.test(t)) return 'ecg';
  if (/(spirometry|肺功能)/.test(t)) return 'spirometry';
  if (/(report|interpretation)/.test(t)) return 'report';
  if (/(referral)/.test(t)) return 'referral';
  return t.replace(/[^a-z0-9]/g, '');
}

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t): t is string => !!t);
}

@Injectable()
export class LexicalRetrieverService {
  private loader = new KBRulesLoader();

  get kb(): KBItem[] { return this.loader.getBundle().kb; }
  reload(): void { this.loader.reload(); }

  retrieve(note: string, topK: number = 10, episode?: ExtractedEpisode): Array<{ item: KBItem; score: number }> {
    // Query tokens from note + expansion from extracted episode
    const qTokens = new Set<string>(tokenize(note));
    if (episode) {
      if (episode.telehealthMode === 'video') qTokens.add('video');
      if (episode.telehealthMode === 'phone') qTokens.add('phone');
      if (episode.telehealthMode === 'telehealth') qTokens.add('telehealth');
      if (episode.location) qTokens.add(episode.location === 'home' ? 'home' : episode.location);
      if (episode.hoursBucket === 'after_hours') qTokens.add('afterhours');
      if (episode.hoursBucket === 'public_holiday') qTokens.add('publicholiday');
      if (episode.referralPresent) qTokens.add('referral');
      if (episode.reportPresent) qTokens.add('report');
      for (const p of episode.procedures || []) qTokens.add(p.name);
      for (const t of episode.testsPresent || []) qTokens.add(t);
    }

    const qWeights: Record<string, number> = {};
    for (const t of qTokens) qWeights[t] = 1;

    const scored = this.kb.map((it) => {
      // Build weighted doc token map from fields
      const titleTokens = tokenize(it.title);
      const descTokens = tokenize(it.description);
      const eligTokens = tokenize((it.eligibility || []).join(' '));
      const restrTokens = tokenize((it.restrictions || []).join(' '));

      const dWeights: Record<string, number> = {};
      const add = (arr: string[], w: number) => {
        for (const t of arr) dWeights[t] = (dWeights[t] || 0) + w;
      };
      add(titleTokens, 3);
      add(descTokens, 1.5);
      add(eligTokens, 2.5);
      add(restrTokens, 1);

      // Weighted Jaccard
      let numer = 0;
      let denom = 0;
      const seen = new Set<string>([...Object.keys(dWeights), ...Object.keys(qWeights)]);
      for (const t of seen) {
        const qv = qWeights[t] || 0;
        const dv = dWeights[t] || 0;
        numer += Math.min(qv, dv);
        denom += Math.max(qv, dv);
      }
      const score = denom > 0 ? numer / denom : 0;
      return { item: it, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, topK));
  }
}
