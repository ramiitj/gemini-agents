import { useState } from "react";
import { Users, ExternalLink, FileCode, Loader2 } from "lucide-react";
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
}

const ChangeShareDialog = ({
  open,
  onOpenChange,
  changes,
  previewUrl,
  onShare
}: ChangeShareDialogProps) => {
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);

  const defaultMessage = `I've made ${changes.length} change${changes.length !== 1 ? 's' : ''} that need review:\n\n${changes.map(c => `• ${c.file_path}`).join('\n')}`;

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
              placeholder={defaultMessage}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave blank to use the default message above
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
