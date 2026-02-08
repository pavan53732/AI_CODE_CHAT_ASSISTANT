'use client';

import { useState, useEffect, useMemo } from 'react';
import { Lightbulb, FileCode, Clock, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
}

interface SmartSuggestionsProps {
  selectedFiles: Set<string>;
  fileTree: FileNode[];
  conversationHistory: { role: string; content: string }[];
  onSelectFile: (path: string) => void;
}

interface Suggestion {
  id: string;
  type: 'related' | 'recent' | 'pattern' | 'context';
  file?: string;
  message: string;
  reason: string;
  confidence: number;
}

export function SmartSuggestions({
  selectedFiles,
  fileTree,
  conversationHistory,
  onSelectFile,
}: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Get all files from file tree
  const allFiles = useMemo(() => {
    const files: FileNode[] = [];
    const traverse = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'file') {
          files.push(node);
        }
        if (node.type === 'directory' && 'children' in node && node.children) {
          traverse(node.children as FileNode[]);
        }
      });
    };
    traverse(fileTree);
    return files;
  }, [fileTree]);

  // Analyze and generate suggestions
  useEffect(() => {
    if (selectedFiles.size === 0 || allFiles.length === 0) {
      setSuggestions([]);
      return;
    }

    setIsAnalyzing(true);

    // Generate suggestions based on selected files and conversation history
    const newSuggestions: Suggestion[] = [];
    const selectedFileArray = Array.from(selectedFiles);

    // 1. Related files based on extensions
    selectedFileArray.forEach(selectedPath => {
      const selectedFile = allFiles.find(f => f.path === selectedPath);
      if (selectedFile?.extension) {
        const relatedFiles = allFiles
          .filter(f => 
            f.extension === selectedFile.extension && 
            f.path !== selectedPath &&
            !selectedFiles.has(f.path)
          )
          .slice(0, 2);

        relatedFiles.forEach(file => {
          newSuggestions.push({
            id: `related-${file.path}`,
            type: 'related',
            file: file.path,
            message: `Also check ${file.name}`,
            reason: `Same file type (${file.extension})`,
            confidence: 0.8,
          });
        });
      }
    });

    // 2. Pattern suggestions based on conversation history
    const recentMessages = conversationHistory.slice(-3);
    const keywords = extractKeywords(recentMessages);

    if (keywords.length > 0) {
      const matchingFiles = allFiles
        .filter(f => 
          !selectedFiles.has(f.path) &&
          keywords.some(keyword => 
            f.name.toLowerCase().includes(keyword.toLowerCase()) ||
            f.path.toLowerCase().includes(keyword.toLowerCase())
          )
        )
        .slice(0, 2);

      matchingFiles.forEach(file => {
        newSuggestions.push({
          id: `pattern-${file.path}`,
          type: 'pattern',
          file: file.path,
          message: `Relevant: ${file.name}`,
          reason: `Matches conversation context`,
          confidence: 0.7,
        });
      });
    }

    // 3. Import/dependency analysis (simulated)
    selectedFileArray.forEach(selectedPath => {
      const baseName = selectedPath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '');
      if (baseName) {
        const testFile = allFiles.find(f => 
          f.path.includes(`${baseName}.test.`) || 
          f.path.includes(`${baseName}.spec.`)
        );
        if (testFile && !selectedFiles.has(testFile.path)) {
          newSuggestions.push({
            id: `test-${testFile.path}`,
            type: 'context',
            file: testFile.path,
            message: `Test file: ${testFile.name}`,
            reason: 'Associated test file',
            confidence: 0.9,
          });
        }
      }
    });

    // Filter out dismissed suggestions and sort by confidence
    const filteredSuggestions = newSuggestions
      .filter(s => !dismissedSuggestions.has(s.id))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4);

    setSuggestions(filteredSuggestions);
    setIsAnalyzing(false);
  }, [selectedFiles, allFiles, conversationHistory, dismissedSuggestions]);

  // Extract keywords from conversation
  function extractKeywords(messages: { role: string; content: string }[]): string[] {
    const keywords = new Set<string>();
    const codeTerms = [
      'component', 'hook', 'api', 'route', 'test', 'style', 'config',
      'database', 'model', 'schema', 'type', 'interface', 'function',
      'class', 'util', 'helper', 'service', 'controller', 'middleware'
    ];

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      codeTerms.forEach(term => {
        if (content.includes(term)) {
          keywords.add(term);
        }
      });

      // Extract file extensions mentioned
      const extMatches = content.match(/\.(ts|tsx|js|jsx|py|json|md|css|scss)/g);
      extMatches?.forEach(ext => keywords.add(ext));
    });

    return Array.from(keywords);
  }

  const handleDismiss = (id: string) => {
    setDismissedSuggestions(prev => new Set([...prev, id]));
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const handleSelectFile = (file: string) => {
    onSelectFile(file);
    toast({
      title: 'File added',
      description: `Added ${file.split('/').pop()} to context`,
      variant: 'default',
    });
  };

  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'related':
        return <FileCode className="w-4 h-4 text-[#10B981]" />;
      case 'pattern':
        return <Sparkles className="w-4 h-4 text-[#F59E0B]" />;
      case 'context':
        return <Lightbulb className="w-4 h-4 text-[#FF6B6B]" />;
      default:
        return <Clock className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />;
    }
  };

  const getSuggestionColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'related':
        return 'border-[#10B981]/30 bg-[#10B981]/10';
      case 'pattern':
        return 'border-[#F59E0B]/30 bg-[#F59E0B]/10';
      case 'context':
        return 'border-[#FF6B6B]/30 bg-[#FF6B6B]/10';
      default:
        return 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]';
    }
  };

  if (suggestions.length === 0 && !isAnalyzing) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
        <span className="text-xs font-medium text-[rgba(255,255,255,0.7)]">
          Smart Suggestions
        </span>
        {isAnalyzing && (
          <span className="text-xs text-[rgba(255,255,255,0.5)] animate-pulse">
            Analyzing...
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map(suggestion => (
          <Card
            key={suggestion.id}
            className={`relative group flex items-center gap-2 px-3 py-2 border ${getSuggestionColor(suggestion.type)} hover:opacity-80 transition-opacity cursor-pointer`}
            onClick={() => suggestion.file && handleSelectFile(suggestion.file)}
          >
            {getSuggestionIcon(suggestion.type)}
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[#FFFFFF]">
                {suggestion.message}
              </span>
              <span className="text-[10px] text-[rgba(255,255,255,0.5)]">
                {suggestion.reason}
              </span>
            </div>
            <Badge variant="outline" className="ml-2 text-[10px] border-[rgba(255,255,255,0.2)]">
              {Math.round(suggestion.confidence * 100)}%
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(suggestion.id);
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
