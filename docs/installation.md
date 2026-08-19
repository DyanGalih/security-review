# Installation Guide

`security-review` is distributed as both an **installable developer CLI & agent toolkit** and a **Spec-Kit extension**.

## 1. Prerequisites

- **Node.js**: `>= 22.0.0`
- **Git**: Installed and available in `$PATH`

---

## 2. Developer CLI & Agent Toolkit (Standalone)

### Global Installation

```bash
# Using npm
npm install -g security-review

# Using pnpm
pnpm add -g security-review
```

### Instant Execution with npx

```bash
# Staged changes review for current commit
npx security-review diff --staged

# Discover security entrypoints
npx security-review scan

# Validate report metadata against schema
npx security-review validate path/to/report.md
```

---

## 2. Install as Spec-Kit Extension

In the Spec-Kit workflow, the `specify` CLI installs and manages extensions, and the installed commands are executed directly from your AI agent session.

### From Catalog / Registry
```bash
cd /path/to/spec-kit-project
specify extension add security-review
```

### From GitHub Release
```bash
specify extension add security-review --from \
  https://github.com/DyanGalih/security-review/archive/refs/tags/v2.0.0.zip
```

### Local Development Link
```bash
git clone https://github.com/DyanGalih/security-review.git ~/src/security-review
cd /path/to/spec-kit-project
specify extension add --dev ~/src/security-review/src
```

---

## 3. Verify Installation

Check CLI availability:
```bash
security-review --version
# or
sec-review --version
# or
sr --version
```

Check Spec-Kit extension registration:
```bash
specify extension list
```

---

## Related Documentation
- [Main README](../README.md)
- [CLI Reference](cli-reference.md)
- [Agent Skills](agent-skills.md)
- [Spec-Kit Extension Guide](speckit-extension.md)
