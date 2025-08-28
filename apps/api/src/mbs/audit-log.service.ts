import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuditLogService {
  private logPath: string;

  constructor() {
    const root = path.resolve(process.cwd(), 'eval');
    if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
    this.logPath = path.join(root, 'notes.jsonl');
  }

  append(entry: Record<string, any>): void {
    const line = JSON.stringify({ ...entry, ts: new Date().toISOString() });
    try {
      fs.appendFileSync(this.logPath, line + '\n');
    } catch {}
  }
}


