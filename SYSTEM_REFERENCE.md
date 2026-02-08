# AI Code Chat Assistant: System Reference (v1.0)

> [!IMPORTANT]
> This document is the **Canonical Source of Truth** for the AI Code Chat Assistant. It consolidates all previous specifications and architectural decisions into a unified, machine-enforceable reference.

---

## 1. Vision & Core Philosophy

### 1.1 The Problem: The AI Cognitive Gap

Traditional AI code assistants suffer from three critical failures:

1. **Context Loss**: Sending massive files or specs quickly exceeds token limits.
2. **Decision Drift**: The AI ignores established architectural rules.
3. **Project Amnesia**: Every new chat session is a cold start.

### 1.2 The Solution: The Cognitive Core

The AI Code Chat Assistant is not a "file-to-chat" pipeline; it is an **Index-First, Memory-Driven Intelligence Platform**.

- **The Stateless Principle**: The LLM is treated as a stateless "reasoning engine".
- **Orchestrated Context**: Context is never "dumped" into a prompt.
- **Persistent Governance**: Decision Locks ensure architectural rules are immutable.

### 1.3 Success Metrics

The system is validated against the following targets:

- **Consistency**: >95% consistency in reasoning across model tiers and sessions.
- **Governance**: <1% violation rate of "Decision Locks".
- **Performance**: <100ms for indexed searches; <300ms for semantic retrieval.
- **Scalability**: Native support for 100K+ files.

---

## 2. Governance: The Decision Lock System

The **Context Orchestrator Service** acts as the system's brain, enforcing "Decision Locks" to prevent drift.

### 2.1 Decision Locks (The Constitution)

A Decision Lock is a persistent rule that defines an architectural or technical boundary.

- **HARD Rules**: Mandatory constraints (e.g., "Always use Tailwind").
- **SOFT Rules**: Guidelines (e.g., "Prefer functional components").

| Property     | Description                                         |
| :----------- | :-------------------------------------------------- |
| **Rule**     | The core instruction (Markdown string)              |
| **Scope**    | Global, File-level, or Module-level                 |
| **Priority** | HARD (Mandatory) or SOFT (Optional)                 |
| **Source**   | Extracted from User/AI conversation or manual input |
| **Status**   | Active, Inactive, or Violated                       |

### 2.2 The Conflict Detector

The system automatically compares all AI outputs against Active Decision Locks.

1.  Detection: AI output is scanned for contradictions with HARD rules.
2.  Enforcement:

- **Block**: Prohibits the AI from presenting the response.
- **Auto-Correct**: Prompts the AI to re-evaluate its answer.

3.  Logging: All violations are recorded in the `ViolationLedger`.

```prisma
model DecisionLock {
  id          String   @id @default(cuid())
  projectId   String
  rule        String
  priority    String   // HARD | SOFT
  scope       String   // global | module:name | file:path
  isActive    Boolean  @default(true)
  violations  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId, scope])
}
```

### 2.3 Success Strategy: Consistency First

By injecting Decision Locks into **every single prompt**, we eliminate the "Context Refresh" problem. Even if the chat history is purged, the core architectural rules remain as the first lines of the System Prompt.

### 2.4 Governance Interfaces

```typescript
interface ViolationLog {
  ruleId: string;
  scope: string; // global | file | module
  type: 'hard' | 'soft';
  violation: string; // The violating snippet
  correction: string; // The suggested fix
  timestamp: Date;
}

interface ConflictDetector {
  /** Returns list of violations found in AI output */
  detectViolations(aiOutput: string, activeLocks: DecisionLock[]): ViolationLog[];

  /** Enforces corrections by generating a "Fixup Instruction" */
  enforce(violations: ViolationLog[]): string;
}
```

---

## 3. Intelligence: The Context Orchestrator

The Context Orchestrator is the gateway through which all AI requests must pass. It is responsible for building the prompt, allocating tokens, and validating the response.

### 3.1 The 5-Section Prompt Protocol

To maintain total control over AI behavior, every prompt built by the system **must** follow this strict structural sequence:

