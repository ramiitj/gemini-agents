import { useState } from "react";
import { MessageSquare, Reply, Quote, Send, FileCode, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTeamComments, TeamComment } from "@/hooks/useTeamComments";
import TeamFileUpload, { TeamAttachment, AttachmentPreview, AttachmentDisplay } from "./TeamFileUpload";
import { formatDistanceToNow } from "date-fns";

interface TeamChatProps {
  projectId?: string;
  changeRequestId?: string;
  title?: string;
}

const TeamChat = ({ projectId, changeRequestId, title }: TeamChatProps) => {
  const { comments, loading, addComment } = useTeamComments({ 
    changeRequestId, 
    projectId 
  });
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<TeamComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<TeamAttachment[]>([]);

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

  const handleFileUpload = (attachment: TeamAttachment) => {
    setPendingAttachments(prev => [...prev, attachment]);
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (!changeRequestId && !projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <MessageSquare className="h-8 w-8 mb-2" />
        <p className="text-sm text-center">No active discussion</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {title && (
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium truncate">{title}</h3>
        </div>
      )}

      <ScrollArea className="flex-1 p-4">
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
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">No messages yet. Start the discussion!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={setReplyingTo}
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

      {/* Input area */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2 items-end">
          <TeamFileUpload onUpload={handleFileUpload} />
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
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
}

const CommentItem = ({ comment, onReply, isReply = false }: CommentItemProps) => {
  const initials = comment.profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  // Check if this is a change share notification
  const isChangeShare = comment.content.includes("need review") && comment.content.includes("•");

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
          {comment.content}
        </p>

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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamChat;
