import {
  normalizeTable,
  parseReportBlockPayload,
  serializeReportBlockPayload,
} from '../features/editor/report-block-data';
import { parseInline, serializeInline, type InlineNode, type InlineResolver } from './inline-markdown';

type MentionResolver = InlineResolver;

type JsonNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: JsonNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
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
  const parsed = parseInline(text, resolver);
  return parsed.map(toJsonNode).filter((node) => !(node.type === 'text' && node.text === ''));
}

function toJsonNode(node: InlineNode): JsonNode {
  if (node.type === 'pageMention') return { type: 'pageMention', attrs: node.attrs };
  const out: JsonNode = { type: 'text', text: node.text };
  if (node.marks && node.marks.length) {
    out.marks = node.marks.map((mark) =>
      mark.type === 'link'
        ? { type: 'link', attrs: { ...mark.attrs } }
        : { type: mark.type }
    );
  }
  return out;
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
  return { type: 'paragraph', content: inlineNodes(text, resolver) };
}

function heading(level: number, text: string, resolver?: MentionResolver): JsonNode {
  return { type: 'heading', attrs: { level }, content: inlineNodes(text, resolver) };
}

function raw(text: string, attrs: Record<string, any> = {}): JsonNode {
  return { type: 'rawMarkdown', attrs: { text: text.replace(/\n+$/, ''), ...attrs } };
}

function isRawLine(line: string) {
  return /^\s*<!--/.test(line) || /^\s*\|.*\|\s*$/.test(line);
}

function cellTextNodes(value: unknown, resolver?: MentionResolver): JsonNode[] {
  const text = String(value ?? '');
  const paragraphs = text.split('\n');
  return paragraphs.map((part) => ({
    type: 'paragraph',
    content: part ? inlineNodes(part, resolver) : [],
  }));
}

function reportTableNode(body: string, resolver?: MentionResolver): JsonNode {
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
          content: cellTextNodes(column.label, resolver),
        })),
      },
      ...rows.map((row) => ({
        type: 'tableRow',
        content: columns.map((_column, index) => ({
          type: 'tableCell',
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: cellTextNodes(row[index] ?? '', resolver),
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

function pipeTableNode(lines: string[], resolver?: MentionResolver): JsonNode {
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
          content: cellTextNodes(cell, resolver),
        })),
      },
      ...rows.map((row) => ({
        type: 'tableRow',
        content: headers.map((_header, index) => ({
          type: 'tableCell',
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: cellTextNodes(row[index] ?? '', resolver),
        })),
      })),
    ],
  };
}

export interface MarkdownDocContext {
  filePath?: string;
  clusterSlug?: string;
}

const CLUSTER_SENTINEL_BEGIN = '<!-- BEGIN cluster-content-table:auto:v1:do-not-edit -->';
const CLUSTER_SENTINEL_END = '<!-- END cluster-content-table:auto -->';
const CLUSTER_INDEX_SENTINEL_BEGIN = '<!-- BEGIN cluster-index-table:auto:v1:do-not-edit -->';
const CLUSTER_INDEX_SENTINEL_END = '<!-- END cluster-index-table:auto -->';

function extractClusterSlugFromPath(filePath?: string): string {
  if (!filePath) return '';
  const m = filePath.match(/(?:^|\/)brain\/topic-clusters\/([^/]+)\.md$/);
  return m ? m[1] : '';
}

// Defensive removal of a leading YAML frontmatter block. Callers are expected
// to pass the body only (frontmatter is stripped upstream by readProjectFile /
// parseFrontmatter), but if a raw file ever reaches here the `---\n...\n---`
// header would otherwise render as a stray paragraph plus a horizontal rule.
// Mirrors the parsing in parseFrontmatter() without importing the server-only
// project-files module into client bundles.
function stripLeadingFrontmatter(markdown: string): string {
  if (!markdown.startsWith('---\n')) return markdown;
  const end = markdown.indexOf('\n---', 4);
  if (end === -1) return markdown;
  return markdown.slice(end + 4).replace(/^\n/, '');
}

