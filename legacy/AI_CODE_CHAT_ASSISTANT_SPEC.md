# AI Chat App with File Reading - Complete Specification

## 📋 Project Overview

**Project Name**: AI Code Chat Assistant
**Type**: Desktop AI Chat Application (Phase 1: Web App, Phase 2: Electron Wrapper)
**Goal**: Build an AI-powered chat application that can read, analyze, and answer questions about user's project files (read-only access).

**Inspiration**: Claude Code Desktop App - similar functionality of chatting with code files.

**Key Differentiator - CONTEXT ORCHESTRATOR SERVICE** 🎛
This app features a **mandatory context orchestration system** that solves AI context loss, decision drift, and project amnesia:
- ✅ Decision Locks - Immutable rules that AI cannot violate
- ✅ Context Orchestrator - Manages all AI prompts and context
- ✅ Conflict Detection - Automatically detects and corrects AI drift
- ✅ State Management - Persistent state across sessions/restarts
- ✅ Prompt Engineering - Always uses correct prompt structure
- ✅ Rule Enforcement - HARD rules are enforced, cannot be violated
- ✅ Drift Correction - Auto-corrects AI when it violates locked decisions

**Key Differentiator - DEEP MEMORY SYSTEM** 🧠
This app features a **comprehensive multi-layered memory system** that builds persistent knowledge about your project, including:
- ✅ Project-level understanding (architecture, technologies, patterns)
- ✅ File-specific analyses (purpose, dependencies, complexity)
- ✅ Conversation history with key insights
- ✅ Code pattern detection across files
- ✅ Issue tracking and discovery
- ✅ User behavior and interests tracking
- ✅ Smart AI context building from all memory layers

**Key Differentiator - CODE INDEXING SYSTEM** 📚
This app features a **powerful automatic code indexing system** that can handle large codebases:
- ✅ Automatic indexing of ALL project files
- ✅ Full-text search across entire codebase
- ✅ Handles large codebases (100K+ files, millions of lines)
- ✅ Incremental indexing (only reindexes changed files)
- ✅ Semantic code understanding (not just text matching)
- ✅ Dependency graph mapping
- ✅ Cross-file relationship tracking

**Key Differentiator - WIKI SYSTEM** 📖
This app features an **intelligent wiki generation system** that creates comprehensive project documentation:
- ✅ Auto-generated project summaries
- ✅ Architecture documentation
- ✅ Module descriptions and relationships
- ✅ Dependency mapping (imports, exports, functions)
- ✅ Enhanced context-grounded understanding
- ✅ Interactive wiki navigation
- ✅ Auto-updating with code changes

The AI doesn't just read files - it **indexes, understands, and documents** your entire codebase!

---

## 🎯 Core Value Proposition

- Users can chat with their project files using AI
- Read-only file access - safe code analysis
- Intelligent code understanding and explanation
- Help users understand their codebase faster
- Similar experience to Claude Code desktop app

**🎛 With Context Orchestrator Service:**
- Solves AI context loss - no more forgotten conversations
- Prevents decision drift - AI stays consistent
- Eliminates project amnesia - remembers everything across sessions
- Decision Locks - Immutable rules that cannot be violated
- Conflict Detection - Auto-detects and corrects AI drift
- State Persistence - Rules, decisions, and memory across restarts

**🧠 With Deep Memory System:**
- AI remembers what it learned about your project
- Builds knowledge over time, gets smarter with each conversation
- Detects patterns and issues across all files
- Remembers your interests and frequently asked questions
- Provides contextual, personalized assistance
- Smart suggestions based on your project and history

**📚 With Code Indexing System:**
- Automatically indexes ALL project files
- Search entire codebase instantly
- Handles large codebases efficiently (100K+ files)
- Understands code relationships and dependencies
- Incremental reindexing for fast updates
- Full-text + semantic search capabilities

**📖 With Wiki System:**
- Auto-generates comprehensive project documentation
- Creates architecture and module documentation
- Maps all dependencies automatically
- Provides context-grounded understanding
- Interactive wiki navigation
- Keeps wiki updated with code changes

---

## 🏗️ Architecture Overview

### Phase 1: Next.js Web App
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌─────────────────────────────┐    │
│  │              │  │                             │    │
│  │  File        │  │   Chat Interface            │    │
│  │  Explorer    │  │   - Message History          │    │
│  │  (Tree View) │  │   - User Input              │    │
│  │              │  │   - AI Responses            │    │
│  │  Memory Panel│  │   - File Context Panel      │    │
│  │  Wiki Panel │  │                             │    │
│  │              │  │                             │    │
│  └──────┬───────┘  └──────────────┬──────────────┘    │
│         │                        │                   │
│         └────────────────────────┘                   │
│                  ↓                                   │
│            State Management                          │
│         (Zustand + IndexedDB Cache)                  │
└─────────────────┬───────────────────────────────────┘
                  │
          ┌───────┴───────┐
          │   API Calls   │
          └───────┬───────┘
                  ↓
┌─────────────────────────────────────────────────────────┐
│         🎛 CONTEXT ORCHESTRATOR SERVICE             │
│         (MANDATORY CORE - THE BRAIN)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────┐     │
│  │  Decision Lock System                         │     │
│  │  - Extract locks from messages              │     │
│  │  - Persist to database (immutable)         │     │
│  │  - Inject into EVERY prompt                │     │
│  │  - Enforce conflict detection              │     │
│  │  - Flag AI drift and auto-correct          │     │
│  └──────────────┬──────────────────────────────┘     │
│                 ↓                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │  Prompt Builder (Fusion)                   │     │
│  │  1. SYSTEM RULES (Decision Locks)      │     │
│  │  2. PROJECT SUMMARY                       │     │
│  │  3. RELEVANT INDEX FACTS                 │     │
│  │  4. RELEVANT MEMORY                    │     │
│  │  5. USER TASK                           │     │
│  └──────────────┬──────────────────────────────┘     │
│                 ↓                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │  Conflict Detector                        │     │
│  │  - Compare AI output vs Decision Locks  │     │
│  │  - Block or correct HARD violations      │     │
│  │  - Log all violations                   │     │
│  └──────────────┬──────────────────────────────┘     │
│                 ↓                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │  Token Budget Manager                      │     │
│  │  - Dynamic token allocation              │     │
│  │  - Context trimming                      │     │
│  │  - Priority-based retrieval              │     │
│  └──────────────┬──────────────────────────────┘     │
│                 ↓                                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│              Backend (Next.js API Routes)              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌─────────────────────────────┐    │
│  │ File System  │  │   AI Integration            │    │
│  │ API          │  │   (z-ai-web-dev-sdk)        │    │
│  │              │  │   - LLM Skill               │    │
│  │ - Read files │  │   - Orchestrated Context       │    │
│  │ - List dirs  │  │   - Enforced Rules           │    │
│  │ - File tree  │  │                             │    │
│  └──────┬───────┘  └──────────────┬──────────────┘    │
│         │                        │                   │
│         └────────────────────────┘                   │
│                  ↓                                   │
│  ┌─────────────────────────────────────────────┐     │
│  │        CODE INDEXING SYSTEM               │     │
│  │  - File Indexer (100K+ files support)    │     │
│  │  - Full-text Search                      │     │
│  │  - Dependency Graph                      │     │
│  │  - Incremental Reindexing               │     │
│  │  - Cross-file Relationships              │     │
│  └─────────────────────────────────────────────┘     │
│                  ↓                                   │
│  ┌─────────────────────────────────────────────┐     │
│  │        MEMORY SYSTEM (Prisma + SQLite)      │     │
│  │  - Decision Locks (IMMUTABLE)            │     │
│  │  - Project Memory                           │     │
│  │  - Conversation Memory                      │     │
│  │  - File Analysis Memory                     │     │
│  │  - Code Pattern Memory                      │     │
│  │  - Issue Memory                             │     │
│  │  - User Behavior Memory                     │     │
│  └─────────────────────────────────────────────┘     │
│                  ↓                                   │
│  ┌─────────────────────────────────────────────┐     │
│  │        WIKI SYSTEM                        │     │
│  │  - Project Wiki Pages                     │     │
│  │  - Architecture Docs                       │     │
│  │  - Module Descriptions                     │     │
│  │  - Dependency Maps                        │     │
│  │  - Auto-generated Content                 │     │
│  └─────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Phase 2: Electron Wrapper
```
┌─────────────────────────────────────────┐
│         Electron Shell                   │
│  - Native File System Access            │
│  - Windows File Browser Dialogs         │
│  - Desktop Window Management            │
│  - Cross-platform (Windows, Mac, Linux) │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│      Built Next.js Web App              │
│    (Production Build)                    │
└─────────────────────────────────────────┘
```

---

## 📦 Tech Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (New York style)
- **Icons**: Lucide React
- **State Management**: Zustand
- **Server State**: TanStack Query (optional)
- **Theme**: next-themes (light/dark mode)

### Backend
- **API Routes**: Next.js API Routes (App Router)
- **File System**: Node.js `fs` module, `path` module
- **AI SDK**: z-ai-web-dev-sdk (LLM Skill)
- **Database**: Prisma ORM with SQLite (for memory storage)
- **Memory Cache**: IndexedDB (frontend cache)
- **Code Indexing**:
  - SQLite FTS5 (Full-Text Search)
  - Or Node-based search library (fuse.js, lunr.js)
  - Dependency graph storage
- **Wiki Storage**: Markdown files + SQLite metadata

### Desktop (Phase 2)
- **Wrapper**: Electron
- **Build Tool**: electron-builder (for .exe)

---

## 🎨 UI/UX Design

### 🎯 **VISUAL DESIGN GUIDELINES (HARD SYSTEM CONSTRAINTS)**

The UI is a first-class system layer. All components must conform to a unified visual language to preserve trust, readability, and cognitive clarity in long-running AI workflows.

---

### Design Philosophy

#### Core Principle
- **The interface must feel like an "AI Control Room", not a web dashboard**
- **Visual clarity > decoration**
- **Motion communicates system state, not entertainment**
- **Users must always understand what the system "knows", "is doing", and "has locked"**

---

### Theme Policy (HARD)

#### Theme Configuration
**Decision**: Dark-first design, light mode optional

#### Color Tokens (HARD - Mandatory)
```css
/* Semantic Color Tokens */
--color-bg-primary: #0D1117;         /* Deep dark background */
--color-bg-surface: #1A1A2E;       /* Panel background */
--color-bg-panel: #252530;          /* Elevated panel */
--color-bg-card: #2A2A35;           /* Card background */

/* Text Colors */
--color-text-primary: #FFFFFF;       /* Primary text (high contrast) */
--color-text-secondary: rgba(255, 255, 255, 0.7); /* Secondary text */
--color-text-muted: rgba(255, 255, 255, 0.5); /* Muted text */

/* Accent Colors */
--color-accent-ai: #FF6B6B;         /* AI presence/activity */
--color-accent-success: #10B981;      /* Success states */
--color-accent-warning: #F59E0B;      /* Warnings */
--color-accent-error: #EF4444;        /* Errors */

/* Border & UI Elements */
--color-border-subtle: rgba(255, 255, 255, 0.1);
--color-border-focus: rgba(255, 107, 107, 0.3);
--color-border-active: rgba(255, 107, 107, 0.5);

/* Glows & Highlights */
--color-glow-ai: rgba(255, 107, 107, 0.3);
--color-glow-success: rgba(16, 185, 129, 0.3);
--color-glow-warning: rgba(245, 158, 11, 0.3);
--color-glow-error: rgba(239, 68, 68, 0.3);
```

#### Color Usage Rules (HARD)
- ✅ All UI styling must reference tokens, not raw hex values
- ✅ Components cannot hardcode colors
- ✅ Theme switching only changes token values
- ✅ All colors must meet WCAG AA contrast standards

---

### Typography System (HARD)

#### Font Stack
```css
/* Typography Tokens */
--font-ui: 'Inter', system-ui, sans-serif;
--font-heading: 'Space Grotesk', system-ui, sans-serif;
--font-code: 'JetBrains Mono', 'Fira Code', monospace;
```

#### Typography Scale
```css
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-xl: 1.25rem;   /* 20px */
--text-2xl: 1.5rem;   /* 24px */
--text-3xl: 1.875rem; /* 30px */
```

#### Typography Rules (HARD)
- ✅ Headings use semantic scale (--text-2xl to --text-3xl)
- ✅ Body text uses --text-base or --text-lg
- ✅ Code always uses monospace font (--font-code)
- ✅ Line length max: 80 characters for reading surfaces
- ✅ Font weights: 400 (regular), 500 (medium), 600 (semibold)

---

### Motion & Animation Standards (HARD)

#### Animation Engine
**Decision**: Framer Motion is the standard animation engine

#### Motion Timings (HARD)
```css
--duration-micro: 150ms;    /* Micro-interactions */
--duration-fast: 250ms;      /* Panel transitions */
--duration-normal: 400ms;    /* System state changes */
--duration-slow: 800ms;      /* Major transitions */
```

