# AI Code Chat Assistant: System Reference (v1.0)

> [!IMPORTANT]
> This document is the **Canonical Source of Truth** for the AI Code Chat Assistant. It consolidates all technical and architectural decisions into a unified, machine-enforceable reference. It overrules all previous documentation.

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

1. **Detection**: AI output is scanned for contradictions with HARD rules.
2. **Enforcement**:
   - **BLOCK**: Prohibits the AI from presenting the response.
   - **AUTO-CORRECT**: Prompts the AI to re-evaluate its answer.
3. **Logging**: All violations are recorded in the `ViolationLedger`.

```prisma
model DecisionLock {
  id          String   @id @default(cuid())
  projectId   String
  rule        String
  priority    String   // HARD | SOFT
  scope       String   // global | module:name | file:path
  isActive    Boolean  @default(true)
  violations  Int      @default(0)
  lastViolation DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId, scope])
}

model ViolationLog {
  id          String   @id @default(cuid())
  projectId   String
  decisionLockId String
  rule        String
  scope       String
  violationType String // contradiction | omission | misinterpretation
  aiOutput    String
  corrected   Boolean
  correction  String?
  timestamp   DateTime @default(now())

  @@index([projectId, timestamp])
}
```

By injecting Decision Locks into **every single prompt**, we eliminate the "Context Refresh" problem. Even if the chat history is purged, the core architectural rules remain as the first lines of the System Prompt.

**Conflict Resolution Strategy**:
In the event of metadata contradictions:

- **Index vs. Wiki/Memory**: **Index** (The Ground Truth) always wins.
- **Wiki Rebuild**: If a conflict is detected, the relevant Wiki page is flagged for an immediate automated rebuild.

### 2.3 Decision Lock Extraction Policy

The system autonomously identifies and persists new architectural constraints from User/AI interactions using the **Hard Constraint Heuristic**:

#### 2.3.1 Extraction Heuristics

Rules are calculated using a weighted scoring model. A rule is elevated to a **HARD Lock** if the cumulative score $C \ge 0.9$.

| Criterion                | Weight | Logic                                                                 |
| :----------------------- | :----- | :-------------------------------------------------------------------- |
| **Explicit Imperatives** | 0.6    | Binary: 1.0 if keywords like `must`/`never` are found.                |
| **Repetition Threshold** | 0.3    | Incremental: 0.1 per turn (max 0.3 at 3 turns).                       |
| **User Confirmation**    | 1.0    | **Override**: If the user says "yes" or "save", $C$ is forced to 1.0. |
| **Project Genesis**      | 0.5    | Binary: 1.0 if found in core project files.                           |

> [!NOTE]
> User Confirmation is a hard override. If the user explicitly rejects a proposed rule, the score $C$ is reset to 0.0 regardless of other criteria. This ensures extraction is deterministic and user-governed.

#### 2.3.2 Extraction Authority

- **AI Proposal**: The AI may only _propose_ HARD locks.
- **Heuristic Enforcement**: If $C \ge 0.9$ without confirmation, the lock is staged as **Staged-Hard** (viewable in UI) until the user takes action.
- **SOFT Locks**: AI-autonomously created with a heuristic score $0.4 \le C < 0.9$.
- **Conflict Resolution**: User-created locks always overrule AI-extracted locks. Duplicate locks are merged, prioritizing the most specific scope.

### 2.4 SOFT Rule Enforcement Policy

Unlike HARD rules, SOFT rules guide AI behavior without hard blocking. Their enforcement lifecycle is as follows:

- **AI Suggestion**: AI recommends a SOFT rule during conversation.
- **Verification**: If violated, the system triggers a **Suggestion Alert** in the Chat UI.
- **Action**:
  - **WARN**: The user is notified of the violation.
  - **ALLOW**: The response is delivered, but the violation is logged in the `ViolationLedger`.
  - **LOG**: Every SOFT violation is tracked for future "Low-Noise" proactivity analysis.

#### 2.4.5 Issue-to-Governance Feedback Loop

The system maintains a bi-directional feedback loop between technical debt (`IssueMemory`) and governance (`DecisionLocks`):

1. **Governance from Debt**: If **CRITICAL** or **HIGH** issues are recurrently detected in a module (≥3 instances), the AI automatically proposes a **HARD Decision Lock** to proactively prevent the root-cause anti-pattern.
2. **Confidence-Driven Elevation**: Resolved issues increase the "Heuristic Confidence" of existing related Decision Locks by +0.1 per resolution.
3. **Governance Downgrade**: If a rule has zero violations and zero associated issues for **60 days**, the AI may suggest downgrading a HARD lock to a SOFT lock to reduce developmental friction.

### 2.5 Governance Interfaces

```typescript
interface ConflictDetector {
  /** Returns list of violations found in AI output */
  detectViolations(aiOutput: string, activeLocks: DecisionLock[]): Promise<ViolationLog[]>;

  /** Enforces corrections by generating a "Fixup Instruction" */
  enforce(violations: ViolationLog[]): Promise<string>;
}
```

