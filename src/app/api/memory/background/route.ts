'use server';

import { NextRequest, NextResponse } from 'next/server';
import { MemoryManager } from '@/lib/memory/MemoryManager';
import { PatternDetector } from '@/lib/pattern-detection/PatternDetector';
import { IssueTracker } from '@/lib/issue-tracking/IssueTracker';
import { db } from '@/lib/db';

/**
 * POST /api/memory/background
 * Run background memory maintenance tasks
 * - Cleanup old memories (30-day archive, 365-day delete)
 * - Apply sliding window (25 messages)
 * - Auto pattern detection
 * - Auto issue detection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, action = 'all' } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const memoryManager = new MemoryManager();
    const results: Record<string, any> = {};

    // Run cleanup tasks
    if (action === 'all' || action === 'cleanup') {
      const { deleted, archived } = await memoryManager.cleanupOldMemories(projectId);
      results.cleanup = { deleted, archived };
    }

    // Apply sliding window
    if (action === 'all' || action === 'sliding-window') {
      await memoryManager.applySlidingWindow(projectId);
      results.slidingWindow = { applied: true };
    }

    // Get weighted memories
    if (action === 'all' || action === 'weighted-memories') {
      const memories = await memoryManager.getWeightedMemories(projectId, 10);
      results.weightedMemories = memories.map(m => ({
        type: m.type,
        weight: m.weight,
        id: m.id,
      }));
    }

    // Auto pattern detection (lazy analysis)
    if (action === 'all' || action === 'pattern-detection') {
      const files = await db.fileAnalysis.findMany({
        where: { projectId },
        take: 20,
      });

      const patternDetector = new PatternDetector();
      const detectedPatterns = [];

      for (const file of files) {
        // Skip if already analyzed recently (lazy)
        const lastAnalyzed = file.analyzedAt;
        const hoursSinceAnalysis = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60);

        if (hoursSinceAnalysis > 24) { // Only re-analyze if older than 24 hours
          const patterns = patternDetector.detectPatterns('', file.filePath);
          detectedPatterns.push(...patterns);
        }
      }

      results.patternDetection = {
        filesAnalyzed: files.length,
        patternsFound: detectedPatterns.length,
      };
    }

    // Auto issue detection
    if (action === 'all' || action === 'issue-detection') {
      const files = await db.fileAnalysis.findMany({
        where: { projectId },
        take: 20,
      });

      const issueTracker = new IssueTracker();
      const detectedIssues = [];

      for (const file of files) {
        const issues = issueTracker.detectIssues('', file.filePath);
        detectedIssues.push(...issues);

        // Store new issues
        for (const issue of issues) {
          await db.issueMemory.create({
            data: {
              projectId,
              filePath: file.filePath,
              type: issue.type,
              severity: issue.severity,
              description: issue.description,
              location: issue.location,
              status: 'open',
              discoveredAt: new Date(),
            },
          });
        }
      }

      results.issueDetection = {
        filesAnalyzed: files.length,
        issuesFound: detectedIssues.length,
      };
    }

    return NextResponse.json({
      success: true,
      projectId,
      action,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /memory/background] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run background tasks' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/memory/background/status
 * Get status of background tasks
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

    // Get memory stats
    const totalConversations = await db.conversation.count({
      where: { projectId },
    });

    const archivedConversations = await db.conversation.count({
      where: {
        projectId,
        topics: { contains: '_archived' },
      },
    });

    const totalPatterns = await db.codePattern.count({
      where: { projectId },
    });

    const openIssues = await db.issueMemory.count({
      where: { projectId, status: 'open' },
    });

    // Get recent activity
    const recentConversations = await db.conversation.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      projectId,
      stats: {
        totalConversations,
        archivedConversations,
        activeConversations: totalConversations - archivedConversations,
        totalPatterns,
        openIssues,
      },
      recentActivity: recentConversations.map(c => ({
        id: c.id,
        timestamp: c.timestamp,
        summary: c.summary,
      })),
    });
  } catch (error) {
    console.error('[API /memory/background] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get background status' },
      { status: 500 }
    );
  }
}
