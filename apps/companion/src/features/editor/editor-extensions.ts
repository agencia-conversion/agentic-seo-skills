import { StarterKit } from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Link } from '@tiptap/extension-link';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { DragHandle } from '@tiptap/extension-drag-handle';
import { Table, TableKit } from '@tiptap/extension-table';
import { CollapsibleHeading } from './collapsible-heading';
import { PageMention } from './page-mention-extension';
import { PageEmbed } from './page-embed-extension';
import { Callout } from './callout-extension';
import { Mermaid } from './mermaid-extension';
import { AgenticQuery } from './agentic-query-extension';
import { RawMarkdown } from './raw-markdown-extension';
import { ReportBlock } from './report-block-extension';
import { ClusterTable } from './cluster-table-extension';
import { SlashCommand } from './slash-command-extension';
import type { ReportScoreResult } from './report-block-data';
import type { SupportedLocale } from '@/lib/i18n';

export const AgenticTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      agenticReport: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-agentic-report') === 'true',
        renderHTML: (attributes) => (attributes.agenticReport ? { 'data-agentic-report': 'true' } : {}),
      },
      columns: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      summary: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      source_refs: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    };
  },
});

export const getExtensions = (options: { onReportScoreRecalculated?: (result: ReportScoreResult) => void; locale?: SupportedLocale } = {}) => [
  StarterKit.configure({
    horizontalRule: false,
    heading: false,
    link: false,
    underline: false,
    bulletList: {
      HTMLAttributes: { class: 'list-disc list-outside leading-7 pl-6' },
    },
    orderedList: {
      HTMLAttributes: { class: 'list-decimal list-outside leading-7 pl-6' },
    },
    listItem: {
      HTMLAttributes: { class: 'leading-7 my-1' },
    },
    blockquote: {
      HTMLAttributes: {
        class: 'border-l-[3px] border-notion-border pl-4 italic my-2',
      },
    },
    codeBlock: {
      HTMLAttributes: {
        class: 'rounded-md bg-notion-active p-4 font-mono text-sm my-2',
      },
    },
    code: {
      HTMLAttributes: {
        class: 'rounded-sm bg-notion-active px-1.5 py-0.5 font-mono text-[0.9em]',
      },
    },
  }),
  AgenticTable.configure({
    resizable: false,
    allowTableNodeSelection: true,
    HTMLAttributes: {
      class: 'agentic-native-table',
    },
  }),
  TableKit.configure({
    table: false,
    tableRow: {},
    tableHeader: {
      HTMLAttributes: {
        class: 'agentic-native-table-header',
      },
    },
    tableCell: {
      HTMLAttributes: {
        class: 'agentic-native-table-cell',
      },
    },
  }),
  CollapsibleHeading.configure({
    levels: [1, 2, 3],
  }),
  Placeholder.configure({
    placeholder: ({ node }: any) => {
      if (node.type.name === 'heading') {
        return `Heading ${node.attrs.level}`;
      }
      if (
        node.type.name === 'taskItem' ||
        node.type.name === 'taskList' ||
        node.type.name === 'bulletList' ||
        node.type.name === 'orderedList' ||
        node.type.name === 'listItem'
      ) {
        return '';
      }
      return "Press '/' for commands, ++ for AI…";
    },
    includeChildren: false,
    showOnlyCurrent: true,
  }),
  TaskList.configure({
    HTMLAttributes: { class: 'not-prose pl-1' },
  }),
  TaskItem.configure({
    nested: true,
    HTMLAttributes: { class: 'flex gap-2 items-start my-1' },
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'rounded-lg border border-notion-border my-4',
    },
  }),
  HorizontalRule,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'underline underline-offset-2 text-notion-text cursor-pointer',
    },
  }),
  Underline,
  Highlight.configure({ multicolor: true }),
  DragHandle.configure({
    render: () => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'agentic-drag-handle';
      element.setAttribute('aria-label', 'Arrastar bloco');
      element.textContent = '⋮⋮';
      return element;
    },
  }),
  PageMention,
  PageEmbed,
  Callout,
  Mermaid,
  AgenticQuery,
  SlashCommand,
  ReportBlock.configure({
    onScoreRecalculated: options.onReportScoreRecalculated || null,
    locale: options.locale || 'pt-BR',
  }),
  ClusterTable,
  RawMarkdown,
];
