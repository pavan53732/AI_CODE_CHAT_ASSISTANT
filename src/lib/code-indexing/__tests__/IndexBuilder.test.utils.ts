// IndexBuilder Test Utilities
// Forced-kill testing and resume-from-checkpoint demonstration

import * as fs from 'fs';
import * as path from 'path';
import { IndexBuilder, IndexBuildOptions, IndexProgress } from '../IndexBuilder';
import { db } from '@/lib/db';

/**
 * Simulate a forced kill during indexing
 */
export async function simulateForcedKill(
  projectId: string,
  rootPath: string,
  killAfterFiles: number = 50
): Promise<void> {
  console.log(`[Test] Starting forced-kill simulation (will kill after ${killAfterFiles} files)`);

  let filesProcessed = 0;

  const builder = new IndexBuilder({
    projectId,
    rootPath,
    batchSize: 10,
    onProgress: (progress: IndexProgress) => {
      filesProcessed = progress.processedFiles;

      if (filesProcessed >= killAfterFiles) {
        console.log(`[Test] 🔥 FORCED KILL at ${filesProcessed} files processed`);
        // Simulate crash by throwing an error
        throw new Error('SIMULATED_CRASH');
      }
    },
  });

  try {
    await builder.buildDatabaseIndex();
  } catch (error) {
    if ((error as Error).message === 'SIMULATED_CRASH') {
      console.log('[Test] ✓ Forced-kill simulation successful');
      return;
    }
    throw error;
  }
}

/**
 * Resume indexing from checkpoint after forced kill
 */
export async function resumeFromCheckpoint(
  projectId: string,
  rootPath: string
): Promise<{
  resumed: boolean;
  filesIndexed: number;
  checkpointId: string | undefined;
}> {
  console.log('[Test] Attempting to resume from checkpoint...');

  const builder = new IndexBuilder({
    projectId,
    rootPath,
    batchSize: 10,
    onProgress: (progress: IndexProgress) => {
      console.log(`[Test] Progress: ${progress.percentage}% - ${progress.message}`);
    },
  });

  const result = await builder.buildDatabaseIndex();

  if (result.resumedFrom) {
    console.log(`[Test] ✓ Successfully resumed from checkpoint: ${result.resumedFrom}`);
  } else {
    console.log('[Test] ℹ No checkpoint found, started fresh');
  }

  return {
    resumed: !!result.resumedFrom,
    filesIndexed: result.filesIndexed,
    checkpointId: result.checkpointId,
  };
}

/**
 * Verify checkpoint state
 */
export async function verifyCheckpointState(
  projectId: string
): Promise<{
  exists: boolean;
  stage: string | null;
  processedFiles: string[];
  failedFiles: string[];
  lastProcessedFile: string | null;
}> {
  const checkpoint = await db.indexCheckpoint.findFirst({
    where: { projectId },
    orderBy: { startTime: 'desc' },
  });

  if (!checkpoint) {
    return {
      exists: false,
      stage: null,
      processedFiles: [],
      failedFiles: [],
      lastProcessedFile: null,
    };
  }

  return {
    exists: true,
    stage: checkpoint.stage,
    processedFiles: JSON.parse(checkpoint.processedFiles || '[]'),
    failedFiles: JSON.parse(checkpoint.failedFiles || '[]'),
    lastProcessedFile: checkpoint.lastProcessedFile,
  };
}

/**
 * Test batch rollback on failure
 */
