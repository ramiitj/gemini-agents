import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import DiffViewer from "./DiffViewer";
import DeploymentStatus from "./DeploymentStatus";

type Tab = "preview" | "changes" | "files";

const PreviewPanel = () => {
  const [activeTab, setActiveTab] = useState<Tab>("preview");

  const tabs: { id: Tab; label: string }[] = [
    { id: "preview", label: "Preview" },
    { id: "changes", label: "Changes" },
    { id: "files", label: "Files" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border px-4">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-foreground font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <DeploymentStatus status="deployed" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "preview" && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
              <span className="text-xs text-muted-foreground">
                marketing-site-abc123.vercel.app
              </span>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                <ExternalLink className="h-3 w-3" />
                Open
              </Button>
            </div>
            <div className="flex flex-1 items-center justify-center bg-muted/20 p-4">
              <div className="text-center text-sm text-muted-foreground">
                <p>Preview will appear here</p>
                <p className="mt-1 text-xs">Make a change to see the live preview</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "changes" && (
          <div className="p-4">
            <DiffViewer />
          </div>
        )}

        {activeTab === "files" && (
          <div className="p-4">
            <div className="space-y-1">
              <FileItem name="src/components/Testimonials.tsx" status="added" />
              <FileItem name="src/pages/index.tsx" status="modified" />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border p-4">
        <Button variant="outline" size="sm">
          Undo
        </Button>
        <Button size="sm" className="ml-auto">
          Approve changes
        </Button>
      </div>
    </div>
  );
};

const FileItem = ({
  name,
  status,
}: {
  name: string;
  status: "added" | "modified" | "deleted";
}) => {
  const statusColors = {
    added: "text-green-600",
    modified: "text-yellow-600",
    deleted: "text-red-600",
  };

  const statusLabels = {
    added: "A",
    modified: "M",
    deleted: "D",
  };

  return (
    <div className="flex items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-muted/50">
      <span className={`font-mono text-xs ${statusColors[status]}`}>
        {statusLabels[status]}
      </span>
      <span className="text-foreground">{name}</span>
    </div>
  );
};

export default PreviewPanel;
