'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/settings
 * Get current settings
 */
export async function GET(request: NextRequest) {
  try {
    // Get settings from environment or database
    const settings = {
      rootPath: process.env.PROJECT_ROOT_PATH || process.cwd(),
      theme: 'dark',
      autoIndex: true,
      memoryRetentionDays: 90,
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[API /settings] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Update settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rootPath, theme, autoIndex, memoryRetentionDays } = body;

    // Validate rootPath if provided
    if (rootPath) {
      const fs = await import('fs');
      const path = await import('path');
      
      try {
        const resolvedPath = path.resolve(rootPath);
        const stats = fs.statSync(resolvedPath);
        if (!stats.isDirectory()) {
          return NextResponse.json(
            { error: 'Invalid path: not a directory' },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid path: directory does not exist' },
          { status: 400 }
        );
      }

      // In production, you'd save this to a database or config file
      // For now, we'll return the updated settings
      console.log(`[Settings] Updated rootPath to: ${rootPath}`);
    }

    const updatedSettings = {
      rootPath: rootPath || process.env.PROJECT_ROOT_PATH || process.cwd(),
      theme: theme || 'dark',
      autoIndex: autoIndex !== undefined ? autoIndex : true,
      memoryRetentionDays: memoryRetentionDays || 90,
    };

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('[API /settings] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
