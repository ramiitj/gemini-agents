import { MessageSquare, Rocket, Check, UserPlus, GitBranch, Code } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActivity, ActivityItem } from "@/hooks/useActivity";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  organizationId: string | null;
  projectId?: string | null;
  maxItems?: number;
}

const actionIcons: Record<string, React.ReactNode> = {
  message_sent: <MessageSquare className="h-3 w-3" />,
  deployment_triggered: <Rocket className="h-3 w-3" />,
  deployment_approved: <Check className="h-3 w-3" />,
  member_joined: <UserPlus className="h-3 w-3" />,
  project_created: <GitBranch className="h-3 w-3" />,
  code_changed: <Code className="h-3 w-3" />,
};

const actionColors: Record<string, string> = {
  message_sent: "bg-blue-500/10 text-blue-600",
  deployment_triggered: "bg-amber-500/10 text-amber-600",
  deployment_approved: "bg-green-500/10 text-green-600",
  member_joined: "bg-purple-500/10 text-purple-600",
  project_created: "bg-cyan-500/10 text-cyan-600",
  code_changed: "bg-orange-500/10 text-orange-600",
};

const formatAction = (activity: ActivityItem): string => {
  const metadata = activity.metadata || {};
  
  switch (activity.action) {
    case "message_sent":
      return "sent a message";
    case "deployment_triggered":
      return `triggered a deployment${metadata.environment ? ` to ${metadata.environment}` : ""}`;
    case "deployment_approved":
      return "approved a deployment";
    case "member_joined":
      return "joined the team";
    case "project_created":
      return `created project "${metadata.project_name || "Unknown"}"`;
    case "code_changed":
      return `modified ${metadata.file_count || "some"} files`;
    default:
      return activity.action.replace(/_/g, " ");
  }
};

const ActivityFeed = ({ organizationId, projectId, maxItems = 20 }: ActivityFeedProps) => {
  const { activities, loading } = useActivity(organizationId, projectId);
  const displayActivities = activities.slice(0, maxItems);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-2 w-1/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {displayActivities.map((activity, index) => (
          <div
            key={activity.id}
            className="flex gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors"
          >
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  actionColors[activity.action] || "bg-muted text-muted-foreground"
                }`}
              >
                {actionIcons[activity.action] || <MessageSquare className="h-3 w-3" />}
              </div>
              {index < displayActivities.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={activity.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {activity.profile?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">
                  <span className="font-medium">
                    {activity.profile?.full_name || "Unknown"}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {formatAction(activity)}
                  </span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ActivityFeed;
