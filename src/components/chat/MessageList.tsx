import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import MessageBubble from "./MessageBubble";
import AgentActivityIndicator from "./AgentActivityIndicator";
import type { Message } from "./ChatContainer";
import type { AgentActivity } from "@/hooks/useAgentActivity";

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  activities?: AgentActivity[];
}

const MessageList = ({ messages, isTyping, activities = [] }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isTyping && (
          <div className="space-y-3">
            {/* Always show activity indicator when typing - with initial state if empty */}
            {activities.length > 0 ? (
              <AgentActivityIndicator activities={activities} />
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Starting agent...</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
              </span>
              <span>AI is working...</span>
            </div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default MessageList;
