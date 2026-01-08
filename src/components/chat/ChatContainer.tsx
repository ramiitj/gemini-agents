import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import { useConversation } from "@/hooks/useConversation";
import { Skeleton } from "@/components/ui/skeleton";

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

interface ChatContainerProps {
  projectId: string;
  githubRepo?: string | null;
}

const ChatContainer = ({ projectId, githubRepo }: ChatContainerProps) => {
  const { messages, isLoading, isSending, sendMessage } = useConversation(projectId);

  const handleSend = (content: string) => {
    sendMessage(content, githubRepo || undefined);
  };

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
      <ChatInput onSend={handleSend} disabled={isSending} />
    </div>
  );
};

export default ChatContainer;
