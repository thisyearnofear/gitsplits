# GitSplits Platform Vision

## Current: GitSplits Core

Autonomous agent for compensating open source contributors via Farcaster.

```
User → @gitsplits → Analyze repo → Pay contributors
```

## Expanded: Verifiable Compute Platform

EigenCompute-powered agents for sensitive operations that require trust.

### Use Case 1: GitSplits (Original)
**What:** Pay open source contributors  
**Why:** Fair compensation, transparent splits  
**Input:** GitHub repo URL  
**Output:** Payment distribution  
**Interface:** Farcaster

### Use Case 2: Private Code Review (New)
**What:** Security audit without exposing code  
**Why:** Teams need audits but can't share IP  
**Input:** Private codebase upload  
**Output:** Audit report (backdoors, exploits)  
**Interface:** Web UI

### Use Case 3: Private Security Agent (New)
**What:** Continuous security monitoring  
**Why:** Ongoing audits without IP exposure  
**Input:** Codebase + update stream  
**Output:** Security alerts, reports  
**Interface:** API + Dashboard

## Shared Infrastructure

All use cases share:

```
┌─────────────────────────────────────────┐
│         EigenCloud EigenCompute          │
│  - TEE container with attestation        │
│  - Chain signatures for verification     │
│  - AVS backing for slashing              │
└─────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌────────┐    ┌────────┐    ┌────────┐
│GitSplits│    │Private │    │Security│
│ Agent   │    │Reviewer│    │ Agent  │
│         │    │        │    │        │
│Farcaster│    │Web UI  │    │API     │
│interface│    │upload  │    │access  │
└────────┘    └────────┘    └────────┘
```

## Hackathon Strategy

### Option A: Stay Focused (Recommended)
**Scope:** GitSplits only  
**Pros:** Higher quality, complete demo, clear story  
**Cons:** Single use case  
**Timeline:** Achievable by Feb 16

### Option B: Expand Scope
**Scope:** GitSplits + Private Code Review  
**Pros:** Bigger vision, multiple demos, platform play  
**Cons:** Risk of incomplete features, diluted focus  
**Timeline:** Tight but possible

### Option C: Platform Teaser
**Scope:** GitSplits core + "coming soon" for security  
**Pros:** Shows vision without building everything  
**Cons:** Less impressive than working demos

## Recommendation

**Go with Option A (Stay Focused) but architect for expansion:**

1. **Build GitSplits solid** - working end-to-end by Feb 16
2. **Design agent framework modularly** - easy to add new use cases
3. **Document the platform vision** - show judges the bigger picture
4. **Post-hackathon:** Expand to security use cases

**Why:**
- Hackathon judges value working demos over vision
- Incomplete features hurt more than big ideas help
- GitSplits alone is a strong, complete product
- EigenCloud sponsor alignment is already strong with GitSplits

**Compromise:** Add a "Platform" section to docs showing how GitSplits is the first of many verifiable compute agents.