---

## 3. Intelligence: The Context Orchestrator

The Context Orchestrator is the gateway through which all AI requests must pass. It is responsible for building the prompt, allocating tokens, and validating the response.

### 3.1 The Orchestration Flow

Every request follows a mandatory 6-step lifecycle to ensure governance:

1. Request Capture: User sends a code question or command.
2. Context Assembly: Orchestrator queries the Code Index and Memory System in parallel.
3. Prompt Construction: Orchestrator builds the Markdown prompt using the 5-section protocol.
4. Model Execution: The prompt is sent to the LLM as a stateless request.
5. Output Validation: The response is intercepted by the `ConflictDetector`.
6. Drift Correction: If a violation is found, the response is recycled back to step 3 with an added "Correction Instruction."

### 3.2 The 5-Section Prompt Protocol

To maintain total control over AI behavior, every prompt built by the system **must** follow this strict structural sequence:

| Section                | Content                                     | Purpose                                            |
| :--------------------- | :------------------------------------------ | :------------------------------------------------- |
| **1. SYSTEM RULES**    | Active Decision Locks (HARD/SOFT)           | Sets the mechanical boundaries for the response.   |
| **2. PROJECT SUMMARY** | High-level goal and tech stack              | Provides the "elevator pitch" context.             |
| **3. RELEVANT FACTS**  | Symbol definitions, imports, exported types | Truth from the Code Index (not guessed).           |
| **4. RELEVANT MEMORY** | Past issues, detected patterns, user habits | Learned project history from the Memory System.    |
| **5. USER TASK**       | The current prompt/request                  | The specific action the user wants the AI to take. |

### 3.3 Token Budget Management

Tokens are the system's currency. The `TokenBudgetManager` dynamically allocates tokens based on the model's tier.

| Tier         | Budget      | Context (70%) | Reasoning (30%) |
| :----------- | :---------- | :------------ | :-------------- |
| **Small**    | 4K tokens   | 2,800         | 1,200           |
| **Standard** | 8K tokens   | 5,600         | 2,400           |
| **Large**    | 16K tokens  | 11,200        | 4,800           |
| **Ultra**    | 32K+ tokens | 70%           | 30%             |

### 3.3.1 Ultra Tier Plugin Overrides

For models in the **Ultra Tier** (32K+), third-party or system plugins may overrule the default orchestration logic.

#### Override Scope

Plugins are permitted to modify:

1. **Total Budget**: Extend beyond the 32K baseline based on model capability.
2. **ContextSplits**: Reallocate the % split between Section 3 (INDEX) and Section 4 (MEMORY).
3. **Retrieval Weights**: Adjust Section 4.2.2 weighting based on the model's "Needle-in-a-Haystack" performance.

#### Authority Logic

- **Scope**: Overrides are applied **per-model** across all projects.
- **Persistence**: Overrides are stored in the Global Configuration and are loaded only when the specific Ultra-tier model is active.

**Context Allocation Split**:

```typescript
const ContextSplits = {
  SYSTEM_RULES: 0.15, // 15% (Decision Locks)
  PROJECT_SUMMARY: 0.15, // 15%
  INDEX_FACTS: 0.4, // 40% (Technical Grounding)
  MEMORY: 0.2, // 20% (Learned History)
  USER_TASK: 0.1, // 10% (The Request)
};
```

### 3.4 Conversation Sliding Window & Truncation

To maintain token efficiency and long-term project recall, the Orchestrator enforces a strict conversation lifecycle:

1. **Sliding Window**: Only the **last 25 messages** are kept in active context.
2. **Truncation Point**: Truncation occurs **before** the prompt build. Older messages are purged from the working buffer.
3. **Archival**: Messages older than 25 are moved to **Short-term Memory (SQLite)**.
4. **Structured Summary**:
   - **Format**: All archived conversations are summarized into a structured JSON fragment: `{ "id": string, "summary": string, "decisions": string[], "issues_raised": string[], "files_touched": string[] }`.
   - **Token Limit**: Each summary must not exceed **200 tokens**.
5. **Retrieval**: Archived summaries are indexed for semantic retrieval scoring (Weight: 0.4).

### 3.5 AI Proactivity Suppression & Follow-up Rules

When the AI emits a proactive message (Section 4.2.4), it is bound by the **Silence Guarantee**:

- **Atomic Message**: A proactive event **must** result in exactly one message. The AI is forbidden from sending multiple sequential messages or follow-up questions autonomously.
- **User Gate**: The AI must wait for a direct user response before continuing the conversation.
- **UI Context**: Proactive alerts must clearly state the **Heuristic Source** (e.g., "Critical Issue Detected" vs. "Pattern Optimization").

### 3.5 Conflict Detection Engine

The `ConflictDetector` sits between the AI and the user, performing a real-time audit of the AI's output against active Decision Locks.

