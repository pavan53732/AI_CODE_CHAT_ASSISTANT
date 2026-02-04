import * as fs from 'fs';
import * as path from 'path';
import { FileMetadata } from './FileScanner';

export interface ExtractionOptions {
  maxFileSize?: number;
  includeComments?: boolean;
  extractFunctions?: boolean;
  extractClasses?: boolean;
  extractImports?: boolean;
  extractExports?: boolean;
  chunkSize?: number; // Size in bytes for chunking (default: 10KB)
}

export interface ChunkInfo {
  chunkNumber: number;
  chunkIndex: number;
  chunkCount: number;
  content: string;
  startOffset: number;
  endOffset: number;
}

export interface ExtractedContent {
  metadata: FileMetadata;
  content: string;
  language: string;
  lineCount: number;
  characterCount: number;
  functions?: FunctionInfo[];
  classes?: ClassInfo[];
  imports?: ImportInfo[];
  exports?: ExportInfo[];
  comments?: CommentInfo[];
  structure?: CodeStructure;
  chunks?: ChunkInfo[];  // New: chunked file information
}

export interface FunctionInfo {
  name: string;
  line: number;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  docstring?: string;
}

export interface ClassInfo {
  name: string;
  line: number;
  methods: FunctionInfo[];
  extends?: string;
  implements?: string[];
  docstring?: string;
}

export interface ImportInfo {
  module: string;
  items?: string[];
  line: number;
  isDynamic: boolean;
}

export interface ExportInfo {
  name: string;
  line: number;
  type: 'default' | 'named' | 'all';
}

export interface CommentInfo {
  line: number;
  text: string;
  type: 'single' | 'multi' | 'doc';
}

export interface CodeStructure {
  blocks: CodeBlock[];
  complexity: number;
  nestingDepth: number;
}

export interface CodeBlock {
  type: 'function' | 'class' | 'if' | 'for' | 'while' | 'try' | 'switch';
  line: number;
  name?: string;
  depth: number;
}

/**
 * ContentExtractor - Extracts and analyzes code content from files
 */
export class ContentExtractor {
  private options: ExtractionOptions;

  constructor(options: ExtractionOptions = {}) {
    this.options = {
      maxFileSize: options.maxFileSize || 1024 * 1024, // 1MB default
      includeComments: options.includeComments ?? true,
      extractFunctions: options.extractFunctions ?? true,
      extractClasses: options.extractClasses ?? true,
      extractImports: options.extractImports ?? true,
      extractExports: options.extractExports ?? true,
      chunkSize: options.chunkSize || 10 * 1024, // 10KB default for chunking
    };
  }

  /**
   * Extract content from a single file
   */
  extractFile(fileMetadata: FileMetadata): ExtractedContent | null {
    try {
      // Check file size
      if (fileMetadata.size > (this.options.maxFileSize || Infinity)) {
        console.warn(`File too large to extract: ${fileMetadata.path}`);
        return null;
      }

      // Skip binary files
      if (fileMetadata.isBinary) {
        return null;
      }

      // Read file content
      const content = fs.readFileSync(fileMetadata.path, 'utf-8');
      const lines = content.split('\n');

      const extractedContent: ExtractedContent = {
        metadata: fileMetadata,
        content,
        language: fileMetadata.language,
        lineCount: lines.length,
        characterCount: content.length,
      };

      // Extract code structure based on language
      if (this.options.extractImports) {
        extractedContent.imports = this.extractImports(content, fileMetadata.language);
      }

      if (this.options.extractExports) {
        extractedContent.exports = this.extractExports(content, fileMetadata.language);
      }

      if (this.options.extractFunctions) {
        extractedContent.functions = this.extractFunctions(content, fileMetadata.language);
      }

      if (this.options.extractClasses) {
        extractedContent.classes = this.extractClasses(content, fileMetadata.language);
      }

      if (this.options.includeComments) {
        extractedContent.comments = this.extractComments(content, fileMetadata.language);
      }

      extractedContent.structure = this.analyzeStructure(content);

      return extractedContent;
    } catch (error) {
      console.error(`Error extracting content from ${fileMetadata.path}:`, error);
      return null;
    }
  }

  /**
   * Extract content from multiple files
   */
  extractFiles(fileMetadatas: FileMetadata[]): ExtractedContent[] {
    const results: ExtractedContent[] = [];

    for (const fileMetadata of fileMetadatas) {
      const extracted = this.extractFile(fileMetadata);
      if (extracted) {
        results.push(extracted);
      }
    }

    return results;
  }

  /**
   * Extract imports from code
   */
  private extractImports(content: string, language: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = content.split('\n');
    const importPatterns = this.getImportPatterns(language);

    lines.forEach((line, index) => {
      for (const pattern of importPatterns) {
        const match = line.match(pattern);
        if (match) {
          imports.push({
            module: match[1],
            items: match[2]?.split(',').map(s => s.trim()) || undefined,
            line: index + 1,
            isDynamic: line.includes('import('),
          });
          break;
        }
      }
    });

    return imports;
  }

