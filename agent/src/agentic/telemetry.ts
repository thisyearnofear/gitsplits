import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ReplayableCommand } from './types';

const LOG_DIR = process.env.AGENT_LOG_DIR || path.resolve(process.cwd(), 'runtime_logs');
const LOG_FILE = path.join(LOG_DIR, 'agent-events.ndjson');
const replayStore = new Map<string, ReplayableCommand>();

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function createEventId(): string {
  const seed = `${Date.now()}-${Math.random()}-${process.pid}`;
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
}

export function logEvent(event: Record<string, any>): void {
  try {
    ensureLogDir();
    const payload = {
      timestamp: new Date().toISOString(),
      ...event,
    };
    fs.appendFileSync(LOG_FILE, `${JSON.stringify(payload)}\n`, 'utf8');
  } catch (err: any) {
    console.warn('[Telemetry] Failed to write event log:', err?.message || err);
  }
}

export function registerReplayableCommand(command: ReplayableCommand): void {
  replayStore.set(command.eventId, command);
  // Keep memory bounded.
  if (replayStore.size > 500) {
    const oldest = replayStore.keys().next().value;
    if (oldest) replayStore.delete(oldest);
  }
}

export function getReplayableCommand(eventId: string): ReplayableCommand | null {
  return replayStore.get(eventId) || null;
}

export function getTelemetryPath(): string {
  return LOG_FILE;
}