```typescript
class ConflictDetector {
  /** Detects violations in AI output against HARD rules */
  async detectViolation(aiOutput: string, locks: DecisionLock[]): Promise<ViolationResult> {
    const hardRules = locks.filter((l) => l.priority === 'HARD' && l.isActive);

    for (const rule of hardRules) {
      if (this.violatesRule(aiOutput, rule)) {
        return {
          violated: true,
          rule: rule.rule,
          action: 'BLOCK',
          correction: `Error: AI violated rule "${rule.rule}". Correction required.`,
        };
      }
    }
    return { violated: false };
  }
}
```

### 3.5 Core Service Interface

```typescript
interface ContextOrchestrator {
  /** Builds the 5-section prompt using dynamic token allocation */
  buildPrompt(request: AIRequest): Promise<string>;

  /** Orchestrates the 6-step flow from retrieval to conflict detection */
  execute(request: AIRequest): Promise<AIResponse>;

  /** Validates AI output against Decision Locks (Conflict Detection) */
  validateResponse(output: string): Promise<ValidationResult>;

  /** Extracts and persists new Decision Locks from conversation history */
  extractLocks(message: Message): Promise<DecisionLock[]>;
}

### 3.6 AI Integration Strategy (LLM Skill)

The system leverages the `z-ai-web-dev-sdk` for model-agnostic reasoning.

- **Initialization**: SDK is initialized in the Next.js backend routes with a project-specific identity.
- **Context Handling**: The Orchestrator pipes the 5-section prompt directly to the SDK’s chat interface.
- **Conversation State**: History is managed locally (Slide Window) and synced periodically to the SDK session.

**Core AI Capabilities**:
- **Code Explanation**: Deep analysis of logic and data flow.
- **Bug Detection**: Identification of logic flaws and security vulnerabilities.
- **Pattern Recognition**: Discovery of architectural and coding patterns.
- **Auto-Documentation**: Context-grounded generation of technical references.
```

---

## 4. Cognitive Infrastructure (The Body)

The "Body" of the system consists of three interconnected layers that provide the "truth" and "history" for the Context Orchestrator.

### 4.1 Code Indexing System: The Ground Truth

The Code Indexing System provides automatic, scalable indexing of all project files (100K+ files) using a multi-stage pipeline and high-performance search engine.

#### The Indexing Pipeline

1. **File Scanner**: Identifies files, filters ignored directories (`.git`, `node_modules`), and detects changes via Chokidar/Polling.
2. **Content Extractor**: Reads content and extracts technical metadata (symbols, imports, exports).
3. **Dependency Analyzer**: Builds a directed import/export graph and maps function call relationships.
4. **Index Builder**: Commits extracted data to the SQLite FTS5 index and Prisma relational tables.
5. **Storage Layer**: Persistent storage in `project_index.db`.

#### Code Index Schema (Prisma)

```prisma
model CodeIndex {
  id          String   @id @default(cuid())
  filePath    String   @unique
  fileType    String   // .ts, .py, etc.
  lineCount   Int
  size        Int
  checksum    String   // MD5/SHA for change detection
  indexedAt   DateTime @default(now())
  symbols     SymbolIndex[]
  dependencies DependencyIndex[]
}

model SymbolIndex {
  id          String   @id @default(cuid())
  name        String   // function_name, class_name
  type        String   // 'function' | 'class' | 'interface'
  filePath    String
  codeIndex   CodeIndex @relation(fields: [filePath], references: [filePath])
  line        Int
  signature   String?
  docComment  String?

  @@index([name])
  @@index([filePath])
}

model DependencyIndex {
  id          String   @id @default(cuid())
  filePath    String
  codeIndex   CodeIndex @relation(fields: [filePath], references: [filePath])
  importName  String
  resolvedPath String?
  isExternal  Boolean  @default(false)

  @@index([filePath])
  @@index([importName])
}

model FileRelationship {
  id          String   @id @default(cuid())
  sourcePath  String
  targetPath  String
  type        String   // 'import' | 'require' | 'calls'
  strength    Float    @default(1.0)

  @@unique([sourcePath, targetPath, type])
}
```

#### Incremental Reindexing Logic

The system avoids expensive full re-scans by performing incremental updates based on file hash comparisons:

```typescript
async function incrementalReindex(projectPath: string) {
  const currentFiles = await scanDirectory(projectPath);
  const indexedFiles = await getIndexedFiles();

  // Change Detection
  const newFiles = currentFiles.filter((f) => !indexedFiles.includes(f));
  const deletedFiles = indexedFiles.filter((f) => !currentFiles.includes(f));
  const changedFiles = await detectChangedFiles(indexedFiles); // via checksum

  // Atomic Updates
  await removeIndexEntries(deletedFiles);
  await updateIndexEntries(changedFiles);
  await addIndexEntries(newFiles);
}
```

#### 4.1.5 Search Relevance & Scoring Formula

The system employs a multi-signal scoring model to rank retrieval results. The final score $S$ for a candidate fact is calculated as:

$$S = (W_{type} \times S_{semantic}) + (W_{recency} \times f(age)) + S_{bonus}$$

