import { Search, FileCode, GitCommit, Rocket, ScrollText, Wrench, Camera, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { AgentActivity } from "@/hooks/useAgentActivity";
import { cn } from "@/lib/utils";

interface AgentActivityIndicatorProps {
  activities: AgentActivity[];
}

const activityConfig: Record<string, { icon: React.ElementType; label: string }> = {
  analyzing: { icon: Search, label: 'Analyzing dependencies...' },
  writing: { icon: FileCode, label: 'Writing code...' },
  pushing: { icon: GitCommit, label: 'Pushing to GitHub...' },
  deploying: { icon: Rocket, label: 'Deploying to Vercel...' },
  checking_logs: { icon: ScrollText, label: 'Reading build logs...' },
  fixing: { icon: Wrench, label: 'Auto-fixing error...' },
  screenshot: { icon: Camera, label: 'Taking screenshot...' },
  complete: { icon: CheckCircle2, label: 'Complete' }
};

const ActivityStep = ({ activity }: { activity: AgentActivity }) => {
  const config = activityConfig[activity.activity_type] || { icon: Loader2, label: activity.activity_type };
  const Icon = config.icon;
  
  const getStatusIcon = () => {
    if (activity.status === 'complete') {
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    }
    if (activity.status === 'error') {
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    }
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
  };

  const getLabel = () => {
    let label = config.label;
    
    if (activity.details?.file) {
      label = `Writing ${activity.details.file}...`;
    }
    if (activity.activity_type === 'deploying' && activity.details?.attempt) {
      label = `Deploying to Vercel... (attempt ${activity.details.attempt}/${activity.details.maxAttempts || 5})`;
    }
    if (activity.activity_type === 'fixing' && activity.details?.error) {
      label = `Auto-fixing: ${activity.details.error}`;
    }
    if (activity.details?.message) {
      label = activity.details.message;
    }
    
    return label;
  };

  return (
    <div className={cn(
      "flex items-center gap-2 text-xs",
      activity.status === 'complete' && "text-muted-foreground",
      activity.status === 'error' && "text-destructive",
      activity.status === 'in_progress' && "text-foreground"
    )}>
      <Icon className={cn(
        "h-3.5 w-3.5",
        activity.status === 'in_progress' && "text-primary"
      )} />
      <span className="flex-1 truncate">{getLabel()}</span>
      {getStatusIcon()}
    </div>
  );
};

const AgentActivityIndicator = ({ activities }: AgentActivityIndicatorProps) => {
  // Only show recent activities (last 10)
  const recentActivities = activities.slice(-10);
  
  if (recentActivities.length === 0) {
    return null;
  }

  return (
    <div className="border border-border rounded-lg p-3 bg-muted/30 space-y-1.5 text-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
        <Rocket className="h-3.5 w-3.5" />
        <span>Agent Activity</span>
      </div>
      {recentActivities.map((activity) => (
        <ActivityStep key={activity.id} activity={activity} />
      ))}
    </div>
  );
};

export default AgentActivityIndicator;
