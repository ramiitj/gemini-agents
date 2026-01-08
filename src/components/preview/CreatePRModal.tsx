import { useState } from "react";
import { GitPullRequest, Loader2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatePRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  githubOwner: string;
  githubRepo: string;
  headBranch: string;
  baseBranch?: string;
  onPRCreated?: (prUrl: string) => void;
}

const CreatePRModal = ({
  open,
  onOpenChange,
  githubOwner,
  githubRepo,
  headBranch,
  baseBranch = "main",
  onPRCreated,
}: CreatePRModalProps) => {
  const [title, setTitle] = useState(`Merge ${headBranch} into ${baseBranch}`);
  const [body, setBody] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdPR, setCreatedPR] = useState<{ url: string; number: number } | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a PR title");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("github-create-pr", {
        body: {
          owner: githubOwner,
          repo: githubRepo,
          head: headBranch,
          base: baseBranch,
          title: title.trim(),
          body: body.trim(),
        },
      });

      if (error) throw error;

      if (data?.success) {
        setCreatedPR({ url: data.prUrl, number: data.prNumber });
        toast.success(`Pull request #${data.prNumber} created!`);
        onPRCreated?.(data.prUrl);
      } else {
        throw new Error(data?.error || "Failed to create PR");
      }
    } catch (e: any) {
      console.error("Failed to create PR:", e);
      toast.error(e.message || "Failed to create pull request");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setCreatedPR(null);
    setTitle(`Merge ${headBranch} into ${baseBranch}`);
    setBody("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5" />
            Create Pull Request
          </DialogTitle>
          <DialogDescription>
            Merge changes from <code className="text-xs bg-muted px-1 py-0.5 rounded">{headBranch}</code> into{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{baseBranch}</code>
          </DialogDescription>
        </DialogHeader>

        {createdPR ? (
          <div className="py-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <GitPullRequest className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-sm font-medium mb-2">Pull Request #{createdPR.number} Created!</p>
            <a
              href={createdPR.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              View on GitHub
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pr-title">Title</Label>
              <Input
                id="pr-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="PR title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-body">Description (optional)</Label>
              <Textarea
                id="pr-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe the changes..."
                rows={4}
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Repository</p>
              <p>{githubOwner}/{githubRepo}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {createdPR ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="mr-2 h-4 w-4" />
                    Create PR
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePRModal;
