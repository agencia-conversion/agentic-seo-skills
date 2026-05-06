import * as fs from "node:fs";
import * as path from "node:path";

type AnyRecord = Record<string, any>;

type PlayerScoreDeps = {
  rootDir: string;
  projectDir: string;
  required: (args: AnyRecord, key: string) => string;
  normalizePageType: (input?: string) => string;
  readJson: (file: string) => AnyRecord;
  writeJson: (file: string, data: unknown) => void;
  writeText: (file: string, text: string) => void;
  fetchUrl: (url: string) => Promise<{ status: number; html: string; finalUrl: string; headers: Record<string, string> }>;
  extractHtml: (html: string, sourceUrl?: string) => AnyRecord;
  auditTechnicalSeo: (extracted: AnyRecord, options: { pageType: any; source: string; status: number | null; headers?: Record<string, string> }) => AnyRecord;
  renderTechnicalMarkdown: (report: AnyRecord) => string;
  slugify: (value: string) => string;
  stamp: () => string;
};

const PLAYER_SCORE_MODEL = {
  version: "player-score-v1",
  deterministic_weight: 70,
  judgment_weight: 30,
  components: {
    deterministic: { serp_visibility: 25, query_relevance: 15, term_structure_coverage: 15, technical_seo: 15 },
    judgment: { intent_fit: 10, content_quality_and_proof: 10, competitive_threat_or_opportunity: 10 },
  },
  notes: "Deterministic score uses SERP position, keyword/token coverage, extracted page structure, and technical-seo audit. Judgment score is rule-based v1 and must cite observed evidence.",
};

const TERM_STOPWORDS = new Set(["a", "ao", "aos", "as", "ate", "até", "com", "como", "da", "das", "de", "do", "dos", "e", "em", "esse", "esta", "este", "mais", "mas", "na", "nas", "no", "nos", "o", "os", "ou", "para", "por", "que", "se", "sem", "sua", "suas", "seu", "seus", "um", "uma", "sobre", "guia", "melhor", "melhores"]);

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function weightedPoints(score: number, weight: number): number {
  return round1((score * weight) / 100);
}

function normalizeText(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function textTokens(value: string): string[] {
  return normalizeText(value)
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !TERM_STOPWORDS.has(token));
}

function normalizedUrlKey(value: string): string {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = parsed.pathname.replace(/\/+$/g, "") || "/";
    return `${host}${pathname}`;
  } catch {
    return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[?#].*$/, "").replace(/\/+$/g, "");
  }
}

function normalizedHost(value: string): string {
  try {
    const candidate = value.includes("://") ? value : `https://${value}`;
    return new URL(candidate).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/:?#].*$/, "");
  }
}

function hostMatchesTarget(host: string, targetHost: string): boolean {
  return host === targetHost || host.endsWith(`.${targetHost}`);
}

function parseJsonArg(value: unknown, deps: PlayerScoreDeps): AnyRecord {
  if (!value || value === true || value === "true") return {};
  const raw = String(value);
  const candidate = path.isAbsolute(raw) ? raw : path.resolve(deps.rootDir, raw);
  if (fs.existsSync(candidate)) return deps.readJson(candidate);
  return JSON.parse(raw);
}

function extractSerpTerms(topResults: AnyRecord[], players: AnyRecord[], limit = 12): AnyRecord[] {
  const counts = new Map<string, number>();
  const add = (value: string, weight = 1) => {
    for (const token of textTokens(value)) counts.set(token, (counts.get(token) || 0) + weight);
  };
  for (const result of topResults) add(`${result.title} ${result.snippet}`, 2);
  for (const player of players) add((player.page?.headings || []).map((h: AnyRecord) => h.text).join(" "), 1);
  return Array.from(counts.entries()).map(([term, count]) => ({ term, count })).sort((a, b) => b.count - a.count || a.term.localeCompare(b.term)).slice(0, limit);
}

