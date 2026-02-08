// Memory Manager
// Implements sliding window, tiered retention, weighted scoring, and cleanup

import { db } from '@/lib/db';

interface RetentionConfig {
  recent: { window: number; days: number }; // 25 messages, 30 days
  important: { days: number }; // 90 days
  archived: { days: number }; // 365 days
}

interface WeightedMemory {
  id: string;
  type: 'conversation' | 'pattern' | 'issue' | 'file';
  content: string;
  weight: number;
  lastAccessed: Date;
  accessCount: number;
  importance: number;
}

export class MemoryManager {
  private retentionConfig: RetentionConfig = {
    recent: { window: 25, days: 30 },
    important: { days: 90 },
    archived: { days: 365 },
  };

  /**
   * Apply sliding window to conversations
   * Keep only the last N messages in active memory
   */
  async applySlidingWindow(projectId: string): Promise<void> {
    const windowSize = this.retentionConfig.recent.window;

    // Get recent conversations
    const conversations = await db.conversation.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: windowSize + 10, // Get a few extra to check
    });

    if (conversations.length > windowSize) {
      // Mark older conversations as archived
      const toArchive = conversations.slice(windowSize);
      for (const conv of toArchive) {
        await db.conversation.update({
          where: { id: conv.id },
          data: {
            // Add archived flag or move to archive
            topics: JSON.stringify({
              ...JSON.parse(conv.topics || '[]'),
              _archived: true,
              _archivedAt: new Date().toISOString(),
            }),
          },
        });
      }
    }
  }

  /**
   * Clean up old memories based on retention policy
   */
  async cleanupOldMemories(projectId: string): Promise<{
    deleted: number;
    archived: number;
  }> {
    const now = new Date();
    let deleted = 0;
    let archived = 0;

    // Archive conversations older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oldConversations = await db.conversation.findMany({
      where: {
        projectId,
        timestamp: { lt: thirtyDaysAgo },
      },
    });

    for (const conv of oldConversations) {
      const topics = JSON.parse(conv.topics || '{}');
      if (!topics._archived) {
        await db.conversation.update({
          where: { id: conv.id },
          data: {
            topics: JSON.stringify({
              ...topics,
              _archived: true,
              _archivedAt: now.toISOString(),
            }),
          },
        });
        archived++;
      }
    }

    // Delete very old archived conversations (365 days)
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const veryOldConversations = await db.conversation.findMany({
      where: {
        projectId,
        timestamp: { lt: oneYearAgo },
      },
    });

    for (const conv of veryOldConversations) {
      const topics = JSON.parse(conv.topics || '{}');
      if (topics._archived) {
        await db.conversation.delete({
          where: { id: conv.id },
        });
        deleted++;
      }
    }

    return { deleted, archived };
  }

  /**
   * Calculate weighted score for memory items
   * Weight = importance × recency × access_frequency
   * Range: 1.0 (highest) → 0.2 (lowest)
   */
  calculateWeight(memory: WeightedMemory): number {
    const now = new Date();
    const daysSinceAccess = (now.getTime() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);

    // Recency decay: 1.0 → 0.2 over 90 days
    const recencyScore = Math.max(0.2, 1.0 - (daysSinceAccess / 90) * 0.8);

    // Access frequency boost: +0.1 per access, max +0.3
    const accessBoost = Math.min(0.3, memory.accessCount * 0.05);

    // Base importance (0.5 - 1.0)
    const importanceScore = memory.importance || 0.5;

    // Combined weight
    let weight = importanceScore * recencyScore + accessBoost;

    // Clamp to 0.2 - 1.0
    return Math.max(0.2, Math.min(1.0, weight));
  }

  /**
   * Get weighted memories for AI context
   */
  async getWeightedMemories(projectId: string, limit: number = 10): Promise<WeightedMemory[]> {
    // Get conversations
    const conversations = await db.conversation.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    // Get patterns
    const patterns = await db.codePattern.findMany({
      where: { projectId },
      orderBy: { frequency: 'desc' },
      take: 20,
    });

    // Get issues
    const issues = await db.issueMemory.findMany({
      where: { projectId, status: 'open' },
      orderBy: { severity: 'desc' },
      take: 10,
    });

    // Convert to weighted memory format
    const memories: WeightedMemory[] = [
      ...conversations.map((conv, idx) => ({
        id: conv.id,
        type: 'conversation' as const,
        content: conv.summary || 'Conversation',
        weight: 0,
        lastAccessed: conv.timestamp,
        accessCount: 50 - idx, // Recent = more access
        importance: 0.7,
      })),
      ...patterns.map(p => ({
        id: p.id,
        type: 'pattern' as const,
        content: p.pattern,
        weight: 0,
        lastAccessed: p.lastSeen,
        accessCount: p.frequency,
        importance: 0.8,
      })),
      ...issues.map(i => ({
        id: i.id,
        type: 'issue' as const,
        content: i.description,
        weight: 0,
        lastAccessed: i.discoveredAt,
        accessCount: 1,
        importance: i.severity === 'high' ? 0.95 : i.severity === 'medium' ? 0.8 : 0.6,
      })),
    ];

    // Calculate weights
    memories.forEach(m => {
      m.weight = this.calculateWeight(m);
    });

    // Sort by weight and return top N
    return memories
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);
  }

  /**
   * Mark memory as accessed (increments access count)
   */
  async markAccessed(type: string, id: string): Promise<void> {
    // This would update access count in the database
    // For now, we'll just log it
    console.log(`[MemoryManager] Marked ${type} ${id} as accessed`);
  }

  /**
   * Run background cleanup job
   */
  async runBackgroundCleanup(): Promise<void> {
    const projects = await db.project.findMany();

    for (const project of projects) {
      // Apply sliding window
      await this.applySlidingWindow(project.id);

      // Clean up old memories
      const { deleted, archived } = await this.cleanupOldMemories(project.id);

      if (deleted > 0 || archived > 0) {
        console.log(`[MemoryManager] Project ${project.id}: cleaned up ${deleted} deleted, ${archived} archived`);
      }
    }
  }
}
