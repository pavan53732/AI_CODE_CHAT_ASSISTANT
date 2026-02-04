import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { db } from '@/lib/db';
import { IndexBuilder } from '@/lib/code-indexing/IndexBuilder';

interface BenchmarkRun {
  runId: string;
  datasetSize: number;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  filesIndexed: number;
  filesFailed: number;
  checkpointId?: string;
  resumedFrom?: string;
  errors: any[];
  latencies: number[];
  checkpointSaveTimes: number[];
  resumeTimes: number[];
  rollbackTimes: number[];
}

interface IntegrityProof {
  runId: string;
  fileChecksums: Record<string, string>;
  indexChecksums: Record<string, string>;
  diffProofs: {
    beforeKill: Record<string, string>;
    afterResume: Record<string, string>;
    matches: boolean;
  };
}

/**
 * POST /api/benchmark/run - Run crash-safe indexing benchmark
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { datasetSize = 1000, killPoints = 10 } = body;

    console.log(`[Benchmark] Starting with ${datasetSize} files, ${killPoints} kill points`);

    const projectId = `benchmark-${Date.now()}`;
    const rootPath = process.cwd();

    // Generate dataset
    const filePaths = await generateDataset(rootPath, datasetSize);

    // Run benchmark with forced kills
    const result = await runBenchmark(projectId, rootPath, filePaths, killPoints);

    // Cleanup
    await cleanupDataset(rootPath);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[Benchmark] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

/**
 * Generate synthetic test dataset
 */
async function generateDataset(rootPath: string, size: number): Promise<string[]> {
  console.log(`[Benchmark] Generating ${size} synthetic files...`);

  const datasetPath = path.join(rootPath, 'test-dataset', `${size}-files`);
  await fs.promises.mkdir(datasetPath, { recursive: true });

  const filePaths: string[] = [];
  const batchSize = 100;

  for (let i = 0; i < size; i += batchSize) {
    const batch = Math.min(batchSize, size - i);

    for (let j = 0; j < batch; j++) {
      const fileNum = i + j;
      const filePath = path.join(datasetPath, `test-file-${fileNum.toString().padStart(6, '0')}.ts`);

      const content = generateCodeContent(fileNum);

      await fs.promises.writeFile(filePath, content, 'utf-8');
      filePaths.push(filePath);
    }
  }

  console.log(`[Benchmark] Generated ${filePaths.length} files`);
  return filePaths;
}

/**
 * Generate realistic code content
 */
function generateCodeContent(fileNum: number): string {
  const imports = [
    `import { Component } from '@/components';`,
    `import { useState, useEffect } from 'react';`,
    `import { Button } from '@/components/ui/button';`,
  ];

  const functions = [
    `export function calculateTax(amount: number, rate: number): number { return amount * rate; }`,
    `export async function fetchData(url: string): Promise<any> { const res = await fetch(url); return res.json(); }`,
    `export function formatDate(date: Date): string { return date.toISOString(); }`,
  ];

  const classes = [
    `export class UserService { constructor(private apiKey: string) {} async getUser(id: string) { return { id }; } }`,
    `export class DataProcessor { process(data: any[]) { return data.map(item => ({ ...item, processed: true })); } }`,
  ];

  const selectedImport = imports[fileNum % imports.length];
  const selectedFunction = functions[fileNum % functions.length];
  const selectedClass = classes[fileNum % classes.length];

  return `// Test file ${fileNum}
${selectedImport}

${selectedFunction}

${selectedClass}

// Additional code
export const config = {
  id: ${fileNum},
  name: 'test-config-${fileNum}',
  enabled: true,
  features: ['feature1', 'feature2', 'feature3'],
  timestamp: new Date().toISOString(),
};

${'// '.repeat(50)}
export const metadata = {
  version: '1.0.0',
  author: 'test-system',
  dependencies: ['react', 'typescript'],
};
`;
}

/**
 * Run benchmark with forced kills
 */
