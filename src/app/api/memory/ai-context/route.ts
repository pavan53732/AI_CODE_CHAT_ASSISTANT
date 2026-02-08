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

    // FUSION CONTEXT MODEL: Index > Memory > Wiki
    // Priority 1: Index Facts (Code Context) - 40% of budget
    const indexBudget = maxTokens * 0.40;
    let indexTokens = 0;
    
    // Add file analyses (Index layer - highest priority)
    for (const analysis of relevantAnalyses) {
      const analysisContext = {
        type: 'index-fact',
        layer: 'index',
        priority: 1,
        data: {
          filePath: analysis.filePath,
          summary: analysis.summary,
          purpose: analysis.purpose,
          keyFunctions: analysis.keyFunctions ? JSON.parse(analysis.keyFunctions) : [],
        },
      };
      const estimatedTokens = JSON.stringify(analysisContext.data).length / 4;
      if (indexTokens + estimatedTokens <= indexBudget && usedTokens + estimatedTokens <= maxTokens) {
        contexts.push(analysisContext);
        indexTokens += estimatedTokens;
        usedTokens += estimatedTokens;
      }
    }

    // Priority 2: Decision Locks (Rules)
    for (const lock of decisionLocks) {
      const lockContext = {
        type: 'decision-lock',
        layer: 'rules',
        priority: 2,
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

    // Priority 3: Project Summary
    const projectSummary = {
      name: project.name,
      summary: project.summary,
      technologies: project.technologies ? JSON.parse(project.technologies) : [],
      architecture: project.architecture,
      userInterests: project.userInterests ? JSON.parse(project.userInterests) : [],
    };
    const projectContext = {
      type: 'project-summary',
      layer: 'memory',
      priority: 3,
      data: projectSummary,
    };
    const projectTokens = JSON.stringify(projectSummary).length / 4;
    if (usedTokens + projectTokens <= maxTokens) {
      contexts.push(projectContext);
      usedTokens += projectTokens;
    }

    // Priority 4: Memory Layer (Conversations, Patterns, Issues)
    const memoryBudget = maxTokens * 0.30;
    let memoryTokens = 0;

    // Add relevant conversations
    for (const conv of recentConversations) {
      const convContext = {
        type: 'conversation',
        layer: 'memory',
        priority: 4,
        data: {
          summary: conv.summary,
          keyInsights: conv.keyInsights ? JSON.parse(conv.keyInsights) : [],
        },
      };
      const estimatedTokens = JSON.stringify(convContext.data).length / 4;
      if (memoryTokens + estimatedTokens <= memoryBudget && usedTokens + estimatedTokens <= maxTokens) {
        contexts.push(convContext);
        memoryTokens += estimatedTokens;
        usedTokens += estimatedTokens;
      }
    }

    // Add patterns
    const patternContext = {
      type: 'patterns',
      layer: 'memory',
      priority: 4,
      data: patterns.map((p: any) => ({
        pattern: p.pattern,
        type: p.type,
        frequency: p.frequency,
      })),
    };
    const patternTokens = JSON.stringify(patternContext.data).length / 4;
    if (memoryTokens + patternTokens <= memoryBudget && usedTokens + patternTokens <= maxTokens) {
      contexts.push(patternContext);
      memoryTokens += patternTokens;
      usedTokens += patternTokens;
    }

    // Add issues
    const issuesContext = {
      type: 'issues',
      layer: 'memory',
      priority: 4,
      data: issues.map((i: any) => ({
        type: i.type,
        severity: i.severity,
        description: i.description,
        filePath: i.filePath,
      })),
    };
    const issuesTokens = JSON.stringify(issuesContext.data).length / 4;
    if (memoryTokens + issuesTokens <= memoryBudget && usedTokens + issuesTokens <= maxTokens) {
      contexts.push(issuesContext);
      memoryTokens += issuesTokens;
      usedTokens += issuesTokens;
    }

    // Priority 5: Wiki Layer - 20% of budget
    const wikiBudget = maxTokens * 0.20;
    let wikiTokens = 0;

    // Get wiki pages
    const wikiPages = await db.wikiPage.findMany({
      where: { projectId },
      take: 5,
    });

    for (const wiki of wikiPages) {
      const wikiContext = {
        type: 'wiki',
        layer: 'wiki',
        priority: 5,
        data: {
          title: wiki.title,
          category: wiki.category,
          content: wiki.content.slice(0, 500), // Truncate for context
        },
      };
      const estimatedTokens = JSON.stringify(wikiContext.data).length / 4;
      if (wikiTokens + estimatedTokens <= wikiBudget && usedTokens + estimatedTokens <= maxTokens) {
        contexts.push(wikiContext);
        wikiTokens += estimatedTokens;
        usedTokens += estimatedTokens;
      }
    }

    // Add user behavior (if space permits)
    if (userBehavior) {
      const behaviorContext = {
        type: 'user-behavior',
        layer: 'memory',
        priority: 6,
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

    // Sort by priority
    contexts.sort((a, b) => a.priority - b.priority);

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
