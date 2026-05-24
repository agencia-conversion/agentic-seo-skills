import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import sharedModules from "../../shared/report-modules.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { REPORT_MODULE_IDS, REPORT_DIR_NAME } = sharedModules;
const MODULES = new Set(REPORT_MODULE_IDS);
const COMMON_FRONTMATTER = ["title", "slug", "report_type", "generated_at", "status", "source_artifact", "summary"];

function normalizeRel(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function addError(errors, code, message, hint, report) {
  errors.push({ code, message, ...(hint ? { hint } : {}), ...(report ? { report } : {}) });
}

export function parseFrontmatter(text) {
  const match = String(text || "").match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: String(text || ""), error: "missing frontmatter" };
  try {
    return { data: YAML.parse(match[1]) || {}, body: String(text || "").slice(match[0].length), error: null };
  } catch (error) {
    return { data: {}, body: String(text || "").slice(match[0].length), error: error.message };
  }
}

export function visualFences(text) {
  return [...String(text || "").matchAll(/```(agentic-(?:kpis|chart|table))\n([\s\S]*?)```/g)].map((match) => {
    let payload = null;
    let error = null;
    try {
      payload = YAML.parse(match[2]);
    } catch (err) {
      error = err.message;
    }
    return { kind: match[1], body: match[2], payload, error, index: match.index ?? 0 };
  });
}

function visibleBody(text) {
  return String(text || "").replace(/```[\s\S]*?```/g, "");
}

function h2Sections(body) {
  const matches = [...String(body || "").matchAll(/^##\s+(.+?)\s*$/gm)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const next = matches[index + 1]?.index ?? body.length;
    return {
      heading: match[1].trim(),
      body: body.slice(start + match[0].length, next),
      start,
      end: next,
    };
  });
}

function headingCandidates(item) {
  if (typeof item === "string") return [item];
  if (Array.isArray(item?.headings)) return item.headings;
  if (Array.isArray(item?.heading)) return item.heading;
  if (item?.heading) return [item.heading];
  if (item?.id) return [item.id];
  return [];
}

function sectionMatches(section, candidates) {
  const actual = normalizeText(section.heading);
  return candidates.some((candidate) => actual === normalizeText(candidate));
}

function findSection(sections, item) {
  const candidates = headingCandidates(item);
  return sections.find((section) => sectionMatches(section, candidates)) || null;
}

function columnCandidates(column) {
  if (typeof column === "string") return [column];
  return [column?.key, ...(column?.aliases || [])].filter(Boolean);
}

function resolveColumnKey(columns, requiredColumn) {
  const candidates = new Set(columnCandidates(requiredColumn).map(normalizeText));
  for (const column of columns || []) {
    const keys = [column?.key, column?.label].filter(Boolean).map(normalizeText);
    if (keys.some((key) => candidates.has(key))) return column.key;
  }
  return null;
}

function tableLabel(tableSpec) {
  return tableSpec?.id || headingCandidates(tableSpec?.section || tableSpec)[0] || "table";
}

function valueAtPath(data, dottedPath) {
  return String(dottedPath || "").split(".").filter(Boolean).reduce((value, key) => value && value[key], data);
}

function matchesOverride(sourceData, override) {
  if (!sourceData || !override?.source_path) return false;
  const value = valueAtPath(sourceData, override.source_path);
  if (Object.prototype.hasOwnProperty.call(override, "equals")) return value === override.equals;
  if (Object.prototype.hasOwnProperty.call(override, "truthy")) return Boolean(value) === Boolean(override.truthy);
  return Boolean(value);
}

function effectiveMinRows(tableSpec, sourceData) {
  for (const override of tableSpec.min_rows_overrides || []) {
    if (matchesOverride(sourceData, override)) return Number(override.min_rows ?? 0);
  }
  return Number(tableSpec.min_rows ?? tableSpec.minDataRows ?? 0);
}

