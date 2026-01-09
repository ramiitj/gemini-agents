import { useState } from "react";
import { ChevronDown, ChevronUp, Pin, ExternalLink, Globe, Image, FileText, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SearchResultCardProps {
  title: string;
  url: string;
  snippet?: string;
  type?: 'link' | 'image' | 'video' | 'doc';
  onPin?: () => void;
  isPinned?: boolean;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

function getTypeIcon(type?: string) {
  switch (type) {
    case 'image':
      return <Image className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />;
    case 'video':
      return <Video className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />;
    case 'doc':
      return <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
    default:
      return <Globe className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export default function SearchResultCard({
  title,
  url,
  snippet,
  type = 'link',
  onPin,
  isPinned = false
}: SearchResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const faviconUrl = getFaviconUrl(url);
  const domain = getDomain(url);

  return (
    <div className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/30">
      <div className="flex items-start gap-3">
        {/* Favicon/Thumbnail */}
        <div className="flex-shrink-0 mt-0.5">
          {faviconUrl ? (
            <img 
              src={faviconUrl} 
              alt="" 
              className="h-5 w-5 rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            getTypeIcon(type)
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-foreground truncate" title={title}>
                {title || 'Untitled'}
              </h4>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {domain}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {onPin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 w-7 p-0",
                    isPinned && "text-primary bg-primary/10"
                  )}
                  onClick={onPin}
                  title={isPinned ? "Unpin" : "Pin for context"}
                >
                  <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-current")} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => window.open(url, '_blank')}
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Expandable Snippet */}
          {snippet && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Hide snippet
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show snippet
                    </>
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded-md leading-relaxed">
                  {snippet}
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
}