- **Weight Values ($W_{type}$)**:
  - **Index Fact**: 1.0 (Canonical)
  - **Issue Memory**: 0.8 (Contextual Debt)
  - **Wiki Page**: 0.6 (Narrative)
  - **Archived Chat**: 0.4 (Historical)
- **Recency Decay ($f(age)$)**: Linear decay over 30 days. Facts older than 30 days are capped at a $0.2$ multiplier.
- **Bonus Signals ($S_{bonus}$)**:
  - +0.2 if the fact belongs to the currently active file.
  - +0.1 for every 5 occurrences of the fact in codebase patterns.
  - -0.3 if the fact is associated with a resolved `IssueMemory`.
- **Normalization**: All partial scores are normalized to a $[0, 1]$ range before fusion.

#### 4.1.6 Deterministic Tie-Break Rules

In cases where two or more facts share the exact same final score $S$, the system applies a deterministic tie-break sequence:

1. **Source Fidelity**: **Index Fact** (Canonical) > **Issue Memory** > **Wiki** > **Archive**.
2. **Lexical Order**: Source **File Path** (A-Z).
3. **Symbol Position**: Lower **Line Number** in the file.
4. **Data Integrity**: **Content Hash** (MD5/SHA) as the final fallback.

This sequence ensures that for any given state, retrieval results are 100% deterministic.

#### 4.1.6 File Handling Fallback Rules

Differentiated processing for edge-case files:

- **Unknown Extensions**: AI performs a "Peek Scan" (first 100 lines). If text-like, treated as **Text** category; otherwise, **Binary** (Metadata Only).
- **Large Artifacts (>5MB Source, >10MB Doc)**: AI excludes the full content from semantic indexing. Only **Symbols** and **Structural Metadata** are extracted.
- **Mixed Formats (`.pdf`, `.docx`)**: Excluded from direct parsing. The system relies on external conversion (if available) or processes as **Binary**.
- **Generated Files (`node_modules`, `dist`, `.next`)**: Automatically excluded from all indexing and search operations via the global `.ai-ignore` policy.

### 4.2 Deep Memory System: The Learned History

The system builds a persistent knowledge base of project interactions and file relationships using a multi-layered local SQLite database.

#### The 4-Layer Architecture

- **Layer 1: Working Memory (Session)**: React state + Zustand store. Tracks the current conversation (sliding window), recently selected files, and active AI context.
- **Layer 2: Short-term Memory (Histories)**: SQLite. Stores all conversations in a project session, file analyses performed, and detected code changes.
- **Layer 3: Long-term Memory (Knowledge Base)**: SQLite + Prisma. Consolidates architectural patterns, recurring issues, project-wide summaries, and user technical habits.
- **Layer 4: AI Context Builder**: The algorithmic layer that prioritizes relevant memories from layers 1–3 and injects them into Section 4 of the 5-Section Prompt Protocol.

#### Memory System Schema (Prisma)

```prisma
model FileAnalysis {
  id              String   @id @default(cuid())
  projectId       String
  filePath        String
  analyzedAt      DateTime @default(now())
  summary         String   // AI-generated file summary
  purpose         String?  // The "Why" of the file
  keyFunctions    String?  // JSON array
  dependencies    String?  // JSON array of file paths
  patterns        String?  // JSON anti-patterns detected
  complexity      Int      @default(5) // 1-10 scale
  analysisCount   Int      @default(1)

  @@unique([projectId, filePath])
}

model CodePattern {
  id          String   @id @default(cuid())
  projectId   String
  pattern     String   // Description of the pattern
  frequency   Int      @default(1)
  type        String   // 'architecture' | 'coding' | 'anti-pattern'
  lastSeen    DateTime @updatedAt

  @@unique([projectId, pattern, type])
}

model IssueMemory {
  id              String   @id @default(cuid())
  projectId       String
  title           String
  description     String
  severity        String   // CRITICAL | HIGH | MEDIUM | LOW
  status          String   // OPEN | RESOLVED | ARCHIVED
  source          String   // conversation_id | ai_scan
  relatedFiles    String   // JSON array of file paths
  detectedAt      DateTime @default(now())
  resolvedAt      DateTime?
  reopenedCount   Int      @default(0)

  @@index([projectId, status, severity])
}

#### 4.2.2 Issue Lifecycle & Severity Scale

The system tracks technical debt and bugs through a structured **Issue Lifecycle**:

- **CRITICAL**: Security vulnerabilities or kernel-mode failures (WFP). Requires immediate proactive alert.
- **HIGH**: Logic flaws or architectural violations. surfaced in Section 4 of every prompt.
- **MEDIUM**: Code smells or inconsistent patterns. Surfaced if relevant to the current file.
- **LOW**: Minor stylistic deviations. Logged for background proactivity scanning.

**Lifecycle Transitions**:
1. **OPEN**: Issue detected and confirmed by AI or user.
2. **RESOLVED**: AI detects the fix and verifies it against the original failure context.
3. **ARCHIVED**: Resolved issues are moved to the archive after 30 days but remain searchable for pattern detection.
```

#### Memory Retention Policies

