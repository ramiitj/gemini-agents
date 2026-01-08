import { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VISUAL_EDIT_SCRIPT, type ElementInfo } from "@/lib/visual-edit-injector";

interface PreviewFrameProps {
  url: string;
  showBefore: boolean;
  visualEditMode?: boolean;
  onElementSelected?: (element: ElementInfo) => void;
}

const PreviewFrame = ({ url, showBefore, visualEditMode = false, onElementSelected }: PreviewFrameProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [injected, setInjected] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setInjected(false);
    setKey((prev) => prev + 1);
  };

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'VISUAL_EDIT_ELEMENT_SELECTED' && onElementSelected) {
        onElementSelected(event.data.data);
      }
      if (event.data.type === 'VISUAL_EDIT_READY') {
        console.log('[PreviewFrame] Visual edit script ready in iframe');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementSelected]);

  // Toggle visual edit mode in iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'VISUAL_EDIT_TOGGLE', active: visualEditMode }, '*');
    }
  }, [visualEditMode]);

  // Inject visual edit script when iframe loads
  const handleLoad = () => {
    setIsLoading(false);
    
    if (visualEditMode && !injected) {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        try {
          // Try to inject the script
          const script = iframe.contentDocument?.createElement('script');
          if (script) {
            script.textContent = VISUAL_EDIT_SCRIPT;
            iframe.contentDocument?.body.appendChild(script);
            setInjected(true);
          }
        } catch (e) {
          // Cross-origin - can't inject directly
          console.log('[PreviewFrame] Cannot inject script (cross-origin)');
        }
      }
    }
  };

  // Re-inject when visual edit mode is enabled
  useEffect(() => {
    if (visualEditMode && !isLoading && !injected) {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        try {
          const script = iframe.contentDocument?.createElement('script');
          if (script) {
            script.textContent = VISUAL_EDIT_SCRIPT;
            iframe.contentDocument?.body.appendChild(script);
            setInjected(true);
          }
        } catch (e) {
          console.log('[PreviewFrame] Cannot inject script (cross-origin)');
        }
      }
    }
  }, [visualEditMode, isLoading, injected]);

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

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        key={key}
        src={url}
        className="h-full w-full border-0"
        onLoad={handleLoad}
        title="Preview"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
};

export default PreviewFrame;
