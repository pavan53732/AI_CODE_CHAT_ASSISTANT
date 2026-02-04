/**
 * FileScanner Interface - Contract for file scanning operations
 * This interface MUST be implemented by all scanner classes
 */

export interface ScanOptions {
  rootPath: string;
  ignorePatterns?: string[];
  maxDepth?: number;
  includeHidden?: boolean;
  fileExtensions?: string[];
  onProgress?: (progress: ScanProgress) => void;
}

export interface ScanProgress {
  filesScanned: number;
  directoriesScanned: number;
  totalSize: number;
  currentPath: string;
  isComplete: boolean;
}

export interface ScanResult {
  files: FileMetadata[];
  totalFiles: number;
  totalSize: number;
  directories: DirectoryMetadata[];
  languages: Record<string, number>;
  scanDuration: number;
}

export interface FileMetadata {
  path: string;
  name: string;
  extension: string;
  size: number;
  language: string;
  lastModified: Date;
  isBinary: boolean;
}

export interface DirectoryMetadata {
  path: string;
  name: string;
  fileCount: number;
  size: number;
  depth: number;
}

/**
 * FileScanner Contract Interface
 * All methods MUST be callable at runtime and properly implemented
 */
export interface IFileScanner {
  /**
   * Scan a single file and return metadata
   * @param filePath - Full path to the file
   * @returns FileMetadata or null if file should be ignored
   */
  scanFile(filePath: string): FileMetadata | null;

  /**
   * Scan multiple files in batch for better performance
   * @param filePaths - Array of file paths to scan
   * @returns Array of FileMetadata or null for ignored files
   */
  scanBatch(filePaths: string[]): Array<FileMetadata | null>;

  /**
   * Scan entire directory structure recursively
   * @returns Complete scan result with all files and metadata
   */
  scan(): Promise<ScanResult>;

  /**
   * Close scanner and release any held resources
   * Must be called to prevent resource leaks
   */
  close(): void;

  /**
   * Reset scanner state for reuse
   * Allows scanner to be reused for multiple scans
   */
  reset(): void;

  /**
   * Get current scanner statistics
   */
  getStats(): {
    filesScanned: number;
    directoriesScanned: number;
    totalSize: number;
    startTime: number;
  };
}

/**
 * FileScanner Constructor Interface
 * All scanners MUST accept these options
 */
export interface IFileScannerConstructor {
  new (options: ScanOptions): IFileScanner;
}
