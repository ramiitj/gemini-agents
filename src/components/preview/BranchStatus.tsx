import { GitBranch, ExternalLink, Loader2, CheckCircle, XCircle, Clock, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BranchDeployment } from "@/hooks/useBranchDeployment";

interface BranchStatusProps {
  branch: string | null | undefined;
  deployment: BranchDeployment | null;
  loading?: boolean;
  githubOwner?: string | null;
  githubRepo?: string | null;
}

const BranchStatus = ({ branch, deployment, loading, githubOwner, githubRepo }: BranchStatusProps) => {
  if (!branch) return null;

  const getStatusIcon = () => {
    if (loading) return <Loader2 className="h-3 w-3 animate-spin" />;
    if (!deployment) return <Clock className="h-3 w-3" />;

    switch (deployment.state) {
      case "READY":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "BUILDING":
        return <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />;
      case "QUEUED":
        return <Rocket className="h-3 w-3 text-blue-500" />;
      case "WAITING":
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case "ERROR":
      case "CANCELED":
        return <XCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (!deployment) return "secondary";
    switch (deployment.state) {
      case "READY":
        return "default";
      case "BUILDING":
      case "QUEUED":
        return "outline";
      case "WAITING":
        return "secondary";
      case "ERROR":
      case "CANCELED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusText = () => {
    if (loading) return "Loading...";
    if (!deployment) return "No deployment";
    
    switch (deployment.state) {
      case "READY":
        return "Ready";
      case "BUILDING":
        return "Building...";
      case "QUEUED":
        return "Queued";
      case "WAITING":
        return "Waiting for build";
      case "ERROR":
        return "Failed";
      case "CANCELED":
        return "Canceled";
      default:
        return deployment.state;
    }
  };

  const githubUrl = githubOwner && githubRepo 
    ? `https://github.com/${githubOwner}/${githubRepo}/tree/${branch}`
    : null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <GitBranch className="h-3.5 w-3.5" />
        <span className="font-medium">{branch}</span>
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <Badge variant={getStatusVariant()} className="gap-1 text-[10px] px-1.5 py-0">
        {getStatusIcon()}
        {getStatusText()}
      </Badge>

      {deployment?.url && deployment.state === "READY" && (
        <a
          href={deployment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Preview
        </a>
      )}
    </div>
  );
};

export default BranchStatus;
