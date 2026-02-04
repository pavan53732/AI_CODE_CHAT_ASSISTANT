import { db } from '@/lib/db';

export interface WikiGenerationOptions {
  projectId: string;
  includeArchitecture?: boolean;
  includeAPI?: boolean;
  includeComponents?: boolean;
  includePatterns?: boolean;
  onProgress?: (progress: WikiGenerationProgress) => void;
}

export interface WikiGenerationProgress {
  stage: 'analyzing' | 'generating' | 'saving' | 'complete' | 'error';
  pagesGenerated: number;
  totalPages: number;
  currentPage?: string;
  message: string;
  error?: string;
}

export interface WikiPage {
  id: string;
  projectId: string;
  title: string;
  category: string;
  content: string;
  order: number;
  tags: string[];
  lastUpdated: Date;
}

/**
 * WikiGenerator - Automatically generates project documentation
 */
export class WikiGenerator {
  private options: WikiGenerationOptions;

  constructor(options: WikiGenerationOptions) {
    this.options = {
      includeArchitecture: options.includeArchitecture ?? true,
      includeAPI: options.includeAPI ?? true,
      includeComponents: options.includeComponents ?? true,
      includePatterns: options.includePatterns ?? true,
      ...options,
    };
  }

  /**
   * Run the complete wiki generation process
   */
  async run(): Promise<{ success: boolean; pagesGenerated: number }> {
    try {
      const { projectId } = this.options;

      // Get project data
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          fileAnalyses: true,
          patterns: true,
          issues: true,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      const pagesToGenerate: { title: string; category: string; content: string }[] = [];

      // Step 1: Generate overview page
      if (this.options.onProgress) {
        this.options.onProgress({
          stage: 'analyzing',
          pagesGenerated: 0,
          totalPages: 0,
          message: 'Analyzing project structure',
        });
      }

      pagesToGenerate.push(this.generateOverviewPage(project));

      // Step 2: Generate architecture page
      if (this.options.includeArchitecture) {
        pagesToGenerate.push(this.generateArchitecturePage(project));
      }

      // Step 3: Generate API documentation
      if (this.options.includeAPI) {
        const apiPages = this.generateAPIPages(project);
        pagesToGenerate.push(...apiPages);
      }

      // Step 4: Generate component documentation
      if (this.options.includeComponents) {
        const componentPages = this.generateComponentPages(project);
        pagesToGenerate.push(...componentPages);
      }

      // Step 5: Generate patterns documentation
      if (this.options.includePatterns) {
        pagesToGenerate.push(this.generatePatternsPage(project));
      }

      // Step 6: Generate issues summary
      pagesToGenerate.push(this.generateIssuesPage(project));

      const totalPages = pagesToGenerate.length;

      if (this.options.onProgress) {
        this.options.onProgress({
          stage: 'generating',
          pagesGenerated: 0,
          totalPages,
          message: `Generating ${totalPages} wiki pages`,
        });
      }

      // Save all pages to database
      let pagesGenerated = 0;
      for (const pageData of pagesToGenerate) {
        await this.saveWikiPage(projectId, pageData);
        pagesGenerated++;

        if (this.options.onProgress) {
          this.options.onProgress({
            stage: 'saving',
            pagesGenerated,
            totalPages,
            currentPage: pageData.title,
            message: `Saved ${pagesGenerated}/${totalPages} pages`,
          });
        }
      }

      if (this.options.onProgress) {
        this.options.onProgress({
          stage: 'complete',
          pagesGenerated,
          totalPages,
          message: `Wiki generation complete: ${pagesGenerated} pages generated`,
        });
      }

      console.log('[WikiGenerator] Generation complete:', { pagesGenerated });
      return { success: true, pagesGenerated };
    } catch (error) {
      console.error('[WikiGenerator] Generation error:', error);
      if (this.options.onProgress) {
        this.options.onProgress({
          stage: 'error',
          pagesGenerated: 0,
          totalPages: 0,
          message: 'Wiki generation failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      throw error;
    }
  }

  /**
   * Generate overview page
   */
  private generateOverviewPage(project: any): { title: string; category: string; content: string } {
    const languages = this.getLanguages(project.fileAnalyses);
    const technologies = project.technologies ? JSON.parse(project.technologies) : [];
    const totalFiles = project.fileAnalyses.length;
    const totalLines = project.fileAnalyses.reduce((sum: number, f: any) => sum + f.lineCount, 0);

    const content = `# Project Overview

## Description
${project.summary || 'This project has been auto-indexed by AI Code Chat Assistant.'}

## Project Statistics
- **Total Files:** ${totalFiles}
- **Total Lines of Code:** ${totalLines.toLocaleString()}
- **Languages Used:** ${Object.entries(languages).map(([lang, count]) => `${lang} (${count})`).join(', ')}

## Technology Stack
${technologies.map((tech: string) => `- ${tech}`).join('\n') || 'No technologies specified yet.'}

## Architecture
${project.architecture || 'Architecture details will be updated as the project is analyzed.'}

## User Interests
${project.userInterests ? JSON.parse(project.userInterests).map((interest: string) => `- ${interest}`).join('\n') : 'No user interests specified yet.'}

---
*Last updated: ${new Date().toISOString()}*
`;

    return {
      title: 'Overview',
      category: 'general',
      content,
    };
  }

  /**
   * Generate architecture page
   */
  private generateArchitecturePage(project: any): { title: string; category: string; content: string } {
    const directories = this.getTopDirectories(project.fileAnalyses);
    const languages = this.getLanguages(project.fileAnalyses);

    const content = `# Architecture

## Project Structure
${directories.map(dir => `### ${dir.name}
- Files: ${dir.count}
`).join('')}

## Language Breakdown
${Object.entries(languages).map(([lang, count]) => `### ${lang}
- Files: ${count}
- Percentage: ${((count / project.fileAnalyses.length) * 100).toFixed(1)}%
`).join('')}

## Key Components
This section will be updated as more components are discovered through analysis.

---
*Last updated: ${new Date().toISOString()}*
`;

    return {
      title: 'Architecture',
      category: 'architecture',
      content,
    };
  }

  /**
   * Generate API documentation pages
   */
  private generateAPIPages(project: any): { title: string; category: string; content: string }[] {
    const apiFiles = project.fileAnalyses.filter((f: any) =>
      f.filePath.includes('/api/') || f.filePath.includes('route')
    );

    if (apiFiles.length === 0) {
      return [{
        title: 'API',
        category: 'api',
        content: `# API Documentation

No API endpoints have been indexed yet.

---
*Last updated: ${new Date().toISOString()}*
`,
      }];
    }

    return [{
      title: 'API',
      category: 'api',
      content: `# API Documentation

## Endpoints
${apiFiles.map((file: any) => `### ${file.filePath}
- Language: ${file.language}
- Lines: ${file.lineCount}
- Functions: ${file.functionCount}
`).join('')}

---
*Last updated: ${new Date().toISOString()}*
`,
    }];
  }

  /**
   * Generate component documentation pages
   */
  private generateComponentPages(project: any): { title: string; category: string; content: string }[] {
    const componentFiles = project.fileAnalyses.filter((f: any) =>
      f.filePath.includes('/components/') ||
      f.filePath.includes('.tsx') ||
      f.filePath.includes('.jsx') ||
      f.filePath.includes('.vue')
    );

    if (componentFiles.length === 0) {
      return [{
        title: 'Components',
        category: 'components',
        content: `# Components

No components have been indexed yet.

---
*Last updated: ${new Date().toISOString()}*
`,
      }];
    }

    return [{
      title: 'Components',
      category: 'components',
      content: `# Components

## Component Files
${componentFiles.map((file: any) => `### ${file.filePath}
- Language: ${file.language}
- Lines: ${file.lineCount}
- Classes: ${file.classCount}
- Functions: ${file.functionCount}
`).join('')}

---
*Last updated: ${new Date().toISOString()}*
`,
    }];
  }

  /**
   * Generate patterns documentation page
   */
  private generatePatternsPage(project: any): { title: string; category: string; content: string } {
    if (!project.patterns || project.patterns.length === 0) {
      return {
        title: 'Code Patterns',
        category: 'patterns',
        content: `# Code Patterns

No code patterns have been detected yet.

---
*Last updated: ${new Date().toISOString()}*
`,
      };
    }

    const patternsByType = project.patterns.reduce((acc: any, pattern: any) => {
      if (!acc[pattern.type]) {
        acc[pattern.type] = [];
      }
      acc[pattern.type].push(pattern);
      return acc;
    }, {});

    const content = `# Code Patterns

## Detected Patterns
${Object.entries(patternsByType).map(([type, patterns]: [string, any]) => `
### ${type.charAt(0).toUpperCase() + type.slice(1)} Patterns
${patterns.map((p: any) => `- **${p.pattern}** (frequency: ${p.frequency}, confidence: ${(p.confidence * 100).toFixed(0)}%)`).join('\n')}
`).join('')}

---
*Last updated: ${new Date().toISOString()}*
`;

    return {
      title: 'Code Patterns',
      category: 'patterns',
      content,
    };
  }

  /**
   * Generate issues summary page
   */
  private generateIssuesPage(project: any): { title: string; category: string; content: string } {
    const openIssues = project.issues?.filter((i: any) => i.status === 'open') || [];

    const content = `# Issues

## Open Issues (${openIssues.length})
${openIssues.length === 0 ? 'No open issues.' : openIssues.map((issue: any) => `
### ${issue.title} (${issue.severity})
**Type:** ${issue.type}
**Location:** \`${issue.location}\`
**Discovered:** ${new Date(issue.discoveredAt).toLocaleDateString()}

${issue.description}

**Suggested Fix:**
${issue.suggestedFix || 'No suggestion available.'}
`).join('')}

---
*Last updated: ${new Date().toISOString()}*
`;

    return {
      title: 'Issues',
      category: 'issues',
      content,
    };
  }

  /**
   * Save wiki page to database
   */
  private async saveWikiPage(
    projectId: string,
    pageData: { title: string; category: string; content: string }
  ): Promise<void> {
    const existingPage = await db.wikiPage.findFirst({
      where: {
        projectId,
        title: pageData.title,
        category: pageData.category,
      },
    });

    if (existingPage) {
      // Update existing page
      await db.wikiPage.update({
        where: { id: existingPage.id },
        data: {
          content: pageData.content,
          lastUpdated: new Date(),
        },
      });
    } else {
      // Create new page
      const maxOrder = await db.wikiPage.findFirst({
        where: { projectId, category: pageData.category },
        orderBy: { order: 'desc' },
      });

      await db.wikiPage.create({
        data: {
          projectId,
          title: pageData.title,
          category: pageData.category,
          content: pageData.content,
          order: (maxOrder?.order || 0) + 1,
          tags: [pageData.category],
          lastUpdated: new Date(),
        },
      });
    }
  }

  /**
   * Get languages from file analyses
   */
  private getLanguages(fileAnalyses: any[]): Record<string, number> {
    const languages: Record<string, number> = {};
    fileAnalyses.forEach(f => {
      languages[f.language] = (languages[f.language] || 0) + 1;
    });
    return languages;
  }

  /**
   * Get top directories from file analyses
   */
  private getTopDirectories(fileAnalyses: any[]): Array<{ name: string; count: number }> {
    const directories: Record<string, number> = {};

    fileAnalyses.forEach(f => {
      const parts = f.filePath.split('/');
      if (parts.length >= 2) {
        const dir = parts[1] || 'root';
        directories[dir] = (directories[dir] || 0) + 1;
      }
    });

    return Object.entries(directories)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