function validateTableSpec({ tableSpec, sections, allFences, errors, report, sourceData }) {
  const section = tableSpec.section ? findSection(sections, tableSpec.section) : null;
  if (tableSpec.section && !section) {
    addError(
      errors,
      "contract.table_section_missing",
      `${report}: missing section for table ${tableLabel(tableSpec)}`,
      `Add a H2 matching one of: ${headingCandidates(tableSpec.section).join(", ")}.`,
      report,
    );
    return;
  }

  const fences = section ? visualFences(section.body).filter((fence) => fence.kind === "agentic-table") : allFences.filter((fence) => fence.kind === "agentic-table");
  if (!fences.length) {
    addError(errors, "contract.table_missing", `${report}: missing agentic-table for ${tableLabel(tableSpec)}`, "Add the required YAML agentic-table visual block.", report);
    return;
  }

  const requiredColumns = tableSpec.columns || tableSpec.required_columns || [];
  let best = null;
  let bestMissing = requiredColumns;
  for (const fence of fences) {
    const columns = Array.isArray(fence.payload?.columns) ? fence.payload.columns : [];
    const missing = requiredColumns.filter((requiredColumn) => !resolveColumnKey(columns, requiredColumn));
    if (!best || missing.length < bestMissing.length) {
      best = fence;
      bestMissing = missing;
    }
    if (!missing.length) break;
  }
  if (!best) return;

  const columns = Array.isArray(best.payload?.columns) ? best.payload.columns : [];
  if (bestMissing.length) {
    addError(
      errors,
      "contract.table_columns_missing",
      `${report}: table ${tableLabel(tableSpec)} missing required columns: ${bestMissing.map((item) => columnCandidates(item)[0]).join(", ")}`,
      "Use the module skeleton so stable column keys are preserved even when labels are translated.",
      report,
    );
    return;
  }

  const rows = Array.isArray(best.payload?.rows) ? best.payload.rows : [];
  const minRows = effectiveMinRows(tableSpec, sourceData);
  if (minRows && rows.length < minRows) {
    addError(errors, "contract.table_min_rows", `${report}: table ${tableLabel(tableSpec)} has ${rows.length} rows; expected at least ${minRows}`, "Generate evidence-backed rows or mark the report blocked before presentation.", report);
  }

  const rowFields = tableSpec.row_required_fields || tableSpec.required_row_fields || [];
  if (rowFields.length && rows.length) {
    const resolved = rowFields.map((field) => resolveColumnKey(columns, field)).filter(Boolean);
    const validRows = rows.filter((row) => resolved.every((key) => String(row?.[key] ?? "").trim()));
    const requiredValidRows = Number(tableSpec.min_complete_rows ?? minRows ?? 1);
    if (validRows.length < requiredValidRows) {
      addError(
        errors,
        "contract.table_row_fields_missing",
        `${report}: table ${tableLabel(tableSpec)} has ${validRows.length} complete rows; expected at least ${requiredValidRows}`,
        `Rows must fill: ${rowFields.map((item) => columnCandidates(item)[0]).join(", ")}.`,
        report,
      );
    }
  }
}

export function loadModuleContract(moduleId, rootDir = ROOT) {
  const file = path.join(rootDir, "skills", moduleId, "contract.yaml");
  if (!fs.existsSync(file)) return null;
  const data = YAML.parse(fs.readFileSync(file, "utf8")) || {};
  return { ...data, file };
}

