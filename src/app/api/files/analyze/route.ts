'use server';

import { NextRequest, NextResponse } from 'next/server';
import { ContentExtractor } from '@/lib/code-indexing/ContentExtractor';
import { PatternDetector } from '@/lib/pattern-detection/PatternDetector';
import { IssueTracker } from '@/lib/issue-tracking/IssueTracker';
import { db } from '@/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * POST /api/files/analyze
 * Analyze files and return insights
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files, projectId = 'default', query, rootPath = '.' } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Files array is required' },
        { status: 400 }
      );
    }

    // Check if project exists or create default
    let project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      project = await db.project.create({
        data: {
          id: projectId,
          name: projectId === 'default' ? 'Default Project' : projectId,
          rootPath,
          summary: 'Auto-generated project',
          technologies: '[]',
          architecture: '',
          userInterests: '[]',
        },
      });
    }

    const results: any[] = [];
    const patternDetector = new PatternDetector();
    const issueTracker = new IssueTracker();
    const contentExtractor = new ContentExtractor();

    for (const fileItem of files) {
      const filePath = fileItem.path || fileItem.filePath;
      const content = fileItem.content;

      if (!filePath) {
        continue;
      }

      let fileContent = content;

      // If content not provided, read from file system
      if (!fileContent) {
        try {
          fileContent = readFileSync(join(rootPath, filePath), 'utf-8');
        } catch (error) {
          console.error(`[API /files/analyze] Error reading file: ${filePath}`, error);
          results.push({
            filePath,
            error: 'Failed to read file',
          });
          continue;
        }
      }

      // Extract content information
      const extractionResult = contentExtractor.extract(filePath, fileContent);

      // Detect patterns
      const patterns = patternDetector.detectPatterns(fileContent, filePath);

      // Detect issues
      const issues = issueTracker.detectIssues(fileContent, filePath);

      // Build summary
      const summary = buildSummary(filePath, fileContent, extractionResult, patterns, issues);

      // Store analysis in database
      try {
        await db.fileAnalysis.upsert({
          where: { filePath },
          create: {
            projectId,
            filePath,
            summary: summary.text,
            purpose: summary.purpose,
            keyFunctions: JSON.stringify(extractionResult.functions || []),
            dependencies: JSON.stringify(extractionResult.dependencies || []),
            dependents: JSON.stringify([]),
            patterns: JSON.stringify(patterns || []),
            issues: JSON.stringify(issues || []),
            suggestions: JSON.stringify(summary.suggestions || []),
            complexity: estimateComplexity(fileContent, extractionResult),
            analyzedAt: new Date(),
            lastModifiedAt: new Date(),
            analysisCount: 1,
          },
          update: {
            summary: summary.text,
            purpose: summary.purpose,
            keyFunctions: JSON.stringify(extractionResult.functions || []),
            dependencies: JSON.stringify(extractionResult.dependencies || []),
            patterns: JSON.stringify(patterns || []),
            issues: JSON.stringify(issues || []),
            suggestions: JSON.stringify(summary.suggestions || []),
            complexity: estimateComplexity(fileContent, extractionResult),
            analyzedAt: new Date(),
            analysisCount: { increment: 1 },
          },
        });
      } catch (dbError) {
        console.error(`[API /files/analyze] Error storing analysis for: ${filePath}`, dbError);
      }

      // Build result
      results.push({
        filePath,
        summary: summary.text,
        purpose: summary.purpose,
        findings: [
          {
            type: 'functions',
            count: extractionResult.functions?.length || 0,
            items: extractionResult.functions?.slice(0, 5) || [],
          },
          {
            type: 'dependencies',
            count: extractionResult.dependencies?.length || 0,
            items: extractionResult.dependencies?.slice(0, 5) || [],
          },
          {
            type: 'patterns',
            count: patterns.length,
            items: patterns.slice(0, 5),
          },
          {
            type: 'issues',
            count: issues.length,
            items: issues.slice(0, 5),
          },
        ],
        suggestions: summary.suggestions,
      });

      // Store detected patterns
      for (const pattern of patterns) {
        try {
          await db.codePattern.upsert({
            where: { id: `${projectId}-${pattern.name}-${filePath}` },
            create: {
              id: `${projectId}-${pattern.name}-${filePath}`,
              projectId,
              pattern: pattern.name,
              files: JSON.stringify([filePath]),
              frequency: 1,
              type: pattern.type,
              lastSeen: new Date(),
            },
            update: {
              frequency: { increment: 1 },
              lastSeen: new Date(),
            },
          });
        } catch (patternError) {
          console.error(`[API /files/analyze] Error storing pattern: ${pattern.name}`, patternError);
        }
      }

      // Store detected issues
      for (const issue of issues) {
        try {
          await db.issueMemory.create({
            data: {
              projectId,
              filePath,
              type: issue.type,
              severity: issue.severity,
              description: issue.description,
              location: issue.location,
              status: 'open',
              discoveredAt: new Date(),
              mentionedIn: JSON.stringify([]),
            },
          });
        } catch (issueError) {
          console.error(`[API /files/analyze] Error storing issue: ${issue.type}`, issueError);
        }
      }
    }

    // Build overall summary
    const overallSummary = buildOverallSummary(results, query);

    return NextResponse.json({
      success: true,
      projectId,
      summary: overallSummary,
      results,
    });
  } catch (error) {
    console.error('[API /files/analyze] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Build summary for a single file
 */
function buildSummary(
  filePath: string,
  content: string,
  extraction: any,
  patterns: any[],
  issues: any[]
) {
  const fileName = filePath.split('/').pop() || filePath;
  const extension = fileName.split('.').pop() || '';

  let purpose = `A ${extension} file.`;
  let text = `Analyzed ${fileName}`;

  // Build purpose based on content
  if (extension === 'ts' || extension === 'tsx' || extension === 'js' || extension === 'jsx') {
    if (extraction.classes && extraction.classes.length > 0) {
      purpose = `A TypeScript/JavaScript file containing ${extraction.classes.length} class(es).`;
    } else if (extraction.functions && extraction.functions.length > 0) {
      purpose = `A TypeScript/JavaScript file containing ${extraction.functions.length} function(s).`;
    }
  } else if (extension === 'json') {
    purpose = 'A JSON configuration or data file.';
  } else if (extension === 'md') {
    purpose = 'A Markdown documentation file.';
  }

  // Build summary text
  const details: string[] = [];

  if (extraction.functions && extraction.functions.length > 0) {
    details.push(`${extraction.functions.length} function(s)`);
  }
  if (extraction.dependencies && extraction.dependencies.length > 0) {
    details.push(`${extraction.dependencies.length} import(s)`);
  }
  if (patterns.length > 0) {
    details.push(`${patterns.length} code pattern(s) detected`);
  }
  if (issues.length > 0) {
    details.push(`${issues.length} potential issue(s) found`);
  }

  if (details.length > 0) {
    text += ` with ${details.join(', ')}.`;
  } else {
    text += '.';
  }

  // Build suggestions
  const suggestions: string[] = [];

  if (issues.length > 0) {
    suggestions.push('Review and fix detected issues.');
  }
  if (patterns.length > 0) {
    suggestions.push('Review detected code patterns for consistency.');
  }

  return {
    text,
    purpose,
    suggestions,
  };
}

/**
 * Build overall summary for multiple files
 */
function buildOverallSummary(results: any[], query?: string) {
  const totalFiles = results.length;
  const totalFunctions = results.reduce((sum, r) => {
    const functions = r.findings.find((f: any) => f.type === 'functions');
    return sum + (functions?.count || 0);
  }, 0);
  const totalDependencies = results.reduce((sum, r) => {
    const deps = r.findings.find((f: any) => f.type === 'dependencies');
    return sum + (deps?.count || 0);
  }, 0);
  const totalPatterns = results.reduce((sum, r) => {
    const patterns = r.findings.find((f: any) => f.type === 'patterns');
    return sum + (patterns?.count || 0);
  }, 0);
  const totalIssues = results.reduce((sum, r) => {
    const issues = r.findings.find((f: any) => f.type === 'issues');
    return sum + (issues?.count || 0);
  }, 0);

  const summary: string[] = [`Analyzed ${totalFiles} file(s).`];

  if (totalFunctions > 0) {
    summary.push(`Found ${totalFunctions} function(s).`);
  }
  if (totalDependencies > 0) {
    summary.push(`Found ${totalDependencies} dependencies.`);
  }
  if (totalPatterns > 0) {
    summary.push(`Detected ${totalPatterns} code pattern(s).`);
  }
  if (totalIssues > 0) {
    summary.push(`Found ${totalIssues} potential issue(s).`);
  }

  return summary.join(' ');
}

/**
 * Estimate code complexity
 */
function estimateComplexity(content: string, extraction: any): number {
  const lines = content.split('\n').length;
  const functionCount = extraction.functions?.length || 0;
  const classCount = extraction.classes?.length || 0;

  // Simple complexity estimation based on lines and structure
  let complexity = lines;

  // Add complexity for functions
  complexity += functionCount * 10;

  // Add complexity for classes
  complexity += classCount * 20;

  return complexity;
}
