// Prompt Builder
// Builds AI prompts with the mandatory 5-section structure

import { DecisionLock, ProjectMemory, IndexFact, MemoryFragment, BuiltPrompt, ModelTier } from './types';
import { TokenBudgetManager } from './TokenBudgetManager';

export class PromptBuilder {
  private tokenBudgetManager: TokenBudgetManager;

  constructor() {
    this.tokenBudgetManager = new TokenBudgetManager();
  }

  /**
   * Build an AI prompt with the 5-section structure:
   * 1. SYSTEM RULES (Decision Locks)
   * 2. PROJECT SUMMARY
   * 3. RELEVANT INDEX FACTS
   * 4. RELEVANT MEMORY
   * 5. USER TASK
   */
  async buildPrompt(params: {
    decisionLocks: DecisionLock[];
    projectMemory?: ProjectMemory;
    indexFacts: IndexFact[];
    memory: MemoryFragment[];
    userTask: string;
    modelTier: ModelTier;
  }): Promise<BuiltPrompt> {
    const { decisionLocks, projectMemory, indexFacts, memory, userTask, modelTier } = params;

    // Allocate token budget
    const tokenBudget = this.tokenBudgetManager.allocateTokens(modelTier);

    // Build each section
    const sections = {
      systemRules: this.buildSystemRulesSection(decisionLocks, tokenBudget.systemRules),
      projectSummary: this.buildProjectSummarySection(projectMemory, tokenBudget.projectSummary),
      indexFacts: this.buildIndexFactsSection(indexFacts, tokenBudget.indexFacts),
      memory: this.buildMemorySection(memory, tokenBudget.memory),
      userTask: this.buildUserTaskSection(userTask, tokenBudget.userTask),
    };

    // Combine all sections into final prompt
    const prompt = this.assemblePrompt(sections);

    // Calculate actual token usage
    const actualTokenUsage = {
      systemRules: this.tokenBudgetManager.estimateTokens(sections.systemRules),
      projectSummary: this.tokenBudgetManager.estimateTokens(sections.projectSummary),
      indexFacts: this.tokenBudgetManager.estimateTokens(sections.indexFacts),
      memory: this.tokenBudgetManager.estimateTokens(sections.memory),
      userTask: this.tokenBudgetManager.estimateTokens(sections.userTask),
      reasoning: tokenBudget.reasoning,
      total: this.tokenBudgetManager.estimateTokens(prompt),
    };

    return {
      prompt,
      tokenUsage: actualTokenUsage,
      sources: {
        decisionLocks,
        projectMemory,
        indexFacts,
        memory,
      },
    };
  }

  /**
   * Build Section 1: SYSTEM RULES (Decision Locks)
   */
  private buildSystemRulesSection(decisionLocks: DecisionLock[], budget: number): string {
    if (decisionLocks.length === 0) {
      return '[SYSTEM RULES]\nNo decision locks active.\n';
    }

    // Group by scope
    const byScope = decisionLocks.reduce((acc, lock) => {
      if (!lock.active) return acc;
      if (!acc[lock.scope]) {
        acc[lock.scope] = [];
      }
      acc[lock.scope].push(lock);
      return acc;
    }, {} as Record<string, DecisionLock[]>);

    let section = '[SYSTEM RULES - DECISION LOCKS]\n\n';

    // Build each scope
    for (const [scope, locks] of Object.entries(byScope)) {
      const priority = locks[0].priority.toUpperCase();
      section += `Scope: ${scope} (${priority})\n`;
      for (const lock of locks) {
        section += `- ${lock.rule}\n`;
        if (lock.reasoning) {
          section += `  Reason: ${lock.reasoning}\n`;
        }
      }
      section += '\n';
    }

    // Truncate if needed
    return this.tokenBudgetManager.truncateToFit(section, budget);
  }

  /**
   * Build Section 2: PROJECT SUMMARY
   */
  private buildProjectSummarySection(projectMemory: ProjectMemory | undefined, budget: number): string {
    let section = '[PROJECT SUMMARY]\n\n';

    if (!projectMemory) {
      section += 'No project memory available.\n';
      return this.tokenBudgetManager.truncateToFit(section, budget);
    }

    // Add project name
    section += `Project: ${projectMemory.name}\n`;
    section += `Root Path: ${projectMemory.rootPath}\n`;

    // Add summary if available
    if (projectMemory.summary) {
      section += `\n${projectMemory.summary}\n`;
    }

    // Add technologies
    if (projectMemory.technologies && projectMemory.technologies.length > 0) {
      section += `\nTech Stack: ${projectMemory.technologies.join(', ')}\n`;
    }

    // Add architecture
    if (projectMemory.architecture) {
      section += `\nArchitecture: ${projectMemory.architecture}\n`;
    }

    return this.tokenBudgetManager.truncateToFit(section, budget);
  }

