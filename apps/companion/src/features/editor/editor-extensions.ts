import {
  StarterKit,
  Placeholder,
  TaskList,
  TaskItem,
  TiptapLink,
  TiptapUnderline,
  HighlightExtension,
  GlobalDragHandle,
  UpdatedImage,
  HorizontalRule,
} from 'novel';
import { CollapsibleHeading } from './collapsible-heading';
import { PageMention } from './page-mention-extension';
import { RawMarkdown } from './raw-markdown-extension';
import { ReportBlock } from './report-block-extension';
import type { ReportScoreResult } from './report-block-data';
import type { SupportedLocale } from '@/lib/i18n';

export const getExtensions = (options: { onReportScoreRecalculated?: (result: ReportScoreResult) => void; locale?: SupportedLocale } = {}) => [
  StarterKit.configure({
    horizontalRule: false,
    heading: false,
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
  UpdatedImage.configure({
    HTMLAttributes: {
      class: 'rounded-lg border border-notion-border my-4',
    },
  }),
  HorizontalRule,
  TiptapLink.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'underline underline-offset-2 text-notion-text cursor-pointer',
    },
  }),
  TiptapUnderline,
  HighlightExtension.configure({ multicolor: true }),
  GlobalDragHandle.configure({
    dragHandleWidth: 24,
    scrollTreshold: 50,
  }),
  PageMention,
  ReportBlock.configure({
    onScoreRecalculated: options.onReportScoreRecalculated || null,
    locale: options.locale || 'pt-BR',
  }),
  RawMarkdown,
];
