import * as React from "react";
import { FileCode, Check, Plus, Minus } from "lucide-react";
import type { Message } from "./ChatContainer";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SearchResultsPanel from "./SearchResultsPanel";
import type { SearchAttachment } from "@/types/search";
import { parseMessageContent, MessageBlock } from "@/lib/message-parser";
import PhaseHeader from "./blocks/PhaseHeader";
import SectionHeader from "./blocks/SectionHeader";
import CodeBlockEnhanced from "./blocks/CodeBlockEnhanced";
import FileReference from "./blocks/FileReference";
import ActionBlock from "./blocks/ActionBlock";
import NoteBlock from "./blocks/NoteBlock";
import ListBlock from "./blocks/ListBlock";

interface MessageBubbleProps {
  message: Message;
  onPinResult?: (result: SearchAttachment) => void;
  pinnedUrls?: string[];
}

// Render diff line with proper coloring
function DiffLine({ line, index }: { line: string; index: number }) {
  const isAddition = line.startsWith('+') && !line.startsWith('+++');
  const isDeletion = line.startsWith('-') && !line.startsWith('---');
  const isHeader = line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++');
  
  return (
    <div 
      className={cn(
        "px-2 py-0.5 font-mono text-xs leading-relaxed",
        isAddition && "bg-green-500/15 text-green-700 dark:text-green-400",
        isDeletion && "bg-red-500/15 text-red-700 dark:text-red-400",
        isHeader && "bg-muted/50 text-muted-foreground font-medium",
        !isAddition && !isDeletion && !isHeader && "text-foreground"
      )}
    >
      {isAddition && <Plus className="inline h-3 w-3 mr-1 opacity-60" />}
      {isDeletion && <Minus className="inline h-3 w-3 mr-1 opacity-60" />}
      <span className="whitespace-pre-wrap break-all">{line || ' '}</span>
    </div>
  );
}

// Render a single message block
function renderBlock(block: MessageBlock, index: number): React.ReactNode {
  switch (block.type) {
    case 'phase_header':
      return <PhaseHeader key={index} content={block.content} />;
    
    case 'section_header':
      return <SectionHeader key={index} content={block.content} />;
    
    case 'code':
      return (
        <CodeBlockEnhanced 
          key={index}
          code={block.content}
          filename={block.filename}
          language={block.language || 'plaintext'}
          action={block.actionType}
        />
      );
    
    case 'file_reference':
      return <FileReference key={index} filename={block.content} />;
    
    case 'agent_action':
      return (
        <ActionBlock 
          key={index}
          content={block.content}
          actor="agent"
          status={block.actionStatus || 'complete'}
        />
      );
    
    case 'user_action':
      return (
        <ActionBlock 
          key={index}
          content={block.content}
          actor="user"
          status="pending"
        />
      );
    
    case 'note':
      return (
        <NoteBlock 
          key={index}
          content={block.content}
          type={block.noteType || 'info'}
        />
      );
    
    case 'list':
      return <ListBlock key={index} content={block.content} />;
    
    case 'text':
    default:
      // Skip empty text blocks
      if (!block.content.trim()) return null;
      return (
        <p key={index} className="text-sm whitespace-pre-wrap my-1">
          {block.content}
        </p>
      );
  }
}

const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ message, onPinResult, pinnedUrls = [] }, ref) => {
    if (message.role === "system") {
      return (
        <div ref={ref} className="flex justify-center">
          <p className="text-xs text-muted-foreground">{message.content}</p>
        </div>
      );
    }

    const isUser = message.role === "user";
    const isWebSearch = message.mode === 'web_search';
    const hasGroundingData = (message.groundingMetadata?.groundingChunks?.length ?? 0) > 0;
    
    // Parse assistant messages into structured blocks
    const blocks = !isUser ? parseMessageContent(message.content) : [];

    return (
      <div ref={ref} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
        <div
          className={cn(
            "max-w-[85%] rounded-lg",
            isUser
              ? "bg-primary text-primary-foreground px-4 py-2.5"
              : "bg-muted text-foreground px-4 py-3"
          )}
        >
          {/* User messages: simple text */}
          {isUser && (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
          
          {/* Assistant messages: structured blocks */}
          {!isUser && (
            <div className="space-y-1">
              {blocks.map((block, index) => renderBlock(block, index))}
            </div>
          )}
          
          {/* Code changes section (from agent execution) */}
          {message.codeChanges && message.codeChanges.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-border/50 pt-3">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <FileCode className="h-3.5 w-3.5" />
                Code Changes
              </div>
              {message.codeChanges.map((change, i) => (
                <div 
                  key={i} 
                  className="rounded-lg border border-border bg-card overflow-hidden shadow-sm"
                >
                  {/* File header */}
                  <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-mono text-foreground truncate">
                      {change.file}
                    </span>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] h-5 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                    >
                      <Check className="h-2.5 w-2.5 mr-1" />
                      Modified
                    </Badge>
                  </div>
                  
                  {/* Diff content */}
                  <div className="max-h-64 overflow-y-auto bg-background">
                    {change.diff.split('\n').map((line, j) => (
                      <DiffLine key={j} line={line} index={j} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search results panel for web_search mode */}
          {isWebSearch && hasGroundingData && (
            <SearchResultsPanel
              chunks={message.groundingMetadata!.groundingChunks!}
              searchQueries={message.groundingMetadata?.webSearchQueries}
              onPinResult={onPinResult}
              pinnedUrls={pinnedUrls}
            />
          )}
        </div>
      </div>
    );
  }
);
MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
