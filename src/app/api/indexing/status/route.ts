'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/indexing/status?projectId={projectId}
 * Get indexing status for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get project data
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Count indexed files
    const totalFiles = project.totalFiles || 0;

    // Get indexed file analyses
    const fileAnalyses = await db.fileAnalysis.findMany({
      where: { projectId },
      select: {
        filePath: true,
        analyzedAt: true,
        lastModifiedAt: true,
      },
    });

    // Calculate indexing status
    const indexedFileCount = fileAnalyses.length;
    const lastIndexed = fileAnalyses.length > 0
      ? new Date(Math.max(...fileAnalyses.map((f) => f.analyzedAt.getTime())))
      : null;

    return NextResponse.json({
      projectId,
      status: {
        totalFiles,
        indexedFiles: indexedFileCount,
        progress: totalFiles > 0 ? (indexedFileCount / totalFiles) * 100 : 0,
        lastIndexed,
        needsUpdate: lastIndexed
          ? new Date().getTime() - lastIndexed.getTime() > 24 * 60 * 60 * 1000 // 24 hours
          : true,
      },
    });
  } catch (error) {
    console.error('[API /indexing/status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get indexing status' },
      { status: 500 }
    );
  }
}
