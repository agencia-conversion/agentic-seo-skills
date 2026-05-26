#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { load as loadCurve, selectPrimary as selectPrimaryCurve } from "../shared/ctr-curves/loader.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = process.env.AGENTIC_SEO_PROJECT_DIR || join(ROOT, "project");
const REPORT_BROWSER_PROMPT_MESSAGE = "Posso abrir o Web Companion para você ver a análise?";

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith("--")) { out._.push(t); continue; }
    const key = t.slice(2).replace(/-/g, "_");
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) { out[key] = next; i++; } else { out[key] = true; }
  }
  return out;
}

function sh(file, args, opts = {}) {
  return execFileSync(file, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024, ...opts });
}
function shJson(file, args, opts = {}) { return JSON.parse(sh(file, args, opts)); }
function dfs(...args) { return shJson(process.execPath, [join(ROOT, "tools", "clis", "dataforseo.js"), ...args]); }
function curl(url) {
  try { return execFileSync("curl", ["-sL", "--max-time", "15", "-H", "User-Agent: Mozilla/5.0", url], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }); } catch { return null; }
}

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function writeYaml(p, obj) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, YAML.stringify(obj, { lineWidth: 0 }), "utf8"); }
function writeJson(p, obj) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(obj, null, 2), "utf8"); }
function writeText(p, t) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, t, "utf8"); }

const PRESETS = {
  quick: ["m1_footprint", "m3_keyword_gap"],
  "domain-full": ["m1_footprint", "m2_share_of_voice", "m3_keyword_gap", "m4_link_gap", "m5_content_footprint", "m7_brand"],
  "url-headtohead": ["m6_head_to_head", "m4_link_gap", "m7_brand"],
  "content-only": ["m5_content_footprint", "m2_share_of_voice"],
  "brand-only": ["m7_brand"],
  full: ["m1_footprint", "m2_share_of_voice", "m3_keyword_gap", "m4_link_gap", "m5_content_footprint", "m6_head_to_head", "m7_brand"],
};

function rankedKeywords(target, { locationCode, languageCode, limit }) {
  const out = dfs("labs", "ranked-keywords", "--target", target, "--location-code", String(locationCode), "--language-code", String(languageCode), "--limit", String(limit));
  return out.result?.tasks?.[0]?.result?.[0]?.items || [];
}
function backlinksSummary(target) {
  const out = dfs("backlinks", "summary", "--target", target);
  const r = out.result?.tasks?.[0]?.result?.[0] || out.result;
  return r?.tasks?.[0]?.result?.[0] || r;
}
function homepageObserve(url) {
  const html = curl(url);
  if (!html) return null;
  const stripTags = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const title = (html.match(/<title[^>]*>([^<]+)/) || [])[1] || null;
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) || [])[1] || null;
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])).filter(Boolean);
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const ctas = [...html.matchAll(/<(?:a|button)[^>]*class=["'][^"']*(?:btn|cta|button)[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|button)>/gi)].map((m) => stripTags(m[1])).filter((s) => s && s.length < 80).slice(0, 10);
  return { url, title, meta_description: desc, h1, h2_count: h2Count, cta_buttons: ctas };
}
function fetchSitemapUrls(domain) {
  const sm = curl(`https://${domain}/sitemap.xml`) || curl(`https://www.${domain}/sitemap.xml`);
  if (!sm) return { urls: [], note: "sitemap_unreachable" };
  if (/<sitemapindex/i.test(sm)) {
    const childs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]).slice(0, 6);
    const urls = [];
    for (const child of childs) {
      const childXml = curl(child);
      if (!childXml) continue;
      for (const m of childXml.matchAll(/<loc>([^<]+)<\/loc>/gi)) urls.push(m[1]);
    }
    return { urls, note: "sitemap_index" };
  }
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]);
  return { urls, note: "sitemap_flat" };
}
function pathPrefix(url) { try { return new URL(url).pathname.split("/").filter(Boolean)[0] || "/"; } catch { return "?"; } }

