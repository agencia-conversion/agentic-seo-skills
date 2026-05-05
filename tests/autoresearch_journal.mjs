import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { appendEvent, readJournal } = await import("../scripts/lib/autoresearch/journal.mjs");

const tmp = mkdtempSync(join(tmpdir(), "autoresearch-journal-"));

assert.deepEqual(readJournal(tmp), [], "empty when no journal yet");

appendEvent(tmp, { event: "baseline", artifact_path: "baseline.md", agg: 6.0 });
appendEvent(tmp, { event: "iteration", iter: 1, agg: 7.5, keep: true });
appendEvent(tmp, { event: "decision", iter: 1, decision: "continue" });

const events = readJournal(tmp);
assert.equal(events.length, 3);
assert.equal(events[0].event, "baseline");
assert.equal(events[0].agg, 6.0);
assert.ok(events[0].ts, "ts auto-filled");
assert.equal(events[2].decision, "continue");

assert.throws(() => appendEvent(tmp, { event: "garbage" }), /invalid event type/);
assert.throws(() => appendEvent(tmp, null), /event must be an object/);

rmSync(tmp, { recursive: true, force: true });
console.log("autoresearch_journal ok");
