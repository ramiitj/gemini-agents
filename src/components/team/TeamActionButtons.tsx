import { useState } from "react";
import { Check, X, GitMerge, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Permissions } from "@/hooks/useCustomRoles";
import { TeamAction } from "@/hooks/useTeamActions";

interface TeamActionButtonsProps {
  action: TeamAction;
  currentUserId: string | undefined;
  permissions: Permissions;
  onApprove: (comment?: string) => Promise<void>;
  onReject: (comment: string) => Promise<void>;
  onMerge: () => Promise<void>;
}

const TeamActionButtons = ({
  action,
  currentUserId,
  permissions,
  onApprove,
  onReject,
  onMerge
}: TeamActionButtonsProps) => {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  // Check permissions - use extended team permissions
  const canApprove = permissions.team?.approve || 
                     permissions.team?.manage || 
                     false;
  
  const canMerge = permissions.team?.merge || 
                   permissions.deployments?.trigger || 
                   permissions.deployments?.manage ||
                   false;
  
  const isOriginalAuthor = action.initiated_by === currentUserId;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setLoading(true);
    try {
      await onReject(rejectReason);
      setShowRejectInput(false);
      setRejectReason("");
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    setLoading(true);
    try {
      await onMerge();
    } finally {
      setLoading(false);
    }
  };

  // Pending approval - show approve/reject buttons for users with permission
  if (action.action_type === 'approval_request' && canApprove && !isOriginalAuthor) {
    return (
      <div className="mt-3 space-y-2">
        {showRejectInput ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectReason("");
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <X className="h-3 w-3 mr-1" />
                )}
                Confirm Reject
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRejectInput(true)}
              disabled={loading}
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
            >
              <X className="h-3 w-3 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Approve
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Approved - show merge button only to original author with permissions
  if (action.action_type === 'approved' && isOriginalAuthor && canMerge) {
    return (
      <div className="mt-3">
        <Button
          size="sm"
          onClick={handleMerge}
          disabled={loading}
          className="bg-primary hover:bg-primary/90"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <GitMerge className="h-3 w-3 mr-1" />
          )}
          Merge to Main
        </Button>
      </div>
    );
  }

  // Show status badges for resolved actions
  if (action.action_type === 'merged') {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge className="bg-green-600 text-white">Merged</Badge>
        {action.production_url && (
          <a
            href={action.production_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Live URL
          </a>
        )}
        {action.pr_url && (
          <a
            href={action.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
          >
            View PR
          </a>
        )}
      </div>
    );
  }

  if (action.action_type === 'rejected') {
    return (
      <div className="mt-3 space-y-1">
        <Badge variant="destructive">Rejected</Badge>
        {action.action_comment && (
          <p className="text-xs text-muted-foreground">
            Reason: {action.action_comment}
          </p>
        )}
      </div>
    );
  }

  if (action.action_type === 'approved' && !isOriginalAuthor) {
    return (
      <div className="mt-3">
        <Badge className="bg-green-600/20 text-green-600 border-green-600/30">
          Approved - Waiting for merge
        </Badge>
      </div>
    );
  }

  return null;
};

export default TeamActionButtons;
