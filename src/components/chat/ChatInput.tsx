import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ModeToggle from "./ModeToggle";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  sessionLoading?: boolean;
  mode?: "chat" | "execution";
  onModeChange?: (mode: "chat" | "execution") => void;
}

const ChatInput = ({ onSend, disabled, sessionLoading, mode = "execution", onModeChange }: ChatInputProps) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        {onModeChange && (
          <ModeToggle
            mode={mode}
            onModeChange={onModeChange}
            disabled={disabled}
          />
        )}
        <span className="text-xs text-muted-foreground">
          {mode === "chat" ? "Planning and discussion" : "Making code changes"}
        </span>
      </div>
      <div className="flex gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "chat"
              ? "Ask questions or discuss your plans..."
              : "Describe what you want to build..."
          }
          className="min-h-[80px] resize-none"
        />
        <Button 
          type="submit" 
          size="icon" 
          className="shrink-0 self-end"
          disabled={!value.trim() || disabled || sessionLoading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default ChatInput;