async function runBenchmark(
  projectId: string,
  rootPath: string,
  filePaths: string[],
  killPoints: number
): Promise<BenchmarkRun> {
  // Create project first (required for IndexCheckpoint foreign key)
  await db.project.create({
    data: {
      id: projectId,
      name: `Benchmark Project ${projectId}`,
      rootPath,
      totalFiles: filePaths.length,
    },
  });

  const runId = `${filePaths.length}-files-${Date.now()}`;
  const startTime = Date.now();

  const latencies: number[] = [];
  const checkpointSaveTimes: number[] = [];
  const resumeTimes: number[] = [];
  const rollbackTimes: number[] = [];

  let filesIndexed = 0;
  let filesFailed = 0;
  let errors: any[] = [];
  let checkpointId: string | undefined;
  let resumedFrom: string | undefined;

  const latenciesStart = performance.now();

  try {
    // Phase 1: Initial indexing with forced kills
    const builder = new IndexBuilder({
      projectId,
      rootPath,
      batchSize: Math.max(10, Math.floor(filePaths.length / 20)), // Dynamic batch size
      onProgress: (progress) => {
        latencies.push(performance.now() - latenciesStart);
      },
    });

    let killsAttempted = 0;
    let lastKillBatch = 0;

    // Monkey-patch processBatch to inject forced kills
    const originalProcessBatch = (builder as any).processBatch.bind(builder);
    (builder as any).processBatch = async (files: any[]) => {
      lastKillBatch++;

      if (killsAttempted < killPoints && lastKillBatch % 5 === 0) {
        killsAttempted++;
        console.log(`  [FORCED KILL #${killsAttempted}] at batch ${lastKillBatch}`);

        // Capture pre-kill checksum
        const proof = await captureIntegrityProof(projectId, runId, killsAttempted);

        throw new Error(`FORCED_KILL_${runId}_${killsAttempted}`);
      }

      return await originalProcessBatch(files);
    };

    try {
      await builder.buildDatabaseIndex();
      filesIndexed = filePaths.length;
    } catch (crashError) {
      if ((crashError as Error).message.startsWith('FORCED_KILL_')) {
        // Verify checkpoint exists
        const checkpoint = await db.indexCheckpoint.findFirst({
          where: { projectId },
          orderBy: { startTime: 'desc' },
        });

        if (checkpoint) {
          checkpointId = checkpoint.id;
          console.log(`  [CHECKPOINT] Created: ${checkpoint.id}, Stage: ${checkpoint.stage}`);

          const checkpointSaveTime = Date.now();
          checkpointSaveTimes.push(checkpointSaveTime - startTime);
        }

        // Phase 2: Resume from checkpoint
        console.log('  [RESUMING] from checkpoint...');
        const resumeStart = Date.now();

        const resumeBuilder = new IndexBuilder({
          projectId,
          rootPath,
          batchSize: Math.max(10, Math.floor(filePaths.length / 20)),
        });

        const resumeResult = await resumeBuilder.buildDatabaseIndex();
        const resumeDuration = Date.now() - resumeStart;
        resumeTimes.push(resumeDuration);

        resumedFrom = resumeResult.resumedFrom;
        filesIndexed = resumeResult.filesIndexed;
        filesFailed = resumeResult.filesFailed;

        console.log(`  [RESUME] Complete: ${resumeDuration}ms, From: ${resumedFrom}`);
      } else {
        throw crashError;
      }
    }

  } catch (error) {
    console.error(`  [ERROR] ${error}`);
    errors.push({ message: (error as Error).message, stack: (error as Error).stack });
  } finally {
    // Cleanup project after benchmark
    try {
      await db.project.deleteMany({ where: { id: projectId } });
      await db.fileAnalysis.deleteMany({ where: { projectId } });
      await db.indexCheckpoint.deleteMany({ where: { projectId } });
    } catch (cleanupError) {
      console.warn('[Benchmark] Cleanup error:', cleanupError);
    }
  }

  const endTime = Date.now();
  const durationMs = endTime - startTime;

  return {
    runId,
    datasetSize: filePaths.length,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    durationMs,
    filesIndexed,
    filesFailed,
    checkpointId,
    resumedFrom,
    errors,
    latencies,
    checkpointSaveTimes,
    resumeTimes,
    rollbackTimes,
  };
}

/**
 * Capture integrity proof (checksums)
 */
async function captureIntegrityProof(
  projectId: string,
  runId: string,
  killNum: number
): Promise<IntegrityProof> {
  const analyses = await db.fileAnalysis.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const fileChecksums: Record<string, string> = {};
  for (const analysis of analyses) {
    const hash = crypto.createHash('sha256').update(analysis.summary).digest('hex');
    fileChecksums[analysis.filePath] = hash;
  }

  return {
    runId: `${runId}-kill-${killNum}`,
    fileChecksums,
    indexChecksums: {},
    diffProofs: {
      beforeKill: {},
      afterResume: {},
      matches: false,
    },
  };
}

/**
 * Cleanup dataset
 */
async function cleanupDataset(rootPath: string): Promise<void> {
  const datasetPath = path.join(rootPath, 'test-dataset');

  try {
    await fs.promises.rm(datasetPath, { recursive: true, force: true });
    console.log('[Benchmark] Cleaned up test dataset');
  } catch (error) {
    console.warn('[Benchmark] Cleanup error (non-critical):', error);
  }
}
