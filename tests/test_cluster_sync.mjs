import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { strict as assert } from "node:assert";

const require = createRequire(import.meta.url);
const mod = require("../dist/commands/cluster-sync.js");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "cluster-sync-"));
  mkdirSync(join(root, ".agentic-seo"), { recursive: true });
  writeFileSync(
    join(root, ".agentic-seo", "project.json"),
    JSON.stringify({ schema_version: "2.0.0", name: "fixture", language: "pt-BR" }),
  );
  mkdirSync(join(root, "brain", "topic-clusters"), { recursive: true });
  mkdirSync(join(root, "contents", "blog"), { recursive: true });
  return root;
}

function writeCluster(root, slug, yaml) {
  mkdirSync(join(root, "clusters", slug), { recursive: true });
  writeFileSync(join(root, "clusters", slug, "cluster.yaml"), yaml);
}

function writeContent(root, slug, fm, body = "Lorem ipsum.") {
  const yaml = Object.entries(fm)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.map((x) => JSON.stringify(x)).join(", ")}]`;
      if (typeof v === "object" && v !== null)
        return `${k}:\n${Object.entries(v).map(([kk, vv]) => `  ${kk}: ${vv}`).join("\n")}`;
      return `${k}: ${typeof v === "string" ? JSON.stringify(v) : v}`;
    })
    .join("\n");
  writeFileSync(
    join(root, "contents", "blog", `${slug}.md`),
    `---\n${yaml}\n---\n\n${body}`,
  );
}

async function test_basic_sync_and_idempotence() {
  const root = fixture();
  writeCluster(
    root,
    "alpha",
    "contract_version: 1\nslug: alpha\nname: Alpha\nstatus: active\npillar:\n  slug: pillar-a\n  keyword: keyword a\n",
  );
  writeContent(root, "pillar-a", {
    title: "Pillar A",
    slug: "pillar-a",
    origin: "blog",
    clusters: ["alpha"],
    contract_version: 1,
  });
  const r1 = await mod.clusterSync({ root });
  assert.equal(r1.ok, true);
  assert.equal(r1.noop, false);
  const r2 = await mod.clusterSync({ root });
  assert.equal(r2.ok, true);
  assert.equal(r2.noop, true, "second run should be noop");
  rmSync(root, { recursive: true, force: true });
}

async function test_lint_cluster_missing() {
  const root = fixture();
  writeCluster(
    root,
    "alpha",
    "contract_version: 1\nslug: alpha\nname: Alpha\nstatus: active\npillar:\n  slug: pillar-a\n",
  );
  writeContent(root, "orphan", {
    title: "Orphan",
    slug: "orphan",
    origin: "blog",
    clusters: ["does-not-exist"],
    contract_version: 1,
  });
  const r = await mod.clusterSync({ root, check: true });
  const codes = r.lints.map((l) => l.code);
  assert.ok(codes.includes("content.cluster-missing"), "should detect cluster-missing");
  assert.equal(r.exitCode, 1, "check should fail with block lint");
  rmSync(root, { recursive: true, force: true });
}

async function test_content_frontmatter_keyword_volume_preferred() {
  const root = fixture();
  writeCluster(
    root,
    "alpha",
    [
      "contract_version: 1",
      "slug: alpha",
      "name: Alpha",
      "status: active",
      "pillar:",
      "  slug: pillar-a",
      "  keyword: legacy keyword",
      "  intent: informational",
      "  volume: 10",
      "",
    ].join("\n"),
  );
  writeContent(root, "pillar-a", {
    title: "Pillar A",
    slug: "pillar-a",
    origin: "blog",
    keyword: "frontmatter keyword",
    intent: "comparative",
    volume: 320,
    clusters: ["alpha"],
    role: { alpha: "pillar" },
    contract_version: 1,
  });
  const r = await mod.clusterSync({ root });
  assert.equal(r.ok, true);
  const page = readFileSync(join(root, "brain", "topic-clusters", "alpha.md"), "utf8");
  assert.match(page, /frontmatter keyword \(320\)/);
  assert.match(page, /comparative/);
  assert.doesNotMatch(page, /legacy keyword \(10\)/);
  rmSync(root, { recursive: true, force: true });
}

async function test_lint_unique_pillar() {
  const root = fixture();
  writeCluster(
    root,
    "alpha",
    "contract_version: 1\nslug: alpha\nname: Alpha\nstatus: active\npillar:\n  slug: shared\n",
  );
  writeCluster(
    root,
    "beta",
    "contract_version: 1\nslug: beta\nname: Beta\nstatus: active\npillar:\n  slug: shared\n",
  );
  writeContent(root, "shared", {
    title: "Shared",
    slug: "shared",
    origin: "blog",
    clusters: ["alpha", "beta"],
    contract_version: 1,
  });
  const r = await mod.clusterSync({ root, check: true });
  const codes = r.lints.map((l) => l.code);
  assert.ok(codes.includes("cluster.unique-pillar"), "should detect unique-pillar violation");
  rmSync(root, { recursive: true, force: true });
}

async function test_lint_pillar_missing() {
  const root = fixture();
  writeCluster(root, "alpha", "contract_version: 1\nslug: alpha\nname: Alpha\nstatus: active\n");
  const r = await mod.clusterSync({ root, check: true });
  const codes = r.lints.map((l) => l.code);
  assert.ok(codes.includes("cluster.pillar.missing"), "should detect missing pillar in active cluster");
  rmSync(root, { recursive: true, force: true });
}

async function test_sentinel_reconstruction() {
  const root = fixture();
  writeCluster(
    root,
    "alpha",
    "contract_version: 1\nslug: alpha\nname: Alpha\nstatus: active\npillar:\n  slug: pillar-a\n",
  );
  writeContent(root, "pillar-a", {
    title: "Pillar A",
    slug: "pillar-a",
    origin: "blog",
    clusters: ["alpha"],
    contract_version: 1,
  });
  writeFileSync(
    join(root, "brain", "topic-clusters", "alpha.md"),
    "---\ntitle: Alpha\n---\n\n# Alpha\n\n## Pillar\n\n## Contents\n\n| old |\n| --- |\n| data |\n",
  );
  const r = await mod.clusterSync({ root });
  const codes = r.lints.map((l) => l.code);
  assert.ok(
    codes.includes("cluster.table.sentinel-missing"),
    "should emit sentinel-missing on existing-no-sentinel files",
  );
  const next = readFileSync(join(root, "brain", "topic-clusters", "alpha.md"), "utf8");
  assert.ok(next.includes("BEGIN cluster-content-table"), "should inject sentinels");
  rmSync(root, { recursive: true, force: true });
}

async function test_pillar_divergence() {
  const root = fixture();
  writeCluster(
    root,
    "alpha",
    "contract_version: 1\nslug: alpha\nname: Alpha\nstatus: active\npillar:\n  slug: pillar-a\n",
  );
  writeContent(root, "pillar-a", {
    title: "Pillar A",
    slug: "pillar-a",
    origin: "blog",
    clusters: ["alpha"],
    role: { alpha: "satellite" },
    contract_version: 1,
  });
  const r = await mod.clusterSync({ root });
  const codes = r.lints.map((l) => l.code);
  assert.ok(
    codes.includes("cluster.pillar.divergence"),
    "should detect divergence between YAML and frontmatter role",
  );
  rmSync(root, { recursive: true, force: true });
}

async function test_cluster_filter() {
  const root = fixture();
  writeCluster(
    root,
    "alpha",
    "contract_version: 1\nslug: alpha\nname: Alpha\nstatus: active\npillar:\n  slug: pillar-a\n",
  );
  writeCluster(
    root,
    "beta",
    "contract_version: 1\nslug: beta\nname: Beta\nstatus: active\npillar:\n  slug: pillar-b\n",
  );
  writeContent(root, "pillar-a", { title: "A", origin: "blog", clusters: ["alpha"], contract_version: 1 });
  writeContent(root, "pillar-b", { title: "B", origin: "blog", clusters: ["beta"], contract_version: 1 });
  await mod.clusterSync({ root });
  const r = await mod.clusterSync({ root, cluster: "alpha" });
  assert.equal(r.stats.clustersConsidered, 1);
  rmSync(root, { recursive: true, force: true });
}

async function main() {
  await test_basic_sync_and_idempotence();
  await test_content_frontmatter_keyword_volume_preferred();
  await test_lint_cluster_missing();
  await test_lint_unique_pillar();
  await test_lint_pillar_missing();
  await test_sentinel_reconstruction();
  await test_pillar_divergence();
  await test_cluster_filter();
  console.log("All cluster-sync tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
