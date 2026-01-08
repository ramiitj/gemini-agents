import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCodeChanges, CodeChange } from "@/hooks/useCodeChanges";

interface DiffViewerProps {
  projectId?: string;
  conversationId?: string;
}

interface DiffFile {
  filename: string;
  hunks: DiffHunk[];
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

interface DiffLine {
  type: "context" | "addition" | "deletion";
  content: string;
}

// Parse diff content into structured format
function parseDiffContent(diffContent: string): DiffHunk[] {
  if (!diffContent) return [];
  
  const hunks: DiffHunk[] = [];
  const lines = diffContent.split('\n');
  let currentHunk: DiffHunk | null = null;
  
  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (currentHunk) hunks.push(currentHunk);
      currentHunk = { header: line, lines: [] };
    } else if (currentHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lines.push({ type: 'addition', content: line.substring(1) });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.lines.push({ type: 'deletion', content: line.substring(1) });
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({ type: 'context', content: line.substring(1) });
      } else if (!line.startsWith('---') && !line.startsWith('+++')) {
        currentHunk.lines.push({ type: 'context', content: line });
      }
    }
  }
  
  if (currentHunk) hunks.push(currentHunk);
  return hunks;
}

// Convert CodeChange to DiffFile format
function changeToDiffFile(change: CodeChange): DiffFile {
  const hunks = change.diff_content 
    ? parseDiffContent(change.diff_content)
    : [];
  
  // If no diff content, create a simple diff from content
  if (hunks.length === 0 && change.modified_content) {
    const lines = change.modified_content.split('\n').map(line => ({
      type: change.status === 'deleted' ? 'deletion' as const : 'addition' as const,
      content: line
    }));
    hunks.push({
      header: `@@ -0,0 +1,${lines.length} @@`,
      lines
    });
  }
  
  return {
    filename: change.file_path,
    hunks
  };
}

const DiffViewer = ({ projectId, conversationId }: DiffViewerProps) => {
  const { changes, loading } = useCodeChanges(projectId, conversationId);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (changes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No changes to display</p>
        <p className="text-xs mt-1">Changes will appear here when the AI agent modifies files</p>
      </div>
    );
  }
  
  const diffFiles = changes.map(changeToDiffFile);
  
  return (
    <div className="space-y-4">
      {diffFiles.map((file, index) => (
        <DiffFileBlock 
          key={changes[index].id} 
          file={file} 
          change={changes[index]}
        />
      ))}
    </div>
  );
};

const DiffFileBlock = ({ file, change }: { file: DiffFile; change: CodeChange }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const content = change.modified_content || file.hunks
      .flatMap((h) => h.lines.map((l) => l.content))
      .join("\n");
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors = {
    added: "text-green-600 bg-green-500/10",
    modified: "text-yellow-600 bg-yellow-500/10",
    deleted: "text-red-600 bg-red-500/10"
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className={`px-1.5 py-0.5 text-xs rounded ${statusColors[change.status]}`}>
            {change.status}
          </span>
          {file.filename}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {change.additions > 0 && <span className="text-green-600">+{change.additions}</span>}
            {change.additions > 0 && change.deletions > 0 && " / "}
            {change.deletions > 0 && <span className="text-red-600">-{change.deletions}</span>}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Diff content */}
      {isExpanded && (
        <div className="overflow-x-auto">
          {file.hunks.length > 0 ? (
            file.hunks.map((hunk, i) => (
              <div key={i}>
                <div className="bg-muted/30 px-3 py-1 text-xs text-muted-foreground font-mono">
                  {hunk.header}
                </div>
                {hunk.lines.map((line, j) => (
                  <DiffLineRow key={j} line={line} />
                ))}
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              No diff content available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DiffLineRow = ({ line }: { line: DiffLine }) => {
  const styles = {
    context: "bg-transparent text-foreground",
    addition: "bg-green-500/10 text-green-700 dark:text-green-400",
    deletion: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  const prefix = {
    context: " ",
    addition: "+",
    deletion: "-",
  };

  return (
    <div className={`px-3 py-0.5 font-mono text-xs ${styles[line.type]}`}>
      <span className="mr-2 select-none text-muted-foreground">
        {prefix[line.type]}
      </span>
      {line.content || " "}
    </div>
  );
};

export default DiffViewer;
