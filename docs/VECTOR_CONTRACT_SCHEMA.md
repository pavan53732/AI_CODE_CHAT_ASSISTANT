# VECTOR CONTRACT - FIRST-CLASS SCHEMA ARTIFACT
## Week 2: Embeddings System Specification

**Version:** 1.0.0
**Status:** LOCKED (Single Source of Truth)
**Last Updated:** 2025-01-20
**Active Model:** openai-large (3072 dimensions)

---

## LOCKED CONFIGURATION

The following configuration is the **single source of truth** for the embeddings system. All code MUST consume this file at runtime to enforce consistency.

```typescript
// FINAL, LOCKED CONFIGURATION
const VECTOR_CONTRACT = {
  model_id: 'openai-large',           // Active model identifier
  dim: 3072,                          // Vector dimensions (FIXED, no changes allowed)
  metric: 'cosine',                   // Similarity metric (FIXED)
  threshold: 0.7,                      // Minimum similarity threshold
  topK: 10,                           // Default top-k results

  // HNSW ANN Parameters
  hnsw: {
    M: 16,                            // Max connections per node
    efConstruction: 200,             // Build-time accuracy
    efSearch: 100,                    // Search-time accuracy
  },

  // Storage Quota Policy
  quota: {
    maxEmbeddings: 1_000_000,         // Max 1M embeddings
    maxTotalSize: 100 * 1024 * 1024 * 1024,  // 100 GB total
    maxFileSize: 1 * 1024 * 1024 * 1024,      // 1GB per file
    cleanupThreshold: 0.9,            // Clean at 90% capacity
    retentionDays: 90,               // Keep 90 days
    maxVersionsPerProject: 3,         // Max 3 versions per project
  },

  // Eviction Policy
  eviction: {
    strategy: 'lru',                  // Least Recently Used
    prioritizeBy: 'recently_used',    // Keep recently accessed
  },

  // Compaction Rules
  compaction: {
    schedule: 'daily',                // Daily compaction
    vacuumThreshold: 500,            // VACUUM at 500MB DB size
    reclaimSpace: 1024,              // Reclaim at 1GB free space
  },

  // Performance Targets
  targets: {
    search: {
      p50: 150,                       // ms for 1M chunks
      p95: 300,                       // ms for 1M chunks
      p99: 600,                       // ms for 1M chunks
    },
    indexBuild: {
      p95: 300000,                    // 5 minutes for 1M chunks
    },
  },
} as const;
```

---

## 1. EMBEDDING MODEL CONFIGURATION

### Model Registry

```typescript
interface EmbeddingModel {
  id: string;                    // Unique model identifier
  name: string;                  // Human-readable name
  provider: 'openai' | 'anthropic' | 'local' | 'huggingface';
  model: string;                  // Provider model name
  dimensions: number;             // Vector dimensions
  maxTokens: number;             // Maximum input tokens
  costPer1KTokens: number;      // Cost in USD
  isActive: boolean;              // Currently active model
}

const EMBEDDING_MODELS: Record<string, EmbeddingModel> = {
  'openai-small': {
    id: 'openai-small',
    name: 'OpenAI text-embedding-3-small',
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    maxTokens: 8191,
    costPer1KTokens: 0.00002,
    isActive: false, // Can be activated on model change
  },
  'openai-large': {
    id: 'openai-large',
    name: 'OpenAI text-embedding-3-large',
    provider: 'openai',
    model: 'text-embedding-3-large',
    dimensions: 3072,
    maxTokens: 8191,
    costPer1KTokens: 0.00013,
    isActive: true,  // Default active model
  },
  'local-all-minilm': {
    id: 'local-all-minilm',
    name: 'Local all-MiniLM-L6-v2',
    provider: 'local',
    model: 'all-MiniLM-L6-v2',
    dimensions: 384,
    maxTokens: 512,
    costPer1KTokens: 0,
    isActive: false,
  },
};
```

### Model Activation Trigger

