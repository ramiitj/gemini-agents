interface DeploymentStatusProps {
  status: "building" | "deployed" | "failed" | "idle";
}

const DeploymentStatus = ({ status }: DeploymentStatusProps) => {
  const config = {
    building: {
      label: "Building...",
      dotColor: "bg-yellow-500",
      animate: true,
    },
    deployed: {
      label: "Deployed",
      dotColor: "bg-green-500",
      animate: false,
    },
    failed: {
      label: "Failed",
      dotColor: "bg-red-500",
      animate: false,
    },
    idle: {
      label: "Ready",
      dotColor: "bg-muted-foreground",
      animate: false,
    },
  };

  const { label, dotColor, animate } = config[status];

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={`h-2 w-2 rounded-full ${dotColor} ${
          animate ? "animate-pulse" : ""
        }`}
      />
      {label}
    </div>
  );
};

export default DeploymentStatus;