The system implements a tiered retention strategy to balance context depth with storage efficiency:

| Memory Type         | Policy    | Pruning Trigger                 |
| :------------------ | :-------- | :------------------------------ |
| **Project Summary** | Permanent | Never (Manual update only)      |
| **Decision Locks**  | Permanent | Deleted only by user            |
| **File Analysis**   | Volatile  | File checksum change            |
| **Code Patterns**   | Long-term | 60 days of non-usage            |
| **Active Chat**     | Rolling   | >25 messages (Slide to archive) |
| **Archived Chat**   | Periodic  | >30 days (Summarize & Delete)   |

**Weighted Priority Scoring**:
The orchestrator prioritizes context retrieval using the following relevance weights (1.0 = Max):

- **Project Summary & Vision**: 1.0 (The "Why")
- **Selected File Context**: 0.9 (Current Focus)
- **Detected Issues & Conflict Logs**: 0.8 (Technical Debt)
- **Verified Architectural Patterns**: 0.6 (Style Alignment)
- **Historical Decisions**: 0.4 (Context Flow)
- **User Coding Habits**: 0.2 (Personalization)

#### 4.2.3 Auto-Analysis Trigger Matrix

The system monitors user activity and system state to trigger automated analysis actions:

| Trigger          | Action                    | Target Memory Layer        |
| :--------------- | :------------------------ | :------------------------- |
| **File Select**  | Quick Summary             | Short-term (File Analysis) |
| **Idle 30s**     | Deep Symbol Analysis      | Long-term (Knowledge Base) |
| **Manual Scan**  | Full Index & Pattern Scan | Global (Project Summary)   |
| **Index Finish** | Wiki Generation           | Narrative (Wiki)           |

#### 4.2.4 AI Proactivity Guardrails (HARD)

To prevent "AI Noise" and maintain a focused development environment, the AI is suppressed from speaking proactively unless specific technical thresholds are met.

**Enforcement Layer**: The **Context Orchestrator** acts as the single gatekeeper for proactivity. Before any proactive message is generated, the Orchestrator evaluates the current state against the suppression rules. This occurs **server-side** (before the UI layer) to ensure a silence guarantee.

1. **High-Severity Discovery**: Proactive alert if a security vulnerability or critical logic failure is detected.
2. **Structural Pattern Detection**: AI speaks if a recurring pattern/anti-pattern is found in **≥3 separate files**.
3. **Behavioral Optimization**: AI suggests a workflow improvement if a repeated manual task is detected across sessions.
4. **Otherwise**: The AI must remain silent and only respond to direct user queries in the Chat panel.

### 4.3 Post-Response Memory Mutation Contract

The system treats every AI response as a learning event. After a response is delivered to the user, the Context Orchestrator executes a mandatory **6-step mutation pipeline** to update the system body:

1. **Insight Extraction**: Identify new symbols, patterns, or decisions in the session.
2. **Project Memory Update**: Update the project-wide architectural summary.
3. **File Analysis Refresh**: Update the analysis records for all files mentioned in the response.
4. **Violation Log Sync**: Persist any hard/soft rule violations to the `ViolationLedger`.
5. **Issue Creation/Closure**: Detect if the response creates a new "Issue Memory" or closes an existing one.
6. **Conversation Archival**: Summarize the exchange and store it in the sliding window / archive.

### 4.4 Wiki System: The Narrative Knowledge

The Wiki is an auto-generated documentation layer that bridges the gap between raw code and human intent.

#### 4.4.1 Wiki Mutation Rules (HARD)

To protect user-authored content, the Wiki system adheres to the following mutation rules:

1. **Section-Scoped Updates**: AI updates must only target **AI-generated sections**. User-authored sections are treated as immutable by the AI.
2. **Annotation Preservation**: AI suggestions must be presented in separate `> [!NOTE]` or `## AI Insights` blocks and never overwrite user text.
3. **Draft Mode**: All AI-proposed Wiki changes must be staged in a "Draft" or "Review" state before merging into the canonical Wiki page.

#### 4.4.2 Wiki Draft Lifecycle & Approval

To prevent Wiki divergence, drafts follow a managed lifecycle:

- **Approval Authority**:
  - **User-Authored Pages**: AI drafts **must** be manually approved by the user.
  - **AI-Generated Overviews**: AI drafts can be "Auto-Merged" if the change is a pure technical update (e.g., new file added) with no conflict.
- **Expiration**: Drafts expire and are deleted after **7 days** of inactivity if not merged.
- **Search Participation**: Drafts are **excluded** from Section 3 (INDEX_FACTS) of the prompt protocol but are searchable in the UI as "Pending Insights" (Score Multiplier: 0.2).

#### 4.4.3 File Type Processing Matrix

The system applies differentiated processing strategies based on file type to maximize context quality:

