import { Copy, GitBranch, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProjectMembers, ProjectMember } from "@/hooks/useProjectMembers";
import { useToast } from "@/hooks/use-toast";

interface ProjectCollaboratorsProps {
  projectId: string | undefined;
  canManage?: boolean;
}

const roleColors: Record<string, string> = {
  owner: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  editor: "bg-green-500/10 text-green-600 border-green-500/20",
  viewer: "bg-muted text-muted-foreground border-border",
};

const CollaboratorCard = ({
  member,
  canManage,
  onRemove,
}: {
  member: ProjectMember;
  canManage?: boolean;
  onRemove: (id: string) => void;
}) => {
  const { toast } = useToast();

  const initials =
    member.profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    member.profile?.email?.[0]?.toUpperCase() ||
    "?";

  const copyBranchName = () => {
    if (member.branch_name) {
      navigator.clipboard.writeText(member.branch_name);
      toast({
        title: "Branch copied",
        description: `"${member.branch_name}" copied to clipboard`,
      });
    }
  };

  return (
    <div className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={member.profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {member.profile?.full_name || member.profile?.email || "Unknown"}
          </p>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${roleColors[member.role] || roleColors.viewer}`}
            >
              {member.role}
            </Badge>
            {member.profile?.username && (
              <span className="text-[10px] text-muted-foreground truncate">
                @{member.profile.username}
              </span>
            )}
          </div>
        </div>

        {canManage && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemove(member.id)}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove from project</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {member.branch_name && (
        <div className="flex items-center gap-2 pl-12">
          <GitBranch className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <code className="text-[11px] font-mono text-muted-foreground truncate flex-1">
            {member.branch_name}
          </code>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={copyBranchName}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy branch name</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};

const ProjectCollaborators = ({
  projectId,
  canManage,
}: ProjectCollaboratorsProps) => {
  const { members, loading, removeMember } = useProjectMembers(projectId);
  const { toast } = useToast();

  const handleRemove = async (memberId: string) => {
    const success = await removeMember(memberId);
    if (success) {
      toast({
        title: "Member removed",
        description: "Collaborator has been removed from the project",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to remove collaborator",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-3 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-border p-3 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-12 rounded bg-muted" />
              </div>
            </div>
            <div className="flex items-center gap-2 pl-12">
              <div className="h-3 w-3 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <GitBranch className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No project collaborators</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Invite members to this specific project to see them here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-3 space-y-2">
        {members.map((member) => (
          <CollaboratorCard
            key={member.id}
            member={member}
            canManage={canManage}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default ProjectCollaborators;
