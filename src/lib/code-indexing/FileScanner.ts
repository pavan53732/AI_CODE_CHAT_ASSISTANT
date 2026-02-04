import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  IFileScanner,
  ScanOptions,
  ScanProgress,
  ScanResult,
  FileMetadata,
  DirectoryMetadata
} from './FileScanner.interface';

// Re-export interfaces for backward compatibility
export type {
  ScanOptions,
  ScanProgress,
  ScanResult,
  FileMetadata,
  DirectoryMetadata,
  IFileScanner
};

/**
 * FileScanner - Recursive file system scanner for code indexing
 * Supports 100K+ files with progress tracking
 * Implements IFileScanner interface contract
 */
export class FileScanner implements IFileScanner {
  private ignorePatterns: RegExp[];
  private fileExtensions: Set<string> | null;
  private includeHidden: boolean;
  private maxDepth: number;
  private onProgress?: (progress: ScanProgress) => void;
  private stats: {
    filesScanned: number;
    directoriesScanned: number;
    totalSize: number;
    startTime: number;
  };

  private languageMap: Record<string, string> = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.go': 'Go',
    '.rs': 'Rust',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C',
    '.hpp': 'C++',
    '.cs': 'C#',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.swift': 'Swift',
    '.objc': 'Objective-C',
    '.m': 'Objective-C',
    '.sh': 'Shell',
    '.bash': 'Shell',
    '.zsh': 'Shell',
    '.fish': 'Shell',
    '.ps1': 'PowerShell',
    '.sql': 'SQL',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'Sass',
    '.less': 'Less',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.xml': 'XML',
    '.toml': 'TOML',
    '.ini': 'INI',
    '.conf': 'Config',
    '.md': 'Markdown',
    '.rst': 'reStructuredText',
    '.txt': 'Text',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    '.astro': 'Astro',
  };

  private binaryExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv',
    '.mp3', '.wav', '.ogg', '.flac', '.aac',
    '.zip', '.tar', '.gz', '.7z', '.rar',
    '.exe', '.dll', '.so', '.dylib',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.class', '.jar', '.war', '.ear',
    '.pyc', '.pyo',
  ]);

  constructor(options: ScanOptions) {
    this.ignorePatterns = this.compileIgnorePatterns(options.ignorePatterns || []);
    this.fileExtensions = options.fileExtensions ? new Set(options.fileExtensions) : null;
    this.includeHidden = options.includeHidden || false;
    this.maxDepth = options.maxDepth || 100;
    this.onProgress = options.onProgress;
    this.stats = {
      filesScanned: 0,
      directoriesScanned: 0,
      totalSize: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Scan a single file and return metadata
   * Implements IFileScanner.scanFile contract
   */
  scanFile(filePath: string): FileMetadata | null {
    const basename = path.basename(filePath);

    // Check if file should be ignored
    if (this.shouldIgnore(filePath, false)) {
      return null;
    }

    try {
      // Get file stats
      const stats = fs.statSync(filePath);
      this.stats.filesScanned++;
      this.stats.totalSize += stats.size;

      // Detect language and binary status
      const language = this.detectLanguage(filePath);
      const isBinary = this.isBinary(filePath, stats.size);

      // Create file metadata
      const metadata: FileMetadata = {
        path: filePath,
        name: basename,
        extension: path.extname(filePath),
        size: stats.size,
        language,
        lastModified: stats.mtime,
        isBinary,
      };

      return metadata;
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Scan multiple files in batch for better performance
   * Implements IFileScanner.scanBatch contract
   */
  scanBatch(filePaths: string[]): Array<FileMetadata | null> {
    return filePaths.map(filePath => this.scanFile(filePath));
  }

  /**
   * Get current scanner statistics
   * Implements IFileScanner.getStats contract
   */
  getStats(): {
    filesScanned: number;
    directoriesScanned: number;
    totalSize: number;
    startTime: number;
  } {
    return {
      filesScanned: this.stats.filesScanned,
      directoriesScanned: this.stats.directoriesScanned,
      totalSize: this.stats.totalSize,
      startTime: this.stats.startTime,
    };
  }

  /**
   * Close scanner and release any held resources
   * Implements IFileScanner.close contract
   */
  close(): void {
    // Currently no resources to release
    // FileScanner uses sync file operations that don't need explicit cleanup
    // This method is provided for interface compliance
  }

  /**
   * Reset scanner state for reuse
   * Implements IFileScanner.reset contract
   */
  reset(): void {
    this.stats = {
      filesScanned: 0,
      directoriesScanned: 0,
      totalSize: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Compile ignore patterns into RegExp
   */
  private compileIgnorePatterns(patterns: string[]): RegExp[] {
    return patterns.map(pattern => {
      // Convert glob pattern to RegExp
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      return new RegExp(regexPattern);
    });
  }

  /**
   * Check if a path should be ignored
   */
  private shouldIgnore(filePath: string, isDirectory: boolean): boolean {
    // Check if hidden file/directory
    const basename = path.basename(filePath);
    if (!this.includeHidden && basename.startsWith('.')) {
      return true;
    }

    // Check node_modules and other common ignores
    if (basename === 'node_modules' || basename === '.git' || basename === '.next') {
      return true;
    }

    // Check custom ignore patterns
    for (const pattern of this.ignorePatterns) {
      if (pattern.test(filePath)) {
        return true;
      }
    }

    // Check file extension filter (only for files)
    if (!isDirectory && this.fileExtensions) {
      const ext = path.extname(filePath).toLowerCase();
      if (!this.fileExtensions.has(ext)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return this.languageMap[ext] || 'Unknown';
  }

  /**
   * Check if file is binary
   */
  private isBinary(filePath: string, size: number): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (this.binaryExtensions.has(ext)) {
      return true;
    }

    // For files smaller than 10KB, check content
    if (size < 10240) {
      try {
        const buffer = Buffer.alloc(Math.min(size, 1024));
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, buffer.length, 0);
        fs.closeSync(fd);

        // Check for null bytes (indicator of binary)
        if (buffer.includes(0)) {
          return true;
        }
      } catch (error) {
        // If we can't read the file, assume binary
        return true;
      }
    }

    return false;
  }

  /**
   * Scan a directory recursively
   */
  private async scanDirectory(
    dirPath: string,
    depth: number = 0
  ): Promise<{ files: FileMetadata[]; directories: DirectoryMetadata[]; languages: Record<string, number> }> {
    if (depth > this.maxDepth) {
      return { files: [], directories: [], languages: {} };
    }

    const files: FileMetadata[] = [];
    const directories: DirectoryMetadata[] = [];
    const languages: Record<string, number> = {};

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (this.shouldIgnore(fullPath, entry.isDirectory())) {
          continue;
        }

        if (entry.isDirectory()) {
          this.stats.directoriesScanned++;
          
          // Scan subdirectory
          const result = await this.scanDirectory(fullPath, depth + 1);
          files.push(...result.files);
          directories.push(...result.directories);

          // Add directory metadata
          const dirMetadata: DirectoryMetadata = {
            path: fullPath,
            name: entry.name,
            fileCount: result.files.length,
            size: result.files.reduce((sum, f) => sum + f.size, 0),
            depth,
          };
          directories.push(dirMetadata);

          // Aggregate languages
          for (const [lang, count] of Object.entries(result.languages)) {
            languages[lang] = (languages[lang] || 0) + count;
          }
        } else if (entry.isFile()) {
          this.stats.filesScanned++;
          
          // Get file stats
          const stats = fs.statSync(fullPath);
          this.stats.totalSize += stats.size;

          // Detect language and binary status
          const language = this.detectLanguage(fullPath);
          const isBinary = this.isBinary(fullPath, stats.size);

          // Add file metadata
          const fileMetadata: FileMetadata = {
            path: fullPath,
            name: entry.name,
            extension: path.extname(fullPath),
            size: stats.size,
            language,
            lastModified: stats.mtime,
            isBinary,
          };
          files.push(fileMetadata);

          // Track languages
          languages[language] = (languages[language] || 0) + 1;

          // Report progress
          if (this.onProgress && this.stats.filesScanned % 100 === 0) {
            this.onProgress({
              filesScanned: this.stats.filesScanned,
              directoriesScanned: this.stats.directoriesScanned,
              totalSize: this.stats.totalSize,
              currentPath: fullPath,
              isComplete: false,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }

    return { files, directories, languages };
  }

  /**
   * Execute the scan
   */
  async scan(): Promise<ScanResult> {
    this.stats = {
      filesScanned: 0,
      directoriesScanned: 0,
      totalSize: 0,
      startTime: Date.now(),
    };

    const { files, directories, languages } = await this.scanDirectory('', 0);

    const scanResult: ScanResult = {
      files,
      totalFiles: this.stats.filesScanned,
      totalSize: this.stats.totalSize,
      directories,
      languages,
      scanDuration: Date.now() - this.stats.startTime,
    };

    // Report final progress
    if (this.onProgress) {
      this.onProgress({
        filesScanned: this.stats.filesScanned,
        directoriesScanned: this.stats.directoriesScanned,
        totalSize: this.stats.totalSize,
        currentPath: '',
        isComplete: true,
      });
    }

    return scanResult;
  }
}

/**
 * Helper function to load .gitignore patterns
 */
export function loadGitignorePatterns(rootPath: string): string[] {
  const gitignorePath = path.join(rootPath, '.gitignore');
  const patterns = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '.cache',
    'coverage',
    '.vscode',
    '.idea',
    '*.log',
    'tmp',
    'temp',
  ];

  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      patterns.push(...lines);
    } catch (error) {
      console.error('Error reading .gitignore:', error);
    }
  }

  return patterns;
}
