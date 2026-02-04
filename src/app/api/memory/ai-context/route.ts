'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/memory/ai-context
 * Get optimized AI context combining all memory layers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, query, contextFiles, maxTokens = 8000 } = body;

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

    // Get decision locks
    const decisionLocks = await db.decisionLock.findMany({
      where: { projectId, active: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });

    // Get recent conversations
    const recentConversations = await db.conversation.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    // Get relevant file analyses
    const relevantAnalyses = await db.fileAnalysis.findMany({
      where: { projectId },
      take: 10,
    });

    // Get patterns
    const patterns = await db.codePattern.findMany({
      where: { projectId },
      orderBy: { frequency: 'desc' },
      take: 10,
    });

    // Get open issues
    const issues = await db.issueMemory.findMany({
      where: { projectId, status: 'open' },
      orderBy: { severity: 'desc' },
      take: 10,
    });

    // Get user behavior
    const userBehavior = await db.userBehavior.findUnique({
      where: { projectId },
    });

    // Calculate memory usage
    let usedTokens = 1000; // Base system prompt tokens
    const contexts: any[] = [];

    // Add decision locks (highest priority)
    for (const lock of decisionLocks) {
      const lockContext = {
        type: 'decision-lock',
        data: {
          rule: lock.rule,
          scope: lock.scope,
          priority: lock.priority,
        },
      };
      const estimatedTokens = lockContext.data.rule.length / 4;
      if (usedTokens + estimatedTokens <= maxTokens) {
        contexts.push(lockContext);
        usedTokens += estimatedTokens;
      }
    }

    // Add project summary
    const projectSummary = {
      name: project.name,
      summary: project.summary,
      technologies: project.technologies ? JSON.parse(project.technologies) : [],
      architecture: project.architecture,
      userInterests: project.userInterests ? JSON.parse(project.userInterests) : [],
    };
    const projectContext = {
      type: 'project-summary',
      data: projectSummary,
    };
    const projectTokens = JSON.stringify(projectSummary).length / 4;
    if (usedTokens + projectTokens <= maxTokens) {
      contexts.unshift(projectContext);
      usedTokens += projectTokens;
    }

    // Add relevant conversations
    for (const conv of recentConversations) {
      const convContext = {
        type: 'conversation',
        data: {
          summary: conv.summary,
          keyInsights: conv.keyInsights ? JSON.parse(conv.keyInsights) : [],
        },
      };
      const estimatedTokens = JSON.stringify(convContext.data).length / 4;
      if (usedTokens + estimatedTokens <= maxTokens) {
        contexts.push(convContext);
        usedTokens += estimatedTokens;
      }
    }

    // Add patterns
    const patternContext = {
      type: 'patterns',
      data: patterns.map((p: any) => ({
        pattern: p.pattern,
        type: p.type,
        frequency: p.frequency,
      })),
    };
    const patternTokens = JSON.stringify(patternContext.data).length / 4;
    if (usedTokens + patternTokens <= maxTokens) {
      contexts.push(patternContext);
      usedTokens += patternTokens;
    }

    // Add issues
    const issuesContext = {
      type: 'issues',
      data: issues.map((i: any) => ({
        type: i.type,
        severity: i.severity,
        description: i.description,
        filePath: i.filePath,
      })),
    };
    const issuesTokens = JSON.stringify(issuesContext.data).length / 4;
    if (usedTokens + issuesTokens <= maxTokens) {
      contexts.push(issuesContext);
      usedTokens += issuesTokens;
    }

    // Add user behavior
    if (userBehavior) {
      const behaviorContext = {
        type: 'user-behavior',
        data: {
          commonQuestions: userBehavior.commonQuestions ? JSON.parse(userBehavior.commonQuestions) : [],
          topicsOfInterest: userBehavior.topicsOfInterest ? JSON.parse(userBehavior.topicsOfInterest) : [],
        },
      };
      const behaviorTokens = JSON.stringify(behaviorContext.data).length / 4;
      if (usedTokens + behaviorTokens <= maxTokens) {
        contexts.push(behaviorContext);
        usedTokens += behaviorTokens;
      }
    }

    // Build final context
    const fullContext = {
      contexts,
      tokenBudget: {
        max: maxTokens,
        used: Math.floor(usedTokens),
        remaining: Math.floor(maxTokens - usedTokens),
      },
    };

    return NextResponse.json(fullContext);
  } catch (error) {
    console.error('[API /memory/ai-context] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI context' },
      { status: 500 }
    );
  }
}
