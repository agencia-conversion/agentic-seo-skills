"use strict";
// Reverse-parser for Markdown tables embedded in auto-block `materialized` fields.
// Splits `| a | b |` rows into cells, supports escaped `\|`, ignores the divider
// row. Stable rowKey is extracted via the first column whose value matches a
// canonical pattern (markdown link → basename of href, italic _slug_, or raw text).
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMaterializedTable = parseMaterializedTable;
const ESCAPED_PIPE = "";
function splitRow(line) {
    const cleaned = line.trim().replace(/\\\|/g, ESCAPED_PIPE);
    const trimmed = cleaned.replace(/^\||\|$/g, "");
    return trimmed.split("|").map((c) => c.trim().replaceAll(ESCAPED_PIPE, "|"));
}
function extractRowKeyFromCell(cell) {
    const linkMatch = cell.match(/\[[^\]]*\]\(([^)]+)\)/);
    if (linkMatch) {
        const target = linkMatch[1];
        const base = target.split("/").pop()?.replace(/\.md$/, "");
        if (base)
            return base;
    }
    const italic = cell.match(/^_([^_]+)_$/);
    if (italic)
        return italic[1];
    const plain = cell.trim();
    if (plain && plain !== "—")
        return plain;
    return null;
}
function parseMaterializedTable(markdown) {
    const lines = markdown.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) {
        return { headers: [], rows: [], malformed: false };
    }
    const headerLine = lines.find((l) => l.startsWith("|"));
    if (!headerLine) {
        return { headers: [], rows: [], malformed: false };
    }
    const dividerIdx = lines.findIndex((l, i) => i > 0 && /^\s*\|\s*[-: ]+/.test(l));
    if (dividerIdx <= 0) {
        return { headers: splitRow(headerLine), rows: [], malformed: true };
    }
    const headers = splitRow(headerLine);
    const bodyLines = lines.slice(dividerIdx + 1);
    const rows = [];
    let malformed = false;
    for (const line of bodyLines) {
        if (!line.startsWith("|"))
            continue;
        const cells = splitRow(line);
        if (cells.length !== headers.length) {
            malformed = true;
            continue;
        }
        rows.push({ cells, rowKey: extractRowKeyFromCell(cells[0]) });
    }
    return { headers, rows, malformed };
}
