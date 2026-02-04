'use server';

import { NextRequest, NextResponse } from 'next/server';
import { ContextOrchestrator } from '@/lib/context-orchestrator';

const orchestrator = new ContextOrchestrator();

/**
 * GET /api/context/violations/[projectId]
 * Get violation history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const result = await orchestrator.getViolations(projectId, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /context/violations/[projectId]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get violations' },
      { status: 500 }
    );
  }
}