| Section                | Content                                     | Purpose                                            |
| :--------------------- | :------------------------------------------ | :------------------------------------------------- |
| **1. SYSTEM RULES**    | Active Decision Locks (HARD/SOFT)           | Sets the mechanical boundaries for the response.   |
| **2. PROJECT SUMMARY** | High-level goal and tech stack              | Provides the "elevator pitch" context.             |
| **3. RELEVANT FACTS**  | Symbol definitions, imports, exported types | Truth from the Code Index (not guessed).           |
| **4. RELEVANT MEMORY** | Past issues, detected patterns, user habits | Learned project history from the Memory System.    |
| **5. USER TASK**       | The current prompt/request                  | The specific action the user wants the AI to take. |

### 3.2 Token Budget Management

Tokens are the system's currency. The `TokenBudgetManager` dynamically allocates tokens based on the model's tier (Small: 4K, Standard: 8K, Large: 16K).

**The 70/30 Rule**:

- **70% (Context)**: Reserved for Sections 1–4 of the prompt.
- **30% (Reasoning)**: Reserved for the AI's response buffer.

**Context Allocation Split**:

- **Decision Locks**: 15% (Primary Priority)
- **Project Summary**: 5%
- **Index Facts**: 35% (Deep technical grounding)
- **Memory Archive**: 25% (Learned context)
- **User Task**: 20% (The request itself)

### 3.3 Core Service Interface

```typescript
interface ContextOrchestrator {
  /** Builds the 5-section prompt using dynamic token allocation */
  buildPrompt(request: AIRequest): Promise<string>;

  /** Validates AI output against Decision Locks */
  validateResponse(output: string): Promise<ValidationResult>;

  /** Extracts new Decision Locks from a confirmed conversation */
  extractLocks(message: Message): Promise<DecisionLock[]>;
}
```

### 3.4 Orchestration Flow

1. **Request Capture**: User sends a code question.
2. **Context Assembly**: Orchestrator queries the _Code Index_ and _Memory System_.
3. **Prompt Construction**: Orchestrator builds the Markdown prompt using the 5-section protocol.
4. **Model Execution**: The prompt is sent to the LLM.
5. **Output Validation**: The response is intercepted by the `ConflictDetector`.
6. **Drift Correction**: If a violation is found, the response is recycled back to step 3 with a "Correction Instruction."

---

## 4. Cognitive Infrastructure (The Body)

The "Body" of the system consists of three interconnected layers that provide the "truth" and "history" for the Context Orchestrator.

### 4.1 Code Indexing System: The Ground Truth

The system automatically indexes all project files to provide precise technical facts.

- **Scope**: All source code, tests, docs, configs, and data files (100K+ files).
- **Technology**: SQLite FTS5 for full-text search + Metadata indexing.
- **Performance**: Hybrid approach—Indexed queries (<100ms) and Semantic vector search (<300ms).
- **Incremental Updates**: Uses a hybrid watcher (Chokidar for Electron, 10s polling for Web) to re-index only changed files.

### 4.2 Deep Memory System: The Learned History

The system learns from every interaction and stores it in a multi-layered local SQLite database.

| Layer          | Content                                  | Retention Policy       |
| :------------- | :--------------------------------------- | :--------------------- |
| **Session**    | Current active conversation (25 msgs)    | Sliding window         |
| **Short-term** | Recent file analyses and code changes    | Clear on project close |
| **Long-term**  | Architectural patterns, recurring issues | Permanent (indexed)    |

**Weighted Priority Scoring**:
The orchestrator prioritizes memory based on relevance scores:

- **Project Summary**: 1.0 (Highest)
- **Open Issues**: 0.8
- **Patterns**: 0.6
- **History**: 0.4

### 4.3 Wiki System: The Narrative Knowledge

The Wiki is an auto-generated documentation layer that bridges the gap between raw code and human intent.

- **Auto-Generation**: Triggered automatically after a full project index completes.
- **Narrative Flow**: Generates Project Overviews, Module Docs, and Dependency Maps.
- **Context Grounding**: Every wiki page is bi-directionally linked to the source code.
- **User Annotations**: AI suggestions are stored in separate blocks; user edits are **never** overwritten.

---