#### Motion Rules (HARD)
- ✅ All animations must communicate system state
- ✅ No infinite or decorative motion in core work areas
- ✅ Easing functions must use standard curves:
  - Micro: `easeOut(0.2, 0, 0.1, 1)`
  - Normal: `easeInOutCubic(0.4, 0, 0.2, 1)`
  - Slow: `easeInOutQuad(0.4, 0, 0.2, 1)`
- ✅ Animations must respect user's `prefers-reduced-motion` setting

---

### Glassmorphism Policy (GUARDRAILS)

#### Glass Effects Usage (HARD)
**Decision**: Glass effects are allowed ONLY on secondary surfaces

#### Glass Rules
```
✅ ALLOWED:
- Glass on panels (sidebar, modals, cards)
- Glass on overlay/backdrop elements
- Glass on secondary UI elements

❌ PROHIBITED:
- Glass on primary reading surfaces (chat messages, code viewer, wiki content)
- Glass that reduces text contrast below WCAG AA
- Glass on input fields or controls
- Excessive blur that impacts readability
```

#### Glass Standards (When Used)
```css
.glass-panel {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.glass-panel:hover {
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
```

#### Contrast Requirement (HARD)
- ✅ Text on glass must meet WCAG AA contrast (4.5:1 minimum)
- ✅ Blur must not reduce readability
- ✅ Test on dark backgrounds before approval

---

### Iconography System (HARD)

#### Icon Library
**Decision**: Lucide React as the base icon set

#### System Symbols (Custom - HART-DEFINED)
```typescript
// System Status Icons
const SystemIcons = {
  Indexing: 'Nodes',           // Graph/Nodes
  Indexed: 'CheckCircle',     // Completed
  Memory: 'Layers',            // Stack/Layers
  Wiki: 'BookOpen',            // Book/Map
  DecisionLock: 'ShieldCheck',   // Shield/Lock
  Drift: 'AlertTriangle',      // Warning
  Violation: 'AlertOctagon',    // Error
}

// AI Status Icons
const AIStatusIcons = {
  Idle: 'Circle',
  Thinking: 'Loader2',         // Animated
  Processing: 'Cpu',
  Ready: 'Bot',
  Error: 'XCircle'
}

// File Type Icons
const FileTypeIcons = {
  Code: 'FileCode',
  Config: 'FileJson',
  Doc: 'FileText',
  Image: 'Image',
  Folder: 'Folder',
  FolderOpen: 'FolderOpen'
}
```

#### Icon Rules (HARD)
- ✅ Icons must convey system meaning, not decoration
- ✅ Status icons must be consistent across header, panels, and notifications
- ✅ Use 24px size for UI, 16px for compact
- ✅ Primary actions (send, select) get 24px, secondary 16px
- ✅ All icons must inherit text color from theme tokens

---

### System Status UI (HARD - MANDATORY)

#### System Status Bar (HARD - Required in All Views)
**Requirement**: The UI must always display system state in header/status bar

#### Status Indicators (HARD)
```typescript
interface SystemStatus {
  // Indexing Status
  indexing: {
    state: 'idle' | 'indexing' | 'completed' | 'error';
    progress?: number; // 0-100
    message: string;
  };

  // Wiki Status
  wiki: {
    state: 'idle' | 'building' | 'synced' | 'stale' | 'error';
    pageCount: number;
    lastSync: Date;
  };

  // Decision Locks Status
  decisionLocks: {
    hardRules: number; // Count of active HARD locks
    softRules: number; // Count of active SOFT locks
    violations: number; // Count of recent violations
  };

  // Context Health
  context: {
    state: 'stable' | 'degraded' | 'healthy';
    tokenUsage: number; // Current token budget usage %
  };

  // AI Status
  ai: {
    state: 'idle' | 'thinking' | 'processing' | 'ready' | 'error';
    modelTier: 'small' | 'standard' | 'large';
  };
}
```

#### Visual State Indicators (HARD)
```css
/* Status Colors */
--status-idle: rgba(255, 255, 255, 0.3);
--status-active: var(--color-accent-ai);
--status-success: var(--color-accent-success);
--status-warning: var(--color-accent-warning);
--status-error: var(--color-accent-error);

/* Status Animations */
@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.status-pulse {
  color: var(--status-active);
  animation: pulse 2s ease-in-out infinite;
}
```

---

### Component Standards (HARD)

#### Base Components (HARD)
- shadcn/ui (New York style) - All base UI components
- Radix UI - For accessibility primitives
- Accessibility: Radix UI for a11y compliance

#### Component Rules (HARD)
- ✅ All components must extend shadcn/ui with custom theme
- ✅ No custom components that duplicate shadcn/ui
- ✅ All custom components must use theme tokens
- ✅ Must pass a11y tests before approval

#### Specialized Components (HARD)
- **Code Viewer**: Monaco Editor (read-only)
- **Graphs**: React Flow / D3 (interactive, animated)
- **Syntax Highlighting**: Shiki (server-side with caching)
- **Notifications**: Radix Toast/Sonner (custom styling)

---

### Visual Drift Rule (HARD)

#### Drift Prevention (HARD)
**All new UI components must:**
- ✅ Reference theme tokens (not hardcoded colors)
- ✅ Use standard motion curves
- ✅ Follow typography scale
- ✅ Use standard spacing scale (4px, 8px, 16px, 24px, 32px)
- ✅ Pass contrast checks
- ✅ Follow iconography system

#### Visual Audit Checklist
Before any component is merged:
- [ ] Uses theme tokens (no hardcoded colors)
- [ ] Uses standard motion timings
- [ ] Uses typography from scale
- [ ] Icons from approved set
- [ ] Contrast meets WCAG AA
- [ ] Motion respects prefers-reduced-motion
- [ ] Glass effects only on secondary surfaces
- [ ] System status indicators present

---

### Layout Options

#### Option 1: 2-Panel Layout (Recommended)
```
┌────────────────────────────────────────────────────────┐
│                   Header / Navbar                       │
├──────────────────┬───────────────────────────────────────┤
│                  │                                       │
│  File Explorer   │    Chat Interface                    │
│                  │                                       │
│  ┌────────────┐  │  ┌───────────────────────────────┐  │
│  │ 📁 Project │  │  │ User: What does this do?       │  │
│  │  📁 src    │  │  │                               │  │
│  │    📄 api  │  │  │ AI: This file handles API...  │  │
│  │    📁 app  │  │  │                               │  │
│  │  📁 public │  │  │ User: Find the bug?           │  │
│  │            │  │  │                               │  │
│  │            │  │  │ AI: I found an issue in...    │  │
│  └────────────┘  │  └───────────────────────────────┘  │
│                  │                                       │
│  Selected Files: │  ┌───────────────────────────────┐  │
│  • index.ts      │  │ Ask about your files...        │  │
│  • api.ts        │  │ [Send]                         │  │
│                  │  └───────────────────────────────┘  │
└──────────────────┴───────────────────────────────────────┘
```

#### Option 2: 3-Panel Layout
```
┌─────────────────────────────────────────────────────────────────┐
│                    Header / Navbar                              │
├──────────┬─────────────────────────┬────────────────────────────┤
│          │                         │                            │
│ File     │   Chat Interface        │  File Viewer               │
│ Explorer │                         │  (Read-Only)               │
│          │                         │                            │
│ Tree     │  Message History        │  ┌──────────────────────┐ │
│ View     │                         │  │ // index.ts           │ │
│          │  • User: Explain this  │  │ import { ... }        │ │
│ 📁 src   │  • AI: This file...    │  │                      │ │
│  📄 file │                         │  │ function foo() {     │ │
│  📄 file │  • User: Find bug?     │  │   return ...         │ │
│          │  • AI: In line 23...   │  │ }                    │ │
│ 📁 tests │                         │  └──────────────────────┘ │
│          │  ┌──────────────────┐  │                            │
│          │  │ Input: [_____]   │  │                            │
│          │  │       [Send]     │  │                            │
│          │  └──────────────────┘  │                            │
└──────────┴─────────────────────────┴────────────────────────────┘
```

### Component Breakdown

#### 1. AppShell
- Main layout wrapper
- Header with title, theme toggle, settings
- Footer with status info

#### 2. FileExplorer
- Tree view of directories and files
- Expand/collapse folders
- File icons based on type
- Click to select (adds to AI context)
- Checkbox to multi-select files
- Search/filter files
- Breadcrumb navigation

#### 3. ChatInterface
- Message list (scrollable)
- Message bubbles (user/AI)
- Input area with textarea
- Send button
- File context indicator (showing selected files)
- Loading states
- Error handling

#### 4. FileViewer (if 3-panel)
- Read-only file content display
- Syntax highlighting (for code files)
- File info (path, size, type)
- Scrollable content

#### 5. Status Indicators
- Connection status
- AI processing status
- Files loaded count

#### 6. Memory Panel (NEW)
- Display memory stats (files analyzed, patterns found, issues, conversations)
- "What I know about this project" summary
- List detected patterns
- Show open issues
- Conversation history overview
- User's topics of interest
- Search across memories
- Memory management (clear, export, import)

---

## 🔧 Features

### Phase 1: Core Web App Features

#### 1.1 File Explorer
- [ ] Tree view of directory structure
- [ ] Navigate folders
- [ ] Expand/collapse folders
- [ ] File type icons
- [ ] Search/filter files
- [ ] Breadcrumb navigation
- [ ] Select files for AI context
- [ ] Show selected files list
- [ ] Clear selection

#### 1.2 Chat Interface
- [ ] Message history display
- [ ] User input with textarea
- [ ] Send button
- [ ] Auto-scroll to new messages
- [ ] Message timestamps
- [ ] Markdown rendering for AI responses
- [ ] Code block highlighting
- [ ] Copy code button
- [ ] Loading indicators
- [ ] Error messages

#### 1.3 AI Integration & Memory
- [ ] Read selected files
- [ ] Send file content as context
- [ ] Maintain conversation history
- [ ] Answer questions about files
- [ ] Explain code
- [ ] Find patterns/issues
- [ ] Summarize codebase
- [ ] Suggest improvements (read-only)
- [ ] Context-aware responses
- [ ] Store conversations in memory
- [ ] Build and maintain project memory
- [ ] Detect and store code patterns
- [ ] Track issues found
- [ ] Remember user behavior and interests

#### 1.4 Backend API
- [ ] GET `/api/files/tree` - Get file tree
- [ ] GET `/api/files/content` - Get file content
- [ ] POST `/api/chat` - Send chat message to AI
- [ ] POST `/api/files/analyze` - Analyze files
- [ ] GET `/api/memory/project/:projectId` - Get project memory
- [ ] GET `/api/memory/file/:filePath` - Get file analysis memory
- [ ] POST `/api/memory/search` - Search across all memories
- [ ] GET `/api/memory/ai-context` - Get optimized AI context
- [ ] POST `/api/memory/export` - Export project memories
- [ ] POST `/api/memory/import` - Import project memories
- [ ] DELETE `/api/memory/clear` - Clear project memories
- [ ] Error handling and validation

#### 1.5 Memory System Features
- [ ] Conversation storage and retrieval
- [ ] File analysis memory (purpose, dependencies, complexity)
- [ ] Pattern detection (architecture, design, coding, anti-patterns)
- [ ] Issue tracking (bugs, performance, security, maintainability)
- [ ] User behavior tracking (common questions, frequently accessed files)
- [ ] Project memory (summary, technologies, architecture)
- [ ] AI context builder (combines all memory layers)
- [ ] Memory search across all types
- [ ] Automatic memory updates after AI responses
- [ ] Memory cleanup and retention policies

#### 1.6 Additional Features
- [ ] Dark/light theme toggle
- [ ] Responsive design (mobile-friendly)
- [ ] Toast notifications
- [ ] Keyboard shortcuts
- [ ] Settings panel (configure root path)
- [ ] Memory visualization panel
- [ ] Smart suggestions based on memory
- [ ] Proactive insights from memory

### Phase 2: Electron Wrapper Features
- [ ] Native file browser dialog
- [ ] Access any Windows path
- [ ] Desktop window (not browser)
- [ ] Menu bar
- [ ] Tray icon (optional)
- [ ] Auto-updater (optional)
- [ ] Cross-platform builds

---

## 📡 API Design

### Backend API Routes

#### 1. File Tree API
```typescript
// GET /api/files/tree?path=/relative/path
// Response: File tree structure
{
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  size?: number;
  extension?: string;
}
```

#### 2. File Content API
```typescript
// GET /api/files/content?path=/relative/path/to/file
// Response: File content
{
  path: string;
  content: string;
  size: number;
  encoding: string;
}
```

#### 3. Chat API
```typescript
// POST /api/chat
// Request
{
  message: string;
  contextFiles: Array<{
    path: string;
    content: string;
  }>;
  conversationHistory?: Message[];
}

// Response
{
  message: string;
  sources?: Array<{
    path: string;
    line?: number;
  }>;
}
```

