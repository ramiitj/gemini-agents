import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Permissions, DEFAULT_PERMISSIONS } from "@/hooks/useCustomRoles";

interface PermissionSelectorProps {
  permissions: Permissions;
  onChange: (permissions: Permissions) => void;
  disabled?: boolean;
}

const PERMISSION_CATEGORIES = [
  {
    key: "projects" as const,
    label: "Projects",
    actions: [
      { key: "view", label: "View" },
      { key: "create", label: "Create" },
      { key: "edit", label: "Edit" },
      { key: "delete", label: "Delete" }
    ]
  },
  {
    key: "deployments" as const,
    label: "Deployments",
    actions: [
      { key: "view", label: "View" },
      { key: "trigger", label: "Trigger" },
      { key: "manage", label: "Manage" }
    ]
  },
  {
    key: "team" as const,
    label: "Team",
    actions: [
      { key: "view", label: "View" },
      { key: "invite", label: "Invite" },
      { key: "manage", label: "Manage" }
    ]
  },
  {
    key: "settings" as const,
    label: "Settings",
    actions: [
      { key: "view", label: "View" },
      { key: "edit", label: "Edit" }
    ]
  },
  {
    key: "chat" as const,
    label: "Chat",
    actions: [
      { key: "view", label: "View" },
      { key: "send", label: "Send" },
      { key: "moderate", label: "Moderate" }
    ]
  }
];

const PermissionSelector = ({
  permissions = DEFAULT_PERMISSIONS,
  onChange,
  disabled
}: PermissionSelectorProps) => {
  const handleChange = (
    category: keyof Permissions,
    action: string,
    checked: boolean
  ) => {
    const newPermissions = {
      ...permissions,
      [category]: {
        ...permissions[category],
        [action]: checked
      }
    };
    onChange(newPermissions);
  };

  return (
    <div className="space-y-4">
      {PERMISSION_CATEGORIES.map((category) => (
        <div key={category.key} className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">
            {category.label}
          </h4>
          <div className="flex flex-wrap gap-4">
            {category.actions.map((action) => {
              const isChecked =
                (permissions[category.key] as Record<string, boolean>)?.[
                  action.key
                ] ?? false;
              
              return (
                <div key={action.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`${category.key}-${action.key}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleChange(category.key, action.key, checked === true)
                    }
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`${category.key}-${action.key}`}
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    {action.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PermissionSelector;
