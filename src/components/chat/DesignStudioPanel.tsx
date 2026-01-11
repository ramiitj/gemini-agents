import { ExternalLink, Download, Grid, Palette, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DesignContext {
  imageUrl: string;
  prompt: string;
  code?: string;
}

interface DesignStudioPanelProps {
  onOpenImportModal: () => void;
  onOpenGalleryModal: () => void;
  designContext?: DesignContext | null;
  onClearContext?: () => void;
}

const DesignStudioPanel = ({ 
  onOpenImportModal, 
  onOpenGalleryModal,
  designContext,
  onClearContext
}: DesignStudioPanelProps) => {
  return (
    <div className="p-4">
      <div className="rounded-lg border border-border bg-card p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Design Studio</h3>
            <p className="text-sm text-muted-foreground">
              Create and import UI designs with Google Stitch
            </p>
          </div>
        </div>

        {/* Current design context preview */}
        {designContext && (
          <div className="relative rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-start gap-3">
              {designContext.imageUrl ? (
                <img 
                  src={designContext.imageUrl} 
                  alt="Design preview" 
                  className="w-20 h-20 object-cover rounded border"
                />
              ) : (
                <div className="w-20 h-20 rounded border bg-muted flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {designContext.prompt || 'Imported Design'}
                </p>
                {designContext.code && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {designContext.code.length} characters of code
                  </p>
                )}
                <p className="text-xs text-primary mt-2">
                  Ready to use as context
                </p>
              </div>
              {onClearContext && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={onClearContext}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Action cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Open in Stitch - using <a> tag for reliable external link */}
          <a
            href="https://stitch.withgoogle.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border 
                       hover:border-primary hover:bg-primary/5 transition-colors text-center group"
          >
            <ExternalLink className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm text-foreground">Open in Stitch</span>
            <span className="text-xs text-muted-foreground">
              Design UIs with Google's AI tool
            </span>
          </a>

          {/* Import from Stitch */}
          <button
            onClick={onOpenImportModal}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border 
                       hover:border-primary hover:bg-primary/5 transition-colors text-center group"
          >
            <Download className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm text-foreground">Import from Stitch</span>
            <span className="text-xs text-muted-foreground">
              Paste code or upload images
            </span>
          </button>
        </div>

        {/* Gallery button - full width */}
        <button
          onClick={onOpenGalleryModal}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border 
                     border-border hover:border-primary hover:bg-primary/5 transition-colors group"
        >
          <Grid className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-sm text-foreground">Browse Design Gallery</span>
        </button>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground text-center">
          Import designs, then switch to Chat or Execute mode to implement them in code
        </p>
      </div>
    </div>
  );
};

export default DesignStudioPanel;
