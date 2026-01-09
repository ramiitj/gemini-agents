import { useState, useRef } from "react";
import { RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import VisualEditOverlay from "./VisualEditOverlay";
import type { ElementInfo } from "@/lib/visual-edit-injector";

interface PreviewFrameProps {
  url: string;
  showBefore: boolean;
  beforeUrl?: string;
  visualEditMode?: boolean;
  onElementSelected?: (element: ElementInfo) => void;
  onVisualEditCancel?: () => void;
}

const PreviewFrame = ({ 
  url, 
  showBefore, 
  beforeUrl,
  visualEditMode = false, 
  onElementSelected, 
  onVisualEditCancel 
}: PreviewFrameProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    setIsLoading(true);
    setLoadError(false);
    setKey((prev) => prev + 1);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setLoadError(true);
    setIsLoading(false);
  };

  // Handle overlay selection - convert coordinates to ElementInfo
  const handleOverlaySelect = (coords: { x: number; y: number }, description?: string) => {
    if (onElementSelected) {
      // Create coordinate-based element info for the AI to analyze
      onElementSelected({
        selector: `click:${Math.round(coords.x)},${Math.round(coords.y)}`,
        tagName: 'visual-selection',
        className: '',
        id: '',
        textContent: description || '',
        innerHTML: '',
        outerHTML: '',
        computedStyles: {},
        boundingBox: { x: coords.x, y: coords.y, width: 20, height: 20, top: coords.y, left: coords.x },
        attributes: {}
      });
    }
  };

  // Determine which URL to display
  const displayUrl = showBefore && beforeUrl ? beforeUrl : url;

  // If showing "before" state but no beforeUrl, show placeholder
  if (showBefore && !beforeUrl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-muted/20 p-8">
        <p className="text-sm text-muted-foreground">
          No previous deployment available
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Previous version preview will appear after your first deployment
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 bg-background">
      {/* Refresh button */}
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full shadow-sm"
          onClick={handleRefresh}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Visual edit mode indicator */}
      {visualEditMode && (
        <div className="absolute left-3 top-3 z-10">
          <div className="flex items-center gap-1.5 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
            </span>
            Visual Edit Mode
          </div>
        </div>
      )}

      {/* Before/After indicator */}
      {showBefore && beforeUrl && (
        <div className="absolute left-3 top-3 z-10">
          <div className="rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            Previous Version
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && !loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-muted/50 p-8">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Preview blocked by security policy</p>
          <p className="text-xs text-muted-foreground text-center mb-4 max-w-xs">
            The deployment may have security headers preventing iframe embedding
          </p>
          <Button asChild variant="default" size="sm">
            <a href={displayUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </a>
          </Button>
        </div>
      )}

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        key={key}
        src={displayUrl}
        className="h-full w-full border-0"
        onLoad={handleLoad}
        onError={handleError}
        title="Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {/* Visual Edit Overlay - rendered on top of iframe */}
      {visualEditMode && !isLoading && !loadError && (
        <VisualEditOverlay
          onElementSelect={handleOverlaySelect}
          onCancel={onVisualEditCancel || (() => {})}
        />
      )}
    </div>
  );
};

export default PreviewFrame;