  /**
   * Build Section 3: RELEVANT INDEX FACTS
   */
  private buildIndexFactsSection(indexFacts: IndexFact[], budget: number): string {
    let section = '[RELEVANT INDEX FACTS]\n\n';

    if (indexFacts.length === 0) {
      section += 'No relevant index facts available.\n';
      return this.tokenBudgetManager.truncateToFit(section, budget);
    }

    // Sort by relevance
    const sortedFacts = [...indexFacts].sort((a, b) => b.relevance - a.relevance);

    // Add top facts (limit to budget)
    for (const fact of sortedFacts.slice(0, 10)) {
      section += `- File: ${fact.filePath}\n`;
      section += `  ${fact.content.slice(0, 200)}...\n\n`;
    }

    return this.tokenBudgetManager.truncateToFit(section, budget);
  }

  /**
   * Build Section 4: RELEVANT MEMORY
   */
  private buildMemorySection(memory: MemoryFragment[], budget: number): string {
    let section = '[RELEVANT MEMORY]\n\n';

    if (memory.length === 0) {
      section += 'No relevant memory available.\n';
      return this.tokenBudgetManager.truncateToFit(section, budget);
    }

    // Sort by relevance
    const sortedMemory = [...memory].sort((a, b) => b.relevance - a.relevance);

    // Group by type
    const byType = sortedMemory.reduce((acc, mem) => {
      if (!acc[mem.type]) {
        acc[mem.type] = [];
      }
      acc[mem.type].push(mem);
      return acc;
    }, {} as Record<string, MemoryFragment[]>);

    // Add memory by type
    for (const [type, memories] of Object.entries(byType)) {
      section += `${type.toUpperCase()}:\n`;
      for (const mem of memories) {
        section += `- ${mem.content}\n`;
      }
      section += '\n';
    }

    return this.tokenBudgetManager.truncateToFit(section, budget);
  }

  /**
   * Build Section 5: USER TASK
   */
  private buildUserTaskSection(userTask: string, budget: number): string {
    const section = `[USER TASK]\n\n${userTask}\n`;
    return this.tokenBudgetManager.truncateToFit(section, budget);
  }

  /**
   * Assemble all sections into final prompt
   */
  private assemblePrompt(sections: {
    systemRules: string;
    projectSummary: string;
    indexFacts: string;
    memory: string;
    userTask: string;
  }): string {
    return `${sections.systemRules}\n` +
           `${sections.projectSummary}\n` +
           `${sections.indexFacts}\n` +
           `${sections.memory}\n` +
           `${sections.userTask}`;
  }

  /**
   * Get default decision locks for a new project
   */
  getDefaultDecisionLocks(): DecisionLock[] {
    return [
      {
        id: 'default-1',
        projectId: '',
        rule: 'Index EVERYTHING (source, tests, docs, configs, data)',
        scope: 'architecture',
        priority: 'hard',
        source: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        violations: 0,
        active: true,
        reasoning: 'Ensure comprehensive codebase understanding',
      },
      {
        id: 'default-2',
        projectId: '',
        rule: 'Context fusion: Index 40% + Memory 30% + Wiki 20% + User 10%',
        scope: 'ai',
        priority: 'hard',
        source: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        violations: 0,
        active: true,
        reasoning: 'Optimized context distribution',
      },
      {
        id: 'default-3',
        projectId: '',
        rule: 'Dynamic token budget: 4K/8K/16K',
        scope: 'ai',
        priority: 'hard',
        source: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        violations: 0,
        active: true,
        reasoning: 'Adaptive token allocation based on model tier',
      },
      {
        id: 'default-4',
        projectId: '',
        rule: 'Index > Memory > Wiki priority',
        scope: 'ai',
        priority: 'hard',
        source: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        violations: 0,
        active: true,
        reasoning: 'Truth hierarchy for context sources',
      },
      {
        id: 'default-5',
        projectId: '',
        rule: 'Retrieval-based context (not file selection)',
        scope: 'ai',
        priority: 'hard',
        source: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        violations: 0,
        active: true,
        reasoning: 'Ranked retrieval over manual file selection',
      },
    ];
  }
}
