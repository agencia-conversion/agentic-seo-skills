"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fingerprint = fingerprint;
exports.renderDeclarativeTable = renderDeclarativeTable;
const node_crypto_1 = require("node:crypto");
function fingerprint(text) {
    return (0, node_crypto_1.createHash)("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}
function renderDeclarativeTable(input) {
    const { columns, rows, params, inputs, emptyMessage } = input;
    if (rows.length === 0) {
        return emptyMessage ?? "_Sem linhas para exibir._";
    }
    const headerCells = columns.map((c) => c.label(inputs.labels));
    const header = `| ${headerCells.join(" | ")} |`;
    const divider = `| ${columns.map(() => "---").join(" | ")} |`;
    const bodyRows = rows.map((row) => {
        const cells = columns.map((col) => col.read(row, params, inputs));
        return `| ${cells.join(" | ")} |`;
    });
    return [header, divider, ...bodyRows].join("\n");
}
