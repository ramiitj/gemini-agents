import { useState } from "react";
import { Users, ExternalLink, FileCode, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface CodeChange {
  id: string;
  file_path: string;
  status: string;
  additions?: number;
  deletions?: number;
}

interface ChangeShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: CodeChange[];
  previewUrl: string | null;
  onShare: (message: string) => Promise<void>;
  changeSummary?: string;
}

// Generate a natural language summary from file changes
const generateChangeSummary = (changes: CodeChange[]): string => {
  if (changes.length === 0) return "";
  
  const fileTypes: Record<string, string[]> = {};
  
  changes.forEach(change => {
    const ext = change.file_path.split('.').pop() || 'file';
    const name = change.file_path.split('/').pop() || change.file_path;
    
    if (name.includes('component') || change.file_path.includes('/components/')) {
      if (!fileTypes['component']) fileTypes['component'] = [];
      fileTypes['component'].push(name);
    } else if (name.includes('hook') || change.file_path.includes('/hooks/')) {
      if (!fileTypes['hook']) fileTypes['hook'] = [];
      fileTypes['hook'].push(name);
    } else if (ext === 'css' || change.file_path.includes('styles')) {
      if (!fileTypes['style']) fileTypes['style'] = [];
      fileTypes['style'].push(name);
    } else if (change.file_path.includes('/pages/')) {
      if (!fileTypes['page']) fileTypes['page'] = [];
      fileTypes['page'].push(name);
    } else {
      if (!fileTypes['other']) fileTypes['other'] = [];
      fileTypes['other'].push(name);
    }
  });
  
  const parts: string[] = [];
  
  if (fileTypes['component']?.length) {
    parts.push(`Updated ${fileTypes['component'].length} component${fileTypes['component'].length > 1 ? 's' : ''}`);
  }
  if (fileTypes['page']?.length) {
    parts.push(`Modified ${fileTypes['page'].length} page${fileTypes['page'].length > 1 ? 's' : ''}`);
  }
  if (fileTypes['hook']?.length) {
    parts.push(`Changed ${fileTypes['hook'].length} hook${fileTypes['hook'].length > 1 ? 's' : ''}`);
  }
  if (fileTypes['style']?.length) {
    parts.push(`Updated styles`);
  }
  if (fileTypes['other']?.length && parts.length === 0) {
    parts.push(`Modified ${fileTypes['other'].length} file${fileTypes['other'].length > 1 ? 's' : ''}`);
  }
  
  return parts.join('. ') + '.';
};

const ChangeShareDialog = ({
  open,
  onOpenChange,
  changes,
  previewUrl,
  onShare,
  changeSummary
}: ChangeShareDialogProps) => {
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);

  const autoSummary = changeSummary || generateChangeSummary(changes);
  const defaultMessage = `${autoSummary}\n\nFiles changed:\n${changes.map(c => `• ${c.file_path}`).join('\n')}`;

  const handleShare = async () => {
    setSharing(true);
    try {
      await onShare(message || defaultMessage);
      setMessage("");
      onOpenChange(false);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Changes with Team
          </DialogTitle>
          <DialogDescription>
            Notify your team about these changes and request feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Auto-generated summary */}
          {autoSummary && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Summary</span>
              </div>
              <p className="text-sm text-foreground">{autoSummary}</p>
            </div>
          )}

          {/* Changes summary */}
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {changes.length} file{changes.length !== 1 ? 's' : ''} modified
              </span>
            </div>
            <div className="space-y-1 max-h-32 overflow-auto">
              {changes.map(change => (
                <div key={change.id} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted-foreground truncate flex-1">
                    {change.file_path}
                  </span>
                  {(change.additions || change.deletions) && (
                    <div className="flex gap-1">
                      {change.additions ? (
                        <span className="text-green-600">+{change.additions}</span>
                      ) : null}
                      {change.deletions ? (
                        <span className="text-red-600">-{change.deletions}</span>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview link */}
          {previewUrl && (
            <div className="flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
              >
                {previewUrl.replace("https://", "")}
              </a>
              <Badge variant="secondary" className="text-xs">
                Preview included
              </Badge>
            </div>
          )}

          {/* Custom message */}
          <div>
            <Textarea
              placeholder="Add a note for your team (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The summary and file list will be included automatically
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={sharing}>
            {sharing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Share with Team
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeShareDialog;
