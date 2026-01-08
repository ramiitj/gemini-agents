import { useState } from "react";
import { ExternalLink, RotateCcw, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DiffViewer from "./DiffViewer";
import DeploymentStatus from "./DeploymentStatus";
import PreviewFrame from "./PreviewFrame";
import FileList from "./FileList";

type Tab = "preview" | "changes" | "files";

const PreviewPanel = () => {
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [showBefore, setShowBefore] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<
    "idle" | "building" | "deployed" | "failed"
  >("deployed");

  const tabs: { id: Tab; label: string }[] = [
    { id: "preview", label: "Preview" },
    { id: "changes", label: "Changes" },
    { id: "files", label: "Files" },
  ];

  const previewUrl = "https://marketing-site-abc123.vercel.app";

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
        <DeploymentStatus status={deploymentStatus} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "preview" && (
          <div className="flex h-full flex-col animate-fade-in">
            {/* Preview header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {previewUrl.replace("https://", "")}
                </span>
                {/* Before/After toggle */}
                <div className="flex rounded-md border border-border bg-background">
                  <button
                    onClick={() => setShowBefore(false)}
                    className={`px-2.5 py-1 text-xs transition-colors ${
                      !showBefore
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    After
                  </button>
                  <button
                    onClick={() => setShowBefore(true)}
                    className={`px-2.5 py-1 text-xs transition-colors ${
                      showBefore
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Before
                  </button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                asChild
              >
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  Open
                </a>
              </Button>
            </div>

            {/* Preview iframe or error */}
            {deploymentStatus === "failed" ? (
              <ErrorDisplay
                onRetry={() => {
                  setDeploymentStatus("building");
                  setTimeout(() => setDeploymentStatus("deployed"), 2000);
                }}
              />
            ) : deploymentStatus === "building" ? (
              <BuildingState />
            ) : (
              <PreviewFrame url={previewUrl} showBefore={showBefore} />
            )}
          </div>
        )}

        {activeTab === "changes" && (
          <div className="p-4 animate-fade-in">
            <DiffViewer />
          </div>
        )}

        {activeTab === "files" && (
          <div className="p-4 animate-fade-in">
            <FileList />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border p-4">
        <Button variant="outline" size="sm" className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Undo
        </Button>
        <Button size="sm" className="ml-auto gap-1.5">
          <Check className="h-3.5 w-3.5" />
          Approve changes
        </Button>
      </div>
    </div>
  );
};

const BuildingState = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/20 p-8">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
    <div className="text-center">
      <p className="text-sm font-medium text-foreground">Building preview...</p>
      <p className="mt-1 text-xs text-muted-foreground">
        This usually takes 10-30 seconds
      </p>
    </div>
  </div>
);

const ErrorDisplay = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-muted/20 p-8">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
      <AlertCircle className="h-6 w-6 text-destructive" />
    </div>
    <div className="max-w-sm text-center">
      <p className="text-sm font-medium text-foreground">Build failed</p>
      <p className="mt-2 text-xs text-muted-foreground">
        TypeScript error in src/components/Testimonials.tsx: Property 'quote'
        does not exist on type 'Testimonial'.
      </p>
    </div>
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium text-foreground">AI suggestion</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Add the missing 'quote' property to the Testimonial interface, or rename
        'testimonial' to 'quote' in the component.
      </p>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry build
      </Button>
      <Button size="sm">Apply AI fix</Button>
    </div>
  </div>
);

export default PreviewPanel;
