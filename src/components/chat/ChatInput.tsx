import { useState } from "react";
import { Send, ExternalLink, Download, Grid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ModeToggle from "./ModeToggle";
import ChatScreenshotButton from "./ChatScreenshotButton";
import ChatFileUpload from "./ChatFileUpload";
import AttachmentsPreview from "./AttachmentsPreview";
import StitchImportModal from "./StitchImportModal";
import DesignGalleryModal from "./DesignGalleryModal";
import type { FileAttachment, AgentMode, DesignOutput } from "@/types/search";

interface ChatInputProps {
  onSend: (content: string, attachments?: FileAttachment[]) => void;
  previewUrl?: string | null;
  disabled?: boolean;
  sessionLoading?: boolean;
  mode?: AgentMode;
  onModeChange?: (mode: AgentMode) => void;
  onStitchImport?: (design: DesignOutput, saveToGallery?: boolean, name?: string) => void;
  onGallerySelect?: (design: DesignOutput) => void;
  organizationId?: string;
}

const ChatInput = ({ 
  onSend, 
  previewUrl,
  disabled, 
  sessionLoading, 
  mode = "execution", 
  onModeChange,
  onStitchImport,
  onGallerySelect,
  organizationId
}: ChatInputProps) => {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);

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

  const handleStitchImport = (design: DesignOutput, saveToGallery?: boolean, name?: string) => {
    onStitchImport?.(design, saveToGallery, name);
  };

  const handleGallerySelect = (design: DesignOutput) => {
    onGallerySelect?.(design);
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

        {/* Stitch action buttons - shown in design mode */}
        {mode === 'design' && (
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={() => window.open('https://stitch.withgoogle.com/', '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Stitch
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={() => setImportModalOpen(true)}
            >
              <Download className="h-3.5 w-3.5" />
              Import from Stitch
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={() => setGalleryModalOpen(true)}
            >
              <Grid className="h-3.5 w-3.5" />
              Gallery
            </Button>
          </div>
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
                ? "Describe the UI you want to design (e.g., 'a mobile app dashboard for fitness tracking')..."
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

      {/* Stitch Import Modal */}
      <StitchImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleStitchImport}
      />

      {/* Design Gallery Modal */}
      <DesignGalleryModal
        open={galleryModalOpen}
        onOpenChange={setGalleryModalOpen}
        onSelect={handleGallerySelect}
        organizationId={organizationId}
      />
    </form>
  );
};

export default ChatInput;