#### 4. Analyze Files API
```typescript
// POST /api/files/analyze
// Request
{
  files: Array<{
    path: string;
    content: string;
  }>;
  query?: string;
}

// Response
{
  summary: string;
  findings: string[];
  suggestions: string[];
}
```

---

## 🎛 CONTEXT ORCHESTRATOR SERVICE (MANDATORY)

### System Goal

**This app exists to prevent AI context loss, decision drift, and project amnesia during long, complex development workflows.**

---

### Core Principle

**The LLM is stateless. The system provides persistent memory, rules, and truth.**

---

### Mandatory Component: Context Orchestrator Service

**The Context Orchestrator Service is the brain of the system. It sits between the frontend and the AI, ensuring that:**
1. Every AI prompt follows the correct structure
2. All locked decisions are injected into every prompt
3. Context is retrieved and optimized, not dumped
4. AI drift is detected and corrected
5. State is persistent across sessions and restarts

---

### Responsibilities

1. **Extract and store Decision Locks** from user and AI messages
2. **Persist architecture rules, system constraints, and final decisions**
3. **Inject locked rules into every AI prompt**
4. **Retrieve only relevant memory, index facts, and wiki summaries per query**
5. **Enforce conflict detection between AI output and locked decisions**
6. **Flag and correct AI drift automatically**

---

### Decision Lock Schema

#### TypeScript Interface
```typescript
interface DecisionLock {
  id: string;
  projectId: string;

  // The Lock
  rule: string; // The locked decision/rule
  scope: 'architecture' | 'security' | 'ux' | 'performance' | 'ai';
  priority: 'hard' | 'soft';
  source: 'user' | 'system';

  // Metadata
  context?: string; // Additional context about the decision
  reasoning?: string; // Why this decision was made
  createdAt: Date;
  updatedAt: Date;

  // Enforcement
  violations: number; // How many times AI violated this rule
  lastViolation?: Date; // When last violation occurred

  // Active status
  active: boolean; // Whether this lock is currently enforced
}
```

#### Prisma Model
```prisma
model DecisionLock {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])

  // The Lock
  rule        String
  scope       String   // 'architecture' | 'security' | 'ux' | 'performance' | 'ai'
  priority    String   // 'hard' | 'soft'
  source      String   // 'user' | 'system'

  // Metadata
  context     String?
  reasoning   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Enforcement
  violations  Int      @default(0)
  lastViolation DateTime?

  // Active status
  active      Boolean  @default(true)

  @@unique([projectId, rule, scope])
  @@index([projectId])
  @@index([scope, priority])
  @@index([active])
}
```

---

### Prompt Structure (ALWAYS)

Every AI prompt sent to the LLM MUST follow this exact structure:

```
[SYSTEM RULES - DECISION LOCKS]
Scope: Architecture (HARD)
- 3-panel layout: File Explorer | Chat | Wiki
- Index EVERYTHING (source, tests, docs, configs, data)
- Full content + embeddings storage

Scope: Performance (HARD)
- <100ms indexed queries
- <300ms semantic search
- 100K+ files support

Scope: AI (HARD)
- Context fusion: Index 40% + Memory 30% + Wiki 20% + User 10%
- Dynamic token budget: 4K/8K/16K
- Index > Memory > Wiki priority
- Retrieval-based context (not file selection)

[PROJECT SUMMARY]
This is a Next.js project with [X] files, [Y] types, [Z] lines of code.
Tech stack: [detected technologies]
Architecture: [detected architecture]

[RELEVANT INDEX FACTS]
- [Top 10 most relevant chunks from code index]
- [Dependencies for relevant files]
- [Patterns detected in relevant code]

[RELEVANT MEMORY]
- [Related file analyses]
- [Open issues in relevant files]
- [User's interests in this area]
- [Related conversation summaries]

[USER TASK]
[User's actual question or task]
```

---

### Conflict Detection & Correction

#### Conflict Detection Algorithm
```typescript
class ConflictDetector {
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
          action: 'BLOCK', // BLOCK or CORRECT
          correction: this.generateCorrection(rule, aiOutput)
        };
      }
    }

    return { violated: false };
  }

  private violatesRule(aiOutput: string, rule: DecisionLock): boolean {
    // Check if AI output contradicts the rule
    const outputLower = aiOutput.toLowerCase();
    const ruleLower = rule.rule.toLowerCase();

    // Simple keyword matching (can be enhanced with AI)
    return outputLower.includes(ruleLower) &&
           this.hasContradiction(outputLower, ruleLower);
  }

  async enforce(aiOutput: string, decisionLocks: DecisionLock[]) {
    const violation = await this.detectViolation(aiOutput, decisionLocks);

    if (violation.violated) {
      // Log violation
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
        return violation.correction;
      }
    }

    return aiOutput;
  }
}
```

#### Violation Logging
```typescript
interface ViolationLog {
  id: string;
  projectId: string;
  decisionLockId: string;
  rule: string;
  scope: string;
  violationType: 'contradiction' | 'omission' | 'misinterpretation';
  aiOutput: string;
  corrected: boolean;
  correction?: string;
  timestamp: Date;
}
```

---

### Token Budget Manager

#### Dynamic Token Allocation
```typescript
class TokenBudgetManager {
  private budgets = {
    small: 4000,   // 4K tokens
    standard: 8000, // 8K tokens
    large: 16000    // 16K tokens
  };

  private splits = {
    SYSTEM_RULES: 0.15,  // 15%
    PROJECT_SUMMARY: 0.15, // 15%
    INDEX_FACTS: 0.40,     // 40%
    MEMORY: 0.20,         // 20%
    USER_TASK: 0.10         // 10%
  };

  allocateTokens(modelTier: 'small' | 'standard' | 'large') {
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
      total: totalBudget
    };
  }
}
```

---

### API Endpoints for Context Orchestrator

#### POST `/api/context/decision-locks`
Create or update decision locks
```typescript
// Request
{
  projectId: string;
  locks: Array<{
    rule: string;
    scope: 'architecture' | 'security' | 'ux' | 'performance' | 'ai';
    priority: 'hard' | 'soft';
    reasoning?: string;
  }>;
}

// Response
{
  created: number;
  updated: number;
  locks: DecisionLock[];
}
```

#### GET `/api/context/decision-locks/:projectId`
Get all decision locks for a project
```typescript
// Response
{
  locks: Array<{
    id: string;
    rule: string;
    scope: string;
    priority: string;
    violations: number;
    active: boolean;
    createdAt: Date;
  }>;
  summary: {
    total: number;
    hardRules: number;
    softRules: number;
    byScope: Record<string, number>;
  };
}
```

#### PUT `/api/context/decision-locks/:id`
Activate/deactivate a decision lock
```typescript
// Request
{
  active: boolean;
}

// Response
{
  success: boolean;
  lock: DecisionLock;
}
```

#### POST `/api/context/build-prompt`
Build an AI prompt with proper context
```typescript
// Request
{
  projectId: string;
  userTask: string;
  modelTier: 'small' | 'standard' | 'large';
  contextHints?: {
    relevantFiles?: string[];
    topics?: string[];
  };
}

// Response
{
  prompt: string;
  tokenUsage: {
    systemRules: number;
    projectSummary: number;
    indexFacts: number;
    memory: number;
    userTask: number;
    reasoning: number;
    total: number;
  };
  sources: {
    decisionLocks: DecisionLock[];
    projectMemory: ProjectMemory;
    indexFacts: IndexFact[];
    memory: MemoryFragment[];
  };
}
```

#### POST `/api/context/validate-response`
Validate AI response against decision locks
```typescript
// Request
{
  projectId: string;
  aiResponse: string;
  promptContext: string;
}

// Response
{
  valid: boolean;
  violations: Array<{
    rule: string;
    scope: string;
    severity: 'HARD' | 'SOFT';
    correction?: string;
  }>;
  correctedResponse?: string;
}
```

#### GET `/api/context/violations/:projectId`
Get violation history
```typescript
// Response
{
  violations: Array<{
    id: string;
    rule: string;
    violationType: string;
    aiOutput: string;
    corrected: boolean;
    correction?: string;
    timestamp: Date;
  }>;
  summary: {
    total: number;
    byRule: Record<string, number>;
    byScope: Record<string, number>;
    recentViolations: number; // Last 7 days
  };
}
```

---

### Success Metrics

**The AI must remain consistent with project specs across:**
- ✅ Long sessions (multiple hours)
- ✅ Multiple restarts
- ✅ Context resets (when context window is exhausted)
- ✅ Different model tiers
- ✅ Various user questions

**Measurement:**
- Decision lock violation rate: < 1%
- Consistency across sessions: > 95%
- Context drift detection: 100% (all violations caught)
- Prompt structure compliance: 100%

---

### Conflict Policy

**If AI output contradicts a HARD rule, the system must:**

1. **BLOCK** the response from reaching the user
2. **LOG** the violation with full context
3. **CORRECT** the response (either regenerate or modify)
4. **NOTIFY** the user (optionally, for transparency)
5. **INCREMENT** the violation count for the decision lock

**If AI output contradicts a SOFT rule, the system must:**
1. **WARN** the user
2. **ALLOW** the response
3. **SUGGEST** the correction
4. **LOG** the violation

---

## 🤖 AI Integration Details

### LLM Skill (z-ai-web-dev-sdk)

#### Usage:
1. **Initialize** SDK in backend API routes
2. **Context Management**: Send selected files as context
3. **Prompt Engineering**: System prompt defines AI behavior
4. **Conversation History**: Maintain context for follow-up questions

#### System Prompt:
```
You are an AI code assistant that helps users understand their project files.
You have read-only access to files and can analyze, explain, and answer questions.
- Provide clear, accurate explanations
- Find potential issues or bugs
- Suggest improvements but DO NOT auto-edit files
- Be concise but thorough
- Reference specific files and line numbers when relevant
```

#### AI Capabilities:
- Code explanation
- Bug detection
- Pattern recognition
- Best practices
- Documentation generation
- Refactoring suggestions

---

## 🗂️ File Access Strategy

### Phase 1 (Web App):
- **Root Path**: Configured in app settings (e.g., `/home/z/my-project`)
- **Scope**: Limited to configured directory and subdirectories
- **Access**: Read-only via Node.js fs module
- **Security**: Path validation, prevent directory traversal

### Phase 2 (Electron):
- **Root Path**: User can select ANY folder via native dialog
- **Scope**: Full access to selected folder
- **Access**: Read-only via Electron's file system APIs
- **Security**: Same validation + Electron's sandbox

---

## 🧠 DEEP MEMORY SYSTEM

### Memory Architecture Overview

The app will have a **multi-layered memory system** that builds deep, persistent knowledge about the specific project being analyzed.

```
┌─────────────────────────────────────────────────────────────────┐
│                     MEMORY ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LAYER 1: Session Memory (Working Memory)              │   │
│  │  - Current conversation                                │   │
│  │  - Recently selected files                             │   │
│  │  - Recent AI responses                                 │   │
│  │  - Active context (files being discussed)              │   │
│  │  Storage: Browser memory + Zustand                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LAYER 2: Short-term Memory (Hours/Days)                │   │
│  │  - All conversations in session                         │   │
│  │  - File analyses performed                              │   │
│  │  - Key findings from files                              │   │
│  │  - User preferences and patterns                         │   │
│  │  Storage: Database (SQLite + Prisma)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LAYER 3: Long-term Memory (Persistent)                  │   │
│  │  - Project knowledge base                                │   │
│  │  - Code patterns detected                                │   │
│  │  - Architecture understanding                            │   │
│  │  - Common issues found                                  │   │
│  │  - User's typical questions and interests               │   │
│  │  - File relationships and dependencies                   │   │
│  │  - Project summary and structure                        │   │
│  │  Storage: Database (SQLite + Prisma) + IndexedDB cache  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LAYER 4: AI Context Builder                            │   │
│  │  - Combines all memory layers                           │   │
│  │  - Builds rich context for AI prompts                  │   │
│  │  - Prioritizes relevant memories                        │   │
│  │  - Manages token budget                                 │   │
│  │  - Updates memory based on AI insights                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Memory Types & What We Store

#### 1. Conversation Memory
```typescript
interface Conversation {
  id: string;
  projectId: string;
  timestamp: Date;
  messages: Message[];
  contextFiles: string[];
  topics: string[]; // Topics discussed
  summary: string; // Auto-generated summary
  keyInsights: string[]; // Important insights from this conversation
}
```

#### 2. File Analysis Memory
```typescript
interface FileAnalysis {
  id: string;
  projectId: string;
  filePath: string;
  analyzedAt: Date;
  summary: string;
  purpose: string; // What this file does
  keyFunctions: string[];
  dependencies: string[]; // Files this depends on
  dependents: string[]; // Files that depend on this
  patterns: string[]; // Code patterns found
  issues: string[]; // Issues found
  suggestions: string[];
  complexity: number; // 1-10 scale
  lastModifiedAt: Date;
  analysisCount: number; // How many times analyzed
}
```

#### 3. Project Memory
```typescript
interface ProjectMemory {
  id: string;
  name: string;
  rootPath: string;
  createdAt: Date;
  lastAccessedAt: Date;
  totalFiles: number;
  structure: ProjectStructure;
  summary: string; // High-level project summary
  technologies: string[]; // Tech stack detected
  architecture: string; // Architecture description
  patterns: string[]; // Common patterns across files
  knownIssues: string[];
  frequentlyAskedQuestions: Array<{
    question: string;
    answer: string;
    frequency: number;
  }>;
  userInterests: string[]; // Topics user frequently asks about
}
```

#### 4. Code Pattern Memory
```typescript
interface CodePattern {
  id: string;
  projectId: string;
  pattern: string; // Description of pattern
  files: string[]; // Files where pattern appears
  frequency: number; // How common this pattern is
  type: 'architecture' | 'design' | 'coding' | 'anti-pattern';
  lastSeen: Date;
}
```

#### 5. Issue Memory
```typescript
interface IssueMemory {
  id: string;
  projectId: string;
  filePath?: string; // null if project-wide issue
  type: 'bug' | 'performance' | 'security' | 'maintainability' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: { file: string; line: number };
  status: 'open' | 'acknowledged' | 'fixed';
  discoveredAt: Date;
  mentionedIn: string[]; // Conversation IDs where mentioned
}
```

#### 6. User Behavior Memory
```typescript
interface UserBehavior {
  id: string;
  projectId: string;
  commonQuestions: Array<{
    question: string;
    frequency: number;
    lastAsked: Date;
  }>;
  frequentlyAccessedFiles: Array<{
    filePath: string;
    accessCount: number;
    lastAccessed: Date;
  }>;
  preferredFileTypes: string[];
  topicsOfInterest: string[];
}
```

### Database Schema (Prisma)

```prisma
// prisma/schema.prisma

