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

1. Detection: AI output is scanned for contradictions with HARD rules.
2. Enforcement:

- **Block**: Prohibits the AI from presenting the response.
- **Auto-Correct**: Prompts the AI to re-evaluate its answer.

3. Logging: All violations are recorded in the `ViolationLedger`.

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

By injecting Decision Locks into **every single prompt**, we eliminate the "Context Refresh" problem. Even if the chat history is purged, the core architectural rules remain as the first lines of the System Prompt.

**Conflict Resolution Strategy**:
In the event of metadata contradictions:

- **Index vs. Wiki/Memory**: **Index** (The Ground Truth) always wins.
- **Wiki Rebuild**: If a conflict is detected, the relevant Wiki page is flagged for an immediate automated rebuild.

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

Tokens are the system's currency. The `TokenBudgetManager` dynamically allocates tokens based on the model's tier (Small: 4K, Standard: 8K, Large: 16K).

**The 70/30 Rule**:

- **70% (Context)**: Reserved for Sections 1–4 of the prompt.
- **30% (Reasoning)**: Reserved for the AI's response buffer.

**Context Allocation Split**:

```typescript
const ContextSplits = {
  SYSTEM_RULES: 0.15, // 15% (Primary Priority)
  PROJECT_SUMMARY: 0.15, // 15%
  INDEX_FACTS: 0.4, // 40% (Deep technical grounding)
  MEMORY: 0.2, // 20% (Learned context)
  USER_TASK: 0.1, // 10% (The request itself)
};
```

### 3.4 Conflict Detection Engine

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
  checksum    String   // MD5/SHA for change detection
  indexedAt   DateTime @default(now())
}

model SymbolIndex {
  id          String   @id @default(cuid())
  name        String   // function_name, class_name
  type        String   // 'function' | 'class' | 'interface'
  filePath    String
  line        Int
  signature   String?
  docComment  String?

  @@index([name])
  @@index([filePath])
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

#### Performance Standards

- **Indexed Queries**: <100ms for full-text matched lookups.
- **Dependency Traversal**: <50ms for 1st-degree relationship lookup.
- **Index Latency**: Incremental update <500ms for a single file edit.

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
```

**Weighted Priority Scoring**:
The orchestrator prioritizes context retrieval using the following relevance weights:

- **Project Summary**: 1.0 (Critical Truth)
- **Selected File Context**: 0.9 (User Intent)
- **Detected Issues/Bugs**: 0.8 (Problem Awareness)
- **Architectural Patterns**: 0.6 (Style Alignment)
- **Historical Decisions**: 0.4 (Log Continuity)
- **User Habits/Interests**: 0.2 (Personalization)

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

---

## 6. Technical Foundations (Infrastructure)

The system is built for local-first performance and enterprise-grade code intelligence.

### 6.1 Core Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Backend**: Next.js API Routes, Node.js FS, Prisma (ORM).
- **Storage**: SQLite (Local-first) for Index, Memory, and Wiki metadata.
- **AI SDK**: `z-ai-web-dev-sdk` for model interaction and streaming.
- **Desktop (Phase 2)**: Electron wrapper for native file system access.

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
  selectedFiles: string[];
  currentPath: string;

  // Intelligence & Memory
  messages: Message[];
  projectMemory: ProjectMemory | null;
  fileAnalyses: Map<string, FileAnalysis>;
  patterns: CodePattern[];
  issues: IssueMemory[];

  // Code Indexing & Search
  codeIndex: {
    isIndexing: boolean;
    indexingProgress: Progress | null;
    totalSymbols: number;
    totalDependencies: number;
  };
  searchResults: SearchResult[];

  // Wiki System
  wikiPages: WikiPage[];
  currentWikiPage: WikiPage | null;
  isGeneratingWiki: boolean;

  // Actions
  startIndexing: (type: 'full' | 'incremental') => Promise<void>;
  searchCode: (query: string, f?: Filters) => Promise<SearchResult[]>;
  loadWikiPage: (slug: string) => Promise<void>;
  validateResponse: (output: string) => Promise<ValidationResult>;
}
```

### 6.4 Security & Privacy Policy

- **Read-Only Access**: The system never modifies source code directly without explicit user approval.
- **Local-First**: All metadata (Index, Memory, Wiki) is stored on the user's machine.
- **Optional Hub Encryption**: Supports AES-256 encryption for the entire SQLite database using a passphrase-derived key.
- **Data Portability**: Users can export their project intelligence as a signed `.ai-project-bundle`.

### 6.5 Network Governance (WFP)

For enterprise security, the system implements a **Windows Filtering Platform (WFP)** driver for strict network quarantine:

- **Primary**: Bundled WFP Callout Driver for kernel-mode packet inspection.
- **Fallback**: User-mode WFP API for basic port-blocking if the driver is unavailable.
- **Policy**: All AI-related traffic is routed through a managed socket; non-compliant outbound connections are dropped.

### 6.6 Implementation Roadmap (Phased)

The development is divided into four critical phases, prioritizing the "stateless brain" and "cognitive body."

#### Phase 1: Web Application Core (Current)

##### Sprint 0: Context Orchestrator (The Brain)

- [ ] Implement DecisionLock database model & `ViolationLedger`.
- [ ] Build `ConflictDetector` & `TokenBudgetManager` classes.
- [ ] Implement PromptBuilder with 5-section protocol.
- [ ] Add decision lock extraction and injection logic.
- [ ] Create REST endpoints for prompt management and validation.

##### Sprint 1: Cognitive Infrastructure (The Body)

- [ ] Build SQLite FTS5 Indexer with symbols/imports/exports extraction.
- [ ] Implement 4-layer memory storage (Prisma/SQLite).
- [ ] Build incremental reindexing logic and background file scanner.
- [ ] Implement dependency graph analyzer and search API.

##### Sprint 2: UI/UX & Design System

- [ ] Implement App Shell with 3-panel layout and Focus Mode.
- [ ] Integrate CSS Tokens and shadcn/ui.
- [ ] Add Framer Motion transitions and background progress indicators.
- [ ] Build Keyboard Shortcut registry and interaction listeners.

##### Sprint 3: Wiki & Proactive Insights

- [ ] Implement auto-generation pipeline for documentation.
- [ ] Build bi-directional linking between Wiki and Source.
- [ ] Implement low-noise proactive alerting for pattern/issue detection.

#### Phase 2: Native Capabilities (Desktop)

##### Sprint 4: Electron Integration

- [ ] Initialize Electron wrapper and native file system bridge.
- [ ] Implement native window management and menu bar integration.
- [ ] Package and bundle for Windows distribution.

##### Sprint 5: Network Governance (WFP)

- [ ] Implement WFP Callout Driver for network quarantine.
- [ ] Build user-mode fallback API for non-driver environments.

#### Phase 3: Enterprise & Security

##### Sprint 6: Advanced Encryption

- [ ] Implement AES-256 database encryption.
- [ ] Build signed `.ai-project-bundle` export/import utility.

##### Sprint 7: Scale & Performance

- [ ] Multi-worker indexing support for 100K+ files.
- [ ] Implement vector similarity search for semantic retrieval.
