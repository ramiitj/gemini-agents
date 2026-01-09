import { FileCode, FileJson, FileText, File } from "lucide-react";

interface FileReferenceProps {
  filename: string;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode className="h-4 w-4" />;
    case 'json':
      return <FileJson className="h-4 w-4" />;
    case 'md':
    case 'txt':
      return <FileText className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
}

export default function FileReference({ filename }: FileReferenceProps) {
  return (
    <div className="flex items-center gap-2 bg-amber-500/10 border-l-4 border-amber-500 px-3 py-2 rounded-r-md my-2">
      <span className="text-amber-600 dark:text-amber-400">
        {getFileIcon(filename)}
      </span>
      <span className="font-mono text-sm text-amber-700 dark:text-amber-300">
        {filename}
      </span>
    </div>
  );
}
