import { X, FileText, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Attachment {
  type: 'screenshot' | 'file';
  name: string;
  url?: string;
  preview?: string;
  content?: string;
}

interface AttachmentsPreviewProps {
  attachments: Attachment[];
  onRemove: (index: number) => void;
}

const AttachmentsPreview = ({ attachments, onRemove }: AttachmentsPreviewProps) => {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-3 border-b border-border bg-muted/30">
      {attachments.map((att, idx) => (
        <div key={idx} className="group relative flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
          {att.preview ? (
            <img src={att.preview} alt={att.name} className="h-8 w-8 rounded object-cover" />
          ) : att.type === 'screenshot' ? (
            <Camera className="h-4 w-4 text-primary" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="max-w-[120px] truncate text-xs">{att.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-60 hover:opacity-100"
            onClick={() => onRemove(idx)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default AttachmentsPreview;
