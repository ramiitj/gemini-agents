import { useRef, useEffect } from "react";
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
            {activities.length > 0 && (
              <AgentActivityIndicator activities={activities} />
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground delay-75" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground delay-150" />
              </span>
              <span>AI is thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default MessageList;
