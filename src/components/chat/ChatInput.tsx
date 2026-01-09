import { useState } from "react";
import { Send, Camera, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ModeToggle from "./ModeToggle";

interface ChatInputProps {
  onSend: (content: string, screenshotContext?: { url: string; imageData?: string }) => void;
  disabled?: boolean;
  sessionLoading?: boolean;
  mode?: "chat" | "execution";
  onModeChange?: (mode: "chat" | "execution") => void;
  pendingScreenshot?: { url: string; imageData?: string } | null;
  onClearScreenshot?: () => void;
}

const ChatInput = ({ 
  onSend, 
  disabled, 
  sessionLoading, 
  mode = "execution", 
  onModeChange,
  pendingScreenshot,
  onClearScreenshot
}: ChatInputProps) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim(), pendingScreenshot || undefined);
    setValue("");
    if (onClearScreenshot) onClearScreenshot();
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
      
      {/* Screenshot attachment indicator */}
      {pendingScreenshot && (
        <div className="mb-3 flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Camera className="h-3.5 w-3.5 text-primary" />
            <span>Screenshot attached from</span>
            <span className="font-mono text-[10px] truncate max-w-[200px]">
              {pendingScreenshot.url.replace('https://', '')}
            </span>
          </div>
          {onClearScreenshot && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 ml-auto"
              onClick={onClearScreenshot}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      
      <div className="flex gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            pendingScreenshot
              ? "Describe what you want to change in this screenshot..."
              : mode === "chat"
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
