import { useRef, useEffect } from "react";
import { Loader2, Image, Globe, MessageSquare, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import MessageBubble from "./MessageBubble";
import AgentActivityIndicator from "./AgentActivityIndicator";
import type { Message } from "./ChatContainer";
import type { AgentActivity } from "@/hooks/useAgentActivity";
import type { SearchAttachment, AgentMode } from "@/types/search";

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  activities?: AgentActivity[];
  onPinResult?: (result: SearchAttachment) => void;
  pinnedUrls?: string[];
  currentMode?: AgentMode;
}

const getModeLoadingConfig = (mode?: AgentMode) => {
  switch (mode) {
    case 'image_search':
      return { 
        icon: Image, 
        text: 'Searching for images...',
        initialText: 'Starting image search...',
        useSpinner: false
      };
    case 'web_search':
      return { 
        icon: Globe, 
        text: 'Searching the web...',
        initialText: 'Starting web search...',
        useSpinner: false
      };
    case 'chat':
      return { 
        icon: MessageSquare, 
        text: 'Thinking...',
        initialText: 'Processing...',
        useSpinner: false
      };
    case 'execution':
    default:
      return { 
        icon: Rocket, 
        text: 'Working on your request...',
        initialText: 'Starting agent...',
        useSpinner: true
      };
  }
};

const MessageList = ({ 
  messages, 
  isTyping, 
  activities = [],
  onPinResult,
  pinnedUrls = [],
  currentMode
}: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const loadingConfig = getModeLoadingConfig(currentMode);
  const LoadingIcon = loadingConfig.icon;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message}
            onPinResult={onPinResult}
            pinnedUrls={pinnedUrls}
          />
        ))}
        
        {isTyping && (
          <div className="space-y-3">
            {/* Always show activity indicator when typing - with initial state if empty */}
            {activities.length > 0 ? (
              <AgentActivityIndicator activities={activities} />
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                <LoadingIcon className={cn(
                  "h-4 w-4 text-primary",
                  loadingConfig.useSpinner ? "animate-spin" : "animate-pulse"
                )} />
                <span className="text-sm text-muted-foreground">{loadingConfig.initialText}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
              </span>
              <span>{loadingConfig.text}</span>
            </div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default MessageList;
