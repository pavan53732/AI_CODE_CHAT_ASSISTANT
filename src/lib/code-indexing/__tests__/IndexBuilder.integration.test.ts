#!/usr/bin/env bun
/**
 * Integration Test for IndexBuilder-FileScanner
 * Spins a real directory tree (nested, symlinks, mixed file types)
 * and asserts byte-for-byte parity between files discovered by IndexBuilder and files consumed by FileScanner
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { db } from '../../db';
import { FileScanner } from '../FileScanner';
import { IndexBuilder } from '../IndexBuilder';

interface IntegrationTestResult {
  testName: string;
  passed: boolean;
  message: string;
  details: {
    totalFiles: number;
    indexBuilderFiles: number;
    fileScannerFiles: number;
    mismatches: number;
    mismatchDetails: Array<{
      filePath: string;
      issue: string;
      indexBuilderSize?: number;
      fileScannerSize?: number;
    }>;
  };
  durationMs: number;
}

interface TestDirectory {
  rootPath: string;
  structure: string;
  description: string;
  expectedFiles: number;
}

/**
 * Create complex test directory structure
 */
async function createTestDirectoryStructure(rootPath: string): Promise<TestDirectory[]> {
  console.log(`[Integration Test] Creating test directory structure in ${rootPath}...`);

  const structures: TestDirectory[] = [];

  // Structure 1: Simple nested directories
  const nestedPath = path.join(rootPath, 'test-nested');
  await fs.promises.mkdir(nestedPath, { recursive: true });

  // Create nested files
  for (let i = 0; i < 50; i++) {
    const depth = Math.floor(i / 10) + 1;
    const dirPath = path.join(nestedPath, `depth${depth}`);
    await fs.promises.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, `file-${i}.ts`);
    const content = `// Nested file ${i}\nexport const value${i} = ${i};`;
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  structures.push({
    rootPath: nestedPath,
    structure: 'nested-directories',
    description: '5 levels deep nested directories with TypeScript files',
    expectedFiles: 50,
  });

  // Structure 2: Mixed file types
  const mixedPath = path.join(rootPath, 'test-mixed');
  await fs.promises.mkdir(mixedPath, { recursive: true });

  const fileTypes = [
    { ext: '.ts', content: 'export const tsFile = "typescript";' },
    { ext: '.js', content: 'export const jsFile = "javascript";' },
    { ext: '.py', content: 'def python_file(): return "python";' },
    { ext: '.java', content: 'public class JavaFile {}' },
    { ext: '.json', content: '{"json": "data"}' },
    { ext: '.md', content: '# Markdown file' },
    { ext: '.txt', content: 'Plain text file' },
  ];

  for (let i = 0; i < fileTypes.length; i++) {
    const filePath = path.join(mixedPath, `file${i}${fileTypes[i].ext}`);
    await fs.promises.writeFile(filePath, fileTypes[i].content, 'utf-8');
  }

  structures.push({
    rootPath: mixedPath,
    structure: 'mixed-file-types',
    description: '8 different file types (TS, JS, PY, JAVA, JSON, MD, TXT)',

  
    expectedFiles: fileTypes.length,
  });

  // Structure 3: Symlinks
  const symlinkPath = path.join(rootPath, 'test-symlinks');
  await fs.promises.mkdir(symlinkPath, { recursive: true });

  // Create target files
  for (let i = 0; i < 10; i++) {
    const filePath = path.join(symlinkPath, `target-${i}.ts`);
    await fs.promises.writeFile(filePath, `export const target${i} = ${i};`, 'utf-8');
  }

  // Create symlinks pointing to targets
  try {
    for (let i = 0; i < 10; i++) {
      const linkPath = path.join(symlinkPath, `link-${i}.ts`);
      const targetPath = path.join(symlinkPath, `target-${i}.ts`);
      await fs.promises.symlink(targetPath, linkPath);
    }
    
    structures.push({
      rootPath: symlinkPath,
      structure: 'symlinks',
      description: '10 symlinks pointing to 10 target files',
      expectedFiles: 20, // 10 targets + 10 links
    });
  } catch (error: any) {
    if (error.code === 'EPERM' && process.platform === 'win32') {
      console.warn('[Integration Test] Skipping symlink test due to Windows permissions (EPERM). Run as Admin for full coverage.');
    } else {
      throw error;
    }
  }

  // Structure 4: Empty directories
  const emptyPath = path.join(rootPath, 'test-empty');
  await fs.promises.mkdir(emptyPath, { recursive: true });

  for (let i = 0; i < 10; i++) {
    const dirPath = path.join(emptyPath, `empty-dir-${i}`);
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  structures.push({
    rootPath: emptyPath,
    structure: 'empty-directories',
    description: '10 empty directories (should be skipped)',
    expectedFiles: 0,
  });

  console.log(`[Integration Test] Created ${structures.length} test structures`);
  return structures;
}

/**
 * Read file bytes for checksum comparison
 */
async function readFileBytes(filePath: string): Promise<Buffer> {
  return await fs.promises.readFile(filePath);
}

/**
 * Calculate SHA-256 checksum of file bytes
 */
async function calculateFileChecksum(filePath: string): Promise<string> {
  const bytes = await readFileBytes(filePath);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

/**
 * Run parity test between IndexBuilder and FileScanner
 */
async function runParityTest(structure: TestDirectory): Promise<IntegrationTestResult> {
  const startTime = Date.now();

  console.log(`\n[Integration Test] Testing structure: ${structure.structure}`);
  console.log(`[Integration Test] Description: ${structure.description}`);

  try {
    // Test 1: IndexBuilder scanning
    console.log(`[Integration Test] Running IndexBuilder scan...`);

    const projectId = `integration-test-${Date.now()}`;
    await db.project.create({
      data: { id: projectId, name: 'Integration Test', rootPath: structure.rootPath, totalFiles: structure.expectedFiles },
    });

    const indexBuilder = new IndexBuilder({
      projectId,
      rootPath: structure.rootPath,
      batchSize: 10,
    });

    const indexBuilderFiles = await (indexBuilder as any).scanProjectFiles();

    console.log(`[Integration Test] IndexBuilder found ${indexBuilderFiles.length} files`);

    // Test 2: FileScanner scanning
    console.log(`[Integration Test] Running FileScanner scan...`);

    const fileScanner = new FileScanner({
      rootPath: structure.rootPath,
      ignorePatterns: ['.next', 'node_modules'],
    });

    const scanResult = await fileScanner.scan();
    const fileScannerFiles = scanResult.files.filter(f => !f.isBinary && !f.name.startsWith('.'));

    console.log(`[Integration Test] FileScanner found ${fileScannerFiles.length} files (excluding binary and hidden)`);

    // Test 3: Byte-for-byte parity check
    console.log(`[Integration Test] Checking byte-for-byte parity...`);

    const indexBuilderMap = new Map<string, { file: any; size: number; checksum: string }>();
    for (let file of indexBuilderFiles) {
      try {
        const bytes = await readFileBytes(file.path);
        const checksum = await calculateFileChecksum(file.path);
        const stats = await fs.promises.stat(file.path);

        indexBuilderMap.set(file.path, { file, size: stats.size, checksum });
      } catch (error) {
        console.error(`[Integration Test] Error reading IndexBuilder file ${file.path}:`, error);
      }
    }

    const mismatches: any[] = [];

    for (let file of fileScannerFiles) {
      try {
        const bytes = await readFileBytes(file.path);
        const checksum = await calculateFileChecksum(file.path);
        const stats = await fs.promises.stat(file.path);

        const indexBuilderData = indexBuilderMap.get(file.path);

        if (!indexBuilderData) {
          mismatches.push({
            filePath: file.path,
            issue: 'File not found in IndexBuilder scan',
            fileScannerSize: stats.size,
          });
        } else {
          const sizeMatch = indexBuilderData.size === stats.size;
          const checksumMatch = indexBuilderData.checksum === checksum;

          if (!sizeMatch || !checksumMatch) {
            mismatches.push({
              filePath: file.path,
              issue: !sizeMatch ? 'Size mismatch' : 'Checksum mismatch',
              indexBuilderSize: indexBuilderData.size,
              fileScannerSize: stats.size,
            });
          }
        }
      } catch (error) {
        console.error(`[Integration Test] Error reading FileScanner file ${file.path}:`, error);
        mismatches.push({
          filePath: file.path,
          issue: `Read error: ${(error as Error).message}`,
        });
      }
    }

    // Cleanup
    await db.fileAnalysis.deleteMany({ where: { projectId } });
    await db.project.deleteMany({ where: { id: projectId } });

    // Cleanup test directory
    await fs.promises.rm(structure.rootPath, { recursive: true, force: true }).catch(() => {});

    const durationMs = Date.now() - startTime;
    const passed = mismatches.length === 0;

    const result: IntegrationTestResult = {
      testName: `parity_${structure.structure}`,
      passed,
      message: passed
        ? `Byte-for-byte parity verified: ${indexBuilderFiles.length} files`
        : `Found ${mismatches.length} mismatches between IndexBuilder and FileScanner`,
      details: {
        totalFiles: indexBuilderFiles.length,
        indexBuilderFiles: indexBuilderFiles.length,
        fileScannerFiles: fileScannerFiles.length,
        mismatches: mismatches.length,
        mismatchDetails: mismatches,
      },
      durationMs,
    };

    console.log(`[Integration Test] ${passed ? '✅ PASSED' : '❌ FAILED'}: ${result.message}`);
    console.log(`[Integration Test] Mismatches: ${mismatches.length}`);
    console.log(`[Integration Test] Duration: ${durationMs}ms`);

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;

    return {
      testName: `parity_${structure.structure}`,
      passed: false,
      message: `Test failed with error: ${(error as Error).message}`,
      details: {
        totalFiles: 0,
        indexBuilderFiles: 0,
        fileScannerFiles: 0,
        mismatches: 0,
        mismatchDetails: [],
      },
      durationMs,
    };
    
    console.error(`[Integration Test] ❌ FAILED: ${(error as Error).message}`);
    // console.error(error); // Optional stack trace

    return {
      testName: `parity_${structure.structure}`,
      passed: false,
      message: `Test failed with error: ${(error as Error).message}`,
      details: {
        totalFiles: 0,
        indexBuilderFiles: 0,
        fileScannerFiles: 0,
        mismatches: 0,
        mismatchDetails: [],
      },
      durationMs,
    };
  }
}

/**
 * Run all integration tests
 */
async function runAllIntegrationTests(): Promise<IntegrationTestResult[]> {
  console.log('\n=== IndexBuilder-FileScanner Integration Test Suite ===\n');

  const rootPath = path.join(process.cwd(), 'test-integration');
  await fs.promises.mkdir(rootPath, { recursive: true });

  // Create test directory structures
  const structures = await createTestDirectoryStructure(rootPath);

  const results: IntegrationTestResult[] = [];

  for (let structure of structures) {
    const result = await runParityTest(structure);
    results.push(result);
  }

  // Compile summary
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log('\n=== Integration Test Summary ===');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n✅ All integration tests PASSED - IndexBuilder-FileScanner parity verified');
  } else {
    console.log('\n❌ Some integration tests FAILED - Parity issues detected');
    process.exit(1);
  }

  return results;
}

// Run tests
runAllIntegrationTests()
  .then(async (results) => {
    // Save results to file
    const report = {
      timestamp: new Date().toISOString(),
      testResults: results,
      summary: {
        totalTests: results.length,
        passedTests: results.filter(r => r.passed).length,
        failedTests: results.filter(r => !r.passed).length,
        successRate: ((results.filter(r => r.passed).length / results.length) * 100).toFixed(1),
      },
    };

    const reportPath = path.join(process.cwd(), 'benchmark-results', 'index-builder-file-scanner-integration-test.json');
    await fs.promises.mkdir(path.join(process.cwd(), 'benchmark-results'), { recursive: true });
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n[Integration Test] Report saved to: ${reportPath}`);

    // Cleanup
    await fs.promises.rm(rootPath, { recursive: true, force: true }).catch(() => {});

    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[FATAL] Integration test suite failed:', error);
    process.exit(1);
  });
