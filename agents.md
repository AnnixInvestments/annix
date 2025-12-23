# Agent Guidelines

This document provides guidance for AI code assistants working in this repository.

## ⚠️ CRITICAL RULES - READ FIRST

These rules MUST be followed in EVERY session without exception:

### 1. NO CODE COMMENTS
- **NEVER add comments to code** - use self-documenting method names instead
- This includes `//`, `/* */`, and any explanatory text in code
- Avoid sprinkling comments into the source. Favor self-documenting functions, descriptive names, and clean structure.
- When additional context is needed, update this file (or other prompt infrastructure) instead of writing comments directly in code.

### 2. NO AI ATTRIBUTION IN COMMITS
- **NEVER add AI attribution to commit messages**
- This means NO:
    - `🤖 Generated with [Claude Code](https://claude.ai/code)`
    - `Co-Authored-By: Claude <noreply@anthropic.com>`
    - Any similar AI tool attribution lines
- Commits should appear as if written by a human developer
- 

