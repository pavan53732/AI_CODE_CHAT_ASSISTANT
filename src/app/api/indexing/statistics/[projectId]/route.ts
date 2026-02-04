'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/indexing/statistics/[projectId]
 * Get index statistics for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get file analysis statistics
    const fileAnalyses = await db.fileAnalysis.findMany({
      where: { projectId },
    });

    const patterns = await db.codePattern.findMany({
      where: { projectId },
    });

    const issues = await db.issueMemory.findMany({
      where: { projectId },
    });

    const openIssues = await db.issueMemory.findMany({
      where: { projectId, status: 'open' },
    });

    // Calculate statistics
    const totalLines = fileAnalyses.reduce((sum, f) => sum + f.lineCount, 0);
    const totalFunctions = fileAnalyses.reduce((sum, f) => sum + f.functionCount, 0);
    const totalClasses = fileAnalyses.reduce((sum, f) => sum + f.classCount, 0);
    const avgComplexity = fileAnalyses.length > 0
      ? fileAnalyses.reduce((sum, f) => sum + f.complexity, 0) / fileAnalyses.length
      : 0;

    const languages: Record<string, number> = {};
    fileAnalyses.forEach(f => {
      languages[f.language] = (languages[f.language] || 0) + 1;
    });

    const severityCount: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
    };

    issues.forEach(i => {
      severityCount[i.severity] = (severityCount[i.severity] || 0) + 1;
    });

    const lastIndexed = fileAnalyses.length > 0
      ? new Date(Math.max(...fileAnalyses.map(f => f.lastAnalyzed.getTime())))
      : null;

    const statistics = {
      totalFiles: fileAnalyses.length,
      totalLines,
      totalFunctions,
      totalClasses,
      avgComplexity: Math.round(avgComplexity * 100) / 100,
      languages,
      patterns: {
        total: patterns.length,
        byType: patterns.reduce((acc, p) => {
          acc[p.type] = (acc[p.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      issues: {
        total: issues.length,
        open: openIssues.length,
        bySeverity: severityCount,
        byType: issues.reduce((acc, i) => {
          acc[i.type] = (acc[i.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      lastIndexed,
    };

    return NextResponse.json({
      success: true,
      projectId,
      statistics,
    });
  } catch (error) {
    console.error('[API /indexing/statistics] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
