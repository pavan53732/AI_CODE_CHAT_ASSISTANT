'use server';

import { NextRequest, NextResponse } from 'next/server';
import { WikiGenerator } from '@/lib/wiki/WikiGenerator';
import { db } from '@/lib/db';

/**
 * POST /api/wiki/:projectId/regenerate
 * Regenerate wiki pages for a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { includeArchitecture, includeAPI, includeComponents, includePatterns, clearExisting = true } = body;

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

    // Clear existing wiki pages if requested
    if (clearExisting) {
      await db.wikiPage.deleteMany({
        where: { projectId },
      });
    }

    // Create wiki generator
    const wikiGenerator = new WikiGenerator({
      projectId,
      includeArchitecture,
      includeAPI,
      includeComponents,
      includePatterns,
      onProgress: (progress) => {
        console.log('[Wiki Regeneration] Progress:', progress);
      },
    });

    // Run wiki generation
    console.log('[API /wiki/:projectId/regenerate] Starting wiki regeneration...');
    const result = await wikiGenerator.run();
    console.log('[API /wiki/:projectId/regenerate] Wiki regeneration complete:', result);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully regenerated ${result.pagesGenerated} wiki pages`,
    });
  } catch (error) {
    console.error('[API /wiki/:projectId/regenerate] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to regenerate wiki',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
