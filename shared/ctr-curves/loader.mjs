#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import YAML from "yaml";

const HERE = dirname(fileURLToPath(import.meta.url));
const PRECEDENCE = ["awr_", "fps_", "backlinko_", "sistrix_"];

const REQUIRED_TOP = ["id", "name", "type", "source", "methodology", "captured_at", "positions", "caveats", "provenance"];

function readCurveFile(path) {
  const raw = readFileSync(path, "utf8");
  return YAML.parse(raw);
}

function listCurveFiles(root = HERE) {
  return readdirSync(root)
    .filter((f) => f.endsWith(".yaml") && !f.endsWith(".placeholder.yaml") && !f.startsWith("_"));
}

function validate(curve, { strict = false } = {}) {
  const errors = [];
  for (const key of REQUIRED_TOP) {
    if (curve[key] === undefined) errors.push(`missing field: ${key}`);
  }
  if (!["absolute", "delta"].includes(curve.type)) errors.push(`invalid type: ${curve.type}`);
  if (!Array.isArray(curve.positions) || curve.positions.length < 10) errors.push("positions must list 1..10");
  for (let i = 0; i < (curve.positions || []).length; i += 1) {
    const p = curve.positions[i];
    if (typeof p.position !== "number") errors.push(`row missing position: ${JSON.stringify(p)}`);
    if (typeof p.position === "number" && p.position !== i + 1) {
      errors.push(`position ordering broken at index ${i}: expected ${i + 1}, got ${p.position}`);
    }
    if (curve.type === "absolute") {
      const ctr = p.ctr_pct;
      if (ctr !== null && (typeof ctr !== "number" || ctr < 0 || ctr > 100)) errors.push(`pos ${p.position} ctr_pct out of range`);
      if (strict && ctr === null) errors.push(`pos ${p.position} ctr_pct null in strict mode`);
    } else {
      const d = p.delta_pct;
      if (d !== null && typeof d !== "number") errors.push(`pos ${p.position} delta_pct invalid`);
      if (!p.baseline_curve_id) errors.push(`pos ${p.position} missing baseline_curve_id`);
    }
  }
  if (!Array.isArray(curve.caveats)) errors.push("caveats must be an array");
  if (curve.source?.license && !["free", "paywalled", "api-only", "meta-analysis"].includes(curve.source.license)) {
    errors.push(`unknown license: ${curve.source.license}`);
  }
  return errors;
}

function load(id, { root = HERE } = {}) {
  const path = join(root, `${id}.yaml`);
  if (!existsSync(path)) throw new Error(`curve not found: ${id}`);
  const curve = readCurveFile(path);
  const errors = validate(curve);
  if (errors.length) throw new Error(`invalid curve ${id}:\n- ${errors.join("\n- ")}`);
  return curve;
}

function selectPrimary({ root = HERE, prefer = null, warn = (msg) => process.stderr.write(`${msg}\n`) } = {}) {
  const files = listCurveFiles(root);
  if (prefer) {
    const match = files.find((f) => f === `${prefer}.yaml`);
    if (!match) {
      warn(`ctr-curves: preferred id "${prefer}" not found (placeholder or missing); falling back`);
    } else {
      const curve = readCurveFile(join(root, match));
      if (curve.type !== "absolute") {
        warn(`ctr-curves: preferred "${prefer}" is type ${curve.type}; falling back`);
      } else if (curve.positions.every((p) => p.ctr_pct === null)) {
        warn(`ctr-curves: preferred "${prefer}" has no populated positions; falling back`);
      } else {
        return curve;
      }
    }
  }
  for (const prefix of PRECEDENCE) {
    const candidates = files.filter((f) => f.startsWith(prefix)).sort().reverse();
    for (const candidate of candidates) {
      const curve = readCurveFile(join(root, candidate));
      if (curve.type !== "absolute") continue;
      if (curve.positions.every((p) => p.ctr_pct === null)) continue;
      return curve;
    }
  }
  throw new Error("no usable absolute curve found");
}

function applyDelta(baseCurve, deltaCurve) {
  if (deltaCurve.type !== "delta") throw new Error("applyDelta requires a delta curve");
  const out = JSON.parse(JSON.stringify(baseCurve));
  out.id = `${baseCurve.id}+${deltaCurve.id}`;
  out.name = `${baseCurve.name} adjusted by ${deltaCurve.name}`;
  out.derived_from = { base: baseCurve.id, delta: deltaCurve.id };
  for (const row of out.positions) {
    const d = deltaCurve.positions.find((p) => p.position === row.position);
    if (!d || d.delta_pct === null || row.ctr_pct === null) {
      row.aio_adjusted = false;
      if (d?.note) row.note = `${row.note ? row.note + "; " : ""}${d.note}`;
      continue;
    }
    row.ctr_pct = Math.max(0, Number((row.ctr_pct * (1 + d.delta_pct / 100)).toFixed(2)));
    row.aio_adjusted = true;
  }
  return out;
}

export { listCurveFiles, load, selectPrimary, applyDelta, validate };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === "--validate") {
    const ids = args.slice(1).length ? args.slice(1) : listCurveFiles().map((f) => f.replace(".yaml", ""));
    let bad = 0;
    for (const id of ids) {
      try {
        const curve = readCurveFile(join(HERE, `${id}.yaml`));
        const errors = validate(curve);
        if (errors.length) {
          console.error(`FAIL ${id}\n  ${errors.join("\n  ")}`);
          bad += 1;
        } else {
          console.log(`OK   ${id}`);
        }
      } catch (e) {
        console.error(`FAIL ${id}\n  ${e.message}`);
        bad += 1;
      }
    }
    process.exit(bad ? 1 : 0);
  }
  if (args[0] === "--list") {
    console.log(JSON.stringify(listCurveFiles().map((f) => f.replace(".yaml", "")), null, 2));
    process.exit(0);
  }
  if (args[0] === "--select") {
    const prefer = args[1] || null;
    const curve = selectPrimary({ prefer });
    console.log(curve.id);
    process.exit(0);
  }
  console.error("usage: loader.mjs --validate [id...] | --list | --select [preferred_id]");
  process.exit(2);
}
