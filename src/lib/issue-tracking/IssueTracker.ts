import { ExtractedContent } from '../code-indexing/ContentExtractor';
import { DependencyGraph } from '../code-indexing/DependencyAnalyzer';
import { db } from '@/lib/db';

export interface IssueTrackingOptions {
  projectId: string;
  autoDetect?: boolean;
  onProgress?: (progress: IssueTrackingProgress) => void;
}

export interface IssueTrackingProgress {
  filesAnalyzed: number;
  totalFiles: number;
  issuesFound: number;
  currentFile?: string;
  message: string;
}

export type IssueType =
  | 'bug'
  | 'security'
  | 'performance'
  | 'code-quality'
  | 'architecture'
  | 'documentation'
  | 'dependency'
  | 'error-handling';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DetectedIssue {
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  location: string;
  suggestedFix: string;
  relatedFiles?: string[];
}

/**
 * IssueTracker - Detects and tracks code issues
 */
export class IssueTracker {
  private options: IssueTrackingOptions;
  private issues: DetectedIssue[];

  constructor(options: IssueTrackingOptions) {
    this.options = {
      autoDetect: options.autoDetect ?? true,
      ...options,
    };
    this.issues = [];
  }

  /**
   * Run issue detection
   */
  async track(
    extractedContents: ExtractedContent[],
    dependencyGraph?: DependencyGraph
  ): Promise<DetectedIssue[]> {
    const totalFiles = extractedContents.length;
    const { projectId } = this.options;

    this.options.onProgress?.({
      filesAnalyzed: 0,
      totalFiles,
      issuesFound: 0,
      message: 'Starting issue detection',
    });

    this.issues = [];

    // Analyze each file for issues
    for (let i = 0; i < extractedContents.length; i++) {
      const content = extractedContents[i];
      const fileIssues = this.detectIssuesInFile(content);

      this.issues.push(...fileIssues);

      this.options.onProgress?.({
        filesAnalyzed: i + 1,
        totalFiles,
        issuesFound: this.issues.length,
        currentFile: content.metadata.path,
        message: `Analyzed ${i + 1}/${totalFiles} files`,
      });
    }

    // Detect dependency issues
    if (dependencyGraph) {
      this.issues.push(...this.detectDependencyIssues(dependencyGraph));
    }

    // Save issues to database
    await this.saveIssues(projectId);

    this.options.onProgress?.({
      filesAnalyzed: totalFiles,
      totalFiles,
      issuesFound: this.issues.length,
      message: `Issue tracking complete: ${this.issues.length} issues found`,
    });

    console.log('[IssueTracker] Tracking complete:', {
      total: this.issues.length,
      byType: this.groupIssuesByType(this.issues),
      bySeverity: this.groupIssuesBySeverity(this.issues),
    });

    return this.issues;
  }

  /**
   * Detect issues in a single file
   */
  private detectIssuesInFile(content: ExtractedContent): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    const filePath = content.metadata.path;

    // Detect complexity issues
    if (content.structure?.complexity && content.structure.complexity > 20) {
      issues.push({
        type: 'code-quality',
        severity: this.getComplexitySeverity(content.structure.complexity),
        title: 'High cyclomatic complexity',
        description: `File has a cyclomatic complexity of ${content.structure.complexity}, which is above the recommended threshold of 20.`,
        location: filePath,
        suggestedFix: 'Consider breaking down the file into smaller, more focused functions or modules.',
      });
    }

    // Detect large files
    if (content.lineCount > 500) {
      issues.push({
        type: 'code-quality',
        severity: 'medium',
        title: 'Large file detected',
        description: `File has ${content.lineCount} lines, which is above the recommended limit of 500 lines.`,
        location: filePath,
        suggestedFix: 'Consider splitting the file into smaller, more focused modules.',
      });
    }

    // Detect missing error handling in async functions
    const asyncFunctions = content.functions?.filter(f => f.isAsync) || [];
    const asyncWithoutErrorHandling = asyncFunctions.filter(func => {
      const funcIndex = content.content.indexOf(func.name);
      // Simple heuristic: check if there's a try-catch in the file
      return !content.content.includes('try') || !content.content.includes('catch');
    });

    if (asyncWithoutErrorHandling.length > 0) {
      issues.push({
        type: 'error-handling',
        severity: 'medium',
        title: 'Missing error handling in async functions',
        description: `Found ${asyncWithoutErrorHandling.length} async functions without error handling.`,
        location: filePath,
        suggestedFix: 'Add try-catch blocks or error handling logic to async functions.',
      });
    }

    // Detect TODO/FIXME comments
    const todoMatches = content.content.match(/TODO|FIXME|HACK|XXX/gi) || [];
    if (todoMatches.length > 0) {
      issues.push({
        type: 'documentation',
        severity: 'low',
        title: 'Pending work items detected',
        description: `Found ${todoMatches.length} TODO/FIXME comments in the file.`,
        location: filePath,
        suggestedFix: 'Address the pending work items or create proper issues in your issue tracker.',
      });
    }

