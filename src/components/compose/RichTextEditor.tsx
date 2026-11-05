import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote, 
  Link as LinkIcon, 
  Code, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export interface RichTextEditorRef {
  insertVariable: (variable: string) => void;
  getHtml: () => string;
  setHtml: (html: string) => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  availableVariables?: string[];
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = 'Write your personalized email message here...',
  availableVariables = ['Name', 'Email', 'Company'],
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>(value);

  // Sync internal content with external value only if changed externally
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
      lastHtmlRef.current = value;
    }
  }, [value]);

  useImperativeHandle(ref, () => ({
    insertVariable: (variable: string) => {
      insertTag(`{{${variable}}}`);
    },
    getHtml: () => {
      return editorRef.current?.innerHTML || '';
    },
    setHtml: (html: string) => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        lastHtmlRef.current = html;
        onChange(html);
      }
    },
  }));

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
    }
  };

  const handleLink = () => {
    const url = prompt('Enter link URL (e.g. https://example.com):');
    if (url) {
      exec('createLink', url);
    }
  };

  const insertTag = (text: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorRef.current.innerHTML += text;
    }

    const html = editorRef.current.innerHTML;
    lastHtmlRef.current = html;
    onChange(html);
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
    }
  };

  return (
    <div className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-subtle focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
      {/* Formatting Toolbar */}
      <div className="bg-slate-50/80 border-b border-slate-200/80 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-0.5 flex-wrap">
          <button
            type="button"
            onClick={() => exec('bold')}
            title="Bold (Ctrl+B)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('italic')}
            title="Italic (Ctrl+I)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('underline')}
            title="Underline (Ctrl+U)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('strikeThrough')}
            title="Strikethrough"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Strikethrough className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1.5"></div>

          <button
            type="button"
            onClick={() => exec('formatBlock', '<h1>')}
            title="Large Heading"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h2>')}
            title="Medium Heading"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Heading2 className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1.5"></div>

          <button
            type="button"
            onClick={() => exec('insertUnorderedList')}
            title="Bullet List"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('insertOrderedList')}
            title="Numbered List"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('formatBlock', '<blockquote>')}
            title="Quote"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Quote className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1.5"></div>

          <button
            type="button"
            onClick={handleLink}
            title="Insert Link"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('removeFormat')}
            title="Clear Formatting"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Variable Chips in Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-500" />
            Insert Tag:
          </span>
          {availableVariables.slice(0, 5).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => insertTag(`{{${v}}}`)}
              className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-mono font-medium border border-indigo-200/60 transition-colors"
            >
              +{`{{${v}}}`}
            </button>
          ))}
        </div>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="editor-content p-5 text-sm text-slate-800 leading-relaxed overflow-y-auto max-h-[400px]"
      />
    </div>
  );
});

