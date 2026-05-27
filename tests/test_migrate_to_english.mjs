import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve(import.meta.dirname, "..", "scripts", "migrate-project-to-english.mjs");
const root = mkdtempSync(join(tmpdir(), "migrate-en-"));

mkdirSync(join(root, "brain", "topic-clusters"), { recursive: true });
mkdirSync(join(root, "conteudos", "outros"), { recursive: true });
mkdirSync(join(root, "conteudos", "blog"), { recursive: true });
mkdirSync(join(root, "clusters", "seo"), { recursive: true });
writeFileSync(join(root, "brain", "index.md"), `# Index\n[[identidade]] [[voz|Voz]] [[tecnologia#h]]\n`, "utf8");
writeFileSync(join(root, "brain", "identidade.md"), `---\ntitle: I\n---\n# I\n`, "utf8");
writeFileSync(join(root, "brain", "voz.md"), `---\ntitle: V\n---\n# V\n`, "utf8");
writeFileSync(join(root, "brain", "tecnologia.md"), `---\ntitle: T\n---\n# T\n`, "utf8");
writeFileSync(
  join(root, "brain", "log.md"),
  `---\ntitle: Log\n---\n# Log\n\n## 2026-05-26 - X\n\n- tipo: decisao\n- escopo: p/b\n- decisao: x\n- aprovador: agent\n- notas: ok\n`,
  "utf8",
);
writeFileSync(
  join(root, "brain", "topic-clusters", "seo.md"),
  `# SEO\n[A](../../conteudos/blog/x.md) [B](../../conteudos/outros/y.md)\n`,
  "utf8",
);
writeFileSync(
  join(root, "conteudos", "blog", "x.md"),
  `---\ntitle: X\nslug: x\norigem: blog\nclusters:\n  - seo\npapel:\n  seo: pilar\n---\n# X\n`,
  "utf8",
);
writeFileSync(
  join(root, "clusters", "seo", "cluster.yaml"),
  `contract_version: 1\nslug: seo\nnome: SEO\ntese: T\narea_nome: A\npilar:\n  slug: x\nplanned_satellites:\n  - slug: y\n    papel: satelite\nsatelite_overrides: {}\nstats:\n  publicados: 0\n  planejados: 1\n`,
  "utf8",
);

execSync(`node ${SCRIPT} --root ${root} --dry-run`, { stdio: "pipe" });
assert.ok(existsSync(join(root, "conteudos")), "dry-run must not touch disk");

const out1 = execSync(`node ${SCRIPT} --root ${root}`, { encoding: "utf8" });
assert.match(out1, /renamed=\d+ rewritten=\d+ noop=false/);
assert.ok(!existsSync(join(root, "conteudos")));
assert.ok(existsSync(join(root, "contents", "other")));
assert.ok(existsSync(join(root, "brain", "identity.md")));
assert.ok(existsSync(join(root, "brain", "voice.md")));
assert.ok(existsSync(join(root, "brain", "technology.md")));

const log = readFileSync(join(root, "brain", "log.md"), "utf8");
assert.match(log, /- type: decision/);
assert.match(log, /- scope:/);
assert.match(log, /- approver:/);
assert.match(log, /## \d{4}-\d{2}-\d{2} - English schema migration/);

const cy = readFileSync(join(root, "clusters", "seo", "cluster.yaml"), "utf8");
for (const pat of [/^name: SEO$/m, /^thesis: T$/m, /^area_name: A$/m, /^pillar:$/m, /^satellite_overrides:/m, /role: satellite/, /published: 0/, /planned: 1/]) {
  assert.match(cy, pat);
}

const blog = readFileSync(join(root, "contents", "blog", "x.md"), "utf8");
assert.match(blog, /^origin: blog$/m);
assert.match(blog, /^role:$/m);
assert.match(blog, /seo: pillar/);

const idx = readFileSync(join(root, "brain", "index.md"), "utf8");
assert.match(idx, /\[\[identity\]\]/);
assert.match(idx, /\[\[voice\|Voz\]\]/);
assert.match(idx, /\[\[technology#h\]\]/);

const sub = readFileSync(join(root, "brain", "topic-clusters", "seo.md"), "utf8");
assert.match(sub, /\.\.\/\.\.\/contents\/blog\/x\.md/);
assert.match(sub, /\.\.\/\.\.\/contents\/other\/y\.md/);

const out2 = execSync(`node ${SCRIPT} --root ${root}`, { encoding: "utf8" });
assert.match(out2, /renamed=0 rewritten=0 noop=true/, `second run should be noop, got: ${out2}`);

console.log("migrate-to-english ok");
