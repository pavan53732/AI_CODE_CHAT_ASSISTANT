'use client';

import { X, Copy, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface FileViewerProps {
  filePath: string;
  content: string;
  language: string;
  onClose: () => void;
}

export function FileViewer({ filePath, content, language, onClose }: FileViewerProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied to clipboard',
      description: 'File content has been copied',
      variant: 'default',
    });
  };

  const getFileExtension = (path: string) => {
    const match = path.match(/\.([^.]+)$/);
    return match ? match[1] : 'txt';
  };

  return (
    <div className="h-full flex flex-col bg-[#0D1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.1)] bg-[#0D1117]">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileCode className="w-4 h-4 text-[#FF6B6B] flex-shrink-0" />
          <span className="text-sm text-[#FFFFFF] truncate font-mono">
            {filePath.split('/').pop()}
          </span>
          <span className="text-xs text-[rgba(255,255,255,0.5)] ml-2 flex-shrink-0">
            {getFileExtension(filePath).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-7 w-7 text-[rgba(255,255,255,0.7)] hover:text-white"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-[rgba(255,255,255,0.7)] hover:text-white"
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <Card className="bg-[#161B22] border border-[rgba(255,255,255,0.1)]">
            <pre className="p-4 text-sm font-mono text-[rgba(255,255,255,0.9)] whitespace-pre-wrap overflow-x-auto">
              <code>{content || '// No content available'}</code>
            </pre>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
