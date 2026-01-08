import { Check, Loader2, AlertCircle, Clock } from "lucide-react";

interface DeploymentStatusProps {
  status: "building" | "deployed" | "failed" | "idle";
}

const DeploymentStatus = ({ status }: DeploymentStatusProps) => {
  const config = {
    building: {
      label: "Building...",
      icon: Loader2,
      className: "text-yellow-600",
      iconClassName: "animate-spin",
    },
    deployed: {
      label: "Deployed",
      icon: Check,
      className: "text-green-600",
      iconClassName: "",
    },
    failed: {
      label: "Failed",
      icon: AlertCircle,
      className: "text-destructive",
      iconClassName: "",
    },
    idle: {
      label: "Ready",
      icon: Clock,
      className: "text-muted-foreground",
      iconClassName: "",
    },
  };

  const { label, icon: Icon, className, iconClassName } = config[status];

  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      <Icon className={`h-3.5 w-3.5 ${iconClassName}`} />
      {label}
    </div>
  );
};

export default DeploymentStatus;
