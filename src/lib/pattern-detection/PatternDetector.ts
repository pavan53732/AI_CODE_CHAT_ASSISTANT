import { ExtractedContent } from '../code-indexing/ContentExtractor';
import { db } from '@/lib/db';

export interface PatternDetectionOptions {
  projectId: string;
  minFrequency?: number;
  minConfidence?: number;
  onProgress?: (progress: PatternDetectionProgress) => void;
}

export interface PatternDetectionProgress {
  filesAnalyzed: number;
  totalFiles: number;
  patternsFound: number;
  currentFile?: string;
  message: string;
}

export interface DetectedPattern {
  id: string;
  projectId: string;
  type: PatternType;
  pattern: string;
  fileContext: string;
  frequency: number;
  firstSeen: Date;
  lastSeen: Date;
  confidence: number;
}

export type PatternType =
  | 'dependency'
  | 'api'
  | 'component'
  | 'hook'
  | 'utility'
  | 'error-handling'
  | 'data-validation'
  | 'state-management'
  | 'styling'
  | 'testing'
  | 'architecture';

/**
 * PatternDetector - Detects and tracks code patterns
 */
export class PatternDetector {
  private options: PatternDetectionOptions;
  private patterns: Map<string, DetectedPattern>;

  constructor(options: PatternDetectionOptions) {
    this.options = {
      minFrequency: options.minFrequency || 2,
      minConfidence: options.minConfidence || 0.7,
      ...options,
    };
    this.patterns = new Map();
  }

  /**
   * Run pattern detection on extracted content
   */
  async detect(extractedContents: ExtractedContent[]): Promise<DetectedPattern[]> {
    const totalFiles = extractedContents.length;
    const { projectId, minFrequency, minConfidence } = this.options;

    this.options.onProgress?.({
      filesAnalyzed: 0,
      totalFiles,
      patternsFound: 0,
      message: 'Starting pattern detection',
    });

    // Analyze each file for patterns
    for (let i = 0; i < extractedContents.length; i++) {
      const content = extractedContents[i];
      const filePatterns = this.detectPatternsInFile(content);

      // Merge patterns
      for (const pattern of filePatterns) {
        const key = `${pattern.type}:${pattern.pattern}`;
        const existing = this.patterns.get(key);

        if (existing) {
          existing.frequency++;
          existing.lastSeen = new Date();
          existing.confidence = Math.min(1, existing.confidence + 0.1);
        } else {
          this.patterns.set(key, {
            ...pattern,
            id: `pattern:${projectId}:${Date.now()}:${this.patterns.size}`,
            projectId,
            frequency: 1,
            firstSeen: new Date(),
            lastSeen: new Date(),
            confidence: 0.5,
          });
        }
      }

      this.options.onProgress?.({
        filesAnalyzed: i + 1,
        totalFiles,
        patternsFound: this.patterns.size,
        currentFile: content.metadata.path,
        message: `Analyzed ${i + 1}/${totalFiles} files`,
      });
    }

    // Filter patterns by frequency and confidence
    const filteredPatterns = Array.from(this.patterns.values())
      .filter(p => p.frequency >= (minFrequency || 2) && p.confidence >= (minConfidence || 0.7))
      .sort((a, b) => b.frequency - a.frequency);

    // Save patterns to database
    await this.savePatterns(filteredPatterns);

    this.options.onProgress?.({
      filesAnalyzed: totalFiles,
      totalFiles,
      patternsFound: filteredPatterns.length,
      message: `Pattern detection complete: ${filteredPatterns.length} patterns found`,
    });

    console.log('[PatternDetector] Detection complete:', {
      total: filteredPatterns.length,
      byType: this.groupPatternsByType(filteredPatterns),
    });

    return filteredPatterns;
  }

