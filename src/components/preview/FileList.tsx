import { FileCode, FilePlus, FileX, ChevronRight, Loader2 } from "lucide-react";
import { useCodeChanges, CodeChange } from "@/hooks/useCodeChanges";

interface FileListProps {
  projectId?: string;
  conversationId?: string;
  onFileClick?: (change: CodeChange) => void;
}

const FileList = ({ projectId, conversationId, onFileClick }: FileListProps) => {
  const { changes, loading } = useCodeChanges(projectId, conversationId);
  
  const totalAdditions = changes.reduce((acc, f) => acc + (f.additions || 0), 0);
  const totalDeletions = changes.reduce((acc, f) => acc + (f.deletions || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No file changes</p>
        <p className="text-xs mt-1">Files modified by the AI agent will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{changes.length} files changed</span>
        {totalAdditions > 0 && <span className="text-green-600">+{totalAdditions}</span>}
        {totalDeletions > 0 && <span className="text-red-600">-{totalDeletions}</span>}
      </div>

      {/* File list */}
      <div className="space-y-0.5">
        {changes.map((change) => (
          <FileItem 
            key={change.id} 
            change={change} 
            onClick={() => onFileClick?.(change)}
          />
        ))}
      </div>
    </div>
  );
};

const FileItem = ({ change, onClick }: { change: CodeChange; onClick?: () => void }) => {
  const statusConfig = {
    added: {
      icon: FilePlus,
      color: "text-green-600",
      bg: "bg-green-500/10",
    },
    modified: {
      icon: FileCode,
      color: "text-yellow-600",
      bg: "bg-yellow-500/10",
    },
    deleted: {
      icon: FileX,
      color: "text-red-600",
      bg: "bg-red-500/10",
    },
  };

  const config = statusConfig[change.status];
  const Icon = config.icon;

  return (
    <div 
      className="group flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted/50 cursor-pointer"
      onClick={onClick}
    >
      <div className={`rounded p-1 ${config.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
      </div>
      <span className="flex-1 truncate text-sm text-foreground">
        {change.file_path}
      </span>
      <div className="flex items-center gap-2 text-xs">
        {change.additions > 0 && (
          <span className="text-green-600">+{change.additions}</span>
        )}
        {change.deletions > 0 && (
          <span className="text-red-600">-{change.deletions}</span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
};

export default FileList;
