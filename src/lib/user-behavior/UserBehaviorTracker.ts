import { db } from '@/lib/db';

export interface BehaviorTrackingOptions {
  projectId: string;
  userId?: string;
}

export interface FileInteraction {
  filePath: string;
  action: 'view' | 'edit' | 'copy' | 'search' | 'chat';
  duration?: number;
  metadata?: Record<string, any>;
}

export interface QueryInteraction {
  query: string;
  context?: string;
  success: boolean;
  followUpActions?: string[];
}

export interface UserPreferences {
  preferredLanguages: string[];
  frequentlyVisitedFiles: string[];
  queryPatterns: string[];
  workingHours: number[];
}

export type ActionType = 
  | 'file_view'
  | 'file_edit'
  | 'file_search'
  | 'code_chat'
  | 'wiki_view'
  | 'pattern_explore'
  | 'issue_view'
  | 'dependency_analysis';

/**
 * UserBehaviorTracker - Tracks user interactions to improve AI recommendations
 */
export class UserBehaviorTracker {
  private options: BehaviorTrackingOptions;

  constructor(options: BehaviorTrackingOptions) {
    this.options = options;
  }

  /**
   * Track a file interaction
   */
  async trackFileInteraction(interaction: FileInteraction): Promise<void> {
    const { projectId, userId } = this.options;

    // Get or create user behavior record
    let userBehavior = await db.userBehavior.findFirst({
      where: { projectId },
    });

    if (!userBehavior) {
      userBehavior = await db.userBehavior.create({
        data: {
          projectId,
          userId: userId || 'default',
          interactions: '[]',
          preferences: '{}',
          lastActive: new Date(),
        },
      });
    }

    // Parse existing interactions
    const interactions = JSON.parse(userBehavior.interactions || '[]');

    // Add new interaction
    interactions.push({
      type: 'file_interaction',
      action: interaction.action,
      filePath: interaction.filePath,
      timestamp: new Date().toISOString(),
      duration: interaction.duration,
      metadata: interaction.metadata,
    });

    // Keep only last 1000 interactions
    const recentInteractions = interactions.slice(-1000);

    // Update user behavior
    await db.userBehavior.update({
      where: { id: userBehavior.id },
      data: {
        interactions: JSON.stringify(recentInteractions),
        lastActive: new Date(),
      },
    });

    // Update preferences asynchronously
    this.updatePreferences(userBehavior.id, recentInteractions);
  }

