'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, RefreshCw, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface WikiManagementDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WikiManagementDialog({ projectId, open, onOpenChange }: WikiManagementDialogProps) {
  const [wikiPages, setWikiPages] = useState(0);

  const loadWikiStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/wiki/pages?projectId=${projectId}`);
      if (!response.ok) return;

      const data = await response.json();
      setWikiPages(data.pages?.length || 0);
    } catch (error) {
      console.error('Error loading wiki stats:', error);
    }
  }, [projectId]);

  const handleGenerateWiki = async () => {
    try {
      toast({
        title: 'Generating Wiki...',
        description: 'Wiki generation has started',
        variant: 'default',
      });

      const response = await fetch('/api/wiki/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate wiki');
      }

      const data = await response.json();
      toast({
        title: 'Wiki generated',
        description: `Generated ${data.pages?.length || 0} wiki pages`,
        variant: 'default',
      });
      loadWikiStats();
    } catch (error) {
      console.error('Error generating wiki:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate wiki',
        variant: 'destructive',
      });
    }
  };

  const handleClearWiki = async () => {
    if (!confirm('Are you sure you want to clear all wiki pages? This cannot be undone.')) {
      return;
    }

    try {
      toast({
        title: 'Wiki cleared',
        description: 'All wiki pages have been removed',
        variant: 'default',
      });
      setWikiPages(0);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear wiki',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (open) {
      loadWikiStats();
    }
  }, [open, loadWikiStats]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A2E] border-[rgba(255,255,255,0.1)] text-[#FFFFFF]">
        <DialogHeader>
          <DialogTitle>Wiki Management</DialogTitle>
          <DialogDescription className="text-[rgba(255,255,255,0.7)]">
            Manage project wiki and documentation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stats */}
          <div className="bg-[#0D1117] rounded-lg p-4 border border-[rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-4">
              <BookOpen className="w-8 h-8 text-[#10B981]" />
              <div>
                <div className="text-3xl font-bold text-[#FFFFFF]">{wikiPages}</div>
                <div className="text-sm text-[rgba(255,255,255,0.7)]">Wiki Pages</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              className="w-full justify-start gap-2 bg-[#10B981] hover:bg-[#10B981]/90]"
              onClick={handleGenerateWiki}
            >
              <Plus className="w-4 h-4" />
              Generate Wiki
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                loadWikiStats();
                toast({
                  title: 'Refreshing',
                  description: 'Wiki pages reloaded',
                  variant: 'default',
                });
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Wiki
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={handleClearWiki}
            >
              <Trash2 className="w-4 h-4" />
              Clear Wiki
            </Button>
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
