import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useTeam, TeamMember } from "@/hooks/useTeam";
import AppSidebar from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import InviteMemberModal from "@/components/team/InviteMemberModal";
import GitHubConnection from "@/components/settings/GitHubConnection";
import VercelConnection from "@/components/settings/VercelConnection";
import { UserPlus, Trash2, Settings2, Users, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: orgLoading } = useOrganization();
  const { members, loading: teamLoading, refetch: refetchTeam } = useTeam(organization?.id || null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }

  if (authLoading || orgLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-48" />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!organization) {
    navigate("/dashboard");
    return null;
  }

  const handleUpdateOrgName = async () => {
    if (!orgName.trim() || orgName === organization.name) return;

    setSavingName(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: orgName.trim() })
        .eq("id", organization.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workspace name updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update workspace name",
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      refetchTeam();
      toast({
        title: "Success",
        description: "Member role updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (member.user_id === user?.id) {
      toast({
        title: "Error",
        description: "You cannot remove yourself",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", member.id);

      if (error) throw error;

      refetchTeam();
      toast({
        title: "Success",
        description: "Member removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const currentUserRole = members.find((m) => m.user_id === user?.id)?.role;
  const canManageTeam = currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <main className="flex-1">
          <header className="flex h-14 items-center border-b border-border px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-sm font-medium text-foreground">Settings</h1>
            </div>
          </header>

          <div className="p-6">
            <Tabs defaultValue="organization" className="space-y-6">
              <TabsList>
                <TabsTrigger value="organization" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Organization
                </TabsTrigger>
                <TabsTrigger value="team" className="gap-2">
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
                <TabsTrigger value="integrations" className="gap-2">
                  <Link className="h-4 w-4" />
                  Integrations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="organization">
                <Card>
                  <CardHeader>
                    <CardTitle>Workspace Settings</CardTitle>
                    <CardDescription>
                      Manage your workspace configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">Workspace name</Label>
                      <div className="flex gap-2">
                        <Input
                          id="org-name"
                          defaultValue={organization.name}
                          onChange={(e) => setOrgName(e.target.value)}
                          className="max-w-sm"
                        />
                        <Button
                          onClick={handleUpdateOrgName}
                          disabled={savingName || !orgName.trim() || orgName === organization.name}
                        >
                          {savingName ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Workspace ID</Label>
                      <p className="text-sm text-muted-foreground font-mono">
                        {organization.slug}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="team">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>
                        Manage who has access to this workspace
                      </CardDescription>
                    </div>
                    {canManageTeam && (
                      <Button
                        onClick={() => setInviteModalOpen(true)}
                        size="sm"
                        className="gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        Invite
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {teamLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-14 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between rounded-lg border border-border p-3"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={member.profile?.avatar_url || ""} />
                                <AvatarFallback>
                                  {member.profile?.full_name?.[0] ||
                                    member.profile?.email?.[0] ||
                                    "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {member.profile?.full_name || "Unknown"}
                                  {member.user_id === user?.id && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (you)
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.profile?.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {canManageTeam && member.user_id !== user?.id ? (
                                <>
                                  <Select
                                    value={member.role}
                                    onValueChange={(value: AppRole) =>
                                      handleRoleChange(member.id, value)
                                    }
                                  >
                                    <SelectTrigger className="w-28">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="owner">Owner</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="editor">Editor</SelectItem>
                                      <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveMember(member)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              ) : (
                                <Badge variant="secondary">{member.role}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <InviteMemberModal
                  open={inviteModalOpen}
                  onOpenChange={setInviteModalOpen}
                  organizationId={organization.id}
                />
              </TabsContent>

              <TabsContent value="integrations">
                <div className="space-y-4">
                  <GitHubConnection organizationId={organization.id} />
                  <VercelConnection organizationId={organization.id} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
