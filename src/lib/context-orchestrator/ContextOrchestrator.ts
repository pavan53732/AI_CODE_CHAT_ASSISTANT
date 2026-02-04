// Context Orchestrator
// The brain of the system - manages all AI prompts and context

import { db } from '@/lib/db';
import {
  DecisionLock,
  ViolationLog,
  ContextRequest,
  BuiltPrompt,
  ValidationResult,
  ProjectMemory,
  IndexFact,
  MemoryFragment,
  ModelTier,
  LockScope,
  LockPriority,
  ViolationType,
} from './types';
import { TokenBudgetManager } from './TokenBudgetManager';
import { ConflictDetector } from './ConflictDetector';
import { PromptBuilder } from './PromptBuilder';

export class ContextOrchestrator {
  private tokenBudgetManager: TokenBudgetManager;
  private conflictDetector: ConflictDetector;
  private promptBuilder: PromptBuilder;

  constructor() {
    this.tokenBudgetManager = new TokenBudgetManager();
    this.conflictDetector = new ConflictDetector();
    this.promptBuilder = new PromptBuilder();
  }

  /**
   * Create or update decision locks for a project
   */
  async createOrUpdateDecisionLocks(params: {
    projectId: string;
    locks: Array<{
      rule: string;
      scope: LockScope;
      priority: LockPriority;
      reasoning?: string;
    }>;
  }): Promise<{ created: number; updated: number; locks: DecisionLock[] }> {
    const { projectId, locks } = params;
    let created = 0;
    let updated = 0;
    const result: DecisionLock[] = [];

    for (const lockData of locks) {
      try {
        // Try to find existing lock
        const existing = await db.decisionLock.findUnique({
          where: {
            projectId_rule_scope: {
              projectId,
              rule: lockData.rule,
              scope: lockData.scope,
            },
          },
        });

        if (existing) {
          // Update existing lock
          const updatedLock = await db.decisionLock.update({
            where: { id: existing.id },
            data: {
              reasoning: lockData.reasoning,
              updatedAt: new Date(),
            },
          });
          result.push(updatedLock);
          updated++;
        } else {
          // Create new lock
          const newLock = await db.decisionLock.create({
            data: {
              projectId,
              rule: lockData.rule,
              scope: lockData.scope,
              priority: lockData.priority,
              source: 'user',
              reasoning: lockData.reasoning,
              active: true,
            },
          });
          result.push(newLock);
          created++;
        }
      } catch (error) {
        console.error('[ContextOrchestrator] Error creating/updating decision lock:', error);
      }
    }

    return { created, updated, locks: result };
  }

