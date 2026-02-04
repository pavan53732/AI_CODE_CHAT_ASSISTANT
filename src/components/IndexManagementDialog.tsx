'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Play, Square, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface IndexManagementDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IndexManagementDialog({ projectId, open, onOpenChange }: IndexManagementDialogProps) {
  const [indexState, setIndexState] = useState<'idle' | 'indexing' | 'completed'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleStartIndexing = async () => {
    try {
      setIndexState('indexing');
      setProgress(0);
      setMessage('Starting indexing...');

      const response = await fetch('/api/indexing/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start indexing');
      }

      toast({
        title: 'Indexing started',
        description: 'File indexing has begun',
        variant: 'default',
      });

      // Simulate progress (in real app, this would be from WebSocket or polling)
      let simProgress = 0;
      const interval = setInterval(() => {
        simProgress += 10;
        setProgress(simProgress);
        setMessage(`Scanning files... ${simProgress}%`);

        if (simProgress >= 100) {
          clearInterval(interval);
          setIndexState('completed');
          setMessage('Indexing completed successfully');
          toast({
            title: 'Indexing complete',
            description: 'All files have been indexed',
            variant: 'default',
          });
        }
      }, 500);
    } catch (error) {
      console.error('Error starting indexing:', error);
      setIndexState('idle');
      toast({
        title: 'Error',
        description: 'Failed to start indexing',
        variant: 'destructive',
      });
    }
  };

  const handleStopIndexing = () => {
    setIndexState('idle');
    setProgress(0);
    setMessage('Indexing stopped');
    toast({
      title: 'Indexing stopped',
      description: 'Indexing process has been stopped',
      variant: 'default',
    });
  };

  const handleRebuildIndex = () => {
    toast({
      title: 'Rebuilding index',
      description: 'Index will be rebuilt from scratch',
      variant: 'default',
    });
    handleStartIndexing();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A2E] border-[rgba(255,255,255,0.1)] text-[#FFFFFF]">
        <DialogHeader>
          <DialogTitle>Code Index Management</DialogTitle>
          <DialogDescription className="text-[rgba(255,255,255,0.7)]">
            Manage code indexing and search capabilities
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Card */}
          <div className="bg-[#0D1117] rounded-lg p-4 border border-[rgba(255,255,255,0.1)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#FF6B6B]" />
                <span className="text-sm font-semibold">Index Status</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                indexState === 'idle' ? 'bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.7)]' :
                indexState === 'indexing' ? 'bg-[#FF6B6B]/20 text-[#FF6B6B]' :
                'bg-[#10B981]/20 text-[#10B981]'
              }`}>
                {indexState.toUpperCase()}
              </span>
            </div>
            {indexState === 'indexing' && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-[rgba(255,255,255,0.7)]">{message}</p>
              </div>
            )}
            {indexState !== 'indexing' && (
              <p className="text-xs text-[rgba(255,255,255,0.7)]">{message || 'Index is ready'}</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {indexState === 'idle' && (
              <Button
                className="w-full justify-start gap-2 bg-[#10B981] hover:bg-[#10B981]/90]"
                onClick={handleStartIndexing}
              >
                <Play className="w-4 h-4" />
                Start Indexing
              </Button>
            )}
            {indexState === 'indexing' && (
              <Button
                variant="destructive"
                className="w-full justify-start gap-2"
                onClick={handleStopIndexing}
              >
                <Square className="w-4 h-4" />
                Stop Indexing
              </Button>
            )}
            {indexState === 'completed' && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleStartIndexing}
                >
                  <Play className="w-4 h-4" />
                  Resume Indexing
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleRebuildIndex}
                >
                  <RefreshCw className="w-4 h-4" />
                  Rebuild Index
                </Button>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
