import { useState } from "react";
import { X, Send, Palette, Type, Move, Maximize2, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ElementInfo } from "@/lib/visual-edit-injector";

interface ElementInfoPanelProps {
  element: ElementInfo;
  onClose: () => void;
  onSendToAI: (request: string) => void;
}

const QUICK_ACTIONS = [
  { icon: Palette, label: "Change color", prompt: "Change the color of this element" },
  { icon: Type, label: "Edit text", prompt: "Change the text content" },
  { icon: Move, label: "Adjust spacing", prompt: "Adjust the padding and margin" },
  { icon: Maximize2, label: "Resize", prompt: "Make this element larger/smaller" },
  { icon: Trash2, label: "Remove", prompt: "Remove this element" },
];

const ElementInfoPanel = ({ element, onClose, onSendToAI }: ElementInfoPanelProps) => {
  const [customRequest, setCustomRequest] = useState("");

  const handleQuickAction = (prompt: string) => {
    onSendToAI(prompt);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customRequest.trim()) {
      onSendToAI(customRequest.trim());
      setCustomRequest("");
    }
  };

  const handleCopySelector = () => {
    navigator.clipboard.writeText(element.selector);
  };

  // Format style value for display
  const formatStyleValue = (value: string) => {
    if (!value || value === "none" || value === "normal" || value === "auto") {
      return null;
    }
    return value;
  };

  const relevantStyles = Object.entries(element.computedStyles)
    .filter(([_, value]) => formatStyleValue(value))
    .slice(0, 6);

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 animate-in slide-in-from-bottom-4 duration-200">
      <div className="rounded-lg border border-border bg-card shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className="font-mono text-xs shrink-0">
              {element.tagName}
            </Badge>
            <button
              onClick={handleCopySelector}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground truncate"
              title={element.selector}
            >
              <span className="truncate max-w-[200px]">{element.selector}</span>
              <Copy className="h-3 w-3 shrink-0" />
            </button>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="p-3 space-y-3">
          {/* Element preview text */}
          {element.textContent && (
            <div className="text-xs">
              <span className="text-muted-foreground">Text: </span>
              <span className="text-foreground">
                {element.textContent.length > 50
                  ? element.textContent.substring(0, 50) + "..."
                  : element.textContent}
              </span>
            </div>
          )}

          {/* Current styles */}
          {relevantStyles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {relevantStyles.map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-[10px] font-mono">
                  {key}: {value.toString().substring(0, 20)}
                </Badge>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => handleQuickAction(action.prompt)}
              >
                <action.icon className="h-3 w-3" />
                {action.label}
              </Button>
            ))}
          </div>

          {/* Custom request */}
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <Input
              value={customRequest}
              onChange={(e) => setCustomRequest(e.target.value)}
              placeholder="Describe what you want to change..."
              className="h-8 text-xs"
            />
            <Button type="submit" size="sm" className="h-8 gap-1 shrink-0" disabled={!customRequest.trim()}>
              <Send className="h-3 w-3" />
              Apply
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ElementInfoPanel;
