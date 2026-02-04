#!/usr/bin/env bun
/**
 * Full Benchmark Runner V2 - Uses new /api/benchmark/v2/run endpoint
 */

import * as crypto from 'crypto';

interface BenchmarkResult {
  success: boolean;
  runId?: string;
  result?: any;
  error?: string;
}

interface SystemSpecs {
  platform: string;
  arch: string;
  nodeVersion: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
}

/**
 * Get system specs
 */
function getSystemSpecs(): SystemSpecs {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cpus: Bun.availableParallelism || 1,
    totalMemory: process.memoryUsage().heapTotal,
    freeMemory: process.memoryUsage().heapUsed,
  };
}

/**
 * Run benchmark for a specific dataset size
 */
async function runBenchmarkForSize(size: number, killPoints: number): Promise<BenchmarkResult> {
  console.log(`\n[Benchmark] Starting ${size} file run with ${killPoints} kill points...`);

  try {
    const response = await fetch('http://localhost:3000/api/benchmark/v2/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasetSize: size, killPoints }),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`[Benchmark] ${size} files completed successfully`);
      console.log(`[Benchmark]   - Duration: ${result.result.durationMs}ms`);
      console.log(`[Benchmark]   - Files Indexed: ${result.result.filesIndexed}`);
      console.log(`[Benchmark]   - Checkpoint ID: ${result.result.checkpointId}`);
      console.log(`[Benchmark]   - Resumed From: ${result.result.resumedFrom}`);
      return result;
    } else {
      console.error(`[Benchmark] ${size} files failed:`, result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error(`[Benchmark] ${size} files error:`, error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Calculate percentiles
 */
function calculatePercentiles(values: number[]): { p50: number; p95: number; p99: number } {
  if (values.length === 0) return { p50: 0, p95: 0, p99: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const getPercentile = (p: number) => {
    const idx = Math.floor(sorted.length * (p / 100));
    return sorted[Math.min(idx, sorted.length - 1)] || 0;
  };

  return {
    p50: getPercentile(50),
    p95: getPercentile(95),
    p99: getPercentile(99),
  };
}

/**
 * Main benchmark execution
 */
async function runFullBenchmark() {
  const runId = `benchmark-${Date.now()}`;
  console.log(`\n=== FULL BENCHMARK SUITE V2 ===`);
  console.log(`Run ID: ${runId}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const systemSpecs = getSystemSpecs();
  console.log(`\n[System Specs]`, JSON.stringify(systemSpecs, null, 2));

  // Run benchmarks for each dataset size
  const benchmarkResults: any = {};

  // Run 1K files
  console.log(`\n[Benchmark Phase 1/4] Running 1K files...`);
  benchmarkResults['1K'] = await runBenchmarkForSize(1000, 5);

  // Run 10K files
  console.log(`\n[Benchmark Phase 2/4] Running 10K files...`);
  benchmarkResults['10K'] = await runBenchmarkForSize(10000, 10);

  // Run 50K files (skip if resources are limited)
  console.log(`\n[Benchmark Phase 3/4] Running 50K files...`);
  benchmarkResults['50K'] = await runBenchmarkForSize(50000, 10);

  // Run 100K files (skip if resources are limited)
  console.log(`\n[Benchmark Phase 4/4] Running 100K files...`);
  benchmarkResults['100K'] = await runBenchmarkForSize(100000, 10);

  // Calculate aggregated metrics
  const allLatencies: number[] = [];
  const allCheckpointSaveTimes: number[] = [];
  const allResumeTimes: number[] = [];
  const allRollbackTimes: number[] = [];

  for (const [size, result] of Object.entries(benchmarkResults)) {
    if (result.success && result.result) {
      allLatencies.push(...(result.result.latencies || []));
      allCheckpointSaveTimes.push(...(result.result.checkpointSaveTimes || []));
      allResumeTimes.push(...(result.result.resumeTimes || []));
      allRollbackTimes.push(...(result.result.rollbackTimes || []));
    }
  }

  const aggregatedMetrics = {
    p50: {
      indexLatency: calculatePercentiles(allLatencies).p50,
      checkpointSave: calculatePercentiles(allCheckpointSaveTimes).p50,
      resume: calculatePercentiles(allResumeTimes).p50,
      rollback: calculatePercentiles(allRollbackTimes).p50,
    },
    p95: {
      indexLatency: calculatePercentiles(allLatencies).p95,
      checkpointSave: calculatePercentiles(allCheckpointSaveTimes).p95,
      resume: calculatePercentiles(allResumeTimes).p95,
      rollback: calculatePercentiles(allRollbackTimes).p95,
    },
    p99: {
      indexLatency: calculatePercentiles(allLatencies).p99,
      checkpointSave: calculatePercentiles(allCheckpointSaveTimes).p99,
      resume: calculatePercentiles(allResumeTimes).p99,
      rollback: calculatePercentiles(allRollbackTimes).p99,
    },
  };

  console.log(`\n[Aggregated Metrics]`, JSON.stringify(aggregatedMetrics, null, 2));

  // Compile full report
  const fullReport = {
    runId,
    timestamp: new Date().toISOString(),
    systemSpecs,
    benchmarkResults,
    aggregatedMetrics,
  };

  // Save report to file
  const reportPath = `/home/z/my-project/benchmark-results/${runId}.json`;
  await import('fs').then(fs => {
    fs.promises.mkdir('/home/z/my-project/benchmark-results', { recursive: true })
      .then(() => fs.promises.writeFile(reportPath, JSON.stringify(fullReport, null, 2)));
  });

  console.log(`\n[Report] Full benchmark report saved to: ${reportPath}`);

  // Print summary
  console.log(`\n=== BENCHMARK SUMMARY ===`);
  console.log(`Run ID: ${runId}`);
  console.log(`\nSuccessful Runs:`);
  for (const [size, result] of Object.entries(benchmarkResults)) {
    console.log(`  - ${size} files: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  }
  console.log(`\nP50 Metrics:`);
  console.log(`  - Index Latency: ${aggregatedMetrics.p50.indexLatency.toFixed(2)}ms`);
  console.log(`  - Checkpoint Save: ${aggregatedMetrics.p50.checkpointSave.toFixed(2)}ms`);
  console.log(`  - Resume: ${aggregatedMetrics.p50.resume.toFixed(2)}ms`);
  console.log(`  - Rollback: ${aggregatedMetrics.p50.rollback.toFixed(2)}ms`);
  console.log(`\nP95 Metrics:`);
  console.log(`  - Index Latency: ${aggregatedMetrics.p95.indexLatency.toFixed(2)}ms`);
  console.log(`  - Checkpoint Save: ${aggregatedMetrics.p95.checkpointSave.toFixed(2)}ms`);
  console.log(`  - Resume: ${aggregatedMetrics.p95.resume.toFixed(2)}ms`);
  console.log(`  - Rollback: ${aggregatedMetrics.p95.rollback.toFixed(2)}ms`);
  console.log(`\nP99 Metrics:`);
  console.log(`  - Index Latency: ${aggregatedMetrics.p99.indexLatency.toFixed(2)}ms`);
  console.log(`  - Checkpoint Save: ${aggregatedMetrics.p99.checkpointSave.toFixed(2)}ms`);
  console.log(`  - Resume: ${aggregatedMetrics.p99.resume.toFixed(2)}ms`);
  console.log(`  - Rollback: ${aggregatedMetrics.p99.rollback.toFixed(2)}ms`);

  return fullReport;
}

// Run the benchmark
runFullBenchmark()
  .then(() => {
    console.log(`\n[Benchmark] All benchmarks completed successfully`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n[Benchmark] Fatal error:`, error);
    process.exit(1);
  });
