export type AgentMode = "chat" | "execution" | "web_search" | "image_search";

export interface SearchAttachment {
  type: 'code' | 'doc' | 'link' | 'image' | 'video';
  title: string;
  url?: string;
  snippet?: string;
  filePath?: string;
  thumbnail?: string;
}

export interface FileAttachment {
  type: 'screenshot' | 'file';
  name: string;
  url?: string;
  file?: File;
  preview?: string;
  content?: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title?: string;
  };
  retrievedContext?: {
    uri: string;
    title?: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  webSearchQueries?: string[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
}

export interface ImageSearchResult {
  title: string;
  link: string;
  thumbnailLink: string;
  contextLink: string;
  displayLink: string;
}
