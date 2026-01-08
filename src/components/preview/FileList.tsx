import { FileCode, FilePlus, FileX, ChevronRight } from "lucide-react";

interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted";
  additions?: number;
  deletions?: number;
}

const mockFiles: FileChange[] = [
  {
    path: "src/components/Testimonials.tsx",
    status: "added",
    additions: 45,
    deletions: 0,
  },
  {
    path: "src/pages/index.tsx",
    status: "modified",
    additions: 3,
    deletions: 1,
  },
];

const FileList = () => {
  const totalAdditions = mockFiles.reduce((acc, f) => acc + (f.additions || 0), 0);
  const totalDeletions = mockFiles.reduce((acc, f) => acc + (f.deletions || 0), 0);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{mockFiles.length} files changed</span>
        <span className="text-green-600">+{totalAdditions}</span>
        <span className="text-red-600">-{totalDeletions}</span>
      </div>

      {/* File list */}
      <div className="space-y-0.5">
        {mockFiles.map((file) => (
          <FileItem key={file.path} file={file} />
        ))}
      </div>
    </div>
  );
};

const FileItem = ({ file }: { file: FileChange }) => {
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

  const config = statusConfig[file.status];
  const Icon = config.icon;

  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted/50">
      <div className={`rounded p-1 ${config.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
      </div>
      <span className="flex-1 truncate text-sm text-foreground">
        {file.path}
      </span>
      <div className="flex items-center gap-2 text-xs">
        {file.additions !== undefined && file.additions > 0 && (
          <span className="text-green-600">+{file.additions}</span>
        )}
        {file.deletions !== undefined && file.deletions > 0 && (
          <span className="text-red-600">-{file.deletions}</span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
};

export default FileList;
