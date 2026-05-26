// Render the consensus report.json as a Markdown document.
// Single-voice output: no per-rater divergence shown. The 3 raters are
// preserved in report.json under `_audit` for traceability.
//
// Labels are bilingual through reportText(locale, en, pt). EN is the default.

import { normalizeLanguage } from "../../../shared/locale.mjs";

const PILLARS_ORDER = ["experience", "expertise", "authoritativeness", "trust"];
const PILLAR_LABELS = {
  experience: "Experience",
  expertise: "Expertise",
  authoritativeness: "Authoritativeness",
  trust: "Trust",
};

function reportText(locale, en, pt) {
  return normalizeLanguage(locale) === "pt-BR" ? pt : en;
}

export function renderMarkdown(r, locale) {
  const out = [];
  header(out, r, locale);
  pillarTable(out, r, locale);
  signalsSection(out, r, locale);
  narrativeSection(out, r, locale);
  issuesSection(out, r, locale);
  remediationSection(out, r, locale);
  evidenceSection(out, r, locale);
  reputationSection(out, r, locale);
  observationsSection(out, r, locale);
  limitationsSection(out, r, locale);
  return out.join("\n");
}

function header(out, r, locale) {
  const targetLabel = r.target.mode === "url" ? r.target.value : reportText(locale, "project brain", "brain do projeto");
  out.push(`# ${reportText(locale, "E-E-A-T Report", "Relatório E-E-A-T")} — ${targetLabel}`);
  out.push("");
  out.push(`- **Score**: ${r.score} / 100`);
  out.push(`- **Page quality**: ${r.page_quality}`);
  out.push(`- **${reportText(locale, "Page type", "Tipo de página")}**: ${r.page_type ?? "homepage"}`);
  out.push(`- **YMYL**: ${r.ymyl ? reportText(locale, "yes", "sim") : reportText(locale, "no", "não")}`);
  out.push(`- **Run**: ${r.run_id}`);
  out.push("");
}

function issuesSection(out, r, locale) {
  out.push(`## ${reportText(locale, "Prioritized issues", "Issues priorizadas")}`);
  out.push("");
  if (!r.issues?.length) { out.push(reportText(locale, "- no structured issues", "- nenhuma issue estruturada")); out.push(""); return; }
  for (const issue of r.issues) {
    const evidence = issue.evidence ? ` ${reportText(locale, "Evidence", "Evidência")}: ${issue.evidence}` : "";
    out.push(`- **[${issue.severity}]** \`${issue.issue_type}\` (${issue.criterion_id}, ${issue.page_type}) — ${issue.recommendation}${evidence}`);
  }
  out.push("");
}

function pillarTable(out, r, locale) {
  out.push(`## ${reportText(locale, "Score by pillar", "Score por pilar")}`);
  out.push("");
  out.push(`| ${reportText(locale, "Pillar", "Pilar")} | Score |`);
  out.push("| --- | ---: |");
  for (const p of PILLARS_ORDER) out.push(`| ${PILLAR_LABELS[p]} | ${r.numeric_scores[p].toFixed(1)} |`);
  out.push("");
}

function signalsSection(out, r, locale) {
  if (r.gate_flags.length === 0 && r.risk_flags.length === 0) return;
  out.push(`## ${reportText(locale, "Signals", "Sinais")}`);
  out.push("");
  if (r.gate_flags.length) {
    out.push(`**${reportText(locale, "Engine gates", "Gates do engine")}** (${reportText(locale, "from consensus ratings", "a partir das ratings consensuadas")}):`);
    for (const g of r.gate_flags) out.push(`- \`${g}\``);
    out.push("");
  }
  if (r.risk_flags.length) {
    out.push(`**${reportText(locale, "QRG checklist risk flags", "Risk flags do checklist QRG")}**:`);
    for (const f of r.risk_flags) out.push(`- \`${f}\``);
    out.push("");
  }
}

function narrativeSection(out, r, locale) {
  out.push(`## ${reportText(locale, "Analysis", "Análise")}`);
  out.push("");
  if (r.consolidated_narrative) out.push(r.consolidated_narrative);
  else out.push(reportText(
    locale,
    "_Consolidated narrative has not been synthesized yet. Run `node scripts/eeat.mjs synthesize --run <id> --narrative-file <path>` or `--narrative \"<text>\"`._",
    "_Narrativa consolidada ainda não foi sintetizada. Rode `node scripts/eeat.mjs synthesize --run <id> --narrative-file <path>` ou `--narrative \"<texto>\"`._",
  ));
  out.push("");
}

function remediationSection(out, r, locale) {
  out.push(`## ${reportText(locale, "Prioritized remediation", "Remediação priorizada")}`);
  out.push("");
  if (r.remediation.length === 0) { out.push(reportText(locale, "- no suggestions", "- nenhuma sugestão")); out.push(""); return; }
  for (const rem of r.remediation) {
    const ids = rem.checklist_ids?.length ? ` [${rem.checklist_ids.join(", ")}]` : "";
    out.push(`- **[${rem.priority}]**${ids} ${rem.what} — ${rem.why}`);
  }
  out.push("");
}

function evidenceSection(out, r, locale) {
  out.push(`## ${reportText(locale, "Evidence by pillar", "Evidência por pilar")}`);
  out.push("");
  for (const pillar of PILLARS_ORDER) {
    out.push(`### ${PILLAR_LABELS[pillar]} — ${r.numeric_scores[pillar].toFixed(1)} / 100`);
    out.push("");
    out.push(`| ${reportText(locale, "Item", "Item")} | ${reportText(locale, "Criterion", "Critério")} | ${reportText(locale, "Applicability", "Aplicabilidade")} | ${reportText(locale, "State", "Estado")} | Score | ${reportText(locale, "Evidence", "Evidência")} |`);
    out.push("| --- | --- | --- | --- | ---: | --- |");
    const sorted = [...r.checklist_consensus[pillar]].sort(naturalIdCompare);
    for (const it of sorted) {
      const quote = (it.evidence_quotes?.[0]?.quote || "").replace(/\|/g, "\\|").slice(0, 200);
      const score = it.criterion_score === null || it.criterion_score === undefined ? "—" : `${it.criterion_score}`;
      out.push(`| ${it.id} | ${it.label ?? it.id} | ${it.applicability ?? "expected"} | ${it.consensus_state} | ${score} | ${quote ? `"${quote}"` : "—"} |`);
    }
    out.push("");
  }
}

function reputationSection(out, r, locale) {
  if (!r.reputation_research?.length) return;
  out.push(`## ${reportText(locale, "Reputation research", "Reputation research")}`);
  out.push("");
  for (const item of r.reputation_research) out.push(`- [${item.stance}] ${item.source_url} — ${item.claim}`);
  out.push("");
}

function observationsSection(out, r, locale) {
  if (!r.rater_observations?.length) return;
  out.push(`## ${reportText(locale, "Free-form rater observations", "Observações livres dos raters")}`);
  out.push("");
  out.push(reportText(
    locale,
    "Text outside the closed risk_flags vocabulary. Does not trigger gates or affect the score.",
    "Texto fora do vocabulário fechado de risk_flags. Não dispara gates nem entra no score.",
  ));
  out.push("");
  for (const o of r.rater_observations) out.push(`- ${o.observation}`);
  out.push("");
}

function limitationsSection(out, r, locale) {
  if (!r.limitations?.length) return;
  out.push(`## ${reportText(locale, "Limitations", "Limitações")}`);
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
