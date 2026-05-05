// Render the consensus report.json as a Markdown document.
// Single-voice output: no per-rater divergence shown. The 3 raters are
// preserved in report.json under `_audit` for traceability.

const PILLARS_ORDER = ["experience", "expertise", "authoritativeness", "trust"];
const PILLAR_LABELS = {
  experience: "Experience",
  expertise: "Expertise",
  authoritativeness: "Authoritativeness",
  trust: "Trust",
};

export function renderMarkdown(r) {
  const out = [];
  header(out, r);
  pillarTable(out, r);
  signalsSection(out, r);
  narrativeSection(out, r);
  remediationSection(out, r);
  evidenceSection(out, r);
  reputationSection(out, r);
  observationsSection(out, r);
  limitationsSection(out, r);
  return out.join("\n");
}

function header(out, r) {
  out.push(`# Relatório E-E-A-T — ${r.target.mode === "url" ? r.target.value : "wiki do projeto"}`);
  out.push("");
  out.push(`- **Score**: ${r.score} / 100`);
  out.push(`- **Page quality**: ${r.page_quality}`);
  out.push(`- **YMYL**: ${r.ymyl ? "sim" : "não"}`);
  out.push(`- **Run**: ${r.run_id}`);
  out.push("");
}

function pillarTable(out, r) {
  out.push("## Score por pilar");
  out.push("");
  out.push("| Pilar | Score |");
  out.push("| --- | ---: |");
  for (const p of PILLARS_ORDER) out.push(`| ${PILLAR_LABELS[p]} | ${r.numeric_scores[p].toFixed(1)} |`);
  out.push("");
}

function signalsSection(out, r) {
  if (r.gate_flags.length === 0 && r.risk_flags.length === 0) return;
  out.push("## Sinais");
  out.push("");
  if (r.gate_flags.length) {
    out.push("**Gates do engine** (a partir das ratings consensuadas):");
    for (const g of r.gate_flags) out.push(`- \`${g}\``);
    out.push("");
  }
  if (r.risk_flags.length) {
    out.push("**Risk flags do checklist QRG**:");
    for (const f of r.risk_flags) out.push(`- \`${f}\``);
    out.push("");
  }
}

function narrativeSection(out, r) {
  out.push("## Análise");
  out.push("");
  if (r.consolidated_narrative) out.push(r.consolidated_narrative);
  else out.push("_Narrativa consolidada ainda não foi sintetizada. Rode `node scripts/eeat.mjs synthesize --run <id> --narrative-file <path>` ou `--narrative \"<texto>\"`._");
  out.push("");
}

function remediationSection(out, r) {
  out.push("## Remediação priorizada");
  out.push("");
  if (r.remediation.length === 0) { out.push("- nenhuma sugestão"); out.push(""); return; }
  for (const rem of r.remediation) {
    const ids = rem.checklist_ids?.length ? ` [${rem.checklist_ids.join(", ")}]` : "";
    out.push(`- **[${rem.priority}]**${ids} ${rem.what} — ${rem.why}`);
  }
  out.push("");
}

function evidenceSection(out, r) {
  out.push("## Evidência por pilar");
  out.push("");
  for (const pillar of PILLARS_ORDER) {
    out.push(`### ${PILLAR_LABELS[pillar]} — ${r.numeric_scores[pillar].toFixed(1)} / 100`);
    out.push("");
    out.push("| Item | Estado | Evidência |");
    out.push("| --- | --- | --- |");
    const sorted = [...r.checklist_consensus[pillar]].sort(naturalIdCompare);
    for (const it of sorted) {
      const quote = (it.evidence_quotes?.[0]?.quote || "").replace(/\|/g, "\\|").slice(0, 200);
      out.push(`| ${it.id} | ${it.consensus_state} | ${quote ? `"${quote}"` : "—"} |`);
    }
    out.push("");
  }
}

function reputationSection(out, r) {
  if (!r.reputation_research?.length) return;
  out.push("## Reputation research");
  out.push("");
  for (const item of r.reputation_research) out.push(`- [${item.stance}] ${item.source_url} — ${item.claim}`);
  out.push("");
}

function observationsSection(out, r) {
  if (!r.rater_observations?.length) return;
  out.push("## Observações livres dos raters");
  out.push("");
  out.push("Texto fora do vocabulário fechado de risk_flags. Não dispara gates nem entra no score.");
  out.push("");
  for (const o of r.rater_observations) out.push(`- ${o.observation}`);
  out.push("");
}

function limitationsSection(out, r) {
  if (!r.limitations?.length) return;
  out.push("## Limitações");
  out.push("");
  for (const l of r.limitations) out.push(`- ${l}`);
  out.push("");
}

function naturalIdCompare(a, b) {
  const ra = a.id.match(/^([a-z]+)(\d+)$/i);
  const rb = b.id.match(/^([a-z]+)(\d+)$/i);
  if (ra && rb && ra[1] === rb[1]) return Number(ra[2]) - Number(rb[2]);
  return a.id.localeCompare(b.id);
}
