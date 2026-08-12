# canaryfile — Product Overview

## One-liner
Snapshot testing for your AI coding agent setup. Know when a model
upgrade, CLAUDE.md edit, or MCP change breaks your workflow — before
you merge it.

## The problem
Developers run CLI coding agents (Claude Code, Codex, Cursor CLI)
against their repos daily. The setup — model version, config files,
MCP servers, prompts — changes constantly, and behavior silently
degrades. There is no CI for "does my agent still work on MY repo."

## What it is
A CLI that:
1. Reads `canaryfile.yaml` — tasks defined as prompt + shell verifiers
2. Runs each task N times in isolated git worktrees via an agent adapter
3. Records pass rates, cost, tokens as a committed snapshot
4. On `canaryfile test`, re-runs and fails (exit 1) when pass rates
   regress beyond statistical noise (Wilson score intervals)

## Positioning (read before writing any marketing copy)
- NOT a benchmark leaderboard (Artificial Analysis owns that)
- NOT an agent-builder eval framework (agentrial, promptfoo own that —
  they test agent CODE with LLM judges; we test agent SETUP with shell
  verifiers)
- NOT a trace snapshotter (agentsnap et al. diff tool-call traces;
  we grade real-world task outcomes)
- We are: regression testing for people who USE coding agents.
  Analogy: Jest snapshots / CI gates, for agent behavior on your repo.

## Hard requirements
- Verifiers are deterministic shell commands (exit codes). No LLM
  judges in v1.
- Every run is isolated (git worktree). Never touch the user's
  working tree.
- Budget caps are first-class. Exceeding budget = exit code 3.
- Snapshots are plain JSON, committed to git, diffable in PRs.
- Single-command install: `npm i -g canaryfile`

## Non-goals (v1)
- No hosted dashboard, no accounts, no telemetry
- No LLM-as-judge grading
- No Windows-native support (WSL only)
- No GUI