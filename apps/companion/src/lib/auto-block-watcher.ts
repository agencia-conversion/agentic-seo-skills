// Chokidar watcher that catches external edits (Obsidian, VS Code, etc.) to
// brain markdown, content markdown, and cluster yaml files. On change it runs
// the reverse-sync algorithm in-process (no subprocess spawn) so materialized
// auto-block tables stay in sync with the canonical sources.
//
// Anti-loop guard: writes triggered by the Companion itself register the
// absolute path via `silenceWrite()` before flushing. The watcher skips any
// event for a path currently in that set. The silence TTL (500ms) is wider
// than chokidar's `awaitWriteFinish.stabilityThreshold` (200ms) so the post-
// write event is reliably swallowed.

import chokidar, { FSWatcher } from 'chokidar';
import { resolve } from 'node:path';
import { runReverseSyncForFile } from './auto-block-reverse-sync';
import { runClusterSyncHook } from './cluster-sync-runner';
import { silenceWrite, isSilenced, isCompanionSyncActive } from './write-silencer';

const DEBOUNCE_MS = 200;
const debouncedTimers = new Map<string, NodeJS.Timeout>();
let activeWatcher: FSWatcher | null = null;
let watchedRoot: string | null = null;
let reverseSyncCount = 0;
let clusterSyncCount = 0;

function normalize(absPath: string): string {
  return resolve(absPath);
}

export { silenceWrite, isSilenced };

export function getReverseSyncCount(): number {
  return reverseSyncCount;
}

export function getClusterSyncCount(): number {
  return clusterSyncCount;
}

export function resetWatcherCountersForTesting(): void {
  reverseSyncCount = 0;
  clusterSyncCount = 0;
}

function deriveRelPath(projectRoot: string, absPath: string): string | null {
  const root = normalize(projectRoot);
  const file = normalize(absPath);
  if (!file.startsWith(root)) return null;
  const rel = file.slice(root.length).replace(/^\/+/, '');
  return rel || null;
}

// Serializing flag: multiple handleEvent calls can fire in the same tick
// (e.g. one for a brain/ path and one for a clusters/ path). The brain
// branch awaits runReverseSyncForFile before calling runClusterSyncHook,
// which yields the event loop and lets the second handleEvent pass the
// `isCompanionSyncActive` gate before the first one has called
// `beginCompanionSync`. Two concurrent cluster-sync subprocesses then race
// over the same cluster.yaml. This flag closes that window so handleEvent
// runs at most one at a time.
let handleEventInFlight = false;

async function handleEvent(projectRoot: string, absPath: string): Promise<void> {
  const filePath = normalize(absPath);
  // Silence guard: own writes should not bounce back through reverse-sync.
  if (isSilenced(filePath)) return;
  // Global guard: while the Companion's own cluster-sync is running, pause
  // the watcher entirely. Reverse-sync would otherwise race the spawn and
  // bounce file changes back through unrelated test workflows.
  if (isCompanionSyncActive()) return;
  if (handleEventInFlight) return;
  const rel = deriveRelPath(projectRoot, filePath);
  if (!rel) return;
  handleEventInFlight = true;

  try {
    // Brain markdown with potential auto-block fences: run reverse-sync.
    if (rel.startsWith('brain/') && rel.endsWith('.md')) {
      reverseSyncCount++;
      // Silence the file we may rewrite at the end of reverse-sync so the
      // resulting change event does not trigger a second run.
      silenceWrite(filePath);
      try {
        await runReverseSyncForFile(filePath);
      } catch {
        // Errors are non-fatal; keep watcher alive.
      }
    }

    // Content markdown or cluster yaml: trigger cluster-sync so materialized
    // brain tables refresh to match the new canonical state.
    if (
      (rel.startsWith('contents/') && rel.endsWith('.md')) ||
      (rel.startsWith('clusters/') && rel.endsWith('/cluster.yaml')) ||
      (rel.startsWith('brain/topic-clusters/') && rel.endsWith('.md')) ||
      rel === 'brain/topic-clusters.md'
    ) {
      // Re-check the silence + global sync flags right before spawning a
      // cluster-sync subprocess. An API path may have started its own
      // runClusterSyncHook while we were waiting on reverseSync above; if so,
      // we would race two subprocesses over the same cluster.yaml.
      if (isSilenced(filePath) || isCompanionSyncActive()) return;
      clusterSyncCount++;
      try {
        await runClusterSyncHook(projectRoot, rel);
      } catch {
        // Errors are non-fatal; keep watcher alive.
      }
    }
  } finally {
    handleEventInFlight = false;
  }
}

export function startAutoBlockWatcher(projectRoot: string): void {
  const root = normalize(projectRoot);
  if (activeWatcher && watchedRoot === root) return;
  if (activeWatcher) {
    void activeWatcher.close();
    activeWatcher = null;
  }
  watchedRoot = root;
  const watcher = chokidar.watch(
    ['brain/**/*.md', 'contents/**/*.md', 'clusters/**/*.yaml'],
    {
      cwd: root,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
      ignored: (path) => path.includes('/.agentic-seo/') || path.includes('/node_modules/'),
    },
  );

  const schedule = (relPath: string) => {
    const abs = resolve(root, relPath);
    const key = normalize(abs);
    const existing = debouncedTimers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      debouncedTimers.delete(key);
      void handleEvent(root, abs);
    }, DEBOUNCE_MS);
    debouncedTimers.set(key, timer);
  };
  watcher.on('change', (relPath) => schedule(relPath));
  watcher.on('add', (relPath) => schedule(relPath));
  watcher.on('error', () => {
    // Swallow watcher errors silently. Reverse-sync is best-effort.
  });

  activeWatcher = watcher;
}

export async function stopAutoBlockWatcher(): Promise<void> {
  if (!activeWatcher) return;
  const watcher = activeWatcher;
  activeWatcher = null;
  watchedRoot = null;
  await watcher.close();
}

let initOnce = false;
export function ensureWatcherStarted(projectRoot: string): void {
  if (initOnce) return;
  initOnce = true;
  try {
    startAutoBlockWatcher(projectRoot);
    process.on('beforeExit', () => {
      void stopAutoBlockWatcher();
    });
  } catch {
    // If chokidar fails to start, the Companion still works without the watcher.
    initOnce = false;
  }
}
