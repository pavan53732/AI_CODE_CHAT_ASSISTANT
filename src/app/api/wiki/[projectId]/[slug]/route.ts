'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/wiki/:projectId/:slug
 * Get a specific wiki page by slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; slug: string }> }
) {
  try {
    const { projectId, slug } = await params;

    const wikiPage = await db.wikiPage.findFirst({
      where: {
        projectId,
        slug,
      },
    });

    if (!wikiPage) {
      return NextResponse.json(
        { error: 'Wiki page not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    return NextResponse.json({
      id: wikiPage.id,
      projectId: wikiPage.projectId,
      title: wikiPage.title,
      slug: wikiPage.slug,
      category: wikiPage.category,
      content: wikiPage.content,
      metadata: wikiPage.metadata ? JSON.parse(wikiPage.metadata) : {},
      relatedFiles: wikiPage.relatedFiles ? JSON.parse(wikiPage.relatedFiles) : [],
      linksTo: wikiPage.linksTo ? JSON.parse(wikiPage.linksTo) : [],
      version: wikiPage.version,
      generatedAt: wikiPage.generatedAt,
      updatedAt: wikiPage.updatedAt,
      userNotes: wikiPage.userNotes,
    });
  } catch (error) {
    console.error('[API /wiki/:projectId/:slug] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get wiki page' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/wiki/:projectId/:slug
 * Update a wiki page (for user notes)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; slug: string }> }
) {
  try {
    const { projectId, slug } = await params;
    const body = await request.json();
    const { userNotes } = body;

    const wikiPage = await db.wikiPage.findFirst({
      where: {
        projectId,
        slug,
      },
    });

    if (!wikiPage) {
      return NextResponse.json(
        { error: 'Wiki page not found' },
        { status: 404 }
      );
    }

    // Update the wiki page
    const updatedPage = await db.wikiPage.update({
      where: { id: wikiPage.id },
      data: {
        userNotes,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      userNotes: updatedPage.userNotes,
      updatedAt: updatedPage.updatedAt,
    });
  } catch (error) {
    console.error('[API /wiki/:projectId/:slug PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update wiki page' },
      { status: 500 }
    );
  }
}
