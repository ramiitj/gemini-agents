import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface ChatScreenshotButtonProps {
  previewUrl: string | null;
  onCapture: (imageData: string, url: string) => void;
  disabled?: boolean;
  previewIframeRef?: React.RefObject<HTMLIFrameElement>;
}

const ChatScreenshotButton = ({ 
  previewUrl, 
  onCapture, 
  disabled,
  previewIframeRef 
}: ChatScreenshotButtonProps) => {
  const [capturing, setCapturing] = useState(false);

  const capture = async () => {
    if (!previewUrl) {
      toast.error("No preview available to capture");
      return;
    }
    
    setCapturing(true);
    try {
      // Try to capture from iframe if ref is provided
      if (previewIframeRef?.current) {
        try {
          const iframe = previewIframeRef.current;
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          
          if (iframeDoc && iframeDoc.body) {
            const canvas = await html2canvas(iframeDoc.body, {
              useCORS: true,
              allowTaint: true,
              scale: 1,
              logging: false,
              width: iframe.clientWidth,
              height: iframe.clientHeight,
            });
            
            const imageData = canvas.toDataURL("image/png");
            onCapture(imageData, previewUrl);
            toast.success("Screenshot captured");
            return;
          }
        } catch (iframeError) {
          // Cross-origin iframe, fall through to alternative method
          console.log("Cross-origin iframe, using alternative capture method");
        }
      }

      // Fallback: Create a visual indicator that screenshot was requested
      // For cross-origin iframes, we can't directly capture
      // Open the URL in a new window for manual screenshot or use the URL as reference
      toast.info("Opening preview for screenshot. Use your browser's screenshot tool or extension.");
      window.open(previewUrl, "_blank");
      
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
