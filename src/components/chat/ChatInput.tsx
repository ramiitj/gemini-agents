import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ModeToggle from "./ModeToggle";
import ChatScreenshotButton from "./ChatScreenshotButton";
import ChatFileUpload from "./ChatFileUpload";
import AttachmentsPreview from "./AttachmentsPreview";
import type { FileAttachment, AgentMode } from "@/types/search";

interface ChatInputProps {
  onSend: (content: string, attachments?: FileAttachment[]) => void;
  previewUrl?: string | null;
  disabled?: boolean;
  sessionLoading?: boolean;
  mode?: AgentMode;
  onModeChange?: (mode: AgentMode) => void;
}

const ChatInput = ({ 
  onSend, 
  previewUrl,
  disabled, 
  sessionLoading, 
  mode = "execution", 
  onModeChange
}: ChatInputProps) => {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim(), attachments.length > 0 ? attachments : undefined);
    setValue("");
    setAttachments([]);
  };

  const handleScreenshotCapture = (imageData: string, url: string) => {
    setAttachments(prev => [...prev, {
      type: 'screenshot',
      name: `Screenshot - ${new Date().toLocaleTimeString()}`,
      url,
      preview: imageData
    }]);
  };

  const handleFilesSelected = (files: FileAttachment[]) => {
    // Directly add files - they already have correct type structure
    setAttachments(prev => [...prev, ...files]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border">
      {/* Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-1">
          <ChatScreenshotButton
            previewUrl={previewUrl || null}
            onCapture={handleScreenshotCapture}
            disabled={disabled}
          />
          <ChatFileUpload
            onFilesSelected={handleFilesSelected}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-2">
          {onModeChange && (
            <ModeToggle
              mode={mode}
              onModeChange={onModeChange}
              disabled={disabled}
            />
          )}
          <span className="text-xs text-muted-foreground">
            {mode === "web_search" ? "Searching" : mode === "chat" ? "Planning" : "Executing"}
          </span>
        </div>
      </div>

      {/* Attachments Preview */}
      <AttachmentsPreview
        attachments={attachments}
        onRemove={handleRemoveAttachment}
      />
      
      {/* Input Area */}
      <div className="flex gap-2 p-4">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            attachments.length > 0
              ? "Describe what you want to do with these attachments..."
              : mode === "web_search"
              ? "Search the web for images, articles, or information..."
              : mode === "chat"
              ? "Ask questions or discuss your plans..."
              : "Describe what you want to build..."
          }
          className="min-h-[60px] resize-none text-sm flex-1"
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
