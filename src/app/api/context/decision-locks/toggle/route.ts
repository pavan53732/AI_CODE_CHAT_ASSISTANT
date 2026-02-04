'use server';

import { NextRequest, NextResponse } from 'next/server';
import { ContextOrchestrator } from '@/lib/context-orchestrator';

const orchestrator = new ContextOrchestrator();

/**
 * POST /api/context/decision-locks/toggle
 * Toggle decision lock active status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, active } = body;

    if (!id || typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: id and active boolean are required' },
        { status: 400 }
      );
    }

    const result = await orchestrator.toggleDecisionLock(id, active);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /context/decision-locks/toggle] Error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle decision lock' },
      { status: 500 }
    );
  }
}
