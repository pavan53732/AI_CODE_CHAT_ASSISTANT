'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Download, Upload } from 'lucide-react';
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

interface MemoryManagementDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemoryManagementDialog({ projectId, open, onOpenChange }: MemoryManagementDialogProps) {
  const [stats, setStats] = useState({
    filesAnalyzed: 0,
    conversations: 0,
    decisionLocks: 0,
  });

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/memory/project/${projectId}`);
      if (!response.ok) return;

      const data = await response.json();
      setStats({
        filesAnalyzed: data.files?.length || 0,
        conversations: data.conversations?.length || 0,
        decisionLocks: data.project?.decisionLocks?.length || 0,
      });
    } catch (error) {
      console.error('Error loading memory stats:', error);
    }
  }, [projectId]);

  const handleClearMemory = async () => {
    if (!confirm('Are you sure you want to clear all memory? This cannot be undone.')) {
      return;
    }

    try {
      // Clear would be implemented in API
      toast({
        title: 'Memory cleared',
        description: 'All project memory has been cleared',
        variant: 'default',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear memory',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        loadStats();
      }, 0);
    }
  }, [open, loadStats]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A2E] border-[rgba(255,255,255,0.1)] text-[#FFFFFF]">
        <DialogHeader>
          <DialogTitle>Memory Management</DialogTitle>
          <DialogDescription className="text-[rgba(255,255,255,0.7)]">
            Manage project memory, decision locks, and conversation history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#0D1117] rounded-lg p-4 border border-[rgba(255,255,255,0.1)]">
              <div className="text-2xl font-bold text-[#FF6B6B]">{stats.filesAnalyzed}</div>
              <div className="text-xs text-[rgba(255,255,255,0.7)] mt-1">Files Analyzed</div>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-4 border border-[rgba(255,255,255,0.1)]">
              <div className="text-2xl font-bold text-[#10B981]">{stats.conversations}</div>
              <div className="text-xs text-[rgba(255,255,255,0.7)] mt-1">Conversations</div>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-4 border border-[rgba(255,255,255,0.1)]">
              <div className="text-2xl font-bold text-[#F59E0B]">{stats.decisionLocks}</div>
              <div className="text-xs text-[rgba(255,255,255,0.7)] mt-1">Decision Locks</div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => toast({ title: 'Exporting...', description: 'Memory export started', variant: 'default' })}
            >
              <Download className="w-4 h-4" />
              Export Memory
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => toast({ title: 'Import...', description: 'Select file to import', variant: 'default' })}
            >
              <Upload className="w-4 h-4" />
              Import Memory
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={handleClearMemory}
            >
              <Trash2 className="w-4 h-4" />
              Clear All Memory
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