function scoreQueryRelevance(keyword: string, player: AnyRecord): AnyRecord {
  const tokens = Array.from(new Set(textTokens(keyword)));
  const h1 = (player.page?.headings || []).find((h: AnyRecord) => h.level === "h1")?.text || "";
  const blob = `${player.serp?.title || ""} ${player.serp?.snippet || ""} ${player.url} ${h1}`;
  const normalized = ` ${textTokens(blob).join(" ")} `;
  const matched = tokens.filter((token) => normalized.includes(` ${token} `));
  return { score: tokens.length ? round1((matched.length / tokens.length) * 100) : 0, evidence: { keyword_tokens: tokens, matched_tokens: matched, missing_tokens: tokens.filter((token) => !matched.includes(token)), h1 } };
}

function scoreTermCoverage(serpTerms: AnyRecord[], player: AnyRecord): AnyRecord {
  const terms = serpTerms.slice(0, 10).map((item) => item.term);
  const h1 = (player.page?.headings || []).find((h: AnyRecord) => h.level === "h1")?.text || "";
  const h2s = (player.page?.headings || []).filter((h: AnyRecord) => h.level === "h2").map((h: AnyRecord) => h.text).join(" ");
  const blob = ` ${textTokens(`${player.serp?.title || ""} ${player.serp?.snippet || ""} ${h1} ${h2s}`).join(" ")} `;
  const matched = terms.filter((term) => blob.includes(` ${term} `));
  return { score: terms.length ? round1((matched.length / terms.length) * 100) : 0, evidence: { evaluated_terms: terms, matched_terms: matched, missing_terms: terms.filter((term) => !matched.includes(term)) } };
}

function scoreJudgment(player: AnyRecord, queryRelevance: AnyRecord, targetStatus: string): AnyRecord {
  const h1 = (player.page?.headings || []).find((h: AnyRecord) => h.level === "h1")?.text || "";
  const h2Count = (player.page?.headings || []).filter((h: AnyRecord) => h.level === "h2").length;
  const wordCount = Number(player.page?.word_count || 0);
  const hasCriticalIssue = Boolean(player.technical_seo?.findings?.some((f: AnyRecord) => f.severity === "critical" || f.severity === "error"));
  const intentFit = Math.max(0, Math.min(100, round1(queryRelevance.score)));
  const contentQuality = Math.max(0, Math.min(100, round1(((Math.min(wordCount, 1200) / 1200) * 6 + Math.min(h2Count, 4)) * 10)));
  const opportunity = Math.max(0, Math.min(100, round1((10 - Math.round(Number(player.position || 11) / 2) + (hasCriticalIssue ? 2 : 0) + (targetStatus !== "exact_url_ranking" && player.is_target ? 2 : 0)) * 10)));
  const intentFitPoints = weightedPoints(intentFit, 10);
  const contentQualityPoints = weightedPoints(contentQuality, 10);
  const opportunityPoints = weightedPoints(opportunity, 10);
  const totalPoints = round1(intentFitPoints + contentQualityPoints + opportunityPoints);
  return {
    score: round1((totalPoints / 30) * 100),
    weighted_points: totalPoints,
    components: {
      intent_fit: { score: intentFit, weighted_points: intentFitPoints, rationale: "Estimado por alinhamento entre keyword, snippet, URL e H1.", evidence_refs: ["serp.title", "serp.snippet", "url", h1 ? "page.headings.h1" : "page.headings"] },
      content_quality_and_proof: { score: contentQuality, weighted_points: contentQualityPoints, rationale: "Estimado por profundidade crawlable e estrutura de H2 observada; não considera provas não verificadas.", evidence_refs: ["page.word_count", "page.h2_count"] },
      competitive_threat_or_opportunity: { score: opportunity, weighted_points: opportunityPoints, rationale: "Estimado por posição, lacunas técnicas e status do URL alvo na SERP.", evidence_refs: ["serp.position", "technical_seo.findings", "target_status"] },
    },
  };
}

function confidenceForPlayer(provider: string, topResults: AnyRecord[], player: AnyRecord): AnyRecord {
  let score = 100;
  const reasons: string[] = [];
  if (provider === "websearch") {
    score -= 15;
    reasons.push("Provider websearch tem menor metadata que DataForSEO.");
  }
  if (topResults.length < 5) {
    score -= 20;
    reasons.push(`SERP incompleta: ${topResults.length} resultados; ideal >=5.`);
  }
  if (!player.fetch_ok) {
    score -= 30;
    reasons.push("Página não foi buscada; auditoria técnica e estrutura podem estar incompletas.");
  }
  if (!player.technical_seo) {
    score -= 20;
    reasons.push("Auditoria technical-seo ausente.");
  }
  return { score: Math.max(0, round1(score)), reasons };
}

