'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/wiki/categories?projectId={projectId}
 * Get all wiki categories for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get all wiki pages for the project
    const wikiPages = await db.wikiPage.findMany({
      where: { projectId },
      select: {
        category: true,
      },
    });

    // Group by category and count pages
    const categoryCount = new Map<string, number>();
    for (const page of wikiPages) {
      const category = page.category || 'uncategorized';
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    }

    // Convert to array
    const categories = Array.from(categoryCount.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    // Sort by count and name
    categories.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.category.localeCompare(b.category);
    });

    return NextResponse.json({
      projectId,
      categories,
      totalCategories: categories.length,
    });
  } catch (error) {
    console.error('[API /wiki/categories] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get wiki categories' },
      { status: 500 }
    );
  }
}
