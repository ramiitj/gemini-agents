export type MessageBlockType = 
  | 'text' 
  | 'phase_header' 
  | 'section_header' 
  | 'code' 
  | 'file_reference'
  | 'agent_action'
  | 'user_action'
  | 'list'
  | 'note';

export interface MessageBlock {
  type: MessageBlockType;
  content: string;
  filename?: string;
  language?: string;
  actionType?: 'create' | 'modify' | 'delete' | 'deploy' | 'verify';
  actionStatus?: 'pending' | 'in_progress' | 'complete' | 'error';
  noteType?: 'info' | 'warning' | 'important';
}

// Patterns for detecting block types
const PHASE_HEADER_PATTERN = /^#{1,2}\s*Phase\s+\d+[:.]/i;
const SECTION_HEADER_PATTERN = /^#{2,3}\s*\d+\.\d+/;
const CODE_BLOCK_PATTERN = /^```(\w+)?\n([\s\S]*?)```$/;
const FILE_REFERENCE_PATTERN = /^(?:\/\/\s*(?:In|File:?)\s*|File:\s*)([^\n]+\.(?:tsx?|jsx?|css|json|md|sql|html))/i;
const AGENT_COMPLETE_PATTERN = /^(?:OK\.?\s*I(?:'ve|'ve| have)|Done[:.!]|Completed[:.!]|✓|Created|Updated|Modified|Deployed)/i;
const AGENT_PROGRESS_PATTERN = /^(?:Now,?\s*I(?:'ll| will)|Next[:.!]|Working on|Creating|Updating|Modifying)/i;
const USER_ACTION_PATTERN = /^(?:Please|You (?:need to|should|can)|Action required)/i;
const NOTE_PATTERN = /^(?:Note:|Important:|Warning:|⚠️|ℹ️|💡)/i;
const LIST_ITEM_PATTERN = /^[-*]\s+/;

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'css': 'css',
    'json': 'json',
    'sql': 'sql',
    'md': 'markdown',
    'html': 'html'
  };
  return langMap[ext || ''] || 'plaintext';
}

function detectNoteType(content: string): 'info' | 'warning' | 'important' {
  if (/warning|⚠️/i.test(content)) return 'warning';
  if (/important/i.test(content)) return 'important';
  return 'info';
}

export function parseMessageContent(content: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  
  // First, extract code blocks to prevent them from being parsed
  const codeBlockPlaceholders: { placeholder: string; block: MessageBlock }[] = [];
  let processedContent = content;
  
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let placeholderIndex = 0;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const placeholder = `__CODE_BLOCK_${placeholderIndex}__`;
    const language = match[1] || 'plaintext';
    const code = match[2].trim();
    
    codeBlockPlaceholders.push({
      placeholder,
      block: {
        type: 'code',
        content: code,
        language
      }
    });
    
    processedContent = processedContent.replace(match[0], placeholder);
    placeholderIndex++;
  }
  
  // Split into lines for processing
  const lines = processedContent.split('\n');
  let currentTextBlock = '';
  let pendingFileReference: string | null = null;
  
  const flushTextBlock = () => {
    if (currentTextBlock.trim()) {
      // Check if the text block is actually a placeholder
      const placeholderMatch = currentTextBlock.trim().match(/^__CODE_BLOCK_(\d+)__$/);
      if (placeholderMatch) {
        const placeholder = codeBlockPlaceholders[parseInt(placeholderMatch[1])];
        if (placeholder) {
          // Add file reference if pending
          if (pendingFileReference) {
            placeholder.block.filename = pendingFileReference;
            pendingFileReference = null;
          }
          blocks.push(placeholder.block);
        }
      } else {
        blocks.push({
          type: 'text',
          content: currentTextBlock.trim()
        });
      }
      currentTextBlock = '';
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check for code block placeholder
    if (trimmedLine.match(/^__CODE_BLOCK_\d+__$/)) {
      flushTextBlock();
      const placeholderIndex = parseInt(trimmedLine.match(/\d+/)![0]);
      const placeholder = codeBlockPlaceholders[placeholderIndex];
      if (placeholder) {
        if (pendingFileReference) {
          placeholder.block.filename = pendingFileReference;
          pendingFileReference = null;
        }
        blocks.push(placeholder.block);
      }
      continue;
    }
    
    // Check for phase header
    if (PHASE_HEADER_PATTERN.test(trimmedLine)) {
      flushTextBlock();
      blocks.push({
        type: 'phase_header',
        content: trimmedLine.replace(/^#+\s*/, '')
      });
      continue;
    }
    
    // Check for section header
    if (SECTION_HEADER_PATTERN.test(trimmedLine)) {
      flushTextBlock();
      blocks.push({
        type: 'section_header',
        content: trimmedLine.replace(/^#+\s*/, '')
      });
      continue;
    }
    
    // Check for file reference
    const fileRefMatch = trimmedLine.match(FILE_REFERENCE_PATTERN);
    if (fileRefMatch) {
      flushTextBlock();
      pendingFileReference = fileRefMatch[1].trim();
      blocks.push({
        type: 'file_reference',
        content: pendingFileReference
      });
      continue;
    }
    
    // Also check for standalone file paths
    if (/^`?(?:src\/|supabase\/|public\/)[^\s`]+\.(tsx?|jsx?|css|json|md|sql)`?$/.test(trimmedLine)) {
      flushTextBlock();
      const filename = trimmedLine.replace(/`/g, '');
      pendingFileReference = filename;
      blocks.push({
        type: 'file_reference',
        content: filename
      });
      continue;
    }
    
    // Check for agent action (complete)
    if (AGENT_COMPLETE_PATTERN.test(trimmedLine)) {
      flushTextBlock();
      blocks.push({
        type: 'agent_action',
        content: trimmedLine,
        actionStatus: 'complete'
      });
      continue;
    }
    
    // Check for agent action (in progress)
    if (AGENT_PROGRESS_PATTERN.test(trimmedLine)) {
      flushTextBlock();
      blocks.push({
        type: 'agent_action',
        content: trimmedLine,
        actionStatus: 'in_progress'
      });
      continue;
    }
    
    // Check for user action
    if (USER_ACTION_PATTERN.test(trimmedLine)) {
      flushTextBlock();
      blocks.push({
        type: 'user_action',
        content: trimmedLine
      });
      continue;
    }
    
    // Check for note
    if (NOTE_PATTERN.test(trimmedLine)) {
      flushTextBlock();
      blocks.push({
        type: 'note',
        content: trimmedLine.replace(/^(?:Note:|Important:|Warning:)\s*/i, ''),
        noteType: detectNoteType(trimmedLine)
      });
      continue;
    }
    
    // Check for list items - collect consecutive items
    if (LIST_ITEM_PATTERN.test(trimmedLine)) {
      // Collect all consecutive list items
      let listContent = trimmedLine;
      while (i + 1 < lines.length && LIST_ITEM_PATTERN.test(lines[i + 1].trim())) {
        i++;
        listContent += '\n' + lines[i].trim();
      }
      flushTextBlock();
      blocks.push({
        type: 'list',
        content: listContent
      });
      continue;
    }
    
    // Regular text - accumulate
    if (trimmedLine || currentTextBlock) {
      currentTextBlock += (currentTextBlock ? '\n' : '') + line;
    }
  }
  
  // Flush any remaining text
  flushTextBlock();
  
  // Clean up empty blocks and merge adjacent text blocks
  return blocks.filter(block => block.content.trim() !== '');
}
