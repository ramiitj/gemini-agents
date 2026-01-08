import { useState } from "react";
import { Check, X, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useApprovals } from "@/hooks/useApprovals";
import { formatDistanceToNow } from "date-fns";

interface ApprovalPanelProps {
  deploymentId: string | null;
}

const ApprovalPanel = ({ deploymentId }: ApprovalPanelProps) => {
  const { approvals, loading, userApproval, submitApproval, approvalSummary } = useApprovals(deploymentId);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleApproval = async (decision: "approved" | "rejected") => {
    setSubmitting(true);
    await submitApproval(decision, comment);
    setComment("");
    setShowComment(false);
    setSubmitting(false);
  };

  if (!deploymentId) return null;

  return (
    <div className="border-t border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Approval Required</span>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            {approvalSummary.approved} approved
          </Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            {approvalSummary.rejected} rejected
          </Badge>
        </div>
      </div>

      {/* Approval list */}
      {approvals.length > 0 && (
        <div className="space-y-2 mb-4">
          {approvals.map((approval) => (
            <div key={approval.id} className="flex items-center gap-3 text-sm">
              <Avatar className="h-6 w-6">
                <AvatarImage src={approval.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {approval.profile?.full_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">
                {approval.profile?.full_name || "Unknown"}
              </span>
              {approval.decision === "approved" && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Check className="h-3 w-3 mr-1" />
                  Approved
                </Badge>
              )}
              {approval.decision === "rejected" && (
                <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                  <X className="h-3 w-3 mr-1" />
                  Rejected
                </Badge>
              )}
              {approval.decision === "pending" && (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {showComment && (
        <Textarea
          placeholder="Add a comment (optional)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mb-3 resize-none"
          rows={2}
        />
      )}

      {/* Action buttons */}
      {!userApproval || userApproval.decision === "pending" ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComment(!showComment)}
            className="gap-1"
          >
            <MessageSquare className="h-3 w-3" />
            Comment
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApproval("rejected")}
            disabled={submitting}
            className="gap-1 text-red-600 hover:text-red-600 hover:bg-red-50"
          >
            <X className="h-3 w-3" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => handleApproval("approved")}
            disabled={submitting}
            className="gap-1"
          >
            <Check className="h-3 w-3" />
            Approve
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          You have already {userApproval.decision} this deployment.
        </p>
      )}
    </div>
  );
};

export default ApprovalPanel;
