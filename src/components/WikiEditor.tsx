'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Save, X, Loader2 } from 'lucide-react';

interface WikiEditorProps {
  projectId: string;
  wikiPage: {
    id: string;
    title: string;
    slug: string;
    content: string;
    userNotes: string;
  };
  onSave: (updatedContent: string, updatedNotes: string) => Promise<void>;
  onCancel: () => void;
}

export function WikiEditor({ projectId, wikiPage, onSave, onCancel }: WikiEditorProps) {
  const [content, setContent] = useState(wikiPage.content);
  const [notes, setNotes] = useState(wikiPage.userNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(
      content !== wikiPage.content || notes !== (wikiPage.userNotes || '')
    );
  }, [content, notes, wikiPage]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content, notes);
    } catch (error) {
      console.error('Error saving wiki page:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="h-full flex flex-col bg-[#0D1117] border-[rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.1)]">
        <h3 className="text-lg font-semibold text-[#FFFFFF]">
          Edit: {wikiPage.title}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-8 w-8 text-[rgba(255,255,255,0.7)] hover:text-white"
            disabled={isSaving}
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-[#FF6B6B] hover:bg-[rgba(255,107,107,0.8)]"
            size="sm"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content Editor */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <label className="text-sm font-semibold text-[rgba(255,255,255,0.9)] mb-2">
            Content (Markdown)
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Edit wiki content in Markdown..."
            className="flex-1 min-h-[300px] resize-none bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] text-[#FFFFFF] placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(255,107,107,0.3)] transition-colors"
          />
        </div>

        <div className="flex-1 flex flex-col">
          <label className="text-sm font-semibold text-[rgba(255,255,255,0.9)] mb-2">
            Your Notes (Personal annotations)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your personal notes here..."
            className="flex-1 min-h-[150px] resize-none bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] text-[#FFFFFF] placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(255,107,107,0.3)] transition-colors"
          />
        </div>
      </div>
    </Card>
  );
}
