import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { normalizeKeywords, normalizeSuggestions, collectKeywords } = await import("../dist/agentic-seo.js");

// normalizeKeywords single-keyword response keeps current shape
{
  const source = {
    tasks: [{ result: [{ keyword: "agentic seo", search_volume: 320, competition: 0.4, cpc: 0.5, monthly_searches: [] }] }],
    mode: "live",
  };
  const out = normalizeKeywords(source, ["agentic seo"], "Brazil", "pt");
  assert.equal(out.keyword, "agentic seo");
  assert.deepEqual(out.keywords_input, ["agentic seo"]);
  assert.equal(out.keywords.length, 1);
  assert.equal(out.keywords[0].search_volume, 320);
  assert.equal(out.provider, "dataforseo");
}

// normalizeKeywords bulk: many results in tasks[0].result
{
  const source = {
    tasks: [{ result: [
      { keyword: "agentic seo", search_volume: 320, competition: 0.4 },
      { keyword: "seo com ia", search_volume: 1900, competition: 0.6 },
      { keyword: "seo automatizado", search_volume: 50, competition: 0.2 },
    ] }],
    mode: "live",
  };
  const out = normalizeKeywords(source, ["agentic seo", "seo com ia", "seo automatizado"], "Brazil", "pt");
  assert.equal(out.keywords.length, 3);
  assert.deepEqual(out.keywords.map((k) => k.keyword), ["agentic seo", "seo com ia", "seo automatizado"]);
  assert.equal(out.keywords[1].search_volume, 1900);
  assert.equal(out.keyword, "agentic seo");
}

// normalizeKeywords offline produces null entries for every requested keyword
{
  const out = normalizeKeywords({ tasks: [], mode: "offline" }, ["a", "b", "c"], "Brazil", "pt");
  assert.equal(out.keywords.length, 3);
  assert.equal(out.provider, "offline");
  for (const item of out.keywords) {
    assert.equal(item.search_volume, null);
    assert.equal(item.competition, null);
  }
}

// normalizeKeywords rejects empty input
{
  assert.throws(() => normalizeKeywords({ tasks: [] }, [], "Brazil", "pt"), /non-empty keywords/);
}

// normalizeSuggestions: DataForSEO Labs nested shape (result.items[].keyword_info.search_volume)
{
  const source = {
    tasks: [{ result: [{
      seed_keyword: "agentic seo",
      items_count: 3,
      items: [
        { keyword: "agentic seo", keyword_info: { search_volume: 320, competition: 0.4, cpc: 1.2 }, keyword_difficulty: 35 },
        { keyword: "seo com agentes", keyword_info: { search_volume: 90, competition: null, cpc: null } },
        { keyword: "ai seo agent", keyword_info: { search_volume: 1100, competition: 0.6, cpc: 2.1 }, search_intent_info: { main_intent: "informational" } },
      ],
    }] }],
    mode: "live",
  };
  const out = normalizeSuggestions(source, "agentic seo", "Brazil", "pt");
  assert.equal(out.type, "suggestions");
  assert.equal(out.seed, "agentic seo");
  assert.equal(out.keywords.length, 3);
  assert.equal(out.keywords[0].search_volume, 320);
  assert.equal(out.keywords[0].keyword_difficulty, 35);
  assert.equal(out.keywords[1].search_volume, 90);
  assert.equal(out.keywords[2].search_intent_info.main_intent, "informational");
  assert.equal(out.provider, "dataforseo");
}

// normalizeSuggestions: legacy flat shape (result[i].search_volume) still parses
{
  const source = {
    tasks: [{ result: [
      { keyword: "agentic seo", search_volume: 320 },
      { keyword: "seo com agentes", search_volume: 90 },
    ] }],
    mode: "live",
  };
  const out = normalizeSuggestions(source, "agentic seo", "Brazil", "pt");
  assert.equal(out.keywords.length, 2);
  assert.equal(out.keywords[0].search_volume, 320);
}

// normalizeSuggestions offline produces empty list with note
{
  const out = normalizeSuggestions({ tasks: [], mode: "offline" }, "x", "Brazil", "pt");
  assert.equal(out.keywords.length, 0);
  assert.equal(out.provider, "offline");
  assert.match(out.note, /Suggestions unavailable/);
}

// collectKeywords from --keyword
{
  assert.deepEqual(collectKeywords({ _: [], keyword: "agentic seo" }), ["agentic seo"]);
}

// collectKeywords from positional args
{
  assert.deepEqual(collectKeywords({ _: ["one", "two"] }), ["one", "two"]);
}

// collectKeywords dedups
{
  assert.deepEqual(collectKeywords({ _: ["one"], keyword: "one" }), ["one"]);
}

// collectKeywords from file (skips blanks and # comments)
{
  const tmp = mkdtempSync(join(tmpdir(), "kw-list-"));
  const file = join(tmp, "list.txt");
  writeFileSync(file, "alpha\n# comment\nbeta\n  gamma  \n\n");
  try {
    assert.deepEqual(collectKeywords({ _: [], keywords_file: file }), ["alpha", "beta", "gamma"]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// collectKeywords throws if no input
{
  assert.throws(() => collectKeywords({ _: [] }), /Missing keywords/);
}

console.log("keyword-research modes ok");
