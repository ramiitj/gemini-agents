import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreviewFrameProps {
  url: string;
  showBefore: boolean;
}

const PreviewFrame = ({ url, showBefore }: PreviewFrameProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setIsLoading(true);
    setKey((prev) => prev + 1);
  };

  // Mock: show placeholder for before state
  if (showBefore) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-muted/20 p-8">
        <p className="text-sm text-muted-foreground">
          Previous version preview
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Showing state before latest changes
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 bg-background">
      {/* Refresh button */}
      <div className="absolute right-3 top-3 z-10">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full shadow-sm"
          onClick={handleRefresh}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
        </div>
      )}

      {/* Iframe */}
      <iframe
        key={key}
        src={url}
        className="h-full w-full border-0"
        onLoad={() => setIsLoading(false)}
        title="Preview"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
};

export default PreviewFrame;