  /**
   * Detect patterns in a single file
   */
  private detectPatternsInFile(content: ExtractedContent): Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> {
    const patterns: Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> = [];
    const filePath = content.metadata.path;

    // Detect API patterns
    patterns.push(...this.detectAPIPatterns(content, filePath));

    // Detect component patterns
    patterns.push(...this.detectComponentPatterns(content, filePath));

    // Detect hook patterns
    patterns.push(...this.detectHookPatterns(content, filePath));

    // Detect utility patterns
    patterns.push(...this.detectUtilityPatterns(content, filePath));

    // Detect error handling patterns
    patterns.push(...this.detectErrorHandlingPatterns(content, filePath));

    // Detect data validation patterns
    patterns.push(...this.detectDataValidationPatterns(content, filePath));

    // Detect state management patterns
    patterns.push(...this.detectStateManagementPatterns(content, filePath));

    // Detect styling patterns
    patterns.push(...this.detectStylingPatterns(content, filePath));

    // Detect testing patterns
    patterns.push(...this.detectTestingPatterns(content, filePath));

    return patterns;
  }

  /**
   * Detect API patterns
   */
  private detectAPIPatterns(content: ExtractedContent, filePath: string): Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> {
    const patterns: Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> = [];

    if (filePath.includes('/api/')) {
      patterns.push({
        type: 'api',
        pattern: 'API endpoint',
        fileContext: filePath,
        confidence: 0.9,
      });
    }

    content.functions?.forEach(func => {
      if (func.name.toLowerCase().includes('fetch') || func.name.toLowerCase().includes('request')) {
        patterns.push({
          type: 'api',
          pattern: `API function: ${func.name}`,
          fileContext: filePath,
          confidence: 0.8,
        });
      }
    });

    return patterns;
  }

  /**
   * Detect component patterns
   */
  private detectComponentPatterns(content: ExtractedContent, filePath: string): Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> {
    const patterns: Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> = [];

    if (filePath.includes('/components/') || filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      content.classes?.forEach(cls => {
        patterns.push({
          type: 'component',
          pattern: `Component: ${cls.name}`,
          fileContext: filePath,
          confidence: 0.9,
        });
      });
    }

    return patterns;
  }

  /**
   * Detect React hook patterns
   */
  private detectHookPatterns(content: ExtractedContent, filePath: string): Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> {
    const patterns: Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> = [];

    content.functions?.forEach(func => {
      if (func.name.startsWith('use')) {
        patterns.push({
          type: 'hook',
          pattern: `Hook: ${func.name}`,
          fileContext: filePath,
          confidence: 0.95,
        });
      }
    });

    return patterns;
  }

  /**
   * Detect utility patterns
   */
  private detectUtilityPatterns(content: ExtractedContent, filePath: string): Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> {
    const patterns: Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> = [];

    if (filePath.includes('/utils/') || filePath.includes('/helpers/')) {
      content.functions?.forEach(func => {
        patterns.push({
          type: 'utility',
          pattern: `Utility function: ${func.name}`,
          fileContext: filePath,
          confidence: 0.85,
        });
      });
    }

    return patterns;
  }

