import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface ScreenshotButtonProps {
  previewUrl: string | null;
  onScreenshotCaptured: (imageData: string, url: string) => void;
  disabled?: boolean;
  previewIframeRef?: React.RefObject<HTMLIFrameElement>;
}

const ScreenshotButton = ({ 
  previewUrl, 
  onScreenshotCaptured, 
  disabled,
  previewIframeRef 
}: ScreenshotButtonProps) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const captureScreenshot = async () => {
    if (!previewUrl) {
      toast.error("No preview URL available");
      return;
    }

    setIsCapturing(true);
    
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
            onScreenshotCaptured(imageData, previewUrl);
            toast.success("Screenshot captured and attached");
            return;
          }
        } catch (iframeError) {
          // Cross-origin iframe, fall through to alternative method
          console.log("Cross-origin iframe, using alternative capture method");
        }
      }

      // Fallback: For cross-origin iframes, we can't directly capture
      // Provide the URL as reference and notify user
      toast.info("Opening preview for screenshot. Use your browser's screenshot tool.");
      window.open(previewUrl, "_blank");
      onScreenshotCaptured("", previewUrl);
      
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      toast.error("Failed to capture screenshot");
      onScreenshotCaptured("", previewUrl);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 text-xs"
      onClick={captureScreenshot}
      disabled={disabled || !previewUrl || isCapturing}
    >
      {isCapturing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Capturing...
        </>
      ) : (
        <>
          <Camera className="h-3 w-3" />
          Screenshot
        </>
      )}
    </Button>
  );
};

export default ScreenshotButton;
