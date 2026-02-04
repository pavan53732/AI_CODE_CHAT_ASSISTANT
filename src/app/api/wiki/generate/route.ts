'use server';

import { NextRequest, NextResponse } from 'next/server';
import { WikiGenerator } from '@/lib/wiki/WikiGenerator';
import { db } from '@/lib/db';

/**
 * POST /api/wiki/generate
 * Generate wiki pages for a project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId = 'default', includeArchitecture, includeAPI, includeComponents, includePatterns } = body;

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

    // Create wiki generator
    const wikiGenerator = new WikiGenerator({
      projectId,
      includeArchitecture,
      includeAPI,
      includeComponents,
      includePatterns,
      onProgress: (progress) => {
        console.log('[Wiki Generation] Progress:', progress);
      },
    });

    // Run wiki generation
    console.log('[API /wiki/generate] Starting wiki generation...');
    const result = await wikiGenerator.run();
    console.log('[API /wiki/generate] Wiki generation complete:', result);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully generated ${result.pagesGenerated} wiki pages`,
    });
  } catch (error) {
    console.error('[API /wiki/generate] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate wiki',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
