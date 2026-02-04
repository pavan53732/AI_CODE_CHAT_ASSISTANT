'use client';

import { useState, useEffect } from 'react';
import { X, Keyboard, Type, Palette, Database, Save, Settings as SettingsIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface KeyboardShortcut {
  key: string;
  ctrl: boolean;
  shift: boolean;
  action: string;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = useState({
    rootPath: process.env.PROJECT_ROOT_PATH || '/home/z/my-project',
    theme: 'dark' as 'auto' | 'light' | 'dark',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    memoryRetentionDays: 90,
    autoIndex: true,
  });

  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([
    { key: 'k', ctrl: true, shift: false, action: 'Toggle panels' },
    { key: 'f', ctrl: true, shift: false, action: 'Advanced search' },
    { key: 'n', ctrl: true, shift: false, action: 'New conversation' },
    { key: 'r', ctrl: true, shift: false, action: 'Refresh file tree' },
    { key: 'Escape', ctrl: false, shift: false, action: 'Close dialogs' },
  ]);

  const handleSaveSettings = () => {
    toast({
      title: 'Settings saved',
      description: 'Your settings have been saved',
      variant: 'default',
    });
    onOpenChange(false);
  };

  const handleResetSettings = () => {
    setSettings({
      rootPath: process.env.PROJECT_ROOT_PATH || '/home/z/my-project',
      theme: 'dark',
      fontSize: 'medium',
      memoryRetentionDays: 90,
      autoIndex: true,
    });
    toast({
      title: 'Settings reset',
      description: 'Settings have been reset to defaults',
      variant: 'default',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A2E] border-[rgba(255,255,255,0.1)] text-[#FFFFFF] max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="border-b border-[rgba(255,255,255,0.1)] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#FF6B6B]" />
              <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 text-[rgba(255,255,255,0.7)] hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* General Settings */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-[#FF6B6B]" />
              <h3 className="text-sm font-semibold text-[#FFFFFF]">General</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[rgba(255,255,255,0.7)] mb-2 block">Theme</label>
                <div className="flex gap-2">
                  {(['auto', 'light', 'dark'] as const).map(themeOption => (
                    <Button
                      key={themeOption}
                      variant={settings.theme === themeOption ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, theme: themeOption }))}
                    >
                      {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[rgba(255,255,255,0.7)] mb-2 block">Font Size</label>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map(size => (
                    <Button
                      key={size}
                      variant={settings.fontSize === size ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, fontSize: size }))}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Separator className="bg-[rgba(255,255,255,0.1)]" />

          {/* Project Settings */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-[#FF6B6B]" />
              <h3 className="text-sm font-semibold text-[#FFFFFF]">Project</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[rgba(255,255,255,0.7)] mb-2 block">Root Path</label>
                <input
                  type="text"
                  value={settings.rootPath}
                  onChange={e => setSettings(prev => ({ ...prev, rootPath: e.target.value }))}
                  className="w-full h-9 px-3 text-sm bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] rounded-md text-[#FFFFFF] focus:outline-none focus:border-[rgba(255,107,107,0.3)]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoIndex"
                    checked={settings.autoIndex}
                    onChange={e => setSettings(prev => ({ ...prev, autoIndex: e.target.checked }))}
                    className="w-4 h-4 rounded border-[rgba(255,255,255,0.3)] bg-transparent cursor-pointer"
                  />
                  <label htmlFor="autoIndex" className="text-sm text-[rgba(255,255,255,0.85)]">
                    Auto-index on startup
                  </label>
                </div>
                <Badge variant="outline" className="text-xs border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.7)]">
                  {settings.autoIndex ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div>
                <label className="text-xs text-[rgba(255,255,255,0.7)] mb-2 block">
                  Memory Retention: {settings.memoryRetentionDays} days
                </label>
                <input
                  type="range"
                  min="7"
                  max="365"
                  value={settings.memoryRetentionDays}
                  onChange={e => setSettings(prev => ({ ...prev, memoryRetentionDays: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>
          </section>

          <Separator className="bg-[rgba(255,255,255,0.1)]" />

          {/* Keyboard Shortcuts */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="w-4 h-4 text-[#FF6B6B]" />
              <h3 className="text-sm font-semibold text-[#FFFFFF]">Keyboard Shortcuts</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-[rgba(255,255,255,0.05)] rounded-md"
                >
                  <span className="text-sm text-[rgba(255,255,255,0.85)]">{shortcut.action}</span>
                  <Badge className="text-xs" variant="outline">
                    {shortcut.ctrl && 'Ctrl+'}
                    {shortcut.shift && 'Shift+'}
                    {shortcut.key}
                  </Badge>
                </div>
              ))}
            </div>
          </section>

          <Separator className="bg-[rgba(255,255,255,0.1)]" />

          {/* Memory Settings */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-[#FF6B6B]" />
              <h3 className="text-sm font-semibold text-[#FFFFFF]">Memory Management</h3>
            </div>
            <div className="p-4 bg-[rgba(255,255,255,0.05)] rounded-md space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[rgba(255,255,255,0.85)]">Indexed files</span>
                <Badge variant="outline" className="text-xs">0</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[rgba(255,255,255,0.85)]">Code patterns found</span>
                <Badge variant="outline" className="text-xs">0</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[rgba(255,255,255,0.85)]">Conversations stored</span>
                <Badge variant="outline" className="text-xs">0</Badge>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-[rgba(255,255,255,0.1)] pt-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetSettings}
              className="text-[rgba(255,255,255,0.7)] hover:text-white"
            >
              Reset to Defaults
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSettings}
                className="bg-[#FF6B6B] hover:bg-[rgba(255,107,107,0.8)]"
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
