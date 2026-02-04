# Week 1 Hard Proof Remediation - Crash-Safe Indexing Benchmark Fix

## Requirement Scenario Specific Processing Logic
Fix the rejected WEEK1_HARD_PROOF_BUNDLE.json to meet all core acceptance criteria:
1. **Resume Guarantee**: All scales (1K/10K/50K/100K) must show 100% successful resume status with verified pre/post checksum equality
2. **Latency Proof**: Must provide non-zero, timestamp-derived latency distribution data
3. **Integration Parity**: Must compute (not skip) integration parity with zero mismatches
4. **Forced-Kill Coverage**: Each scale must include ≥10 randomized forced kills
5. **Negative Path Enforcement**: Must show deterministic failure when protections are disabled

## Architecture Technical Solution
### Core Fix Components
1. **Real Forced-Kill Injector** - Actually inject exceptions in IndexBuilder.processBatch
2. **Checksum Verification System** - Real SHA-256 checksums based on database state
3. **Latency Measurement System** - Precise timing using performance.now()
4. **Integration Validator** - Compare actual file system vs database file lists
5. **Negative Path Tester** - Verify actual enforcement of protection mechanisms

### Data Flow Path
```
Forced-Kill Injection → Pre-Kill State Capture → Exception Throw → Process Crash Simulation
     ↓
Checkpoint Recovery → Post-Resume State Capture → Checksum Verification → Latency Measurement
     ↓
Integration Verification → Performance Metrics Aggregation → Hard Evidence Generation
```

## Impacted Files
### Modification Type: Fixes and Enhancements
- `scripts/hard-proof-benchmark.ts` - Complete rewrite of core logic
- `src/lib/code-indexing/IndexBuilder.ts` - Enhanced forced-kill support
- `scripts/benchmark-crash-safe.ts` - Integrated real measurement functionality
- `prisma/schema.prisma` - Added checksum tracking fields (optional)

### Impacted Functions
1. **runRealBenchmark** - Implement real forced kills and resume
2. **processBatch wrapper** - Inject actual forced-kill exceptions
3. **captureDatabaseChecksum** - Calculate SHA-256 of database state
4. **verifyIntegrationParity** - Verify file system vs database consistency
5. **runNegativePathTest** - Implement real negative path testing

## Implementation Details
### Forced-Kill Injection Mechanism
```typescript
// Real forced-kill injection
(builder as any).processBatch = async (files: any[]) => {
  batchCounter++;
  
  // Inject forced kill every N batches
  if (shouldInjectKill(batchCounter)) {
    const killTime = performance.now();
    const traceId = crypto.randomUUID();
    
    // Capture pre-kill checksum
    const preChecksum = await captureDatabaseChecksum(projectId);
    
    // Record forced kill
    forcedKillLedger.push({
      traceId,
      batchId: batchCounter,
      killTimestamp: new Date(killTime).toISOString(),
      preChecksum,
      postChecksum: 'PENDING',
      resumeStatus: 'FAILED',
      resumeTimeMs: 0
    });
    
    // Record checkpoint save time
    rawLatencies.checkpoint.push(performance.now() - killTime);
    
    // Throw actual exception to simulate crash
    throw new Error(`FORCED_KILL_SIGNAL:${traceId}`);
  }
  
  return originalProcessBatch.call(builder, files);
};
```

### Checksum Verification System
```typescript
async function captureDatabaseChecksum(projectId: string): Promise<string> {
  const analyses = await db.fileAnalysis.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
  
  const dataToHash = analyses.map(a => ({
    filePath: a.filePath,
    summary: a.summary,
    analyzedAt: a.analyzedAt.toISOString(),
  }));
  
  return crypto.createHash('sha256')
    .update(JSON.stringify(dataToHash))
    .digest('hex');
}
```

### Latency Measurement System
```typescript
// Measure real resume time
const resumeStart = performance.now();
try {
  await builder.buildDatabaseIndex();
  const resumeEnd = performance.now();
  
  const resumeDuration = resumeEnd - resumeStart;
  rawLatencies.resume.push(resumeDuration);
  
  // Update forced kill ledger
  const entry = forcedKillLedger.find(e => e.traceId === traceId);
  if (entry) {
    entry.resumeStatus = 'SUCCESS';
    entry.resumeTimeMs = resumeDuration;
    entry.postChecksum = await captureDatabaseChecksum(projectId);
    entry.checksumMatch = entry.preChecksum === entry.postChecksum;
  }
} catch (error) {
  // Handle resume failure
}
```

## Boundary Conditions and Exception Handling
1. **Database Connection Failure** - Retry logic and graceful degradation
2. **Filesystem Permission Issues** - Special handling for Windows symlinks
3. **Memory Overflow Protection** - Chunked processing for large datasets
4. **Timeout Handling** - Timeout interrupts for long-running operations

## Expected Outcomes
1. **Compliant WEEK1_HARD_PROOF_BUNDLE.json**:
   - resumeStatus: "SUCCESS" for all forced kill entries
   - Real non-zero latency data (p50/p95/p99 > 0)
   - integrationParity.totalFiles > 0 and mismatches = 0
   - ≥10 forced kills per scale
   - Complete manifest information (disk type, FS, worker count, etc.)

2. **Machine-Verifiable Evidence**:
   - Timestamp-derived latency measurements
   - SHA-256 checksum equality proofs
   - Actual failure proof in negative path tests
