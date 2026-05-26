import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import YAML from "yaml";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "bin", "agentic-seo");
const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-competitive-"));
const projectDir = join(tmp, "project");
const env = { ...process.env, AGENTIC_SEO_PROJECT_DIR: projectDir };

function run(args) {
  const stdout = execFileSync(bin, args, { cwd: root, encoding: "utf8", env });
  return JSON.parse(stdout);
}

try {
  run(["project-init", "Competitive test"]);

  // Validate CLI surface: missing args produce structured error
  const errMissing = (() => {
    try { run(["competitive-analysis"]); return null; }
    catch (e) { return e; }
  })();
  assert.ok(errMissing, "missing --target should fail");
  assert.match(String(errMissing.stdout || errMissing.stderr || errMissing.message), /Missing --target/);

  // The skill should be registered with cli_ready: true
  const sharedModules = JSON.parse(execFileSync("node", ["-e", "process.stdout.write(JSON.stringify(require('./shared/report-modules.js')))"], { cwd: root, encoding: "utf8" }));
  const ca = sharedModules.REPORT_MODULES.find((m) => m.id === "competitive-analysis");
  assert.ok(ca, "competitive-analysis must be registered in REPORT_MODULES");
  assert.equal(ca.cli_ready, true, "competitive-analysis must be cli_ready: true after wiring");

  // The TypeScript dispatcher must include competitive-analysis
  const dist = readFileSync(resolve(root, "dist", "commands", "runtime.js"), "utf8");
  assert.match(dist, /"competitive-analysis":/, "competitive-analysis must be in COMMANDS map");
  assert.match(dist, /commandCompetitiveAnalysis/, "commandCompetitiveAnalysis handler must be present");

  // The runner script must exist and parse all required CLI inputs (mode, preset, attach-backlink-analysis-run)
  const runnerSrc = readFileSync(resolve(root, "scripts", "competitive-analysis.mjs"), "utf8");
  for (const flag of ["--mode", "--preset", "--attach-backlink-analysis-run", "--target", "--competitors"]) {
    assert.match(runnerSrc, new RegExp(flag.replace(/-/g, "[-_]")), `runner must accept ${flag}`);
  }
  // The runner must emit browser_prompt and append to brain log
  assert.match(runnerSrc, /browser_prompt/);
  assert.match(runnerSrc, /appendBrainLog/);
  // The runner must support the seven canonical module ids
  for (const m of ["m1_footprint", "m2_share_of_voice", "m3_keyword_gap", "m4_link_gap", "m5_content_footprint", "m6_head_to_head", "m7_brand"]) {
    assert.match(runnerSrc, new RegExp(m), `runner must reference module ${m}`);
  }

  // SKILL.md must no longer carry cli_ready: false in any inline comment
  const skill = readFileSync(resolve(root, "skills", "competitive-analysis", "SKILL.md"), "utf8");
  assert.doesNotMatch(skill, /cli_ready:\s*false/);
  assert.match(skill, /scripts\/competitive-analysis\.mjs/);

  // Report skeleton stays in place
  const skeleton = readFileSync(resolve(root, "templates", "analyses", "competitive-analysis", "report-skeleton.md"), "utf8");
  assert.match(skeleton, /report_type: "competitive-analysis"/);

  // === Behavioural assertions for the 4 gates ===

  function runRaw(args) {
    const result = execFileSync(bin, args, { cwd: root, encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] });
    return JSON.parse(result);
  }
  function runExpectBlocked(args, expectedGate) {
    try { runRaw(args); throw new Error(`expected ${expectedGate} block, got success`); }
    catch (e) {
      const stdout = String(e.stdout || "");
      const parsed = JSON.parse(stdout);
      assert.equal(parsed.status, "blocked", `expected status: blocked for ${args.join(" ")}`);
      assert.equal(parsed.gate, expectedGate, `expected gate: ${expectedGate}, got ${parsed.gate}`);
      return parsed;
    }
  }

  // 1. mode gate: --mode url with domain inputs blocks
  runExpectBlocked(["competitive-analysis", "--target", "example.com", "--competitors", "a.com", "--mode", "url", "--offline"], "mode");

  // 2. budget gate: players × keyword_limit > 500 without confirm/sample/offline blocks
  runExpectBlocked(["competitive-analysis", "--target", "example.com", "--competitors", "a.com,b.com", "--keyword-limit", "400"], "budget");

  // 3. sample mode caps keyword_limit at 50 and YAML reflects it
  const sampleRun = runRaw(["competitive-analysis", "--target", "example.com", "--competitors", "a.com", "--sample", "--offline"]);
  const sampleYaml = YAML.parse(readFileSync(join(projectDir, "audits", `competitive-${sampleRun.run_slug}`, "report.yaml"), "utf8"));
  assert.equal(sampleYaml.budgets.keywords, 50, "--sample must cap keywords at 50");
  assert.equal(sampleYaml.budgets.sample_mode, true, "--sample must set sample_mode: true");

  // 4. brain decision gate: quick preset (no M7) → log_appended false; brand-only → true
  const quickRun = runRaw(["competitive-analysis", "--target", "example.com", "--competitors", "a.com", "--preset", "quick", "--offline"]);
  assert.equal(quickRun.log_appended, false, "quick preset must not append brain log (no M7)");
  assert.ok(!quickRun.modules_run.includes("m7_brand"));
  const brandRun = runRaw(["competitive-analysis", "--target", "example.com", "--competitors", "a.com", "--preset", "brand-only", "--offline"]);
  assert.equal(brandRun.log_appended, true, "brand-only preset must append brain log (M7 ran)");
  assert.ok(brandRun.modules_run.includes("m7_brand"));

  // 5. CTR curve gate: --ctr-curve-id pointing at placeholder must fall back to fps_2026
  const curveRun = runRaw(["competitive-analysis", "--target", "example.com", "--competitors", "a.com", "--ctr-curve-id", "awr_2026_q2", "--offline"]);
  const curveYaml = YAML.parse(readFileSync(join(projectDir, "audits", `competitive-${curveRun.run_slug}`, "report.yaml"), "utf8"));
  assert.equal(curveYaml.provider.ctr_curve.primary_id, "fps_2026", "AWR placeholder must fall back to fps_2026");

  // 6. Near-duplicate dedup: the 4 "landing page" variants in the offline fixture
  //    must collapse to a single gap row with variant_count = 4 (or at least > 1).
  const dedupRun = runRaw(["competitive-analysis", "--target", "example.com", "--competitors", "competitor-a.com", "--offline"]);
  const dedupYaml = YAML.parse(readFileSync(join(projectDir, "audits", `competitive-${dedupRun.run_slug}`, "report.yaml"), "utf8"));
  const gapRows = dedupYaml.modules.m3_keyword_gap?.gap_table || [];
  const landingRows = gapRows.filter((r) => /landing\s*page/i.test(r.keyword || ""));
  assert.equal(landingRows.length, 1, `expected one collapsed landing-page row, got ${landingRows.length}: ${landingRows.map((r) => r.keyword).join(" | ")}`);
  assert.ok(landingRows[0].variant_count && landingRows[0].variant_count > 1, "collapsed row must carry variant_count > 1");

  // 7. CTR-as-%: striking distance rows expose ctr_uplift_modeled_pct (0..100), never the
  //    legacy ctr_uplift_modeled decimal.
  const striking = dedupYaml.modules.m3_keyword_gap?.striking_distance || [];
  if (striking.length > 0) {
    for (const row of striking) {
      assert.ok("ctr_uplift_modeled_pct" in row, `striking row must include ctr_uplift_modeled_pct, got: ${Object.keys(row).join(", ")}`);
      assert.ok(!("ctr_uplift_modeled" in row), "legacy ctr_uplift_modeled must be removed");
      if (row.ctr_uplift_modeled_pct != null) {
        assert.ok(row.ctr_uplift_modeled_pct >= 0 && row.ctr_uplift_modeled_pct <= 100, `pct must be 0..100, got ${row.ctr_uplift_modeled_pct}`);
      }
    }
  }

  // 8. Locale formatting in the generated report.md (pt-BR default): the body must
  //    contain at least one number with a dot thousands separator OR a comma decimal,
  //    and not contain bare unformatted thousands like "60500".
  const reportBody = readFileSync(join(projectDir, dedupRun.report_md), "utf8");
  assert.match(reportBody, /\d\.\d{3}(\b|[",])|\d,\d/, "report must contain pt-BR locale-formatted number");
  assert.doesNotMatch(reportBody, /\bvolume:\s*60500\b/, "report must not contain raw unformatted thousands");

  console.log("competitive-analysis ok");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
