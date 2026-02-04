'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/wiki/search
 * Search wiki pages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, query, category } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (!query && !category) {
      return NextResponse.json(
        { error: 'Query or category is required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = { projectId };

    if (category) {
      where.category = category;
    }

    // Get wiki pages
    const wikiPages = await db.wikiPage.findMany({
      where,
    });

    // Filter by query if provided
    let results = wikiPages;
    if (query) {
      const queryLower = query.toLowerCase();

      results = wikiPages
        .map((page) => {
          let relevance = 0;

          // Title match (highest relevance)
          if (page.title.toLowerCase().includes(queryLower)) {
            relevance += 1.0;
          }

          // Content match
          if (page.content && page.content.toLowerCase().includes(queryLower)) {
            relevance += 0.5;
          }

          // Category match
          if (page.category && page.category.toLowerCase().includes(queryLower)) {
            relevance += 0.3;
          }

          // User notes match
          if (page.userNotes && page.userNotes.toLowerCase().includes(queryLower)) {
            relevance += 0.3;
          }

          // Related files match
          const relatedFiles = page.relatedFiles ? JSON.parse(page.relatedFiles) : [];
          if (relatedFiles.some((file: string) => file.toLowerCase().includes(queryLower))) {
            relevance += 0.2;
          }

          return {
            page,
            relevance,
          };
        })
        .filter((item) => item.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .map((item) => item.page);
    }

    // Limit results
    results = results.slice(0, 50);

    // Parse JSON fields
    const formattedResults = results.map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      category: page.category,
      content: page.content,
      metadata: page.metadata ? JSON.parse(page.metadata) : {},
      relatedFiles: page.relatedFiles ? JSON.parse(page.relatedFiles) : [],
      version: page.version,
      updatedAt: page.updatedAt,
      userNotes: page.userNotes,
    }));

    return NextResponse.json({
      projectId,
      query,
      category,
      totalResults: formattedResults.length,
      results: formattedResults,
    });
  } catch (error) {
    console.error('[API /wiki/search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search wiki' },
      { status: 500 }
    );
  }
}
