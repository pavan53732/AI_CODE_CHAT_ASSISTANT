'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/wiki/pages/[pageId]
 * Get a specific wiki page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;

    const page = await db.wikiPage.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      return NextResponse.json(
        { error: 'Wiki page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      page,
    });
  } catch (error) {
    console.error('[API /wiki/pages/[pageId]] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get wiki page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/wiki/pages/[pageId]
 * Update a wiki page
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const body = await request.json();
    const { title, content, tags } = body;

    const page = await db.wikiPage.update({
      where: { id: pageId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(tags !== undefined && { tags }),
        lastUpdated: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      page,
      message: 'Wiki page updated successfully',
    });
  } catch (error) {
    console.error('[API /wiki/pages/[pageId]] PUT Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update wiki page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wiki/pages/[pageId]
 * Delete a wiki page
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;

    await db.wikiPage.delete({
      where: { id: pageId },
    });

    return NextResponse.json({
      success: true,
      message: 'Wiki page deleted successfully',
    });
  } catch (error) {
    console.error('[API /wiki/pages/[pageId]] DELETE Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete wiki page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
