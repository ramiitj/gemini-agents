import { useState } from "react";
import { Mail, Plus, Shield } from "lucide-react";
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
import { useCustomRoles, type Permissions } from "@/hooks/useCustomRoles";
import CreateRoleModal from "./CreateRoleModal";
import type { Json } from "@/integrations/supabase/types";

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
}

const InviteMemberModal = ({ open, onOpenChange, organizationId }: InviteMemberModalProps) => {
  const [email, setEmail] = useState("");
  const [roleMode, setRoleMode] = useState<"preset" | "custom">("preset");
  const [presetRole, setPresetRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  
  const { inviteMember } = useTeam(organizationId);
  const { roles: customRoles, createRole, refetch: refetchRoles } = useCustomRoles(organizationId);
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

    // Validate custom role selection
    if (roleMode === "custom" && !selectedCustomRoleId) {
      toast({
        title: "Role required",
        description: "Please select or create a custom role.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const selectedCustomRole = customRoles.find(r => r.id === selectedCustomRoleId);
    
    const result = await inviteMember(
      email, 
      roleMode === "preset" ? presetRole : "editor", // Default role for custom
      roleMode === "custom" && selectedCustomRole ? {
        customRoleId: selectedCustomRole.id,
        customPermissions: JSON.parse(JSON.stringify(selectedCustomRole.permissions)) as Json
      } : undefined
    );
    
    setLoading(false);

    if (result.success) {
      toast({
        title: "Invitation sent",
        description: result.message,
      });
      setEmail("");
      setPresetRole("editor");
      setSelectedCustomRoleId(null);
      setRoleMode("preset");
      onOpenChange(false);
    }
  };

  const handleCreateRole = async (name: string, description: string, permissions: Permissions): Promise<boolean> => {
    const newRole = await createRole(name, description, permissions);
    if (newRole) {
      setSelectedCustomRoleId(newRole.id);
      refetchRoles();
      return true;
    }
    return false;
  };

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
                  <TabsTrigger value="preset">Preset</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
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
                      <div className="flex flex-col">
                        <span>Admin</span>
                        <span className="text-xs text-muted-foreground">
                          Can manage team and settings
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex flex-col">
                        <span>Editor</span>
                        <span className="text-xs text-muted-foreground">
                          Can edit projects and deployments
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex flex-col">
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
              <div className="space-y-3">
                <Label>Custom role</Label>
                
                {customRoles.length > 0 ? (
                  <Select 
                    value={selectedCustomRoleId || ""} 
                    onValueChange={setSelectedCustomRoleId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a custom role" />
                    </SelectTrigger>
                    <SelectContent>
                      {customRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <Shield className="h-3.5 w-3.5 text-primary" />
                            <div className="flex flex-col">
                              <span>{role.name}</span>
                              {role.description && (
                                <span className="text-xs text-muted-foreground">
                                  {role.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No custom roles yet. Create one to get started.
                  </p>
                )}
                
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setCreateRoleOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create new role
                </Button>
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
