import { useEffect } from "react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import { useConversation } from "@/hooks/useConversation";
import { Skeleton } from "@/components/ui/skeleton";
import type { ElementInfo } from "@/lib/visual-edit-injector";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  codeChanges?: {
    file: string;
    diff: string;
  }[];
  status?: "pending" | "complete" | "error";
}

export interface VisualContext {
  element: ElementInfo;
  request: string;
}

interface ChatContainerProps {
  projectId: string;
  githubRepo?: string | null;
  visualContext?: VisualContext | null;
  onVisualContextHandled?: () => void;
}

const ChatContainer = ({ projectId, githubRepo, visualContext, onVisualContextHandled }: ChatContainerProps) => {
  const { messages, isLoading, isSending, sendMessage } = useConversation(projectId);

  const handleSend = (content: string, context?: VisualContext) => {
    sendMessage(content, githubRepo || undefined, context?.element);
  };

  // Auto-send when visual context is provided
  useEffect(() => {
    if (visualContext && !isSending) {
      handleSend(visualContext.request, visualContext);
      onVisualContextHandled?.();
    }
  }, [visualContext]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col p-4 space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-12 w-1/2 ml-auto" />
        <Skeleton className="h-12 w-3/4" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} isTyping={isSending} />
      <ChatInput onSend={(content) => handleSend(content)} disabled={isSending} />
    </div>
  );
};

export default ChatContainer;
