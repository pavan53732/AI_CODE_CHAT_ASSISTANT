/**
 * Call-Trace Capture for IndexBuilder
 * Logs all IndexBuilder.scanDirectory() → FileScanner interactions
 * with trace IDs, resolved absolute paths, normalization steps, and per-file invocation order
 */

export interface TraceEntry {
  traceId: string;
  timestamp: string;
  operation: 'scan_start' | 'scan_file' | 'scan_file_result' | 'scan_directory' | 'scan_directory_end' | 'error';
  callerMethod: string;
  inputPath: string;
  resolvedPath: string;
  normalizationSteps: string[];
  result: {
    success: boolean;
    metadata?: any;
    error?: string;
  };
  executionTimeMs: number;
}

export interface TraceSummary {
  runId: string;
  startTime: string;
  endTime: string;
  totalDurationMs: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  traces: TraceEntry[];
  systemContext: {
    platform: string;
    arch: string;
    nodeVersion: string;
    cwd: string;
  };
}

class IndexBuilderTracer {
  private traces: TraceEntry[] = [];
  private traceCounter: number = 0;
  private startTime: number;
  private systemContext: any;

  constructor() {
    this.startTime = Date.now();
    this.systemContext = this.captureSystemContext();
  }

  /**
   * Capture system context
   */
  private captureSystemContext() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd(),
    };
  }

  /**
   * Generate unique trace ID
   */
  private generateTraceId(): string {
    this.traceCounter++;
    return `trace-${this.traceCounter}-${Date.now()}`;
  }

  /**
   * Log operation start
   */
  logOperationStart(
    operation: 'scan_start' | 'scan_directory',
    callerMethod: string,
    inputPath: string
  ): string {
    const traceId = this.generateTraceId();
    const timestamp = new Date().toISOString();

    const entry: TraceEntry = {
      traceId,
      timestamp,
      operation,
      callerMethod,
      inputPath,
      resolvedPath: inputPath, // Initial value, will be updated during normalization
      normalizationSteps: [],
      result: { success: false },
      executionTimeMs: 0,
    };

    this.traces.push(entry);
    console.log(`[TRACE] ${traceId} | ${operation} | ${callerMethod} | ${inputPath}`);

    return traceId;
  }

  /**
   * Log file scanning
   */
  logScanFile(callerMethod: string, inputPath: string, resolvedPath: string, metadata: any, executionTimeMs: number): void {
    const traceId = this.generateTraceId();
    const timestamp = new Date().toISOString();

    const entry: TraceEntry = {
      traceId,
      timestamp,
      operation: 'scan_file',
      callerMethod,
      inputPath,
      resolvedPath,
      normalizationSteps: [
        `resolve: ${inputPath} → ${resolvedPath}`,
        `absolute: ${this.resolveAbsolutePath(resolvedPath)}`,
      ],
      result: {
        success: !!metadata,
        metadata,
      },
      executionTimeMs,
    };

    this.traces.push(entry);
  }

  /**
   * Log file scanning result
   */
  logScanFileResult(traceId: string, success: boolean, metadata: any, error?: string): void {
    const timestamp = new Date().toISOString();
    const existingTrace = this.traces.find(t => t.traceId === traceId);

    if (existingTrace) {
      existingTrace.result = { success, metadata, error };
      existingTrace.executionTimeMs = Date.now() - new Date(existingTrace.timestamp).getTime();

      console.log(`[TRACE] ${traceId} | scan_file_result | success=${success} | ${executionTimeMs}ms`);
    }
  }

  /**
   * Log directory scanning
   */
  logScanDirectory(callerMethod: string, inputPath: string, resolvedPath: string): void {
    const traceId = this.generateTraceId();
    const timestamp = new Date().toISOString();

    const entry: TraceEntry = {
      traceId,
      timestamp,
      operation: 'scan_directory',
      callerMethod,
      inputPath,
      resolvedPath,
      normalizationSteps: [
        `resolve: ${inputPath} → ${resolvedPath}`,
        `absolute: ${this.resolveAbsolutePath(resolvedPath)}`,
      ],
      result: { success: false },
      operation: 'scan_directory',
      executionTimeMs: 0,
    };

    this.traces.push(entry);
    console.log(`[TRACE] ${traceId} | scan_directory | ${callerMethod} | ${resolvedPath}`);
  }

  /**
   * Log error
   */
  logError(operation: string, callerMethod: string, inputPath: string, error: string): void {
    const traceId = this.generateTraceId();
    const timestamp = new Date().toISOString();

    const entry: TraceEntry = {
      traceId,
      timestamp,
      operation: 'error',
      callerMethod,
      inputPath,
      resolvedPath: inputPath,
      normalizationSteps: [`error: ${error}`],
      result: {
        success: false,
        error,
      },
      executionTimeMs: 0,
    };

    this.traces.push(entry);
    console.error(`[TRACE ERROR] ${traceId} | ${operation} | ${callerMethod} | ${inputPath} | ${error}`);
  }

  /**
   * Resolve absolute path
   */
  private resolveAbsolutePath(pathToResolve: string): string {
    if (path.isAbsolute(pathToResolve)) {
      return pathToResolve;
    }
    return path.resolve(process.cwd(), pathToResolve);
  }

  /**
   * Normalize path
   */
  normalizePath(inputPath: string): {
    absolutePath: string;
    steps: string[];
  } {
    const steps: string[] = [];
    const absolutePath = this.resolveAbsolutePath(inputPath);

    steps.push(`input: ${inputPath}`);
    steps.push(`resolved: ${absolutePath}`);

    return { absolutePath, steps };
  }

  /**
   * Get trace summary
   */
  getSummary(): TraceSummary {
    const endTime = new Date().toISOString();
    const totalDurationMs = Date.now() - this.startTime;

    const successfulOperations = this.traces.filter(t => t.result.success).length;
    const failedOperations = this.traces.filter(t => !t.result.success).length;

    return {
      runId: `trace-${Date.now()}`,
      startTime: new Date(this.startTime).toISOString(),
      endTime,
      totalDurationMs,
      totalOperations: this.traces.length,
      successfulOperations,
      failedOperations,
      traces: this.traces,
      systemContext: this.systemContext,
    };
  }

  /**
   * Save trace to JSON file
   */
  async saveTrace(outputPath: string): Promise<void> {
    const summary = this.getSummary();
    const fs = await import('fs');
    const path = await import('path');

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, JSON.stringify(summary, null, 2));

    console.log(`[TRACE] Saved ${this.traces.length} trace entries to ${outputPath}`);
  }

  /**
   * Reset tracer
   */
  reset(): void {
    this.traces = [];
    this.traceCounter = 0;
    this.startTime = Date.now();
  }

  /**
   * Get current trace count
   */
  getTraceCount(): number {
    return this.traces.length;
  }
}

