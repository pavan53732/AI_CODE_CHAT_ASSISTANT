'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/wiki/pages?projectId=X
 * Get all wiki pages for a project
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId') || 'default';

    // Get all wiki pages for the project
    const pages = await db.wikiPage.findMany({
      where: {
        projectId: projectId,
      },
      orderBy: {
        category: 'asc',
      },
    });

    // Group pages by category
    const groupedPages = pages.reduce((acc, page) => {
      if (!acc[page.category]) {
        acc[page.category] = [];
      }
      acc[page.category].push(page);
      return acc;
    }, {} as Record<string, typeof pages>);

    return NextResponse.json({
      success: true,
      projectId,
      pages,
      groupedPages,
      total: pages.length,
    });
  } catch (error) {
    console.error('[API /wiki/pages] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get wiki pages',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
