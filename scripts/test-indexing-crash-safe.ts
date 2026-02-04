#!/usr/bin/env bun
// CLI script to run crash-safe indexing tests

import { runCrashSafeTests, demoResumeWorkflow } from '../src/lib/code-indexing/__tests__/IndexBuilder.test.utils';
import { db } from '../src/lib/db';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';

  const TEST_PROJECT_ID = 'test-project-crash-safe';
  const TEST_ROOT_PATH = process.cwd();

  try {
    // Create test project if it doesn't exist
    const existingProject = await db.project.findUnique({
      where: { rootPath: TEST_ROOT_PATH },
    });

    let projectId = TEST_PROJECT_ID;

    if (!existingProject) {
      console.log('Creating test project...');
      const project = await db.project.create({
        data: {
          id: TEST_PROJECT_ID,
          name: 'Crash-Safe Test Project',
          rootPath: TEST_ROOT_PATH,
        },
      });
      projectId = project.id;
    } else {
      projectId = existingProject.id;
    }

    if (command === 'test') {
      // Run full test suite
      const results = await runCrashSafeTests(projectId, TEST_ROOT_PATH);

      if (!results.allPassed) {
        process.exit(1);
      }
    } else if (command === 'demo') {
      // Run demo
      await demoResumeWorkflow(projectId, TEST_ROOT_PATH);
    } else if (command === 'clean') {
      // Clean up test data
      console.log('Cleaning up test data...');
      await db.indexCheckpoint.deleteMany({
        where: { projectId },
      });
      await db.fileAnalysis.deleteMany({
        where: { projectId },
      });
      console.log('✓ Cleanup complete');
    } else {
      console.log('Usage: bun run test:crash-safe [test|demo|clean]');
      console.log('  test  - Run full test suite');
      console.log('  demo  - Run resume-from-checkpoint demo');
      console.log('  clean - Clean up test data');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
