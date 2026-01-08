import { MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  mode: "chat" | "execution";
  onModeChange: (mode: "chat" | "execution") => void;
  disabled?: boolean;
}

const ModeToggle = ({ mode, onModeChange, disabled }: ModeToggleProps) => {
  return (
    <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
      <button
        onClick={() => onModeChange("chat")}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
          mode === "chat"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Chat
      </button>
      <button
        onClick={() => onModeChange("execution")}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
          mode === "execution"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Zap className="h-3.5 w-3.5" />
        Execute
      </button>
    </div>
  );
};

export default ModeToggle;