```typescript
interface ReEmbedTrigger {
  trigger: 'model_upgrade' | 'version_mismatch' | 'manual' | 'threshold';
  oldModelId: string;
  newModelId: string;
  triggeredBy: string;  // 'system' | 'user' | 'admin'
  timestamp: Date;
  reason: string;
}

// Re-embed when:
// 1. Model upgrade (e.g., small → large)
// 2. Version mismatch detected (dimensions changed)
// 3. Manual re-index requested
// 4. Embedding quality below threshold
```

---

## 2. VECTOR STORAGE SCHEMA

### SQLite Storage Layout

```prisma
model CodeEmbedding {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Source
  filePath    String
  chunkId     String?   // Unique chunk identifier
  text        String   // Original text

  // Embedding
  vector      Blob     // Float32Array stored as bytes
  dimensions  Int      // Vector dimensions (locked to 3072 for openai-large)
  model       String   // Model identifier
  embeddingVersionId String
  embeddingVersion   EmbeddingVersion @relation(fields: [embeddingVersionId], references: [id], onDelete: Cascade)

  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([projectId, filePath, chunkId])
  @@index([projectId])
  @@index([filePath])
  @@index([model])
  @@index([embeddingVersionId])
}

model EmbeddingVersion {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Version info
  model       String   // Model identifier from registry
  dimensions  Int      // Vector dimensions
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  deactivatedAt DateTime?

  // Statistics
  embeddingCount Int @default(0)
  totalSize   BigInt   @default(0)

  // Relationships
  embeddings   CodeEmbedding[]

  @@unique([projectId, model])
  @@index([projectId])
  @@index([model])
  @@index([isActive])
}
```

### Vector Binary Format

```typescript
interface VectorBlob {
  format: 'float32';           // Always Float32 for balance of precision and size
  byteOrder: 'little';        // Little-endian for cross-platform compatibility
  dimensions: number;         // MUST match active model dimensions
  data: number[];             // Float32 values [-1.0, 1.0]
}

// Storage calculation (for openai-large, 3072 dimensions):
// - dimensions: 3072
// - bytes per float32: 4
// - total bytes: 3072 * 4 = 12288 bytes per vector
// - metadata overhead: ~200 bytes
// - total per embedding: ~12488 bytes

// 1M chunks storage:
// - Vector data: 1M * 12288 = 12.288 GB
// - Metadata overhead: 1M * 200 = 200 MB
// - Total: ~12.488 GB
```

---

## 3. SIMILARITY SEARCH METRICS

### Similarity Functions

```typescript
type SimilarityMetric = 'cosine' | 'euclidean' | 'dot_product';

interface SimilarityConfig {
  metric: SimilarityMetric;
  threshold: number;           // Minimum similarity to include in results
  topK: number;               // Return top K results
  normalize: boolean;           // Normalize vectors before comparison
}

const DEFAULT_SIMILARITY: SimilarityConfig = {
  metric: 'cosine',
  threshold: 0.7,             // 70% similarity minimum
  topK: 10,                   // Return top 10 results
  normalize: true,             // Always normalize for cosine similarity
};

/**
 * Cosine Similarity
 * Formula: cos(θ) = (A · B) / (||A|| * ||B||)
 * Range: [-1, 1], where 1 = identical direction
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Euclidean Distance
 * Formula: d(A, B) = sqrt(Σ(ai - bi)²)
 * Range: [0, ∞], where 0 = identical
 */
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;

  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Dot Product
 * Formula: A · B = Σ(ai * bi)
 * Range: (-∞, ∞), no normalization
 */
function dotProduct(a: number[], b: number[]): number {
  let dot = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }

  return dot;
}
```

### Search Performance Targets

| Dataset Size | p50 Target | p95 Target | p99 Target | Metric |
|-------------|-----------|-----------|-----------|--------|
| 10K chunks | 20ms | 50ms | 100ms | cosine |
| 100K chunks | 50ms | 150ms | 300ms | cosine |
| 500K chunks | 100ms | 300ms | 600ms | cosine |
| 1M chunks | 150ms | 300ms | 600ms | cosine |

---

## 4. HNSW ANN PARAMETERS

### HNSW Index Configuration

