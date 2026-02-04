'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/indexing/stats?projectId={projectId}
 * Get general indexing statistics
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
      include: {
        fileAnalyses: true,
        patterns: true,
        issues: true,
        conversations: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Calculate statistics
    const totalFiles = project.totalFiles || 0;
    const indexedFiles = project.fileAnalyses.length;

    // Analyze file types
    const fileTypes = new Map<string, number>();
    let totalLines = 0;
    let totalSize = 0;

    for (const analysis of project.fileAnalyses) {
      const ext = analysis.filePath.split('.').pop() || 'unknown';
      fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);

      // Estimate lines and size (these would need to be stored in the analysis)
      totalLines += analysis.complexity || 0;
    }

    // Pattern statistics
    const patternStats = {
      total: project.patterns.length,
      byType: new Map<string, number>(),
      topPatterns: project.patterns.slice(0, 10),
    };

    for (const pattern of project.patterns) {
      patternStats.byType.set(
        pattern.type,
        (patternStats.byType.get(pattern.type) || 0) + 1
      );
    }

    // Issue statistics
    const issueStats = {
      total: project.issues.length,
      byType: new Map<string, number>(),
      bySeverity: new Map<string, number>(),
      open: project.issues.filter((i) => i.status === 'open').length,
    };

    for (const issue of project.issues) {
      issueStats.byType.set(issue.type, (issueStats.byType.get(issue.type) || 0) + 1);
      issueStats.bySeverity.set(issue.severity, (issueStats.bySeverity.get(issue.severity) || 0) + 1);
    }

    // Complexity distribution
    const complexities = project.fileAnalyses.map((f) => f.complexity || 0);
    const complexityStats = {
      min: complexities.length > 0 ? Math.min(...complexities) : 0,
      max: complexities.length > 0 ? Math.max(...complexities) : 0,
      avg: complexities.length > 0 ? complexities.reduce((a, b) => a + b, 0) / complexities.length : 0,
    };

    return NextResponse.json({
      projectId,
      overview: {
        totalFiles,
        indexedFiles,
        indexingProgress: totalFiles > 0 ? (indexedFiles / totalFiles) * 100 : 0,
        lastIndexed: project.fileAnalyses.length > 0
          ? new Date(Math.max(...project.fileAnalyses.map((f) => f.analyzedAt.getTime())))
          : null,
      },
      files: {
        byType: Object.fromEntries(fileTypes),
        totalLines,
        avgComplexity: complexityStats.avg,
        complexityRange: {
          min: complexityStats.min,
          max: complexityStats.max,
        },
      },
      patterns: {
        total: patternStats.total,
        byType: Object.fromEntries(patternStats.byType),
        top: patternStats.topPatterns.map((p) => ({
          pattern: p.pattern,
          type: p.type,
          frequency: p.frequency,
        })),
      },
      issues: {
        total: issueStats.total,
        open: issueStats.open,
        byType: Object.fromEntries(issueStats.byType),
        bySeverity: Object.fromEntries(issueStats.bySeverity),
      },
      conversations: {
        total: project.conversations.length,
        lastActivity: project.conversations.length > 0
          ? project.conversations[0].timestamp
          : null,
      },
    });
  } catch (error) {
    console.error('[API /indexing/stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get indexing statistics' },
      { status: 500 }
    );
  }
}
