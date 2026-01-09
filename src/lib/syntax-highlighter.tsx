import React from 'react';

interface Token {
  type: 'keyword' | 'type' | 'string' | 'comment' | 'number' | 'jsx' | 'operator' | 'property' | 'function' | 'default';
  value: string;
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'import', 'export', 'from',
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'try', 'catch', 'finally', 'throw', 'async', 'await', 'class', 'extends',
  'new', 'this', 'super', 'static', 'get', 'set', 'default', 'typeof',
  'instanceof', 'in', 'of', 'delete', 'void', 'yield', 'true', 'false', 'null',
  'undefined', 'as', 'is'
]);

const TYPES = new Set([
  'string', 'number', 'boolean', 'object', 'any', 'void', 'never', 'unknown',
  'interface', 'type', 'enum', 'namespace', 'module', 'declare', 'readonly',
  'public', 'private', 'protected', 'abstract', 'implements', 'extends',
  'React', 'JSX', 'Element', 'FC', 'Component', 'Props', 'State',
  'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
  'Promise', 'Array', 'Object', 'Map', 'Set', 'Record', 'Partial', 'Required',
  'Omit', 'Pick', 'Exclude', 'Extract'
]);

const OPERATORS = new Set([
  '=', '+', '-', '*', '/', '%', '!', '&', '|', '^', '~', '<', '>', '?', ':',
  '==', '===', '!=', '!==', '<=', '>=', '&&', '||', '??', '?.', '=>', '...',
  '++', '--', '+=', '-=', '*=', '/='
]);

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < line.length) {
    // Skip whitespace but preserve it
    if (/\s/.test(line[i])) {
      let whitespace = '';
      while (i < line.length && /\s/.test(line[i])) {
        whitespace += line[i];
        i++;
      }
      tokens.push({ type: 'default', value: whitespace });
      continue;
    }
    
    // Comments
    if (line.slice(i, i + 2) === '//') {
      tokens.push({ type: 'comment', value: line.slice(i) });
      break;
    }
    
    // Block comment start
    if (line.slice(i, i + 2) === '/*') {
      const endIndex = line.indexOf('*/', i + 2);
      if (endIndex !== -1) {
        tokens.push({ type: 'comment', value: line.slice(i, endIndex + 2) });
        i = endIndex + 2;
      } else {
        tokens.push({ type: 'comment', value: line.slice(i) });
        break;
      }
      continue;
    }
    
    // Strings (single and double quotes)
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let str = quote;
      i++;
      while (i < line.length && line[i] !== quote) {
        if (line[i] === '\\' && i + 1 < line.length) {
          str += line[i] + line[i + 1];
          i += 2;
        } else {
          str += line[i];
          i++;
        }
      }
      if (i < line.length) {
        str += line[i];
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }
    
    // Numbers
    if (/\d/.test(line[i]) || (line[i] === '.' && /\d/.test(line[i + 1] || ''))) {
      let num = '';
      while (i < line.length && /[\d.xXa-fA-F]/.test(line[i])) {
        num += line[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }
    
    // JSX tags
    if (line[i] === '<' && /[A-Z]/.test(line[i + 1] || '')) {
      let jsx = '<';
      i++;
      while (i < line.length && /[\w.-]/.test(line[i])) {
        jsx += line[i];
        i++;
      }
      tokens.push({ type: 'jsx', value: jsx });
      continue;
    }
    
    // Closing JSX tags
    if (line.slice(i, i + 2) === '</' && /[A-Z]/.test(line[i + 2] || '')) {
      let jsx = '</';
      i += 2;
      while (i < line.length && /[\w.-]/.test(line[i])) {
        jsx += line[i];
        i++;
      }
      tokens.push({ type: 'jsx', value: jsx });
      continue;
    }
    
    // Self-closing tag end
    if (line.slice(i, i + 2) === '/>') {
      tokens.push({ type: 'jsx', value: '/>' });
      i += 2;
      continue;
    }
    
    // Identifiers (words)
    if (/[a-zA-Z_$]/.test(line[i])) {
      let word = '';
      while (i < line.length && /[\w$]/.test(line[i])) {
        word += line[i];
        i++;
      }
      
      // Check if it's followed by ( to detect function calls
      const isFunction = line[i] === '(';
      
      if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (TYPES.has(word)) {
        tokens.push({ type: 'type', value: word });
      } else if (isFunction) {
        tokens.push({ type: 'function', value: word });
      } else if (/^[A-Z]/.test(word)) {
        // PascalCase = likely a type or component
        tokens.push({ type: 'type', value: word });
      } else {
        tokens.push({ type: 'default', value: word });
      }
      continue;
    }
    
    // Multi-char operators
    const threeChar = line.slice(i, i + 3);
    const twoChar = line.slice(i, i + 2);
    
    if (OPERATORS.has(threeChar)) {
      tokens.push({ type: 'operator', value: threeChar });
      i += 3;
      continue;
    }
    
    if (OPERATORS.has(twoChar)) {
      tokens.push({ type: 'operator', value: twoChar });
      i += 2;
      continue;
    }
    
    if (OPERATORS.has(line[i])) {
      tokens.push({ type: 'operator', value: line[i] });
      i++;
      continue;
    }
    
    // Everything else
    tokens.push({ type: 'default', value: line[i] });
    i++;
  }
  
  return tokens;
}

const tokenColors: Record<Token['type'], string> = {
  keyword: 'text-blue-400',
  type: 'text-cyan-400',
  string: 'text-green-400',
  comment: 'text-slate-500 italic',
  number: 'text-orange-400',
  jsx: 'text-purple-400',
  operator: 'text-slate-300',
  property: 'text-slate-200',
  function: 'text-yellow-300',
  default: 'text-slate-200'
};

interface HighlightedCodeProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
}

export function HighlightedCode({ code, language, showLineNumbers = true }: HighlightedCodeProps) {
  const lines = code.split('\n');
  
  // For non-JS/TS languages, just show plain text with line numbers
  const shouldHighlight = ['typescript', 'javascript', 'tsx', 'jsx', 'ts', 'js'].includes(language.toLowerCase());
  
  return (
    <div className="font-mono text-sm overflow-x-auto">
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} className="flex hover:bg-white/5">
          {showLineNumbers && (
            <span className="w-10 flex-shrink-0 text-right pr-4 text-slate-500 select-none text-xs leading-6">
              {lineIndex + 1}
            </span>
          )}
          <span className="flex-1 leading-6">
            {shouldHighlight ? (
              tokenizeLine(line).map((token, tokenIndex) => (
                <span key={tokenIndex} className={tokenColors[token.type]}>
                  {token.value}
                </span>
              ))
            ) : (
              <span className="text-slate-200">{line || ' '}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