| File Type                         | Category            | Strategy                                    |
| :-------------------------------- | :------------------ | :------------------------------------------ |
| `.ts`, `.js`, `.py`, `.go`, `.rs` | **Source Code**     | Full parsing + Symbol extraction + Chunking |
| `.md`, `.txt`, `.rst`             | **Documentation**   | Semantic chunking + Deep summarization      |
| `.json`, `.yaml`, `.toml`, `.csv` | **Structured Data** | Schema/Key extraction + Selective indexing  |
| `.png`, `.exe`, `.dll`, `.zip`    | **Binary**          | Metadata only (Size, Type, Hash, CreatedAt) |

### 4.5 Data Portability: The Bundle Manifest

The `.ai-project-bundle` is a signed, versioned export of the project's cumulative intelligence.

#### 4.5.1 Bundle Manifest Scope

A valid bundle must contain the following manifest components:

- **Index Metadata**: Full symbol database and dependency graph.
- **Deep Memory**: All patterns, issues, and summarized conversation histories.
- **Wiki Repository**: All Markdown pages (including user annotations).
- **Governance**: Active and historical Decision Locks and Violation Logs.
- **Config**: Project-specific AI settings and token budget preferences.

#### 4.5.3 Bundle Import Conflict Resolution

Importing a bundle is a non-destructive mutation. Conflicts are resolved according to the following hierarchy:

1. **Decision Locks**:
   - **Local > Import**: If a Decision Lock at the same scope exists locally, the local rule is preserved.
   - **System Alert**: The user is notified of any Divergent Hard Locks during the import preview.
2. **Wiki Pages**:
   - **User Annotation Wins**: If both local and import documents contain user annotations, the **Local** version is preserved, and the imported content is staged as a **Draft**.
   - **Auto-Merge**: Purely AI-generated modules are auto-merged if the import version is newer (based on hash).
3. **Deep Memory**:
   - **Deduplication**: Identical Issue Memories or patterns are merged; frequency counts are combined.
   - **Priority**: On import, the **Index > Memory > Wiki** ranking still applies to resolve any logic contradictions.

---

The interface is designed as an **AI Control Room**, prioritizing visual clarity, system state communication, and motion over decoration.

### 5.1 Visual Language (Hard Constraints)

All UI components **must** conform to a unified visual language to preserve trust and cognitive clarity. Ad-hoc colors or timings are strictly prohibited.

#### Color System (CSS Tokens)

```css
:root {
  /* Core Palette */
  --color-bg-primary: #0b0e14; /* Deep Slate background */
  --color-bg-surface: #121826; /* Midnight Blue surface */
  --color-bg-panel: #1a1f2b; /* Elevated panel */

  /* Text Stack */
  --color-text-primary: #ffffff; /* High contrast */
  --color-text-secondary: #94a3b8; /* Muted Slate */
  --color-text-muted: #64748b; /* Dimmed */

  /* Accents */
  --color-accent-ai: #00f2ff; /* Electric Cyan (AI Pulse) */
  --color-accent-success: #10b981; /* Emerald */
  --color-accent-warning: #ffb800; /* Soft Amber (Decision Locks) */
  --color-accent-error: #ef4444; /* Crimson */

  /* Borders & Focus */
  --color-border-subtle: rgba(255, 255, 255, 0.05);
  --color-border-focus: rgba(0, 242, 255, 0.3);
}
```

#### Typography Scale

- **Headings**: `Space Grotesk` (Tech-forward look).
- **Body**: `Inter` (Readability optimized).
- **Code**: `JetBrains Mono` (High-definition coding font).
- **Size Scale**: `12px (XS) / 14px (SM) / 16px (Base) / 20px (LG) / 24px (XL)`.

### 5.2 Motion & Interaction Standards

The interface must feel like a responsive control room. Framer Motion is the required engine.

| Tier       | Duration | Easing      | Usage                               |
| :--------- | :------- | :---------- | :---------------------------------- |
| **Micro**  | 150ms    | `circOut`   | Hover states, toggle flips.         |
| **Fast**   | 250ms    | `easeOut`   | Sidebar collapse, tab switching.    |
| **Normal** | 400ms    | `easeInOut` | Modal entry, view transitions.      |
| **System** | 800ms    | `linear`    | Background indexing progress pulse. |

### 5.3 Glassmorphism Policy (Guardrails)

Glass effects are allowed ONLY on secondary surfaces (overlays, tooltips, panels).

- **Prohibited**: Primary reading surfaces (Chat, Wiki, Code Viewer).
- **Standards**: Minimum blur `12px`, background opacity `0.6`, border opacity `0.1`.

### 5.4 Iconography & Symbols

Powered by **Lucide React**. Icons must convey system meaning, not decoration. All icons must inherit text color from theme tokens.

| Category          | Symbols                                      | Purpose                                   |
| :---------------- | :------------------------------------------- | :---------------------------------------- |
| **System Status** | `Nodes`, `Layers`, `BookOpen`, `ShieldCheck` | Indexing, Memory, Wiki, Decision Locks.   |
| **AI Status**     | `Circle`, `Loader2`, `Cpu`, `Bot`            | Idle, Thinking, Processing, Ready.        |
| **File Types**    | `FileCode`, `FileJson`, `FileText`, `Folder` | Source, Config, Documentation, Directory. |