async function loadPlayerPage(url: string, fixtures: AnyRecord, deps: PlayerScoreDeps): Promise<{ html: string; status: number | null; source: string; headers: Record<string, string>; ok: boolean; error?: string }> {
  const fixture = fixtures[url] || fixtures[normalizedUrlKey(url)];
  if (fixture) {
    const file = path.isAbsolute(fixture) ? fixture : path.resolve(deps.rootDir, fixture);
    return { html: fs.readFileSync(file, "utf8"), status: null, source: file, headers: {}, ok: true };
  }
  try {
    const fetched = await deps.fetchUrl(url);
    return { html: fetched.html, status: fetched.status, source: fetched.finalUrl || url, headers: fetched.headers, ok: true };
  } catch (error) {
    return { html: "", status: null, source: url, headers: {}, ok: false, error: String((error as Error).message || error) };
  }
}

export async function buildPlayerScoreReport(args: AnyRecord, base: AnyRecord, deps: PlayerScoreDeps): Promise<AnyRecord> {
  const keyword = base.keyword;
  if (!args.target_url && !args.target_domain) throw new Error("Player score requires --target-url or --target-domain.");
  const targetMode = args.target_domain && !args.target_url ? "domain" : "url";
  const providedTarget = String(args.target_domain || args.target_url);
  const targetHost = normalizedHost(providedTarget);
  const pageType = deps.normalizePageType(args.page_type || "unknown");
  const playersLimit = Math.max(1, Number(args.players_limit || 10));
  const fixtures = parseJsonArg(args.page_fixtures, deps);
  const seen = new Set<string>();
  const players: AnyRecord[] = [];
  for (const result of base.top_results.slice(0, playersLimit)) {
    if (!result.url) continue;
    const key = normalizedUrlKey(result.url);
    if (seen.has(key)) continue;
    seen.add(key);
    const host = normalizedHost(result.url);
    players.push({ url: result.url, url_key: key, host, position: Number(result.position || players.length + 1), serp: result, is_target: targetMode === "url" ? key === normalizedUrlKey(String(args.target_url)) : hostMatchesTarget(host, targetHost) });
  }
  const rankedTarget = players.find((p) => p.is_target && p.serp) || null;
  const fallbackTargetUrl = args.target_url ? String(args.target_url) : `https://${targetHost}/`;
  const targetKey = rankedTarget ? rankedTarget.url_key : normalizedUrlKey(fallbackTargetUrl);
  if (!rankedTarget && !seen.has(targetKey)) players.push({ url: fallbackTargetUrl, url_key: targetKey, host: targetHost, position: null, serp: null, is_target: true });
  const targetStatus = targetMode === "domain"
    ? rankedTarget ? "domain_ranking" : "not_ranking"
    : players.some((p) => p.url_key === targetKey && p.serp) ? "exact_url_ranking" : players.some((p) => hostMatchesTarget(p.host, targetHost) && p.serp) ? "same_domain_wrong_url" : "not_ranking";

  const technicalFiles: string[] = [];
  const runStamp = deps.stamp();
  for (let i = 0; i < players.length; i += 1) {
    const player = players[i];
    const loaded = await loadPlayerPage(player.url, fixtures, deps);
    Object.assign(player, { fetch_ok: loaded.ok, fetch_error: loaded.error || null, page: deps.extractHtml(loaded.html, player.url) });
    if (!loaded.ok) {
      player.technical_seo = null;
      continue;
    }
    const audit = deps.auditTechnicalSeo(player.page, { pageType, source: loaded.source, status: loaded.status, headers: loaded.headers });
    const baseName = `${runStamp}-${deps.slugify(keyword)}-player-${i + 1}-${deps.slugify(player.host || "url")}`;
    const jsonPath = path.join(deps.projectDir, "workbench", "technical-seo", `${baseName}.json`);
    const mdPath = path.join(deps.projectDir, "workbench", "technical-seo", `${baseName}.md`);
    deps.writeJson(jsonPath, audit);
    deps.writeText(mdPath, deps.renderTechnicalMarkdown(audit));
    player.technical_seo = { score: audit.score, grade: audit.grade, ok: audit.ok, findings: audit.findings, report_path: path.relative(deps.projectDir, jsonPath), markdown_path: path.relative(deps.projectDir, mdPath) };
    technicalFiles.push(path.relative(deps.projectDir, jsonPath), path.relative(deps.projectDir, mdPath));
  }

  const serpTerms = extractSerpTerms(base.top_results, players);
  for (const player of players) {
    const serpVisibility = player.position ? round1(Math.max(0, ((playersLimit - player.position + 1) / playersLimit) * 100)) : 0;
    const queryRelevance = scoreQueryRelevance(keyword, player);
    const termCoverage = scoreTermCoverage(serpTerms, player);
    const technicalSeoScore = player.technical_seo ? round1(player.technical_seo.score) : 0;
    const deterministicPoints = round1(
      weightedPoints(serpVisibility, 25)
      + weightedPoints(queryRelevance.score, 15)
      + weightedPoints(termCoverage.score, 15)
      + weightedPoints(technicalSeoScore, 15)
    );
    const judgment = scoreJudgment(player, queryRelevance, targetStatus);
    const overallPoints = round1(deterministicPoints + judgment.weighted_points);
    player.score = {
      overall: Math.min(100, overallPoints),
      deterministic: { score: round1((deterministicPoints / 70) * 100), weighted_points: deterministicPoints, components: { serp_visibility: { score: serpVisibility, weighted_points: weightedPoints(serpVisibility, 25), evidence: { position: player.position, players_limit: playersLimit } }, query_relevance: { ...queryRelevance, weighted_points: weightedPoints(queryRelevance.score, 15) }, term_structure_coverage: { ...termCoverage, weighted_points: weightedPoints(termCoverage.score, 15) }, technical_seo: { score: technicalSeoScore, weighted_points: weightedPoints(technicalSeoScore, 15), evidence: player.technical_seo ? { source_score: player.technical_seo.score, report_path: player.technical_seo.report_path } : { source_score: null, report_path: null } } } },
      judgment,
    };
    player.confidence = confidenceForPlayer(base.provider, base.top_results, player);
  }

  const targetPlayer = players.find((p) => p.is_target && (targetMode === "domain" ? p.serp : p.url_key === targetKey)) || players.find((p) => p.url_key === targetKey) || null;
  const playerScores = players.map((player) => ({
    url: player.url,
    domain: player.host,
    position: player.position,
    is_target: player.url_key === targetKey,
    serp: player.serp,
    technical_seo: player.technical_seo,
    score: player.score,
    confidence: player.confidence,
    fetch_ok: player.fetch_ok,
    fetch_error: player.fetch_error,
    extracted_summary: { title: player.page.title, h1: (player.page.headings || []).find((h: AnyRecord) => h.level === "h1")?.text || "", h2_count: player.page.h2_count, word_count: player.page.word_count },
  })).sort((a, b) => (b.score?.overall || 0) - (a.score?.overall || 0));
  return {
    ...base,
    target_mode: targetMode,
    target_domain: targetHost,
    target_url: targetPlayer?.url || fallbackTargetUrl,
    target_status: targetStatus,
    target_player: targetPlayer ? { url: targetPlayer.url, position: targetPlayer.position, score: targetPlayer.score, confidence: targetPlayer.confidence } : null,
    player_score_options: { page_type: pageType, players_limit: playersLimit },
    serp_terms: serpTerms,
    player_scores: playerScores,
    score_model: PLAYER_SCORE_MODEL,
    limitations: [...base.limitations, ...(base.provider === "websearch" ? ["Player score via websearch depende da qualidade do arquivo de resultados fornecido pelo agente."] : []), ...players.filter((p) => !p.fetch_ok).map((p) => `Não foi possível buscar ${p.url}: ${p.fetch_error || "erro desconhecido"}`)],
    technical_seo_reports: technicalFiles,
  };
}
