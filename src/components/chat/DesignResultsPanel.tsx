import { useState } from "react";
import { Code, Image, ExternalLink, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { DesignOutput } from "@/types/search";

interface DesignResultsPanelProps {
  designs: DesignOutput[];
  onUseAsContext: (design: DesignOutput, type: 'image' | 'code') => void;
}

const DesignResultsPanel = ({ designs, onUseAsContext }: DesignResultsPanelProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  
  const currentDesign = designs[selectedIndex];
  
  if (!currentDesign) return null;
  
  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : designs.length - 1));
  };
  
  const handleNext = () => {
    setSelectedIndex((prev) => (prev < designs.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="space-y-3">
      {/* Design preview */}
      <div className="relative rounded-lg border border-border overflow-hidden bg-card">
        {/* Image preview */}
        <div className="relative aspect-video bg-muted/50">
          {currentDesign.imageUrl ? (
            <img
              src={currentDesign.imageUrl}
              alt={`Design: ${currentDesign.prompt}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <span className="text-sm">Generating design...</span>
            </div>
          )}
          
          {/* Fullscreen button */}
          <button
            onClick={() => setShowFullscreen(true)}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          
          {/* Navigation arrows for multiple variants */}
          {designs.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background border border-border/50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background border border-border/50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        
        {/* Footer with actions */}
        <div className="p-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {currentDesign.medium === 'app' ? 'Mobile App' : 'Web'}
            </Badge>
            {designs.length > 1 && (
              <span className="text-xs text-muted-foreground">
                {selectedIndex + 1} of {designs.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={() => setShowCode(true)}
            >
              <Code className="h-3.5 w-3.5" />
              View Code
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={() => onUseAsContext(currentDesign, 'image')}
            >
              <Image className="h-3.5 w-3.5" />
              Use Image
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => onUseAsContext(currentDesign, 'code')}
            >
              <Code className="h-3.5 w-3.5" />
              Use Code
            </Button>
          </div>
        </div>
      </div>
      
      {/* Variant thumbnails */}
      {designs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {designs.map((design, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 transition-all",
                index === selectedIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              {design.imageUrl ? (
                <img
                  src={design.imageUrl}
                  alt={`Variant ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
            </button>
          ))}
        </div>
      )}
      
      {/* Fullscreen dialog */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <img
            src={currentDesign.imageUrl}
            alt={`Design: ${currentDesign.prompt}`}
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
      
      {/* Code dialog */}
      <Dialog open={showCode} onOpenChange={setShowCode}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Generated Code</h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(currentDesign.code);
              }}
            >
              Copy Code
            </Button>
          </div>
          <div className="flex-1 overflow-auto rounded-lg bg-muted/50 p-4">
            <pre className="text-sm font-mono whitespace-pre-wrap break-all">
              {currentDesign.code || 'No code generated yet.'}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DesignResultsPanel;
