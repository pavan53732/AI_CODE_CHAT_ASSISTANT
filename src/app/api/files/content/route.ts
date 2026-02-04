'use server';

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/files/content
 * Get file content
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path');

    if (!relativePath) {
      return NextResponse.json(
        { error: 'Missing required parameter: path' },
        { status: 400 }
      );
    }

    // Root path (default to current project)
    const rootPath = process.env.PROJECT_ROOT_PATH || '/home/z/my-project';

    // Resolve full path and prevent directory traversal
    const fullPath = path.resolve(rootPath, relativePath);
    if (!fullPath.startsWith(rootPath)) {
      return NextResponse.json(
        { error: 'Access denied: path outside project root' },
        { status: 403 }
      );
    }

    // Check if path exists and is a file
    try {
      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'Not a file' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Read file content
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Determine encoding
    const ext = path.extname(relativePath);
    const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip'].includes(ext);

    return NextResponse.json({
      path: relativePath,
      content: isBinary ? '[Binary file - content not displayed]' : content,
      size: stats.size,
      encoding: isBinary ? 'binary' : 'utf-8',
    });
  } catch (error) {
    console.error('[API /files/content] Error:', error);
    return NextResponse.json(
      { error: 'Failed to read file content' },
      { status: 500 }
    );
  }
}