// Offline fixtures keep the CLI runnable without DataForSEO/credentials/network. Mark every artifact as `is_offline_fixture: true` and never present these as live conclusions.
function offlineFixtureItems(player) {
  const base = [
    { keyword: "seo agêntico", volume: 720, position: 3 },
    { keyword: "agência seo", volume: 9900, position: player.includes("conversion") ? 2 : 7 },
    { keyword: "consultoria seo", volume: 2400, position: player.includes("conversion") ? 1 : 25 },
    { keyword: "ferramentas seo", volume: 5400, position: player.includes("conversion") ? 4 : 11 },
    { keyword: "auditoria seo", volume: 1900, position: player.includes("conversion") ? null : 8 },
    { keyword: "seo enterprise", volume: 880, position: null },
    { keyword: "google search console", volume: 60500, position: player.includes("conversion") ? null : 12 },
    { keyword: "landing page", volume: 6600, position: player.includes("conversion") ? null : 14 },
    { keyword: "core web vitals", volume: 720, position: player.includes("conversion") ? 9 : null },
    { keyword: "schema markup", volume: 480, position: player.includes("conversion") ? null : 6 },
  ];
  return base.filter((r) => r.position != null).map((r) => ({
    keyword_data: { keyword: r.keyword, keyword_info: { search_volume: r.volume } },
    ranked_serp_element: { serp_item: { rank_absolute: r.position, rank_group: r.position, url: `https://${player}/${slugify(r.keyword)}/`, etv: Math.round((r.volume || 0) * 0.1) } },
  }));
}
function offlineFixtureBacklinks(player) {
  if (player.includes("conversion")) return { backlinks: 10792, referring_domains: 2429, rank: 328, spam_score: 17 };
  return { backlinks: 15724, referring_domains: 413, rank: 403, spam_score: 2 };
}
function offlineFixtureSitemap(player) {
  return ["/blog/seo-agentico/", "/blog/agencia-seo/", "/blog/consultoria-seo/", "/casos/", "/sobre/", "/contato/"].map((p) => `https://${player}${p}`);
}
function offlineFixtureHomepage(player) {
  if (player.includes("conversion")) return { url: `https://${player}/`, title: "Conversion - A maior agência de SEO, GEO & PR no Brasil", meta_description: "A Conversion é a maior agência de SEO no Brasil e possui viés estratégico.", h1: ["Somos a maior agência de SEO. Mais do que experts, somos estratégicos."], h2_count: 30, cta_buttons: ["Agendar Reunião", "Faça um Diagnóstico de SEO gratuito", "Fale com nossos consultores"] };
  return { url: `https://${player}/`, title: "Agência liveSEO – Agência Especializada em SEO", meta_description: "Agência Especializada em SEO.", h1: ["Agência de SEO especializada"], h2_count: 15, cta_buttons: ["Entre em contato", "Confira nossos serviços", "Acesse nossos webinars"] };
}
function positionBucket(p) {
  if (p == null) return null;
  if (p <= 3) return "1_3"; if (p <= 10) return "4_10"; if (p <= 20) return "11_20"; if (p <= 50) return "21_50"; return "51_100";
}
function indexByKeyword(items) {
  const m = new Map();
  for (const it of items) {
    const kw = it.keyword_data?.keyword;
    const serp = it.ranked_serp_element?.serp_item || {};
    if (!kw) continue;
    m.set(kw, { keyword: kw, volume: it.keyword_data?.keyword_info?.search_volume ?? null, position: serp.rank_absolute || serp.rank_group || null, url: serp.url || null });
  }
  return m;
}
function ctrAt(curve, pos) {
  if (!pos || pos > 10) return 0;
  const row = curve.positions.find((r) => r.position === pos);
  return (row?.ctr_pct ?? 0) / 100;
}