## 5. Interaction: The Design System (The Skin)

The interface is designed as an **AI Control Room**, prioritizing visual clarity, system state communication, and motion over decoration.

### 5.1 Visual Language (Hard Constraints)

All UI components **must** conform to the following theme tokens. Ad-hoc colors are strictly prohibited.

- **Theme**: Dark-first (Dark mode is the primary experience).
- **Core Palette**:
  - **Background**: Deep Slate (`#0B0E14`)
  - **Surface**: Midnight Blue (`#121826`)
  - **Primary Accent**: Electric Cyan (`#00F2FF`) - Used for AI state and active highlights.
  - **Secondary Accent**: Soft Amber (`#FFB800`) - Used for warnings and Decision Locks.
- **Typography**:
  - **Headings**: Space Grotesk (Tech-forward feel).
  - **Body**: Inter (Readability).
  - **Code**: JetBrains Mono.

### 5.2 Layout: The 3-Panel Strategy

The system uses a persistent 3-panel layout to ensure the user never loses context.

1. Left Panel (Explorer): File tree and project structure.
2. Center Panel (Chat): The primary interaction zone for the AI.
3. Right Panel (Context/Wiki): Dynamic display of Code Viewer, Wiki pages, or Memory stats.

**Focus Mode**: A toggle that collapses the Left and Right panels into a minimal 2-panel view for focused chatting.

### 5.3 System Status UI

A mandatory **System Status Bar** must be visible at all times, communicating the "Health" of the AI context:

- **Indexing Status**: Real-time progress of the Code Indexer.
- **Memory Health**: Visual indicator of how much long-term memory is active.
- **Decision Lock Count**: Number of HARD rules currently being enforced.
- **AI Pulse**: A micro-animation (Electric Cyan) indicating the AI is "thinking" or "observing."

### 5.4 Motion & Glassmorphism

- **Motion**: All transitions must use Framer Motion with `duration: 0.2` and `ease: "circOut"`.
- **Glassmorphism**: Restricted to secondary surfaces (hover cards, status tooltips).
- **Syntax Highlighting**: Powered by **Shiki** (server-side) with caching based on file hash.

---

## 6. Technical Foundations (Infrastructure)

The system is built for local-first performance and enterprise-grade code intelligence.

### 6.1 Core Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Backend**: Next.js API Routes, Node.js FS, Prisma (ORM).
- **Storage**: SQLite (Local-first) for Index, Memory, and Wiki metadata.
- **AI SDK**: `z-ai-web-dev-sdk` for model interaction and streaming.
- **Desktop (Phase 2)**: Electron wrapper for native file system access.

### 6.2 API Registry (Mandatory Endpoints)

| Endpoint                         | Method | Purpose                                                   |
| :------------------------------- | :----- | :-------------------------------------------------------- |
| `/api/context/build-prompt`      | POST   | Constructs 5-section prompt with token budgeting.         |
| `/api/context/validate-response` | POST   | Intercepts and validates AI output vs Locks.              |
| `/api/files/tree`                | GET    | Returns the recursive project file structure.             |
| `/api/files/content`             | GET    | Retrieves (read-only) file content with chunking support. |
| `/api/index/status`              | GET    | Returns current indexing progress and stats.              |
| `/api/wiki/generate`             | POST   | Triggers the auto-documentation pipeline.                 |

### 6.3 Security & Privacy Policy

- **Read-Only Access**: The system never modifies source code directly without explicit user approval.
- **Local-First**: All metadata (Index, Memory, Wiki) is stored on the user's machine.
- **Optional Hub Encryption**: Supports AES-256 encryption for the entire SQLite database using a passphrase-derived key.
- **Data Portability**: Users can export their project intelligence as a signed `.ai-project-bundle`.

### 6.4 Implementation Roadmap

- **Sprint 0**: Context Orchestrator Service (Mandatory Brain).
- **Sprint 1**: Code Indexing & Deep Memory Foundation.
- **Sprint 2**: UI Shell & Design System Implementation.
- **Sprint 3**: Wiki System & Proactive Insights.
- **Sprint 4**: Integration, Performance Polish, and Electron Wrapper.
