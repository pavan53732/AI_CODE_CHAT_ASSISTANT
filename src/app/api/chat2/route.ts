'use server';
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { ContextOrchestrator } from '@/lib/context-orchestrator';
import { db } from '@/lib/db';

const orchestrator = new ContextOrchestrator();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatRequest {
  message: string;
  contextFiles: string[];
  conversationHistory?: ChatMessage[];
  projectId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, contextFiles, conversationHistory = [], projectId: requestProjectId } = body;

    let currentProjectId = requestProjectId;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const project = currentProjectId ? await db.project.findUnique({
      where: { id: currentProjectId },
    }) : null;

    let finalProjectId = currentProjectId;
    if (!project) {
      const newProject = await db.project.create({
        data: {
          name: 'My Project',
          rootPath: process.env.PROJECT_ROOT_PATH || '/home/z/my-project',
          totalFiles: 0,
        },
      });
      finalProjectId = newProject.id;
    }

    const zai = await ZAI.create();
    const builtPrompt = await orchestrator.buildPrompt({
      projectId: finalProjectId,
      userTask: message,
      modelTier: 'standard',
      contextHints: {
        relevantFiles: contextFiles,
      },
    });

    const messages = [
      { role: 'assistant', content: builtPrompt.prompt },
      ...(conversationHistory || []).map((msg: ChatMessage) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const completion = await zai.chat.completions.create({
      messages: messages,
      thinking: { type: 'disabled' },
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';
    
    const validation = await orchestrator.validateResponse({
      projectId: finalProjectId,
      aiResponse,
      promptContext: builtPrompt.prompt,
    });

    let finalResponse = aiResponse;
    if (!validation.valid && validation.correctedResponse) {
      finalResponse = validation.correctedResponse;
    }

    const newConversation = await db.conversation.create({
      data: {
        projectId: finalProjectId,
        messages: JSON.stringify([
          ...conversationHistory,
          { role: 'user', content: message, timestamp: new Date() },
          { role: 'assistant', content: finalResponse, timestamp: new Date() },
        ]),
        contextFiles: JSON.stringify(contextFiles),
      },
    });

    await db.project.update({
      where: { id: finalProjectId },
      data: { lastAccessed: new Date() },
    });

    return NextResponse.json({
      message: finalResponse,
      sources: contextFiles.map(file => ({ path: file })),
      contextUsage: builtPrompt.tokenUsage,
      validation,
      conversationId: newConversation.id,
      projectId: finalProjectId,
    });
  } catch (error) {
    console.error('[API /chat2] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
