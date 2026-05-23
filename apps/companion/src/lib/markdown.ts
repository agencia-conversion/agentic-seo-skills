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
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
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
      if (/^agentic-(kpis|chart|table)$/.test(language)) {
        content.push({ type: 'reportBlock', attrs: { kind: language, data: body } });
      } else {
        content.push({ type: 'codeBlock', attrs: { language: language || null }, content: [textNode(body)] });
      }
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
    } else {
      out.push(paragraphText(node, resolver));
    }
  }

  return out.join('\n\n').replace(/\s+$/, '') + '\n';
}