    // Detect console.log statements (potential security/debugging code left in)
    const consoleLogs = (content.content.match(/console\.(log|debug|warn|error)\(/g) || []).length;
    if (consoleLogs > 5) {
      issues.push({
        type: 'code-quality',
        severity: 'low',
        title: 'Excessive console statements',
        description: `Found ${consoleLogs} console.log/debug/warn/error statements in the file.`,
        location: filePath,
        suggestedFix: 'Remove or replace console statements with proper logging infrastructure.',
      });
    }

    // Detect hardcoded secrets or sensitive data
    const secretPatterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/gi,
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
      /secret\s*[:=]\s*['"][^'"]+['"]/gi,
      /token\s*[:=]\s*['"][^'"]{20,}['"]/gi,
    ];

    for (const pattern of secretPatterns) {
      const matches = content.content.match(pattern);
      if (matches) {
        issues.push({
          type: 'security',
          severity: 'high',
          title: 'Potential hardcoded credentials detected',
          description: `Found ${matches.length} potential hardcoded secrets or credentials in the file.`,
          location: filePath,
          suggestedFix: 'Move credentials to environment variables or secure configuration files.',
        });
        break;
      }
    }

    // Detect commented-out code
    const commentedCodeBlocks = (content.content.match(/\/\/.*[{};]|\*.*[{};]/g) || []).length;
    if (commentedCodeBlocks > 10) {
      issues.push({
        type: 'code-quality',
        severity: 'low',
        title: 'Excessive commented-out code',
        description: `File appears to have ${commentedCodeBlocks} lines of commented-out code.`,
        location: filePath,
        suggestedFix: 'Remove commented-out code or use version control instead.',
      });
    }

    return issues;
  }

  /**
   * Detect dependency issues
   */
  private detectDependencyIssues(dependencyGraph: DependencyGraph): DetectedIssue[] {
    const issues: DetectedIssue[] = [];

    // Detect circular dependencies
    if (dependencyGraph.circularDependencies.length > 0) {
      for (const cycle of dependencyGraph.circularDependencies) {
        issues.push({
          type: 'architecture',
          severity: 'medium',
          title: 'Circular dependency detected',
          description: `Found circular dependency involving ${cycle.length} files: ${cycle.paths.join(' -> ')}`,
          location: cycle.paths[0],
          suggestedFix: 'Refactor to break the circular dependency by introducing an interface or abstraction layer.',
          relatedFiles: cycle.paths,
        });
      }
    }

    // Detect excessive external dependencies
    if (dependencyGraph.externalDependencies.length > 100) {
      issues.push({
        type: 'dependency',
        severity: 'medium',
        title: 'Too many external dependencies',
        description: `Project has ${dependencyGraph.externalDependencies.length} external dependencies, which may impact bundle size and security.`,
        location: 'package.json',
        suggestedFix: 'Review dependencies and remove or consolidate unused packages.',
      });
    }

    return issues;
  }

  /**
   * Save issues to database
   */
  private async saveIssues(projectId: string): Promise<void> {
    for (const issue of this.issues) {
      // Check if similar issue already exists
      const existingIssue = await db.issueMemory.findFirst({
        where: {
          projectId,
          type: issue.type,
          location: issue.location,
          title: issue.title,
          status: 'open',
        },
      });

      if (!existingIssue) {
        // Create new issue
        await db.issueMemory.create({
          data: {
            projectId,
            type: issue.type,
            severity: issue.severity,
            title: issue.title,
            description: issue.description,
            location: issue.location,
            suggestedFix: issue.suggestedFix,
            status: 'open',
            discoveredAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Get complexity severity based on complexity score
   */
  private getComplexitySeverity(complexity: number): IssueSeverity {
    if (complexity > 50) return 'critical';
    if (complexity > 30) return 'high';
    if (complexity > 20) return 'medium';
    return 'low';
  }

  /**
   * Group issues by type
   */
  private groupIssuesByType(issues: DetectedIssue[]): Record<IssueType, number> {
    const grouped: Record<string, number> = {};
    issues.forEach(i => {
      grouped[i.type] = (grouped[i.type] || 0) + 1;
    });
    return grouped as Record<IssueType, number>;
  }

  /**
   * Group issues by severity
   */
  private groupIssuesBySeverity(issues: DetectedIssue[]): Record<IssueSeverity, number> {
    const grouped: Record<string, number> = {};
    issues.forEach(i => {
      grouped[i.severity] = (grouped[i.severity] || 0) + 1;
    });
    return grouped as Record<IssueSeverity, number>;
  }

  /**
   * Mark an issue as resolved
   */
  async markResolved(issueId: string, resolutionNote?: string): Promise<void> {
    await db.issueMemory.update({
      where: { id: issueId },
      data: {
        status: 'resolved',
        resolutionNote,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Get open issues for a project
   */
  async getOpenIssues(projectId: string): Promise<any[]> {
    return await db.issueMemory.findMany({
      where: {
        projectId,
        status: 'open',
      },
      orderBy: [
        { severity: 'desc' },
        { discoveredAt: 'desc' },
      ],
    });
  }

  /**
   * Get issues by severity
   */
  async getIssuesBySeverity(projectId: string, severity: IssueSeverity): Promise<any[]> {
    return await db.issueMemory.findMany({
      where: {
        projectId,
        status: 'open',
        severity,
      },
      orderBy: { discoveredAt: 'desc' },
    });
  }

  /**
   * Get issues by type
   */
  async getIssuesByType(projectId: string, type: IssueType): Promise<any[]> {
    return await db.issueMemory.findMany({
      where: {
        projectId,
        status: 'open',
        type,
      },
      orderBy: { discoveredAt: 'desc' },
    });
  }
}
