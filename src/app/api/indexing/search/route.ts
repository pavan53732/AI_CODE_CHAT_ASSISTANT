'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/indexing/search
 * Search the code index
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId = 'default', query, limit = 20 } = body;

    // Validate inputs
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Search in file analyses
    const fileAnalyses = await db.fileAnalysis.findMany({
      where: {
        projectId,
        OR: [
          { filePath: { contains: query, mode: 'insensitive' } },
          { language: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });

    // Search in code patterns
    const patterns = await db.codePattern.findMany({
      where: {
        projectId,
        OR: [
          { pattern: { contains: query, mode: 'insensitive' } },
          { fileContext: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });

    // Search in issues
    const issues = await db.issueMemory.findMany({
      where: {
        projectId,
        status: 'open',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { location: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });

    // Combine and deduplicate results
    const results = [
      ...fileAnalyses.map(f => ({
        type: 'file',
        id: `file:${f.id}`,
        path: f.filePath,
        language: f.language,
        relevance: f.filePath.toLowerCase().includes(query.toLowerCase()) ? 1.0 : 0.5,
        metadata: {
          lineCount: f.lineCount,
          functionCount: f.functionCount,
          classCount: f.classCount,
          lastAnalyzed: f.lastAnalyzed,
        },
      })),
      ...patterns.map(p => ({
        type: 'pattern',
        id: `pattern:${p.id}`,
        path: p.fileContext || '',
        language: 'unknown',
        relevance: p.pattern.toLowerCase().includes(query.toLowerCase()) ? 0.9 : 0.6,
        metadata: {
          pattern: p.pattern,
          frequency: p.frequency,
          confidence: p.confidence,
          type: p.type,
        },
      })),
      ...issues.map(i => ({
        type: 'issue',
        id: `issue:${i.id}`,
        path: i.location || '',
        language: 'unknown',
        relevance: i.title.toLowerCase().includes(query.toLowerCase()) ? 0.85 : 0.55,
        metadata: {
          title: i.title,
          description: i.description,
          type: i.type,
          severity: i.severity,
          status: i.status,
          discoveredAt: i.discoveredAt,
        },
      })),
    ];

    // Sort by relevance and limit results
    const sortedResults = results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      query,
      results: sortedResults,
      total: sortedResults.length,
    });
  } catch (error) {
    console.error('[API /indexing/search] Error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
