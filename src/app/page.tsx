'use client';
// Rebuild trigger - chat API updated to use /api/chat2

import { useState, useEffect } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import { FileViewer } from '@/components/FileViewer';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';
import { MemoryManagementDialog } from '@/components/MemoryManagementDialog';
import { IndexManagementDialog } from '@/components/IndexManagementDialog';
import { WikiManagementDialog } from '@/components/WikiManagementDialog';
import { SettingsDialog } from '@/components/SettingsDialog';
import { MarkdownWithHighlight } from '@/components/MarkdownWithHighlight';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  Image as ImageIcon,
  Search,
  Send,
  MoreHorizontal,
  BookOpen,
  Layers,
  ShieldCheck,
  CheckCircle,
  Loader2,
  Bot,
  Settings,
  Moon,
  Sun,
  RefreshCw,
  X,
  Edit3,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';

// Types
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  size?: number;
  extension?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WikiPage {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  tags: string[];
  lastUpdated: Date;
}

interface SystemStatus {
  indexing: {
    state: 'idle' | 'indexing' | 'completed' | 'error';
    progress?: number;
    message: string;
  };
  wiki: {
    state: 'idle' | 'building' | 'synced' | 'stale' | 'error';
    pageCount: number;
    lastSync: Date;
  };
  decisionLocks: {
    hardRules: number;
    softRules: number;
    violations: number;
  };
  context: {
    state: 'stable' | 'degraded' | 'healthy';
    tokenUsage: number;
  };
  ai: {
    state: 'idle' | 'thinking' | 'processing' | 'ready' | 'error';
    modelTier: 'small' | 'standard' | 'large';
  };
}

