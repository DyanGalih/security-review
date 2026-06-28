# Installation Guide

This guide follows the Spec-Kit extension development workflow from the upstream Extension Development Guide. In that workflow, the `specify` CLI installs and manages extensions, and the installed commands are then executed from your AI agent.

- `/speckit.security-review.audit` reviews the full project
- `/speckit.security-review.staged` reviews staged changes only
- `/speckit.security-review.branch` reviews a branch, pull request, or merge request diff
- `/speckit.security-review.plan` reviews the implementation plan and design artifacts
- `/speckit.security-review.tasks` reviews the generated task list and sequencing
- `/speckit.security-review.followup` turns findings into remediation tasks or technical debt
- `/speckit.security-review.apply` applies approved security follow-ups into the local Spec-Kit planning artifacts

## Prerequisites

Before installing the extension, make sure you have:

- A working Spec-Kit project
- The `specify` CLI available in your shell
- An agent environment that reads registered Spec-Kit slash commands

Verify the CLI is available:

```bash
specify --version
```

## Install from the Community Catalog

If your Spec-Kit catalog includes the community extension, install it directly by name:

```bash
cd /path/to/spec-kit-project

specify extension add security-review
```

## Install from a Release Archive

Use this when you want a pinned version from a tagged release.

```bash
cd /path/to/spec-kit-project

specify extension add security-review --from \
  https://github.com/DyanGalih/spec-kit-security-review/archive/refs/tags/v1.6.1.zip
```

## Install a Local Checkout for Development

Use this when you are iterating on the extension itself.

```bash
git clone https://github.com/DyanGalih/spec-kit-security-review.git ~/src/spec-kit-security-review

cd /path/to/spec-kit-project
specify extension add --dev ~/src/spec-kit-security-review
```

The `--dev` flag matches the upstream development flow and keeps the extension linked to your working copy.

## Verify Installation

List installed extensions:

```bash
specify extension list
```

Check that the agent command was registered:

```bash
ls .claude/commands/speckit.security-review.*
cat .specify/extensions/.registry
```

## Run the Command

After installation, open your agent session from the same project and run the full-project audit:

```text
/speckit.security-review.audit
```

You can also provide natural-language scoping input:

```text
/speckit.security-review.audit focus on auth, secrets, and dependency risk
/speckit.security-review.audit review only the backend and infra directories
```

If you only want to review staged changes or a branch, pull request, or merge request diff, use the `staged` or `branch` command instead.

If you want a secure-by-design planning flow, run `/speckit.security-review.plan` after `/speckit.plan`, `/speckit.security-review.tasks` after `/speckit.tasks`, and `/speckit.analyze` before `/speckit.implement` when you want the upstream Spec-Kit cross-artifact check.
After a review run, use `/speckit.security-review.followup` to turn findings into tasks or technical debt items, especially when you want to carry incomplete findings into the next implementation cycle.
If you want those approved items written back into the project, use `/speckit.security-review.apply` afterward.

## Optional Project Review Template

This repository includes [config-template.yml](../config-template.yml) as an optional team brief template. The extension does not load this file automatically, so treat it as a human-readable convention and include the relevant settings in your command input when you want the agent to follow them.

Example:

```bash
cp /path/to/spec-kit-security-review/config-template.yml ./speckit-security.yml
```

Then call the command with that context in mind:

```text
/speckit.security-review.audit use the settings from speckit-security.yml as the review brief
```

## Flash-Mem / Memory Context

If your Spec-Kit project already uses repository-native memory artifacts, include them in the context for the full-project audit and for branch, pull request, or merge request diff reviews.

The extension is intended to work with flash-mem as the primary design context layer:

- Durable memory from `docs/memory/`
- Active feature memory from `specs/<feature>/memory.md`
- Concise working summaries from `specs/<feature>/memory-synthesis.md`
- Copilot instructions from `.github/copilot-instructions.md`

If you install [flash-mem](https://github.com/DyanGalih/flash-mem), these artifacts give the security review more project-specific context without changing the extension workflow.

If `flash-mem` is not available, install [spec-kit-memory-hub](https://github.com/DyanGalih/spec-kit-memory-hub) as the compatibility path for the same review flow.

When the memory context and the current implementation diverge, call that out explicitly in the review.

The same memory context also applies to plan, task, and follow-up review commands, which should check whether the planned work still matches the intended secure design before implementation begins.

## Remove the Extension

The upstream guide uses `remove`, not `uninstall`.

```bash
cd /path/to/spec-kit-project
specify extension remove security-review
```

## Troubleshooting

### Extension Does Not Appear in `specify extension list`

Reinstall from the project root:

```bash
cd /path/to/spec-kit-project

specify extension add security-review
```

### Command Is Not Available in the Agent

Check registration artifacts:

```bash
ls .claude/commands/
cat .specify/extensions/.registry
```

If `speckit.security-review.audit` is missing, remove and reinstall the extension.

### Local Development Changes Are Not Reflected

Re-run the local development install from the Spec-Kit project:

```bash
cd /path/to/spec-kit-project
specify extension add --dev /path/to/spec-kit-security-review
```

### Review Scope Is Too Broad

Pass narrower instructions as command input instead of CLI flags:

```text
/speckit.security-review.audit review only authentication flows
/speckit.security-review.audit focus on OWASP Top 10 and payment processing
```

If the scope should be limited to changes only, switch to `/speckit.security-review.staged` or `/speckit.security-review.branch`.

## Next Steps

1. Run [usage.md](usage.md) for command examples.
2. Review [../examples/example-output.md](../examples/example-output.md) for report structure.
3. If you are developing the extension, use the upstream guide for manifest, command-file, and packaging conventions.
