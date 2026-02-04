'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/memory/search
 * Search across all memories
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filters } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const results: any[] = [];
    const queryLower = query.toLowerCase();

    // Search conversations
    if (!filters || !filters.type || filters.type === 'conversations') {
      const conversations = await db.conversation.findMany({
        where: {
          OR: [
            { topics: { contains: query } },
            { summary: { contains: query } },
          ],
        },
        take: 10,
      });

      for (const conv of conversations) {
        const topics = conv.topics ? JSON.parse(conv.topics) : [];
        results.push({
          type: 'conversation',
          relevance: topics.filter((t: string) => t.toLowerCase().includes(queryLower)).length * 0.3,
          data: {
            id: conv.id,
            timestamp: conv.timestamp,
            summary: conv.summary,
            topics,
          },
        });
      }
    }

    // Search file analyses
    if (!filters || !filters.type || filters.type === 'files') {
      const analyses = await db.fileAnalysis.findMany({
        where: {
          OR: [
            { summary: { contains: query } },
            { purpose: { contains: query } },
          ],
        },
        take: 20,
      });

      for (const analysis of analyses) {
        results.push({
          type: 'file',
          relevance: analysis.summary.toLowerCase().includes(queryLower) ? 0.8 : 0.3,
          data: {
            id: analysis.id,
            filePath: analysis.filePath,
            summary: analysis.summary,
            purpose: analysis.purpose,
          },
        });
      }
    }

    // Search patterns
    if (!filters || !filters.type || filters.type === 'patterns') {
      const patterns = await db.codePattern.findMany({
        where: {
          pattern: { contains: query },
        },
        orderBy: { frequency: 'desc' },
        take: 20,
      });

      for (const pattern of patterns) {
        results.push({
          type: 'pattern',
          relevance: pattern.frequency * 0.1,
          data: {
            id: pattern.id,
            pattern: pattern.pattern,
            type: pattern.type,
            frequency: pattern.frequency,
            files: JSON.parse(pattern.files),
          },
        });
      }
    }

    // Search issues
    if (!filters || !filters.type || filters.type === 'issues') {
      const issues = await db.issueMemory.findMany({
        where: {
          OR: [
            { description: { contains: query } },
          ],
          ...(filters?.severity && { severity: filters.severity }),
        },
        take: 20,
      });

      for (const issue of issues) {
        results.push({
          type: 'issue',
          relevance: issue.description.toLowerCase().includes(queryLower) ? 0.9 : 0.4,
          data: {
            id: issue.id,
            filePath: issue.filePath,
            type: issue.type,
            severity: issue.severity,
            description: issue.description,
            status: issue.status,
          },
        });
      }
    }

    // Sort by relevance and return
    const sortedResults = results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 50);

    return NextResponse.json({ results: sortedResults });
  } catch (error) {
    console.error('[API /memory/search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search memory' },
      { status: 500 }
    );
  }
}