  /**
   * Detect error handling patterns
   */
  private detectErrorHandlingPatterns(content: ExtractedContent, filePath: string): Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> {
    const patterns: Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> = [];

    // Check for try-catch blocks
    const tryCatchCount = (content.content.match(/try\s*{/g) || []).length;
    if (tryCatchCount > 0) {
      patterns.push({
        type: 'error-handling',
        pattern: 'Try-catch error handling',
        fileContext: filePath,
        confidence: 0.9,
      });
    }

    // Check for throw statements
    const throwCount = (content.content.match(/throw\s+/g) || []).length;
    if (throwCount > 0) {
      patterns.push({
        type: 'error-handling',
        pattern: 'Error throwing',
        fileContext: filePath,
        confidence: 0.8,
      });
    }

    return patterns;
  }

  /**
   * Detect data validation patterns
   */
  private detectDataValidationPatterns(content: ExtractedContent, filePath: string): Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> {
    const patterns: Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> = [];

    const validationPatterns = ['validate', 'isValid', 'schema', 'check'];
    content.functions?.forEach(func => {
      if (validationPatterns.some(p => func.name.toLowerCase().includes(p))) {
        patterns.push({
          type: 'data-validation',
          pattern: `Validation function: ${func.name}`,
          fileContext: filePath,
          confidence: 0.8,
        });
      }
    });

    return patterns;
  }

  /**
   * Detect state management patterns
   */
  private detectStateManagementPatterns(content: ExtractedContent, filePath: string): Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> {
    const patterns: Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> = [];

    const statePatterns = ['useState', 'useReducer', 'createStore', 'atom', 'signal'];
    statePatterns.forEach(pattern => {
      if (content.content.includes(pattern)) {
        patterns.push({
          type: 'state-management',
          pattern: `State pattern: ${pattern}`,
          fileContext: filePath,
          confidence: 0.85,
        });
      }
    });

    return patterns;
  }

  /**
   * Detect styling patterns
   */
  private detectStylingPatterns(content: ExtractedContent, filePath: string): Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> {
    const patterns: Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> = [];

    if (filePath.endsWith('.css') || filePath.endsWith('.scss') || filePath.endsWith('.sass')) {
      patterns.push({
        type: 'styling',
        pattern: 'Stylesheet',
        fileContext: filePath,
        confidence: 0.9,
      });
    }

    // Check for Tailwind classes
    const hasTailwind = (content.content.match(/className="[^"]*\b(bg|text|p|m)-/g) || []).length > 0;
    if (hasTailwind) {
      patterns.push({
        type: 'styling',
        pattern: 'Tailwind CSS',
        fileContext: filePath,
        confidence: 0.9,
      });
    }

    return patterns;
  }

  /**
   * Detect testing patterns
   */
  private detectTestingPatterns(content: ExtractedContent, filePath: string): Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> {
    const patterns: Array<Omit<DetectedPattern, 'id' | 'projectId' | 'frequency' | 'firstSeen' | 'lastSeen'>> = [];

    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('/tests/')) {
      patterns.push({
        type: 'testing',
        pattern: 'Test file',
        fileContext: filePath,
        confidence: 0.95,
      });
    }

    const testPatterns = ['it(', 'test(', 'describe(', 'expect(', 'assert('];
    testPatterns.forEach(pattern => {
      if (content.content.includes(pattern)) {
        patterns.push({
          type: 'testing',
          pattern: `Test pattern: ${pattern}`,
          fileContext: filePath,
          confidence: 0.85,
        });
      }
    });

    return patterns;
  }

  /**
   * Save patterns to database
   */
  private async savePatterns(patterns: DetectedPattern[]): Promise<void> {
    const { projectId } = this.options;

    for (const pattern of patterns) {
      // Check if pattern already exists
      const existingPattern = await db.codePattern.findFirst({
        where: {
          projectId,
          type: pattern.type,
          pattern: pattern.pattern,
        },
      });

      if (existingPattern) {
        // Update existing pattern
        await db.codePattern.update({
          where: { id: existingPattern.id },
          data: {
            frequency: pattern.frequency,
            confidence: pattern.confidence,
            lastSeen: pattern.lastSeen,
          },
        });
      } else {
        // Create new pattern
        await db.codePattern.create({
          data: {
            id: pattern.id,
            projectId,
            type: pattern.type,
            pattern: pattern.pattern,
            fileContext: pattern.fileContext,
            frequency: pattern.frequency,
            firstSeen: pattern.firstSeen,
            lastSeen: pattern.lastSeen,
            confidence: pattern.confidence,
          },
        });
      }
    }
  }

  /**
   * Group patterns by type
   */
  private groupPatternsByType(patterns: DetectedPattern[]): Record<PatternType, number> {
    const grouped: Record<string, number> = {};
    patterns.forEach(p => {
      grouped[p.type] = (grouped[p.type] || 0) + 1;
    });
    return grouped as Record<PatternType, number>;
  }
}
