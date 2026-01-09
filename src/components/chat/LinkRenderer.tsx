import React from "react";
import { ExternalLink } from "lucide-react";

interface LinkRendererProps {
  text: string;
  className?: string;
}

export function renderTextWithLinks(text: string): React.ReactNode[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${keyIndex++}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }
    
    // Add the link
    parts.push(
      <a
        key={`link-${keyIndex++}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        {match[1]}
        <ExternalLink className="h-3 w-3 inline-block" />
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last link
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${keyIndex++}`}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : [<span key="plain">{text}</span>];
}

const LinkRenderer = ({ text, className }: LinkRendererProps) => {
  return <span className={className}>{renderTextWithLinks(text)}</span>;
};

export default LinkRenderer;
