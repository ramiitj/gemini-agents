import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScreenshotButtonProps {
  previewUrl: string | null;
  onScreenshotCaptured: (imageData: string, url: string) => void;
  disabled?: boolean;
}

const ScreenshotButton = ({ previewUrl, onScreenshotCaptured, disabled }: ScreenshotButtonProps) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const captureScreenshot = async () => {
    if (!previewUrl) {
      toast.error("No preview URL available");
      return;
    }

    setIsCapturing(true);
    try {
      // Use the AI agent's capture_screenshot functionality via PageSpeed API
      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: `capture_screenshot of ${previewUrl}`,
          mode: 'chat',
          // Direct tool call
          directToolCall: {
            name: 'capture_screenshot',
            args: { url: previewUrl }
          }
        }
      });

      if (error) throw error;

      // The response should contain the screenshot
      if (data?.toolResults?.screenshot_base64) {
        onScreenshotCaptured(data.toolResults.screenshot_base64, previewUrl);
        toast.success("Screenshot captured! You can now describe what you want to change.");
      } else {
        // Fallback: just pass the URL for the AI to screenshot
        onScreenshotCaptured('', previewUrl);
        toast.info("Screenshot ready - describe what you want to change");
      }
    } catch (e: any) {
      console.error("Screenshot capture failed:", e);
      // Still allow the user to reference the preview
      onScreenshotCaptured('', previewUrl || '');
      toast.info("Ready to reference the preview - describe what you want to change");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 text-xs"
      onClick={captureScreenshot}
      disabled={disabled || isCapturing || !previewUrl}
      title="Take screenshot of preview to send to AI"
    >
      {isCapturing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Camera className="h-3 w-3" />
      )}
      Screenshot
    </Button>
  );
};

export default ScreenshotButton;
