import { useState } from "react";
import { Mail, Plus, Users, UserCog } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTeam } from "@/hooks/useTeam";
import { useCustomRoles } from "@/hooks/useCustomRoles";
import type { Permissions } from "@/hooks/useCustomRoles";

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
}

const InviteMemberModal = ({ open, onOpenChange, organizationId }: InviteMemberModalProps) => {
  const [email, setEmail] = useState("");
  const [roleMode, setRoleMode] = useState<"preset" | "custom">("preset");
  const [presetRole, setPresetRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [selectedCustomRole, setSelectedCustomRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  
  const { inviteMember } = useTeam(organizationId);
  const { roles: customRoles, loading: rolesLoading, createRole, refetch: refetchRoles } = useCustomRoles(organizationId);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    if (roleMode === "custom" && !selectedCustomRole) {
      toast({
        title: "Role required",
        description: "Please select a custom role.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Find the custom role if using custom mode
    const customRole = roleMode === "custom" 
      ? customRoles.find(r => r.id === selectedCustomRole)
      : null;

    const result = await inviteMember(
      email, 
      roleMode === "preset" ? presetRole : "viewer", // Base role for custom roles
      customRole?.id,
      customRole?.permissions
    );
    
    setLoading(false);

    if (result.success) {
      toast({
        title: "Invitation sent",
        description: result.message,
      });
      setEmail("");
      setPresetRole("editor");
      setSelectedCustomRole(null);
      setRoleMode("preset");
      onOpenChange(false);
    } else {
      toast({
        title: "Failed to send invitation",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateRole = async (name: string, description: string, permissions: Permissions) => {
    const newRole = await createRole(name, description, permissions);
    if (newRole) {
      await refetchRoles();
      setSelectedCustomRole(newRole.id);
      return true;
    }
    return false;
  };

  const selectedRole = customRoles.find(r => r.id === selectedCustomRole);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your workspace.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role type</Label>
              <Tabs value={roleMode} onValueChange={(v) => setRoleMode(v as "preset" | "custom")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preset" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Preset
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="flex items-center gap-2">
                    <UserCog className="h-4 w-4" />
                    Custom
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {roleMode === "preset" ? (
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={presetRole} onValueChange={(v: "admin" | "editor" | "viewer") => setPresetRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex flex-col items-start">
                        <span>Admin</span>
                        <span className="text-xs text-muted-foreground">
                          Can manage team and settings
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex flex-col items-start">
                        <span>Editor</span>
                        <span className="text-xs text-muted-foreground">
                          Can edit projects and deployments
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex flex-col items-start">
                        <span>Viewer</span>
                        <span className="text-xs text-muted-foreground">
                          Can only view projects
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customRole">Custom role</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setCreateRoleOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    New role
                  </Button>
                </div>
                
                {rolesLoading ? (
                  <div className="h-10 rounded-md border border-input bg-muted animate-pulse" />
                ) : customRoles.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm border rounded-md">
                    <p>No custom roles yet.</p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setCreateRoleOpen(true)}
                    >
                      Create your first custom role
                    </Button>
                  </div>
                ) : (
                  <Select 
                    value={selectedCustomRole || ""} 
                    onValueChange={setSelectedCustomRole}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a custom role" />
                    </SelectTrigger>
                    <SelectContent>
                      {customRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex flex-col items-start">
                            <span>{role.name}</span>
                            {role.description && (
                              <span className="text-xs text-muted-foreground">
                                {role.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedRole && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                    <span className="font-medium">Permissions:</span>{" "}
                    {Object.entries(selectedRole.permissions)
                      .filter(([_, perms]) => Object.values(perms as Record<string, boolean>).some(v => v))
                      .map(([category]) => category)
                      .join(", ") || "None"}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CreateRoleModal
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
        onCreateRole={handleCreateRole}
      />
    </>
  );
};

export default InviteMemberModal;