import assert from "node:assert/strict";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const outDir = join(".context", "report-block-data-test");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const compiled = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "tsc",
    "apps/companion/src/features/editor/report-block-data.ts",
    "--target",
    "ES2022",
    "--module",
    "ES2022",
    "--moduleResolution",
    "bundler",
    "--outDir",
    outDir,
    "--skipLibCheck",
    "--esModuleInterop",
  ],
  { encoding: "utf8" },
);
assert.equal(compiled.status, 0, compiled.stderr || compiled.stdout);

const jsFile = join(outDir, "report-block-data.js");
const mjsFile = join(outDir, "report-block-data.mjs");
if (existsSync(jsFile)) renameSync(jsFile, mjsFile);

const data = await import(`../${mjsFile}`);

const yamlTable = `
version: 1
columns:
  - key: check
    label: Check amigável
  - key: points
    label: Pontos
    role: points
rows:
  - check: "Título com acento: análise | aprovação"
    points: "8"
`;

const parsedYaml = data.parseReportBlockPayload(yamlTable);
assert.equal(parsedYaml.version, 1);
assert.equal(parsedYaml.columns[1].role, "points");
assert.equal(data.normalizeTable(parsedYaml).rows[0][0], "Título com acento: análise | aprovação");

const parsedJson = data.parseReportBlockPayload(
  '{"columns":[{"key":"check","label":"Check"},{"key":"check","label":"Check duplicado"}],"rows":[{"check":"canonical"}]}',
);
const jsonNormalized = data.normalizeTable(parsedJson);
assert.equal(jsonNormalized.columns.length, 2);
assert.notEqual(jsonNormalized.columns[0].key, jsonNormalized.columns[1].key);

const renamed = data.withColumnLabel(parsedYaml, 1, "Pontos conquistados pelo time");
assert.equal(renamed.columns[1].key, "points");
assert.equal(renamed.columns[1].label, "Pontos conquistados pelo time");
assert.equal(renamed.columns[1].role, "points");

const edited = data.withTableCell(renamed, 0, 0, "Linha 1\ncom multilinha, aspas \"ok\" e pipe |");
assert.equal(data.normalizeTable(edited).rows[0][0], "Linha 1\ncom multilinha, aspas \"ok\" e pipe |");

const withRow = data.withTableRow(edited, 1, ["Novo check", "7"]);
assert.equal(data.normalizeTable(withRow).rows.length, 2);
assert.equal(data.normalizeTable(withRow).rows[1][0], "Novo check");

const duplicatedRow = data.duplicateTableRow(withRow, 0);
assert.equal(data.normalizeTable(duplicatedRow).rows.length, 3);
assert.equal(data.normalizeTable(duplicatedRow).rows[1][0], "Linha 1\ncom multilinha, aspas \"ok\" e pipe |");

const withoutRow = data.withoutTableRow(duplicatedRow, 1);
assert.equal(data.normalizeTable(withoutRow).rows.length, 2);

const withColumn = data.withTableColumn(withoutRow, 1, "Nova coluna");
const withColumnTable = data.normalizeTable(withColumn);
assert.equal(withColumnTable.columns.length, 3);
assert.equal(new Set(withColumnTable.columns.map((column) => column.key)).size, 3);

const duplicatedColumn = data.duplicateTableColumn(withColumn, 1);
const duplicatedColumnTable = data.normalizeTable(duplicatedColumn);
assert.equal(duplicatedColumnTable.columns.length, 4);
assert.equal(new Set(duplicatedColumnTable.columns.map((column) => column.key)).size, 4);

const withoutColumn = data.withoutTableColumn(duplicatedColumn, 1);
assert.equal(data.normalizeTable(withoutColumn).columns.length, 3);
const lastColumnProtected = data.withoutTableColumn(
  { columns: [{ key: "only", label: "Única" }], rows: [{ only: "valor" }] },
  0,
);
assert.equal(data.normalizeTable(lastColumnProtected).columns.length, 1);

const pasted = data.withTableGridPaste(withoutColumn, 0, 2, [
  ["A", "B"],
  ["C", "D"],
]);
const pastedTable = data.normalizeTable(pasted);
assert.equal(pastedTable.columns.length, 4);
assert.equal(pastedTable.rows.length, 2);
assert.equal(pastedTable.rows[1][3], "D");

assert.deepEqual(data.parseTablePasteGrid("A\tB\nC\tD"), [
  ["A", "B"],
  ["C", "D"],
]);
assert.deepEqual(data.parseTablePasteGrid('Nome,Resumo\n"SEO, técnico","linha ""com"" aspas"'), [
  ["Nome", "Resumo"],
  ["SEO, técnico", 'linha "com" aspas'],
]);
assert.deepEqual(data.parseTablePasteGrid("linha 1\nlinha 2"), [["linha 1"], ["linha 2"]]);
assert.equal(data.parseTablePasteGrid("texto simples"), null);

const scoreTable = {
  version: 1,
  columns: [
    { key: "peso_original", label: "Impacto", role: "weight" },
    { key: "ganho_original", label: "Rótulo customizado", role: "points" },
    { key: "perda_original", label: "Diferença", role: "loss" },
  ],
  rows: [
    { peso_original: "10", ganho_original: "7", perda_original: "3" },
    { peso_original: "5", ganho_original: "5", perda_original: "0" },
  ],
};
const score = data.calculateScoreFromTable(scoreTable);
assert.equal(score.score, 80);
assert.equal(score.pointsAwarded, 12);
assert.equal(score.totalWeight, 15);
assert.equal(score.lostPoints, 3);

const legacyEdited = data.withTableCell(parsedJson, 0, 0, "editado");
const serializedLegacy = data.serializeReportBlockPayload(legacyEdited);
assert.match(serializedLegacy, /version: 1/);
assert.match(serializedLegacy, /editado/);
assert.doesNotMatch(serializedLegacy.trim(), /^\{/);

console.log("report block data helpers ok");
