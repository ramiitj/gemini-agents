import { useState, useRef, useCallback } from "react";
import { MousePointer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VisualEditOverlayProps {
  onElementSelect: (coordinates: { x: number; y: number }, description?: string) => void;
  onCancel: () => void;
}

const VisualEditOverlay = ({ onElementSelect, onCancel }: VisualEditOverlayProps) => {
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);
  const [description, setDescription] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setClickPosition({ x, y });
    setShowDescriptionInput(true);
  }, []);

  const handleSubmit = () => {
    if (clickPosition) {
      onElementSelect(clickPosition, description || undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-20 cursor-crosshair"
      onClick={handleOverlayClick}
    >
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-primary/5" />

      {/* Instructions */}
      {!showDescriptionInput && (
        <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
            <MousePointer className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Click on any element to select it</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-2"
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Selection marker and description input */}
      {clickPosition && (
        <>
          {/* Selection box */}
          <div
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/20"
            style={{ left: clickPosition.x, top: clickPosition.y }}
          />

          {/* Description input popup */}
          {showDescriptionInput && (
            <div
              className="absolute z-30 w-80"
              style={{
                left: Math.min(clickPosition.x + 20, window.innerWidth - 340),
                top: Math.min(clickPosition.y + 20, window.innerHeight - 200)
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-lg bg-background p-4 shadow-xl border border-border">
                <p className="mb-2 text-sm font-medium">What would you like to change?</p>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., Make this button larger"
                  autoFocus
                  className="mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSubmit}>
                    Send to AI
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VisualEditOverlay;
