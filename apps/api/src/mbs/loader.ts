import * as fs from 'fs';
import * as path from 'path';
import type { KBItem, RuleEntry } from './types';

export interface KBRulesBundle {
  kb: KBItem[];
  rules: RuleEntry[];
  versions: { kb: string; rules: string };
}

export class KBRulesLoader {
  private kbPath: string;
  private rulesPath: string;
  private bundle: KBRulesBundle = { kb: [], rules: [], versions: { kb: 'unknown', rules: 'unknown' } };

  constructor(baseDir?: string) {
    let root = baseDir;
    if (!root) {
      const candidates = [
        path.resolve(process.cwd(), 'apps', 'api', 'data', 'mbs'), // monorepo root
        path.resolve(process.cwd(), 'data', 'mbs'),                 // running from apps/api
        path.resolve(__dirname, '..', '..', 'data', 'mbs'),         // compiled dist context
      ];
      root = candidates.find((p) => fs.existsSync(p)) || candidates[0];
    }
    this.kbPath = process.env.MBS_KB_FILE || path.join(root, 'kb.json');
    this.rulesPath = process.env.MBS_RULES_FILE || path.join(root, 'rules.json');
    this.reload();
  }

  reload(): void {
    this.bundle = { kb: [], rules: [], versions: { kb: 'unknown', rules: 'unknown' } };
    try {
      if (fs.existsSync(this.kbPath)) {
        const raw = fs.readFileSync(this.kbPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.bundle.kb = Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
        this.bundle.versions.kb = String(parsed.version || 'kb-1');
      }
    } catch {}
    try {
      if (fs.existsSync(this.rulesPath)) {
        const raw = fs.readFileSync(this.rulesPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.bundle.rules = Array.isArray(parsed.rules) ? parsed.rules : Array.isArray(parsed) ? parsed : [];
        this.bundle.versions.rules = String(parsed.version || 'rules-1');
      }
    } catch {}
  }

  getBundle(): KBRulesBundle { return this.bundle; }
  getVersions(): { kb: string; rules: string } { return this.bundle.versions; }
}
