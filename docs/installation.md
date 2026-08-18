# Installation Guide

`@speckit/security-review` is distributed as both an **installable developer CLI & agent toolkit** and a **Spec-Kit extension**.

---

## 1. Install as Developer CLI (npm / npx)

The CLI tool acts as a local accelerator for security reviews, providing fast git diff extraction, security entrypoint discovery, YAML frontmatter validation, and token-optimized context formatting for AI agents.

### Global Installation
```bash
npm install -g @speckit/security-review
# or
pnpm add -g @speckit/security-review
```

### Run via npx (Zero Install)
```bash
# Analyze staged git changes
npx @speckit/security-review diff --staged

# Scan project for security entrypoints
npx @speckit/security-review scan

# Validate report frontmatter
npx @speckit/security-review validate path/to/report.md
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
  https://github.com/DyanGalih/spec-kit-security-review/archive/refs/tags/v1.7.0.zip
```

### Local Development Link
```bash
git clone https://github.com/DyanGalih/spec-kit-security-review.git ~/src/spec-kit-security-review
cd /path/to/spec-kit-project
specify extension add --dev ~/src/spec-kit-security-review
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
