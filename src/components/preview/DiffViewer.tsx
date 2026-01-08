import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  lineNumber?: number;
}

const mockDiff: DiffFile[] = [
  {
    filename: "src/pages/index.tsx",
    hunks: [
      {
        header: "@@ -1,5 +1,7 @@",
        lines: [
          { type: "context", content: 'import Hero from "@/components/Hero";' },
          { type: "addition", content: 'import Testimonials from "@/components/Testimonials";' },
          { type: "context", content: "" },
          { type: "context", content: "export default function Home() {" },
          { type: "context", content: "  return (" },
          { type: "context", content: "    <main>" },
          { type: "context", content: "      <Hero />" },
          { type: "addition", content: "      <Testimonials />" },
          { type: "context", content: "    </main>" },
          { type: "context", content: "  );" },
          { type: "context", content: "}" },
        ],
      },
    ],
  },
  {
    filename: "src/components/Testimonials.tsx",
    hunks: [
      {
        header: "@@ -0,0 +1,35 @@",
        lines: [
          { type: "addition", content: "const testimonials = [" },
          { type: "addition", content: '  { name: "Sarah Chen", role: "CEO", quote: "..." },' },
          { type: "addition", content: '  { name: "Mike Johnson", role: "CTO", quote: "..." },' },
          { type: "addition", content: '  { name: "Emily Davis", role: "PM", quote: "..." },' },
          { type: "addition", content: "];" },
          { type: "addition", content: "" },
          { type: "addition", content: "const Testimonials = () => {" },
          { type: "addition", content: "  return (" },
          { type: "addition", content: '    <section className="py-16">' },
          { type: "addition", content: "      {testimonials.map((t) => (" },
          { type: "addition", content: "        <div key={t.name}>" },
          { type: "addition", content: '          <p>"{t.quote}"</p>' },
          { type: "addition", content: "          <p>{t.name}, {t.role}</p>" },
          { type: "addition", content: "        </div>" },
          { type: "addition", content: "      ))}" },
          { type: "addition", content: "    </section>" },
          { type: "addition", content: "  );" },
          { type: "addition", content: "};" },
          { type: "addition", content: "" },
          { type: "addition", content: "export default Testimonials;" },
        ],
      },
    ],
  },
];

const DiffViewer = () => {
  return (
    <div className="space-y-4">
      {mockDiff.map((file) => (
        <DiffFileBlock key={file.filename} file={file} />
      ))}
    </div>
  );
};

const DiffFileBlock = ({ file }: { file: DiffFile }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const content = file.hunks
      .flatMap((h) => h.lines.map((l) => l.content))
      .join("\n");
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          {file.filename}
        </button>
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

      {/* Diff content */}
      {isExpanded && (
        <div className="overflow-x-auto">
          {file.hunks.map((hunk, i) => (
            <div key={i}>
              <div className="bg-muted/30 px-3 py-1 text-xs text-muted-foreground font-mono">
                {hunk.header}
              </div>
              {hunk.lines.map((line, j) => (
                <DiffLineRow key={j} line={line} />
              ))}
            </div>
          ))}
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
