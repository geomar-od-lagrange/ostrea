# Claude Code MO

## ⚠️ CRITICAL POLICIES

1. **NEVER PUSH TO REMOTE** - User pushes manually
2. **NO CO-AUTHORSHIP TAGS** - No `Co-Authored-By:` lines

## Planning & Documentation
- Normal mode with markdown files (not plan mode)
- Detailed planning in `plans/<topic>-NN-<stage>.md`
- Format: `<2-3 word topic>-<00..99>-<stage-name>`
- Move completed rounds to `plans/done/`
- Add `YOUR QUESTIONS/NOTES:` fields for user input
- **Find current work:** Check `plans/` for most recent `<topic>-NN-*.md` (highest NN), or ask user

## Git Workflow
- Simple one-line commit messages
- Commit frequently to local branch
- Breaking changes OK (WIP)
- Heredoc only when truly needed

## Development Environment
- **pixi global**: CLI tools (gh, jq, codex)
- **pixi local** (database/): Python deps only
- Don't add system tools to project pixi

## GitHub Integration
```bash
gh api repos/OWNER/REPO/pulls/N/comments  # Line comments
gh api repos/OWNER/REPO/pulls/N/reviews   # Reviews
```

## Quick Commands
```bash
docker compose up -d    # Start
docker compose down     # Stop
```
