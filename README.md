# canaryfile

> Snapshot testing for your AI coding agent.
> Know when a model upgrade, CLAUDE.md edit, or MCP change breaks
> your workflow — before you merge it.

[DEMO GIF: baseline green table → model change → red regression row]

## The problem

Your agent works great today. Tomorrow the model updates, someone
edits CLAUDE.md, an MCP server changes — and your workflow silently
degrades. There's no CI for that. Until now.

## Quickstart

npm i -g canaryfile
canaryfile init      # generates a commented canaryfile.yaml
canaryfile record    # run tasks, snapshot behavior + cost
canaryfile test      # re-run, exit 1 on regression

Try it against the demo fixture:

git clone <you>/canaryfile && cd canaryfile/examples/fixture
canaryfile record --tag smoke

## Example output

  canaryfile test — 3 tasks, 5 runs each, adapter claude-code
  snapshot: 2026-08-01 (model claude-sonnet-W)
  current:  model claude-sonnet-X  ← fingerprint changed

  TASK                    SNAPSHOT   CURRENT   COST     VERDICT
  fix-date-off-by-one     5/5        5/5       $0.31    pass
  add-health-endpoint     5/5        3/5       $0.44    warn
  refactor-logging        4/5        1/5       $0.52    FAIL

  1 regression, 1 warning. exit 1.

## How it works

1. Tasks are defined in `canaryfile.yaml`: a plain-English prompt +
   deterministic shell verifiers (exit codes — no LLM judges).
2. Each task runs N times in an isolated git worktree. Your working
   tree is never touched.
3. `canaryfile record` commits a snapshot (pass rates, cost, tokens)
   to your repo — review agent behavior changes in PRs.
4. `canaryfile test` compares against the snapshot using Wilson score
   intervals, so flaky single runs don't fail your build.
5. The GitHub Action gates PRs that touch CLAUDE.md, .mcp.json, or
   canaryfile.yaml.

## Supported agents

Claude Code · Codex · any CLI via the custom adapter

## How is this different from...?

The agent-eval space is crowded. Here's the honest map — the short
version: everyone else tests agent *code* or agent *traces*.
canaryfile tests *your setup* against *your repo*.

### vs. agentrial (and promptfoo, DeepEval, etc.)

agentrial is a great tool — for a different person. It's a pytest-style
framework for people *building* agents with Python frameworks
(LangGraph, CrewAI, Pydantic AI): you write test functions around your
agent's outputs, grade them with LLM judges, and iterate on your
agent's code.

canaryfile is for people *using* coding agents. You don't write Python
tests. You write YAML tasks in plain English, run them against your
actual repo with Claude Code / Codex / Cursor, and grade with
deterministic shell commands (`npm test` exits 0). The question isn't
"is my agent's output good?" — it's "did the model upgrade / CLAUDE.md
edit / MCP change I just made silently break my workflow?"

| | agentrial | canaryfile |
|---|---|---|
| Audience | agent builders | agent users |
| Subject | your agent's code | your agent + config + repo |
| Test definition | Python functions | YAML + plain-English prompts |
| Grading | LLM judges, trajectory evals | shell exit codes (deterministic) |
| Environment | your test harness | isolated git worktrees of your repo |
| Trigger | you changed your agent | the world changed under your agent |

If you're building an agent framework, use agentrial. If you spend
your day driving Claude Code and want CI to catch the day a model
update ruins your flow, use canaryfile.

### vs. agentsnap (and trace-snapshot tools)

Trace snapshotters record an agent's tool-call sequence and diff it
run-over-run. That answers "did the agent do the same *steps*?" —
useful for debugging agent internals, but brittle as a regression
signal: there are many valid paths to a correct fix, and a different
transcript often means nothing.

canaryfile ignores the transcript entirely for verdicts. It checks
*outcomes*: does the test suite pass in the worktree after the agent
runs? The agent can take any path it likes. (Transcripts are still
saved under `.canaryfile/runs/` for debugging — they're just not the
grading signal.)

Steps are means. canaryfile tests ends.

### vs. benchmark leaderboards (Artificial Analysis, Terminal-Bench, …)

Leaderboards answer "which agent/model is best on average, on their
tasks." canaryfile answers "does MY setup still work on MY tasks, in
MY repo, with MY config?" A model can top every public leaderboard
and still regress on your codebase's conventions. Both are useful;
only one of them gates your PRs.

## Security model

Verifiers and service commands are arbitrary shell from your own
canaryfile.yaml — same trust model as npm scripts. Never run
canaryfile against untrusted code or with `pull_request_target`.

## License

MIT