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
      {/* Attachments Preview */}
      <AttachmentsPreview
        attachments={attachments}
        onRemove={handleRemoveAttachment}
      />
      
      {/* Input Area - clean stacked layout */}
      <div className="p-3 bg-muted/30 space-y-3">
        {/* Mode selection - centered, full width */}
        {onModeChange && (
          <div className="flex justify-center">
            <ModeToggle
              mode={mode}
              onModeChange={onModeChange}
              disabled={disabled}
            />
          </div>
        )}

        {/* Design mode hint */}
        {mode === 'design' && (
          <p className="text-xs text-muted-foreground text-center">
            Use the Design Studio above to import designs
          </p>
        )}
        
        {/* Input row - streamlined */}
        <div className="flex gap-2 items-end">
          <div className="flex gap-1 items-center shrink-0">
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
          
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              attachments.length > 0
                ? "Describe what you want to do with these attachments..."
                : mode === "design"
                ? "Describe the UI you want to design..."
                : mode === "image_search"
                ? "Search for images, icons, or visual inspiration..."
                : mode === "web_search"
                ? "Search the web for documentation, articles, or information..."
                : mode === "chat"
                ? "Ask questions or discuss your plans..."
                : "Describe what you want to build..."
            }
            className="min-h-[52px] resize-none text-sm flex-1"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="shrink-0 h-9 w-9"
            disabled={!value.trim() || disabled || sessionLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;
