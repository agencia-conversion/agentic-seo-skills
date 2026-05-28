import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { readWikiContext } from "./wiki-context.mjs";
import { resolveVoicePolicy } from "./voice-resolver.mjs";
import { buildDecisions } from "./decisions-builder.mjs";

function readYamlSafe(file) {
  if (!file || !fs.existsSync(file)) return null;
  try {
    return YAML.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function findSeoAnalysis(projectDir, keywordSlug) {
  const dir = path.join(projectDir, "workbench", "seo-analysis");
  if (!fs.existsSync(dir)) return null;
  const yamlPath = path.join(dir, `${keywordSlug}.yaml`);
  if (fs.existsSync(yamlPath)) return yamlPath;
  const ymlPath = path.join(dir, `${keywordSlug}.yml`);
  if (fs.existsSync(ymlPath)) return ymlPath;
  const jsonPath = path.join(dir, `${keywordSlug}.json`);
  if (fs.existsSync(jsonPath)) return jsonPath;
  return null;
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

export async function runPreflight({ projectDir, topic, keyword, args, slugify, today }) {
  if (!projectDir || typeof projectDir !== "string") throw new Error("runPreflight: projectDir required");
  if (!topic || typeof topic !== "string") throw new Error("runPreflight: topic required");
  if (typeof slugify !== "function") throw new Error("runPreflight: slugify required");
  const keywordValue = keyword || topic;
  const topicSlug = slugify(topic);
  const keywordSlug = slugify(keywordValue);

  const wikiContext = readWikiContext({ projectDir });
  const voicePolicy = resolveVoicePolicy({ wikiContext });
  const seoPath = findSeoAnalysis(projectDir, keywordSlug);
  const seoReport = seoPath ? readYamlSafe(seoPath) : null;

  const decisions = buildDecisions({
    projectDir,
    wikiContext,
    voicePolicy,
    seoReport,
    topic,
    keyword: keywordValue,
    slugify,
    today,
  });
  if (seoPath) {
    decisions.data_provenance = {
      seo_analysis: { path: path.relative(projectDir, seoPath) },
    };
  }

  const decisionsPath = path.join(projectDir, "workbench", "content", topicSlug, "decisions.yaml");
  ensureDir(decisionsPath);
  fs.writeFileSync(decisionsPath, YAML.stringify(decisions), "utf8");

  return { decisions, decisionsPath };
}
