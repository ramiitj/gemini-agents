import { useState } from "react";
import { Mail, Plus, Users, Shield } from "lucide-react";
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
import { useCustomRoles, Permissions, PRESET_PERMISSIONS } from "@/hooks/useCustomRoles";
import CreateRoleModal from "./CreateRoleModal";

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
}

const InviteMemberModal = ({ open, onOpenChange, organizationId }: InviteMemberModalProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleMode, setRoleMode] = useState<"preset" | "custom">("preset");
  const [presetRole, setPresetRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  
  const { inviteMember } = useTeam(organizationId);
  const { roles: customRoles, createRole, refetch: refetchRoles } = useCustomRoles(organizationId);
  const { toast } = useToast();

  const handleCreateRole = async (name: string, description: string, permissions: Permissions) => {
    const newRole = await createRole(name, description, permissions);
    if (newRole) {
      await refetchRoles();
      setSelectedCustomRoleId(newRole.id);
      return true;
    }
    return false;
  };

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

    if (roleMode === "custom" && !selectedCustomRoleId) {
      toast({
        title: "Role required",
        description: "Please select a custom role or switch to preset roles.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Get permissions based on mode
    const customRoleId = roleMode === "custom" ? selectedCustomRoleId : undefined;
    const selectedCustomRole = customRoles.find(r => r.id === selectedCustomRoleId);
    const customPermissions = roleMode === "custom" && selectedCustomRole 
      ? selectedCustomRole.permissions 
      : undefined;
    
    const result = await inviteMember(
      email, 
      roleMode === "preset" ? presetRole : "viewer", // Base role
      name || undefined,
      customRoleId,
      customPermissions
    );
    setLoading(false);

    if (result.success) {
      toast({
        title: "Invitation sent",
        description: result.message,
      });
      // Reset form
      setEmail("");
      setName("");
      setPresetRole("editor");
      setSelectedCustomRoleId("");
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

  const selectedCustomRole = customRoles.find(r => r.id === selectedCustomRoleId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your workspace with specific permissions.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email input */}
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

            {/* Name input (optional) */}
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Role type toggle */}
            <div className="space-y-2">
              <Label>Role type</Label>
              <Tabs value={roleMode} onValueChange={(v) => setRoleMode(v as "preset" | "custom")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preset" className="gap-2">
                    <Users className="h-4 w-4" />
                    Preset
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Custom
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Preset roles */}
            {roleMode === "preset" && (
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={presetRole} onValueChange={(v: "admin" | "editor" | "viewer") => setPresetRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Admin</span>
                        <span className="text-xs text-muted-foreground">
                          Full access to team and settings
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Editor</span>
                        <span className="text-xs text-muted-foreground">
                          Can edit projects and deployments
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Viewer</span>
                        <span className="text-xs text-muted-foreground">
                          Can only view projects
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom roles */}
            {roleMode === "custom" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Custom role</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setCreateRoleOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Create new
                  </Button>
                </div>
                
                {customRoles.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-border rounded-lg">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">No custom roles yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateRoleOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create your first role
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedCustomRoleId} onValueChange={setSelectedCustomRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a custom role" />
                    </SelectTrigger>
                    <SelectContent>
                      {customRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{role.name}</span>
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

                {/* Show selected role permissions summary */}
                {selectedCustomRole && (
                  <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                    <p className="font-medium text-sm">{selectedCustomRole.name}</p>
                    {selectedCustomRole.description && (
                      <p className="text-muted-foreground">{selectedCustomRole.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedCustomRole.permissions.projects?.view && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">View Projects</span>
                      )}
                      {selectedCustomRole.permissions.projects?.edit && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">Edit Projects</span>
                      )}
                      {selectedCustomRole.permissions.deployments?.deploy && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">Deploy</span>
                      )}
                      {selectedCustomRole.permissions.team?.invite && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">Invite</span>
                      )}
                    </div>
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
