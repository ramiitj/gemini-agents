import { Layers } from "lucide-react";

interface PhaseHeaderProps {
  content: string;
}

export default function PhaseHeader({ content }: PhaseHeaderProps) {
  return (
    <div className="flex items-center gap-3 bg-primary/10 border-l-4 border-primary px-4 py-3 rounded-r-lg my-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20">
        <Layers className="h-4 w-4 text-primary" />
      </div>
      <h2 className="font-semibold text-foreground text-base">{content}</h2>
    </div>
  );
}
