# Nova Router — Current Status

## Completed
- Multi-agent routing is active
- Agents:
  - nova-stepfun -> reasoning/planning
  - nova-deepseek -> simple code
  - nova-codex -> critical code
- Health cache is implemented
- Router decision logging is implemented
- Feedback logging is implemented
- Stats reporting is implemented
- Confidence reporting is implemented
- Preferred vs actual agent tracking is implemented
- Fallback tracking structure is implemented
- Router workspace issue for nova-codex was fixed by removing the stale local workspace override

## Confirmed working
- StepFun can inspect the real VORTEX repo
- DeepSeek can inspect the real VORTEX repo
- Codex can now inspect the real VORTEX repo path correctly
- run-task.sh executes router -> selected agent -> feedback -> stats flow

## Not yet complete
- Failure classification is still too broad
- Wrapper/runtime failures can still pollute learning stats
- Confidence is still cold-start only and not mature enough for adaptive routing
- Learning is logging-based, not yet true adaptive self-improvement
- No protected exclusion rules yet for invalid samples

## Rules for valid learning samples
A run should count as a valid learning sample only if:
1. router returned valid JSON
2. selected agent actually ran
3. output file is non-empty
4. result was not caused by wrapper/tooling failure
5. result was not caused by manual cancel
6. result was not caused by local shell command failure
7. result was not caused by missing timeout utility

## Pause point
The router memory/self-learning subsystem is now paused after cleanup.
Next major work should wait until Codex is available again.

## Next step when Codex is back
- improve adaptive routing logic
- improve critical-code evaluation
- integrate learning into real routing decisions
- continue VORTEX core implementation tasks
