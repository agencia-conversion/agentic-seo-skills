import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.HOME = join(tmpdir(), `seo-brain-home-${process.pid}`);
mkdirSync(join(process.env.HOME, ".seo-brain"), { recursive: true });
writeFileSync(
  join(process.env.HOME, ".seo-brain", "credentials.json"),
  JSON.stringify({ dataforseo_login: "user@example.com", dataforseo_password: "secret-api-pw", dataforseo_mode: "live" }),
);

const { dataforseoCredentialStatus, normalizeBacklinkReport, taskResultReady } = await import("../dist/seo-brain.js");

const credentialStatus = dataforseoCredentialStatus();
assert.equal(credentialStatus.dataforseo_configured, true);
assert.equal(credentialStatus.home_credentials_present, true);
assert.equal(credentialStatus.home_mode, "live");

assert.equal(
  taskResultReady({
    tasks: [{ status_code: 40602, status_message: "Task In Queue.", result: null }],
  }),
  false,
);

assert.equal(
  taskResultReady({
    tasks: [{ status_code: 20000, status_message: "Ok.", result: [{ items: [] }] }],
  }),
  true,
);

const backlink = normalizeBacklinkReport(
  "example.com",
  ["competitor.com"],
  {
    mode: "live",
    requested_mode: "standard",
    settings: { limit: 1, include_subdomains: true, backlinks_status_type: "live" },
    endpoints: ["/v3/backlinks/summary/live"],
    summary: {
      tasks: [
        { data: { target: "example.com" }, result: [{ backlinks: 10, referring_domains: 3, referring_main_domains: 2, rank: 50, backlinks_spam_score: 1 }] },
        { data: { target: "competitor.com" }, result: [{ backlinks: 15, referring_domains: 5, referring_main_domains: 4, rank: 60, backlinks_spam_score: 2 }] },
      ],
    },
    referring_domains: { tasks: [{ result: [{ items: [{ domain: "ref.com", backlinks: 4, rank: 40 }] }] }] },
    anchors: { tasks: [{ result: [{ items: [{ anchor: "brand", backlinks: 6, referring_domains: 2 }] }] }] },
    backlinks: { tasks: [{ result: [{ items: [{ url_from: "https://ref.com/a", url_to: "https://example.com", anchor: "brand", dofollow: true }] }] }] },
  },
);

assert.equal(backlink.provider, "dataforseo");
assert.equal(backlink.requested_mode, "standard");
assert.equal(backlink.backlinks, 10);
assert.equal(backlink.top_referring_domains[0].domain, "ref.com");
assert.equal(backlink.top_anchors[0].anchor, "brand");
assert.equal(backlink.sample_backlinks[0].from, "https://ref.com/a");
assert.equal(backlink.competitor_comparison[0].backlink_delta_vs_target, 5);

rmSync(process.env.HOME, { recursive: true, force: true });
console.log("dataforseo modes ok");