function buildM1(items, evidencePath) {
  const buckets = { "1_3": 0, "4_10": 0, "11_20": 0, "21_50": 0, "51_100": 0 };
  let totalEtv = 0;
  for (const it of items) {
    const serp = it.ranked_serp_element?.serp_item || {};
    const pos = serp.rank_absolute || serp.rank_group || null;
    const b = positionBucket(pos); if (b) buckets[b]++;
    totalEtv += Number(serp.etv || 0);
  }
  return { keywords_total: items.length, position_buckets: buckets, estimated_traffic_etv: Math.round(totalEtv * 10) / 10, evidence_path: evidencePath };
}
function buildM2(curve, playersIdx) {
  const universe = new Set();
  for (const map of Object.values(playersIdx)) for (const k of map.keys()) universe.add(k);
  const w = {}; let denom = 0; let withVol = 0; let withoutVol = 0;
  for (const name of Object.keys(playersIdx)) w[name] = { visibility_sum: 0, kw_top_20: 0, kw_top_3: 0 };
  for (const kw of universe) {
    let volume = null;
    for (const map of Object.values(playersIdx)) { const r = map.get(kw); if (r && r.volume != null) { volume = r.volume; break; } }
    if (volume == null) { withoutVol++; continue; }
    withVol++; let kwTotal = 0;
    for (const [name, map] of Object.entries(playersIdx)) {
      const r = map.get(kw); const vis = r ? ctrAt(curve, r.position) : 0;
      w[name].visibility_sum += volume * vis; kwTotal += vis;
      if (r?.position && r.position <= 20) w[name].kw_top_20++;
      if (r?.position && r.position <= 3) w[name].kw_top_3++;
    }
    denom += volume * kwTotal;
  }
  const sov_table = Object.entries(w).map(([name, x]) => ({
    player: name,
    keywords_in_top_20: x.kw_top_20,
    keywords_in_top_3: x.kw_top_3,
    weighted_visibility_sum: Math.round(x.visibility_sum * 100) / 100,
    sov_pct: denom > 0 ? Math.round((x.visibility_sum / denom) * 1000) / 10 : null,
    soc_modeled: Math.round(x.visibility_sum),
    tag: "Modelado",
    curve_id: curve.id,
    aio_adjusted: false,
  }));
  return { universe: { total: universe.size, with_volume: withVol, without_volume: withoutVol }, sov_table };
}
function buildM3(targetIdx, competitorIdxs, curve) {
  const gapMap = new Map();
  for (const [name, idx] of competitorIdxs) {
    for (const [kw, row] of idx) {
      if (!row.position || row.position > 20) continue;
      const t = targetIdx.get(kw);
      if (!t || (t.position && t.position > 100)) {
        const existing = gapMap.get(kw);
        const entry = { name, position: row.position, url: row.url };
        if (existing) existing.competitors.push(entry);
        else gapMap.set(kw, { keyword: kw, volume: row.volume, target_position: t?.position ?? null, competitors: [entry] });
      }
    }
  }
  const gap_table = [...gapMap.values()].sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const striking = [];
  for (const [kw, r] of targetIdx) {
    if (!r.position || r.position < 4 || r.position > 20) continue;
    const uplift = ctrAt(curve, 1) - ctrAt(curve, r.position);
    striking.push({ keyword: kw, volume: r.volume, position: r.position, ctr_uplift_modeled: Math.round(uplift * 1000) / 1000, opportunity_score: Math.round((r.volume || 0) * uplift), tag: "Modelado", curve_id: curve.id });
  }
  striking.sort((a, b) => b.opportunity_score - a.opportunity_score);
  return { gap_table, striking_distance: striking };
}
function buildM4(backlinks, attachRun) {
  const players = Object.entries(backlinks);
  const rows = players.map(([name, b]) => ({
    player: name, backlinks: b.backlinks, referring_domains: b.referring_domains,
    backlinks_per_referring_domain: b.backlinks && b.referring_domains ? Math.round((b.backlinks / b.referring_domains) * 10) / 10 : null,
    rank: b.rank, spam_score: b.spam_score,
  }));
  return {
    note: attachRun ? `referenced backlink-analysis run ${attachRun}` : "headline KPIs only; multi-competitor surfaces (domain_intersection, anchor diff cross-player, velocity) require backlink-analysis v2 multi-competitor CLI",
    attached_run: attachRun || null, players: rows,
  };
}
function buildM5(content) {
  const rows = Object.entries(content).map(([name, c]) => ({
    player: name, total_urls: c.total_urls, discovery_method: c.discovery,
    top_paths: Object.entries(c.by_path_prefix || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, n]) => ({ path: `/${p}`, urls: n })),
  }));
  return { coverage_method_note: "Discovery via sitemap.xml; subtopic coverage matrix not computed without explicit cluster_ref input.", players: rows };
}
function buildM6(brand) {
  // Only run when URLs are provided pairwise; here we use homepages as the single pair.
  const players = Object.entries(brand);
  if (players.length < 2) return { status: "not_run", reason: "fewer than 2 homepages observable" };
  const [t, c] = players;
  return {
    note: "Limited to homepages; intent-specific URLs require explicit --target-urls / --competitor-urls input.",
    page_matrix: [{
      pair_id: "home",
      target_url: t[1]?.url || null,
      competitor_url: c[1]?.url || null,
      target: { title: t[1]?.title, h1: t[1]?.h1?.[0] || null, h2_count: t[1]?.h2_count },
      competitor: { title: c[1]?.title, h1: c[1]?.h1?.[0] || null, h2_count: c[1]?.h2_count },
      diffs: { h2_delta: (t[1]?.h2_count || 0) - (c[1]?.h2_count || 0) },
    }],
  };
}
function buildM7(brand) {
  const positioning = []; const ctas = []; const claims = [];
  for (const [name, b] of Object.entries(brand)) {
    if (!b) continue;
    positioning.push({
      player: name,
      h1: b.h1?.[0] ? { excerpt_literal: b.h1[0].slice(0, 200), position: "hero" } : { excerpt_literal: null, position: null },
      title_tag: b.title || null,
      meta_description: b.meta_description || null,
    });
    for (const cta of b.cta_buttons || []) {
      const pressure = /agendar|diagnóstico|reunião|free|gratuito|free trial/i.test(cta) ? "alta" : /entre em contato|fale conosco|fale com/i.test(cta) ? "media" : "baixa";
      ctas.push({ player: name, cta_text: cta, cta_position: "hero", pressure_label: pressure });
    }
    // claims_unverified: superlatives in title or h1 without adjacent source
    const blob = `${b.title || ""} ${b.h1?.[0] || ""}`;
    const superlative = blob.match(/(maior|líder(?:es)?|#1|primeira|melhor|única|unica)/i);
    if (superlative) {
      claims.push({
        player: name,
        excerpt_literal: blob.match(/[^.]*\b(?:maior|líder|líderes|#1|primeira|melhor|única|unica)\b[^.]*/i)?.[0]?.trim().slice(0, 200) || superlative[0],
        position: "hero/title_tag",
        reason: "Superlativo declarado sem fonte verificável adjacente capturada.",
      });
    }
  }
  return { positioning_table: positioning, cta_table: ctas, claims_unverified: claims };
}

function appendBrainLog({ projectRoot, runSlug, target, competitors, modulesRun }) {
  const logPath = join(projectRoot, "brain", "log.md");
  if (!existsSync(logPath)) return false;
  const today = new Date().toISOString().slice(0, 10);
  const entry = `\n## ${today} - Análise competitiva ${runSlug}\n\n- tipo: decisao\n- escopo: project/analyses/competitive-analysis/${runSlug}/\n- decisao: Análise competitiva entre ${target} e ${competitors.join(", ")} gerada por scripts/competitive-analysis.mjs.\n- evidencia: project/audits/competitive-${runSlug}/report.yaml\n- aprovador: agent\n- notas: módulos executados — ${modulesRun.join(", ")}.\n`;
  appendFileSync(logPath, entry, "utf8");
  return true;
}

function fmt(n) { if (n == null) return "—"; if (typeof n === "number") return n.toLocaleString("pt-BR"); return String(n); }
function safe(s) { return String(s ?? "").replace(/"/g, "\\\""); }

function composeReport(ctx) {
  const { target, competitors, runYaml } = ctx;
  const players = [target, ...competitors];
  const m = runYaml.modules;
  const out = [];
  out.push(`---
title: "Análise competitiva — ${target} vs ${competitors.join(", ")}"
slug: "${runYaml.run_slug}"
report_type: "competitive-analysis"
generated_at: "${runYaml.market_context.generated_at}"
status: "${runYaml.status}"
source_artifact: "audits/competitive-${runYaml.run_slug}/report.yaml"
summary: "Comparativo de footprint orgânico, Share of Voice modelado, gap de palavras-chave, backlinks, cobertura editorial e mensagem de marca observável."
---

## Resumo executivo

${ctx.lead}

\`\`\`agentic-kpis
version: 1
items:
  - label: Alvo
    value: ${JSON.stringify(target)}
  - label: Concorrentes
    value: ${competitors.length}
  - label: Mercado
    value: "Brasil · pt · desktop"
  - label: Curva CTR
    value: ${JSON.stringify(runYaml.provider.ctr_curve.primary_id)}
    tag: Modelado
\`\`\`

## Players

\`\`\`agentic-table
version: 1
columns:
  - key: player
    label: Participante
  - key: role
    label: Papel
  - key: type
    label: Tipo
  - key: source
    label: Origem
rows:
${players.map((p, i) => `  - player: ${p}\n    role: ${i === 0 ? "alvo" : "concorrente"}\n    type: domain\n    source: user`).join("\n")}
\`\`\``);

  if (m.m1_footprint?.status === "complete") {
    const rows = players.map((p) => {
      const r = m.m1_footprint.by_player?.[p];
      if (!r) return null;
      const b = r.position_buckets || {};
      return `  - player: ${p}\n    keywords_total: ${r.keywords_total}\n    estimated_traffic_etv: ${r.estimated_traffic_etv}\n    top_3: ${b["1_3"] || 0}\n    top_4_10: ${b["4_10"] || 0}\n    top_11_20: ${b["11_20"] || 0}\n    top_21_50: ${b["21_50"] || 0}`;
    }).filter(Boolean).join("\n");
    out.push(`\n## Footprint orgânico\n\nUniverso de palavras-chave por domínio e tráfego orgânico estimado (ETV) do DataForSEO Labs.\n\n\`\`\`agentic-table\nversion: 1\ncolumns:\n  - key: player\n    label: Participante\n  - key: keywords_total\n    label: Keywords no top 100\n  - key: estimated_traffic_etv\n    label: Tráfego estimado (ETV)\n  - key: top_3\n    label: Top 1-3\n  - key: top_4_10\n    label: Top 4-10\n  - key: top_11_20\n    label: Top 11-20\n  - key: top_21_50\n    label: Top 21-50\nrows:\n${rows}\n\`\`\``);
  }

  if (m.m2_share_of_voice?.status === "complete") {
    const rows = m.m2_share_of_voice.sov_table.map((r) =>
      `  - player: ${r.player}\n    keywords_in_top_20: ${r.keywords_in_top_20}\n    keywords_in_top_3: ${r.keywords_in_top_3}\n    sov_pct: ${r.sov_pct ?? 0}\n    soc_modeled: ${r.soc_modeled}`
    ).join("\n");
    const u = m.m2_share_of_voice.universe;
    out.push(`\n## Share of Voice (modelado)\n\nUniverso de ${u.total} palavras-chave únicas (${u.with_volume} com volume, ${u.without_volume} sem volume — excluídas do peso). SoV = soma de \`volume × CTR(posição)\` dividida pelo total do mercado modelado pela curva ${runYaml.provider.ctr_curve.primary_id}.\n\n\`\`\`agentic-table\nversion: 1\ncolumns:\n  - key: player\n    label: Participante\n  - key: keywords_in_top_20\n    label: Keywords top 20\n  - key: keywords_in_top_3\n    label: Keywords top 1-3\n  - key: sov_pct\n    label: SoV (%) [Modelado]\n  - key: soc_modeled\n    label: Cliques modelados [Modelado]\nrows:\n${rows}\n\`\`\``);
  }

  if (m.m3_keyword_gap?.status === "complete") {
    const gap = m.m3_keyword_gap.gap_table.slice(0, 15);
    const gapRows = gap.map((row) => {
      const comps = row.competitors.map((c) => `${c.name.split(".")[0]} #${c.position}`).join(" · ");
      return `  - keyword: ${JSON.stringify(row.keyword)}\n    volume: ${row.volume ?? "—"}\n    target_position: ${row.target_position ?? "—"}\n    competitors: ${JSON.stringify(comps)}`;
    }).join("\n");
    const striking = m.m3_keyword_gap.striking_distance.slice(0, 10);
    const stRows = striking.map((row) =>
      `  - keyword: ${JSON.stringify(row.keyword)}\n    volume: ${row.volume ?? "—"}\n    position: ${row.position}\n    ctr_uplift_modeled: ${row.ctr_uplift_modeled}\n    opportunity_score: ${row.opportunity_score}`
    ).join("\n");
    out.push(`\n## Gap de palavras-chave (top 15 por volume)\n\nKeywords nas quais algum concorrente rankeia top 20 e o alvo está fora do top 100 (ou ausente).\n\n\`\`\`agentic-table\nversion: 1\ncolumns:\n  - key: keyword\n    label: Palavra-chave\n  - key: volume\n    label: Volume\n  - key: target_position\n    label: Posição alvo\n  - key: competitors\n    label: Concorrentes (posição)\nrows:\n${gapRows}\n\`\`\`\n\n## Oportunidades de avanço (striking distance — top 10)\n\nPosições 4-20 do alvo, ordenadas pelo ganho potencial modelado de subir até #1 (curva ${runYaml.provider.ctr_curve.primary_id}).\n\n\`\`\`agentic-table\nversion: 1\ncolumns:\n  - key: keyword\n    label: Palavra-chave\n  - key: volume\n    label: Volume\n  - key: position\n    label: Posição atual\n  - key: ctr_uplift_modeled\n    label: Uplift CTR [Modelado]\n  - key: opportunity_score\n    label: Score de oportunidade\nrows:\n${stRows}\n\`\`\``);
  }

  if (m.m4_link_gap?.status === "referenced") {
    const rows = m.m4_link_gap.players.map((r) =>
      `  - player: ${r.player}\n    backlinks: ${r.backlinks ?? "—"}\n    referring_domains: ${r.referring_domains ?? "—"}\n    backlinks_per_rd: ${r.backlinks_per_referring_domain ?? "—"}\n    rank: ${r.rank ?? "—"}\n    spam_score: ${r.spam_score ?? "—"}`
    ).join("\n");
    out.push(`\n## Perfil de backlinks\n\nHeadline KPIs a partir de \`/v3/backlinks/summary/live\`. Link Gap por RD entre os players, anchor diff cross-player e velocity delta exigem \`backlink-analysis\` em modo multi-competitor — referenciado, não duplicado neste módulo.\n\n\`\`\`agentic-table\nversion: 1\ncolumns:\n  - key: player\n    label: Participante\n  - key: backlinks\n    label: Backlinks\n  - key: referring_domains\n    label: Domínios referenciadores\n  - key: backlinks_per_rd\n    label: Backlinks por RD\n  - key: rank\n    label: Rank DataForSEO\n  - key: spam_score\n    label: Spam score\nrows:\n${rows}\n\`\`\``);
  }

  if (m.m5_content_footprint?.status === "complete") {
    const rows = m.m5_content_footprint.players.map((r) => {
      const tops = r.top_paths.map((p) => `${p.path} (${fmt(p.urls)})`).join(", ");
      return `  - player: ${r.player}\n    total_urls: ${fmt(r.total_urls)}\n    discovery_method: ${r.discovery_method || "—"}\n    top_paths: ${JSON.stringify(tops)}`;
    }).join("\n");
    out.push(`\n## Cobertura editorial (sitemap)\n\nInventário de URLs por seção do sitemap. Indica profundidade editorial; não é juízo de qualidade.\n\n\`\`\`agentic-table\nversion: 1\ncolumns:\n  - key: player\n    label: Participante\n  - key: total_urls\n    label: URLs no sitemap\n  - key: discovery_method\n    label: Método de descoberta\n  - key: top_paths\n    label: Seções principais\nrows:\n${rows}\n\`\`\``);
  }

  if (m.m6_head_to_head?.status === "complete") {
    const pair = m.m6_head_to_head.page_matrix[0];
    out.push(`\n## Comparação página a página (homepages)\n\n${m.m6_head_to_head.note}\n\n\`\`\`agentic-table\nversion: 1\ncolumns:\n  - key: dimension\n    label: Dimensão\n  - key: target\n    label: ${target}\n  - key: competitor\n    label: ${competitors[0]}\nrows:\n  - dimension: H1\n    target: ${JSON.stringify(pair.target.h1 || "—")}\n    competitor: ${JSON.stringify(pair.competitor.h1 || "—")}\n  - dimension: Title tag\n    target: ${JSON.stringify(pair.target.title || "—")}\n    competitor: ${JSON.stringify(pair.competitor.title || "—")}\n  - dimension: H2 count\n    target: ${pair.target.h2_count ?? "—"}\n    competitor: ${pair.competitor.h2_count ?? "—"}\n\`\`\``);
  }

  if (m.m7_brand?.status === "complete") {
    const posRows = m.m7_brand.positioning_table.map((r) =>
      `  - player: ${r.player}\n    h1_excerpt: ${JSON.stringify(r.h1.excerpt_literal || "—")}\n    h1_position: ${r.h1.position || "—"}\n    title_tag: ${JSON.stringify(r.title_tag || "—")}`
    ).join("\n");
    const ctasByPlayer = {};
    for (const c of m.m7_brand.cta_table) { (ctasByPlayer[c.player] = ctasByPlayer[c.player] || []).push(c); }
    const ctaRows = Object.entries(ctasByPlayer).flatMap(([player, list]) => list.slice(0, 4).map((c) =>
      `  - player: ${player}\n    cta_text: ${JSON.stringify(c.cta_text)}\n    cta_position: ${c.cta_position}\n    pressure_label: ${c.pressure_label}`
    )).join("\n");
    const claimRows = m.m7_brand.claims_unverified.map((c) =>
      `  - player: ${c.player}\n    excerpt: ${JSON.stringify(c.excerpt_literal)}\n    position: ${c.position}\n    reason: ${JSON.stringify(c.reason)}`
    ).join("\n");
    out.push(`\n## Posicionamento e mensagem (observação literal)\n\nRecortes da homepage capturados em ${runYaml.market_context.generated_at}. Trechos literais antes de qualquer rótulo qualitativo.\n\n\`\`\`agentic-table\nversion: 1\ncolumns:\n  - key: player\n    label: Participante\n  - key: h1_excerpt\n    label: H1 (literal)\n  - key: h1_position\n    label: Posição\n  - key: title_tag\n    label: Title tag\nrows:\n${posRows}\n\`\`\`\n\n## CTAs visíveis\n\n\`\`\`agentic-table\nversion: 1\ncolumns:\n  - key: player\n    label: Participante\n  - key: cta_text\n    label: Texto (literal)\n  - key: cta_position\n    label: Posição\n  - key: pressure_label\n    label: Pressão de conversão\nrows:\n${ctaRows}\n\`\`\`${claimRows ? `\n\n## Claims não verificados\n\n\`\`\`agentic-table\nversion: 1\ncolumns:\n  - key: player\n    label: Participante\n  - key: excerpt\n    label: Trecho literal\n  - key: position\n    label: Posição\n  - key: reason\n    label: Motivo\nrows:\n${claimRows}\n\`\`\`` : ""}`);
  }

  out.push(`\n## Síntese e próximas investigações\n\n${ctx.synthesis}\n\n## Limitações\n\n${ctx.limitations.map((l) => `- ${l}`).join("\n")}\n\n## Próximas ações\n\n${ctx.nextActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n`);
  return out.join("\n");
}

function synthesize({ target, competitors, runYaml }) {
  const lines = [];
  const m = runYaml.modules;
  const sov = m.m2_share_of_voice?.sov_table || [];
  const sovT = sov.find((r) => r.player === target); const sovC = sov.find((r) => r.player === competitors[0]);
  if (sovT && sovC) {
    if (sovT.sov_pct > sovC.sov_pct) lines.push(`No universo amostrado, **${target}** lidera o Share of Voice modelado (${sovT.sov_pct}% vs ${sovC.sov_pct}% de ${competitors[0]}).`);
    else if (sovT.sov_pct < sovC.sov_pct) lines.push(`No universo amostrado, **${competitors[0]}** lidera o SoV modelado (${sovC.sov_pct}% vs ${sovT.sov_pct}% de ${target}).`);
  }
  const bl = m.m4_link_gap?.players || [];
  const bT = bl.find((r) => r.player === target); const bC = bl.find((r) => r.player === competitors[0]);
  if (bT?.referring_domains && bC?.referring_domains) {
    const ratio = Math.round((bT.referring_domains / bC.referring_domains) * 10) / 10;
    if (ratio >= 1.5) lines.push(`**${target}** tem ${ratio}× mais domínios referenciadores que **${competitors[0]}** (${bT.referring_domains} vs ${bC.referring_domains}).`);
    else if (ratio <= 0.66) lines.push(`**${competitors[0]}** tem ${Math.round(1 / ratio * 10) / 10}× mais domínios referenciadores que **${target}**.`);
  }
  if (bT?.spam_score != null && bC?.spam_score != null && Math.abs(bT.spam_score - bC.spam_score) > 5) {
    const dirty = bT.spam_score > bC.spam_score ? target : competitors[0];
    lines.push(`Spam score divergente: **${dirty}** carrega o maior; recomenda-se auditoria de RDs antes de qualquer decisão de disavow.`);
  }
  const gap = m.m3_keyword_gap?.gap_table || [];
  if (gap.length) lines.push(`${gap.length} keywords gap relevantes; top 3 por volume: ${gap.slice(0, 3).map((r) => `\`${r.keyword}\``).join(", ")}.`);
  const st = m.m3_keyword_gap?.striking_distance || [];
  if (st.length) lines.push(`${st.length} oportunidades em striking distance; o top do ranking de oportunidade é \`${st[0].keyword}\` (volume ${fmt(st[0].volume)}, posição ${st[0].position}).`);
  const claims = m.m7_brand?.claims_unverified || [];
  if (claims.length) lines.push(`A home de **${claims[0].player}** carrega claim superlativo sem fonte verificável adjacente — investigação recomendada antes de virar prova competitiva.`);
  return lines.length ? lines.map((l) => `- ${l}`).join("\n") : "- Sem leituras automáticas geradas; ver tabelas acima.";
}

function inferMode(target, competitors, explicit) {
  const isUrl = (s) => /^https?:\/\//i.test(String(s));
  const allPlayers = [target, ...competitors];
  const urlPlayers = allPlayers.filter(isUrl).length;
  if (explicit && ["domain", "url", "mixed"].includes(explicit)) {
    if (explicit === "domain" && urlPlayers > 0) return { blocked: true, reason: `mode=domain but ${urlPlayers} player(s) look like URLs (have http(s)://)` };
    if (explicit === "url" && urlPlayers < allPlayers.length) return { blocked: true, reason: `mode=url but ${allPlayers.length - urlPlayers} player(s) look like domains (no http(s)://)` };
    return { mode: explicit };
  }
  if (urlPlayers === 0) return { mode: "domain" };
  if (urlPlayers === allPlayers.length) return { mode: "url" };
  return { mode: "mixed" };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const usage = "Missing --target. Usage: --target <domain|url> --competitors <a,b> [--mode domain|url|mixed] [--preset domain-full|quick|url-headtohead|content-only|brand-only|full] [--location-code 2076] [--language-code pt] [--keyword-limit 500] [--ctr-curve-id awr_2026_q2] [--attach-backlink-analysis-run slug] [--sample] [--confirm-budget] [--offline]";
  if (!args.target) {
    process.stdout.write(JSON.stringify({ ok: false, error: usage }, null, 2) + "\n");
    process.exit(2);
  }
  const target = String(args.target).trim();
  const competitors = String(args.competitors || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (competitors.length === 0) { process.stdout.write(JSON.stringify({ ok: false, error: "Missing --competitors (comma-separated, at least one)." }, null, 2) + "\n"); process.exit(2); }
  const modeResolution = inferMode(target, competitors, args.mode ? String(args.mode) : null);
  if (modeResolution.blocked) {
    process.stdout.write(JSON.stringify({ ok: false, status: "blocked", gate: "mode", error: modeResolution.reason }, null, 2) + "\n");
    process.exit(2);
  }
  const mode = modeResolution.mode;
  const presetName = String(args.preset || "domain-full");
  const enabledModules = new Set(PRESETS[presetName] || PRESETS["domain-full"]);
  if (args.modules) for (const m of String(args.modules).split(",")) enabledModules.add(m.trim());
  const locationCode = Number(args.location_code || 2076);
  const languageCode = String(args.language_code || "pt");
  const sampleMode = Boolean(args.sample);
  let keywordLimit = Number(args.keyword_limit || 500);
  if (sampleMode) keywordLimit = Math.min(keywordLimit, 50);
  const players = [target, ...competitors];
  const budgetTotal = players.length * keywordLimit;
  if (budgetTotal > 500 && !args.confirm_budget && !sampleMode && !args.offline) {
    process.stdout.write(JSON.stringify({ ok: false, status: "blocked", gate: "budget", message: `players × keyword_limit = ${budgetTotal} > 500. Re-run with --confirm-budget to proceed or --sample to cap keyword_limit at 50.` }, null, 2) + "\n");
    process.exit(2);
  }
  const attachBacklinkRun = args.attach_backlink_analysis_run ? String(args.attach_backlink_analysis_run) : null;
  const offline = Boolean(args.offline);
  const date = new Date().toISOString().slice(0, 10);
  const slug = `${slugify(target)}-vs-${competitors.map(slugify).join("-vs-")}-${date}`;
  const runDir = join(PROJECT, "audits", `competitive-${slug}`);
  const sourcesDir = join(runDir, "sources");
  const reportPath = join(PROJECT, "analyses", "competitive-analysis", slug, "report.md");

  // CTR curve gate: prefer --ctr-curve-id when supplied; otherwise selectPrimary precedence.
  const curveRoot = join(ROOT, "shared", "ctr-curves");
  const preferCurve = args.ctr_curve_id ? String(args.ctr_curve_id) : null;
  const curve = selectPrimaryCurve({ root: curveRoot, prefer: preferCurve, warn: (msg) => process.stderr.write(`${msg}\n`) });

  const modules = {};
  const evidenceFor = {};
  if (enabledModules.has("m1_footprint") || enabledModules.has("m2_share_of_voice") || enabledModules.has("m3_keyword_gap")) {
    process.stderr.write(`[ranked-keywords] ${players.length} players, limit ${keywordLimit}${offline ? " (offline fixture)" : ""}\n`);
    for (const p of players) {
      const items = offline ? offlineFixtureItems(p) : rankedKeywords(p, { locationCode, languageCode, limit: keywordLimit });
      const evidencePath = join("audits", `competitive-${slug}`, "sources", "footprint", `${slugify(p)}.json`);
      writeJson(join(sourcesDir, "footprint", `${slugify(p)}.json`), { target: p, items_count: items.length, items, is_offline_fixture: offline });
      evidenceFor[p] = { items, evidencePath };
    }
  }

  if (enabledModules.has("m1_footprint")) {
    const byPlayer = {};
    for (const p of players) byPlayer[p] = buildM1(evidenceFor[p].items, evidenceFor[p].evidencePath);
    modules.m1_footprint = { status: "complete", by_player: byPlayer };
  }

  if (enabledModules.has("m2_share_of_voice")) {
    const idxs = {}; for (const p of players) idxs[p] = indexByKeyword(evidenceFor[p].items);
    modules.m2_share_of_voice = { status: "complete", ...buildM2(curve, idxs) };
  }

  if (enabledModules.has("m3_keyword_gap")) {
    const tIdx = indexByKeyword(evidenceFor[target].items);
    const cIdxs = new Map(competitors.map((c) => [c, indexByKeyword(evidenceFor[c].items)]));
    modules.m3_keyword_gap = { status: "complete", ...buildM3(tIdx, cIdxs, curve) };
  }

  if (enabledModules.has("m4_link_gap")) {
    process.stderr.write(`[backlinks] ${players.length} players${offline ? " (offline fixture)" : ""}\n`);
    const bl = {};
    for (const p of players) {
      const s = offline ? offlineFixtureBacklinks(p) : (backlinksSummary(p) || {});
      bl[p] = { backlinks: s.backlinks ?? null, referring_domains: s.referring_domains ?? null, rank: s.rank ?? null, spam_score: s.spam_score ?? null };
      writeJson(join(sourcesDir, "backlinks", `${slugify(p)}.json`), bl[p]);
    }
    modules.m4_link_gap = { status: "referenced", ...buildM4(bl, attachBacklinkRun) };
  }

  if (enabledModules.has("m5_content_footprint")) {
    process.stderr.write(`[content-footprint] sitemap discovery${offline ? " (offline fixture)" : ""}\n`);
    const content = {};
    for (const p of players) {
      const { urls, note } = offline ? { urls: offlineFixtureSitemap(p), note: "offline_fixture" } : fetchSitemapUrls(p);
      const counts = {}; for (const u of urls) { const pre = pathPrefix(u); counts[pre] = (counts[pre] || 0) + 1; }
      content[p] = { total_urls: urls.length, by_path_prefix: counts, discovery: note };
      writeJson(join(sourcesDir, "content", `${slugify(p)}.json`), { target: p, urls: urls.slice(0, 100), summary: content[p] });
    }
    modules.m5_content_footprint = { status: "complete", ...buildM5(content) };
  }

  let brand = {};
  if (enabledModules.has("m6_head_to_head") || enabledModules.has("m7_brand")) {
    process.stderr.write(`[homepage] observação literal${offline ? " (offline fixture)" : ""}\n`);
    for (const p of players) {
      const obs = offline ? offlineFixtureHomepage(p) : (homepageObserve(`https://www.${p}/`) || homepageObserve(`https://${p}/`));
      brand[p] = obs;
      if (obs) writeJson(join(sourcesDir, "brand", `${slugify(p)}.json`), obs);
    }
  }
  if (enabledModules.has("m6_head_to_head")) modules.m6_head_to_head = { status: "complete", ...buildM6(brand) };
  if (enabledModules.has("m7_brand")) modules.m7_brand = { status: "complete", ...buildM7(brand) };

  // Modules disabled => mark not_run
  for (const mod of ["m1_footprint", "m2_share_of_voice", "m3_keyword_gap", "m4_link_gap", "m5_content_footprint", "m6_head_to_head", "m7_brand"]) {
    if (!modules[mod]) modules[mod] = { status: "not_run", reason: `Module not in preset ${presetName}.` };
  }

  const runYaml = {
    status: "complete",
    run_slug: slug,
    mode,
    preset: presetName,
    market_context: { location_code: locationCode, language_code: languageCode, device: "desktop", generated_at: new Date().toISOString() },
    provider: {
      dataforseo: { available: true, bypass: null },
      ctr_curve: { primary_id: curve.id, primary_captured_at: curve.captured_at, aio_delta_id: null },
    },
    budgets: { players: players.length, keywords: keywordLimit, alerted: budgetTotal > 500, sample_mode: sampleMode, confirmed: Boolean(args.confirm_budget) },
    attachments: { backlink_analysis_run: attachBacklinkRun, serp_extract_run: null, topic_cluster_ref: args.topic_cluster_ref || null },
    players: {
      target: { input: target, normalized: target, type: "domain" },
      competitors: competitors.map((c) => ({ input: c, normalized: c, type: "domain", source: "user", evidence_row: null })),
    },
    modules,
    log_entry_plan: { path: "project/brain/log.md", tipo: "decisao", summary: `Análise competitiva ${target} vs ${competitors.join(", ")}.` },
  };
  writeYaml(join(runDir, "report.yaml"), runYaml);

  const modulesRun = Object.entries(modules).filter(([, v]) => v.status === "complete" || v.status === "referenced").map(([k]) => k);
  const lead = `Comparação entre **${target}** (alvo) e **${competitors.join("**, **")}** (concorrente${competitors.length > 1 ? "s" : ""}) no mercado pt-BR/Brasil/desktop. Universo de até ${keywordLimit} keywords por player; backlinks summary; sitemap; homepage. Curva CTR ${curve.id} (modelada, não observada).`;
  const limitations = [
    `Coleta de ranked_keywords limitada a ${keywordLimit} por domínio para conter custo; aumentar via --keyword-limit.`,
    "Backlinks multi-competitor (domain_intersection, anchor diff cross-player, velocity) referenciam backlink-analysis v2 — não recomputados aqui.",
    "Head-to-head limitado às homepages quando rodado em modo domain; intent-specific URLs exigem --target-urls/--competitor-urls.",
    `Share of Voice modelado com curva ${curve.id} (clean SERP); presença de AI Overview tende a superestimar SoV.`,
    "Observação de marca cobre apenas a homepage; landing pages secundárias, prova social interna e pricing não foram inventariados.",
  ];
  const nextActions = [
    "Investigar manualmente top RDs com spam score alto antes de qualquer decisão de disavow.",
    "Capturar HTML das páginas internas que rankeiam para keywords em comum para comparação intent-a-intent.",
    "Para cada gap por volume × intent, decidir entre criar conteúdo novo ou otimizar existente.",
    "Validar claims declarados na homepage (superlativos) com fontes verificáveis antes de promover para a brain do projeto.",
  ];

  const synthesis = synthesize({ target, competitors, runYaml });
  const md = composeReport({ target, competitors, runYaml, lead, synthesis, limitations, nextActions });
  writeText(reportPath, md);

  // Brain decision gate: M7 (brand synthesis) is the module that proposes brain
  // entries. Only append to brain/log.md when M7 actually ran so quick / content-only
  // / non-brand runs do not pollute the log.
  const logAppended = modulesRun.includes("m7_brand")
    ? appendBrainLog({ projectRoot: PROJECT, runSlug: slug, target, competitors, modulesRun })
    : false;

  const reportRel = relative(PROJECT, reportPath);
  process.stdout.write(JSON.stringify({
    ok: true,
    run_slug: slug,
    report_md: reportRel,
    source_artifact: `audits/competitive-${slug}/report.yaml`,
    modules_run: modulesRun,
    log_appended: logAppended,
    browser_prompt: { recommended: true, message: REPORT_BROWSER_PROMPT_MESSAGE, report_md: reportRel, open_with: "project-browser" },
  }, null, 2) + "\n");
}

main().catch((e) => { process.stdout.write(JSON.stringify({ ok: false, error: e.message }, null, 2) + "\n"); process.exit(1); });
