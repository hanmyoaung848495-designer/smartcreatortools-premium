import React, { useState, useRef, useEffect } from 'react';
import { Save, Download, Code, ArrowLeft, Terminal, Play, Settings, Moon, Sun } from 'lucide-react';
import { Button, Card } from '../components/Shared';
import { toast } from 'sonner';

interface CodeEditorProps {
  onBack: () => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ onBack }) => {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('script');
  const [fileExt, setFileExt] = useState('.js');
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const [isExtDropdownOpen, setIsExtDropdownOpen] = useState(false);
  const extDropdownRef = useRef<HTMLDivElement>(null);

  const codeExtensions = [".js", ".ts", ".html", ".css", ".py", ".cpp", ".java", ".json", ".php", ".rb", ".go", ".rs", ".sql", ".sh"];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (extDropdownRef.current && !extDropdownRef.current.contains(event.target as Node)) {
        setIsExtDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleSaveAs = async () => {
    const fullFileName = `${fileName}${fileExt}`;
    const blob = new Blob([content || '// Write your code here\nconsole.log("Hello World!");'], { type: 'text/plain;charset=utf-8' });

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fullFileName,
          types: [
            {
              description: 'Code Files',
              accept: { 'text/plain': ['.js', '.ts', '.html', '.css', '.py', '.cpp', '.java', '.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success('Code saved successfully!', {
          icon: '💾',
          style: { borderRadius: '1rem' }
        });
        return;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Save file picker failed:', err);
      } else {
        return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      
      // Put cursor at right position again
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Code className="text-indigo-500" /> Code Editor
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Write, edit, and save your code</p>
          </div>
        </div>
      </div>

      <Card className="p-4 md:p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors flex items-center justify-center"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
              <Settings size={16} className="text-gray-500" />
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-gray-900 dark:text-gray-100 outline-none cursor-pointer"
              >
                <option value={12} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">12px</option>
                <option value={14} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">14px</option>
                <option value={16} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">16px</option>
                <option value={18} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">18px</option>
                <option value={20} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">20px</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="File name"
              className="col-span-1 sm:w-32 px-3 py-2 sm:py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
            />
            <div className="relative col-span-1" ref={extDropdownRef}>
              <input
                type="text"
                value={fileExt}
                onChange={(e) => setFileExt(e.target.value)}
                onFocus={() => setIsExtDropdownOpen(true)}
                placeholder=".ext"
                className="w-20 px-2 py-2 sm:py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold"
              />
              {isExtDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-24 max-h-32 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 no-scrollbar">
                  {codeExtensions.map(ext => (
                    <button
                      key={ext}
                      onClick={() => {
                        setFileExt(ext);
                        setIsExtDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-300 font-mono"
                    >
                      {ext}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSaveAs} className="col-span-2 sm:col-span-1 py-2 sm:py-1.5 px-4 flex items-center justify-center gap-2 text-sm whitespace-nowrap">
              <Save size={16} /> Save As
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className={`relative rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-inner ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f5]'}`}>
          {/* Line Numbers (Simulated) */}
          <div 
            ref={lineNumbersRef}
            className="absolute left-0 top-0 bottom-0 w-12 bg-gray-100 dark:bg-[#252526] border-r border-gray-200 dark:border-[#333] flex flex-col items-end py-6 pr-3 select-none pointer-events-none text-gray-400 dark:text-gray-500 font-mono overflow-hidden" 
            style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}
          >
            {content.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            spellCheck="false"
            placeholder='// Write your code here...'
            className={`w-full min-h-[500px] pl-16 pr-6 py-6 bg-transparent outline-none resize-none font-mono ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#333]'}`}
            style={{ 
              fontSize: `${fontSize}px`,
              lineHeight: '1.5',
              tabSize: 2
            }}
          />
        </div>
      </Card>
    </div>
  );
};

export default CodeEditor;
