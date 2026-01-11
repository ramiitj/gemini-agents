export type AgentMode = "chat" | "execution" | "web_search" | "image_search" | "design";

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

export interface DesignOutput {
  imageUrl: string;
  code: string;
  prompt: string;
  medium?: 'web' | 'app';
  variants?: DesignOutput[];
  // Gallery and import fields
  id?: string;
  imported?: boolean;
  savedAt?: string;
}

export interface SavedDesign {
  id: string;
  name: string;
  code: string;
  image_url: string | null;
  medium: 'web' | 'app';
  tags: string[];
  project_id: string | null;
  organization_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
