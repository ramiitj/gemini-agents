import { useState, useRef } from "react";
import { Paperclip, X, FileText, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TeamAttachment {
  type: "image" | "document" | "file";
  name: string;
  url: string;
  size: number;
  mimeType: string;
  preview?: string;
}

interface TeamFileUploadProps {
  onUpload: (attachment: TeamAttachment) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "image/*",
  "application/pdf",
  ".doc,.docx",
  "application/json",
  "text/*",
  ".md,.csv,.xml,.html,.css,.js,.ts,.tsx"
].join(",");

const TeamFileUpload = ({ onUpload, disabled }: TeamFileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getFileType = (mimeType: string): TeamAttachment["type"] => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType === "application/pdf" || mimeType.includes("document")) return "document";
    return "file";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload files");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("team-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("team-attachments")
        .getPublicUrl(filePath);

      const attachment: TeamAttachment = {
        type: getFileType(file.type),
        name: file.name,
        url: publicUrl,
        size: file.size,
        mimeType: file.type
      };

      // Generate preview for images
      if (file.type.startsWith("image/")) {
        attachment.preview = URL.createObjectURL(file);
      }

      onUpload(attachment);
      toast.success("File uploaded");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
    </>
  );
};

export const AttachmentPreview = ({ 
  attachment, 
  onRemove 
}: { 
  attachment: TeamAttachment; 
  onRemove?: () => void;
}) => {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1.5">
      {attachment.type === "image" && attachment.preview ? (
        <img src={attachment.preview} alt="" className="h-6 w-6 rounded object-cover" />
      ) : attachment.type === "image" ? (
        <Image className="h-4 w-4 text-muted-foreground" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="text-xs truncate max-w-[120px]">{attachment.name}</span>
      {onRemove && (
        <button onClick={onRemove} className="text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export const AttachmentDisplay = ({ attachment }: { attachment: TeamAttachment }) => {
  const isImage = attachment.type === "image";

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block rounded-md border border-border overflow-hidden hover:border-primary/50 transition-colors"
    >
      {isImage ? (
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-48 w-auto object-contain bg-muted/30"
        />
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{attachment.name}</span>
          <span className="text-xs text-muted-foreground">
            ({(attachment.size / 1024).toFixed(1)} KB)
          </span>
        </div>
      )}
    </a>
  );
};

export default TeamFileUpload;