  /**
   * Get import patterns for different languages
   */
  private getImportPatterns(language: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      JavaScript: [
        /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/,
        /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/,
        /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/,
        /import\(['"]([^'"]+)['"]\)/,
      ],
      TypeScript: [
        /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/,
        /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/,
        /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/,
        /import\(['"]([^'"]+)['"]\)/,
      ],
      Python: [
        /from\s+(\S+)\s+import\s+(.+)/,
        /import\s+(\S+)/,
      ],
      Go: [
        /import\s+['"]([^'"]+)['"]/,
      ],
      Java: [
        /import\s+([^;]+);/,
      ],
    };

    return patterns[language] || [];
  }

  /**
   * Extract exports from code
   */
  private extractExports(content: string, language: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const lines = content.split('\n');

    if (language === 'JavaScript' || language === 'TypeScript' || language === 'TypeScript') {
      lines.forEach((line, index) => {
        // Default export
        const defaultMatch = line.match(/export\s+default\s+(class|function|const|let|var)?\s*(\w+)?/);
        if (defaultMatch) {
          exports.push({
            name: defaultMatch[2] || 'default',
            line: index + 1,
            type: 'default',
          });
        }

        // Named export
        const namedMatch = line.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/);
        if (namedMatch) {
          exports.push({
            name: namedMatch[1],
            line: index + 1,
            type: 'named',
          });
        }

        // Export block
        const blockMatch = line.match(/export\s*{([^}]+)}/);
        if (blockMatch) {
          const items = blockMatch[1].split(',').map(s => s.trim());
          items.forEach(item => {
            exports.push({
              name: item,
              line: index + 1,
              type: 'named',
            });
          });
        }
      });
    } else if (language === 'Python') {
      lines.forEach((line, index) => {
        const match = line.match(/^__all__\s*=\s*\[([^\]]+)\]/);
        if (match) {
          const items = match[1]
            .split(',')
            .map(s => s.trim().replace(/['"]/g, ''));
          items.forEach(item => {
            exports.push({
              name: item,
              line: index + 1,
              type: 'named',
            });
          });
        }
      });
    }

    return exports;
  }

  /**
   * Extract functions from code
   */
  private extractFunctions(content: string, language: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = content.split('\n');

    if (language === 'JavaScript' || language === 'TypeScript' || language === 'TypeScript') {
      lines.forEach((line, index) => {
        // Function declaration
        const funcMatch = line.match(
          /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/
        );
        if (funcMatch) {
          functions.push({
            name: funcMatch[1],
            line: index + 1,
            parameters: this.parseParameters(funcMatch[2]),
            isAsync: line.includes('async'),
            isExported: line.includes('export'),
          });
        }

        // Arrow function assignment
        const arrowMatch = line.match(
          /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*\w+)?\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/
        );
        if (arrowMatch) {
          functions.push({
            name: arrowMatch[1],
            line: index + 1,
            parameters: this.parseParameters(arrowMatch[2]),
            isAsync: line.includes('async'),
            isExported: line.includes('export'),
          });
        }
      });
    } else if (language === 'Python') {
      lines.forEach((line, index) => {
        const match = line.match(
          /(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*(\w+))?/
        );
        if (match) {
          functions.push({
            name: match[1],
            line: index + 1,
            parameters: this.parsePythonParameters(match[2]),
            returnType: match[3],
            isAsync: line.includes('async'),
            isExported: false, // Python doesn't have export in the same way
          });
        }
      });
    }

    return functions;
  }

  /**
   * Parse function parameters
   */
  private parseParameters(paramString: string): string[] {
    if (!paramString.trim()) {
      return [];
    }
    return paramString
      .split(',')
      .map(p => {
        const trimmed = p.trim();
        // Remove type annotations
        return trimmed.split(':')[0].trim();
      })
      .filter(p => p);
  }

  /**
   * Parse Python function parameters
   */
  private parsePythonParameters(paramString: string): string[] {
    if (!paramString.trim()) {
      return [];
    }
    return paramString
      .split(',')
      .map(p => {
        const trimmed = p.trim();
        // Remove type annotations and default values
        return trimmed.split(':')[0].split('=')[0].trim();
      })
      .filter(p => p);
  }

  /**
   * Extract classes from code
   */
  private extractClasses(content: string, language: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const lines = content.split('\n');

    if (language === 'JavaScript' || language === 'TypeScript' || language === 'TypeScript') {
      lines.forEach((line, index) => {
        const match = line.match(/class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/);
        if (match) {
          classes.push({
            name: match[1],
            line: index + 1,
            methods: [],
            extends: match[2],
            implements: match[3]?.split(',').map(s => s.trim()),
          });
        }
      });
    } else if (language === 'Python') {
      lines.forEach((line, index) => {
        const match = line.match(/class\s+(\w+)(?:\s*\(([^)]+)\))?/);
        if (match) {
          const bases = match[2]?.split(',').map(s => s.trim());
          classes.push({
            name: match[1],
            line: index + 1,
            methods: [],
            extends: bases?.[0],
          });
        }
      });
    }

    return classes;
  }

  /**
   * Extract comments from code
   */
  private extractComments(content: string, language: string): CommentInfo[] {
    const comments: CommentInfo[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (language === 'JavaScript' || language === 'TypeScript' || language === 'TypeScript') {
        // Single line comment
        if (trimmed.startsWith('//')) {
          comments.push({
            line: index + 1,
            text: trimmed.substring(2).trim(),
            type: 'single',
          });
        }
        // JSDoc comment (single line)
        if (trimmed.startsWith('/**')) {
          comments.push({
            line: index + 1,
            text: trimmed.substring(3, trimmed.length - 2).trim(),
            type: 'doc',
          });
        }
      } else if (language === 'Python') {
        // Python comment
        if (trimmed.startsWith('#')) {
          comments.push({
            line: index + 1,
            text: trimmed.substring(1).trim(),
            type: 'single',
          });
        }
      } else if (language === 'Go' || language === 'Java' || language === 'C' || language === 'C++') {
        // C-style comment
        if (trimmed.startsWith('//')) {
          comments.push({
            line: index + 1,
            text: trimmed.substring(2).trim(),
            type: 'single',
          });
        }
      }
    });

    return comments;
  }

  /**
   * Analyze code structure
   */
  private analyzeStructure(content: string): CodeStructure {
    const blocks: CodeBlock[] = [];
    const lines = content.split('\n');
    let maxDepth = 0;
    let currentDepth = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Count opening braces for depth
      const openBraces = (trimmed.match(/{/g) || []).length;
      const closeBraces = (trimmed.match(/}/g) || []).length;
      
      currentDepth += openBraces - closeBraces;
      maxDepth = Math.max(maxDepth, currentDepth);

      // Detect code blocks
      const blockPatterns = [
        { regex: /\b(if|else if|else)\s*\(/, type: 'if' },
        { regex: /\bfor\s*\(/, type: 'for' },
        { regex: /\bwhile\s*\(/, type: 'while' },
        { regex: /\btry\s*{/, type: 'try' },
        { regex: /\bswitch\s*\(/, type: 'switch' },
      ];

      for (const pattern of blockPatterns) {
        const match = trimmed.match(pattern.regex);
        if (match) {
          blocks.push({
            type: pattern.type as any,
            line: index + 1,
            depth: currentDepth,
          });
          break;
        }
      }
    });

    // Calculate complexity (simplified cyclomatic complexity)
    const complexity = this.calculateCyclomaticComplexity(content);

    return {
      blocks,
      complexity,
      nestingDepth: maxDepth,
    };
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateCyclomaticComplexity(content: string): number {
    const decisionPoints = content.match(/\b(if|else if|for|while|case|catch)\b/g) || [];
    return decisionPoints.length + 1;
  }

  /**
   * Chunk a file content into smaller pieces
   */
  private chunkContent(content: string): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    const contentLength = content.length;
    const chunkCount = Math.ceil(contentLength / this.options.chunkSize);

    for (let i = 0; i < chunkCount; i++) {
      const startOffset = i * this.options.chunkSize;
      const endOffset = Math.min(startOffset + this.options.chunkSize, contentLength);
      const chunkContent = content.slice(startOffset, endOffset);

      chunks.push({
        chunkNumber: i + 1,
        chunkIndex: i,
        chunkCount,
        content: chunkContent,
        startOffset,
        endOffset,
      });
    }

    return chunks;
  }

  /**
   * Extract and chunk a single file
   */
  extractAndChunkFile(fileMetadata: FileMetadata): ExtractedContent | null {
    try {
      // Check file size
      if (fileMetadata.size > (this.options.maxFileSize || Infinity)) {
        console.warn(`File too large to extract: ${fileMetadata.path}`);
        return null;
      }

      // Skip binary files
      if (fileMetadata.isBinary) {
        return null;
      }

      // Read file content
      const content = fs.readFileSync(fileMetadata.path, 'utf-8');
      const contentLength = content.length;

      // Determine if chunking is needed
      const needsChunking = contentLength > this.options.chunkSize;

      // Extract content structure
      const extractedContent: ExtractedContent = {
        metadata: fileMetadata,
        content,
        language: fileMetadata.language,
        lineCount: content.split('\n').length,
        characterCount: content.length,
      };

      // Extract code structure based on language
      if (this.options.extractImports) {
        extractedContent.imports = this.extractImports(content, fileMetadata.language);
      }
      if (this.options.extractExports) {
        extractedContent.exports = this.extractExports(content, fileMetadata.language);
      }
      if (this.options.extractFunctions) {
        extractedContent.functions = this.extractFunctions(content, fileMetadata.language);
      }
      if (this.options.extractClasses) {
        extractedContent.classes = this.extractClasses(content, fileMetadata.language);
      }
      if (this.options.includeComments) {
        extractedContent.comments = this.extractComments(content, fileMetadata.language);
      }
      extractedContent.structure = this.analyzeStructure(content);

      // Add chunks if file is large enough
      if (needsChunking) {
        extractedContent.chunks = this.chunkContent(content);
      }

      return extractedContent;
    } catch (error) {
      console.error(`Error extracting content from ${fileMetadata.path}:`, error);
      return null;
    }
  }
}