model Project {
  id            String   @id @default(cuid())
  name          String
  rootPath      String   @unique
  createdAt     DateTime @default(now())
  lastAccessed  DateTime @updatedAt
  totalFiles    Int      @default(0)
  summary       String?  // AI-generated project summary
  technologies  String?  // JSON array: ["Next.js", "TypeScript", ...]
  architecture  String?  // AI-generated architecture description
  userInterests String?  // JSON array of topics user cares about

  conversations  Conversation[]
  fileAnalyses  FileAnalysis[]
  patterns      CodePattern[]
  issues        IssueMemory[]
  userBehavior  UserBehavior?
  decisionLocks DecisionLock[]  // NEW: Decision locks for context orchestrator
}

model Conversation {
  id            String   @id @default(cuid())
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id])
  timestamp     DateTime @default(now())
  messages      String   // JSON array of messages
  contextFiles  String   // JSON array of file paths
  topics        String?  // JSON array of topics discussed
  summary       String?  // AI-generated summary
  keyInsights   String?  // JSON array of important insights

  @@index([projectId])
  @@index([timestamp])
}

model FileAnalysis {
  id              String   @id @default(cuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id])
  filePath        String
  analyzedAt      DateTime @default(now())
  summary         String
  purpose         String?
  keyFunctions    String?  // JSON array
  dependencies    String?  // JSON array of file paths
  dependents      String?  // JSON array of file paths
  patterns        String?  // JSON array
  issues          String?  // JSON array
  suggestions     String?  // JSON array
  complexity      Int      @default(5) // 1-10
  lastModifiedAt  DateTime
  analysisCount   Int      @default(1)

  @@unique([projectId, filePath])
  @@index([projectId])
}

model CodePattern {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  pattern     String
  files       String   // JSON array of file paths
  frequency   Int      @default(1)
  type        String   // 'architecture' | 'design' | 'coding' | 'anti-pattern'
  lastSeen    DateTime @updatedAt

  @@unique([projectId, pattern, type])
  @@index([projectId])
}

model IssueMemory {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  filePath    String?
  type        String
  severity    String
  description String
  location    String?  // JSON: { file, line }
  status      String   @default("open")
  discoveredAt DateTime @default(now())
  mentionedIn String?  // JSON array of conversation IDs

  @@index([projectId])
  @@index([status])
}

model UserBehavior {
  id                    String   @id @default(cuid())
  projectId             String   @unique
  project               Project  @relation(fields: [projectId], references: [id])
  commonQuestions       String?  // JSON array
  frequentlyAccessedFiles String? // JSON array
  preferredFileTypes    String?  // JSON array
  topicsOfInterest      String?  // JSON array
  lastUpdated           DateTime @updatedAt
}

model DecisionLock {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])

  // The Lock
  rule        String
  scope       String   // 'architecture' | 'security' | 'ux' | 'performance' | 'ai'
  priority    String   // 'hard' | 'soft'
  source      String   // 'user' | 'system'

  // Metadata
  context     String?
  reasoning   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Enforcement
  violations  Int      @default(0)
  lastViolation DateTime?

  // Active status
  active      Boolean  @default(true)

  @@unique([projectId, rule, scope])
  @@index([projectId])
  @@index([scope, priority])
  @@index([active])
}

model ViolationLog {
  id          String   @id @default(cuid())
  projectId   String
  decisionLockId String
  rule        String
  scope       String
  violationType String // 'contradiction' | 'omission' | 'misinterpretation'
  aiOutput    String
  corrected   Boolean
  correction  String?
  timestamp   DateTime @default(now())

  @@index([projectId])
  @@index([decisionLockId])
  @@index([timestamp])
}
```

### Memory Retrieval Strategy

#### When User Asks a Question:

1. **Analyze the query** - Understand what the user is asking about
2. **Search relevant memories**:
   - Check ProjectMemory for project-level context
   - Check FileAnalysis for relevant files mentioned
   - Check ConversationMemory for similar past questions
   - Check IssueMemory for related issues
   - Check UserBehavior for user's interests
3. **Build AI Context**:
   - Start with ProjectMemory (project overview)
   - Add relevant FileAnalysis summaries
   - Include related conversations
   - Add relevant patterns and issues
   - Include user behavior insights
4. **Manage Token Budget**:
   - Prioritize: Project summary > File analysis > Patterns > Issues > History
   - Truncate if needed, keep most relevant
5. **Send to AI with rich context**

### Memory Updates

#### After AI Response:

1. **Extract key insights** from AI's response
2. **Update ProjectMemory**:
   - Refine project summary based on new understanding
   - Add new technologies/patterns discovered
3. **Update FileAnalysis**:
   - Add new insights for files discussed
   - Increment analysis count
   - Update patterns if new ones found
4. **Create/Update IssueMemory**:
   - If AI found issues, store them
5. **Update UserBehavior**:
   - Track question asked
   - Track files accessed
   - Update interests
6. **Update ConversationMemory**:
   - Store complete conversation
   - Generate summary
   - Extract key insights

### API Endpoints for Memory

#### GET `/api/memory/project/:projectId`
Get all memory for a project
```typescript
{
  project: ProjectMemory;
  recentConversations: Conversation[];
  topPatterns: CodePattern[];
  openIssues: IssueMemory[];
  userBehavior: UserBehavior;
}
```

#### GET `/api/memory/file/:filePath`
Get analysis and context for a specific file
```typescript
{
  fileAnalysis: FileAnalysis;
  relatedFiles: FileAnalysis[];
  issues: IssueMemory[];
  patterns: CodePattern[];
  conversations: Conversation[]; // Where this file was discussed
}
```

#### POST `/api/memory/search`
Search across all memories
```typescript
// Request
{
  query: string;
  filters?: {
    type?: 'conversations' | 'files' | 'patterns' | 'issues';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    dateRange?: { from: Date; to: Date };
  };
}

// Response
{
  results: Array<{
    type: string;
    relevance: number;
    data: any;
  }>;
}
```

#### GET `/api/memory/ai-context`
Get optimized AI context for current query
```typescript
// Request
{
  query: string;
  selectedFiles: string[];
  maxTokens?: number;
}

// Response
{
  context: {
    project: string; // Project summary
    files: Array<{ path: string; summary: string; purpose: string }>;
    patterns: string[];
    issues: Array<{ description: string; severity: string }>;
    relatedConversations: Array<{ summary: string; keyInsights: string[] }>;
    userInterests: string[];
  };
  tokenCount: number;
}
```

### AI Context Building Algorithm

```typescript
// Pseudocode for building AI context
function buildAIContext(query: string, selectedFiles: string[], maxTokens: number) {
  let context = {
    project: "",
    files: [],
    patterns: [],
    issues: [],
    conversations: [],
    userInterests: []
  };

  let usedTokens = 0;

  // 1. Project summary (highest priority)
  const projectMemory = getProjectMemory();
  if (projectMemory.summary && tokens(projectMemory.summary) + usedTokens < maxTokens * 0.2) {
    context.project = projectMemory.summary;
    usedTokens += tokens(projectMemory.summary);
  }

  // 2. Selected file analyses
  for (const filePath of selectedFiles) {
    const analysis = getFileAnalysis(filePath);
    if (analysis && usedTokens + tokens(analysis.summary) < maxTokens * 0.4) {
      context.files.push({
        path: filePath,
        summary: analysis.summary,
        purpose: analysis.purpose
      });
      usedTokens += tokens(analysis.summary);
    }
  }

  // 3. Relevant patterns (based on selected files + query)
  const relevantPatterns = getRelevantPatterns(selectedFiles, query);
  for (const pattern of relevantPatterns) {
    if (usedTokens + tokens(pattern.pattern) < maxTokens * 0.6) {
      context.patterns.push(pattern.pattern);
      usedTokens += tokens(pattern.pattern);
    }
  }

  // 4. Open issues for selected files
  const issues = getIssuesForFiles(selectedFiles);
  for (const issue of issues) {
    if (usedTokens + tokens(issue.description) < maxTokens * 0.7) {
      context.issues.push(issue);
      usedTokens += tokens(issue.description);
    }
  }

  // 5. Related conversations
  const relatedConversations = searchRelatedConversations(query);
  for (const conv of relatedConversations.slice(0, 3)) {
    if (usedTokens + tokens(conv.summary) < maxTokens * 0.9) {
      context.conversations.push({
        summary: conv.summary,
        keyInsights: conv.keyInsights
      });
      usedTokens += tokens(conv.summary);
    }
  }

  // 6. User interests (low cost, high value)
  if (projectMemory.userInterests) {
    context.userInterests = projectMemory.userInterests;
  }

  return context;
}
```

### Memory Management Features

#### 1. Automatic Memory Cleanup
- Old conversations (> 30 days) are archived
- Low-relevance patterns are pruned
- Resolved issues are marked but kept for reference
- File analysis is refreshed if file changes

#### 2. Memory Refresh Strategy
```typescript
// When to refresh memory
const TRIGGERS = {
  FILE_MODIFIED: true,        // Refresh file analysis
  NEW_FILES_ADDED: true,      // Update project structure
  USER_FEEDBACK: true,        // User indicates incorrect info
  TIME_THRESHOLD: '7 days',   // Auto-refresh old analyses
  PROJECT_REOPENED: true      // When user opens project after while
};
```

#### 3. Memory Persistence
- All memories stored in SQLite database
- Cache frequently accessed memories in IndexedDB (frontend)
- Lazy load memories from database when needed
- Backup/restore functionality for project memories

#### 4. Memory Visualization
- Show "What I know about this project" panel
- Display memory stats:
  - Files analyzed: 45/200
  - Patterns detected: 12
  - Issues found: 3
  - Conversations stored: 28
- Allow users to view/manage memories

### Memory-Powered Features

#### 1. Smart Suggestions
- "I noticed you often ask about X, would you like me to explain..."
- "Based on past analysis, this file might be related to Y..."

#### 2. Proactive Insights
- "I've analyzed this project 5 times, here are the key patterns I've found..."
- "You've asked about authentication 3 times, here's what I know..."

#### 3. Context-Aware Chat
- AI remembers what you've discussed before
- References past conversations
- Builds on previous insights
- Remembers your preferences

#### 4. Project Dashboard
- Overview of what AI "knows" about the project
- Visual representation of project structure
- Issues and patterns discovered
- Your interaction history

### Memory Privacy & Security

1. **Local Storage Only** - All memory stored locally in SQLite
2. **No Cloud Sync** - By default, no memory leaves the user's machine
3. **Export/Import** - Users can export/import their memory
4. **Clear Memory** - Users can clear all or specific memories
5. **Encryption** - Optional encryption for sensitive projects

---

## 📚 CODE INDEXING SYSTEM

### Overview

The Code Indexing System provides **automatic, scalable indexing of all project files** with powerful search capabilities. It can handle large codebases with 100K+ files and millions of lines of code.

```
┌─────────────────────────────────────────────────────────────┐
│               CODE INDEXING ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  1. File Scanner                                 │      │
│  │  - Scans entire project directory                │      │
│  │  - Identifies file types                         │      │
│  │  - Filters ignored files (.git, node_modules)    │      │
│  │  - Detects file changes (watcher)              │      │
│  └──────────────┬───────────────────────────────────┘      │
│                 ↓                                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │  2. Content Extractor                           │      │
│  │  - Reads file content                           │      │
│  │  - Extracts code symbols (functions, classes)   │      │
│  │  - Identifies imports/exports                   │      │
│  │  - Parses comments and docs                     │      │
│  └──────────────┬───────────────────────────────────┘      │
│                 ↓                                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │  3. Dependency Analyzer                        │      │
│  │  - Builds import/export graph                  │      │
│  │  - Maps function calls                         │      │
│  │  - Tracks class relationships                   │      │
│  │  - Identifies circular dependencies            │      │
│  └──────────────┬───────────────────────────────────┘      │
│                 ↓                                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │  4. Index Builder                              │      │
│  │  - Full-text index (SQLite FTS5)              │      │
│  │  - Symbol index                               │      │
│  │  - Dependency graph storage                   │      │
│  │  - Metadata index                            │      │
│  └──────────────┬───────────────────────────────────┘      │
│                 ↓                                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │  5. Storage Layer                              │      │
│  │  - SQLite database (FTS5 tables)               │      │
│  │  - Dependency graphs (adjacency lists)        │      │
│  │  - Index metadata                            │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Indexing Features

