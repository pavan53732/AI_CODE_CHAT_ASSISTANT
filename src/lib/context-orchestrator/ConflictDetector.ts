// Conflict Detector
// Detects and corrects AI drift by comparing AI output against Decision Locks

import { DecisionLock, ViolationResult, ViolationType, AIContextViolationError } from './types';

export class ConflictDetector {
  /**
   * Detect if AI output violates any decision locks
   */
  async detectViolation(
    aiOutput: string,
    decisionLocks: DecisionLock[]
  ): Promise<ViolationResult> {
    const hardRules = decisionLocks.filter(l => l.priority === 'hard' && l.active);

    for (const rule of hardRules) {
      if (this.violatesRule(aiOutput, rule)) {
        return {
          violated: true,
          rule: rule.rule,
          scope: rule.scope,
          severity: 'HARD',
          action: 'BLOCK',
          correction: this.generateCorrection(rule, aiOutput),
        };
      }
    }

    return { violated: false };
  }

  /**
   * Check if AI output contradicts a rule
   */
  private violatesRule(aiOutput: string, rule: DecisionLock): boolean {
    const outputLower = aiOutput.toLowerCase();
    const ruleLower = rule.rule.toLowerCase();

    // Simple keyword matching (can be enhanced with AI)
    const hasKeywords = outputLower.includes(ruleLower);

    // Check for contradiction patterns
    const hasContradiction = this.hasContradiction(outputLower, ruleLower);

    return hasKeywords && hasContradiction;
  }

  /**
   * Check for contradiction patterns
   */
  private hasContradiction(outputLower: string, ruleLower: string): boolean {
    const contradictionMarkers = [
      'not',
      'never',
      'don\'t',
      'cannot',
      'won\'t',
      'shouldn\'t',
      'avoid',
      'ignore',
      'skip',
    ];

    // Check if output contains contradiction markers near the rule keywords
    for (const marker of contradictionMarkers) {
      const markerIndex = outputLower.indexOf(marker);
      const ruleIndex = outputLower.indexOf(ruleLower);

      if (markerIndex !== -1 && ruleIndex !== -1) {
        // Check if they're within 5 words of each other
        const distance = Math.abs(markerIndex - ruleIndex);
        if (distance < 100) { // Approximate word distance
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate a correction for violated rules
   */
  private generateCorrection(rule: DecisionLock, aiOutput: string): string {
    return `[CORRECTED] The response violated the following locked decision:\n\n` +
           `Rule (${rule.scope} - ${rule.priority}): ${rule.rule}\n` +
           `Reasoning: ${rule.reasoning || 'N/A'}\n\n` +
           `The AI should align with this locked decision and provide a response that respects this constraint.`;
  }

  /**
   * Enforce decision locks by validating and correcting AI output
   */
  async enforce(aiOutput: string, decisionLocks: DecisionLock[]): Promise<string> {
    const violation = await this.detectViolation(aiOutput, decisionLocks);

    if (violation.violated) {
      // Log violation (would be done in production)
      await this.logViolation(violation);

      // Update decision lock violation count
      await this.incrementViolationCount(violation);

      // Block or correct
      if (violation.action === 'BLOCK') {
        throw new AIContextViolationError(
          `AI output violates HARD rule: ${violation.rule}`,
          violation.correction,
          violation
        );
      } else if (violation.action === 'CORRECT') {
        return violation.correction || aiOutput;
      }
    }

    return aiOutput;
  }

  /**
   * Log violation to database
   */
  private async logViolation(violation: ViolationResult): Promise<void> {
    // In production, this would write to the ViolationLog table
    // For now, we'll log to console
    console.warn('[Violation Log]', {
      rule: violation.rule,
      scope: violation.scope,
      severity: violation.severity,
      timestamp: new Date(),
    });
  }

  /**
   * Increment violation count for decision lock
   */
  private async incrementViolationCount(violation: ViolationResult): Promise<void> {
    // In production, this would update the DecisionLock record
    console.warn('[Violation Count Incremented]', {
      rule: violation.rule,
      timestamp: new Date(),
    });
  }

  /**
   * Validate AI response against all decision locks
   */
  async validateResponse(
    aiResponse: string,
    decisionLocks: DecisionLock[]
  ): Promise<{
    valid: boolean;
    violations: Array<{
      rule: string;
      scope: string;
      severity: 'HARD' | 'SOFT';
      correction?: string;
    }>;
    correctedResponse?: string;
  }> {
    const violations: Array<{
      rule: string;
      scope: string;
      severity: 'HARD' | 'SOFT';
      correction?: string;
    }> = [];

    // Check HARD rules
    for (const lock of decisionLocks.filter(l => l.priority === 'hard' && l.active)) {
      if (this.violatesRule(aiResponse, lock)) {
        violations.push({
          rule: lock.rule,
          scope: lock.scope,
          severity: 'HARD',
          correction: this.generateCorrection(lock, aiResponse),
        });
      }
    }

    // Check SOFT rules (just warn, don't block)
    for (const lock of decisionLocks.filter(l => l.priority === 'soft' && l.active)) {
      if (this.violatesRule(aiResponse, lock)) {
        violations.push({
          rule: lock.rule,
          scope: lock.scope,
          severity: 'SOFT',
        });
      }
    }

    return {
      valid: violations.filter(v => v.severity === 'HARD').length === 0,
      violations,
    };
  }
}
