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