```typescript
interface HNSWConfig {
  M: number;          // Max connections per node (default: 16)
  efConstruction: number;  // Build time accuracy (default: 200)
  efSearch: number;   // Search time accuracy (default: 100)
}

const HNSW_DEFAULTS: HNSWConfig = {
  M: 16,              // Balance between recall and speed
  efConstruction: 200,  // Higher = better recall, slower build
  efSearch: 100,       // Higher = better recall, slower search
};

// M values for different use cases:
const HNSW_PRESETS = {
  fast: { M: 16, efConstruction: 100, efSearch: 50 },        // Fast, lower recall
  balanced: { M: 16, efConstruction: 200, efSearch: 100 },   // Default
  accurate: { M: 32, efConstruction: 400, efSearch: 200 },  // Slower, higher recall
};
```

### Index Build Performance

```typescript
interface IndexBuildConfig {
  datasetSize: number;
  dimensions: number;
  hnswConfig: HNSWConfig;
  metric: SimilarityMetric;
}

const INDEX_BUILD_TARGETS = {
  '10K': { buildTime: 5000, memory: 50MB },
  '100K': { buildTime: 30000, memory: 500MB },
  '500K': { buildTime: 150000, memory: 2.5GB },
  '1M': { buildTime: 300000, memory: 5GB },
};
```

---

## 5. DISK GROWTH CEILING POLICY

### Quota Configuration

```typescript
interface StorageQuota {
  maxEmbeddings: number;       // Maximum number of embeddings
  maxTotalSize: number;         // Maximum total size in bytes
  maxFileSize: number;          // Maximum size of single file's embeddings
  cleanupThreshold: number;     // Percentage of quota to trigger cleanup (0-1)
  retentionDays: number;         // Days to keep embeddings
  maxVersionsPerProject: number; // Max embedding versions per project
}

const STORAGE_QUOTA: StorageQuota = {
  maxEmbeddings: 1_000_000,     // 1M embeddings max
  maxTotalSize: 100 * 1024 * 1024 * 1024,  // 100 GB max
  maxFileSize: 1 * 1024 * 1024 * 1024,      // 1GB per file max
  cleanupThreshold: 0.9,      // Clean at 90% capacity
  retentionDays: 90,          // Keep 90 days
  maxVersionsPerProject: 3,    // Keep max 3 versions per project
};
```

### Eviction Policy

```typescript
interface EvictionStrategy {
  strategy: 'lru' | 'lfu' | 'fifo' | 'random';
  prioritizeBy: 'recently_used' | 'frequently_used' | 'project_priority';
}

const EVICTION_CONFIG: EvictionStrategy = {
  strategy: 'lru',              // Least Recently Used
  prioritizeBy: 'recently_used',  // Keep recently accessed embeddings
};

// Eviction algorithm:
// 1. Check quota (embeddings count and total size)
// 2. If quota exceeded, identify candidates for eviction
// 3. Score candidates by access recency and project priority
// 4. Evict lowest-scoring embeddings until within quota
// 5. Log evictions for audit trail
```

### Compaction Rules

```typescript
interface CompactionConfig {
  schedule: 'daily' | 'weekly';
  vacuumThreshold: number;     // Trigger VACUUM when DB size > threshold (MB)
  reclaimSpace: number;        // Trigger when free space < this (MB)
}

const COMPACTION_CONFIG: CompactionConfig = {
  schedule: 'daily',            // Run compaction daily
  vacuumThreshold: 500,       // 500MB DB size threshold
  reclaimSpace: 1024,        // 1GB free space threshold
};

// Compaction operations:
// 1. DELETE orphaned embeddings (no matching FileAnalysis)
// 2. DELETE old embeddings (older than retentionDays)
// 3. DELETE inactive versions (more than maxVersionsPerProject)
// 4. VACUUM to reclaim free space
// 5. ANALYZE to optimize query plans
// 6. REINDEX if fragmentation > 30%
```

---

## 6. RE-EMBED TRIGGER CONDITIONS

### Triggers

