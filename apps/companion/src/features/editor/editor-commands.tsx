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
} from 'lucide-react';

export interface SuggestionItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  searchTerms?: string[];
  command: (ctx: { editor: any; range: any }) => void;
}

export const buildSuggestionItems = (): SuggestionItem[] => [
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
    command: ({ editor, range }) => {
      const url = window.prompt('Image URL');
      if (url) editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
    },
  },
];
