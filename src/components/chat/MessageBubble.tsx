import type { Message } from "./ChatContainer";
import CodeBlock from "./CodeBlock";

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  if (message.role === "system") {
    return (
      <div className="flex justify-center">
        <p className="text-xs text-muted-foreground">{message.content}</p>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {message.codeChanges && message.codeChanges.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.codeChanges.map((change, i) => (
              <CodeBlock
                key={i}
                filename={change.file}
                code={change.diff}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
