import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Reply, Quote, Send, FileCode, ExternalLink, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTeamComments, TeamComment } from "@/hooks/useTeamComments";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useTeamActions, parseChangeShare, TeamAction } from "@/hooks/useTeamActions";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Permissions, DEFAULT_PERMISSIONS } from "@/hooks/useCustomRoles";
import TeamFileUpload, { TeamAttachment, AttachmentPreview, AttachmentDisplay } from "./TeamFileUpload";
import TeamActionButtons from "./TeamActionButtons";
import TypingIndicator from "./TypingIndicator";
import { formatDistanceToNow } from "date-fns";

// Render text with clickable URLs
const renderContentWithLinks = (content: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      // Clean up trailing punctuation
      const cleanUrl = part.replace(/[.,;:!?)]+$/, '');
      const trailing = part.slice(cleanUrl.length);
      return (
        <span key={index}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            {cleanUrl.replace('https://', '').slice(0, 40)}
            {cleanUrl.length > 40 && '...'}
            <ExternalLink className="h-3 w-3 inline-block" />
          </a>
          {trailing}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

interface TeamChatProps {
  projectId?: string;
  changeRequestId?: string;
  title?: string;
}

const TeamChat = ({ projectId, changeRequestId, title }: TeamChatProps) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { permissions } = usePermissions(organization?.id || null);
  
  const { comments, loading, addComment } = useTeamComments({ 
    changeRequestId, 
    projectId 
  });
  const { typingUsers, setTyping } = useTypingIndicator(projectId || null);
  const { markAsRead } = useUnreadMessages(projectId || null);
  const { 
    getActionForComment, 
    createApprovalRequest, 
    approve, 
    reject, 
    merge 
  } = useTeamActions(projectId || null);
  
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<TeamComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<TeamAttachment[]>([]);
  const [processedCommentIds, setProcessedCommentIds] = useState<Set<string>>(new Set());

  // Mark as read when viewing comments
  useEffect(() => {
    if (projectId && comments.length > 0) {
      markAsRead();
    }
  }, [projectId, comments.length, markAsRead]);

  // Auto-detect and create approval requests for shared changes
  useEffect(() => {
    comments.forEach(comment => {
      // Skip if already processed
      if (processedCommentIds.has(comment.id)) return;
      
      // Check if this comment contains a change share
      const changeData = parseChangeShare(comment.content);
      if (changeData && (changeData.previewUrl || changeData.files.length > 0)) {
        // Check if there's already an action for this comment
        const existingAction = getActionForComment(comment.id);
        if (!existingAction && comment.user_id === user?.id) {
          // Create approval request automatically
          createApprovalRequest(comment.id, changeData);
          setProcessedCommentIds(prev => new Set(prev).add(comment.id));
        }
      }
    });
  }, [comments, user?.id, processedCommentIds, getActionForComment, createApprovalRequest]);

  const handleApprove = useCallback(async (actionId: string, comment?: string) => {
    await approve(actionId, comment);
  }, [approve]);

  const handleReject = useCallback(async (actionId: string, comment: string) => {
    await reject(actionId, comment);
  }, [reject]);

  const handleMerge = useCallback(async (actionId: string) => {
    await merge(actionId);
  }, [merge]);

  const handleSubmit = async () => {
    if ((!newComment.trim() && pendingAttachments.length === 0) || submitting) return;

    setSubmitting(true);
    await addComment(newComment, {
      parentId: replyingTo?.id,
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined
    });
    setNewComment("");
    setReplyingTo(null);
    setPendingAttachments([]);
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const handleTextChange = (value: string) => {
    setNewComment(value);
    if (value.length > 0) {
      setTyping(true);
    }
  };

  const handleFileUpload = (attachment: TeamAttachment) => {
    setPendingAttachments(prev => [...prev, attachment]);
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (!changeRequestId && !projectId) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 text-muted-foreground p-6">
        <MessageSquare className="h-8 w-8 mb-2" />
        <p className="text-sm text-center">No active discussion</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {title && (
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium truncate">{title}</h3>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0 p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-12 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No messages yet</h3>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Start a discussion with your team about this project.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={setReplyingTo}
                action={getActionForComment(comment.id)}
                permissions={permissions || DEFAULT_PERMISSIONS}
                currentUserId={user?.id}
                onApprove={handleApprove}
                onReject={handleReject}
                onMerge={handleMerge}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="border-t border-border px-4 py-2 bg-muted/30 flex items-center gap-2">
          <Reply className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground flex-1 truncate">
            Replying to {replyingTo.profile?.full_name || "User"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setReplyingTo(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Pending attachments */}
      {pendingAttachments.length > 0 && (
        <div className="border-t border-border px-4 py-2 flex flex-wrap gap-2">
          {pendingAttachments.map((att, idx) => (
            <AttachmentPreview 
              key={idx} 
              attachment={att} 
              onRemove={() => removePendingAttachment(idx)} 
            />
          ))}
        </div>
      )}

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Input area - unified footer with bg-muted/30 */}
      <div className="border-t border-border p-3 bg-muted/30">
        <div className="flex gap-2 items-end">
          <TeamFileUpload onUpload={handleFileUpload} />
          <Textarea
            value={newComment}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Cmd+Enter to send)"
            className="min-h-[60px] resize-none text-sm flex-1"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={(!newComment.trim() && pendingAttachments.length === 0) || submitting}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: TeamComment;
  onReply: (comment: TeamComment) => void;
  isReply?: boolean;
  action: TeamAction | null;
  permissions: Permissions;
  currentUserId: string | undefined;
  onApprove: (actionId: string, comment?: string) => Promise<void>;
  onReject: (actionId: string, comment: string) => Promise<void>;
  onMerge: (actionId: string) => Promise<void>;
}

const CommentItem = ({ 
  comment, 
  onReply, 
  isReply = false,
  action,
  permissions,
  currentUserId,
  onApprove,
  onReject,
  onMerge
}: CommentItemProps) => {
  const initials = comment.profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  // Check if this is a change share notification
  const changeData = parseChangeShare(comment.content);
  const isChangeShare = changeData && (changeData.previewUrl || changeData.files.length > 0);

  return (
    <div className={`flex gap-3 ${isReply ? "ml-8" : ""}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.profile?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {comment.profile?.full_name || "User"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {isChangeShare && (
            <Badge variant="secondary" className="text-xs">
              Changes Shared
            </Badge>
          )}
        </div>

        {/* Quoted text */}
        {comment.quoted_text && (
          <div className="mt-1 pl-3 border-l-2 border-muted text-xs text-muted-foreground italic">
            <Quote className="h-3 w-3 inline mr-1" />
            {comment.quoted_text}
          </div>
        )}

        {/* File reference */}
        {comment.file_path && (
          <div className="mt-1 flex items-center gap-1 text-xs text-primary">
            <FileCode className="h-3 w-3" />
            <span className="font-mono">
              {comment.file_path}
              {comment.line_number && `:${comment.line_number}`}
            </span>
          </div>
        )}

        <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
          {renderContentWithLinks(comment.content)}
        </p>

        {/* Change share card with parsed data */}
        {isChangeShare && changeData && (
          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
            {changeData.branchName && (
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {changeData.branchName}
                </code>
              </div>
            )}
            
            {changeData.previewUrl && (
              <a
                href={changeData.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View Preview
              </a>
            )}

            {/* Action buttons based on permissions */}
            {action && (
              <TeamActionButtons
                action={action}
                currentUserId={currentUserId}
                permissions={permissions}
                onApprove={(c) => onApprove(action.id, c)}
                onReject={(c) => onReject(action.id, c)}
                onMerge={() => onMerge(action.id)}
              />
            )}
          </div>
        )}

        {/* Attachments */}
        {comment.attachments && comment.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.attachments.map((att, idx) => (
              <AttachmentDisplay key={idx} attachment={att} />
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 mt-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onReply(comment)}
        >
          <Reply className="h-3 w-3 mr-1" />
          Reply
        </Button>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                isReply
                action={null}
                permissions={permissions}
                currentUserId={currentUserId}
                onApprove={onApprove}
                onReject={onReject}
                onMerge={onMerge}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamChat;
