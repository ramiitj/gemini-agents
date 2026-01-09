import { useRef } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface FileAttachment {
  type: 'file';
  name: string;
  file: File;
  preview?: string;
  content?: string;
}

interface ChatFileUploadProps {
  onFilesSelected: (files: FileAttachment[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  'image/*',
  '.pdf', '.doc', '.docx',
  '.json', '.csv', '.xml',
  '.txt', '.md', '.js', '.ts', '.tsx', '.css', '.html'
].join(',');

const ChatFileUpload = ({ onFilesSelected, disabled }: ChatFileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList) => {
    const attachments: FileAttachment[] = [];
    
    for (const file of Array.from(files)) {
      const attachment: FileAttachment = {
        type: 'file',
        name: file.name,
        file
      };
      
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        attachment.preview = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }
      
      // Read text-based files
      if (file.type.startsWith('text/') || 
          ['.json', '.md', '.txt', '.js', '.ts', '.tsx', '.css', '.html', '.csv', '.xml']
            .some(ext => file.name.toLowerCase().endsWith(ext))) {
        attachment.content = await file.text();
      }
      
      attachments.push(attachment);
    }
    
    onFilesSelected(attachments);
    toast.success(`${attachments.length} file(s) attached`);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <Paperclip className="h-3.5 w-3.5" />
        Upload
      </Button>
    </>
  );
};

export default ChatFileUpload;
