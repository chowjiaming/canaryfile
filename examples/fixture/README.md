# canaryfile fixture

Try canaryfile in 2 minutes. This is a zero-dependency repo with
three known bugs pinned on branches (`fixture/*`). Each canaryfile
task checks out a bug branch in an isolated worktree and asks your
agent to fix it.

git clone <you>/canaryfile && cd canaryfile/examples/fixture
npm i -g canaryfile
canaryfile record --tag smoke   # baseline: green table
# now edit canaryfile.yaml — change the model
canaryfile test --tag smoke     # watch the regression row appear

`main` is always green: every task's verifiers pass here, which is
how you verify "no regression" is reported correctly.