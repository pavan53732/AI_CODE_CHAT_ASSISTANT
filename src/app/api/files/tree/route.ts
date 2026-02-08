'use server';

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/files/tree
 * Get file tree for a directory
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path') || '';

    // Root path (default to current working directory)
    const rootPath = process.env.PROJECT_ROOT_PATH || process.cwd();

    // Resolve full path and prevent directory traversal
    const fullPath = path.resolve(rootPath, relativePath);
    if (!fullPath.startsWith(rootPath)) {
      return NextResponse.json(
        { error: 'Access denied: path outside project root' },
        { status: 403 }
      );
    }

    // Check if path exists and is a directory
    try {
      const stats = fs.statSync(fullPath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: 'Not a directory' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Directory not found' },
        { status: 404 }
      );
    }

    // Build file tree
    const tree = buildFileTree(fullPath, rootPath);

    return NextResponse.json(tree);
  } catch (error) {
    console.error('[API /files/tree] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get file tree' },
      { status: 500 }
    );
  }
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  size?: number;
  extension?: string;
}

function buildFileTree(dirPath: string, rootPath: string): TreeNode[] {
  const tree: TreeNode[] = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      // Skip hidden files and common ignore patterns
      if (entry.name.startsWith('.') || shouldIgnore(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        tree.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children: buildFileTree(fullPath, rootPath),
        });
      } else if (entry.isFile()) {
        const stats = fs.statSync(fullPath);
        const ext = path.extname(entry.name);
        tree.push({
          name: entry.name,
          path: relativePath,
          type: 'file',
          size: stats.size,
          extension: ext || undefined,
        });
      }
    }

    // Sort: directories first, then alphabetically
    return tree.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('[buildFileTree] Error:', error);
    return [];
  }
}

function shouldIgnore(name: string): boolean {
  const ignorePatterns = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '.vscode',
    '.idea',
    'coverage',
    '*.log',
    '*.tmp',
  ];

  return ignorePatterns.some(pattern => {
    if (pattern.includes('*')) {
      const ext = pattern.replace('*', '');
      return name.endsWith(ext);
    }
    return name === pattern;
  });
}
