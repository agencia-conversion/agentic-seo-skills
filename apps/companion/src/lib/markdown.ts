import {
  normalizeTable,
  parseReportBlockPayload,
  serializeReportBlockPayload,
} from '../features/editor/report-block-data';

interface MentionResolver {
  findPageId: (target: string) => string | null;
  labelForPageId: (pageId: string) => string;
}

type JsonNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: JsonNode[];
  text?: string;
};

function textNode(text: string): JsonNode {
  return { type: 'text', text };
}

function splitWikilinkTarget(raw: string) {
  const target = raw.trim();
  const hashIndex = target.indexOf('#');
  if (hashIndex === -1) return { pageTarget: target, anchor: null as string | null };
  const pageTarget = target.slice(0, hashIndex).trim();
  const anchor = target.slice(hashIndex + 1).trim();
  return { pageTarget, anchor: anchor || null };
}

function inlineNodes(text: string, resolver?: MentionResolver): JsonNode[] {
  const nodes: JsonNode[] = [];
  // Do not match embeds (![[...]]) inline — those are block-level (see embedLineMatch).
  const re = /(?<!!)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let last = 0;
  for (const match of text.matchAll(re)) {
    if (match.index! > last) nodes.push(textNode(text.slice(last, match.index)));
    const { pageTarget, anchor } = splitWikilinkTarget(match[1]);
    const alias = match[2]?.trim();
    const pageId = pageTarget ? resolver?.findPageId(pageTarget) : null;
    if (pageId) {
      nodes.push({ type: 'pageMention', attrs: { pageId, anchor, alias: alias || null } });
    } else {
      nodes.push(textNode(match[0]));
    }
    last = match.index! + match[0].length;
  }
  if (last < text.length) nodes.push(textNode(text.slice(last)));
  return nodes.length ? nodes : [textNode('')];
}

const EMBED_LINE_RE = /^\s*!\[\[([^\]\n|]+)(?:\|([^\]\n]+))?\]\]\s*$/;
const CALLOUT_HEAD_RE = /^\s*>\s*\[!([a-zA-Z]+)\](?:\s+(.*))?$/;
const CALLOUT_BODY_RE = /^\s*>\s?(.*)$/;

function embedLineMatch(line: string) {
  const m = line.match(EMBED_LINE_RE);
  if (!m) return null;
  const { pageTarget, anchor } = splitWikilinkTarget(m[1]);
  return { pageTarget, anchor, alias: m[2]?.trim() || null };
}

function calloutHeadMatch(line: string) {
  const m = line.match(CALLOUT_HEAD_RE);
  if (!m) return null;
  return { type: m[1].toLowerCase(), title: m[2]?.trim() || null };
}

function calloutBodyMatch(line: string) {
  const m = line.match(CALLOUT_BODY_RE);
  if (!m) return null;
  return m[1];
}

function paragraph(text: string, resolver?: MentionResolver): JsonNode {
  return { type: 'paragraph', content: inlineNodes(text, resolver).filter((n) => n.text !== '') };
}

function heading(level: number, text: string, resolver?: MentionResolver): JsonNode {
  return { type: 'heading', attrs: { level }, content: inlineNodes(text, resolver).filter((n) => n.text !== '') };
}

function raw(text: string, attrs: Record<string, any> = {}): JsonNode {
  return { type: 'rawMarkdown', attrs: { text: text.replace(/\n+$/, ''), ...attrs } };
}

function isRawLine(line: string) {
  return /^\s*<!--/.test(line) || /^\s*\|.*\|\s*$/.test(line);
}

function cellTextNodes(value: unknown): JsonNode[] {
  const text = String(value ?? '');
  const paragraphs = text.split('\n');
  return paragraphs.map((part) => ({
    type: 'paragraph',
    content: part ? [textNode(part)] : [],
  }));
}

function reportTableNode(body: string): JsonNode {
  const payload = parseReportBlockPayload(body) || {};
  const table = normalizeTable(payload);
  const columns = table.columns.length ? table.columns : [{ key: 'c0', label: 'Coluna 1' }];
  const rows = table.rows.length ? table.rows : [columns.map(() => '')];
  return {
    type: 'table',
    attrs: {
      agenticReport: true,
      columns,
      summary: payload?.summary ?? null,
      source_refs: payload?.source_refs ?? null,
    },
    content: [
      {
        type: 'tableRow',
        content: columns.map((column) => ({
          type: 'tableHeader',
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: cellTextNodes(column.label),
        })),
      },
      ...rows.map((row) => ({
        type: 'tableRow',
        content: columns.map((_column, index) => ({
          type: 'tableCell',
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: cellTextNodes(row[index] ?? ''),
        })),
      })),
    ],
  };
}

function splitPipeRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function isPipeSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function pipeTableNode(lines: string[]): JsonNode {
  const headers = splitPipeRow(lines[0]);
  const rows = lines.slice(2).map(splitPipeRow);
  return {
    type: 'table',
    attrs: { agenticReport: false, columns: null, summary: null, source_refs: null },
    content: [
      {
        type: 'tableRow',
        content: headers.map((cell) => ({
          type: 'tableHeader',
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: cellTextNodes(cell),
        })),
      },
      ...rows.map((row) => ({
        type: 'tableRow',
        content: headers.map((_header, index) => ({
          type: 'tableCell',
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: cellTextNodes(row[index] ?? ''),
        })),
      })),
    ],
  };
}

export function markdownToDoc(markdown: string, resolver?: MentionResolver) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const content: JsonNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const block = [line];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) block.push(lines[i++]);
      if (i < lines.length) block.push(lines[i++]);
      const language = fence[1].trim();
      const body = block.slice(1, -1).join('\n');
      if (language === 'agentic-table') {
        content.push(reportTableNode(body));
      } else if (/^agentic-(kpis|chart)$/.test(language)) {
        content.push({ type: 'reportBlock', attrs: { kind: language, data: body } });
      } else if (language === 'mermaid') {
        content.push({ type: 'mermaid', attrs: { source: body } });
      } else {
        content.push({ type: 'codeBlock', attrs: { language: language || null }, content: [textNode(body)] });
      }
      continue;
    }

    const embed = embedLineMatch(line);
    if (embed) {
      const pageId = embed.pageTarget ? resolver?.findPageId(embed.pageTarget) : null;
      if (pageId) {
        content.push({
          type: 'pageEmbed',
          attrs: { pageId, anchor: embed.anchor, alias: embed.alias },
        });
      } else {
        // Unresolved embed — keep as raw markdown so the reference is visible and roundtrips.
        content.push(raw(line));
      }
      i++;
      continue;
    }

    if (/^\s*<!--/.test(line)) {
      const block = [line];
      i++;
      while (i < lines.length && !/-->\s*$/.test(block[block.length - 1])) {
        block.push(lines[i++]);
      }
      content.push(raw(block.join('\n'), { hidden: true }));
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && isPipeSeparator(lines[i + 1])) {
      const block = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        block.push(lines[i++]);
      }
      content.push(pipeTableNode(block));
      continue;
    }

    if (isRawLine(line)) {
      const block = [line];
      i++;
      while (i < lines.length && isRawLine(lines[i]) && !/^\s*<!--/.test(lines[i])) {
        block.push(lines[i++]);
      }
      content.push(raw(block.join('\n')));
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      content.push(heading(h[1].length, h[2], resolver));
      i++;
      continue;
    }

    if (/^---\s*$/.test(line)) {
      content.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: JsonNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push({ type: 'listItem', content: [paragraph(lines[i].replace(/^\s*[-*]\s+/, ''), resolver)] });
        i++;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: JsonNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push({ type: 'listItem', content: [paragraph(lines[i].replace(/^\s*\d+\.\s+/, ''), resolver)] });
        i++;
      }
      content.push({ type: 'orderedList', content: items });
      continue;
    }

    const calloutHead = /^\s*>\s*\[!/.test(line) ? calloutHeadMatch(line) : null;
    if (calloutHead) {
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length) {
        const next = lines[i];
        if (!/^\s*>/.test(next)) break;
        const body = calloutBodyMatch(next);
        bodyLines.push(body ?? '');
        i++;
      }
      const bodyText = bodyLines.join('\n').trim();
      const bodyContent: JsonNode[] = bodyText
        ? bodyText.split(/\n{2,}/).map((p) => paragraph(p.replace(/\n/g, ' '), resolver))
        : [{ type: 'paragraph', content: [] }];
      content.push({
        type: 'callout',
        attrs: { calloutType: calloutHead.type, title: calloutHead.title },
        content: bodyContent,
      });
      continue;
    }

    if (/^\s*>\s+/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^\s*>\s+/.test(lines[i])) {
        parts.push(lines[i].replace(/^\s*>\s+/, ''));
        i++;
      }
      content.push({ type: 'blockquote', content: [paragraph(parts.join(' '), resolver)] });
      continue;
    }

    const parts = [line.trimEnd()];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !isRawLine(lines[i])
    ) {
      parts.push(lines[i].trimEnd());
      i++;
    }
    content.push(paragraph(parts.join(' '), resolver));
  }

  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

function textFromInline(node: JsonNode, resolver?: MentionResolver): string {
  if (node.type === 'text') return node.text || '';
  if (node.type === 'pageMention') {
    const label = resolver?.labelForPageId(node.attrs?.pageId) || node.attrs?.pageId || 'page';
    const anchor = String(node.attrs?.anchor || '').trim();
    const target = anchor ? `${label}#${anchor}` : label;
    const alias = String(node.attrs?.alias || '').trim();
    return alias ? `[[${target}|${alias}]]` : `[[${target}]]`;
  }
  return (node.content || []).map((child) => textFromInline(child, resolver)).join('');
}

function paragraphText(node: JsonNode, resolver?: MentionResolver) {
  return (node.content || []).map((child) => textFromInline(child, resolver)).join('');
}

