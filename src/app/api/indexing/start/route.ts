'use server';

import { NextRequest, NextResponse } from 'next/server';
import { IndexBuilder } from '@/lib/code-indexing/IndexBuilder';
import { loadGitignorePatterns } from '@/lib/code-indexing/FileScanner';
import { db } from '@/lib/db';

/**
 * POST /api/indexing/start
 * Start the code indexing process
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId = 'default', rootPath = '.', ignorePatterns } = body;

    // Validate inputs
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Load default ignore patterns
    const patterns = ignorePatterns || loadGitignorePatterns(rootPath);

    // Create index builder
    const indexBuilder = new IndexBuilder({
      rootPath,
      projectId,
      ignorePatterns: patterns,
      onProgress: (progress) => {
        // In a real implementation, this would emit events via WebSocket
        // For now, we'll just log the progress
        console.log('[Indexing] Progress:', progress);
      },
    });

    // Run indexing (this is synchronous for simplicity, but could be async)
    console.log('[API /indexing/start] Starting indexing...');
    const result = await indexBuilder.run();
    console.log('[API /indexing/start] Indexing complete:', result);

    return NextResponse.json({
      success: true,
      result,
      message: `Successfully indexed ${result.totalFiles} files`,
    });
  } catch (error) {
    console.error('[API /indexing/start] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to start indexing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
