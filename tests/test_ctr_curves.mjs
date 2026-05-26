import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { load, selectPrimary, applyDelta, validate, listCurveFiles } from "../shared/ctr-curves/loader.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "shared", "ctr-curves");

const files = listCurveFiles(root);
assert.ok(files.includes("fps_2026.yaml"), "fps_2026 ships");
assert.ok(files.includes("backlinko_2024_12.yaml"), "backlinko_2024_12 ships");
assert.ok(files.includes("sistrix_2020.yaml"), "sistrix_2020 ships");
assert.ok(files.includes("ahrefs_2025_12_aio_deltas.yaml"), "ahrefs deltas ship");

const fps = load("fps_2026", { root });
assert.equal(fps.type, "absolute");
assert.equal(fps.positions.length, 10);
assert.equal(fps.positions[0].ctr_pct, 39.8);

const ahrefs = load("ahrefs_2025_12_aio_deltas", { root });
assert.equal(ahrefs.type, "delta");
assert.equal(ahrefs.positions[0].delta_pct, -58);
assert.equal(ahrefs.positions[0].baseline_curve_id, "fps_2026");
assert.equal(ahrefs.positions[5].delta_pct, null, "positions 6-10 are null with note");
assert.match(ahrefs.positions[5].note, /-30\.5%/);

const primary = selectPrimary({ root });
assert.equal(primary.id, "fps_2026", "primary defaults to fps_2026 when AWR is unpopulated");

const sistrix = load("sistrix_2020", { root });
const preferSistrix = selectPrimary({ root, prefer: "sistrix_2020" });
assert.equal(preferSistrix.id, "sistrix_2020", "explicit preference is honored");

const adjusted = applyDelta(fps, ahrefs);
assert.equal(adjusted.derived_from.base, "fps_2026");
assert.equal(adjusted.derived_from.delta, "ahrefs_2025_12_aio_deltas");
assert.equal(adjusted.positions[0].aio_adjusted, true);
assert.equal(adjusted.positions[0].ctr_pct, Number((39.8 * (1 - 0.58)).toFixed(2)));
assert.equal(adjusted.positions[5].aio_adjusted, false, "null delta keeps baseline value unchanged");
assert.equal(adjusted.positions[5].ctr_pct, fps.positions[5].ctr_pct);
assert.match(adjusted.positions[5].note, /-30\.5%/);

const broken = {
  id: "broken",
  name: "broken",
  type: "absolute",
  source: { license: "free" },
  methodology: {},
  captured_at: "",
  positions: Array.from({ length: 10 }, (_, i) => ({ position: i + 1, ctr_pct: 200 })),
  caveats: [],
  provenance: {},
};
const errors = validate(broken);
assert.ok(errors.length > 0, "ctr_pct > 100 is rejected");

const deltaMissingBaseline = {
  id: "delta-broken",
  name: "delta broken",
  type: "delta",
  source: { license: "free" },
  methodology: {},
  captured_at: "",
  positions: Array.from({ length: 10 }, (_, i) => ({ position: i + 1, delta_pct: -10 })),
  caveats: [],
  provenance: {},
};
const deltaErrors = validate(deltaMissingBaseline);
assert.ok(deltaErrors.some((e) => /baseline_curve_id/.test(e)), "delta without baseline_curve_id rejected");

const reordered = {
  ...broken,
  positions: Array.from({ length: 10 }, (_, i) => ({ position: i === 0 ? 1 : 1, ctr_pct: 5 })),
};
const orderErrors = validate(reordered);
assert.ok(orderErrors.some((e) => /position ordering broken/.test(e)), "duplicated positions rejected");

const missingCaveats = { ...broken, caveats: "not-an-array" };
const caveatErrors = validate(missingCaveats);
assert.ok(caveatErrors.some((e) => /caveats must be an array/.test(e)), "caveats string rejected");

const warnings = [];
const noisySelect = selectPrimary({ root, prefer: "awr_2026_q2", warn: (msg) => warnings.push(msg) });
assert.equal(noisySelect.id, "fps_2026", "AWR placeholder falls back to fps_2026 even when explicitly preferred");
assert.ok(warnings.some((m) => /awr_2026_q2/.test(m)), "warn fires when preferred is unusable");

const baseWithNull = JSON.parse(JSON.stringify(fps));
baseWithNull.id = "fps_with_null_for_test";
baseWithNull.positions[0].ctr_pct = null;
baseWithNull.positions[0].note = "fixture: null baseline at pos 1";
const adjustedNullBase = applyDelta(baseWithNull, ahrefs);
assert.equal(adjustedNullBase.positions[0].ctr_pct, null, "null baseline stays null after applyDelta");
assert.equal(adjustedNullBase.positions[0].aio_adjusted, false, "null baseline is not flagged as adjusted");
assert.match(adjustedNullBase.positions[0].note, /fixture: null baseline/);

console.log("ctr-curves ok");
