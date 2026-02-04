#!/usr/bin/env bun
/**
 * FileScanner Contract Unit Test
 * Verifies that all contract methods exist and are callable at runtime
 * This test MUST pass before Week 1 can be considered complete
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileScanner } from '../FileScanner';
import type { IFileScanner, ScanOptions } from '../FileScanner.interface';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
}

interface ContractTestReport {
  timestamp: string;
  machineContext: {
    platform: string;
    arch: string;
    nodeVersion: string;
    cpus: number;
    totalMemory: number;
  };
  contractTests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  };
}

/**
 * Test suite for FileScanner contract compliance
 */
async function runContractTests(): Promise<ContractTestReport> {
  const testResults: TestResult[] = [];

  console.log('\n=== FileScanner Contract Test Suite ===\n');

  // Test 1: Interface implementation check
  const test1 = await testInterfaceImplementation();
  testResults.push(test1);

  // Test 2: Constructor instantiation
  const test2 = await testConstructor();
  testResults.push(test2);

  // Test 3: scanFile method exists and is callable
  const test3 = await testScanFileMethod();
  testResults.push(test3);

  // Test 4: scanBatch method exists and is callable
  const test4 = await testScanBatchMethod();
  testResults.push(test4);

  // Test 5: scan method exists and is callable
  const test5 = await testScanMethod();
  testResults.push(test5);

  // Test 6: close method exists and is callable
  const test6 = await testCloseMethod();
  testResults.push(test6);

  // Test 7: reset method exists and is callable
  const test7 = await testResetMethod();
  testResults.push(test7);

  // Test 8: getStats method exists and is callable
  const test8 = await testGetStatsMethod();
  testResults.push(test8);

  // Test 9: scanFile returns correct metadata
  const test9 = await testScanFileReturnValue();
  testResults.push(test9);

  // Test 10: scanBatch returns correct metadata
  const test10 = await testScanBatchReturnValue();
  testResults.push(test10);

  // Compile summary
  const total = testResults.length;
  const passed = testResults.filter(t => t.passed).length;
  const failed = total - passed;
  const successRate = (passed / total) * 100;

  const report: ContractTestReport = {
    timestamp: new Date().toISOString(),
    machineContext: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
    },
    contractTests: testResults,
    summary: {
      total,
      passed,
      failed,
      successRate,
    },
  };

  // Print results
  console.log('\n=== Test Results ===');
  testResults.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.testName}`);
    console.log(`    ${result.message}`);
    console.log(`    Duration: ${result.duration}ms\n`);
  });

  console.log('=== Summary ===');
  console.log(`Total: ${report.summary.total}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Success Rate: ${report.summary.successRate.toFixed(1)}%`);

  if (successRate === 100) {
    console.log('\n✅ All contract tests PASSED - FileScanner is compliant\n');
  } else {
    console.log('\n❌ Some contract tests FAILED - FileScanner is NOT compliant\n');
    process.exit(1);
  }

  return report;
}

/**
 * Test 1: Interface implementation check
 */
async function testInterfaceImplementation(): Promise<TestResult> {
  const start = Date.now();
  let passed = false;
  let message = '';

  try {
    const options: ScanOptions = {
      rootPath: process.cwd(),
    };

    const scanner = new FileScanner(options) as any;

    // Verify the scanner implements IFileScanner interface
    if (typeof scanner.scanFile === 'function') {
      if (typeof scanner.scanBatch === 'function') {
        if (typeof scanner.scan === 'function') {
          if (typeof scanner.close === 'function') {
            if (typeof scanner.reset === 'function') {
              if (typeof scanner.getStats === 'function') {
                passed = true;
                message = 'Scanner implements all IFileScanner methods';
              } else {
                message = 'Missing getStats method';
              }
            } else {
              message = 'Missing reset method';
            }
          } else {
            message = 'Missing close method';
          }
        } else {
          message = 'Missing scan method';
        }
      } else {
        message = 'Missing scanBatch method';
      }
    } else {
      message = 'Missing scanFile method';
    }
  } catch (error) {
    message = `Exception: ${(error as Error).message}`;
  }

  const duration = Date.now() - start;
  return { testName: '1. Interface Implementation', passed, message, duration };
}

/**
 * Test 2: Constructor instantiation
 */
async function testConstructor(): Promise<TestResult> {
  const start = Date.now();
  let passed = false;
  let message = '';

  try {
    const options: ScanOptions = {
      rootPath: process.cwd(),
      ignorePatterns: ['node_modules', '.git'],
      maxDepth: 10,
      includeHidden: false,
      fileExtensions: ['.ts', '.js'],
    };

    const scanner = new FileScanner(options);
    passed = true;
    message = 'FileScanner constructor accepts all ScanOptions';
  } catch (error) {
    message = `Constructor exception: ${(error as Error).message}`;
  }

  const duration = Date.now() - start;
  return { testName: '2. Constructor', passed, message, duration };
}

/**
 * Test 3: scanFile method exists and is callable
 */
async function testScanFileMethod(): Promise<TestResult> {
  const start = Date.now();
  let passed = false;
  let message = '';

  try {
    const options: ScanOptions = {
      rootPath: process.cwd(),
    };

    const scanner = new FileScanner(options);

    // Check if scanFile method exists
    if (typeof scanner.scanFile !== 'function') {
      throw new Error('scanFile is not a function');
    }

    // Create a test file
    const testDir = path.join(process.cwd(), 'test-temp-contract');
    await fs.promises.mkdir(testDir, { recursive: true });
    const testFile = path.join(testDir, 'test.ts');
    await fs.promises.writeFile(testFile, 'export const test = "hello";', 'utf-8');

    // Call scanFile
    const result = scanner.scanFile(testFile);

    // Verify result structure
    if (result && typeof result === 'object') {
      if (result.path && result.name && result.size !== undefined) {
        if (result.language && result.isBinary !== undefined) {
          passed = true;
          message = 'scanFile method is callable and returns correct structure';
        } else {
          message = 'scanFile returned incomplete structure';
        }
      } else {
        message = 'scanFile missing required fields';
      }
    } else {
      message = 'scanFile did not return object';
    }

    // Cleanup
    await fs.promises.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    message = `Exception: ${(error as Error).message}`;
  }

  const duration = Date.now() - start;
  return { testName: '3. scanFile Method', passed, message, duration };
}

/**
 * Test 4: scanBatch method exists and is callable
 */
async function testScanBatchMethod(): Promise<TestResult> {
  const start = Date.now();
  let passed = false;
  let message = '';

  try {
    const options: ScanOptions = {
      rootPath: process.cwd(),
    };

    const scanner = new FileScanner(options);

    // Check if scanBatch method exists
    if (typeof scanner.scanBatch !== 'function') {
      throw new Error('scanBatch is not a function');
    }

    // Create test files
    const testDir = path.join(process.cwd(), 'test-temp-contract');
    await fs.promises.mkdir(testDir, { recursive: true });

    const file1 = path.join(testDir, 'test1.ts');
    const file2 = path.join(testDir, 'test2.ts');
    const file3 = path.join(testDir, 'test3.ts');

    await Promise.all([
      fs.promises.writeFile(file1, 'export const test1 = "hello";', 'utf-8'),
      fs.promises.writeFile(file2, 'export const test2 = "world";', 'utf-8'),
      fs.promises.writeFile(file3, 'export const test3 = "foo";', 'utf-8'),
    ]);

    // Call scanBatch
    const results = scanner.scanBatch([file1, file2, file3]);

    // Verify result structure
    if (Array.isArray(results) && results.length === 3) {
      const allValid = results.every(r => r && r.path && r.name && r.size !== undefined);
      if (allValid) {
        passed = true;
        message = 'scanBatch method is callable and returns correct structure';
      } else {
        message = 'scanBatch returned invalid structure';
      }
    } else {
      message = 'scanBatch did not return array of correct length';
    }

    // Cleanup
    await fs.promises.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    message = `Exception: ${(error as Error).message}`;
  }

  const duration = Date.now() - start;
  return { testName: '4. scanBatch Method', passed, message, duration };
}

/**
 * Test 5: scan method exists and is callable
 */
async function testScanMethod(): Promise<TestResult> {
  const start = Date.now();
  let passed = false;
  let message = '';

  try {
    const options: ScanOptions = {
      rootPath: process.cwd(),
    };

    const scanner = new FileScanner(options);

    // Check if scan method exists
    if (typeof scanner.scan !== 'function') {
      throw new Error('scan is not a function');
    }

    // Call scan
    const result = await scanner.scan();

    // Verify result structure
    if (result && typeof result === 'object') {
      if (Array.isArray(result.files) && typeof result.totalFiles === 'number') {
        if (typeof result.scanDuration === 'number') {
          passed = true;
          message = 'scan method is callable and returns correct structure';
        } else {
          message = 'scan missing scanDuration field';
        }
      } else {
        message = 'scan missing files or totalFiles fields';
      }
    } else {
      message = 'scan did not return object';
    }
  } catch (error) {
    message = `Exception: ${(error as Error).message}`;
  }

  const duration = Date.now() - start;
  return { testName: '5. scan Method', passed, message, duration };
}

/**
 * Test 6: close method exists and is callable
 */
async function testCloseMethod(): Promise<TestResult> {
  const start = Date.now();
  let passed = false;
  let message = '';

  try {
    const options: ScanOptions = {
      rootPath: process.cwd(),
    };

    const scanner = new FileScanner(options);

    // Check if close method exists
    if (typeof scanner.close !== 'function') {
      throw new Error('close is not a function');
    }

    // Call close (should not throw)
    scanner.close();

    passed = true;
    message = 'close method is callable and does not throw';
  } catch (error) {
    message = `Exception: ${(error as Error).message}`;
  }

  const duration = Date.now() - start;
  return { testName: '6. close Method', passed, message, duration };
}

/**
 * Test 7: reset method exists and is callable
 */
async function testResetMethod(): Promise<TestResult> {
  const start = Date.now();
  let passed = false;
  let message = '';

  try {
    const options: ScanOptions = {
      rootPath: process.cwd(),
    };

    const scanner = new FileScanner(options);

    // Check if reset method exists
    if (typeof scanner.reset !== 'function') {
      throw new Error('reset is not a function');
    }

    // Get initial stats
    const statsBefore = scanner.getStats();
    console.log(`[DEBUG] Initial stats:`, statsBefore);

    // Create a test file to scan (increments stats)
    const testDir = path.join(process.cwd(), 'test-temp-contract');
    await fs.promises.mkdir(testDir, { recursive: true });
    const testFile = path.join(testDir, 'test-reset.ts');
    await fs.promises.writeFile(testFile, 'export const test = "reset";', 'utf-8');

    // Scan a file to increment stats
    const result = scanner.scanFile(testFile);
    console.log(`[DEBUG] Scan result:`, result);

    const statsAfterScan = scanner.getStats();
    console.log(`[DEBUG] Stats after scan:`, statsAfterScan);

    // Call reset
    scanner.reset();

    // Get stats after reset
    const statsAfter = scanner.getStats();
    console.log(`[DEBUG] Stats after reset:`, statsAfter);

    // Verify reset worked
    const allReset =
      statsAfter.filesScanned === 0 &&
      statsAfter.directoriesScanned === 0 &&
      statsAfter.totalSize === 0;

    if (allReset) {
      passed = true;
      message = 'reset method is callable and resets scanner state';
    } else {
      message = `reset did not properly reset scanner state: files=${statsAfter.filesScanned}, dirs=${statsAfter.directoriesScanned}, size=${statsAfter.totalSize}`;
    }

    // Cleanup
    await fs.promises.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    message = `Exception: ${(error as Error).message}`;
  }

  const duration = Date.now() - start;
  return { testName: '7. reset Method', passed, message, duration };
}

/**
 * Test 8: getStats method exists and is callable
 */
async function testGetStatsMethod(): Promise<TestResult> {
  const start = Date.now();
  let passed = false;
  let message = '';

  try {
    const options: ScanOptions = {
      rootPath: process.cwd(),
    };

    const scanner = new FileScanner(options);

    // Check if getStats method exists
    if (typeof scanner.getStats !== 'function') {
      throw new Error('getStats is not a function');
    }

    // Call getStats
    const stats = scanner.getStats();

    // Verify result structure
    if (stats && typeof stats === 'object') {
      if (
        typeof stats.filesScanned === 'number' &&
        typeof stats.directoriesScanned === 'number' &&
        typeof stats.totalSize === 'number' &&
        typeof stats.startTime === 'number'
      ) {
        passed = true;
        message = 'getStats method is callable and returns correct structure';
      } else {
        message = 'getStats returned incomplete structure';
      }
    } else {
      message = 'getStats did not return object';
    }
  } catch (error) {
    message = `Exception: ${(error as Error).message}`;
  }

  const duration = Date.now() - start;
  return { testName: '8. getStats Method', passed, message, duration };
}

/**
 * Test 9: scanFile returns correct metadata
 */
async function testScanFileReturnValue(): Promise<TestResult> {
  const start = Date.now();
  let passed = false;
  let message = '';

  try {
    const options: ScanOptions = {
      rootPath: process.cwd(),
    };

    const scanner = new FileScanner(options);

    // Create test file
    const testDir = path.join(process.cwd(), 'test-temp-contract');
    await fs.promises.mkdir(testDir, { recursive: true });
    const testFile = path.join(testDir, 'test-return.ts');
    const content = 'export const test = "hello world";\nexport const foo = "bar";';
    await fs.promises.writeFile(testFile, content, 'utf-8');

    const fileStats = fs.statSync(testFile);

    // Call scanFile
    const result = scanner.scanFile(testFile);

    // Verify all fields
    if (result) {
      const checks = [
        { field: 'path', value: result.path === testFile },
        { field: 'name', value: result.name === 'test-return.ts' },
        { field: 'extension', value: result.extension === '.ts' },
        { field: 'size', value: result.size === fileStats.size },
        { field: 'language', value: result.language === 'TypeScript' },
        { field: 'isBinary', value: result.isBinary === false },
        { field: 'lastModified', value: result.lastModified instanceof Date },
      ];

      const allPassed = checks.every(c => c.value);

      if (allPassed) {
        passed = true;
        message = 'scanFile returns complete and correct metadata';
      } else {
        const failed = checks.filter(c => !c.value).map(c => c.field).join(', ');
        message = `scanFile missing/incorrect fields: ${failed}`;
      }
    } else {
      message = 'scanFile returned null';
    }

    // Cleanup
    await fs.promises.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    message = `Exception: ${(error as Error).message}`;
  }

  const duration = Date.now() - start;
  return { testName: '9. scanFile Return Value', passed, message, duration };
}

/**
 * Test 10: scanBatch returns correct metadata
 */
async function testScanBatchReturnValue(): Promise<TestResult> {
  const start = Date.now();
  let passed = false;
  let message = '';

  try {
    const options: ScanOptions = {
      rootPath: process.cwd(),
    };

    const scanner = new FileScanner(options);

    // Create test files
    const testDir = path.join(process.cwd(), 'test-temp-contract');
    await fs.promises.mkdir(testDir, { recursive: true });

    const testFile1 = path.join(testDir, 'file1.ts');
    const testFile2 = path.join(testDir, 'file2.js');
    const testFile3 = path.join(testDir, 'file3.py');

    await Promise.all([
      fs.promises.writeFile(testFile1, 'export const a = 1;', 'utf-8'),
      fs.promises.writeFile(testFile2, 'export const b = 2;', 'utf-8'),
      fs.promises.writeFile(testFile3, 'def c(): return 3', 'utf-8'),
    ]);

    // Call scanBatch
    const results = scanner.scanBatch([testFile1, testFile2, testFile3]);

    // Verify all results
    if (Array.isArray(results) && results.length === 3) {
      const validResults = results.filter(r => r !== null);

      if (validResults.length === 3) {
        const allHavePaths = validResults.every(r => r.path);
        const allHaveNames = validResults.every(r => r.name);
        const allHaveSizes = validResults.every(r => r.size !== undefined);
        const allHaveLanguages = validResults.every(r => r.language);

        if (allHavePaths && allHaveNames && allHaveSizes && allHaveLanguages) {
          passed = true;
          message = 'scanBatch returns complete metadata for all files';
        } else {
          message = 'scanBatch results missing required fields';
        }
      } else {
        message = 'scanBatch returned null for some files';
      }
    } else {
      message = 'scanBatch did not return array of correct length';
    }

    // Cleanup
    await fs.promises.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    message = `Exception: ${(error as Error).message}`;
  }

  const duration = Date.now() - start;
  return { testName: '10. scanBatch Return Value', passed, message, duration };
}

// Run tests
runContractTests()
  .then((report) => {
    // Save report to file
    const reportPath = '/home/z/my-project/benchmark-results/file-scanner-contract-test.json';
    fs.promises.mkdir('/home/z/my-project/benchmark-results', { recursive: true })
      .then(() => fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2)))
      .then(() => {
        console.log(`\n[Report] Contract test report saved to: ${reportPath}`);
        process.exit(0);
      });
  })
  .catch((error) => {
    console.error('\n[FATAL] Test suite failed:', error);
    process.exit(1);
  });
