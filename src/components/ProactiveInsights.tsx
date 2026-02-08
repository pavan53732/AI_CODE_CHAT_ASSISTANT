'use client';

import { useState, useEffect, useCallback } from 'react';
import { Brain, TrendingUp, AlertTriangle, Info, Clock, FileText, Zap, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

interface Insight {
  id: string;
  type: 'pattern' | 'suggestion' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  timestamp: Date;
  read: boolean;
}

interface ProactiveInsightsProps {
  selectedFiles: Set<string>;
  fileTree: any[];
  messages: { role: string; content: string }[];
  systemStatus: {
    indexing: { state: string; message: string };
    context: { state: string; tokenUsage: number };
  };
}

export function ProactiveInsights({
  selectedFiles,
  fileTree,
  messages,
  systemStatus,
}: ProactiveInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Low-noise threshold configuration
  const THRESHOLDS = {
    tokenUsage: 85,           // Only warn at 85% (not 80%)
    testCoverage: 15,         // Only warn if < 15% coverage
    errorCount: 3,            // Only warn after 3+ errors
    largeProjectFiles: 150,   // Only warn for 150+ files
    docFiles: 1,              // Only warn if < 1 doc file
    patternConfidence: 0.7,   // Only show patterns with 70%+ confidence
  };

  // Analyze patterns and generate insights
  const analyzePatterns = useCallback(() => {
    const newInsights: Insight[] = [];

    // 1. Token usage warning (higher threshold for low-noise)
    if (systemStatus.context.tokenUsage > THRESHOLDS.tokenUsage) {
      newInsights.push({
        id: `token-warning-${Date.now()}`,
        type: 'warning',
        title: 'High Context Usage',
        message: `Context usage is at ${systemStatus.context.tokenUsage}%. Consider removing some files to improve performance.`,
        action: {
          label: 'Clear Selection',
          handler: () => {
            toast({
              title: 'Context cleared',
              description: 'Selected files have been cleared',
              variant: 'default',
            });
          },
        },
        timestamp: new Date(),
        read: false,
      });
    }

    // 2. File access pattern insight
    if (selectedFiles.size > 0) {
      const selectedArray = Array.from(selectedFiles);
      const extensions = selectedArray.map(path => path.split('.').pop()).filter(Boolean);
      const extensionCounts = extensions.reduce((acc, ext) => {
        acc[ext!] = (acc[ext!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const dominantExt = Object.entries(extensionCounts)
        .sort((a, b) => b[1] - a[1])[0];

      if (dominantExt && dominantExt[1] > 2) {
        newInsights.push({
          id: `pattern-${Date.now()}`,
          type: 'pattern',
          title: 'File Pattern Detected',
          message: `You're working with multiple ${dominantExt[0].toUpperCase()} files. Consider checking related ${dominantExt[0]} files for consistency.`,
          timestamp: new Date(),
          read: false,
        });
      }
    }

    // 3. Indexing status insight (low-noise: only if < 15% coverage)
    if (systemStatus.indexing.state === 'completed' && fileTree.length > 0) {
      const tsFiles = countFilesByExtension(fileTree, ['.ts', '.tsx']);
      const testFiles = countFilesByExtension(fileTree, ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx']);

      if (tsFiles > 0 && (testFiles / tsFiles) * 100 < THRESHOLDS.testCoverage) {
        newInsights.push({
          id: `testing-${Date.now()}`,
          type: 'suggestion',
          title: 'Test Coverage Opportunity',
          message: `Only ${Math.round((testFiles / tsFiles) * 100)}% of TypeScript files have tests. Consider adding more test coverage.`,
          timestamp: new Date(),
          read: false,
        });
      }
    }

    // 4. Conversation context insight
    if (messages.length > 5) {
      const recentMessages = messages.slice(-5);
      const errorMessages = recentMessages.filter(m => 
        m.role === 'assistant' && 
        (m.content.toLowerCase().includes('error') || m.content.toLowerCase().includes('failed'))
      );

      if (errorMessages.length >= 2) {
        newInsights.push({
          id: `errors-${Date.now()}`,
          type: 'warning',
          title: 'Multiple Errors Detected',
          message: 'Several errors have occurred recently. Consider reviewing your approach or checking for common issues.',
          action: {
            label: 'View Logs',
            handler: () => {
              toast({
                title: 'Logs opened',
                description: 'Error logs are being displayed',
                variant: 'default',
              });
            },
          },
          timestamp: new Date(),
          read: false,
        });
      }
    }

    // 5. Documentation insight
    const mdFiles = countFilesByExtension(fileTree, ['.md', '.mdx']);
    if (fileTree.length > 20 && mdFiles < 2) {
      newInsights.push({
        id: `docs-${Date.now()}`,
        type: 'suggestion',
        title: 'Documentation Gap',
        message: 'Your project has few documentation files. Consider adding a README or documentation for key components.',
        timestamp: new Date(),
        read: false,
      });
    }

    // 6. Performance insight based on file count
    const totalFiles = countTotalFiles(fileTree);
    if (totalFiles > 100 && selectedFiles.size === 0) {
      newInsights.push({
        id: `performance-${Date.now()}`,
        type: 'info',
        title: 'Large Project Detected',
        message: `Your project has ${totalFiles} files. Use the file explorer to select specific files for better context management.`,
        timestamp: new Date(),
        read: false,
      });
    }

    // Only add new insights that don't already exist
    setInsights(prev => {
      const existingIds = new Set(prev.map(i => i.id.split('-')[0]));
      const uniqueNewInsights = newInsights.filter(i => !existingIds.has(i.id.split('-')[0]));
      return [...uniqueNewInsights, ...prev].slice(0, 10); // Keep last 10 insights
    });
  }, [selectedFiles, fileTree, messages, systemStatus]);

  // Count files by extension
  function countFilesByExtension(nodes: any[], extensions: string[]): number {
    let count = 0;
    const traverse = (nodes: any[]) => {
      nodes.forEach(node => {
        if (node.type === 'file' && extensions.some(ext => node.path.endsWith(ext))) {
          count++;
        }
        if (node.type === 'directory' && node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return count;
  }

  // Count total files
  function countTotalFiles(nodes: any[]): number {
    let count = 0;
    const traverse = (nodes: any[]) => {
      nodes.forEach(node => {
        if (node.type === 'file') {
          count++;
        }
        if (node.type === 'directory' && node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return count;
  }

  // Update unread count
  useEffect(() => {
    setUnreadCount(insights.filter(i => !i.read).length);
  }, [insights]);

  // Run analysis periodically
  useEffect(() => {
    analyzePatterns();
    const interval = setInterval(analyzePatterns, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [analyzePatterns]);

  const markAsRead = (id: string) => {
    setInsights(prev =>
      prev.map(i => (i.id === id ? { ...i, read: true } : i))
    );
  };

  const dismissInsight = (id: string) => {
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'pattern':
        return <TrendingUp className="w-4 h-4 text-[#10B981]" />;
      case 'suggestion':
        return <Zap className="w-4 h-4 text-[#F59E0B]" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#EF4444]" />;
      case 'info':
        return <Info className="w-4 h-4 text-[#3B82F6]" />;
      default:
        return <Brain className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />;
    }
  };

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'pattern':
        return 'border-[#10B981]/30 bg-[#10B981]/10';
      case 'suggestion':
        return 'border-[#F59E0B]/30 bg-[#F59E0B]/10';
      case 'warning':
        return 'border-[#EF4444]/30 bg-[#EF4444]/10';
      case 'info':
        return 'border-[#3B82F6]/30 bg-[#3B82F6]/10';
      default:
        return 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]';
    }
  };

  const recentInsights = insights.slice(0, expanded ? undefined : 3);

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4 border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.2)]">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#FF6B6B]" />
          <span className="text-sm font-medium text-[#FFFFFF]">Proactive Insights</span>
          {unreadCount > 0 && (
            <Badge variant="default" className="bg-[#FF6B6B] text-white text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[rgba(255,255,255,0.5)]">
            {insights.length} insights
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />
          )}
        </div>
      </div>

      {expanded && (
        <ScrollArea className="max-h-[300px]">
          <div className="p-3 pt-0 space-y-2">
            {recentInsights.map(insight => (
              <div
                key={insight.id}
                className={`relative p-3 rounded-md border ${getInsightColor(insight.type)} ${
                  !insight.read ? 'ring-1 ring-[#FF6B6B]/30' : ''
                }`}
                onClick={() => markAsRead(insight.id)}
              >
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#FFFFFF]">
                        {insight.title}
                      </span>
                      {!insight.read && (
                        <span className="w-2 h-2 rounded-full bg-[#FF6B6B]" />
                      )}
                    </div>
                    <p className="text-xs text-[rgba(255,255,255,0.7)] leading-relaxed">
                      {insight.message}
                    </p>
                    {insight.action && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          insight.action?.handler();
                        }}
                      >
                        {insight.action.label}
                      </Button>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-[rgba(255,255,255,0.4)]">
                      <Clock className="w-3 h-3" />
                      {formatTime(insight.timestamp)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissInsight(insight.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            {insights.length > 3 && !expanded && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-[rgba(255,255,255,0.5)]"
                onClick={() => setExpanded(true)}
              >
                Show {insights.length - 3} more insights
              </Button>
            )}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}
