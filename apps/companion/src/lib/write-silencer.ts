// Shared silence registry. Holds absolute file paths that the Companion is
// about to write or has just written. The chokidar watcher consults this set
// before invoking reverse-sync / cluster-sync so the Companion's own writes
// do not bounce back through the watcher. Also tracks a global "sync in
// progress" flag — while any Companion-initiated cluster-sync is running,
// the watcher pauses entirely to avoid racing the API's own work.
//
// Owned as a separate module to avoid a circular import between
// auto-block-watcher and cluster-sync-runner.

import { resolve } from 'node:path';

const SILENCE_TTL_MS = 1500;
const silencedPaths = new Map<string, NodeJS.Timeout>();
let globalSyncInFlight = 0;
let globalSyncCooldownUntil = 0;
const COOLDOWN_MS = 500;

function normalize(absPath: string): string {
  return resolve(absPath);
}

export function silenceWrite(absPath: string): void {
  const key = normalize(absPath);
  const existing = silencedPaths.get(key);
  if (existing) clearTimeout(existing);
  const timeout = setTimeout(() => {
    silencedPaths.delete(key);
  }, SILENCE_TTL_MS);
  silencedPaths.set(key, timeout);
}

export function isSilenced(absPath: string): boolean {
  return silencedPaths.has(normalize(absPath));
}

export function beginCompanionSync(): void {
  globalSyncInFlight++;
}

export function endCompanionSync(): void {
  globalSyncInFlight = Math.max(0, globalSyncInFlight - 1);
  globalSyncCooldownUntil = Date.now() + COOLDOWN_MS;
}

export function isCompanionSyncActive(): boolean {
  if (globalSyncInFlight > 0) return true;
  return Date.now() < globalSyncCooldownUntil;
}

export function clearAllSilences(): void {
  for (const timer of silencedPaths.values()) clearTimeout(timer);
  silencedPaths.clear();
}
