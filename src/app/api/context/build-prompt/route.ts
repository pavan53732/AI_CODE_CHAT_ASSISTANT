'use server';

import { NextRequest, NextResponse } from 'next/server';
import { ContextOrchestrator } from '@/lib/context-orchestrator';

const orchestrator = new ContextOrchestrator();

/**
 * POST /api/context/build-prompt
 * Build an AI prompt with proper context
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, userTask, modelTier, contextHints } = body;

    if (!projectId || !userTask || !modelTier) {
      return NextResponse.json(
        { error: 'Invalid request: projectId, userTask, and modelTier are required' },
        { status: 400 }
      );
    }

    const result = await orchestrator.buildPrompt({
      projectId,
      userTask,
      modelTier,
      contextHints,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /context/build-prompt] Error:', error);
    return NextResponse.json(
      { error: 'Failed to build prompt' },
      { status: 500 }
    );
  }
}
