import { useState } from "react";
import { Users, Plus, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTeam, TeamMember } from "@/hooks/useTeam";
import InviteMemberModal from "./InviteMemberModal";
import MemberCard from "./MemberCard";

interface TeamSidebarProps {
  organizationId: string | null;
}

const TeamSidebar = ({ organizationId }: TeamSidebarProps) => {
  const { members, loading, currentUserRole } = useTeam(organizationId);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const canManageTeam = currentUserRole === "owner" || currentUserRole === "admin";

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center border-l border-border bg-muted/30 py-4 px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Users className="h-4 w-4 text-muted-foreground mb-2" />
        <span className="text-xs text-muted-foreground">{members.length}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-64 flex-col border-l border-border bg-muted/30">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Team</span>
            <Badge variant="secondary" className="text-xs">
              {members.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-2 w-12 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  canManage={canManageTeam && member.role !== "owner"}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {canManageTeam && (
          <div className="border-t border-border p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => setShowInviteModal(true)}
            >
              <Plus className="h-4 w-4" />
              Invite member
            </Button>
          </div>
        )}
      </div>

      <InviteMemberModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        organizationId={organizationId}
      />
    </>
  );
};

export default TeamSidebar;