export function reviewReportMarkdown({ markdown, file, projectDir, rootDir = ROOT }) {
  const errors = [];
  const absoluteProjectDir = path.resolve(projectDir);
  const absoluteFile = path.resolve(file);
  const report = normalizeRel(path.relative(absoluteProjectDir, absoluteFile));
  const parts = report.split("/");
  const moduleId = parts[1];

  if (parts[0] !== REPORT_DIR_NAME) addError(errors, "path.root", `${report}: must live under ${REPORT_DIR_NAME}`, `Use ${REPORT_DIR_NAME}/<module>/<run-slug>/report.md.`, report);
  if (!MODULES.has(moduleId)) addError(errors, "path.module", `${report}: unsupported module ${moduleId || "(missing)"}`, `Supported modules: ${REPORT_MODULE_IDS.join(", ")}.`, report);
  if (parts.at(-1) !== "report.md") addError(errors, "path.filename", `${report}: file must be report.md`, "The Web Companion only treats report.md as an editable report page.", report);

  const parsed = parseFrontmatter(markdown);
  if (parsed.error) addError(errors, "frontmatter.parse", `${report}: ${parsed.error}`, "Start the file with valid YAML frontmatter.", report);
  const fm = parsed.data || {};
  const body = parsed.body || "";
  let sourceData = null;

  for (const key of COMMON_FRONTMATTER) {
    if (fm[key] === undefined || fm[key] === "") addError(errors, "frontmatter.missing", `${report}: missing frontmatter ${key}`, `Add ${key} to the report frontmatter.`, report);
  }
  if (moduleId && fm.report_type && String(fm.report_type) !== moduleId) addError(errors, "frontmatter.report_type", `${report}: report_type must match module`, `Expected report_type: ${moduleId}.`, report);
  if (fm.source_artifact) {
    const sourcePath = path.resolve(absoluteProjectDir, String(fm.source_artifact));
    if (!fs.existsSync(sourcePath)) addError(errors, "source_artifact.missing", `${report}: source_artifact missing on disk`, `Missing: ${fm.source_artifact}`, report);
    else {
      try {
        const rawSource = fs.readFileSync(sourcePath, "utf8");
        sourceData = sourcePath.endsWith(".json") ? JSON.parse(rawSource) : YAML.parse(rawSource);
      } catch {
        sourceData = null;
      }
    }
  }

  if (/^#\s+/m.test(body)) addError(errors, "body.h1", `${report}: report body must not contain H1`, "The Companion renders the H1 from frontmatter title.", report);
  if (/\[object Object\]/.test(body)) addError(errors, "body.object_dump", `${report}: object dump visible`, "Convert object evidence into prose or tables.", report);
  if (/\[\s*\{[\s\S]*?\}\s*\]/.test(visibleBody(body))) addError(errors, "body.raw_object_array", `${report}: raw object array visible`, "Move raw arrays into source_artifact and summarize them visually.", report);
  if (/\{\\?"[a-z0-9_]+\\?":/.test(visibleBody(body))) addError(errors, "body.raw_json", `${report}: raw JSON object visible`, "Move raw JSON into source_artifact and render a human table.", report);
  if (/round\(sum\(points_awarded\)/.test(body)) addError(errors, "body.formula", `${report}: formula must not be visible`, "Render calculation memory as table values, not raw formulas.", report);
  if (fs.existsSync(absoluteFile.replace(/report\.md$/, "report.html"))) addError(errors, "legacy_html", `${report}: report.html generated`, "Do not generate legacy report.html beside Companion Markdown reports.", report);

  const parsedFences = visualFences(body);
  if (!parsedFences.length) addError(errors, "visual_blocks.missing", `${report}: expected at least one visual block`, "Add agentic-kpis, agentic-chart, or agentic-table YAML fences.", report);
  for (const fence of parsedFences) {
    if (fence.error) {
      addError(errors, "visual_blocks.yaml", `${report}: ${fence.kind} YAML parse failed`, fence.error, report);
      continue;
    }
    if (fence.payload?.version !== 1) addError(errors, "visual_blocks.version", `${report}: ${fence.kind} must use YAML version 1`, "Add `version: 1` inside the visual block.", report);
    if (fence.kind === "agentic-table") {
      const keys = new Set();
      for (const column of fence.payload?.columns || []) {
        if (!/^[a-z0-9_]+$/.test(String(column.key || ""))) addError(errors, "table.column_key", `${report}: table column keys must be stable ASCII snake keys`, `Invalid key: ${column.key}`, report);
        if (keys.has(column.key)) addError(errors, "table.duplicate_column", `${report}: duplicate table column key ${column.key}`, "Each table column key must be unique.", report);
        keys.add(column.key);
      }
    }
  }

  const lower = String(markdown).toLowerCase();
  const rubric = {
    clarity: /resumo executivo|executive summary/.test(lower) ? 5 : 2,
    evidence: /source_artifact|evidência|evidence/.test(lower) ? 5 : 2,
    visual: parsedFences.length >= 2 ? 5 : 4,
    actionability: /ação|recomend|recommend|prioridade|priority/.test(lower) ? 5 : 3,
    localization: /página|conteúdo|análise|evidência|executive|summary/.test(lower) ? 5 : 3,
  };
  const min = Math.min(...Object.values(rubric));
  const average = Object.values(rubric).reduce((sum, value) => sum + value, 0) / Object.keys(rubric).length;
  if (min < 3) addError(errors, "rubric.minimum", `${report}: review rubric has category below 3/5`, JSON.stringify(rubric), report);
  if (average < 4) addError(errors, "rubric.average", `${report}: review rubric average below 4/5`, JSON.stringify(rubric), report);

  if (moduleId && MODULES.has(moduleId)) {
    const contract = loadModuleContract(moduleId, rootDir);
    if (!contract) {
      addError(errors, "contract.missing", `${report}: missing module contract`, `Expected skills/${moduleId}/contract.yaml.`, report);
    } else {
      for (const key of contract.required_frontmatter || []) {
        if (fm[key] === undefined || fm[key] === "") addError(errors, "contract.frontmatter_missing", `${report}: missing required module frontmatter ${key}`, `Add ${key} to the report frontmatter.`, report);
      }
      const sections = h2Sections(body);
      for (const sectionSpec of contract.required_sections || []) {
        if (!findSection(sections, sectionSpec)) {
          addError(errors, "contract.section_missing", `${report}: missing required section ${headingCandidates(sectionSpec).join(" | ")}`, "Use the module report skeleton and keep required H2 sections.", report);
        }
      }
      for (const tableSpec of contract.required_tables || []) {
        validateTableSpec({ tableSpec, sections, allFences: parsedFences, errors, report, sourceData });
      }
    }
  }

  return { ok: errors.length === 0, errors, report, module: moduleId, rubric };
}

export function reviewReportFile(file, projectDir, options = {}) {
  const markdown = fs.readFileSync(file, "utf8");
  return reviewReportMarkdown({ markdown, file, projectDir, rootDir: options.rootDir || ROOT });
}

export function reportFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...reportFiles(p));
    else if (entry.isFile() && entry.name === "report.md") out.push(p);
  }
  return out.sort();
}