  /**
   * Get all decision locks for a project
   */
  async getDecisionLocks(projectId: string): Promise<{
    locks: DecisionLock[];
    summary: {
      total: number;
      hardRules: number;
      softRules: number;
      byScope: Record<string, number>;
    };
  }> {
    const locks = await db.decisionLock.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      total: locks.length,
      hardRules: locks.filter(l => l.priority === 'hard').length,
      softRules: locks.filter(l => l.priority === 'soft').length,
      byScope: locks.reduce((acc, lock) => {
        acc[lock.scope] = (acc[lock.scope] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return { locks, summary };
  }

  /**
   * Activate/deactivate a decision lock
   */
  async toggleDecisionLock(
    id: string,
    active: boolean
  ): Promise<{ success: boolean; lock: DecisionLock | null }> {
    try {
      const lock = await db.decisionLock.update({
        where: { id },
        data: { active },
      });
      return { success: true, lock };
    } catch (error) {
      console.error('[ContextOrchestrator] Error toggling decision lock:', error);
      return { success: false, lock: null };
    }
  }

  /**
   * Build an AI prompt with proper context
   * Implements the 5-section prompt structure
   */
  async buildPrompt(params: ContextRequest): Promise<BuiltPrompt> {
    const { projectId, userTask, modelTier, contextHints } = params;

    // Fetch decision locks
    const decisionLocks = await db.decisionLock.findMany({
      where: {
        projectId,
        active: true,
      },
    });

    // Fetch project memory
    let projectMemory: ProjectMemory | undefined;
    try {
      const project = await db.project.findUnique({
        where: { id: projectId },
      });
      if (project) {
        projectMemory = {
          id: project.id,
          name: project.name,
          rootPath: project.rootPath,
          summary: project.summary || undefined,
          technologies: project.technologies ? JSON.parse(project.technologies) : undefined,
          architecture: project.architecture || undefined,
          userInterests: project.userInterests ? JSON.parse(project.userInterests) : undefined,
        };
      }
    } catch (error) {
      console.error('[ContextOrchestrator] Error fetching project memory:', error);
    }

    // Fetch relevant index facts (would come from code index)
    const indexFacts: IndexFact[] = contextHints?.relevantFiles?.map(file => ({
      filePath: file,
      content: `Content from ${file}`,
      relevance: 1.0,
    })) || [];

    // Fetch relevant memory fragments
    const memory: MemoryFragment[] = [];

    // Build the prompt using PromptBuilder
    return await this.promptBuilder.buildPrompt({
      decisionLocks,
      projectMemory,
      indexFacts,
      memory,
      userTask,
      modelTier,
    });
  }

  /**
   * Validate AI response against decision locks
   */
  async validateResponse(params: {
    projectId: string;
    aiResponse: string;
    promptContext: string;
  }): Promise<ValidationResult> {
    const { projectId, aiResponse } = params;

    // Fetch all decision locks
    const decisionLocks = await db.decisionLock.findMany({
      where: { projectId, active: true },
    });

    // Validate using ConflictDetector
    return await this.conflictDetector.validateResponse(aiResponse, decisionLocks);
  }

  /**
   * Get violation history for a project
   */
  async getViolations(projectId: string, limit: number = 100): Promise<{
    violations: ViolationLog[];
    summary: {
      total: number;
      byRule: Record<string, number>;
      byScope: Record<string, number>;
      recentViolations: number;
    };
  }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const violations = await db.violationLog.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const recentViolations = violations.filter(
      v => v.timestamp >= sevenDaysAgo
    ).length;

    const byRule = violations.reduce((acc, v) => {
      acc[v.rule] = (acc[v.rule] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byScope = violations.reduce((acc, v) => {
      acc[v.scope] = (acc[v.scope] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      violations,
      summary: {
        total: violations.length,
        byRule,
        byScope,
        recentViolations,
      },
    };
  }

  /**
   * Extract decision locks from user messages
   * Analyzes messages for explicit rules or decisions
   */
  extractDecisionLocksFromMessage(message: string, projectId: string): DecisionLock[] {
    const locks: DecisionLock[] = [];
    const lowerMessage = message.toLowerCase();

    // Patterns for decision locks
    const patterns = [
      { pattern: /always\s+(use|implement|follow)\s+(.+)/i, scope: 'architecture' as LockScope },
      { pattern: /never\s+(use|do|allow)\s+(.+)/i, scope: 'architecture' as LockScope },
      { pattern: /must\s+(be|have|include)\s+(.+)/i, scope: 'architecture' as LockScope },
      { pattern: /security\s+(rule|policy|requirement)[:]\s*(.+)/i, scope: 'security' as LockScope },
      { pattern: /performance\s+(target|goal|requirement)[:]\s*(.+)/i, scope: 'performance' as LockScope },
    ];

    for (const { pattern, scope } of patterns) {
      const match = message.match(pattern);
      if (match && match[2]) {
        locks.push({
          id: `extracted-${Date.now()}-${Math.random()}`,
          projectId,
          rule: match[2].trim(),
          scope,
          priority: 'soft' as LockPriority,
          source: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
          violations: 0,
          active: true,
          reasoning: `Extracted from user message: "${message}"`,
        });
      }
    }

    return locks;
  }

  /**
   * Log a violation
   */
  async logViolation(params: {
    projectId: string;
    decisionLockId: string;
    rule: string;
    scope: LockScope;
    violationType: ViolationType;
    aiOutput: string;
    corrected: boolean;
    correction?: string;
  }): Promise<ViolationLog> {
    return await db.violationLog.create({
      data: params,
    });
  }

  /**
   * Get token budget for a model tier
   */
  getTokenBudget(modelTier: ModelTier) {
    return this.tokenBudgetManager.allocateTokens(modelTier);
  }

  /**
   * Estimate token count for text
   */
  estimateTokens(text: string): number {
    return this.tokenBudgetManager.estimateTokens(text);
  }
}
