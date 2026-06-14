'use client';

import { useState, useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

const EMPTY = '<p></p>';

type ToolbarButton = {
  label: React.ReactNode;
  title: string;
  isActive?: (e: Editor) => boolean;
  run: (e: Editor) => void;
};

const buttons: ToolbarButton[] = [
  { label: <span className="font-bold">B</span>, title: 'Bold', isActive: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
  { label: <span className="italic">i</span>, title: 'Italic', isActive: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
  { label: <span className="underline">U</span>, title: 'Underline', isActive: (e) => e.isActive('underline'), run: (e) => e.chain().focus().toggleUnderline().run() },
  { label: <span className="line-through">S</span>, title: 'Strikethrough', isActive: (e) => e.isActive('strike'), run: (e) => e.chain().focus().toggleStrike().run() },
  { label: 'H2', title: 'Heading', isActive: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'H3', title: 'Subheading', isActive: (e) => e.isActive('heading', { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: '• List', title: 'Bullet list', isActive: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: '1. List', title: 'Numbered list', isActive: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: '❝', title: 'Quote', isActive: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
];

export default function RichTextEditor({
  name,
  defaultValue = '',
}: {
  name: string;
  defaultValue?: string;
}) {
  const [html, setHtml] = useState(defaultValue || '');
  const [, setTick] = useState(0); // re-render toolbar on selection changes

  const editor = useEditor({
    immediatelyRender: false,
    onSelectionUpdate: () => setTick((t) => t + 1),
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      Placeholder.configure({ placeholder: 'Write the case study…' }),
    ],
    content: defaultValue || '',
    editorProps: {
      attributes: { class: 'rich-text focus:outline-none' },
    },
    onUpdate: ({ editor }) => {
      setHtml(editor.isEmpty ? '' : editor.getHTML());
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const btnBase =
    'min-w-8 h-8 px-2 rounded-md text-sm flex items-center justify-center transition-colors';

  return (
    <div className="rt-editor rounded-lg border border-foreground/20 bg-white overflow-hidden focus-within:border-foreground">
      <div className="flex flex-wrap items-center gap-1 border-b border-foreground/15 bg-foreground/[0.03] px-2 py-1.5">
        {editor &&
          buttons.map((b, i) => {
            const active = b.isActive?.(editor) ?? false;
            return (
              <button
                key={i}
                type="button"
                title={b.title}
                onClick={() => b.run(editor)}
                className={`${btnBase} ${
                  active
                    ? 'bg-foreground! text-white!'
                    : 'bg-transparent! text-foreground! hover:bg-foreground/10!'
                }`}
              >
                {b.label}
              </button>
            );
          })}
        {editor && (
          <button
            type="button"
            title="Link"
            onClick={setLink}
            className={`${btnBase} ${
              editor.isActive('link')
                ? 'bg-foreground! text-white!'
                : 'bg-transparent! text-foreground! hover:bg-foreground/10!'
            }`}
          >
            🔗
          </button>
        )}
        <span className="mx-1 h-5 w-px bg-foreground/15" />
        {editor && (
          <>
            <button
              type="button"
              title="Undo"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className={`${btnBase} bg-transparent! text-foreground! hover:bg-foreground/10! disabled:opacity-30`}
            >
              ↶
            </button>
            <button
              type="button"
              title="Redo"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className={`${btnBase} bg-transparent! text-foreground! hover:bg-foreground/10! disabled:opacity-30`}
            >
              ↷
            </button>
          </>
        )}
      </div>

      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>

      {/* Submitted with the form; the server action reads `body` unchanged. */}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
