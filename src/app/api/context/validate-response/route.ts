'use server';

import { NextRequest, NextResponse } from 'next/server';
import { ContextOrchestrator } from '@/lib/context-orchestrator';

const orchestrator = new ContextOrchestrator();

/**
 * POST /api/context/validate-response
 * Validate AI response against decision locks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, aiResponse, promptContext } = body;

    if (!projectId || !aiResponse) {
      return NextResponse.json(
        { error: 'Invalid request: projectId and aiResponse are required' },
        { status: 400 }
      );
    }

    const result = await orchestrator.validateResponse({
      projectId,
      aiResponse,
      promptContext,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /context/validate-response] Error:', error);
    return NextResponse.json(
      { error: 'Failed to validate response' },
      { status: 500 }
    );
  }
}