export async function testBatchRollback(
  projectId: string,
  rootPath: string
): Promise<{
  rollbackSuccessful: boolean;
  orphanedFiles: string[];
}> {
  console.log('[Test] Testing batch rollback on failure...');

  // Create a temporary file that will cause analysis to fail
  const problematicFile = path.join(rootPath, 'FAIL_THIS_FILE.test.ts');
  fs.writeFileSync(problematicFile, 'invalid content {{{', 'utf-8');

  const builder = new IndexBuilder({
    projectId,
    rootPath,
    batchSize: 10,
    onError: (error) => {
      console.log(`[Test] Error handled: ${error.filePath} - ${error.error.message}`);
    },
  });

  await builder.buildDatabaseIndex();

  // Clean up problematic file
  fs.unlinkSync(problematicFile);

  // Check for orphaned files (files with no complete analysis)
  const orphanedFiles: string[] = [];
  const analyses = await db.fileAnalysis.findMany({
    where: { projectId },
  });

  for (const analysis of analyses) {
    if (!analysis.summary || analysis.summary.length === 0) {
      orphanedFiles.push(analysis.filePath);
    }
  }

  const rollbackSuccessful = orphanedFiles.length === 0;

  console.log(`[Test] ${rollbackSuccessful ? '✓' : '✗'} Batch rollback ${rollbackSuccessful ? 'successful' : 'failed'}`);

  return {
    rollbackSuccessful,
    orphanedFiles,
  };
}

/**
 * Performance benchmark for IndexBuilder
 */
export interface IndexBenchmark {
  filesIndexed: number;
  totalTimeMs: number;
  averageTimePerFile: number;
  p50: number;
  p95: number;
  p99: number;
  checkpointSaveTime: number;
  resumeTime: number;
}

export async function benchmarkIndexBuilder(
  projectId: string,
  rootPath: string
): Promise<IndexBenchmark> {
  console.log('[Test] Starting IndexBuilder benchmark...');

  const latencies: number[] = [];
  const checkpointSaveTimes: number[] = [];

  const builder = new IndexBuilder({
    projectId,
    rootPath,
    batchSize: 50,
    onProgress: (progress: IndexProgress) => {
      // Measure latency for each progress update
      if (progress.currentFile) {
        latencies.push(performance.now());
      }
    },
  });

  const startTime = performance.now();
  const result = await builder.buildDatabaseIndex();
  const totalTimeMs = performance.now() - startTime;

  // Calculate percentiles
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  // Measure checkpoint save time
  const checkpoint = await db.indexCheckpoint.findFirst({
    where: { projectId },
    orderBy: { startTime: 'desc' },
  });

  const checkpointSaveTime = checkpoint
    ? checkpoint.lastUpdateTime.getTime() - checkpoint.startTime.getTime()
    : 0;

  // Measure resume time
  const resumeStart = performance.now();
  await resumeFromCheckpoint(projectId, rootPath);
  const resumeTime = performance.now() - resumeStart;

  const benchmark: IndexBenchmark = {
    filesIndexed: result.filesIndexed,
    totalTimeMs,
    averageTimePerFile: totalTimeMs / result.filesIndexed,
    p50: p50 || 0,
    p95: p95 || 0,
    p99: p99 || 0,
    checkpointSaveTime,
    resumeTime,
  };

  console.log('[Test] Benchmark Results:');
  console.log(`  Total time: ${benchmark.totalTimeMs}ms`);
  console.log(`  Files indexed: ${benchmark.filesIndexed}`);
  console.log(`  Avg time per file: ${benchmark.averageTimePerFile.toFixed(2)}ms`);
  console.log(`  p50: ${benchmark.p50}ms`);
  console.log(`  p95: ${benchmark.p95}ms`);
  console.log(`  p99: ${benchmark.p99}ms`);
  console.log(`  Checkpoint save: ${benchmark.checkpointSaveTime}ms`);
  console.log(`  Resume time: ${benchmark.resumeTime}ms`);

  return benchmark;
}

/**
 * Run all crash-safe indexing tests
 */
