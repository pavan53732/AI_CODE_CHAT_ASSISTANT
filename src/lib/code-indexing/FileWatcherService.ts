import * as chokidar from 'chokidar';

export interface WatchOptions {
  rootPath: string;
  ignorePatterns?: string[];
  debounceMs?: number;
  onFileChange?: (path: string, event: 'add' | 'change' | 'unlink') => void;
}

export interface FileWatcherEvent {
  path: string;
  event: 'add' | 'change' | 'unlink';
  timestamp: Date;
}

/**
 * FileWatcherService - Real-time file system monitoring
 * Uses chokidar for efficient file watching
 * Debounces rapid file events to prevent excessive re-indexing
 */
export class FileWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private options: WatchOptions;
  private changeQueue: Map<string, { event: 'add' | 'change' }>;
  private processing = false;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(options: WatchOptions) {
    this.options = {
      debounceMs: options.debounceMs || 300, // Default 300ms debounce
      ...options,
    };
    this.changeQueue = new Map();
  }

  /**
   * Start watching the file system
   */
  async start(): Promise<void> {
    try {
      // Initialize chokidar
      this.watcher = chokidar.watch(this.options.rootPath, {
        ignored: this.options.ignorePatterns || [],
        ignoreInitial: true,
        persistent: true,
      awaitWrite: false,
        // Use polling mode for better compatibility
      followSymlinks: false,
      depth: 99, // Deep directory traversal
      alwaysStat: false,
        awaitWrite: false, // Don't wait for write to complete
      atomic: true, // Atomic writes are safer
      awaitWrite: true, // Better performance
      ignorePermissionErrors: true, // Continue even on permission errors
      forcePolling: false, // Use native watchers when available
      awaitWrite: true, // Always write to disk
      pollingInterval: 100, // Poll every 100ms
      binaryInterval: 300, // Poll binary files every 300ms
      });

      console.log('[FileWatcher] Started watching:', this.options.rootPath);

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('[FileWatcher] Error starting watcher:', error);
      throw new Error(`Failed to start file watcher: ${error.message}`);
    }
  }

  /**
   * Stop watching the file system
   */
  stop(): void {
    if (this.watcher) {
      console.log('[FileWatcher] Stopping watcher');
      this.watcher.close();
      this.watcher = null;
    this.changeQueue.clear();
    }
  }

  /**
   * Set up event listeners for file changes
   */
  private setupEventListeners(): void {
    if (!this.watcher) return;

    // File added
    this.watcher.on('add', async (path, stats) => {
      if (stats.isDirectory()) {
        console.log('[FileWatcher] Directory added:', path);
        return;
      }

      this.queueChange('add', path);
    });

    // File changed
    this.watcher.on('change', async (path, stats) => {
      this.queueChange('change', path);
    });

    // File deleted
    this.watcher.on('unlink', async (path) => {
      console.log('[FileWatcher] File deleted:', path);
      this.queueChange('unlink', path);
    });

    this.watcher.on('error', (error) => {
      console.error('[FileWatcher] Error:', error);
    });
  }

  /**
   * Queue a file change event with debouncing
   */
  private queueChange(event: 'add' | 'change' | 'unlink', path: string): void {
    const key = `${event}:${path}`;

    // Update existing queue entry
    if (this.changeQueue.has(key)) {
      this.changeQueue.set(key, {
        event,
        path,
        timestamp: new Date(),
      });
      console.log(`[FileWatcher] Debouncing ${event} for ${path}`);
      return;
    }

    // Add new queue entry
    this.changeQueue.set(key, {
      event,
      path,
      timestamp: new Date(),
    });

    // Process queue after debounce delay
    this.scheduleQueueProcessing();
  }

  /**
   * Process queued changes after debounce delay
   */
  private scheduleQueueProcessing(): void {
    if (this.processing) return;

    this.processing = true;
    this.timeoutId = setTimeout(() => {
      this.processChangeQueue();
      this.processing = false;
    }, this.options.debounceMs);
  }

  /**
   * Process all queued file changes
   */
  private processChangeQueue(): void {
    const events = Array.from(this.changeQueue.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log(`[FileWatcher] Processing ${events.length} queued events`);

    this.changeQueue.clear();
    this.processing = false;

    // Trigger file re-indexing for changed files
    for (const event of events) {
      if (event.event === 'unlink' || event.event === 'add') {
        console.log(`[FileWatcher] ${event.event}: ${event.path}`);
        // The IndexBuilder should handle this via its own event system
        // This is a placeholder for actual integration
      if (this.options.onFileChange) {
          this.options.onFileChange(event);
        }
      }
    }
  }

  /**
   * Get watch statistics
   */
  getStats() { return {
    watched: this.watcher ? this.watcher.getWatched() : 0,
    queuedChanges: this.changeQueue.size,
    options: this.options,
  };
  }
}