#### 1. Automatic Full-Project Indexing
- **Scans** all files in project directory
- **Filters** ignored files (.git, node_modules, dist, build, etc.)
- **Indexes** all code files (.js, .ts, .jsx, .tsx, .py, .java, .go, etc.)
- **Supports** 100K+ files
- **Handles** millions of lines of code
- **Incremental** updates (only reindexes changed files)

#### 2. Full-Text Search
- **SQLite FTS5** for fast full-text search
- **Search** across all files simultaneously
- **Rank** results by relevance
- **Support** boolean operators (AND, OR, NOT)
- **Case-insensitive** search
- **Partial** matching (fuzzy search)

#### 3. Symbol Indexing
- **Index** all functions, classes, variables
- **Track** symbol definitions and usages
- **Map** symbol relationships
- **Find** where symbols are used
- **Jump** to symbol definitions

#### 4. Dependency Graph
- **Build** complete dependency tree
- **Map** import/export relationships
- **Track** function calls across files
- **Identify** circular dependencies
- **Visualize** dependency graph

#### 5. Cross-File Relationship Tracking
- **Track** which files import others
- **Map** function calls across files
- **Identify** tightly coupled modules
- **Find** unused exports
- **Detect** orphaned code

### Database Schema (Code Index)

```prisma
// Code Index Tables (stored alongside memory system)

model CodeIndex {
  id          String   @id @default(cuid())
  projectId   String

  // File metadata
  filePath    String   @unique
  fileName    String
  fileType    String   // .ts, .js, .py, etc.
  fileSize    Int
  lineCount   Int

  // Content
  content     String?  // Full content (optional, can be lazy loaded)
  preview     String?  // First 500 chars for quick preview

  // Indexing
  indexedAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  checksum    String   // For change detection

  @@index([projectId])
  @@index([fileType])
}

model SymbolIndex {
  id          String   @id @default(cuid())
  projectId   String

  // Symbol info
  name        String   // Symbol name
  type        String   // function, class, variable, interface, etc.
  filePath    String   // Where defined
  line        Int      // Line number
  column      Int      // Column number

  // Metadata
  isExport    Boolean  @default(false)
  signature   String?  // Function signature
  docComment  String?  // Documentation comment

  // Search
  searchVector String?  // For full-text search

  indexedAt   DateTime @default(now())

  @@index([projectId, name])
  @@index([projectId, type])
  @@index([filePath])
}

model DependencyIndex {
  id              String   @id @default(cuid())
  projectId       String

  // Relationship
  fromFile        String   // Importing file
  toFile          String   // Imported file
  importType      String   // import, require, etc.

  // Details
  symbolName      String?  // Specific symbol imported
  line            Int      // Where import occurs

  // Graph traversal
  path            String?  // JSON array representing full path

  indexedAt       DateTime @default(now())

  @@unique([projectId, fromFile, toFile, symbolName])
  @@index([projectId, fromFile])
  @@index([projectId, toFile])
}

model FileRelationship {
  id              String   @id @default(cuid())
  projectId       String

  // Files
  fileA           String
  fileB           String

  // Relationship
  type            String   // imports, calls, references, similar
  strength        Float    // 0-1, relationship strength

  // Details
  details         String?  // JSON: { functions: [], classes: [] }

  indexedAt       DateTime @default(now())

  @@unique([projectId, fileA, fileB, type])
  @@index([projectId, fileA])
  @@index([projectId, fileB])
  @@index([projectId, strength])
}
```

### Indexing Strategies

#### For Large Codebases (10K+ files)

1. **Chunked Indexing**
   - Index files in batches (100-500 files at a time)
   - Use worker threads for parallel processing
   - Progress reporting during indexing

2. **Lazy Content Loading**
   - Only index file metadata initially
   - Load full content on-demand
   - Store previews for quick search

3. **Priority Indexing**
   - Index important files first (root files, configs, src/ directory)
   - Queue less important files (tests, docs, examples)
   - Background processing

4. **Incremental Updates**
   - Use file checksums to detect changes
   - Only reindex changed files
   - Update dependency graph incrementally

#### For Medium Codebases (1K-10K files)

1. **Full Index on First Run**
   - Index all files at once
   - Build complete dependency graph
   - May take 10-30 seconds

2. **Quick Reindex**
   - Detect changed files via timestamps/checksums
   - Only update changed portions
   - Takes 1-5 seconds

#### For Small Codebases (<1K files)

1. **Instant Indexing**
   - Index all files in < 5 seconds
   - Reindex on any change
   - Always up-to-date

### API Endpoints for Code Indexing

#### POST `/api/index/start`
Start full or incremental indexing
```typescript
// Request
{
  type: 'full' | 'incremental';
  path?: string; // Specific path to index (optional)
  options?: {
    includePatterns?: string[]; // Glob patterns
    excludePatterns?: string[]; // Glob patterns to exclude
  };
}

// Response
{
  indexId: string;
  status: 'started' | 'in-progress' | 'completed';
  estimatedTime?: number; // seconds
  filesToIndex: number;
}
```

#### GET `/api/index/status`
Get indexing status
```typescript
// Response
{
  indexId: string;
  status: 'idle' | 'indexing' | 'completed' | 'error';
  progress: {
    totalFiles: number;
    indexedFiles: number;
    percentage: number;
  };
  errors?: string[];
}
```

#### POST `/api/index/search`
Search across indexed code
```typescript
// Request
{
  query: string;
  filters?: {
    fileType?: string[];
    path?: string[];
    symbolType?: string[];
  };
  options?: {
    limit?: number;
    offset?: number;
    includeContent?: boolean;
  };
}

// Response
{
  results: Array<{
    type: 'file' | 'symbol' | 'dependency';
    filePath: string;
    fileName: string;
    snippet: string;
    line?: number;
    symbol?: {
      name: string;
      type: string;
      signature?: string;
    };
    relevance: number;
  }>;
  total: number;
  queryTime: number; // milliseconds
}
```

#### GET `/api/index/dependencies`
Get dependency graph
```typescript
// Request
{
  filePath: string;
  depth?: number; // How many levels deep
  direction?: 'both' | 'upstream' | 'downstream';
}

// Response
{
  file: string;
  dependencies: Array<{
    file: string;
    type: string;
    symbols: string[];
    path: string[]; // Full dependency path
  }>;
  dependents: Array<{
    file: string;
    type: string;
    symbols: string[];
  }>;
  circularDeps?: Array<{
    files: string[];
    path: string[];
  }>;
}
```

#### GET `/api/index/symbols`
Find symbol definitions and usages
```typescript
// Request
{
  symbolName: string;
  projectId: string;
}

// Response
{
  definitions: Array<{
    filePath: string;
    line: number;
    column: number;
    type: string;
    signature?: string;
    docComment?: string;
  }>;
  usages: Array<{
    filePath: string;
    line: number;
    column: number;
    context: string; // Code snippet
  }>;
}
```

#### GET `/api/index/stats`
Get indexing statistics
```typescript
// Response
{
  totalFiles: number;
  indexedFiles: number;
  totalSymbols: number;
  totalDependencies: number;
  totalRelationships: number;
  fileTypes: Record<string, number>; // { '.ts': 45, '.js': 23, ... }
  indexSize: number; // bytes
  lastIndexedAt: Date;
}
```

### Incremental Reindexing

```typescript
// Reindex trigger conditions
const REINDEX_TRIGGERS = {
  FILE_CHANGED: true,        // File modified (detected by checksum)
  FILE_ADDED: true,          // New file created
  FILE_DELETED: true,         // File removed
  CONFIG_CHANGED: true,        // Index configuration changed
  MANUAL_TRIGGER: true,        // User manually triggers reindex
  TIME_THRESHOLD: '24 hours', // Auto reindex if older than threshold
};

// Incremental reindexing algorithm
async function incrementalReindex(projectPath: string) {
  // 1. Scan file system
  const currentFiles = await scanDirectory(projectPath);

  // 2. Compare with index
  const indexedFiles = await getIndexedFiles();

  // 3. Identify changes
  const newFiles = currentFiles.filter(f => !indexedFiles.includes(f));
  const deletedFiles = indexedFiles.filter(f => !currentFiles.includes(f));
  const changedFiles = await detectChangedFiles(indexedFiles);

  // 4. Process changes
  await removeIndexEntries(deletedFiles);
  await updateIndexEntries(changedFiles);
  await addIndexEntries(newFiles);

  // 5. Update dependency graph
  await updateDependencyGraph([...changedFiles, ...newFiles]);
}
```

### Search Capabilities

#### 1. Full-Text Code Search
```typescript
// Search for code patterns
await codeSearch({
  query: "function authenticateUser",
  options: { includeContent: true }
});

// Results:
{
  results: [
    {
      type: 'symbol',
      filePath: 'src/auth/api.ts',
      fileName: 'api.ts',
      snippet: 'function authenticateUser(token: string): Promise<User>',
      line: 45,
      symbol: {
        name: 'authenticateUser',
        type: 'function',
        signature: 'function authenticateUser(token: string): Promise<User>'
      },
      relevance: 0.95
    }
  ]
}
```

#### 2. Semantic Search (AI-powered)
```typescript
// Search by meaning, not just text
await semanticSearch({
  query: "How do I authenticate a user?",
  filters: { fileType: ['.ts', '.tsx'] }
});

// Returns files/functions related to authentication
// Even if they don't contain the exact word "authenticate"
```

#### 3. Dependency Search
```typescript
// Find all files that depend on a specific file
await dependencySearch({
  filePath: 'src/auth/api.ts',
  direction: 'downstream',
  depth: 3
});

// Results:
{
  file: 'src/auth/api.ts',
  dependencies: [],
  dependents: [
    { file: 'src/pages/login.tsx', type: 'import', symbols: ['authenticateUser'] },
    { file: 'src/middleware/auth.ts', type: 'import', symbols: ['authenticateUser'] },
    { file: 'src/api/routes.ts', type: 'import', symbols: ['authenticateUser'] }
  ]
}
```

#### 4. Symbol Search
```typescript
// Find where a symbol is used
await symbolSearch({
  symbolName: 'authenticateUser',
  projectId: 'project-123'
});

// Results:
{
  definitions: [
    {
      filePath: 'src/auth/api.ts',
      line: 45,
      column: 1,
      type: 'function',
      signature: 'function authenticateUser(token: string): Promise<User>',
      docComment: 'Authenticates user with JWT token'
    }
  ],
  usages: [
    {
      filePath: 'src/pages/login.tsx',
      line: 23,
      column: 15,
      context: 'const user = await authenticateUser(token)'
    },
    {
      filePath: 'src/middleware/auth.ts',
      line: 12,
      column: 10,
      context: 'const user = authenticateUser(req.headers.authorization)'
    }
  ]
}
```

### Performance Optimizations

#### 1. Database Optimizations
- **FTS5** for full-text search (SQLite extension)
- **Composite indexes** on frequently queried columns
- **Connection pooling** for concurrent access
- **Prepared statements** for repeated queries

#### 2. Caching
- **LRU cache** for frequently accessed files
- **Dependency graph cache** for fast lookups
- **Search result cache** for common queries

#### 3. Lazy Loading
- **File content** loaded only when needed
- **Large dependency graphs** traversed lazily
- **Symbol usages** fetched on-demand

#### 4. Parallel Processing
- **Worker threads** for CPU-intensive tasks
- **Batch operations** for database writes
- **Async indexing** to avoid blocking UI

---

## 📖 WIKI SYSTEM

### Overview

The Wiki System automatically generates comprehensive project documentation, including architecture, modules, dependencies, and enhanced context-grounded understanding.

