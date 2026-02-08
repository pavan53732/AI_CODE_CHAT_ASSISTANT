'use server';
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { ContextOrchestrator } from '@/lib/context-orchestrator';
import { MemoryManager } from '@/lib/memory/MemoryManager';
import { db } from '@/lib/db';

const orchestrator = new ContextOrchestrator();
const memoryManager = new MemoryManager();

// Sliding window limit
const MAX_CONVERSATION_MESSAGES = 25;

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

    // Multi-file chat is ALWAYS ON - require at least one context file
    if (!contextFiles || contextFiles.length === 0) {
      return NextResponse.json(
        { 
          error: 'Multi-file chat requires at least one file to be selected',
          code: 'NO_CONTEXT_FILES',
          message: 'Please select one or more files from the file explorer to provide context for the AI.'
        },
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
          ...conversationHistory.slice(-MAX_CONVERSATION_MESSAGES),
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

    // Apply sliding window in background
    memoryManager.applySlidingWindow(finalProjectId).catch(console.error);

    // Get weighted memories for response
    const weightedMemories = await memoryManager.getWeightedMemories(finalProjectId, 5);

    return NextResponse.json({
      message: finalResponse,
      sources: contextFiles.map(file => ({ path: file })),
      contextUsage: builtPrompt.tokenUsage,
      validation,
      conversationId: newConversation.id,
      projectId: finalProjectId,
      weightedMemories: weightedMemories.map(m => ({ type: m.type, weight: m.weight, content: m.content.slice(0, 100) })),
    });
  } catch (error) {
    console.error('[API /chat2] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
