'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/wiki/:projectId/:slug/notes
 * Add or update notes for a wiki page
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; slug: string }> }
) {
  try {
    const { projectId, slug } = await params;
    const body = await request.json();
    const { notes, append = false } = body;

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

    // Handle append vs replace
    const updatedNotes = append && wikiPage.userNotes
      ? `${wikiPage.userNotes}\n\n---\n\n${notes}`
      : notes;

    // Update the wiki page
    const updatedPage = await db.wikiPage.update({
      where: { id: wikiPage.id },
      data: {
        userNotes: updatedNotes,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      userNotes: updatedPage.userNotes,
      updatedAt: updatedPage.updatedAt,
    });
  } catch (error) {
    console.error('[API /wiki/:projectId/:slug/notes] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update wiki notes' },
      { status: 500 }
    );
  }
}
