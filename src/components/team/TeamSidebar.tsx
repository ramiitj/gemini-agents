import { useState } from "react";
import { Users, Plus, ChevronRight, ChevronLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeam } from "@/hooks/useTeam";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import InviteMemberModal from "./InviteMemberModal";
import MemberCard from "./MemberCard";
import TeamChat from "./TeamChat";

interface TeamSidebarProps {
  organizationId: string | null;
  projectId?: string;
}

const TeamSidebar = ({ organizationId, projectId }: TeamSidebarProps) => {
  const { members, loading, currentUserRole } = useTeam(organizationId);
  const { unreadCount } = useUnreadMessages(projectId || null);
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
      <div className="flex w-[280px] flex-col border-l border-border bg-background">
        {/* Header - unified h-12 */}
        <div className="flex h-12 items-center justify-between border-b border-border px-4 bg-muted/30">
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

        <Tabs defaultValue="discussions" className="flex-1 flex flex-col">
          <TabsList className="mx-3 mt-2 grid grid-cols-2">
            <TabsTrigger value="discussions" className="text-xs gap-1 relative">
              <MessageSquare className="h-3 w-3" />
              Discussions
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="members" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discussions" className="flex-1 m-0 overflow-hidden">
            <TeamChat projectId={projectId} />
          </TabsContent>

          <TabsContent value="members" className="flex-1 m-0 overflow-hidden flex flex-col">
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
          </TabsContent>
        </Tabs>
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