export function reviewReportsInProject(projectDir, options = {}) {
  const root = path.resolve(projectDir);
  let files = [];
  if (options.file) files = [path.resolve(options.file)];
  else if (options.moduleId && options.slug) files = [path.join(root, REPORT_DIR_NAME, options.moduleId, options.slug, "report.md")];
  else if (options.moduleId) files = reportFiles(path.join(root, REPORT_DIR_NAME, options.moduleId));
  else files = reportFiles(path.join(root, REPORT_DIR_NAME));

  const reviewed = [];
  const errors = [];
  for (const file of files) {
    if (!fs.existsSync(file)) {
      const rel = normalizeRel(path.relative(root, file));
      addError(errors, "file.missing", `${rel}: report file not found`, "Generate the report before validating it.", rel);
      continue;
    }
    const result = reviewReportFile(file, root, options);
    reviewed.push({ report: result.report, module: result.module, rubric: result.rubric });
    errors.push(...result.errors);
  }

  const requireAllModules = options.requireAllModules ?? (!options.file && !options.moduleId);
  if (requireAllModules) {
    const modules = new Set(reviewed.map((item) => item.module));
    for (const moduleId of MODULES) {
      if (!modules.has(moduleId)) addError(errors, "module.missing", `missing module report: ${moduleId}`, `Expected at least one report under ${REPORT_DIR_NAME}/${moduleId}/.`, `${REPORT_DIR_NAME}/${moduleId}`);
    }
  }

  return { ok: errors.length === 0, project_dir: root, reviewed, errors };
}

export { REPORT_DIR_NAME, REPORT_MODULE_IDS };
