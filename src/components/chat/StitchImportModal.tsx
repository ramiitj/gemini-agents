import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Smartphone, Upload, Code, Image, Download } from "lucide-react";
import type { DesignOutput } from "@/types/search";

interface StitchImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (design: DesignOutput, saveToGallery?: boolean, name?: string) => void;
}

const StitchImportModal = ({ open, onOpenChange, onImport }: StitchImportModalProps) => {
  const [activeTab, setActiveTab] = useState<string>('code');
  const [code, setCode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deviceType, setDeviceType] = useState<'web' | 'app'>('web');
  const [saveToGallery, setSaveToGallery] = useState(false);
  const [designName, setDesignName] = useState('');

  // Generate live preview HTML with Tailwind CDN
  const previewHtml = useMemo(() => {
    if (!code.trim()) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { 
                margin: 0; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh;
                font-family: system-ui, sans-serif;
                color: #666;
                background: #f5f5f5;
              }
            </style>
          </head>
          <body>
            <p>Paste code to see live preview</p>
          </body>
        </html>
      `;
    }

    // Check if it's React/JSX or plain HTML
    const isReact = code.includes('className=') || code.includes('onClick=') || code.includes('useState');
    
    if (isReact) {
      // For React, show a note that it's React code
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { margin: 0; padding: 1rem; font-family: system-ui, sans-serif; }
              .react-notice { 
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
                padding: 1rem;
                border-radius: 0.5rem;
                margin-bottom: 1rem;
                font-size: 0.875rem;
              }
            </style>
          </head>
          <body class="${deviceType === 'app' ? 'max-w-[375px] mx-auto' : ''}">
            <div class="react-notice">
              <strong>React/JSX detected</strong> — Full preview requires React runtime. 
              Showing converted HTML below.
            </div>
            ${code.replace(/className=/g, 'class=').replace(/\{[^}]*\}/g, '')}
          </body>
        </html>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { margin: 0; padding: 1rem; font-family: system-ui, sans-serif; }
          </style>
        </head>
        <body class="${deviceType === 'app' ? 'max-w-[375px] mx-auto' : ''}">
          ${code}
        </body>
      </html>
    `;
  }, [code, deviceType]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleImport = useCallback(() => {
    const design: DesignOutput = {
      imageUrl: activeTab === 'image' ? imageUrl : '',
      code: activeTab === 'code' ? code : '',
      prompt: designName || 'Imported from Stitch',
      medium: deviceType,
      imported: true
    };

    onImport(design, saveToGallery, designName);
    
    // Reset form
    setCode('');
    setImageUrl('');
    setImageFile(null);
    setDesignName('');
    setSaveToGallery(false);
    onOpenChange(false);
  }, [activeTab, code, imageUrl, deviceType, designName, saveToGallery, onImport, onOpenChange]);

  const canImport = activeTab === 'code' ? code.trim().length > 0 : imageUrl.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import from Stitch
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="code" className="gap-2">
              <Code className="h-4 w-4" />
              Paste Code
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-2">
              <Image className="h-4 w-4" />
              Upload Image
            </TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="flex-1 mt-4">
            <div className="grid grid-cols-2 gap-4 h-[350px]">
              {/* Code editor pane */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">HTML or React Code</Label>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste HTML or React code from Stitch..."
                  className="font-mono text-sm flex-1 resize-none"
                />
              </div>
              
              {/* Live preview pane */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Live Preview</Label>
                <div className="flex-1 border rounded-lg overflow-hidden bg-background">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts"
                    title="Live Preview"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="image" className="flex-1 mt-4">
            <div className="h-[350px] flex flex-col gap-4">
              {/* Image upload area */}
              <div className="flex-1 relative">
                {imageUrl ? (
                  <div className="h-full rounded-lg border overflow-hidden bg-muted">
                    <img
                      src={imageUrl}
                      alt="Uploaded design"
                      className="w-full h-full object-contain"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setImageUrl('');
                        setImageFile(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/50">
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, or WebP
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>

              {/* URL input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Or paste image URL..."
                  value={imageFile ? '' : imageUrl}
                  onChange={(e) => {
                    setImageFile(null);
                    setImageUrl(e.target.value);
                  }}
                  disabled={!!imageFile}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer: Device toggle + Gallery save + Actions */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex items-center gap-4">
            {/* Device type toggle */}
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <Button
                type="button"
                size="sm"
                variant={deviceType === 'web' ? 'default' : 'ghost'}
                className="h-7 w-7 p-0"
                onClick={() => setDeviceType('web')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={deviceType === 'app' ? 'default' : 'ghost'}
                className="h-7 w-7 p-0"
                onClick={() => setDeviceType('app')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>

            {/* Save to gallery checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="save-gallery"
                checked={saveToGallery}
                onCheckedChange={(checked) => setSaveToGallery(checked === true)}
              />
              <Label htmlFor="save-gallery" className="text-sm cursor-pointer">
                Save to Gallery
              </Label>
            </div>

            {/* Design name input (shown when saving) */}
            {saveToGallery && (
              <Input
                placeholder="Design name"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                className="w-40 h-8"
              />
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!canImport || (saveToGallery && !designName.trim())}
            >
              Import Design
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StitchImportModal;
