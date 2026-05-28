import { createHash } from "node:crypto";
import type { AutoBlockInputs, ColumnDef } from "./auto-block-registry";

export function fingerprint(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}

export interface DeclarativeRenderInput<P, Row> {
  columns: ColumnDef<P, Row>[];
  rows: Row[];
  params: P;
  inputs: AutoBlockInputs;
  emptyMessage?: string;
}

export function renderDeclarativeTable<P, Row>(input: DeclarativeRenderInput<P, Row>): string {
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
