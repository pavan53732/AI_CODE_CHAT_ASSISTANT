// Context Orchestrator Types

export type ModelTier = 'small' | 'standard' | 'large';
export type LockScope = 'architecture' | 'security' | 'ux' | 'performance' | 'ai';
export type LockPriority = 'hard' | 'soft';
export type LockSource = 'user' | 'system';

export type ViolationType = 'contradiction' | 'omission' | 'misinterpretation';

export type AIState = 'idle' | 'thinking' | 'processing' | 'ready' | 'error';

export interface DecisionLock {
  id: string;
  projectId: string;

  // The Lock
  rule: string;
  scope: LockScope;
  priority: LockPriority;
  source: LockSource;

  // Metadata
  context?: string;
  reasoning?: string;
  createdAt: Date;
  updatedAt: Date;

  // Enforcement
  violations: number;
  lastViolation?: Date;

  // Active status
  active: boolean;
}

export interface ViolationLog {
  id: string;
  projectId: string;
  decisionLockId: string;
  rule: string;
  scope: LockScope;
  violationType: ViolationType;
  aiOutput: string;
  corrected: boolean;
  correction?: string;
  timestamp: Date;
}

export interface ViolationResult {
  violated: boolean;
  rule?: string;
  scope?: LockScope;
  severity?: 'HARD' | 'SOFT';
  action?: 'BLOCK' | 'CORRECT';
  correction?: string;
}

export interface TokenBudget {
  systemRules: number;
  projectSummary: number;
  indexFacts: number;
  memory: number;
  userTask: number;
  reasoning: number;
  total: number;
}

export interface BuiltPrompt {
  prompt: string;
  tokenUsage: TokenBudget;
  sources: {
    decisionLocks: DecisionLock[];
    projectMemory?: any;
    indexFacts: any[];
    memory: any[];
  };
}

export interface ValidationResult {
  valid: boolean;
  violations: Array<{
    rule: string;
    scope: LockScope;
    severity: 'HARD' | 'SOFT';
    correction?: string;
  }>;
  correctedResponse?: string;
}

export interface ContextRequest {
  projectId: string;
  userTask: string;
  modelTier: ModelTier;
  contextHints?: {
    relevantFiles?: string[];
    topics?: string[];
  };
}

export interface ProjectMemory {
  id: string;
  name: string;
  rootPath: string;
  summary?: string;
  technologies?: string[];
  architecture?: string;
  userInterests?: string[];
}

export interface IndexFact {
  filePath: string;
  content: string;
  relevance: number;
}

export interface MemoryFragment {
  type: string;
  content: string;
  relevance: number;
}

class AIContextViolationError extends Error {
  constructor(
    message: string,
    public correction?: string,
    public violation?: ViolationResult
  ) {
    super(message);
    this.name = 'AIContextViolationError';
  }
}

export { AIContextViolationError };
