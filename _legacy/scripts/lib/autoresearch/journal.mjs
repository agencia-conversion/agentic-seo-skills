import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const VALID_EVENTS = new Set([
  "baseline",
  "metrics_committed",
  "iteration",
  "decision",
  "finalize",
]);

export function appendEvent(runDir, event) {
  if (!event || typeof event !== "object") {
    throw new Error("event must be an object");
  }
  if (!VALID_EVENTS.has(event.event)) {
    throw new Error(`invalid event type: ${event.event}`);
  }
  const enriched = { ts: event.ts ?? new Date().toISOString(), ...event };
  appendFileSync(join(runDir, "journal.jsonl"), JSON.stringify(enriched) + "\n", "utf8");
}

export function readJournal(runDir) {
  const path = join(runDir, "journal.jsonl");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}
