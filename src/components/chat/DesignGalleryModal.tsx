import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Grid, Search, Trash2, Monitor, Smartphone, Loader2, FolderOpen } from "lucide-react";
import { useDesignGallery } from "@/hooks/useDesignGallery";
import { useAuth } from "@/hooks/useAuth";
import type { DesignOutput, SavedDesign } from "@/types/search";
import { formatDistanceToNow } from "date-fns";

interface DesignGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (design: DesignOutput) => void;
  organizationId?: string;
}

const DesignGalleryModal = ({
  open,
  onOpenChange,
  onSelect,
  organizationId
}: DesignGalleryModalProps) => {
  const { user } = useAuth();
  const { designs, isLoading, deleteDesign } = useDesignGallery(organizationId);
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'web' | 'app'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter designs based on search and device type
  const filteredDesigns = useMemo(() => {
    return designs.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDevice = deviceFilter === 'all' || d.medium === deviceFilter;
      return matchesSearch && matchesDevice;
    });
  }, [designs, searchQuery, deviceFilter]);

  const handleSelectDesign = (design: SavedDesign) => {
    const designOutput: DesignOutput = {
      id: design.id,
      imageUrl: design.image_url || '',
      code: design.code,
      prompt: design.name,
      medium: design.medium as 'web' | 'app',
      imported: true,
      savedAt: design.created_at
    };
    onSelect(designOutput);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    await deleteDesign(deleteId);
    setIsDeleting(false);
    setDeleteId(null);
  };

  // Generate preview HTML for a design
  const getPreviewHtml = (code: string, medium: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { 
              margin: 0; 
              padding: 0.5rem; 
              font-family: system-ui, sans-serif;
              transform: scale(0.5);
              transform-origin: top left;
              width: 200%;
            }
          </style>
        </head>
        <body class="${medium === 'app' ? 'max-w-[375px]' : ''}">
          ${code.replace(/className=/g, 'class=').replace(/\{[^}]*\}/g, '')}
        </body>
      </html>
    `;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid className="h-5 w-5" />
              Design Gallery
            </DialogTitle>
          </DialogHeader>

          {/* Search + filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search designs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={deviceFilter} onValueChange={(v) => setDeviceFilter(v as typeof deviceFilter)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="web">
                  <span className="flex items-center gap-2">
                    <Monitor className="h-3.5 w-3.5" />
                    Web
                  </span>
                </SelectItem>
                <SelectItem value="app">
                  <span className="flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5" />
                    Mobile
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Design grid */}
          <ScrollArea className="flex-1 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDesigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <FolderOpen className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">
                  {searchQuery || deviceFilter !== 'all'
                    ? 'No designs match your filters'
                    : 'No saved designs yet'}
                </p>
                <p className="text-xs mt-1">
                  Import designs from Stitch to see them here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 pr-4">
                {filteredDesigns.map((design) => (
                  <div
                    key={design.id}
                    className="group relative rounded-lg border overflow-hidden bg-card hover:ring-2 hover:ring-primary transition-all"
                  >
                    {/* Preview area */}
                    <button
                      onClick={() => handleSelectDesign(design)}
                      className="w-full text-left"
                    >
                      <div className="aspect-video bg-muted overflow-hidden">
                        {design.image_url ? (
                          <img
                            src={design.image_url}
                            alt={design.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <iframe
                            srcDoc={getPreviewHtml(design.code, design.medium)}
                            className="w-full h-full pointer-events-none border-0"
                            title={design.name}
                          />
                        )}
                      </div>
                      <div className="p-2.5">
                        <span className="text-sm font-medium truncate block">
                          {design.name}
                        </span>
                        <div className="flex items-center justify-between mt-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                            {design.medium === 'app' ? (
                              <>
                                <Smartphone className="h-2.5 w-2.5" />
                                Mobile
                              </>
                            ) : (
                              <>
                                <Monitor className="h-2.5 w-2.5" />
                                Web
                              </>
                            )}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(design.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Delete button (only for own designs) */}
                    {design.created_by === user?.id && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(design.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete design?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this design from your gallery.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DesignGalleryModal;
