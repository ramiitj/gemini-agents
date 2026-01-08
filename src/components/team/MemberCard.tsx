import { MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TeamMember } from "@/hooks/useTeam";

interface MemberCardProps {
  member: TeamMember;
  canManage?: boolean;
}

const roleColors: Record<string, string> = {
  owner: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  editor: "bg-green-500/10 text-green-600 border-green-500/20",
  viewer: "bg-muted text-muted-foreground border-border",
};

const MemberCard = ({ member, canManage }: MemberCardProps) => {
  const initials = member.profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || member.profile?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="group flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors">
      <Avatar className="h-8 w-8">
        <AvatarImage src={member.profile?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {member.profile?.full_name || member.profile?.email || "Unknown"}
        </p>
        <Badge 
          variant="outline" 
          className={`text-[10px] px-1.5 py-0 ${roleColors[member.role]}`}
        >
          {member.role}
        </Badge>
      </div>

      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Change to Admin</DropdownMenuItem>
            <DropdownMenuItem>Change to Editor</DropdownMenuItem>
            <DropdownMenuItem>Change to Viewer</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Remove from team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default MemberCard;