// Export singleton instance
export const indexBuilderTracer = new IndexBuilderTracer();

/**
 * Helper function to wrap FileScanner methods with tracing
 */
export function wrapFileScannerWithTrace(
  originalScanFile: (filePath: string) => any,
  originalScanBatch: (filePaths: string[]) => any
) {
  const tracer = indexBuilderTracer;

  // Wrap scanFile
  const tracedScanFile = (filePath: string) => {
    const startTime = Date.now();
    const { absolutePath, steps } = tracer.normalizePath(filePath);

    tracer.logScanFile('FileScanner.scanFile', filePath, absolutePath, null, 0);

    try {
      const result = originalScanFile(filePath);

      const executionTimeMs = Date.now() - startTime;
      tracer.logScanFileResult(
        traces.findLast((t: any) => t.traceId)!,
        !!result,
        result,
      );

      return result;
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      tracer.logError('FileScanner.scanFile', 'FileScanner.scanFile', filePath, (error as Error).message);

      throw error;
    }
  };

  // Wrap scanBatch
  const tracedScanBatch = (filePaths: string[]) => {
    const startTime = Date.now();
    const traceId = tracer.logOperationStart('scan_directory', 'FileScanner.scanBatch', filePaths[0]);

    for (const filePath of filePaths) {
      const { absolutePath, steps } = tracer.normalizePath(filePath);
      tracer.logScanFile('FileScanner.scanBatch', filePath, absolutePath, null, 0);

      try {
        originalScanFile(filePath);
      } catch (error) {
        tracer.logError('FileScanner.scanBatch', 'FileScanner.scanBatch', filePath, (error as Error).message);
      }
    }

    const executionTimeMs = Date.now() - startTime;

    // Update all file scan results with batch completion time
    for (const entry of tracer.traces.slice(-filePaths.length)) {
      if (entry.operation === 'scan_file') {
        (entry as any).result.executionTimeMs = Math.floor(executionTimeMs / filePaths.length);
      }
    }

    return originalScanBatch(filePaths);
  };

  return {
    tracedScanFile,
    tracedScanBatch,
    tracer,
  };
}