  /**
   * Track a query interaction
   */
  async trackQueryInteraction(query: QueryInteraction): Promise<void> {
    const { projectId, userId } = this.options;

    // Get or create user behavior record
    let userBehavior = await db.userBehavior.findFirst({
      where: { projectId },
    });

    if (!userBehavior) {
      userBehavior = await db.userBehavior.create({
        data: {
          projectId,
          userId: userId || 'default',
          interactions: '[]',
          preferences: '{}',
          lastActive: new Date(),
        },
      });
    }

    // Parse existing interactions
    const interactions = JSON.parse(userBehavior.interactions || '[]');

    // Add new interaction
    interactions.push({
      type: 'query_interaction',
      query: query.query,
      context: query.context,
      success: query.success,
      followUpActions: query.followUpActions,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 1000 interactions
    const recentInteractions = interactions.slice(-1000);

    // Update user behavior
    await db.userBehavior.update({
      where: { id: userBehavior.id },
      data: {
        interactions: JSON.stringify(recentInteractions),
        lastActive: new Date(),
      },
    });

    // Update preferences asynchronously
    this.updatePreferences(userBehavior.id, recentInteractions);
  }

  /**
   * Track a generic action
   */
  async trackAction(actionType: ActionType, metadata: Record<string, any> = {}): Promise<void> {
    const { projectId, userId } = this.options;

    // Get or create user behavior record
    let userBehavior = await db.userBehavior.findFirst({
      where: { projectId },
    });

    if (!userBehavior) {
      userBehavior = await db.userBehavior.create({
        data: {
          projectId,
          userId: userId || 'default',
          interactions: '[]',
          preferences: '{}',
          lastActive: new Date(),
        },
      });
    }

    // Parse existing interactions
    const interactions = JSON.parse(userBehavior.interactions || '[]');

    // Add new interaction
    interactions.push({
      type: 'action',
      actionType,
      metadata,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 1000 interactions
    const recentInteractions = interactions.slice(-1000);

    // Update user behavior
    await db.userBehavior.update({
      where: { id: userBehavior.id },
      data: {
        interactions: JSON.stringify(recentInteractions),
        lastActive: new Date(),
      },
    });

    // Update preferences asynchronously
    this.updatePreferences(userBehavior.id, recentInteractions);
  }

  /**
   * Update user preferences based on interactions
   */
  private async updatePreferences(userBehaviorId: string, interactions: any[]): Promise<void> {
    const preferences: UserPreferences = {
      preferredLanguages: [],
      frequentlyVisitedFiles: [],
      queryPatterns: [],
      workingHours: [],
    };

    // Track file visits
    const fileVisitCount = new Map<string, number>();
    const languageCount = new Map<string, number>();

    interactions.forEach(interaction => {
      // Track file visits
      if (interaction.type === 'file_interaction') {
        const filePath = interaction.filePath || '';
        fileVisitCount.set(filePath, (fileVisitCount.get(filePath) || 0) + 1);

        // Extract language from file path
        const ext = filePath.split('.').pop()?.toLowerCase();
        if (ext) {
          const language = this.getLanguageFromExtension(ext);
          if (language) {
            languageCount.set(language, (languageCount.get(language) || 0) + 1);
          }
        }
      }

      // Track query patterns
      if (interaction.type === 'query_interaction') {
        const query = interaction.query || '';
        // Extract keywords from query
        const keywords = query.split(/\s+/).filter(w => w.length > 3);
        preferences.queryPatterns.push(...keywords);
      }

      // Track working hours
      const timestamp = new Date(interaction.timestamp);
      if (!isNaN(timestamp.getTime())) {
        preferences.workingHours.push(timestamp.getHours());
      }
    });

    // Get top 10 most visited files
    const topFiles = Array.from(fileVisitCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([filePath]) => filePath);

    // Get top 5 preferred languages
    const topLanguages = Array.from(languageCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([language]) => language);

    // Get top 20 query patterns
    const queryPatternCount = new Map<string, number>();
    preferences.queryPatterns.forEach(pattern => {
      queryPatternCount.set(pattern, (queryPatternCount.get(pattern) || 0) + 1);
    });

    const topQueryPatterns = Array.from(queryPatternCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([pattern]) => pattern);

    // Update preferences
    preferences.frequentlyVisitedFiles = topFiles;
    preferences.preferredLanguages = topLanguages;
    preferences.queryPatterns = topQueryPatterns;

    // Save preferences
    await db.userBehavior.update({
      where: { id: userBehaviorId },
      data: {
        preferences: JSON.stringify(preferences),
      },
    });
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    const { projectId } = this.options;

    const userBehavior = await db.userBehavior.findFirst({
      where: { projectId },
    });

    if (!userBehavior) {
      return {
        preferredLanguages: [],
        frequentlyVisitedFiles: [],
        queryPatterns: [],
        workingHours: [],
      };
    }

    return JSON.parse(userBehavior.preferences || '{}');
  }

  /**
   * Get file visit statistics
   */
  async getFileVisitStats(): Promise<Record<string, number>> {
    const { projectId } = this.options;

    const userBehavior = await db.userBehavior.findFirst({
      where: { projectId },
    });

    if (!userBehavior) {
      return {};
    }

    const interactions = JSON.parse(userBehavior.interactions || '[]');
    const fileVisitCount = new Map<string, number>();

    interactions.forEach((interaction: any) => {
      if (interaction.type === 'file_interaction') {
        const filePath = interaction.filePath || '';
        fileVisitCount.set(filePath, (fileVisitCount.get(filePath) || 0) + 1);
      }
    });

    return Object.fromEntries(fileVisitCount);
  }

  /**
   * Get language usage statistics
   */
  async getLanguageUsageStats(): Promise<Record<string, number>> {
    const { projectId } = this.options;

    const userBehavior = await db.userBehavior.findFirst({
      where: { projectId },
    });

    if (!userBehavior) {
      return {};
    }

    const interactions = JSON.parse(userBehavior.interactions || '[]');
    const languageCount = new Map<string, number>();

    interactions.forEach((interaction: any) => {
      if (interaction.type === 'file_interaction') {
        const filePath = interaction.filePath || '';
        const ext = filePath.split('.').pop()?.toLowerCase();
        if (ext) {
          const language = this.getLanguageFromExtension(ext);
          if (language) {
            languageCount.set(language, (languageCount.get(language) || 0) + 1);
          }
        }
      }
    });

    return Object.fromEntries(languageCount);
  }

  /**
   * Get recommended files based on user behavior
   */
  async getRecommendedFiles(limit: number = 10): Promise<string[]> {
    const preferences = await this.getPreferences();
    return preferences.frequentlyVisitedFiles.slice(0, limit);
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(ext: string): string | null {
    const languageMap: Record<string, string> = {
      js: 'JavaScript',
      jsx: 'JavaScript',
      ts: 'TypeScript',
      tsx: 'TypeScript',
      py: 'Python',
      java: 'Java',
      go: 'Go',
      rs: 'Rust',
      c: 'C',
      cpp: 'C++',
      h: 'C',
      cs: 'C#',
      php: 'PHP',
      rb: 'Ruby',
      swift: 'Swift',
      kt: 'Kotlin',
      scala: 'Scala',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      sass: 'Sass',
      json: 'JSON',
      yaml: 'YAML',
      yml: 'YAML',
      xml: 'XML',
      md: 'Markdown',
      sh: 'Shell',
      sql: 'SQL',
    };

    return languageMap[ext] || null;
  }

  /**
   * Clear old interactions (cleanup)
   */
  async clearOldInteractions(daysToKeep: number = 30): Promise<void> {
    const { projectId } = this.options;

    const userBehavior = await db.userBehavior.findFirst({
      where: { projectId },
    });

    if (!userBehavior) {
      return;
    }

    const interactions = JSON.parse(userBehavior.interactions || '[]');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const recentInteractions = interactions.filter((interaction: any) => {
      const timestamp = new Date(interaction.timestamp);
      return timestamp >= cutoffDate;
    });

    await db.userBehavior.update({
      where: { id: userBehavior.id },
      data: {
        interactions: JSON.stringify(recentInteractions),
      },
    });
  }
}
