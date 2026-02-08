'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bundleSecurity, SecureBundle } from '@/lib/security/ProjectBundleSecurity';

/**
 * POST /api/memory/import
 * Import project memories from JSON
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exportData, merge = true, password, publicKey } = body;

    if (!exportData) {
      return NextResponse.json(
        { error: 'Export data is required' },
        { status: 400 }
      );
    }

    let data = exportData;

    // Check if this is a secure bundle
    if (exportData.encrypted || exportData.signed) {
      // Set up decryption if password provided
      if (password) {
        bundleSecurity.setEncryptionKey(password);
      }

      // Extract bundle
      try {
        data = bundleSecurity.extractBundle(exportData as SecureBundle, publicKey);
      } catch (error) {
        return NextResponse.json(
          { error: `Bundle extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }

    // Validate export data format
    if (!data.version || !data.project || !data.memories) {
      return NextResponse.json(
        { error: 'Invalid export data format' },
        { status: 400 }
      );
    }

    // Ensure wiki pages are included (Privacy & Security requirement)
    if (!data.wikiPages) {
      console.warn('[API /memory/import] Warning: Import data missing wiki pages');
    }

    const { project, memories, userBehavior, wikiPages } = data;
    let projectRecord;

    if (merge) {
      // Try to find existing project
      projectRecord = await db.project.findFirst({
        where: { rootPath: project.rootPath },
      });

      if (projectRecord) {
        // Update existing project
        projectRecord = await db.project.update({
          where: { id: projectRecord.id },
          data: {
            name: project.name,
            summary: project.summary,
            technologies: JSON.stringify(project.technologies),
            architecture: project.architecture,
            userInterests: JSON.stringify(project.userInterests),
            lastAccessed: new Date(),
          },
        });
      } else {
        // Create new project
        projectRecord = await db.project.create({
          data: {
            id: project.id,
            name: project.name,
            rootPath: project.rootPath,
            summary: project.summary,
            technologies: JSON.stringify(project.technologies),
            architecture: project.architecture,
            userInterests: JSON.stringify(project.userInterests),
          },
        });
      }
    } else {
      // Force create new project (generate new ID to avoid conflicts)
      const newId = `${project.id}-import-${Date.now()}`;
      projectRecord = await db.project.create({
        data: {
          id: newId,
          name: `${project.name} (Imported)`,
          rootPath: project.rootPath,
          summary: project.summary,
          technologies: JSON.stringify(project.technologies),
          architecture: project.architecture,
          userInterests: JSON.stringify(project.userInterests),
        },
      });
    }

    const projectId = projectRecord.id;
    const importStats = {
      conversations: 0,
      fileAnalyses: 0,
      patterns: 0,
      issues: 0,
      decisionLocks: 0,
      wikiPages: 0,
    };

    // Import conversations
    if (memories.conversations) {
      for (const conv of memories.conversations) {
        await db.conversation.create({
          data: {
            projectId,
            timestamp: new Date(conv.timestamp),
            messages: JSON.stringify(conv.messages),
            contextFiles: JSON.stringify(conv.contextFiles),
            topics: JSON.stringify(conv.topics),
            summary: conv.summary,
            keyInsights: JSON.stringify(conv.keyInsights),
          },
        });
        importStats.conversations++;
      }
    }

    // Import file analyses
    if (memories.fileAnalyses) {
      for (const analysis of memories.fileAnalyses) {
        await db.fileAnalysis.create({
          data: {
            projectId,
            filePath: analysis.filePath,
            summary: analysis.summary,
            purpose: analysis.purpose,
            keyFunctions: JSON.stringify(analysis.keyFunctions),
            dependencies: JSON.stringify(analysis.dependencies),
            dependents: JSON.stringify(analysis.dependents),
            patterns: JSON.stringify(analysis.patterns),
            issues: JSON.stringify(analysis.issues),
            suggestions: JSON.stringify(analysis.suggestions),
            complexity: analysis.complexity,
            analyzedAt: analysis.analyzedAt,
            lastModifiedAt: analysis.lastModifiedAt,
            analysisCount: analysis.analysisCount,
          },
        });
        importStats.fileAnalyses++;
      }
    }

    // Import patterns
    if (memories.patterns) {
      for (const pattern of memories.patterns) {
        await db.codePattern.create({
          data: {
            projectId,
            pattern: pattern.pattern,
            files: JSON.stringify(pattern.files),
            frequency: pattern.frequency,
            type: pattern.type,
            lastSeen: pattern.lastSeen,
          },
        });
        importStats.patterns++;
      }
    }

    // Import issues
    if (memories.issues) {
      for (const issue of memories.issues) {
        await db.issueMemory.create({
          data: {
            projectId,
            filePath: issue.filePath,
            type: issue.type,
            severity: issue.severity,
            description: issue.description,
            location: issue.location,
            status: issue.status,
            discoveredAt: issue.discoveredAt,
            mentionedIn: JSON.stringify(issue.mentionedIn),
          },
        });
        importStats.issues++;
      }
    }

    // Import decision locks
    if (memories.decisionLocks) {
      for (const lock of memories.decisionLocks) {
        await db.decisionLock.create({
          data: {
            projectId,
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
          },
        });
        importStats.decisionLocks++;
      }
    }

    // Import user behavior
    if (userBehavior) {
      await db.userBehavior.upsert({
        where: { projectId },
        create: {
          projectId,
          commonQuestions: JSON.stringify(userBehavior.commonQuestions),
          frequentlyAccessedFiles: JSON.stringify(userBehavior.frequentlyAccessedFiles),
          preferredFileTypes: JSON.stringify(userBehavior.preferredFileTypes),
          topicsOfInterest: JSON.stringify(userBehavior.topicsOfInterest),
          lastUpdated: userBehavior.lastUpdated ? new Date(userBehavior.lastUpdated) : new Date(),
        },
        update: {
          commonQuestions: JSON.stringify(userBehavior.commonQuestions),
          frequentlyAccessedFiles: JSON.stringify(userBehavior.frequentlyAccessedFiles),
          preferredFileTypes: JSON.stringify(userBehavior.preferredFileTypes),
          topicsOfInterest: JSON.stringify(userBehavior.topicsOfInterest),
          lastUpdated: userBehavior.lastUpdated ? new Date(userBehavior.lastUpdated) : new Date(),
        },
      });
    }

    // Import wiki pages
    if (wikiPages) {
      for (const wiki of wikiPages) {
        await db.wikiPage.create({
          data: {
            projectId,
            title: wiki.title,
            slug: wiki.slug,
            category: wiki.category,
            content: wiki.content,
            metadata: JSON.stringify(wiki.metadata),
            relatedFiles: JSON.stringify(wiki.relatedFiles),
            linksTo: JSON.stringify(wiki.linksTo),
            version: wiki.version,
            generatedAt: wiki.generatedAt,
            updatedAt: wiki.updatedAt,
            userNotes: wiki.userNotes,
          },
        });
        importStats.wikiPages++;
      }
    }

    return NextResponse.json({
      success: true,
      projectId,
      importStats,
    });
  } catch (error) {
    console.error('[API /memory/import] Error:', error);
    return NextResponse.json(
      { error: 'Failed to import memory' },
      { status: 500 }
    );
  }
}