### 5.5 Layout & Status UI

The system uses a persistent 3-panel layout and a mandatory status bar to ensure the user never loses context.

1. **Left Panel (Explorer)**: File tree and project structure.
2. **Center Panel (Chat)**: primary interaction zone.
3. **Right Panel (Context/Wiki)**: Dynamic display of Code Viewer, Wiki pages, or Memory stats.
4. **System Status Bar**: Visible at all times in the header.

**Mandatory Status Indicators**:

- **Indexing Status**: Real-time progress and item count.
- **Memory Health**: Visual indicator (Active/Idle/Pruning).
- **Decision Lock Count**: Number of active HARD rules.
- **AI Pulse**: Micro-animation (Electric Cyan) during processing.

### 5.6 Keyboard Shortcuts (Interaction Registry)

The system prioritizes keyboard-driven navigation for power users. All shortcuts **must** be implemented with global listener guards to prevent conflicts with native OS commands.

| Category         | Shortcut       | Action                                    |
| :--------------- | :------------- | :---------------------------------------- |
| **View Control** | `Ctrl + K`     | Toggle 3-Panel ↔ 4-Panel (Wiki) layout    |
|                  | `Ctrl + L`     | Toggle Left Sidebar (File Explorer)       |
|                  | `Ctrl + + / -` | Dynamically adjust application font size  |
| **Search**       | `Ctrl + F`     | Open Advanced Search Overlay              |
|                  | `Escape`       | Close Search, Modal, or File Viewer       |
| **Operation**    | `Ctrl + S`     | Save current application/project settings |
|                  | `Ctrl + R`     | Force refresh of the File Tree & Index    |
|                  | `Ctrl + N`     | Initialize a new Chat Conversation        |
|                  | `Ctrl + Enter` | Send message in Chat Interface            |

### 5.7 Visual Drift Prevention Checklist

Before any UI component or view is committed to the codebase, it must pass this **8-point audit** to prevent visual erosion:

1. **Token Compliance**: Verify all colors use `--color-` variables (no hardcoded styles).
2. **Typography Guard**: Ensure headings use `Space Grotesk` and body uses `Inter`.
3. **Motion Hygiene**: Check `framer-motion` timings against Section 5.2.
4. **Glassmorphism Constraint**: Confirm glass effects only on surfaces with >12px blur.
5. **Icon Symmetry**: Verify all icons are from `lucide-react` and use theme tokens.
6. **Status Visibility**: Ensure the System Status Bar is persistent and responsive.
7. **Contrast Audit**: Check all foreground/background pairs against WCAG AA standards.
8. **Responsive Integrity**: Validate 3-panel ↔ Focus Mode transition at all break points.

---

## 6. Technical Foundations (Infrastructure)

The system is built for local-first performance and enterprise-grade code intelligence.

### 6.1 Core Technology Stack

- **Frontend**: Next.js 14.2+ (Stable Target).
- **Styling**: Tailwind CSS v3.4+, shadcn/ui.
- **Backend**: Next.js API Routes (Node.js 20+).
- **ORM/DB**: Prisma w/ SQLite (Local-first).
- **AI SDK**: `z-ai-web-dev-sdk` (v1.2+).
- **Desktop (Phase 2)**: Electron v30+ wrapper.

### 6.2 Technical Registry: API & State

The system maintains a rigid technical surface between the frontend and the local-first backend services.

#### REST API Registry

| Category    | Endpoint                           | Method | Purpose                                            |
| :---------- | :--------------------------------- | :----- | :------------------------------------------------- |
| **Context** | `/api/context/build-prompt`        | POST   | Constructs 5-section prompt using token budget.    |
|             | `/api/context/validate-response`   | POST   | Intercepts and validates AI output vs Locks.       |
|             | `/api/context/decision-locks`      | POST   | Create or update persistent Decision Locks.        |
|             | `/api/context/decision-locks/:id`  | PUT    | Activate/deactivate specific governance rules.     |
|             | `/api/context/violations/:project` | GET    | Retrieve history of AI governance violations.      |
| **Memory**  | `/api/memory/project/:id`          | GET    | Retrieve all project-level patterns and issues.    |
|             | `/api/memory/file/:path`           | GET    | Get deep analysis and context for a specific file. |
|             | `/api/memory/search`               | POST   | Search across conversations, patterns, and issues. |
|             | `/api/memory/ai-context`           | GET    | Optimized context fragments for current task.      |
| **Index**   | `/api/index/status`                | GET    | Current progress/health of the SQLite FTS5 index.  |
|             | `/api/index/search`                | POST   | High-performance full-text and symbol search.      |
|             | `/api/index/dependencies`          | GET    | Returns import/export graph for selected files.    |
| **Wiki**    | `/api/wiki/generate`               | POST   | Triggers the auto-documentation pipeline.          |
|             | `/api/wiki/:project/pages`         | GET    | Returns all generated and user-annotated pages.    |

#### 6.3 Functional State Store (Zustand)

The frontend uses a single-source-of-truth store to manage the complex application lifecycle:

