import { useState } from "react";
import { Check, Copy, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HighlightedCode } from "@/lib/syntax-highlighter";

interface CodeBlockEnhancedProps {
  code: string;
  filename?: string;
  language?: string;
  action?: 'create' | 'modify' | 'delete' | 'deploy' | 'verify';
}

const languageLabels: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  tsx: 'TSX',
  jsx: 'JSX',
  css: 'CSS',
  json: 'JSON',
  sql: 'SQL',
  html: 'HTML',
  markdown: 'Markdown',
  plaintext: 'Plain Text'
};

const actionBadges: Record<string, { label: string; className: string }> = {
  create: { label: 'Created', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  modify: { label: 'Modified', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  delete: { label: 'Deleted', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  deploy: { label: 'Deployed', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  verify: { label: 'Verified', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' }
};

export default function CodeBlockEnhanced({ 
  code, 
  filename, 
  language = 'plaintext',
  action 
}: CodeBlockEnhancedProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const displayLanguage = languageLabels[language.toLowerCase()] || language;
  const actionBadge = action ? actionBadges[action] : null;
  
  return (
    <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900 my-3">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-slate-400" />
          {filename ? (
            <span className="text-xs font-mono text-slate-300">{filename}</span>
          ) : (
            <span className="text-xs text-slate-400">{displayLanguage}</span>
          )}
          {actionBadge && (
            <span className={`text-xs px-1.5 py-0.5 rounded border ${actionBadge.className}`}>
              {actionBadge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-xs text-slate-500 hidden sm:block">{displayLanguage}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Code content */}
      <div className="p-3 overflow-x-auto">
        <HighlightedCode code={code} language={language} showLineNumbers={code.split('\n').length > 1} />
      </div>
    </div>
  );
}
