interface SectionHeaderProps {
  content: string;
}

export default function SectionHeader({ content }: SectionHeaderProps) {
  // Extract the number if present (e.g., "5.1")
  const numberMatch = content.match(/^(\d+\.\d+)/);
  const number = numberMatch ? numberMatch[1] : null;
  const text = number ? content.replace(/^\d+\.\d+\s*/, '') : content;
  
  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      {number && (
        <span className="flex items-center justify-center px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-mono font-medium">
          {number}
        </span>
      )}
      <h3 className="font-medium text-foreground text-sm border-b border-border pb-1 flex-1">
        {text}
      </h3>
    </div>
  );
}
