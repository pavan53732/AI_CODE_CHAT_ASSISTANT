// Token Budget Manager
// Manages dynamic token allocation for AI context

import { ModelTier, TokenBudget } from './types';

export class TokenBudgetManager {
  private budgets = {
    small: 4000,   // 4K tokens
    standard: 8000, // 8K tokens
    large: 16000    // 16K tokens
  };

  private splits = {
    SYSTEM_RULES: 0.15,   // 15%
    PROJECT_SUMMARY: 0.15, // 15%
    INDEX_FACTS: 0.40,     // 40%
    MEMORY: 0.20,         // 20%
    USER_TASK: 0.10         // 10%
  };

  /**
   * Allocate tokens based on model tier
   * 70% for context, 30% reserved for reasoning
   */
  allocateTokens(modelTier: ModelTier): TokenBudget {
    const totalBudget = this.budgets[modelTier];

    // 70% for context, 30% reserved for reasoning
    const contextBudget = Math.floor(totalBudget * 0.70);
    const reasoningBudget = totalBudget - contextBudget;

    return {
      systemRules: Math.floor(contextBudget * this.splits.SYSTEM_RULES),
      projectSummary: Math.floor(contextBudget * this.splits.PROJECT_SUMMARY),
      indexFacts: Math.floor(contextBudget * this.splits.INDEX_FACTS),
      memory: Math.floor(contextBudget * this.splits.MEMORY),
      userTask: Math.floor(contextBudget * this.splits.USER_TASK),
      reasoning: reasoningBudget,
      total: totalBudget,
    };
  }

  /**
   * Estimate token count for a string
   * Simple approximation: ~4 characters per token
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if content fits within budget
   */
  fitsInBudget(content: string, budget: number): boolean {
    return this.estimateTokens(content) <= budget;
  }

  /**
   * Truncate content to fit within budget
   */
  truncateToFit(content: string, budget: number): string {
    const estimatedTokens = this.estimateTokens(content);

    if (estimatedTokens <= budget) {
      return content;
    }

    // Truncate to fit
    const targetLength = budget * 4; // ~4 chars per token
    return content.slice(0, Math.floor(targetLength)) + '...';
  }

  /**
   * Get available budget for a specific section
   */
  getAvailableBudget(modelTier: ModelTier, section: keyof TokenBudget): number {
    const budget = this.allocateTokens(modelTier);
    return budget[section];
  }
}