```typescript
interface ReEmbedTrigger {
  type: 'model_upgrade' | 'version_mismatch' | 'quality_threshold' | 'manual';
  condition: ReEmbedCondition;
  action: ReEmbedAction;
  batchSize: number;
  priority: 'high' | 'medium' | 'low';
}

interface ReEmbedCondition {
  oldModelId: string;
  newModelId: string;
  qualityScore?: number;
  qualityThreshold?: number;
  versionHash?: string;
}

interface ReEmbedAction {
  embedUnchanged: boolean;     // Re-embed even if file unchanged?
  embedDeletedFiles: boolean;    // Embed deleted files?
  concurrency: 'sequential' | 'parallel';
  maxParallel: number;          // Max parallel embed requests
}

const REEMBED_TRIGGERS: Record<string, ReEmbedTrigger> = {
  'model-upgrade': {
    type: 'model_upgrade',
    priority: 'high',
    condition: {
      oldModelId: 'openai-small',
      newModelId: 'openai-large',
    },
    action: {
      embedUnchanged: true,
      embedDeletedFiles: false,
      concurrency: 'sequential',
      maxParallel: 1,
    },
  },
  'quality-below-threshold': {
    type: 'quality_threshold',
    priority: 'medium',
    condition: {
      qualityScore: 0.65,
      qualityThreshold: 0.7,
    },
    action: {
      embedUnchanged: false,
      embedDeletedFiles: false,
      concurrency: 'parallel',
      maxParallel: 10,
    },
  },
  'manual-reindex': {
    type: 'manual',
    priority: 'high',
    action: {
      embedUnchanged: true,
      embedDeletedFiles: true,
      concurrency: 'parallel',
      maxParallel: 20,
    },
  },
};
```

---

## 7. BACKWARD COMPATIBILITY

### Version Schema

```typescript
interface EmbeddingSchemaVersion {
  version: string;             // Semantic version (e.g., '1.0.0', '1.1.0')
  vectorFormat: 'float32';   // Float32 format for vectors
  metadataFormat: 'json';   // JSON format for metadata
  supportedModels: string[];  // List of supported model IDs
  deprecationDate?: Date;      // If deprecated, when it will be removed
  migrationPath?: string;      // Migration script to use
}

const SCHEMA_VERSIONS: EmbeddingSchemaVersion[] = [
  {
    version: '1.0.0',
    vectorFormat: 'float32',
    metadataFormat: 'json',
    supportedModels: ['openai-large', 'openai-small'],
  },
  {
    version: '2.0.0',
    vectorFormat: 'float32',
    metadataFormat: 'json',
    supportedModels: ['openai-large', 'openai-small', 'local-all-minilm'],
    migrationPath: 'migration/v1-to-v2.ts',
  },
];
```

### Migration Path

```typescript
// migration/v1-to-v2.ts
export async function migrateV1toV2(): Promise<void> {
  console.log('[Migration] Starting v1 → v2 migration...');

  // 1. Backup existing data
  const existing = await db.codeEmbedding.findMany();

  // 2. Transform data if needed
  // (v1 and v2 are compatible, no transform needed)

  // 3. Update schema version
  // (Handled by schema update)

  // 4. Verify migration
  const migrated = await db.codeEmbedding.findMany();
  if (migrated.length !== existing.length) {
    throw new Error('Migration verification failed');
  }

  console.log(`[Migration] Migrated ${existing.length} embeddings successfully`);
}
```

---

## 8. INTEGRITY CHECKSUMS

### Checksum Algorithm

```typescript
interface EmbeddingChecksum {
  version: string;             // Checksum algorithm version
  algorithm: 'sha256';       // Always SHA-256
  contentHash: string;        // Hash of text content
  vectorHash: string;          // Hash of vector bytes
  metadataHash: string;       // Hash of metadata JSON
  combinedHash: string;        // Combined hash of all above
  timestamp: Date;
}

function computeEmbeddingChecksum(embedding: any): EmbeddingChecksum {
  const contentHash = crypto.createHash('sha256')
    .update(embedding.text)
    .digest('hex');

  const vectorHash = crypto.createHash('sha256')
    .update(embedding.vector)
    .digest('hex');

  const metadata = JSON.stringify({
    dimensions: embedding.dimensions,
    model: embedding.model,
    createdAt: embedding.createdAt,
  });

  const metadataHash = crypto.createHash('sha256')
    .update(metadata)
    .digest('hex');

  const combinedHash = crypto.createHash('sha256')
    .update(contentHash)
    .update(vectorHash)
    .update(metadataHash)
    .digest('hex');

  return {
    version: '1.0.0',
    algorithm: 'sha256',
    contentHash,
    vectorHash,
    metadataHash,
    combinedHash,
    timestamp: new Date(),
  };
}
```