```typescript
interface AppState {
  // File System & Navigation
  fileTree: TreeNode[];
  selectedFiles: string[]; // Set of file paths
  currentPath: string; // Active file being viewed

  // Intelligence & Memory
  messages: Message[]; // Session history
  projectMemory: ProjectMemory | null; // Patterns & Issues
  fileAnalyses: Map<string, FileAnalysis>;
  violations: ViolationLog[]; // Active governance violations

  // Code Indexing & Search
  codeIndex: {
    isIndexing: boolean;
    indexingProgress: number; // 0-100
    totalSymbols: number;
    lastIndexTime: Date;
  };
  searchResults: SearchResult[];

  // Wiki System
  wikiPages: WikiPage[];
  isGeneratingWiki: boolean;

  // Actions
  startIndexing: (mode: 'full' | 'incremental') => Promise<void>;
  searchCode: (query: string, options?: SearchOptions) => Promise<void>;
  validateResponse: (output: string) => Promise<ValidationResult>;
  applyCorrection: (correction: string) => void;
}
```

### 6.4 Security & Privacy Policy

- **Read-Only Access**: The system never modifies source code directly without explicit user approval.
- **Local-First**: All metadata (Index, Memory, Wiki) is stored on the user's machine.
- **Hub Encryption**: Supports **AES-256-GCM** encryption for the entire SQLite database using a passphrase-derived key (Argon2id).

#### 4.5.4 Version Skew & Safety Policies

To ensure project integrity during bundle transport across different system versions:

- **Version Authority**: If `Bundle.Version > System.Version`, the import is **Rejected**. Users are prompted to update the system before proceeding.
- **Unknown Fields**: If a bundle contains unknown schema fields (from a newer version), the system must **Safe-Ignore** those fields while preserving all canonical metadata.
- **Verification Gate**: Every import must pass a **Sanity Check** (schema validation + checksum match) before any database mutation occurs.

---

- **Data Portability**: Users can export their project intelligence as a signed, compressed **`.ai-project-bundle`** (SHA-256 signature).

### 6.5 Network Governance (WFP & OS Scope)

For enterprise security, the system implements a tiered Network Governance policy:

| Platform    | Enforcement Layer                           | Strictness             |
| :---------- | :------------------------------------------ | :--------------------- |
| **Windows** | **WFP Callout Driver** (`z-quarantine.sys`) | **HIGH** (Kernel-mode) |
| **macOS**   | User-mode Proxy / App Firewall              | **MEDIUM** (User-mode) |
| **Linux**   | IPtables / Namespace isolation              | **MEDIUM** (User-mode) |

- **Policy**: All AI-related traffic is routed through a managed socket; non-compliant outbound connections are dropped instantly.
- **Access Control**: Network Governance is an **Opt-in** feature for personal use but **Mandatory** for Enterprise Workspaces (governed by Decision Locks).

### 6.6 Implementation Roadmap (Phased)

The development is divided into four critical phases, prioritizing the "stateless brain" and "cognitive body."

#### Phase 1: Web Application Core (Current)

##### Sprint 0: Context Orchestrator (The Brain)

- [ ] Implement `DecisionLock` & `ViolationLog` models.
- [ ] Build `ConflictDetector` engine & `TokenBudgetManager`.
- [ ] Implement 5-section prompt assembly logic.
- [ ] **Validation**: Successfully block a hard-coded architectural violation.

##### Sprint 1: Cognitive Infrastructure (The Body)

- [ ] Build SQLite FTS5 Indexer & Dependency Graph analyzer.
- [ ] Implement tiered Memory retention system.
- [ ] Build incremental background scanner (Chokidar).
- [ ] **Validation**: Index 10k files in < 5 minutes.

##### Sprint 2: UI/UX & Design System

- [ ] Implement 3-panel layout with Framer Motion.
- [ ] Integrate CSS Tokens and shiki highlighting.
- [ ] Build Keyboard Shortcut registry.
- [ ] **Validation**: Audit pass on Visual Drift Checklist (Section 5.7).

##### Sprint 3: Wiki & Proactive Insights

- [ ] Implement auto-documentation pipeline & bi-directional links.
- [ ] Build low-noise alerting for pattern detection.
- [ ] **Validation**: Wiki auto-generates 5+ module pages correctly.

#### Phase 2: Native Capabilities (Desktop)

##### Sprint 4: Electron Integration

- [ ] Initialize Electron wrapper & native FS bridge.
- [ ] Window management & tray integration.

##### Sprint 5: Network Governance (WFP)

- [ ] Implement `z-quarantine.sys` WFP Driver.
- [ ] User-mode API fallback shell.

#### Phase 3: Enterprise & Security

##### Sprint 6: Advanced Encryption & Export

- [ ] Implement AES-256-GCM database encryption.
- [ ] Build signed `.ai-project-bundle` export utility.

##### Sprint 7: Scale & Multi-Model

- [ ] Multi-worker indexing support (100K+ files).
- [ ] Vector similarity search integration.
