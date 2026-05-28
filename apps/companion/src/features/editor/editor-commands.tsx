'use client';

import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Minus,
  Code,
  Image as ImageIcon,
  Text,
  MessageSquareWarning,
  Workflow,
  Layers,
  Sparkles,
} from 'lucide-react';

export interface SuggestionItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  searchTerms?: string[];
  command: (ctx: { editor: any; range: any }) => void;
  testId?: string;
}

type Translator = (key: string, vars?: Record<string, string | number>) => string;

export interface SuggestionHandlers {
  openImageEmbed?: (
    onInsert: (url: string, alt?: string) => void
  ) => void;
  openClusterPick?: (
    title: string,
    onPick: (slug: string) => void
  ) => void;
}

export const buildSuggestionItems = (
  t?: Translator,
  handlers?: SuggestionHandlers
): SuggestionItem[] => [
  {
    title: 'Text',
    description: 'Plain text block.',
    icon: <Text className="w-4 h-4" />,
    searchTerms: ['paragraph', 'p'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode('paragraph', 'paragraph').run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Big section heading.',
    icon: <Heading1 className="w-4 h-4" />,
    searchTerms: ['h1', 'title'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    icon: <Heading2 className="w-4 h-4" />,
    searchTerms: ['h2', 'subtitle'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    icon: <Heading3 className="w-4 h-4" />,
    searchTerms: ['h3'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'To-do list',
    description: 'Track tasks with a checklist.',
    icon: <ListTodo className="w-4 h-4" />,
    searchTerms: ['todo', 'task', 'checkbox'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Simple bulleted list.',
    icon: <List className="w-4 h-4" />,
    searchTerms: ['unordered', 'point'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list.',
    icon: <ListOrdered className="w-4 h-4" />,
    searchTerms: ['ordered'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quotation.',
    icon: <Quote className="w-4 h-4" />,
    searchTerms: ['blockquote'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Divider',
    description: 'Horizontal rule.',
    icon: <Minus className="w-4 h-4" />,
    searchTerms: ['hr', 'horizontal'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Syntax-highlighted code.',
    icon: <Code className="w-4 h-4" />,
    searchTerms: ['pre', 'code'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Image',
    description: 'Embed an image URL.',
    icon: <ImageIcon className="w-4 h-4" />,
    searchTerms: ['img', 'photo'],
    testId: 'slash-item-image',
    command: ({ editor, range }) => {
      // First remove the slash query so the modal opens on a stable state.
      editor.chain().focus().deleteRange(range).run();
      handlers?.openImageEmbed?.((url, alt) => {
        if (!url) return;
        const attrs: { src: string; alt?: string } = { src: url };
        if (alt) attrs.alt = alt;
        editor.chain().focus().setImage(attrs).run();
      });
    },
  },
  {
    title: t ? t('slashMenu.callout') : 'Callout',
    description: t ? t('slashMenu.calloutDesc') : 'Highlighted note, tip, warning, or quote.',
    icon: <MessageSquareWarning className="w-4 h-4" />,
    searchTerms: ['callout', 'admonition', 'alert', 'note', 'warning', 'tip', 'aviso', 'nota'],
    testId: 'slash-item-callout',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'callout',
          attrs: { calloutType: 'note', title: '' },
          content: [{ type: 'paragraph' }],
        })
        .run();
    },
  },
  {
    title: t ? t('slashMenu.mermaid') : 'Mermaid diagram',
    description: t ? t('slashMenu.mermaidDesc') : 'Flowchart, sequence, or ER diagram.',
    icon: <Workflow className="w-4 h-4" />,
    searchTerms: ['mermaid', 'diagram', 'flowchart', 'fluxograma', 'sequence', 'er'],
    testId: 'slash-item-mermaid',
    command: ({ editor, range }) => {
      const seed = 'flowchart TD\n  A[Start] --> B[End]';
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'mermaid', attrs: { source: seed } })
        .run();
    },
  },
  {
    title: t ? t('slashMenu.embed') : 'Embed page',
    description: t ? t('slashMenu.embedDesc') : 'Inline transclusion of another page.',
    icon: <Layers className="w-4 h-4" />,
    searchTerms: ['embed', 'transclusion', 'include', 'transcricao', 'transcrição'],
    testId: 'slash-item-embed',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent('![[').run();
    },
  },
  {
    title: t ? t('slashMenu.query') : 'Agentic query',
    description: t ? t('slashMenu.queryDesc') : 'Live query over project frontmatter.',
    icon: <Sparkles className="w-4 h-4" />,
    searchTerms: ['query', 'dataview', 'filter', 'busca', 'pesquisa', 'agentic'],
    testId: 'slash-item-query',
    command: ({ editor, range }) => {
      const seed = 'version: 1\nfrom: "brain"\nsort: title asc\nlimit: 10\n';
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'agenticQuery', attrs: { source: seed } })
        .run();
    },
  },
  {
    title: 'Conteúdos do cluster',
    description: 'Tabela dinâmica de conteúdos publicados + planejados de um cluster.',
    icon: <Sparkles className="w-4 h-4" />,
    searchTerms: ['cluster', 'conteudo', 'conteúdo', 'pilar', 'satelite'],
    testId: 'slash-item-cluster-content',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      handlers?.openClusterPick?.('Selecione o cluster', (slug) => {
        if (!slug) return;
        const body = `version: 1\ncluster: ${slug}\n`;
        editor
          .chain()
          .focus()
          .insertContent({ type: 'autoBlock', attrs: { kind: 'agentic-cluster-content', body } })
          .run();
      });
    },
  },
  {
    title: 'Índice de clusters',
    description: 'Painel + tabela de todos os clusters ativos do projeto.',
    icon: <Sparkles className="w-4 h-4" />,
    searchTerms: ['cluster', 'indice', 'índice', 'painel', 'todos'],
    testId: 'slash-item-cluster-index',
    command: ({ editor, range }) => {
      const body = 'version: 1\n';
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'autoBlock', attrs: { kind: 'agentic-cluster-index', body } })
        .run();
    },
  },
];