export default function AIChatApp() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [panelMode, setPanelMode] = useState<'3-panel' | '4-panel'>('3-panel');
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingFile, setViewingFile] = useState<{ path: string; content: string; language: string } | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showMemoryDialog, setShowMemoryDialog] = useState(false);
  const [showIndexDialog, setShowIndexDialog] = useState(false);
  const [showWikiDialog, setShowWikiDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
  const [selectedWikiPage, setSelectedWikiPage] = useState<WikiPage | null>(null);
  const [wikiSearchQuery, setWikiSearchQuery] = useState('');
  const [wikiEditMode, setWikiEditMode] = useState(false);
  const [wikiEditContent, setWikiEditContent] = useState('');
  const [isSavingWiki, setIsSavingWiki] = useState(false);
  const [fileSortOrder, setFileSortOrder] = useState<'name' | 'type' | 'size'>('name');
  const [fileSortDirection, setFileSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchFilters, setSearchFilters] = useState<{
    fileTypes: string[];
    languages: string[];
    dateRange: 'any' | 'today' | 'week' | 'month';
  }>({
    fileTypes: [],
    languages: [],
    dateRange: 'any',
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    indexing: {
      state: 'idle',
      message: 'Ready to index',
    },
    wiki: {
      state: 'idle',
      pageCount: 0,
      lastSync: new Date(),
    },
    decisionLocks: {
      hardRules: 0,
      softRules: 0,
      violations: 0,
    },
    context: {
      state: 'healthy',
      tokenUsage: 45,
    },
    ai: {
      state: 'idle',
      modelTier: 'standard',
    },
  });

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Load file tree on mount
  useEffect(() => {
    loadFileTree();
    loadProjectMemory();
    loadWikiPages();
  }, []);

  // Load file tree from API
  async function loadFileTree() {
    try {
      const response = await fetch('/api/files/tree?path=');
      if (!response.ok) {
        throw new Error('Failed to load file tree');
      }
      const tree = await response.json();
      setFileTree(tree);
      toast({
        title: 'File tree loaded',
        description: `${tree.length} files indexed successfully`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error loading file tree:', error);
      toast({
        title: 'Error loading file tree',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }

  // Load project memory from API
  async function loadProjectMemory() {
    try {
      // For now, we'll use a default project ID
      const response = await fetch('/api/memory/project/default');
      if (!response.ok) {
        console.warn('Could not load project memory (expected for new project)');
        return;
      }
      const memory = await response.json();
      console.log('Loaded memory:', memory);
    } catch (error) {
      console.error('Error loading project memory:', error);
    }
  }

  // Load wiki pages from API
  async function loadWikiPages() {
    try {
      const response = await fetch('/api/wiki/pages?projectId=default');
      if (!response.ok) {
        console.warn('Could not load wiki pages');
        return;
      }
      const data = await response.json();
      setWikiPages(data.pages || []);
      console.log('Loaded wiki pages:', data.pages?.length || 0);
    } catch (error) {
      console.error('Error loading wiki pages:', error);
    }
  }

  // Keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrl: true,
      handler: () => {
        setPanelMode(prev => prev === '3-panel' ? '4-panel' : '3-panel');
        toast({
          title: 'Layout changed',
          description: `Switched to ${panelMode === '3-panel' ? '4-panel' : '3-panel'} mode`,
          variant: 'default',
        });
      },
      description: 'Toggle 3/4 panel layout',
    },
    {
      key: 'f',
      ctrl: true,
      handler: () => {
        setShowAdvancedSearch(true);
      },
      description: 'Open advanced search',
    },
    {
      key: 'Escape',
      handler: () => {
        if (viewingFile) {
          setViewingFile(null);
        } else if (showAdvancedSearch) {
          setShowAdvancedSearch(false);
        }
      },
      description: 'Close dialogs',
    },
    {
      key: 'r',
      ctrl: true,
      handler: () => {
        loadFileTree();
        toast({
          title: 'Refreshing',
          description: 'File tree is being refreshed',
          variant: 'default',
        });
      },
      description: 'Refresh file tree',
    },
    {
      key: 'n',
      ctrl: true,
      handler: () => {
        setMessages([]);
        setInputValue('');
        toast({
          title: 'New conversation',
          description: 'Started a new conversation',
          variant: 'default',
        });
      },
      description: 'Start new conversation',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  // Get file icon based on type/extension
  const getFileIcon = (node: TreeNode) => {
    if (node.type === 'directory') {
      return expandedFolders.has(node.path) ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />;
    }

    const ext = node.extension?.toLowerCase();
    if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
      return <FileJson className="w-4 h-4" />;
    }
    if (ext === '.md' || ext === '.txt' || ext === '.rst') {
      return <FileText className="w-4 h-4" />;
    }
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileCode className="w-4 h-4" />;
  };

  // Toggle folder expansion
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Toggle file selection
  const toggleFileSelection = (path: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Open file for viewing
  const openFileForViewing = async (path: string) => {
    try {
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        toast({
          title: 'Error loading file',
          description: 'Failed to load file content',
          variant: 'destructive',
        });
        return;
      }
      const data = await response.json();
      setViewingFile({
        path,
        content: data.content,
        language: data.language || 'text',
      });
    } catch (error) {
      console.error('Error loading file:', error);
      toast({
        title: 'Error loading file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Render tree node
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFiles.has(node.path);

    return (
      <div key={node.path}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-[rgba(255,255,255,0.05)] cursor-pointer rounded-md transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleFolder(node.path);
            } else {
              toggleFileSelection(node.path);
            }
          }}
          onDoubleClick={() => {
            if (node.type === 'file') {
              openFileForViewing(node.path);
            }
          }}
          title={node.type === 'file' ? 'Click to select, double-click to view' : 'Click to expand/collapse'}
        >
          {getFileIcon(node)}
          <span className={`text-sm ${isSelected ? 'text-[#FF6B6B]' : 'text-[rgba(255,255,255,0.7)]'}`}>
            {node.name}
          </span>
          {node.type === 'file' && isSelected && (
            <CheckCircle className="w-3 h-3 ml-auto text-[#FF6B6B]" />
          )}
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Handle message send
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    setSystemStatus(prev => ({
      ...prev,
      ai: { ...prev.ai, state: 'thinking' },
    }));

    try {
      const response = await fetch('/api/chat2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          contextFiles: Array.from(selectedFiles),
          conversationHistory: messages,
        }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);

      setSystemStatus(prev => ({
        ...prev,
        ai: { ...prev.ai, state: 'ready' },
        context: {
          ...prev.context,
          tokenUsage: data.contextUsage?.total || 0,
        },
      }));

      toast({
        title: 'Response received',
        description: 'AI has processed your request',
        variant: 'default',
      });

      // Show validation warnings if any
      if (data.validation && !data.validation.valid && data.validation.violations?.length > 0) {
        console.warn('Decision Lock Violations:', data.validation.violations);
        toast({
          title: 'Decision Lock Violation',
          description: `${data.validation.violations.length} rule(s) violated`,
          variant: 'warning',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request.',
        timestamp: new Date(),
      }]);
      setIsLoading(false);

      setSystemStatus(prev => ({
        ...prev,
        ai: { ...prev.ai, state: 'error' },
      }));

      toast({
        title: 'Error sending message',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Get AI status icon
  const getAIStatusIcon = () => {
    switch (systemStatus.ai.state) {
      case 'thinking':
        return <Loader2 className="w-4 h-4 animate-spin text-[#FF6B6B]" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-[#FF6B6B]" />;
      case 'ready':
        return <Bot className="w-4 h-4 text-[#10B981]" />;
      case 'error':
        return <div className="w-4 h-4 rounded-full bg-[#EF4444]" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-[rgba(255,255,255,0.3)]" />;
    }
  };

  // Handle wiki save
  const handleWikiSave = async (content: string, notes: string) => {
    if (!selectedWikiPage) return;

    setIsSavingWiki(true);
    try {
      const response = await fetch(`/api/wiki/default/${selectedWikiPage.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userNotes: notes }),
      });

      if (response.ok) {
        toast({
          title: 'Notes saved',
          description: 'Your wiki notes have been updated',
          variant: 'default',
        });
        setWikiEditMode(false);
        loadWikiPages();
      } else {
        throw new Error('Failed to save wiki notes');
      }
    } catch (error) {
      console.error('Error saving wiki:', error);
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSavingWiki(false);
    }
  };

  // Sort file tree
  const sortFileTree = (nodes: TreeNode[]): TreeNode[] => {
    return [...nodes].sort((a, b) => {
      let comparison = 0;

      switch (fileSortOrder) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          const aExt = a.extension || '';
          const bExt = b.extension || '';
          comparison = aExt.localeCompare(bExt);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
      }

      return fileSortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Handle retry failed message
  const handleRetryMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    if (message.role !== 'user') return;

    // Remove the error message and the original user message
    const messagesBefore = messages.slice(0, messageIndex);
    const messagesAfter = messages.slice(messageIndex + 2); // Skip user and error message
    setMessages([...messagesBefore, ...messagesAfter]);

    // Resend the message
    const originalInputValue = inputValue;
    setInputValue(message.content);
    setTimeout(() => {
      handleSendMessage();
      setInputValue(originalInputValue);
    }, 100);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden ai-control-room">
      {/* Header */}
      <header className="h-14 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between px-4 ai-surface shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-[#FFFFFF]">
            AI Code Chat Assistant
          </h1>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.7)]">
              Indexing: {systemStatus.indexing.state}
            </Badge>
            <Badge variant="outline" className="text-xs border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.7)]">
              Wiki: {systemStatus.wiki.state}
            </Badge>
            <Badge variant="outline" className="text-xs border-[rgba(255,107,107,0.3)] text-[#FF6B6B]">
              Locks: {systemStatus.decisionLocks.hardRules} HARD / {systemStatus.decisionLocks.softRules} SOFT
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* AI Status Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[rgba(255,255,255,0.5)]">AI:</span>
            {getAIStatusIcon()}
            <span className="text-xs text-[rgba(255,255,255,0.5)]">
              {systemStatus.ai.modelTier}
            </span>
          </div>

          {/* Context Health */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[rgba(255,255,255,0.5)]">Context:</span>
            <div
              className={`w-2 h-2 rounded-full ${
                systemStatus.context.state === 'healthy'
                  ? 'bg-[#10B981]'
                  : systemStatus.context.state === 'degraded'
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#EF4444]'
              }`}
            />
            <span className="text-xs text-[rgba(255,255,255,0.5)]">
              {systemStatus.context.tokenUsage}%
            </span>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadFileTree()}
            className="text-[rgba(255,255,255,0.7)] hover:text-white"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAdvancedSearch(true)}
            className="text-[rgba(255,255,255,0.7)] hover:text-white"
            title="Advanced search (Ctrl+F)"
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setPanelMode(prev => prev === '3-panel' ? '4-panel' : '3-panel');
              toast({
                title: 'Layout changed',
                description: `Switched to ${panelMode === '3-panel' ? '4-panel' : '3-panel'} mode`,
                variant: 'default',
              });
            }}
            className="text-[rgba(255,255,255,0.7)] hover:text-white"
            title={`Switch to ${panelMode === '3-panel' ? '4' : '3'} panel mode`}
          >
            <Layers className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-[rgba(255,255,255,0.7)] hover:text-white"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMemoryDialog(true)}
            className="text-[rgba(255,255,255,0.7)] hover:text-white"
            title="Memory management"
          >
            <Layers className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowIndexDialog(true)}
            className="text-[rgba(255,255,255,0.7)] hover:text-white"
            title="Index management"
          >
            <ShieldCheck className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowWikiDialog(true)}
            className="text-[rgba(255,255,255,0.7)] hover:text-white"
            title="Wiki management"
          >
            <BookOpen className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettingsDialog(true)}
            className="text-[rgba(255,255,255,0.7)] hover:text-white"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content - 3/4 Panel Layout */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* File Explorer Panel */}
          <ResizablePanel
            defaultSize={panelMode === '3-panel' ? 20 : 15}
            minSize={10}
            maxSize={40}
            className="ai-surface border-r border-[rgba(255,255,255,0.1)]"
          >
            <div className="h-full flex flex-col">
              {/* File Explorer Header */}
              <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-[#FFFFFF]">File Explorer</h2>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const orders: Array<'name' | 'type' | 'size'> = ['name', 'type', 'size'];
                        const currentIndex = orders.indexOf(fileSortOrder);
                        setFileSortOrder(orders[(currentIndex + 1) % orders.length]);
                      }}
                      className="h-6 w-6 text-[rgba(255,255,255,0.5)] hover:text-white"
                      title={`Sort by: ${fileSortOrder}`}
                    >
                      {fileSortOrder === 'name' && <FileCode className="w-4 h-4" />}
                      {fileSortOrder === 'type' && <FileJson className="w-4 h-4" />}
                      {fileSortOrder === 'size' && <ArrowDown className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFileSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="h-6 w-6 text-[rgba(255,255,255,0.5)] hover:text-white"
                      title={`Sort: ${fileSortDirection}`}
                    >
                      {fileSortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-[rgba(255,255,255,0.5)]">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)]" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-9 pr-3 text-sm bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] rounded-md text-[#FFFFFF] placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(255,107,107,0.3)] transition-colors"
                  />
                </div>
              </div>

              {/* File Tree */}
              <ScrollArea className="flex-1 p-2">
                {fileTree.length > 0 ? (
                  sortFileTree(fileTree).map(node => renderTreeNode(node))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-[rgba(255,255,255,0.5)]">Loading files...</p>
                  </div>
                )}
              </ScrollArea>

              {/* Selected Files Footer */}
              {selectedFiles.size > 0 && (
                <div className="p-4 border-t border-[rgba(255,255,255,0.1)] ai-panel">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[rgba(255,255,255,0.7)]">
                      Selected: {selectedFiles.size} files
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFiles(new Set())}
                      className="text-xs text-[rgba(255,255,255,0.5)] hover:text-[#EF4444]"
                    >
                      Clear
                    </Button>
                  </div>
                  <ScrollArea className="h-24">
                    <div className="space-y-1">
                      {Array.from(selectedFiles).slice(0, 5).map(path => (
                        <div key={path} className="text-xs text-[rgba(255,255,255,0.7)] truncate">
                          {path.split('/').pop()}
                        </div>
                      ))}
                      {selectedFiles.size > 5 && (
                        <div className="text-xs text-[rgba(255,255,255,0.5)]">
                          ...and {selectedFiles.size - 5} more
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-1 hover:bg-[rgba(255,255,255,0.1)]" />

          {/* Chat Interface Panel */}
          <ResizablePanel
            defaultSize={panelMode === '3-panel' ? 50 : 40}
            minSize={30}
            maxSize={70}
          >
            <div className="h-full flex flex-col">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="max-w-4xl mx-auto space-y-6">
                  {messages.length === 0 ? (
                    <div className="text-center py-16">
                      <Bot className="w-16 h-16 mx-auto mb-4 text-[rgba(255,255,255,0.3)]" />
                      <h3 className="text-xl font-semibold text-[#FFFFFF] mb-2">
                        Start chatting with your code
                      </h3>
                      <p className="text-sm text-[rgba(255,255,255,0.5)]">
                        Select files from the explorer and ask me anything about your project
                      </p>
                    </div>
                  ) : (
                    messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <Card
                          className={`max-w-2xl ${
                            message.role === 'user'
                              ? 'bg-[rgba(255,107,107,0.2)] border-[rgba(255,107,107,0.3)]'
                              : 'ai-card border-[rgba(255,255,255,0.1)]'
                          }`}
                        >
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-[rgba(255,255,255,0.7)]">
                                {message.role === 'user' ? 'You' : 'AI Assistant'}
                              </span>
                              <span className="text-xs text-[rgba(255,255,255,0.3)]">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                {message.role === 'user' ? (
                                  <p className="text-sm text-[#FFFFFF] whitespace-pre-wrap">
                                    {message.content}
                                  </p>
                                ) : (
                                  <MarkdownWithHighlight content={message.content} />
                                )}
                              </div>
                              {message.role === 'assistant' && message.content.includes('error') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRetryMessage(message.id)}
                                  className="h-8 w-8 text-[rgba(255,255,255,0.5)] hover:text-[#FF6B6B] shrink-0"
                                  title="Retry last message"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-start">
                      <Card className="ai-card border-[rgba(255,255,255,0.1)]">
                        <div className="p-4 flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-[#FF6B6B]" />
                          <span className="text-sm text-[rgba(255,255,255,0.7)]">
                            Analyzing code and building context...
                          </span>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t border-[rgba(255,255,255,0.1)] ai-surface">
                <div className="max-w-4xl mx-auto">
                  <div className="relative">
                    <Textarea
                      placeholder="Ask about your files..."
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="min-h-[120px] max-h-[300px] pr-14 resize-none bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] text-[#FFFFFF] placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(255,107,107,0.3)] transition-colors"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="absolute right-3 bottom-3 bg-[#FF6B6B] hover:bg-[rgba(255,107,107,0.8)]"
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-[rgba(255,255,255,0.3)]">
                      Press Enter to send, Shift+Enter for new line
                    </span>
                    <span className="text-xs text-[rgba(255,255,255,0.3)]">
                      Context: {selectedFiles.size > 0 ? `${selectedFiles.size} files loaded` : 'No files selected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-1 hover:bg-[rgba(255,255,255,0.1)]" />

          {/* Wiki Panel */}
          <ResizablePanel
            defaultSize={panelMode === '3-panel' ? 30 : 25}
            minSize={20}
            maxSize={40}
            className="ai-surface border-l border-[rgba(255,255,255,0.1)]"
          >
            <div className="h-full flex flex-col">
              {/* Wiki Header */}
              <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Wiki
                  </h2>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[rgba(255,255,255,0.5)]">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                {/* Wiki Status */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      systemStatus.wiki.state === 'synced'
                        ? 'bg-[#10B981]'
                        : systemStatus.wiki.state === 'building'
                        ? 'bg-[#FF6B6B] status-pulse'
                        : 'bg-[rgba(255,255,255,0.3)]'
                    }`}
                  />
                  <span className="text-xs text-[rgba(255,255,255,0.5)]">
                    {systemStatus.wiki.pageCount} pages
                  </span>
                </div>
              </div>

              {/* Wiki Search */}
              <div className="p-3 border-b border-[rgba(255,255,255,0.1)]">
                <input
                  type="text"
                  placeholder="Search wiki..."
                  value={wikiSearchQuery}
                  onChange={e => setWikiSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-sm bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] rounded-md text-[#FFFFFF] placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(255,107,107,0.3)] transition-colors"
                />
              </div>

              {/* Wiki Content */}
              <ScrollArea className="flex-1">
                {selectedWikiPage ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => {
                          setSelectedWikiPage(null);
                          setWikiEditMode(false);
                        }}
                        className="flex items-center gap-2 text-xs text-[#FF6B6B] hover:text-[rgba(255,107,107,0.8)] transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                        <span>Back to pages</span>
                      </button>
                      {!wikiEditMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setWikiEditMode(true);
                            setWikiEditContent(selectedWikiPage.content);
                          }}
                          className="text-xs text-[rgba(255,255,255,0.5)] hover:text-white"
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit Notes
                        </Button>
                      )}
                    </div>
                    {wikiEditMode ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-[rgba(255,255,255,0.9)] mb-2 block">
                            Your Notes
                          </label>
                          <Textarea
                            value={wikiEditContent}
                            onChange={(e) => setWikiEditContent(e.target.value)}
                            placeholder="Add your personal notes..."
                            className="min-h-[300px] resize-none bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] text-[#FFFFFF] placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(255,107,107,0.3)] transition-colors"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleWikiSave(selectedWikiPage.content, wikiEditContent)}
                            disabled={isSavingWiki}
                            className="bg-[#FF6B6B] hover:bg-[rgba(255,107,107,0.8)]"
                          >
                            {isSavingWiki ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Notes'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setWikiEditMode(false);
                              setWikiEditContent('');
                            }}
                            disabled={isSavingWiki}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-2xl font-bold text-[#FFFFFF] mb-4">
                          {selectedWikiPage.title}
                        </h1>
                        <div className="flex items-center gap-2 mb-4">
                          <Badge className="text-xs" variant="outline">
                            {selectedWikiPage.category}
                          </Badge>
                          <span className="text-xs text-[rgba(255,255,255,0.5)]">
                            Updated {new Date(selectedWikiPage.lastUpdated).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="prose prose-invert max-w-none">
                          <MarkdownWithHighlight content={selectedWikiPage.content} />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-4">
                    {wikiPages.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 text-[rgba(255,255,255,0.3)]" />
                        <p className="text-sm text-[rgba(255,255,255,0.5)] mb-2">
                          No wiki pages yet
                        </p>
                        <Button
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/wiki/generate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ projectId: 'default' }),
                              });
                              if (response.ok) {
                                loadWikiPages();
                                toast({
                                  title: 'Wiki generated',
                                  description: 'Wiki pages have been created',
                                  variant: 'default',
                                });
                              }
                            } catch (error) {
                              console.error('Error generating wiki:', error);
                              toast({
                                title: 'Generation failed',
                                description: 'Failed to generate wiki pages',
                                variant: 'destructive',
                              });
                            }
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Generate Wiki
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {wikiPages
                          .filter(page =>
                            page.title.toLowerCase().includes(wikiSearchQuery.toLowerCase()) ||
                            page.content.toLowerCase().includes(wikiSearchQuery.toLowerCase())
                          )
                          .map(page => (
                            <button
                              key={page.id}
                              onClick={() => setSelectedWikiPage(page)}
                              className="w-full text-left p-3 rounded-md bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="text-sm font-semibold text-[#FFFFFF] mb-1">
                                    {page.title}
                                  </h3>
                                  <p className="text-xs text-[rgba(255,255,255,0.5)] line-clamp-2">
                                    {page.content.slice(0, 100)}...
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="text-xs" variant="outline">
                                  {page.category}
                                </Badge>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>

          {/* 4th Panel - Memory/Context (only in 4-panel mode) */}
          {panelMode === '4-panel' && (
            <>
              <ResizableHandle className="w-1 hover:bg-[rgba(255,255,255,0.1)]" />
              <ResizablePanel
                defaultSize={20}
                minSize={15}
                maxSize={35}
                className="ai-surface border-l border-[rgba(255,255,255,0.1)]"
              >
                <div className="h-full flex flex-col">
                  {/* Memory Header */}
                  <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Memory & Context
                      </h2>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${systemStatus.context.state === 'healthy' ? 'bg-[#10B981]' : systemStatus.context.state === 'degraded' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`} />
                        <span className="text-xs text-[rgba(255,255,255,0.5)]">
                          {systemStatus.context.state}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Memory Content */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {/* Token Usage */}
                      <Card className="bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] p-4">
                        <h3 className="text-sm font-semibold text-[#FFFFFF] mb-3 flex items-center gap-2">
                          <Bot className="w-4 h-4 text-[#FF6B6B]" />
                          Token Usage
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[rgba(255,255,255,0.7)]">Context Usage</span>
                            <span className="text-xs text-[#FFFFFF]">{systemStatus.context.tokenUsage}%</span>
                          </div>
                          <div className="w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#10B981] transition-all duration-500"
                              style={{ width: `${systemStatus.context.tokenUsage}%` }}
                            />
                          </div>
                        </div>
                      </Card>

                      {/* Decision Locks */}
                      <Card className="bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] p-4">
                        <h3 className="text-sm font-semibold text-[#FFFFFF] mb-3 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                          Decision Locks
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[rgba(255,255,255,0.7)]">Hard Rules</span>
                            <span className="text-xs text-[#FF6B6B]">{systemStatus.decisionLocks.hardRules}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[rgba(255,255,255,0.7)]">Soft Rules</span>
                            <span className="text-xs text-[#10B981]">{systemStatus.decisionLocks.softRules}</span>
                          </div>
                          {systemStatus.decisionLocks.violations > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-[rgba(255,255,255,0.7)]">Violations</span>
                              <span className="text-xs text-[#EF4444]">{systemStatus.decisionLocks.violations}</span>
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Quick Actions */}
                      <Card className="bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] p-4">
                        <h3 className="text-sm font-semibold text-[#FFFFFF] mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setShowMemoryDialog(true)}
                          >
                            <Layers className="w-4 h-4 mr-2" />
                            Manage Memory
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setShowIndexDialog(true)}
                          >
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Manage Index
                          </Button>
                        </div>
                      </Card>

                      {/* Context Stats */}
                      <Card className="bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] p-4">
                        <h3 className="text-sm font-semibold text-[#FFFFFF] mb-3">Context Stats</h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[rgba(255,255,255,0.7)]">Selected Files</span>
                            <span className="text-[#FFFFFF]">{selectedFiles.size}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[rgba(255,255,255,0.7)]">Messages</span>
                            <span className="text-[#FFFFFF]">{messages.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[rgba(255,255,255,0.7)]">Wiki Pages</span>
                            <span className="text-[#FFFFFF]">{wikiPages.length}</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Advanced Search Overlay */}
      {showAdvancedSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(0,0,0,0.7)]">
          <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.1)] rounded-lg p-6 w-full max-w-4xl mx-auto mt-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#FFFFFF]">Advanced Search</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAdvancedSearch(false)}
                className="h-6 w-6 text-[rgba(255,255,255,0.7)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)]" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-3 bg-[#252530] border border-[rgba(255,255,255,0.1)] rounded-md text-[#FFFFFF] placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(255,107,107,0.3)] transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 text-[rgba(255,255,255,0.9)]">File Types</label>
                <div className="flex flex-wrap gap-2">
                  {['.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.md'].map(ext => (
                    <Button
                      key={ext}
                      variant={searchFilters.fileTypes.includes(ext) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSearchFilters(prev => ({
                        ...prev,
                        fileTypes: prev.fileTypes.includes(ext)
                          ? prev.fileTypes.filter(f => f !== ext)
                          : [...prev.fileTypes, ext],
                      }))}
                      className="text-xs"
                    >
                      {ext}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 text-[rgba(255,255,255,0.9)]">Date Range</label>
                <div className="flex gap-2">
                  {['any', 'today', 'week', 'month'].map(range => (
                    <Button
                      key={range}
                      variant={searchFilters.dateRange === range ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSearchFilters(prev => ({ ...prev, dateRange: range as any }))}
                      className="text-xs"
                    >
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setSearchFilters({ fileTypes: [], languages: [], dateRange: 'any' })}
                  variant="outline"
                  size="sm"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Management Dialogs */}
      <MemoryManagementDialog
        projectId="default"
        open={showMemoryDialog}
        onOpenChange={setShowMemoryDialog}
      />
      <IndexManagementDialog
        projectId="default"
        open={showIndexDialog}
        onOpenChange={setShowIndexDialog}
      />
      <WikiManagementDialog
        projectId="default"
        open={showWikiDialog}
        onOpenChange={setShowWikiDialog}
      />
      <SettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
      />

      {/* File Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.8)]">
          <div className="w-[90vw] h-[90vh] max-w-7xl flex flex-col bg-[#0D1117] rounded-lg shadow-2xl">
            <FileViewer
              filePath={viewingFile.path}
              content={viewingFile.content}
              language={viewingFile.language}
              onClose={() => setViewingFile(null)}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="h-8 border-t border-[rgba(255,255,255,0.1)] bg-[#0D1117] flex items-center justify-between px-4 text-xs shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[rgba(255,255,255,0.5)]">
            Files selected: {selectedFiles.size}
          </span>
          <span className="text-[rgba(255,255,255,0.5)]">
            Wiki pages: {wikiPages.length}
          </span>
          <span className="text-[rgba(255,255,255,0.5)]">
            Mode: {panelMode === '3-panel' ? '3-panel' : '4-panel'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[rgba(255,255,255,0.5)]">
            Press <kbd className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.1)] rounded text-[#FF6B6B]">Ctrl+K</kbd> for shortcuts help
          </span>
          <span className="text-[rgba(255,255,255,0.5)]">
            AI: {systemStatus.ai.state}
          </span>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}
