// Content Chunker
// Handles large files by splitting into manageable chunks
// NO file size limit - chunking handles large files

export interface Chunk {
  content: string;
  startLine: number;
  endLine: number;
  chunkIndex: number;
  totalChunks: number;
  metadata: {
    functionNames?: string[];
    classNames?: string[];
    imports?: string[];
  };
}

export interface ChunkOptions {
  maxChunkSize?: number; // Default: 4000 characters
  overlapLines?: number; // Default: 5 lines overlap
  preserveBoundaries?: boolean; // Keep function/class boundaries
}

/**
 * ContentChunker - Splits large files into manageable chunks
 * Supports unlimited file sizes through intelligent chunking
 */
export class ContentChunker {
  private options: Required<ChunkOptions>;

  constructor(options: ChunkOptions = {}) {
    this.options = {
      maxChunkSize: options.maxChunkSize || 4000,
      overlapLines: options.overlapLines || 5,
      preserveBoundaries: options.preserveBoundaries ?? true,
    };
  }

  /**
   * Chunk content into manageable pieces
   * NO FILE SIZE LIMIT - handles any size file
   */
  chunkContent(content: string, filePath: string): Chunk[] {
    const lines = content.split('\n');
    const totalLines = lines.length;

    // If content is small enough, return as single chunk
    if (content.length <= this.options.maxChunkSize) {
      return [{
        content,
        startLine: 1,
        endLine: totalLines,
        chunkIndex: 0,
        totalChunks: 1,
        metadata: this.extractMetadata(content),
      }];
    }

    const chunks: Chunk[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;
    let startLine = 1;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineSize = line.length + 1; // +1 for newline

      // Check if adding this line would exceed chunk size
      if (currentSize + lineSize > this.options.maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push(this.createChunk(currentChunk, startLine, i, chunkIndex, totalLines));

        // Start new chunk with overlap
        const overlapStart = Math.max(0, i - this.options.overlapLines);
        currentChunk = lines.slice(overlapStart, i + 1);
        currentSize = currentChunk.join('\n').length;
        startLine = overlapStart + 1;
        chunkIndex++;
      } else {
        currentChunk.push(line);
        currentSize += lineSize;
      }
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(currentChunk, startLine, totalLines, chunkIndex, totalLines));
    }

    // Update total chunks count
    chunks.forEach((chunk, idx) => {
      chunk.totalChunks = chunks.length;
      chunk.chunkIndex = idx;
    });

    return chunks;
  }

  /**
   * Create a chunk object
   */
  private createChunk(
    lines: string[],
    startLine: number,
    endLine: number,
    chunkIndex: number,
    totalLines: number
  ): Chunk {
    const content = lines.join('\n');
    return {
      content,
      startLine,
      endLine,
      chunkIndex,
      totalChunks: 0, // Will be updated later
      metadata: this.extractMetadata(content),
    };
  }

  /**
   * Extract metadata from chunk content
   */
  private extractMetadata(content: string): Chunk['metadata'] {
    const metadata: Chunk['metadata'] = {
      functionNames: [],
      classNames: [],
      imports: [],
    };

    // Extract function names
    const functionMatches = content.match(/(?:function|const|let|var)\s+(\w+)\s*\(/g);
    if (functionMatches) {
      metadata.functionNames = functionMatches.map(m => m.match(/\s+(\w+)\s*\(/)?.[1] || '').filter(Boolean);
    }

    // Extract class names
    const classMatches = content.match(/class\s+(\w+)/g);
    if (classMatches) {
      metadata.classNames = classMatches.map(m => m.match(/class\s+(\w+)/)?.[1] || '').filter(Boolean);
    }

    // Extract imports
    const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      metadata.imports = importMatches.map(m => m.match(/from\s+['"]([^'"]+)['"]/)?.[1] || '').filter(Boolean);
    }

    return metadata;
  }

  /**
   * Get chunk at specific line number
   */
  getChunkAtLine(chunks: Chunk[], lineNumber: number): Chunk | null {
    return chunks.find(chunk => lineNumber >= chunk.startLine && lineNumber <= chunk.endLine) || null;
  }

  /**
   * Merge chunks back together
   */
  mergeChunks(chunks: Chunk[]): string {
    return chunks.map(c => c.content).join('\n');
  }

  /**
   * Get total size of all chunks
   */
  getTotalSize(chunks: Chunk[]): number {
    return chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
  }

  /**
   * Estimate token count for chunks
   * ~4 characters per token (rough estimate)
   */
  estimateTokens(chunks: Chunk[]): number {
    return Math.ceil(this.getTotalSize(chunks) / 4);
  }
}

// Singleton instance
export const contentChunker = new ContentChunker();
