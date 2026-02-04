'use server';

import { NextRequest, NextResponse } from 'next/server';
import { ContextOrchestrator } from '@/lib/context-orchestrator';

const orchestrator = new ContextOrchestrator();

/**
 * POST /api/context/decision-locks
 * Create or update decision locks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, locks } = body;

    if (!projectId || !Array.isArray(locks)) {
      return NextResponse.json(
        { error: 'Invalid request: projectId and locks array are required' },
        { status: 400 }
      );
    }

    const result = await orchestrator.createOrUpdateDecisionLocks({
      projectId,
      locks,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /context/decision-locks] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create/update decision locks' },
      { status: 500 }
    );
  }
}
