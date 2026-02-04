'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * DELETE /api/memory/clear
 * Clear project memories
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Clear all related data
    await db.conversation.deleteMany({
      where: { projectId },
    });

    await db.fileAnalysis.deleteMany({
      where: { projectId },
    });

    await db.codePattern.deleteMany({
      where: { projectId },
    });

    await db.issueMemory.deleteMany({
      where: { projectId },
    });

    await db.decisionLock.deleteMany({
      where: { projectId },
    });

    await db.userBehavior.deleteMany({
      where: { projectId },
    });

    await db.wikiPage.deleteMany({
      where: { projectId },
    });

    // Optionally delete the project itself
    const deleteProject = searchParams.get('deleteProject') === 'true';
    if (deleteProject) {
      await db.project.delete({
        where: { id: projectId },
      });
    }

    return NextResponse.json({
      success: true,
      message: deleteProject ? 'Project and all memories deleted' : 'All memories cleared',
      projectId,
    });
  } catch (error) {
    console.error('[API /memory/clear] Error:', error);
    return NextResponse.json(
      { error: 'Failed to clear memory' },
      { status: 500 }
    );
  }
}
