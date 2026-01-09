import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PermissionSelector from "./PermissionSelector";
import { Permissions, DEFAULT_PERMISSIONS } from "@/hooks/useCustomRoles";
import { toast } from "sonner";

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRole: (
    name: string,
    description: string,
    permissions: Permissions
  ) => Promise<boolean>;
}

const CreateRoleModal = ({
  open,
  onOpenChange,
  onCreateRole,
}: CreateRoleModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }

    setIsCreating(true);
    const success = await onCreateRole(name.trim(), description.trim(), permissions);
    setIsCreating(false);

    if (success) {
      toast.success("Role created successfully");
      setName("");
      setDescription("");
      setPermissions(DEFAULT_PERMISSIONS);
      onOpenChange(false);
    } else {
      toast.error("Failed to create role");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Role</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Role Name</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Designer, Developer, Reviewer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this role is used for..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="rounded-md border border-border p-3 bg-muted/30">
              <PermissionSelector
                permissions={permissions}
                onChange={setPermissions}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoleModal;
