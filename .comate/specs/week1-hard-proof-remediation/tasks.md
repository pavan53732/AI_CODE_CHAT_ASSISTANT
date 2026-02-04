# Week 1 Hard Proof Remediation - Complete Implementation Plan

- [x] Task 1: Rewrite hard-proof-benchmark.ts with real forced-kill injection
    - 1.1: Replace simulated forced kills with actual exception injection in processBatch wrapper
    - 1.2: Implement real timestamp-based latency measurement using performance.now()
    - 1.3: Add proper database checksum capture and verification logic
    - 1.4: Ensure ≥10 randomized forced kills per dataset scale
- [x] Task 2: Enhance IndexBuilder for proper crash-safety support
    - 2.1: Add proper exception handling for forced-kill signals
    - 2.2: Implement checkpoint state validation before resume attempts
    - 2.3: Add transaction rollback safety for interrupted batches
    - 2.4: Ensure proper cleanup between benchmark runs

- [x] Task 3: Implement real integration parity verification
    - 3.1: Create filesystem vs database comparison logic
    - 3.2: Handle Windows symlink limitations with proper detection
    - 3.3: Ensure totalFiles > 0 and mismatches = 0 for all scales
    - 3.4: Add proper error handling for file system operations

- [x] Task 6: Final validation and evidence generation
    - 6.1: Run full benchmark suite across all scales (1K/10K/50K/100K)
    - 6.2: Verify all forced kills result in successful resumes
    - 6.3: Confirm checksum equality for all kill/resume cycles
    - 6.4: Generate final WEEK1_HARD_PROOF_BUNDLE.json with complete evidence