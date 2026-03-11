# Technical Specification: General Project Prompt File

## Technical Context
- **Languages**: Markdown
- **Project Scope**: Entire monorepo (`backend`, `frontend`, `super-admin`)
- **Dependencies**: None (self-contained document)

## Task Difficulty: Easy
- Straightforward consolidation of existing documentation and repository structure.

## Implementation Approach
Create a single, highly-readable markdown file (`PROJECT_PROMPT.md`) at the repository root that serves as a comprehensive "context injection" for AI agents or developers. This file will consolidate:
1.  **High-Level Overview**: Mission and purpose of Vetora (Talkcart).
2.  **Architecture Map**: Detailed directory structure of the monorepo.
3.  **Unified Tech Stack**: Frontend, Backend, and Admin technologies in one view.
4.  **Core Feature Set**: Social, Marketplace, Messaging, and Web3 capabilities.
5.  **Data & API Surface**: Critical models and endpoint patterns.
6.  **Security Protocols**: Auth flow, JWT, and Biometric details.
7.  **Ops & Deployment**: Startup commands and environment requirements.

## Source Code Structure Changes
- **New File**: `PROJECT_PROMPT.md` at the root directory.

## Data Model / API / Interface Changes
- None. This is a documentation-only task.

## Verification Approach
1.  **Completeness**: Verify that every major component (Backend, Frontend, Super Admin) is fully represented.
2.  **Accuracy**: Cross-reference path names and scripts with `package.json` files and physical directory structure.
3.  **Readability**: Ensure the markdown is well-structured for AI parsing and human reading.