```
┌─────────────────────────────────────────────────────────────┐
│                  WIKI SYSTEM ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Wiki Generator (AI-powered)                   │      │
│  │  - Analyzes codebase                          │      │
│  │  - Generates documentation                    │      │
│  │  - Creates diagrams                           │      │
│  │  - Extracts API docs                         │      │
│  └──────────────┬───────────────────────────────────┘      │
│                 ↓                                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Wiki Pages                                   │      │
│  │  - Project Overview                          │      │
│  │  - Architecture Docs                          │      │
│  │  - Module Documentation                       │      │
│  │  - API Reference                             │      │
│  │  - Dependency Maps                           │      │
│  │  - Setup & Getting Started                   │      │
│  └──────────────┬───────────────────────────────────┘      │
│                 ↓                                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Wiki Storage                                 │      │
│  │  - Markdown files                            │      │
│  │  - SQLite metadata                           │      │
│  │  - Version tracking                          │      │
│  │  - Change history                            │      │
│  └──────────────┬───────────────────────────────────┘      │
│                 ↓                                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Wiki Interface                               │      │
│  │  - Search wiki                                │      │
│  │  - Browse by category                         │      │
│  │  - Interactive diagrams                       │      │
│  │  - Link to code                               │      │
│  │  - Edit notes (user annotations)               │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Wiki Pages Structure

#### 1. Project Overview
```markdown
# Project Name

## Summary
[AI-generated project summary]

## Technology Stack
- Frontend: [technologies detected]
- Backend: [technologies detected]
- Database: [technologies detected]
- Other: [technologies detected]

## Key Features
- [features detected from code]

## Project Structure
```
src/
├── components/
├── pages/
├── utils/
└── config/
```

## Quick Start
[Auto-generated setup instructions]

## Configuration
[Detected configuration files and their purposes]
```

#### 2. Architecture Documentation
```markdown
# Architecture

## High-Level Architecture
[AI-generated architecture description]

## Architecture Diagram
[Mermaid diagram showing architecture]

## Design Patterns
- [Pattern 1]: [description]
- [Pattern 2]: [description]

## Data Flow
[Description of how data flows through the system]

## Component Relationships
[Interactive component relationship map]
```

#### 3. Module Documentation
```markdown
# Module: auth

## Purpose
Authentication and authorization module

## Files
- `src/auth/api.ts` - Authentication API endpoints
- `src/auth/middleware.ts` - Auth middleware for routes
- `src/auth/utils.ts` - Authentication utilities

## Exports
- `authenticateUser()` - Main authentication function
- `verifyToken()` - JWT token verification
- `requireAuth()` - Route protection middleware

## Dependencies
- Depends on: `src/utils/crypto.ts`, `src/db/users.ts`
- Used by: `src/api/routes.ts`, `src/middleware/auth.ts`

## Usage Examples
```typescript
import { authenticateUser } from '@/auth/api';

const user = await authenticateUser(token);
```

## Notes
[AI-detected notes about the module]
```

#### 4. API Reference
```markdown
# API Reference

## Authentication API

### authenticateUser(token: string): Promise<User>
Authenticates a user using JWT token.

**Parameters:**
- `token` - JWT token string

**Returns:**
- `Promise<User>` - User object

**Example:**
```typescript
const user = await authenticateUser(token);
```

**Throws:**
- `UnauthorizedError` - Invalid token

**See Also:**
- [verifyToken](#verifytoken)
```

#### 5. Dependency Maps
```markdown
# Dependency Map

## Dependency Graph
[Interactive graph visualization]

## Critical Dependencies
- `react` - UI framework
- `next.js` - Application framework

## Circular Dependencies
[List of circular dependencies found]

## Orphaned Modules
[Modules with no imports/exports]
```

### Database Schema (Wiki System)

```prisma
// Wiki System Tables

model WikiPage {
  id          String   @id @default(cuid())
  projectId   String

  // Page info
  title       String   @unique
  slug        String   @unique // URL-friendly identifier
  category    String   // overview, architecture, modules, api, etc.

  // Content
  content     String   // Markdown content
  metadata    String?  // JSON: { generatedAt, version, ... }

  // Relationships
  relatedFiles String?  // JSON array of related file paths
  linksTo     String?  // JSON array of linked wiki pages

  // Versioning
  version     Int      @default(1)
  generatedAt DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // User edits
  userNotes   String?  // User annotations (separate from generated content)

  @@index([projectId])
  @@index([category])
  @@index([slug])
}

model WikiCategory {
  id          String   @id @default(cuid())
  projectId   String

  name        String   @unique
  description String?
  order       Int      @default(0) // Display order

  pages       WikiPage[]

  @@index([projectId])
}
```

### Wiki Generation Process

#### Phase 1: Analysis
```typescript
async function analyzeProjectForWiki(projectPath: string) {
  // 1. Load indexed code
  const codeIndex = await loadCodeIndex(projectPath);

  // 2. Analyze project structure
  const structure = await analyzeProjectStructure(codeIndex);

  // 3. Identify modules
  const modules = await identifyModules(codeIndex, structure);

  // 4. Map dependencies
  const dependencies = await buildDependencyGraph(codeIndex);

  // 5. Extract API surfaces
  const apis = await extractAPIs(codeIndex);

  // 6. Detect patterns and architecture
  const architecture = await detectArchitecture(codeIndex, structure);

  return { structure, modules, dependencies, apis, architecture };
}
```

#### Phase 2: Generation
```typescript
async function generateWikiPages(analysis: ProjectAnalysis) {
  const pages: WikiPage[] = [];

  // 1. Generate project overview
  pages.push(await generateProjectOverview(analysis));

  // 2. Generate architecture docs
  pages.push(await generateArchitectureDocs(analysis.architecture));

  // 3. Generate module documentation
  for (const module of analysis.modules) {
    pages.push(await generateModulePage(module));
  }

  // 4. Generate API reference
  pages.push(await generateAPIReference(analysis.apis));

  // 5. Generate dependency maps
  pages.push(await generateDependencyMaps(analysis.dependencies));

  return pages;
}
```

#### Phase 3: AI-Powered Enhancement
```typescript
async function enhanceWikiWithAI(pages: WikiPage[], context: ProjectContext) {
  const enhancedPages = [];

  for (const page of pages) {
    // Use AI to generate summaries
    const summary = await llm.generateSummary(page.content, context);

    // Use AI to generate examples
    const examples = await llm.generateExamples(page.content, context);

    // Use AI to improve descriptions
    const improved = await llm.improveDescriptions(page.content, context);

    enhancedPages.push({
      ...page,
      content: improved,
      summary,
      examples
    });
  }

  return enhancedPages;
}
```

### API Endpoints for Wiki System

#### POST `/api/wiki/generate`
Generate wiki for project
```typescript
// Request
{
  projectId: string;
  options?: {
    includeCategories?: string[]; // Which categories to generate
    regenerate?: boolean; // Force regenerate existing pages
  };
}

// Response
{
  wikiId: string;
  status: 'started' | 'in-progress' | 'completed';
  estimatedTime?: number;
  categories: string[];
}
```

#### GET `/api/wiki/:projectId/pages`
Get all wiki pages for project
```typescript
// Response
{
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    category: string;
    summary?: string;
    generatedAt: Date;
    updatedAt: Date;
  }>;
  categories: Array<{
    name: string;
    description: string;
    pageCount: number;
  }>;
}
```

#### GET `/api/wiki/:projectId/:slug`
Get specific wiki page
```typescript
// Response
{
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string; // Markdown
  metadata: {
    generatedAt: Date;
    version: number;
    relatedFiles: string[];
  };
  relatedPages: Array<{
    title: string;
    slug: string;
  }>;
  userNotes?: string; // User annotations
}
```

#### POST `/api/wiki/:projectId/:slug/notes`
Add user notes to wiki page
```typescript
// Request
{
  notes: string;
}

// Response
{
  success: boolean;
  notes: string;
  updatedAt: Date;
}
```

#### POST `/api/wiki/:projectId/regenerate`
Regenerate wiki pages
```typescript
// Request
{
  pageIds?: string[]; // Specific pages to regenerate, or all if not provided
  options?: {
    force?: boolean; // Force even if code hasn't changed
  };
}

// Response
{
  status: 'started' | 'in-progress' | 'completed';
  pagesToRegenerate: number;
  completedPages: number;
}
```

#### POST `/api/wiki/search`
Search wiki pages
```typescript
// Request
{
  query: string;
  filters?: {
    category?: string[];
  };
}

// Response
{
  results: Array<{
    pageId: string;
    title: string;
    slug: string;
    category: string;
    snippet: string;
    relevance: number;
  }>;
}
```

### Context-Grounded Understanding

The Wiki System provides **enhanced context** by:

1. **Linking to Code**
   - Every wiki page links to actual code files
   - Click to open file in editor
   - Jump to specific lines

2. **Interactive Diagrams**
   - Architecture diagrams are interactive
   - Click components to see code
   - Hover for more info

3. **Cross-References**
   - Wiki pages link to each other
   - API docs link to module docs
   - Dependency maps link to both

4. **Up-to-Date**
   - Auto-regenerate on code changes
   - Track outdated pages
   - Show last sync time

### Wiki Features

#### 1. Auto-Generated Documentation
- **Project summaries** automatically generated
- **Architecture docs** created from code analysis
- **API references** extracted from JSDoc/type definitions
- **Module docs** from directory structure and imports

#### 2. Interactive Navigation
- **Search** across all wiki pages
- **Browse by category**
- **Related pages** suggestions
- **Breadcrumb navigation**

#### 3. User Annotations
- **Add notes** to any wiki page
- **Override** AI-generated content
- **Custom examples**
- **Personal documentation**

#### 4. Visualizations
- **Architecture diagrams** (Mermaid, D3)
- **Dependency graphs** (interactive)
- **Component maps**
- **Data flow diagrams**

#### 5. Version Tracking
- **Track changes** to wiki pages
- **Compare versions**
- **Rollback** to previous versions
- **Change history**

---

## 📊 State Management (Zustand)

### Store Structure:
```typescript
interface AppState {
  // File Explorer
  fileTree: TreeNode[];
  selectedFiles: string[];
  expandedFolders: Set<string>;
  currentPath: string;

  // Chat
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Memory (from API)
  projectMemory: ProjectMemory | null;
  fileAnalyses: Map<string, FileAnalysis>; // path -> analysis
  patterns: CodePattern[];
  issues: IssueMemory[];
  userBehavior: UserBehavior | null;
  memoryStats: {
    filesAnalyzed: number;
    patternsFound: number;
    issuesFound: number;
    conversationsStored: number;
  };

  // Code Indexing
  codeIndex: {
    totalFiles: number;
    indexedFiles: number;
    totalSymbols: number;
    totalDependencies: number;
    lastIndexedAt: Date | null;
    isIndexing: boolean;
    indexingProgress: {
      totalFiles: number;
      indexedFiles: number;
      percentage: number;
    } | null;
  };
  searchResults: SearchResult[];
  dependencies: Map<string, DependencyInfo>; // path -> dependencies

  // Wiki System
  wikiPages: WikiPage[];
  wikiCategories: WikiCategory[];
  currentWikiPage: WikiPage | null;
  wikiSearchResults: WikiSearchResult[];
  isGeneratingWiki: boolean;
  wikiGenerationProgress: {
    totalPages: number;
    generatedPages: number;
    percentage: number;
  } | null;

  // Settings
  rootPath: string;
  theme: 'light' | 'dark';

  // Actions
  setFileTree: (tree: TreeNode[]) => void;
  selectFile: (path: string) => void;
  deselectFile: (path: string) => void;
  toggleFolder: (path: string) => void;
  addMessage: (message: Message) => void;
  setRootPath: (path: string) => void;

  // Memory actions
  loadProjectMemory: () => Promise<void>;
  loadFileAnalysis: (path: string) => Promise<void>;
  searchMemory: (query: string) => Promise<SearchResult[]>;
  clearMemory: () => Promise<void>;
  exportMemory: () => Promise<void>;
  importMemory: (data: any) => Promise<void>;

  // Code Indexing actions
  startIndexing: (type: 'full' | 'incremental') => Promise<void>;
  stopIndexing: () => void;
  searchCode: (query: string, filters?: SearchFilters) => Promise<SearchResult[]>;
  getDependencies: (filePath: string, depth?: number) => Promise<DependencyInfo>;
  findSymbol: (symbolName: string) => Promise<SymbolInfo>;

