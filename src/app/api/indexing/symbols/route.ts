'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/indexing/symbols?projectId={projectId}&symbol={symbol}&type={type}
 * Get symbols/functions across indexed files
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get all file analyses for the project
    const fileAnalyses = await db.fileAnalysis.findMany({
      where: { projectId },
      select: {
        filePath: true,
        keyFunctions: true,
        purpose: true,
      },
    });

    const symbols: any[] = [];

    for (const analysis of fileAnalyses) {
      const keyFunctions = analysis.keyFunctions ? JSON.parse(analysis.keyFunctions) : [];
      const functions = Array.isArray(keyFunctions) ? keyFunctions : [];

      for (const func of functions) {
        const funcObj = typeof func === 'string' ? { name: func } : func;

        // Filter by symbol name if provided
        if (symbol && !funcObj.name?.toLowerCase().includes(symbol.toLowerCase())) {
          continue;
        }

        // Filter by type if provided
        if (type && funcObj.type !== type) {
          continue;
        }

        symbols.push({
          name: funcObj.name || func,
          filePath: analysis.filePath,
          type: funcObj.type || 'function',
          description: funcObj.description,
          purpose: analysis.purpose,
        });
      }
    }

    // Group symbols by name
    const grouped = new Map<string, any[]>();
    for (const sym of symbols) {
      const key = sym.name;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(sym);
    }

    // Convert to array
    const result = Array.from(grouped.entries()).map(([name, occurrences]) => ({
      name,
      occurrences,
      count: occurrences.length,
      types: [...new Set(occurrences.map((o) => o.type))],
    }));

    // Sort by occurrence count
    result.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      projectId,
      totalSymbols: result.length,
      symbols: result.slice(0, 100), // Limit to 100 results
    });
  } catch (error) {
    console.error('[API /indexing/symbols] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get symbols' },
      { status: 500 }
    );
  }
}
