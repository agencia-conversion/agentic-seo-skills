type Mark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'code' }
  | { type: 'link'; attrs: { href: string; title?: string | null } };

export type InlineNode =
  | { type: 'text'; text: string; marks?: Mark[] }
  | { type: 'pageMention'; attrs: { pageId: string; anchor: string | null; alias: string | null } };

export interface InlineResolver {
  findPageId: (target: string) => string | null;
  labelForPageId: (pageId: string) => string;
}

interface Token {
  start: number;
  end: number;
  node: InlineNode;
}

const PATTERNS: Array<(text: string, resolver?: InlineResolver) => Token | null> = [
  matchWikilink,
  matchCodeSpan,
  matchLink,
  matchBoldStrong,
  matchItalicEm,
  matchBareUrl,
];

export function parseInline(text: string, resolver?: InlineResolver): InlineNode[] {
  const nodes: InlineNode[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const next = findNextToken(text, cursor, resolver);
    if (!next) {
      pushText(nodes, text.slice(cursor));
      break;
    }
    if (next.start > cursor) pushText(nodes, text.slice(cursor, next.start));
    nodes.push(next.node);
    cursor = next.end;
  }
  return nodes.length ? nodes : [textNode('')];
}

export function serializeInline(nodes: InlineNode[] | undefined, resolver?: InlineResolver): string {
  if (!nodes || !nodes.length) return '';
  return nodes.map((node) => serializeNode(node, resolver)).join('');
}

function findNextToken(text: string, from: number, resolver?: InlineResolver): Token | null {
  let best: Token | null = null;
  for (const pattern of PATTERNS) {
    const token = pattern(text.slice(from), resolver);
    if (!token) continue;
    const adjusted: Token = { start: token.start + from, end: token.end + from, node: token.node };
    if (!best || adjusted.start < best.start) best = adjusted;
  }
  return best;
}

function pushText(nodes: InlineNode[], text: string) {
  if (!text) return;
  const last = nodes[nodes.length - 1];
  if (last && last.type === 'text' && !last.marks) {
    last.text += text;
    return;
  }
  nodes.push({ type: 'text', text });
}

function textNode(text: string, marks?: Mark[]): InlineNode {
  return marks && marks.length ? { type: 'text', text, marks } : { type: 'text', text };
}

function matchWikilink(text: string, resolver?: InlineResolver): Token | null {
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/;
  const match = re.exec(text);
  if (!match) return null;
  const target = match[1].trim();
  const aliasRaw = match[2]?.trim() || null;
  const hashIndex = target.indexOf('#');
  const pageTarget = hashIndex === -1 ? target : target.slice(0, hashIndex).trim();
  const anchor = hashIndex === -1 ? null : target.slice(hashIndex + 1).trim() || null;
  const pageId = pageTarget ? resolver?.findPageId(pageTarget) : null;
  if (!pageId) {
    return { start: match.index, end: match.index + match[0].length, node: { type: 'text', text: match[0] } };
  }
  return {
    start: match.index,
    end: match.index + match[0].length,
    node: { type: 'pageMention', attrs: { pageId, anchor, alias: aliasRaw } },
  };
}

function matchLink(text: string): Token | null {
  const re = /(^|[^!])\[([^\]\n]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/;
  const match = re.exec(text);
  if (!match) return null;
  const lead = match[1] || '';
  const innerStart = match.index + lead.length;
  const label = match[2];
  const href = match[3];
  const title = match[4] || null;
  return {
    start: innerStart,
    end: match.index + match[0].length,
    node: { type: 'text', text: label, marks: [{ type: 'link', attrs: title ? { href, title } : { href } }] },
  };
}

function matchCodeSpan(text: string): Token | null {
  const re = /`([^`\n]+?)`/;
  const match = re.exec(text);
  if (!match) return null;
  return {
    start: match.index,
    end: match.index + match[0].length,
    node: { type: 'text', text: match[1], marks: [{ type: 'code' }] },
  };
}

function matchBoldStrong(text: string): Token | null {
  const re = /(\*\*|__)(?=\S)([\s\S]+?)(?<=\S)\1/;
  const match = re.exec(text);
  if (!match) return null;
  return {
    start: match.index,
    end: match.index + match[0].length,
    node: { type: 'text', text: match[2], marks: [{ type: 'bold' }] },
  };
}

function matchBareUrl(text: string): Token | null {
  const re = /(?:^|[\s(])(https?:\/\/[^\s<>"'`)\]]+)/;
  const match = re.exec(text);
  if (!match) return null;
  const lead = match[0].length - match[1].length;
  let url = match[1];
  while (url.length && /[.,;:!?)\]}>]/.test(url[url.length - 1])) {
    url = url.slice(0, -1);
  }
  if (!url) return null;
  return {
    start: match.index + lead,
    end: match.index + lead + url.length,
    node: { type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] },
  };
}

function matchItalicEm(text: string): Token | null {
  const re = /(?:(?<!\w)_(?=\S)([\s\S]+?)(?<=\S)_(?!\w))|(?:(?<![\*])\*(?=\S)([\s\S]+?)(?<=\S)\*(?!\*))/;
  const match = re.exec(text);
  if (!match) return null;
  const value = match[1] ?? match[2];
  return {
    start: match.index,
    end: match.index + match[0].length,
    node: { type: 'text', text: value, marks: [{ type: 'italic' }] },
  };
}

function serializeNode(node: InlineNode, resolver?: InlineResolver): string {
  if (node.type === 'pageMention') {
    const label = resolver?.labelForPageId(node.attrs.pageId) || node.attrs.pageId || 'page';
    const anchor = (node.attrs.anchor || '').trim();
    const target = anchor ? `${label}#${anchor}` : label;
    const alias = (node.attrs.alias || '').trim();
    return alias ? `[[${target}|${alias}]]` : `[[${target}]]`;
  }
  let out = node.text || '';
  const marks = node.marks || [];
  const link = marks.find((m) => m.type === 'link') as Extract<Mark, { type: 'link' }> | undefined;
  if (marks.some((m) => m.type === 'code')) return `\`${out}\``;
  if (marks.some((m) => m.type === 'bold')) out = `**${out}**`;
  if (marks.some((m) => m.type === 'italic')) out = `*${out}*`;
  if (link) {
    if (out === link.attrs.href && !link.attrs.title) {
      return out;
    }
    const titlePart = link.attrs.title ? ` "${link.attrs.title}"` : '';
    out = `[${out}](${link.attrs.href}${titlePart})`;
  }
  return out;
}
