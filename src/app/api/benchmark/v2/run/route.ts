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
  datasetHash: string;
}

interface ForcedKillLedger {
  killNumber: number;
  batchNumber: number;
  filesProcessedBeforeKill: number;
  preKillChecksum: string;
  postResumeChecksum: string;
  checksumMatch: boolean;
  resumeTimeMs: number;
}

/**
 * POST /api/benchmark/v2/run - Run crash-safe indexing benchmark (v2 with fixes)
 */
export async function POST(request: NextRequest) {
  const runId = `benchmark-${Date.now()}`;
  console.log(`\n[Benchmark V2] Run ID: ${runId}`);

  try {
    const body = await request.json();
    const { datasetSize = 1000, killPoints = 10 } = body;

    console.log(`[Benchmark V2] Starting with ${datasetSize} files, ${killPoints} kill points`);

    const projectId = `benchmark-v2-${runId}`;
    const rootPath = process.cwd();
    const datasetHash = crypto.createHash('sha256').update(`${datasetSize}-${runId}`).digest('hex');

    // Generate dataset
    const filePaths = await generateDataset(rootPath, datasetSize, runId);

    // Run benchmark with forced kills
    const result = await runBenchmark(projectId, rootPath, filePaths, killPoints, runId);

    // Cleanup dataset
    await cleanupDataset(rootPath);

    return NextResponse.json({
      success: true,
      runId,
      result: {
        ...result,
        datasetHash,
      },
    });
  } catch (error) {
    console.error('[Benchmark V2] Error:', error);
    return NextResponse.json({
      success: false,
      runId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    }, { status: 500 });
  }
}

/**
 * Generate synthetic test dataset
 */
async function generateDataset(rootPath: string, size: number, runId: string): Promise<string[]> {
  console.log(`[Benchmark V2] Generating ${size} synthetic files...`);

  const datasetPath = path.join(rootPath, 'test-dataset-v2', `run-${runId}`);
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

  console.log(`[Benchmark V2] Generated ${filePaths.length} files`);
  return filePaths;
}

/**
 * Generate realistic code content
 */
function generateCodeContent(fileNum: number): string {
  return `// Test file ${fileNum}
import { Component } from '@/components';

export function calculateTax(amount: number, rate: number): number {
  return amount * rate;
}

export async function fetchData(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}

export class UserService {
  constructor(private apiKey: string) {}
  async getUser(id: string) { return { id }; }
}

export const config = {
  id: ${fileNum},
  name: 'test-config-${fileNum}',
  enabled: true,
  timestamp: new Date().toISOString(),
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
  killPoints: number,
  runId: string
): Promise<BenchmarkRun> {
  // Create project first (required for IndexCheckpoint foreign key)
  console.log(`[Benchmark V2] Creating project ${projectId}...`);
  try {
    await db.project.create({
      data: {
        id: projectId,
        name: `Benchmark V2 Project ${runId}`,
        rootPath,
        totalFiles: filePaths.length,
      },
    });
    console.log(`[Benchmark V2] Project created successfully`);
  } catch (createError) {
    console.error(`[Benchmark V2] Failed to create project:`, createError);
    throw createError;
  }

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

  const forcedKillLedger: ForcedKillLedger[] = [];

  try {
    // Phase 1: Initial indexing with forced kills
    const builder = new IndexBuilder({
      projectId,
      rootPath,
      batchSize: Math.max(10, Math.floor(filePaths.length / 20)),
      onProgress: (progress) => {
        latencies.push(Date.now() - startTime);
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
        console.log(`[Benchmark V2] [FORCED KILL #${killsAttempted}] at batch ${lastKillBatch}`);

        // Capture pre-kill checksum
        const analyses = await db.fileAnalysis.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        const preKillChecksum = crypto.createHash('sha256')
          .update(JSON.stringify(analyses))
          .digest('hex');

        forcedKillLedger.push({
          killNumber: killsAttempted,
          batchNumber: lastKillBatch,
          filesProcessedBeforeKill: analyses.length,
          preKillChecksum,
          postResumeChecksum: '',
          checksumMatch: false,
          resumeTimeMs: 0,
        });

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
          console.log(`[Benchmark V2] [CHECKPOINT] Created: ${checkpoint.id}, Stage: ${checkpoint.stage}`);
          checkpointSaveTimes.push(Date.now() - startTime);
        }

        // Phase 2: Resume from checkpoint
        console.log(`[Benchmark V2] [RESUMING] from checkpoint...`);
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

        console.log(`[Benchmark V2] [RESUME] Complete: ${resumeDuration}ms, From: ${resumedFrom}`);

        // Capture post-resume checksum
        const analyses = await db.fileAnalysis.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
        });

        const postResumeChecksum = crypto.createHash('sha256')
          .update(JSON.stringify(analyses))
          .digest('hex');

        // Update forced kill ledger with post-resume checksum
        if (forcedKillLedger.length > 0) {
          const lastKill = forcedKillLedger[forcedKillLedger.length - 1];
          lastKill.postResumeChecksum = postResumeChecksum;
          lastKill.checksumMatch = lastKill.preKillChecksum === postResumeChecksum;
          lastKill.resumeTimeMs = resumeDuration;
        }
      } else {
        throw crashError;
      }
    }

  } catch (error) {
    console.error(`[Benchmark V2] [ERROR]`, error);
    errors.push({ message: (error as Error).message, stack: (error as Error).stack });
  } finally {
    // Cleanup project after benchmark
    console.log(`[Benchmark V2] Cleaning up project...`);
    try {
      await db.fileAnalysis.deleteMany({ where: { projectId } });
      await db.indexCheckpoint.deleteMany({ where: { projectId } });
      await db.project.deleteMany({ where: { id: projectId } });
      console.log(`[Benchmark V2] Cleanup complete`);
    } catch (cleanupError) {
      console.warn(`[Benchmark V2] Cleanup error:`, cleanupError);
    }
  }

  const endTime = Date.now();
  const durationMs = endTime - startTime;

  console.log(`[Benchmark V2] Forced Kill Ledger: ${forcedKillLedger.length} kills`);
  console.log(`[Benchmark V2] Checksum Matches: ${forcedKillLedger.filter(k => k.checksumMatch).length}/${forcedKillLedger.length}`);

  return {
    runId: `${filePaths.length}-files-${runId}`,
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
    datasetHash: crypto.createHash('sha256').update(`${filePaths.length}-${runId}`).digest('hex'),
  };
}

/**
 * Cleanup dataset
 */
async function cleanupDataset(rootPath: string): Promise<void> {
  const datasetPath = path.join(rootPath, 'test-dataset-v2');

  try {
    await fs.promises.rm(datasetPath, { recursive: true, force: true });
    console.log('[Benchmark V2] Cleaned up test dataset');
  } catch (error) {
    console.warn('[Benchmark V2] Cleanup error (non-critical):', error);
  }
}
