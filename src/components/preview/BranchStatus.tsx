import { GitBranch, ExternalLink, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
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
      case "QUEUED":
        return <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />;
      case "ERROR":
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
      case "ERROR":
        return "destructive";
      default:
        return "secondary";
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

      {(deployment || loading) && (
        <Badge variant={getStatusVariant()} className="gap-1 text-[10px] px-1.5 py-0">
          {getStatusIcon()}
          {loading ? "Loading..." : deployment?.state || "No deployment"}
        </Badge>
      )}

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
