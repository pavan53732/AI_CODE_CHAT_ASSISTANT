'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/memory/project/[projectId]
 * Get all memory for a project
 * Special case: projectId='default' will return or create the default project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    let project;
    const isDefault = projectId === 'default';

    if (isDefault) {
      // Try to find existing default project
      project = await db.project.findFirst({
        where: { rootPath: '.' },
        include: {
          conversations: {
            take: 10,
            orderBy: { timestamp: 'desc' },
          },
          fileAnalyses: {
            take: 20,
          },
          patterns: {
            orderBy: { lastSeen: 'desc' },
            take: 20,
          },
          issues: {
            where: { status: 'open' },
            orderBy: { discoveredAt: 'desc' },
            take: 20,
          },
          userBehavior: true,
        },
      });

      // If no default project exists, create one
      if (!project) {
        project = await db.project.create({
          data: {
            id: 'default',
            name: 'Default Project',
            rootPath: '.',
            summary: 'Auto-generated default project',
            technologies: '[]',
            architecture: '',
            userInterests: '[]',
          },
          include: {
            conversations: {
              take: 10,
              orderBy: { timestamp: 'desc' },
            },
            fileAnalyses: {
              take: 20,
            },
            patterns: {
              orderBy: { lastSeen: 'desc' },
              take: 20,
            },
            issues: {
              where: { status: 'open' },
              orderBy: { discoveredAt: 'desc' },
              take: 20,
            },
            userBehavior: true,
          },
        });
      }
    } else {
      // Get specific project by ID
      project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          conversations: {
            take: 10,
            orderBy: { timestamp: 'desc' },
          },
          fileAnalyses: {
            take: 20,
          },
          patterns: {
            orderBy: { lastSeen: 'desc' },
            take: 20,
          },
          issues: {
            where: { status: 'open' },
            orderBy: { discoveredAt: 'desc' },
            take: 20,
          },
          userBehavior: true,
        },
      });
    }

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const topPatterns = project.patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        rootPath: project.rootPath,
        summary: project.summary,
        technologies: project.technologies ? JSON.parse(project.technologies) : [],
        architecture: project.architecture,
        userInterests: project.userInterests ? JSON.parse(project.userInterests) : [],
      },
      recentConversations: project.conversations,
      topPatterns,
      openIssues: project.issues,
      userBehavior: project.userBehavior,
    });
  } catch (error) {
    console.error('[API /memory/project] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get project memory' },
      { status: 500 }
    );
  }
}