  // Wiki actions
  loadWikiPages: () => Promise<void>;
  loadWikiPage: (slug: string) => Promise<void>;
  generateWiki: (options?: WikiGenerationOptions) => Promise<void>;
  searchWiki: (query: string, filters?: WikiFilters) => Promise<WikiSearchResult[]>;
  saveWikiNotes: (pageId: string, notes: string) => Promise<void>;
  regenerateWiki: (pageIds?: string[]) => Promise<void>;
}
```

---

## 🚀 Development Roadmap

### Phase 1: Web App (Current Sprint)

#### Sprint 0.0: Context Orchestrator Service (MANDATORY - Core Infrastructure)
- [ ] Implement DecisionLock database model
- [ ] Build ConflictDetector class
- [ ] Build TokenBudgetManager class
- [ ] Implement PromptBuilder with 5-section structure
- [ ] Create ContextOrchestrator service
- [ ] Add decision lock extraction from messages
- [ ] Implement decision lock injection into prompts
- [ ] Add conflict detection enforcement
- [ ] Create violation logging system
- [ ] Implement decision lock API endpoints
- [ ] Add prompt building API endpoint
- [ ] Add response validation API endpoint
- [ ] Test conflict detection and correction
- [ ] Test token budget allocation
- [ ] Test prompt structure compliance

#### Sprint 1.1: UI Foundation
- [ ] App shell layout
- [ ] File explorer tree view
- [ ] Chat interface basic structure
- [ ] File viewer (optional)
- [ ] Theme toggle
- [ ] Memory visualization panel
- [ ] Wiki panel interface

#### Sprint 1.2: Backend API & Database
- [ ] Prisma schema setup (memory, code index, wiki)
- [ ] Database migrations
- [ ] File system API routes
- [ ] LLM integration
- [ ] Memory API routes (project, file, search)
- [ ] AI context builder API
- [ ] Chat API with context
- [ ] Code indexing API routes
- [ ] Wiki API routes
- [ ] Error handling

#### Sprint 1.3: Code Indexing System
- [ ] File scanner implementation
- [ ] Content extractor (symbols, imports, exports)
- [ ] Dependency analyzer
- [ ] Index builder (SQLite FTS5)
- [ ] Incremental reindexing
- [ ] Full-text search implementation
- [ ] Symbol search implementation
- [ ] Dependency graph builder
- [ ] Search API endpoints
- [ ] Index status tracking

#### Sprint 1.4: Wiki System
- [ ] Wiki generator implementation
- [ ] Project analysis for wiki
- [ ] Architecture documentation generation
- [ ] Module documentation generation
- [ ] API reference generation
- [ ] Dependency map generation
- [ ] AI-powered enhancement
- [ ] Wiki storage (Markdown + metadata)
- [ ] Wiki API endpoints
- [ ] Wiki UI components

#### Sprint 1.5: Memory System
- [ ] Conversation memory storage
- [ ] File analysis memory
- [ ] Project memory system
- [ ] Pattern detection and storage
- [ ] Issue tracking memory
- [ ] User behavior tracking
- [ ] Memory retrieval and search
- [ ] Context building algorithm

#### Sprint 1.6: Integration
- [ ] Connect frontend to backend
- [ ] File selection → AI context
- [ ] Chat with file analysis
- [ ] Code indexing in chat context
- [ ] Wiki integration with AI responses
- [ ] Memory-powered AI responses
- [ ] Smart suggestions
- [ ] Loading and error states

#### Sprint 1.7: Polish
- [ ] Responsive design
- [ ] Keyboard shortcuts
- [ ] Toast notifications
- [ ] Performance optimization (large codebases)
- [ ] Memory management UI
- [ ] Index management UI
- [ ] Wiki management UI
- [ ] Export/import memory
- [ ] Search performance optimization

### Phase 2: Electron Wrapper (Future)

#### Sprint 2.1: Electron Setup
- [ ] Initialize Electron project
- [ ] Configure Electron to load Next.js app
- [ ] Test basic functionality

#### Sprint 2.2: Native Features
- [ ] File browser dialog integration
- [ ] Menu bar
- [ ] Window management

#### Sprint 2.3: Build & Distribute
- [ ] Configure electron-builder
- [ ] Build .exe for Windows
- [ ] Test on Windows

---

## 🎯 SYSTEM DECISIONS - PRODUCTION-READY

This section contains all final architectural and technical decisions for the AI Code Chat Assistant system.

---

### 🎛 **Context Orchestrator Service Decisions**

#### C1. System Goal
**Decision**: **Prevent AI context loss, decision drift, and project amnesia**

**Implementation**:
- Context Orchestrator Service as mandatory core component
- Decision Locks as immutable rules
- Conflict detection and auto-correction
- Persistent state across sessions/restarts

---

#### C2. Core Principle
**Decision**: **The LLM is stateless. The system provides persistent memory, rules, and truth.**

**Implementation**:
- All state stored in database (SQLite)
- Decision Locks injected into EVERY prompt
- Context retrieved and optimized (not dumped)
- AI drift detected and corrected automatically

---

#### C3. Decision Lock Schema
**Decision**: **Store all locked decisions with enforcement tracking**

**Implementation**:
- TypeScript interface with full metadata
- Prisma model with violation tracking
- Immutable rules that cannot be violated
- Priority system (HARD vs SOFT)

---

#### C4. Prompt Structure
**Decision**: **ALWAYS use 5-section prompt structure**

**Implementation**:
1. SYSTEM RULES (Decision Locks)
2. PROJECT SUMMARY
3. RELEVANT INDEX FACTS
4. RELEVANT MEMORY
5. USER TASK

---

#### C5. Conflict Detection
**Decision**: **Auto-detect and correct AI drift**

**Implementation**:
- Compare AI output vs Decision Locks
- Block HARD rule violations
- Warn on SOFT rule violations
- Log all violations with context

---

#### C6. Token Budget
**Decision**: **Dynamic, model-based token allocation**

**Implementation**:
- Small: 4K tokens
- Standard: 8K tokens
- Large: 16K tokens
- Split: 70% context, 30% reasoning
- Detailed per-section allocation

---

### 🎨 **UI & UX Decisions**

#### 1. Visual Design System (HARD CONSTRAINT)
**Decision**: **Visual Design Guidelines as mandatory system layer**

**Implementation**:
- Visual Design Guidelines (HARD SYSTEM CONSTRAINTS) section added to SPEC
- All UI components must conform to unified visual language
- Color tokens mandatory - no hardcoded colors in components
- Motion standards - Framer Motion with specific timings
- Glassmorphism guardrails - only on secondary surfaces
- Typography system - Inter + Space Grotesk + JetBrains Mono
- Iconography system - Lucide React + custom system symbols
- System Status UI - MANDATORY in all views
- Visual drift prevention - audit checklist required

**Rationale**: The interface must feel like an "AI Control Room", not a web dashboard. Visual clarity > decoration. Motion communicates system state, not entertainment. Users must always understand what the system "knows", "is doing", and "has locked".

---

#### 2. UI Layout
**Decision**: **3-panel layout by default** (File Explorer | Chat | Wiki/File Viewer) with **Focus Mode toggle** (2-panel: File Explorer | Chat)

**Rationale**: This is a code intelligence system. Users must see source, reasoning, and knowledge simultaneously.

**Implementation**:
- Default: 3-panel layout for full functionality
- Focus Mode: Collapses Wiki/File Viewer to tab for focused chat
- Responsive: Adapts to screen size
- Collapsible panels for each section

---

#### 2. File Types
**Decision**: **ALL FILES** — no file type restriction

**Policy**:
- **Code files** → parsed + indexed + summarized (`.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.java`, `.go`, `.rs`, `.c`, `.cpp`, etc.)
- **Text/docs** → chunked + indexed + summarized (`.md`, `.txt`, `.rst`, `.docx`, etc.)
- **Structured data** → schema extracted + indexed (`.json`, `.csv`, `.yaml`, `.toml`, etc.)
- **Binary files** → metadata only (hash, size, type) - no content indexing

---

#### 3. Initial Root Path
**Decision**: **No default path** — User must select project folder

**UX Flow**:
- **First launch**: "Select Project Folder" dialog
- **Last-used path**: Stored and auto-selected on next launch
- **Demo project**: "Open Demo Project" button with bundled sample project
- **Change project**: Settings panel or re-open dialog

---

#### 4. Code Highlighting
**Decision**: **Shiki** (server-side highlighting)

**Implementation**:
- **Server-side highlight**: Syntax highlighting rendered on backend
- **Cache by file hash**: Highlighted output cached to avoid re-rendering
- **Re-render only on file change**: Cache invalidates when file changes
- **Multiple themes**: Support light/dark mode highlighting

---

#### 5. Wiki Layout
**Decision**: **Docked 3rd panel** (not modal, not separate page)

**Behavior Rules**:
- Selecting file → opens related Wiki module page
- AI finds issue → opens Wiki Issues section
- Pattern detected → updates Architecture/Patterns page
- Focus Mode → Wiki collapses to tab

---

### 📁 **File Handling Decisions**

#### 6. File Size Limit
**Decision**: **NO SIZE LIMIT**

**System Rule**: Files are never injected raw into AI context. All files go through:
```
Chunk → Index → Summarize → Retrieve → Inject
```

**Implementation**:
- Large files are chunked automatically
- Only relevant chunks are retrieved and injected
- No artificial file size restrictions
- Performance handled through chunking and retrieval

---

#### 7. File Count Limit
**Decision**: **No hard limit for indexing** | **Soft limit for chat context = Retrieval-based only**

**Rule**: AI only sees top-ranked chunks, not full files or selections.

**Implementation**:
- Index all files (unlimited)
- Chat context limited by retrieval ranking (e.g., top 20 chunks)
- User can select many files, but AI only sees relevant chunks

---

#### 8. File Change Detection
**Decision**: **Hybrid Model**

**Implementation**:
- **Web (browser)**: Poll every 10 seconds + hash compare
- **Electron**: Native file watcher (chokidar)

---

### 📚 **Code Indexing Decisions**

#### 9. Indexing Strategy
**Decision**: **Auto-index on project open** (mandatory)

---

#### 10. Index Scope
**Decision**: **Index EVERYTHING**

**Scope**:
- ✅ Source code files
- ✅ Test files
- ✅ Documentation files
- ✅ Configuration files
- ✅ Log files
- ✅ Data files
- ⚠️ Binary files → metadata only (hash, size, type)

---

#### 11. Index Storage
**Decision**: **Store full chunked content + metadata + embeddings**

**Rationale**: Metadata-only search fails at scale and breaks semantic retrieval.

**Implementation**:
- Full chunked content: For accurate retrieval
- Metadata: File info, dependencies, relationships
- Embeddings: For semantic search
- All stored in SQLite with FTS5

---

#### 12. Index Refresh
**Decision**: **Automatic, incremental, background**

**Rules**:
- **Changed file**: Reindex only that file
- **Dependency change**: Update graph only
- **Background processing**: No UI blocking
- **Progress tracking**: Real-time progress updates

---

#### 13. Search Performance
**Decision**: **Target <100ms for indexed queries** | **<300ms for semantic search (embeddings)**

**Implementation**:
- Indexed queries: SQLite FTS5 (ultra-fast)
- Semantic queries: Vector similarity search (embeddings)
- Caching: LRU cache for common queries
- Parallel processing: Multi-threaded search

---

#### 14. Large Codebase Support
**Decision**: **Minimum target: 100K files, multi-million LOC**

**Architecture Requirements**:
- **Background workers**: Parallel file processing
- **Job queue**: Manage indexing tasks efficiently
- **Disk-based index storage**: No memory limits
- **Chunked indexing**: Process files in batches

---

### 📖 **Wiki System Decisions**

#### 15. Auto-Generation
**Decision**: **ALWAYS auto-build after indexing completes**

**System Rule**: Wiki is derived artifact of Index, not user-triggered.

---

#### 16. Wiki Update Frequency
**Decision**: **Incremental updates only**

**Change → Action Mapping**:
| Change | Action |
|--------|---------|
| File change | Update module page |
| Dependency change | Update architecture page |
| New pattern | Update patterns page |
| Issue detected | Update issues page |

---

#### 17. Wiki Storage
**Decision**: **Hybrid**

- **Markdown files**: Human-readable
- **SQLite metadata**: Indexing, linking, search, versioning

---

#### 18. User Annotations
**Decision**: **Yes — but protected**

**Rules**:
- ✅ AI can suggest changes
- ✅ User edits are **never overwritten**
- ✅ AI writes to separate "AI Section" blocks
- ✅ User can edit any section

---

### 🧠 **Memory System Decisions**

#### 19. Conversation Memory
**Decision**: **Sliding window + archive**

**Rules**:
- **Active context**: Last 25 messages
- **Archive after**: 30 days
- **Keep summaries**: Forever (summaries of archived conversations)

---

#### 20. Memory Retention
**Decision**: **Tiered retention**

| Memory | Policy |
|---------|---------|
| Project summary | Forever |
| File analysis | Until file hash changes |
| Patterns | Prune after 60 days unused |
| Issues | Until closed |
| Conversations | Archive after 30 days |

---

#### 21. Pattern Detection
**Decision**: **Automatic (background) + Manual Deep Scan**

- **Automatic**: Ongoing background pattern detection
- **Manual Deep Scan**: User can trigger full pattern analysis
- **Real-time updates**: Patterns added as detected

---

#### 22. Memory Priority
**Decision**: **Weighted Scoring System**

| Memory Type | Weight |
|--------------|---------|
| Project Summary | 1.0 |
| Selected Files | 0.9 |
| Open Issues | 0.8 |
| Patterns | 0.6 |
| Conversation History | 0.4 |
| User Interests | 0.2 |

---

#### 23. Token Budget
**Decision**: **Dynamic, model-based**

| Model Tier | Budget |
|------------|---------|
| Small | 4K tokens |
| Standard | 8K tokens |
| Large | 16K tokens |

**Rule**: Max 70% for memory/context, 30% reserved for reasoning.

---

#### 24. Auto-Analysis
**Decision**: **Lazy + Background**

**Trigger → Action Mapping**:
| Trigger | Action |
|----------|---------|
| File select | Quick summary |
| Idle 30s | Deep analysis |
| Manual trigger | Full scan |

---

### 🤖 **AI & Intelligence Decisions**

#### 25. Multi-file Chat
**Decision**: **Always ON**

**Implementation**:
- Context is built from **ranked retrieval**, not file selection
- AI can reference any file in the project
- Retrieval-based context ensures relevance

---

#### 26. Proactive Insights
**Decision**: **Low-noise mode**

**AI speaks only when**:
- High-severity issue found
- Pattern appears in 3+ files
- Repeated user behavior detected

**Otherwise**: AI only responds to user queries

---

#### 27. Context Sources
**Decision**: **Fusion Model**

**Priority Order**: Index (truth) > Memory (learned) > Wiki (narrative)

**Token Split**:
- Index: 40%
- Memory: 30%
- Wiki: 20%
- User/AI: 10%

**Conflict Rule**: If Wiki or Memory disagrees with Index → **Index wins and Wiki is rebuilt**.

---

### 🔒 **Privacy & Security Decisions**

#### 28. Memory Encryption
**Decision**: **Optional, project-level**

**Implementation**:
- AES-256 encryption
- Passphrase-derived key
- Encrypt entire SQLite database

---

#### 29. Export / Import
**Decision**: **Yes — signed bundle**

**Export Includes**:
- Memory DB
- Wiki (Markdown + metadata)
- Index metadata
- Project config

**Format**: `.ai-project-bundle` (signed archive)

---

#### 30. Wiki Privacy
**Decision**: **Wiki is always included in export/import**

**Rationale**: Wiki is human-readable memory, not derived cache.

---

### 🟢 **SYSTEM SUMMARY**

This system is an **index-first, memory-driven, wiki-derived, retrieval-based AI intelligence platform** — not a simple file-to-chat pipeline.

**Key Characteristics**:
- **Index-first**: All understanding starts from indexed codebase
- **Memory-driven**: AI learns from interactions and builds knowledge
- **Wiki-derived**: Documentation automatically generated from code analysis
- **Retrieval-based**: AI context built from ranked retrieval, not raw files

---

## 📝 Notes

### Core Principles
- **Security First**: All file access is read-only
- **Path Validation**: Prevent directory traversal attacks
- **Error Handling**: Graceful error messages for file access issues
- **Performance**: Lazy load file content, only read when selected
- **Privacy**: No file data is sent anywhere except to AI API

### Memory & Context System
- **Memory System**: All project memories stored locally in SQLite database
- **Memory Privacy**: By default, no memory leaves user's machine
- **Context Awareness**: AI builds rich context from multi-layered memory system
- **Token Efficiency**: Smart context building maximizes relevant information within token limits

### Code Indexing
- **Code Indexing**: Automatic indexing of ALL project files with full-text search
- **Scalability**: Designed to handle large codebases (100K+ files, millions of lines)
- **Incremental Indexing**: Only reindexes changed files for fast updates
- **Dependency Tracking**: Complete import/export graph with circular dependency detection
- **Symbol Search**: Find definitions and usages across entire codebase

### Wiki System
- **Wiki System**: Auto-generates comprehensive project documentation
- **Context-Grounded**: Wiki links directly to code files and lines
- **AI-Enhanced**: Wiki content is improved by AI for clarity and completeness

### Context Orchestrator Service (MANDATORY)
- **Core Principle**: The LLM is stateless. The system provides persistent memory, rules, and truth
- **Decision Locks**: Immutable rules that AI cannot violate
- **Prompt Structure**: ALWAYS 5-section format (System Rules, Project Summary, Index Facts, Memory, User Task)
- **Conflict Detection**: Auto-detects and corrects AI drift
- **Token Budget Management**: Dynamic allocation (4K/8K/16K) with 70% context, 30% reasoning split
- **Success Metric**: AI consistency across sessions, restarts, and context resets

### Retrieval-Based Intelligence
- **Retrieval-Based**: AI context built from ranked retrieval, not raw files
- **No File Size Limits**: Files chunked automatically, no artificial restrictions
- **No File Count Limits**: Index all files, chat limited by retrieval ranking
- **Context Sources**: Index (40%) + Memory (30%) + Wiki (20%) + User/AI (10%)
- **Conflict Resolution**: Index wins if Wiki or Memory disagree

### UI/UX
- **3-Panel Layout**: File Explorer | Chat | Wiki/File Viewer with Focus Mode toggle
- **Shiki Highlighting**: Server-side syntax highlighting with caching
- **Hybrid File Watcher**: Web (10s poll + hash compare) + Electron (chokidar)

### Memory & Wiki Storage
- **Full Content Indexing**: Store chunked content + metadata + embeddings for semantic search
- **Auto-Wiki Generation**: Wiki always auto-builds after indexing completes
- **Tiered Memory Retention**: Different policies for different memory types
- **Weighted Scoring**: Prioritizes Project Summary (1.0) > Selected Files (0.9) > Issues (0.8) > Patterns (0.6) > History (0.4) > Interests (0.2)
- **User Annotations**: Protected, never overwritten by AI

### AI & Intelligence
- **Multi-file Chat**: Always ON with ranked retrieval context
- **Low-Noise AI**: Proactive only on high-severity issues, patterns in 3+ files, repeated behavior
- **Fusion Context Model**: Index (truth) > Memory (learned) > Wiki (narrative)

### Privacy & Security
- **Optional Encryption**: AES-256, project-level, passphrase-derived key
- **Signed Export/Import**: `.ai-project-bundle` format with all project data
- **Wiki Privacy**: Wiki always included in export/import

---

## 📋 FINAL SPECIFICATION STATUS

✅ **All 30 decisions + 6 Context Orchestrator decisions finalized**
✅ **Architecture complete**
✅ **Database schema defined** (includes DecisionLock, ViolationLog)
✅ **API endpoints specified** (includes Context Orchestrator endpoints)
✅ **Development roadmap updated** (includes Context Orchestrator Sprint)
✅ **Production-ready**

**Core Systems Defined:**
- 🎛 Context Orchestrator Service (MANDATORY - The Brain)
- 📚 Code Indexing System (100K+ files support)
- 🧠 Deep Memory System (project-level, file-level, patterns, issues)
- 📖 Wiki System (auto-generated documentation)
- 🔐 Decision Locks (immutable rules, conflict detection)
- 📊 Token Budget Manager (dynamic allocation)

**Ready for implementation**

---

## 🎯 KEY ARCHITECTURAL INSIGHTS

### 1. The Problem Solved
**AI Context Loss, Decision Drift, Project Amnesia**

Traditional AI code assistants:
- ❌ Send entire SPEC → Context FULL
- ❌ Send all selected files → Context OVERFLOW
- ❌ AI forgets decisions → DRIFT
- ❌ No persistent memory → AMNESIA
- ❌ Restart = Lost state

### 2. The Solution Implemented
**Context Orchestrator Service = The Brain**

```
User Request
    ↓
