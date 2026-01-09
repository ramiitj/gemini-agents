import { Search } from "lucide-react";
import type { GroundingChunk, SearchAttachment } from "@/types/search";
import SearchResultCard from "./SearchResultCard";

interface SearchResultsPanelProps {
  chunks: GroundingChunk[];
  searchQueries?: string[];
  onPinResult?: (result: SearchAttachment) => void;
  pinnedUrls?: string[];
}

function inferResultType(url: string): 'image' | 'video' | 'doc' | 'link' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('vimeo.com') || lowerUrl.match(/\.(mp4|webm)$/)) return 'video';
  if (lowerUrl.match(/\.(pdf|doc|docx|xls|xlsx)$/)) return 'doc';
  return 'link';
}

export default function SearchResultsPanel({
  chunks,
  searchQueries,
  onPinResult,
  pinnedUrls = []
}: SearchResultsPanelProps) {
  if (!chunks || chunks.length === 0) return null;

  const handlePin = (chunk: GroundingChunk) => {
    if (!onPinResult || !chunk.web?.uri) return;
    
    onPinResult({
      type: inferResultType(chunk.web.uri),
      title: chunk.web.title || 'Source',
      url: chunk.web.uri,
      snippet: undefined
    });
  };

  return (
    <div className="mt-4 border-t border-border/50 pt-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Sources ({chunks.length})
        </span>
        {searchQueries && searchQueries.length > 0 && (
          <span className="text-xs text-muted-foreground/60 ml-2">
            &ldquo;{searchQueries[0]}&rdquo;
          </span>
        )}
      </div>

      {/* Results Grid */}
      <div className="space-y-2">
        {chunks.map((chunk, index) => {
          const url = chunk.web?.uri || chunk.retrievedContext?.uri;
          const title = chunk.web?.title || chunk.retrievedContext?.title;
          
          if (!url) return null;

          return (
            <SearchResultCard
              key={index}
              title={title || 'Source'}
              url={url}
              type={inferResultType(url)}
              onPin={() => handlePin(chunk)}
              isPinned={pinnedUrls.includes(url)}
            />
          );
        })}
      </div>
    </div>
  );
}
