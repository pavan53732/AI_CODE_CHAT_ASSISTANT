'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/memory/file/:filePath
 * Get file analysis memory for a specific file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filePath: string }> }
) {
  try {
    const { filePath } = await params;

    // Decode URL-encoded file path
    const decodedPath = decodeURIComponent(filePath);

    const fileAnalysis = await db.fileAnalysis.findUnique({
      where: { filePath: decodedPath },
    });

    if (!fileAnalysis) {
      return NextResponse.json(
        { error: 'File analysis not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      filePath: fileAnalysis.filePath,
      summary: fileAnalysis.summary,
      purpose: fileAnalysis.purpose,
      keyFunctions: fileAnalysis.keyFunctions ? JSON.parse(fileAnalysis.keyFunctions) : [],
      dependencies: fileAnalysis.dependencies ? JSON.parse(fileAnalysis.dependencies) : [],
      dependents: fileAnalysis.dependents ? JSON.parse(fileAnalysis.dependents) : [],
      patterns: fileAnalysis.patterns ? JSON.parse(fileAnalysis.patterns) : [],
      issues: fileAnalysis.issues ? JSON.parse(fileAnalysis.issues) : [],
      suggestions: fileAnalysis.suggestions ? JSON.parse(fileAnalysis.suggestions) : [],
      complexity: fileAnalysis.complexity,
      analyzedAt: fileAnalysis.analyzedAt,
      lastModifiedAt: fileAnalysis.lastModifiedAt,
      analysisCount: fileAnalysis.analysisCount,
    });
  } catch (error) {
    console.error('[API /memory/file] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get file memory' },
      { status: 500 }
    );
  }
}
