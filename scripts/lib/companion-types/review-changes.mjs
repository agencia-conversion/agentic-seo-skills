import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { runHandoff } from "../companion-server.mjs";
import { newHandoffId, readIdentity, writeIdentity, sha256 } from "../companion-state.mjs";
import { appendLogEntry, parseFrontmatter } from "../wiki-page.mjs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function lcsDiff(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "ctx", line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", line: a[i] });
      i++;
    } else {
      out.push({ type: "add", line: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "del", line: a[i++] });
  while (j < m) out.push({ type: "add", line: b[j++] });
  return out;
}

function unifiedDiff(v1, v2) {
  const a = v1.split("\n");
  const b = v2.split("\n");
  return lcsDiff(a, b)
    .map((d) =>
      d.type === "add" ? "+" + d.line : d.type === "del" ? "-" + d.line : " " + d.line,
    )
    .join("\n");
}

function classifyFinal(final, v1, v2) {
  const finalHash = sha256(final);
  if (finalHash === sha256(v1)) return "unchanged-from-v1";
  if (finalHash === sha256(v2)) return "accepted-v2";
  return "edited";
}

export function buildContext({ projectRoot, proposalPath }) {
  if (!existsSync(proposalPath)) throw new Error(`proposal not found: ${proposalPath}`);
  const proposal = JSON.parse(readFileSync(proposalPath, "utf8"));
  if (!Array.isArray(proposal.files) || proposal.files.length === 0) {
    throw new Error("proposal.files must be a non-empty array");
  }
  const files = proposal.files.map((entry) => {
    if (!entry.path || typeof entry.v2_content !== "string") {
      throw new Error(`invalid proposal entry: ${JSON.stringify(entry)}`);
    }
    const filePath = join(projectRoot, entry.path);
    if (!existsSync(filePath)) throw new Error(`file not found: ${filePath}`);
    const v1 = readFileSync(filePath, "utf8");
    return {
      path: entry.path,
      filePath,
      v1Content: v1,
      v1Hash: sha256(v1),
      v2Content: entry.v2_content,
      changeTypes: entry.change_types || [],
      removedSections: entry.removed_sections || [],
      softenedClaims: entry.softened_claims || [],
      aiTellsFlagged: entry.ai_tells_flagged || [],
      diffSummary: entry.diff_summary || [],
      diffV1V2: unifiedDiff(v1, entry.v2_content),
    };
  });
  return { proposalSummary: proposal.summary || "", files };
}

export async function handleSubmit(body, ctx, projectRoot) {
  const { files: submitted, approver, notes } = body || {};
  if (!approver || !approver.trim()) return { ok: false, reason: "missing-approver" };
  if (!submitted || typeof submitted !== "object") return { ok: false, reason: "missing-files" };

  for (const f of ctx.files) {
    if (typeof submitted[f.path] !== "string") {
      return { ok: false, reason: "missing-file-content", details: f.path };
    }
  }

  const stale = [];
  const invalidFrontmatter = [];
  for (const f of ctx.files) {
    const fresh = readFileSync(f.filePath, "utf8");
    if (sha256(fresh) !== f.v1Hash) stale.push(f.path);
    try {
      parseFrontmatter(submitted[f.path]);
    } catch (err) {
      invalidFrontmatter.push({ path: f.path, error: err.message });
    }
  }
  if (stale.length) return { ok: false, reason: "files-modified", details: stale };
  if (invalidFrontmatter.length) {
    return { ok: false, reason: "invalid-frontmatter", details: invalidFrontmatter };
  }

  const approverClean = approver.trim();
  writeIdentity(approverClean);

  const classification = { "unchanged-from-v1": [], "accepted-v2": [], "edited": [] };
  for (const f of ctx.files) {
    const content = submitted[f.path];
    const klass = classifyFinal(content, f.v1Content, f.v2Content);
    classification[klass].push(f.path);
    writeFileSync(f.filePath, content, "utf8");
  }

  const today = todayIso();
  const logFile = join(projectRoot, "wiki", "log", "index.md");
  const summaryParts = [];
  if (classification["accepted-v2"].length) {
    summaryParts.push(`aceitos como propostos: ${classification["accepted-v2"].length}`);
  }
  if (classification["edited"].length) {
    summaryParts.push(`editados pelo usuário: ${classification["edited"].length}`);
  }
  if (classification["unchanged-from-v1"].length) {
    summaryParts.push(`mantidos como v1: ${classification["unchanged-from-v1"].length}`);
  }
  const detailLines = ctx.files.map((f) => {
    const klass = Object.keys(classification).find((k) => classification[k].includes(f.path));
    return `${f.path}: ${klass}`;
  });
  appendLogEntry(logFile, {
    date: today,
    eventType: "wiki-review",
    title: `review revisado em ${ctx.files.length} arquivo(s)`,
    type: "operational-decision",
    actor: approverClean,
    files: ctx.files.map((f) => f.path.replace(/^wiki\//, "").replace(/\.md$/, "")),
    decision: classification["unchanged-from-v1"].length === ctx.files.length ? "rejected" : "approved",
    summary: summaryParts.join("; ") + " | " + detailLines.join(" / "),
    notes: notes ? notes.trim() : null,
  });

  return { ok: true, approver: approverClean, classification };
}

export async function runReviewChanges(argv = []) {
  const args = parseArgs(argv);
  const projectRootArg = args["project-root"] ?? (args.project ? join("projects", args.project) : null);
  if (!projectRootArg) throw new Error("missing --project or --project-root");
  if (!args.proposal) throw new Error("missing --proposal <path>");
  const projectRoot = resolve(projectRootArg);
  const proposalPath = resolve(args.proposal);
  const ctx = buildContext({ projectRoot, proposalPath });

  const id = newHandoffId();
  const contextData = {
    handoff: "review-changes",
    proposalSummary: ctx.proposalSummary,
    files: ctx.files.map((f) => ({
      path: f.path,
      v1Content: f.v1Content,
      v2Content: f.v2Content,
      changeTypes: f.changeTypes,
      removedSections: f.removedSections,
      softenedClaims: f.softenedClaims,
      aiTellsFlagged: f.aiTellsFlagged,
      diffSummary: f.diffSummary,
      diffV1V2: f.diffV1V2,
    })),
    identity: readIdentity(),
  };
  return runHandoff({
    id,
    templateName: "review-changes.html",
    contextData,
    onSubmit: (body) => handleSubmit(body, ctx, projectRoot),
  });
}
