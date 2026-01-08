import { FileCode } from "lucide-react";

interface CodeBlockProps {
  filename: string;
  code: string;
}

const CodeBlock = ({ filename, code }: CodeBlockProps) => {
  return (
    <div className="overflow-hidden rounded border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-1.5">
        <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{filename}</span>
      </div>
      <pre className="overflow-x-auto p-3 text-xs">
        <code className="text-foreground">{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
