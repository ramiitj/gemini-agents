import { useState, useRef } from "react";
import { RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import VisualEditOverlay from "./VisualEditOverlay";
import type { ElementInfo } from "@/lib/visual-edit-injector";

interface PreviewFrameProps {
  url: string;
  visualEditMode?: boolean;
  onElementSelected?: (element: ElementInfo) => void;
  onVisualEditCancel?: () => void;
}

const PreviewFrame = ({ 
  url, 
  visualEditMode = false, 
  onElementSelected, 
  onVisualEditCancel 
}: PreviewFrameProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    setKey((prev) => prev + 1);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Handle overlay selection - convert coordinates to ElementInfo
  const handleOverlaySelect = (coords: { x: number; y: number }, description?: string) => {
    if (onElementSelected) {
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

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
        </div>
      )}

      {/* Error state */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-muted/20 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="max-w-sm text-center">
            <p className="text-sm font-medium text-foreground">Preview cannot load</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The deployment may need to be rebuilt with iframe headers
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Iframe - always rendered */}
      <iframe
        ref={iframeRef}
        key={key}
        src={url}
        className="h-full w-full border-0"
        onLoad={handleLoad}
        onError={handleError}
        title="Preview"
      />

      {/* Visual Edit Overlay */}
      {visualEditMode && !isLoading && !hasError && (
        <VisualEditOverlay
          onElementSelect={handleOverlaySelect}
          onCancel={onVisualEditCancel || (() => {})}
        />
      )}
    </div>
  );
};

export default PreviewFrame;