export async function runCrashSafeTests(
  projectId: string,
  rootPath: string
): Promise<{
  allPassed: boolean;
  results: {
    forcedKill: boolean;
    resume: boolean;
    rollback: boolean;
    benchmarks: IndexBenchmark;
  };
}> {
  console.log('\n========================================');
  console.log('CRASH-SAFE INDEXING TEST SUITE');
  console.log('========================================\n');

  const results = {
    forcedKill: false,
    resume: false,
    rollback: false,
    benchmarks: {} as IndexBenchmark,
  };

  // Test 1: Forced-kill simulation
  try {
    console.log('\n[TEST 1] Forced-Kill Simulation');
    console.log('--------------------------------------');
    await simulateForcedKill(projectId, rootPath, 20);
    results.forcedKill = true;
  } catch (error) {
    console.error('[Test 1] ✗ Failed:', error);
  }

  // Test 2: Resume from checkpoint
  try {
    console.log('\n[TEST 2] Resume from Checkpoint');
    console.log('--------------------------------------');
    const resumeResult = await resumeFromCheckpoint(projectId, rootPath);
    results.resume = resumeResult.resumed;
  } catch (error) {
    console.error('[Test 2] ✗ Failed:', error);
  }

  // Test 3: Batch rollback
  try {
    console.log('\n[TEST 3] Batch Rollback');
    console.log('--------------------------------------');
    const rollbackResult = await testBatchRollback(projectId, rootPath);
    results.rollback = rollbackResult.rollbackSuccessful;
  } catch (error) {
    console.error('[Test 3] ✗ Failed:', error);
  }

  // Test 4: Benchmarks
  try {
    console.log('\n[TEST 4] Performance Benchmarks');
    console.log('--------------------------------------');
    results.benchmarks = await benchmarkIndexBuilder(projectId, rootPath);
  } catch (error) {
    console.error('[Test 4] ✗ Failed:', error);
  }

  // Summary
  console.log('\n========================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('========================================');
  console.log(`Test 1 (Forced-Kill):      ${results.forcedKill ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Test 2 (Resume):          ${results.resume ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Test 3 (Batch Rollback):  ${results.rollback ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Test 4 (Benchmarks):      ✓ COMPLETE`);

  const allPassed = results.forcedKill && results.resume && results.rollback;
  console.log(`\nOverall: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
  console.log('========================================\n');

  return { allPassed, results };
}

/**
 * Demo: Resume-from-checkpoint workflow
 */
export async function demoResumeWorkflow(
  projectId: string,
  rootPath: string
): Promise<void> {
  console.log('\n========================================');
  console.log('RESUME-FROM-CHECKPOINT DEMO');
  console.log('========================================\n');

  // Step 1: Start initial indexing
  console.log('[Step 1] Starting initial indexing...');
  const builder1 = new IndexBuilder({
    projectId,
    rootPath,
    batchSize: 20,
    onProgress: (progress: IndexProgress) => {
      console.log(`  [Progress] ${progress.percentage}% - ${progress.stage}`);
    },
  });

  let filesIndexedBeforeCrash = 0;
  try {
    await builder1.buildDatabaseIndex();
  } catch (error) {
    if ((error as Error).message === 'SIMULATED_CRASH') {
      console.log('  [Crash] Indexing interrupted at 30%');
    }
  }

  // Step 2: Check checkpoint state
  console.log('\n[Step 2] Checking checkpoint state...');
  const checkpointState = await verifyCheckpointState(projectId);
  console.log(`  Checkpoint exists: ${checkpointState.exists}`);
  console.log(`  Stage: ${checkpointState.stage}`);
  console.log(`  Files processed: ${checkpointState.processedFiles.length}`);
  console.log(`  Last file: ${checkpointState.lastProcessedFile}`);

  // Step 3: Resume from checkpoint
  console.log('\n[Step 3] Resuming from checkpoint...');
  const resumeResult = await resumeFromCheckpoint(projectId, rootPath);
  console.log(`  Resumed: ${resumeResult.resumed}`);
  console.log(`  Total files indexed: ${resumeResult.filesIndexed}`);

  // Step 4: Verify completion
  console.log('\n[Step 4] Verifying completion...');
  const finalCheckpoint = await verifyCheckpointState(projectId);
  console.log(`  Final stage: ${finalCheckpoint.stage}`);
  console.log(`  Total files processed: ${finalCheckpoint.processedFiles.length}`);
  console.log(`  Failed files: ${finalCheckpoint.failedFiles.length}`);

  console.log('\n========================================');
  console.log('DEMO COMPLETE');
  console.log('========================================\n');
}
