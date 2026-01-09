import { useState } from "react";
import { Check, ExternalLink, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchAttachment } from "@/types/search";

interface ImageResult {
  title: string;
  link: string;
  thumbnailLink: string;
  contextLink: string;
  displayLink: string;
}

interface ImageResultsGridProps {
  images: ImageResult[];
  onSelectImage?: (image: SearchAttachment) => void;
  selectedUrls?: string[];
}

const ImageResultsGrid = ({ 
  images, 
  onSelectImage, 
  selectedUrls = [] 
}: ImageResultsGridProps) => {
  const [loadErrors, setLoadErrors] = useState<Set<string>>(new Set());

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <ImageIcon className="h-8 w-8 mr-2 opacity-50" />
        <span>No images found</span>
      </div>
    );
  }

  const handleImageError = (url: string) => {
    setLoadErrors(prev => new Set(prev).add(url));
  };

  const handleSelect = (image: ImageResult) => {
    if (!onSelectImage) return;
    
    onSelectImage({
      type: 'image',
      title: image.title,
      url: image.link,
      thumbnail: image.thumbnailLink
    });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-2">
      {images.map((image, index) => {
        const isSelected = selectedUrls.includes(image.link);
        const hasError = loadErrors.has(image.thumbnailLink);

        if (hasError) return null;

        return (
          <div
            key={index}
            className={cn(
              "group relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
              "hover:border-primary/50 hover:shadow-md",
              isSelected 
                ? "border-primary ring-2 ring-primary/20" 
                : "border-border/50"
            )}
            onClick={() => handleSelect(image)}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-3 w-3" />
              </div>
            )}

            {/* Image */}
            <div className="aspect-square bg-muted">
              <img
                src={image.thumbnailLink}
                alt={image.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
                onError={() => handleImageError(image.thumbnailLink)}
              />
            </div>

            {/* Overlay with info */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-xs text-white truncate">{image.title}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-white/70 truncate">
                  {image.displayLink}
                </span>
                <a
                  href={image.contextLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ImageResultsGrid;