---

## 9. API CONTRACT

### Search API

```typescript
interface SearchRequest {
  query: string;               // Search query text
  topK?: number;              // Number of results (default: 10)
  threshold?: number;        // Min similarity (default: 0.7)
  projectId: string;
  filters?: {
    fileTypes?: string[];      // Filter by file extensions
    excludePatterns?: string[]; // Exclude certain files
  };
}

interface SearchResponse {
  results: SearchResult[];
  totalCandidates: number;     // Total candidates before filtering
  searchTimeMs: number;       // Search execution time
  usedIndexVersion?: string; // Index version used
}

interface SearchResult {
  filePath: string;
  chunkId?: string;
  text: string;
  similarity: number;         // Cosine similarity score
  metadata: {
    model: string;
    dimensions: number;
    createdAt: Date;
  };
}
```

### Generate API

```typescript
interface GenerateRequest {
  filePath: string;
  projectId: string;
  options?: {
    chunkSize?: number;        // Custom chunk size (default: from settings)
    overlap?: number;          // Overlap between chunks (default: 50)
    model?: string;            // Override model (default: active model)
  };
}

interface GenerateResponse {
  embeddings: Embedding[];
  versionId: string;          // Embedding version ID
  generateTimeMs: number;     // Total generation time
  tokensUsed: number;         // Total tokens consumed
  cost: number;               // Total cost in USD
}

interface Embedding {
  filePath: string;
  chunkId: string;
  chunkIndex: number;
  chunkCount: number;
  text: string;
  vector: number[];           // Embedding vector
  metadata: {
    model: string;
    dimensions: number;
    createdAt: Date;
  };
}
```

---

## 10. SUCCESS CRITERIA

### Hard Proof Requirements

1. **Performance Proof**
   - [ ] Semantic search p95 < 300ms on ≥1M chunks
   - [ ] Index build p95 < 5min for 1M chunks
   - [ ] Embed generation p95 < 100ms per chunk
   - [ ] Memory usage < 5GB for 1M chunks

2. **Integrity Proof**
   - [ ] All embeddings have valid checksums
   - [ ] Checksum verification on every read
   - [ ] Detect and reject corrupted embeddings
   - [ ] Atomic swaps verified via checksum diffs

3. **Quota Proof**
   - [ ] Enforce max 1M embeddings limit
   - [ ] Enforce 100GB total size limit
   - [ ] Automatic eviction at 90% capacity
   - [ ] Cleanup old embeddings after 90 days
   - [ ] Log all evictions for audit trail

4. **Versioning Proof**
   - [ ] Track all embedding versions
   - [ ] Support model upgrades with re-embedding
   - [ ] Maintain max 3 versions per project
   - [ ] Migration scripts for schema changes
   - [ ] Backward compatibility for 2 schema versions

5. **Error Handling Proof**
   - [ ] Retry on network errors (3 attempts)
   - [ ] Exponential backoff for rate limits
   - [ ] Graceful degradation on failures
   - [ ] Detailed error logging with trace IDs
   - [ ] Circuit breaker for cascading failures

---

**Document Status:** PROVISIONAL - Pending Implementation
**Target Delivery:** Week 2 (2025-01-XX)
**Dependencies:** IndexBuilder (Week 1) - Complete
**Next Steps:**
1. Implement EmbeddingGenerator with OpenAI integration
2. Implement VectorStorage with SQLite BLOB backend
3. Implement SimilaritySearch with HNSW (or fallback to brute force)
4. Implement EmbeddingVersionManager for version tracking
5. Implement QuotaManager for growth control
6. Run benchmarks and collect machine-verifiable evidence