function tableCellText(node: JsonNode, resolver?: MentionResolver) {
  return (node.content || []).map((child) => paragraphText(child, resolver)).join('\n');
}

function tableRows(node: JsonNode, resolver?: MentionResolver) {
  return (node.content || []).map((row) =>
    (row.content || []).map((cell) => tableCellText(cell, resolver))
  );
}

function escapePipe(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\n+/g, '<br>');
}

function tableToPipeMarkdown(node: JsonNode, resolver?: MentionResolver) {
  const rows = tableRows(node, resolver);
  if (!rows.length) return '';
  const headers = rows[0];
  const body = rows.slice(1);
  return [
    `| ${headers.map(escapePipe).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${headers.map((_header, index) => escapePipe(row[index] ?? '')).join(' | ')} |`),
  ].join('\n');
}

function tableToReportFence(node: JsonNode, resolver?: MentionResolver) {
  const rows = tableRows(node, resolver);
  const headerCells = rows[0] || [];
  const dataRows = rows.slice(1);
  const existingColumns = Array.isArray(node.attrs?.columns) ? node.attrs?.columns : [];
  const columns = headerCells.map((label, index) => {
    const existing = existingColumns[index] || {};
    return {
      key: String(existing.key || `c${index}`),
      label,
      ...(existing.role ? { role: String(existing.role) } : {}),
    };
  });
  const payload = {
    version: 1,
    ...(node.attrs?.summary ? { summary: node.attrs.summary } : {}),
    ...(node.attrs?.source_refs ? { source_refs: node.attrs.source_refs } : {}),
    columns,
    rows: dataRows.map((row) => Object.fromEntries(columns.map((column, index) => [column.key, row[index] ?? '']))),
  };
  return `\`\`\`agentic-table\n${serializeReportBlockPayload(payload)}\n\`\`\``;
}

export function docToMarkdown(doc: any, resolver?: MentionResolver): string {
  const blocks = ((doc && doc.type === 'doc' ? doc.content : []) || []) as JsonNode[];
  const out: string[] = [];

  for (const node of blocks) {
    if (node.type === 'paragraph') out.push(paragraphText(node, resolver));
    else if (node.type === 'heading') out.push(`${'#'.repeat(Number(node.attrs?.level || 1))} ${paragraphText(node, resolver)}`);
    else if (node.type === 'horizontalRule') out.push('---');
    else if (node.type === 'rawMarkdown') out.push(String(node.attrs?.text || ''));
    else if (node.type === 'reportBlock') {
      const kind = node.attrs?.kind || 'agentic-table';
      out.push(`\`\`\`${kind}\n${String(node.attrs?.data || '').replace(/\s+$/, '')}\n\`\`\``);
    }
    else if (node.type === 'table') {
      out.push(node.attrs?.agenticReport ? tableToReportFence(node, resolver) : tableToPipeMarkdown(node, resolver));
    }
    else if (node.type === 'codeBlock') {
      const language = node.attrs?.language || '';
      out.push(`\`\`\`${language}\n${paragraphText(node, resolver)}\n\`\`\``);
    } else if (node.type === 'bulletList') {
      for (const item of node.content || []) {
        const first = item.content?.[0];
        out.push(`- ${first ? paragraphText(first, resolver) : ''}`);
      }
    } else if (node.type === 'orderedList') {
      let idx = 1;
      for (const item of node.content || []) {
        const first = item.content?.[0];
        out.push(`${idx}. ${first ? paragraphText(first, resolver) : ''}`);
        idx++;
      }
    } else if (node.type === 'blockquote') {
      const text = (node.content || []).map((child) => paragraphText(child, resolver)).join('\n');
      out.push(text.split('\n').map((line) => `> ${line}`).join('\n'));
    } else if (node.type === 'callout') {
      const calloutType = String(node.attrs?.calloutType || 'note').toLowerCase();
      const title = String(node.attrs?.title || '').trim();
      const head = title ? `> [!${calloutType}] ${title}` : `> [!${calloutType}]`;
      const bodyText = (node.content || [])
        .map((child) => paragraphText(child, resolver))
        .filter((line) => line.length)
        .join('\n');
      const bodyLines = bodyText ? bodyText.split('\n').map((line) => `> ${line}`) : [];
      out.push([head, ...bodyLines].join('\n'));
    } else if (node.type === 'pageEmbed') {
      const pageId = String(node.attrs?.pageId || '');
      const label = resolver?.labelForPageId(pageId) || pageId || 'page';
      const anchor = String(node.attrs?.anchor || '').trim();
      const alias = String(node.attrs?.alias || '').trim();
      const target = anchor ? `${label}#${anchor}` : label;
      out.push(alias ? `![[${target}|${alias}]]` : `![[${target}]]`);
    } else if (node.type === 'mermaid') {
      const source = String(node.attrs?.source || '').replace(/\s+$/, '');
      out.push(`\`\`\`mermaid\n${source}\n\`\`\``);
    } else {
      out.push(paragraphText(node, resolver));
    }
  }

  return out.join('\n\n').replace(/\s+$/, '') + '\n';
}
