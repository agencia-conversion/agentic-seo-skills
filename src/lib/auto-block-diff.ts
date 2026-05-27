// Diff engine: compares a `materialized` string from the .md against the
// canonical render of the source. For each row that exists in both with the
// same rowKey, computes per-column cell differences and emits MutationDescriptors
// for editable columns. Derived/added/removed rows produce lints instead.

import type {
  AutoBlockInputs,
  AutoBlockType,
  ColumnDef,
  MutationDescriptor,
} from "./auto-block-registry";
import type { Lint } from "./cluster-types";
import { parseMaterializedTable } from "./auto-block-reverse-parser";

export interface DiffResult {
  applied: MutationDescriptor[];
  rejected: Lint[];
  malformed: boolean;
}

function rowKeyForCanonical<P, Row>(
  type: AutoBlockType<P, Row>,
  rows: Row[],
  params: P,
  inputs: AutoBlockInputs,
): Map<string, Row> {
  const out = new Map<string, Row>();
  if (!type.rowKey) return out;
  for (const row of rows) {
    const key = type.rowKey(row, params, inputs);
    if (key) out.set(key, row);
  }
  return out;
}

export function diffMaterialized<P, Row>(
  fileMaterialized: string,
  canonicalMaterialized: string,
  type: AutoBlockType<P, Row>,
  params: P,
  inputs: AutoBlockInputs,
): DiffResult {
  const result: DiffResult = { applied: [], rejected: [], malformed: false };
  const columns = type.columns;
  if (!columns || columns.length === 0 || !type.rows || !type.rowKey) {
    return result;
  }
  if (fileMaterialized === canonicalMaterialized) return result;
  const fileTable = parseMaterializedTable(fileMaterialized);
  if (fileTable.malformed) {
    result.malformed = true;
    result.rejected.push({
      code: "auto-block.malformed-table",
      severity: "warn",
      message: "Tabela markdown malformada após edição; preservando arquivo, não propagando.",
      context: {},
    });
    return result;
  }
  const canonicalRows = type.rows(params, inputs);
  const canonicalByKey = rowKeyForCanonical(type, canonicalRows, params, inputs);
  const seenKeys = new Set<string>();
  for (const fileRow of fileTable.rows) {
    const rowKey = fileRow.rowKey;
    if (!rowKey) continue;
    seenKeys.add(rowKey);
    const sourceRow = canonicalByKey.get(rowKey);
    if (!sourceRow) {
      const policy = type.rowMutationPolicy || "reject";
      if (policy !== "allow-add-planned") {
        result.rejected.push({
          code: "auto-block.row-added-ignored",
          severity: "warn",
          message: `Linha "${rowKey}" adicionada manualmente ao bloco; ignorando (policy=${policy}).`,
          context: { rowKey, policy },
        });
      }
      continue;
    }
    fileRow.cells.forEach((cellValue, idx) => {
      const col: ColumnDef<P, Row> | undefined = columns[idx];
      if (!col) return;
      const canonicalValue = col.read(sourceRow, params, inputs);
      if (cellValue === canonicalValue) return;
      if (col.derived) {
        result.rejected.push({
          code: "auto-block.derived-edit-rejected",
          severity: "warn",
          message: `Edição em coluna derived "${col.key}" ignorada (rowKey=${rowKey}).`,
          context: { rowKey, column: col.key, attempted: cellValue, canonical: canonicalValue },
        });
        return;
      }
      if (!col.write) {
        result.rejected.push({
          code: "auto-block.no-write-fn",
          severity: "warn",
          message: `Coluna "${col.key}" sem write function; edição ignorada.`,
          context: { rowKey, column: col.key },
        });
        return;
      }
      const parsed = col.parseCell ? col.parseCell(cellValue) : cellValue;
      const descriptor = col.write(sourceRow, parsed, params, inputs);
      if (!descriptor) return;
      if (descriptor.before === descriptor.after) return;
      result.applied.push(descriptor);
    });
  }
  for (const canonicalKey of canonicalByKey.keys()) {
    if (!seenKeys.has(canonicalKey)) {
      const policy = type.rowMutationPolicy || "reject";
      if (policy !== "allow-remove-planned") {
        result.rejected.push({
          code: "auto-block.row-removed-ignored",
          severity: "warn",
          message: `Linha canônica "${canonicalKey}" ausente do arquivo; ignorando remoção (policy=${policy}).`,
          context: { rowKey: canonicalKey, policy },
        });
      }
    }
  }
  return result;
}
