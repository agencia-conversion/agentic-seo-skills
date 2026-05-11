import assert from "node:assert/strict";

const { normalizeSerpBatch } = await import("../dist/agentic-seo.js");

// Per-task keyword decoded from result.keyword and items split organic vs features
{
  const source = {
    mode: "live",
    tasks: [
      {
        result: [{
          keyword: "agentic seo",
          items: [
            { type: "organic", rank_absolute: 1, rank_group: 1, title: "What is Agentic SEO", url: "https://example.com/a", domain: "example.com", description: "Definition and overview" },
            { type: "organic", rank_absolute: 2, rank_group: 2, title: "Agentic SEO guide", url: "https://example.com/b", domain: "example.com", description: "Step by step" },
            { type: "people_also_ask", title: "PAA block" },
            { type: "video", title: "video pack" },
          ],
        }],
      },
      {
        result: [{
          keyword: "seo com ia",
          items: [
            { type: "organic", rank_absolute: 1, title: "SEO com IA", url: "https://other.com/x", domain: "other.com", description: "How AI changes SEO" },
            { type: "shopping", title: "shopping pack" },
            { type: "featured_snippet", title: "snippet" },
          ],
        }],
      },
    ],
  };
  const out = normalizeSerpBatch(source, ["agentic seo", "seo com ia"], "Brazil", "pt", "desktop");
  assert.equal(out.length, 2);
  assert.equal(out[0].keyword, "agentic seo");
  assert.equal(out[0].provider, "dataforseo");
  assert.equal(out[0].organic_results.length, 2);
  assert.deepEqual(out[0].serp_features, ["people_also_ask", "video"]);
  assert.equal(out[1].keyword, "seo com ia");
  assert.equal(out[1].organic_results.length, 1);
  assert.deepEqual(out[1].serp_features, ["featured_snippet", "shopping"]);
  assert.equal(out[1].organic_results[0].domain, "other.com");
}

// Output preserves keyword order even when DataForSEO returns tasks in different order
{
  const source = {
    mode: "live",
    tasks: [
      { result: [{ keyword: "second", items: [{ type: "organic", title: "B" }] }] },
      { result: [{ keyword: "first", items: [{ type: "organic", title: "A" }] }] },
    ],
  };
  const out = normalizeSerpBatch(source, ["first", "second"], "Brazil", "pt", "desktop");
  assert.deepEqual(out.map((entry) => entry.keyword), ["first", "second"]);
  assert.equal(out[0].organic_results[0].title, "A");
  assert.equal(out[1].organic_results[0].title, "B");
}

// Partial response: keywords missing from the response keep dataforseo provider but with empty results
{
  const source = {
    mode: "live",
    tasks: [
      { result: [{ keyword: "alpha", items: [{ type: "organic", title: "Alpha 1" }] }] },
    ],
  };
  const out = normalizeSerpBatch(source, ["alpha", "beta"], "Brazil", "pt", "desktop");
  assert.equal(out[0].keyword, "alpha");
  assert.equal(out[0].provider, "dataforseo");
  assert.equal(out[0].organic_results.length, 1);
  assert.equal(out[1].keyword, "beta");
  assert.equal(out[1].provider, "dataforseo", "keyword missing from response is still tagged dataforseo because the call was made");
  assert.deepEqual(out[1].organic_results, [], "missing keyword has empty organic results");
  assert.deepEqual(out[1].serp_features, []);
}

// Offline source: every requested keyword gets an empty entry tagged offline
{
  const out = normalizeSerpBatch({ tasks: [], mode: "offline" }, ["x", "y", "z"], "Brazil", "pt", "desktop");
  assert.equal(out.length, 3);
  for (const entry of out) {
    assert.equal(entry.provider, "offline");
    assert.deepEqual(entry.organic_results, []);
    assert.deepEqual(entry.serp_features, []);
  }
}

// Empty input rejected
{
  assert.throws(() => normalizeSerpBatch({ tasks: [] }, [], "Brazil", "pt", "desktop"), /non-empty/);
}

console.log("serp batch ok");