Context Orchestrator
    ├─ Extract Decision Locks (rules)
    ├─ Retrieve Relevant Index (top chunks)
    ├─ Retrieve Relevant Memory (patterns, issues)
    ├─ Retrieve Relevant Wiki (architecture, docs)
    ├─ Build Prompt (5-section structure)
    │   ├─ 1. SYSTEM RULES (Decision Locks)
    │   ├─ 2. PROJECT SUMMARY
    │   ├─ 3. RELEVANT INDEX FACTS
    │   ├─ 4. RELEVANT MEMORY
    │   └─ 5. USER TASK
    ├─ Allocate Token Budget (70% context, 30% reasoning)
    └─ Validate Against Decision Locks
    ↓
AI LLM (Stateless, but with ORCHESTRATED CONTEXT)
    ↓
AI Response
    ↓
Conflict Detector
    ├─ Compare vs Decision Locks
    ├─ BLOCK hard violations
    └─ Log all violations
    ↓
Validated Response to User
```

### 3. Success Metrics
**AI Consistency:**
- Decision lock violation rate: < 1%
- Consistency across sessions: > 95%
- Context drift detection: 100%
- Prompt structure compliance: 100%

**Performance:**
- <100ms indexed queries
- <300ms semantic search
- 100K+ files support
- Multi-million LOC support

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [z-ai-web-dev-sdk Documentation](./z-ai-sdk-docs.md) - to be created
- [Electron Documentation](https://www.electronjs.org/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

---

**Last Updated**: 2025-06-18
**Version**: 6.0 (Visual Design System Added - Hard Constraints)
**Status**: **FINALIZED - READY FOR IMPLEMENTATION**

---

## 📋 Version History

- **v6.0** (2025-06-18): Visual Design Guidelines (HARD SYSTEM CONSTRAINTS) Added
- **v5.0** (2025-06-18): Context Orchestrator Service Added - Mandatory Component
- **v4.0** (2025-06-18): All 30 decisions finalized - Production Ready
- **v3.0** (2025-06-18): Added Code Indexing System and Wiki System
- **v2.0** (2025-06-18): Added Deep Memory System
- **v1.0** (2025-06-18): Initial specification with core features

---

## 🎯 DECISION SUMMARY

### 🎨 Visual Design System (7 decisions)
- ✅ Visual Design Guidelines as mandatory system layer
- ✅ Theme Policy (Dark-first, token-based colors, no indigo/blue)
- ✅ Color Tokens (semantic, mandatory, WCAG AA compliant)
- ✅ Typography System (Inter + Space Grotesk + JetBrains Mono)
- ✅ Motion Standards (Framer Motion, specific timings, system state communication)
- ✅ Glassmorphism Policy (guardrails, only secondary surfaces, contrast requirements)
- ✅ Iconography System (Lucide React + custom system symbols)
- ✅ System Status UI (MANDATORY in all views)
- ✅ Visual Drift Prevention (audit checklist required)

### 🎛 Context Orchestrator Service (6 decisions)
- ✅ System Goal: Prevent AI context loss, decision drift, project amnesia
- ✅ Core Principle: LLM is stateless, system provides persistent state
- ✅ Decision Locks: Immutable rules with enforcement tracking
- ✅ Prompt Structure: ALWAYS 5-section format
- ✅ Conflict Detection: Auto-detect and correct AI drift
- ✅ Token Budget: Dynamic, model-based (4K/8K/16K)

---

### 🎨 Visual Design System (7 decisions)
- ✅ Visual Design Guidelines as mandatory system layer
- ✅ Theme Policy (Dark-first, token-based colors, no indigo/blue)
- ✅ Color Tokens (semantic, mandatory, WCAG AA compliant)
- ✅ Typography System (Inter + Space Grotesk + JetBrains Mono)
- ✅ Motion Standards (Framer Motion, specific timings, system state communication)
- ✅ Glassmorphism Policy (guardrails, only secondary surfaces, contrast requirements)
- ✅ Iconography System (Lucide React + custom system symbols)
- ✅ System Status UI (MANDATORY in all views)
- ✅ Visual Drift Prevention (audit checklist required)

### 🎨 UI & UX (5 decisions)
- ✅ 3-panel layout with Focus Mode toggle
- ✅ ALL FILES supported (no restrictions)
- ✅ No default path - user must select folder
- ✅ Shiki for code highlighting (server-side)
- ✅ Docked Wiki panel with smart behavior

### File Handling (3 decisions)
- ✅ NO file size limit - chunking handles large files
- ✅ NO file count limit - retrieval-based chat context
- ✅ Hybrid file watching (poll + native watcher)

### Code Indexing (6 decisions)
- ✅ Auto-index on project open (mandatory)
- ✅ Index EVERYTHING (source, tests, docs, configs, data)
- ✅ Full content + metadata + embeddings storage
- ✅ Automatic incremental refresh
- ✅ <100ms indexed queries, <300ms semantic
- ✅ 100K+ files, multi-million LOC support

### Wiki System (4 decisions)
- ✅ ALWAYS auto-build after indexing
- ✅ Incremental updates only
- ✅ Hybrid storage (Markdown + SQLite)
- ✅ User annotations (protected, never overwritten)

### Memory System (6 decisions)
- ✅ Sliding window (25 messages) + 30-day archive
- ✅ Tiered retention (Forever until pruned/closed)
- ✅ Auto + Manual pattern detection
- ✅ Weighted scoring (1.0 → 0.2 weights)
- ✅ Dynamic token budget (4K/8K/16K)
- ✅ Lazy + Background auto-analysis

### AI & Intelligence (3 decisions)
- ✅ Multi-file chat ALWAYS ON
- ✅ Low-noise proactive insights
- ✅ Fusion context model (Index > Memory > Wiki)

### Privacy & Security (3 decisions)
- ✅ Optional AES-256 encryption
- ✅ Signed .ai-project-bundle export/import
- ✅ Wiki always included in export/import
