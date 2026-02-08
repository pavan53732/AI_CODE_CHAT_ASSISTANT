'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bundleSecurity } from '@/lib/security/ProjectBundleSecurity';

export const dynamic = 'force-dynamic';

/**
 * POST /api/memory/export
 * Export project memories to JSON
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get all project data
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        conversations: true,
        fileAnalyses: true,
        patterns: true,
        issues: true,
        decisionLocks: true,
        userBehavior: true,
        wikiPages: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        rootPath: project.rootPath,
        summary: project.summary,
        technologies: project.technologies ? JSON.parse(project.technologies) : [],
        architecture: project.architecture,
        userInterests: project.userInterests ? JSON.parse(project.userInterests) : [],
        createdAt: project.createdAt,
        lastAccessed: project.lastAccessed,
      },
      memories: {
        conversations: project.conversations.map((conv) => ({
          id: conv.id,
          timestamp: conv.timestamp,
          messages: conv.messages ? JSON.parse(conv.messages) : [],
          contextFiles: conv.contextFiles ? JSON.parse(conv.contextFiles) : [],
          topics: conv.topics ? JSON.parse(conv.topics) : [],
          summary: conv.summary,
          keyInsights: conv.keyInsights ? JSON.parse(conv.keyInsights) : [],
        })),
        fileAnalyses: project.fileAnalyses.map((analysis) => ({
          id: analysis.id,
          filePath: analysis.filePath,
          summary: analysis.summary,
          purpose: analysis.purpose,
          keyFunctions: analysis.keyFunctions ? JSON.parse(analysis.keyFunctions) : [],
          dependencies: analysis.dependencies ? JSON.parse(analysis.dependencies) : [],
          dependents: analysis.dependents ? JSON.parse(analysis.dependents) : [],
          patterns: analysis.patterns ? JSON.parse(analysis.patterns) : [],
          issues: analysis.issues ? JSON.parse(analysis.issues) : [],
          suggestions: analysis.suggestions ? JSON.parse(analysis.suggestions) : [],
          complexity: analysis.complexity,
          analyzedAt: analysis.analyzedAt,
          lastModifiedAt: analysis.lastModifiedAt,
          analysisCount: analysis.analysisCount,
        })),
        patterns: project.patterns.map((pattern) => ({
          id: pattern.id,
          pattern: pattern.pattern,
          files: pattern.files ? JSON.parse(pattern.files) : [],
          frequency: pattern.frequency,
          type: pattern.type,
          lastSeen: pattern.lastSeen,
        })),
        issues: project.issues.map((issue) => ({
          id: issue.id,
          filePath: issue.filePath,
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
          location: issue.location,
          status: issue.status,
          discoveredAt: issue.discoveredAt,
          mentionedIn: issue.mentionedIn ? JSON.parse(issue.mentionedIn) : [],
        })),
        decisionLocks: project.decisionLocks.map((lock) => ({
          id: lock.id,
          rule: lock.rule,
          scope: lock.scope,
          priority: lock.priority,
          source: lock.source,
          context: lock.context,
          reasoning: lock.reasoning,
          createdAt: lock.createdAt,
          updatedAt: lock.updatedAt,
          violations: lock.violations,
          lastViolation: lock.lastViolation,
          active: lock.active,
        })),
      },
      userBehavior: project.userBehavior ? {
        commonQuestions: project.userBehavior.commonQuestions ? JSON.parse(project.userBehavior.commonQuestions) : [],
        frequentlyAccessedFiles: project.userBehavior.frequentlyAccessedFiles ? JSON.parse(project.userBehavior.frequentlyAccessedFiles) : [],
        preferredFileTypes: project.userBehavior.preferredFileTypes ? JSON.parse(project.userBehavior.preferredFileTypes) : [],
        topicsOfInterest: project.userBehavior.topicsOfInterest ? JSON.parse(project.userBehavior.topicsOfInterest) : [],
        lastUpdated: project.userBehavior.lastUpdated,
      } : null,
      wikiPages: project.wikiPages.map((wiki) => ({
        id: wiki.id,
        title: wiki.title,
        slug: wiki.slug,
        category: wiki.category,
        content: wiki.content,
        metadata: wiki.metadata ? JSON.parse(wiki.metadata) : {},
        relatedFiles: wiki.relatedFiles ? JSON.parse(wiki.relatedFiles) : [],
        linksTo: wiki.linksTo ? JSON.parse(wiki.linksTo) : [],
        version: wiki.version,
        generatedAt: wiki.generatedAt,
        updatedAt: wiki.updatedAt,
        userNotes: wiki.userNotes,
      })),
    };

    // Check for encryption/signing options
    const { encrypt, sign, password, privateKey } = body;

    if (encrypt && password) {
      bundleSecurity.setEncryptionKey(password);
    }
    if (sign && privateKey) {
      bundleSecurity.setSigningKey(privateKey);
    }

    // Create secure bundle if encryption or signing requested
    if (encrypt || sign) {
      const bundle = bundleSecurity.createBundle(exportData, { encrypt, sign });
      const bundleJson = JSON.stringify(bundle, null, 2);

      return new NextResponse(bundleJson, {
        headers: {
          'Content-Disposition': `attachment; filename="${project.name}.ai-project-bundle"`,
          'Content-Type': 'application/json',
        },
      });
    }

    // Regular JSON export
    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="${project.name}-memory-export.json"`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[API /memory/export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export memory' },
      { status: 500 }
    );
  }
}
