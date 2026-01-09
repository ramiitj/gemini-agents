import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatScreenshotButtonProps {
  previewUrl: string | null;
  onCapture: (imageData: string, url: string) => void;
  disabled?: boolean;
}

const ChatScreenshotButton = ({ previewUrl, onCapture, disabled }: ChatScreenshotButtonProps) => {
  const [capturing, setCapturing] = useState(false);

  const capture = async () => {
    if (!previewUrl) {
      toast.error("No preview available to capture");
      return;
    }
    
    setCapturing(true);
    try {
      const { data, error } = await supabase.functions.invoke('capture-screenshot', {
        body: { url: previewUrl }
      });
      
      if (error) throw error;
      
      if (data?.screenshot) {
        onCapture(data.screenshot, previewUrl);
        toast.success("Screenshot captured");
      } else {
        throw new Error("No screenshot returned");
      }
    } catch (err: any) {
      console.error("Screenshot failed:", err);
      toast.error("Failed to capture screenshot");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 text-xs"
      onClick={capture}
      disabled={disabled || !previewUrl || capturing}
    >
      {capturing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Camera className="h-3.5 w-3.5" />
      )}
      Screenshot
    </Button>
  );
};

export default ChatScreenshotButton;