export function markdownToDoc(
  markdown: string,
  resolver?: MentionResolver,
  context?: MarkdownDocContext,
) {
  const lines = stripLeadingFrontmatter(markdown.replace(/\r\n/g, '\n')).split('\n');
  const content: JsonNode[] = [];
  let i = 0;
  const clusterSlug = context?.clusterSlug || extractClusterSlugFromPath(context?.filePath);

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
        content.push(reportTableNode(body, resolver));
      } else if (/^agentic-(kpis|chart)$/.test(language)) {
        content.push({ type: 'reportBlock', attrs: { kind: language, data: body } });
      } else if (language === 'mermaid') {
        content.push({ type: 'mermaid', attrs: { source: body } });
      } else if (language === 'agentic-query') {
        content.push({ type: 'agenticQuery', attrs: { source: body } });
      } else if (/^agentic-(clusters|clusters-by-area|cluster-content|cluster-index)$/.test(language)) {
        content.push({ type: 'autoBlock', attrs: { kind: language, body } });
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

    if (line.trim() === CLUSTER_SENTINEL_BEGIN) {
      const inner: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== CLUSTER_SENTINEL_END) {
        inner.push(lines[i++]);
      }
      if (i < lines.length) i++; // consume END
      content.push({
        type: 'clusterTable',
        attrs: { clusterSlug, sentinelRaw: inner.join('\n') },
      });
      continue;
    }

    if (line.trim() === CLUSTER_INDEX_SENTINEL_BEGIN) {
      const inner: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== CLUSTER_INDEX_SENTINEL_END) {
        inner.push(lines[i++]);
      }
      if (i < lines.length) i++;
      content.push({
        type: 'activeClustersTable',
        attrs: { sentinelRaw: inner.join('\n') },
      });
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
      content.push(pipeTableNode(block, resolver));
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

function toInlineNode(node: JsonNode): InlineNode {
  if (node.type === 'pageMention') {
    return {
      type: 'pageMention',
      attrs: {
        pageId: String(node.attrs?.pageId || ''),
        anchor: node.attrs?.anchor ? String(node.attrs.anchor) : null,
        alias: node.attrs?.alias ? String(node.attrs.alias) : null,
      },
    };
  }
  const marks: any[] = (node.marks || []).map((m) => {
    if (m.type === 'link') {
      return { type: 'link', attrs: { href: String(m.attrs?.href || ''), title: m.attrs?.title ?? null } };
    }
    return { type: m.type };
  });
  return { type: 'text', text: node.text || '', ...(marks.length ? { marks } : {}) } as InlineNode;
}

function inlineChildren(node: JsonNode): InlineNode[] {
  const children = node.content || [];
  return children
    .filter((child) => child.type === 'text' || child.type === 'pageMention')
    .map(toInlineNode);
}

function paragraphText(node: JsonNode, resolver?: MentionResolver) {
  return serializeInline(inlineChildren(node), resolver);
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
    else if (node.type === 'clusterTable') {
      const raw = String(node.attrs?.sentinelRaw || '').replace(/\s+$/, '');
      out.push(`${CLUSTER_SENTINEL_BEGIN}\n${raw}\n${CLUSTER_SENTINEL_END}`);
    }
    else if (node.type === 'activeClustersTable') {
      const raw = String(node.attrs?.sentinelRaw || '').replace(/\s+$/, '');
      out.push(`${CLUSTER_INDEX_SENTINEL_BEGIN}\n${raw}\n${CLUSTER_INDEX_SENTINEL_END}`);
    }
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
    } else if (node.type === 'agenticQuery') {
      const source = String(node.attrs?.source || '').replace(/\s+$/, '');
      out.push(`\`\`\`agentic-query\n${source}\n\`\`\``);
    } else if (node.type === 'autoBlock') {
      const kind = String(node.attrs?.kind || 'agentic-clusters-by-area');
      const body = String(node.attrs?.body || '').replace(/\s+$/, '');
      out.push(`\`\`\`${kind}\n${body}\n\`\`\``);
    } else {
      out.push(paragraphText(node, resolver));
    }
  }

  return out.join('\n\n').replace(/\s+$/, '') + '\n';
}
