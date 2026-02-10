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
- **Temporary tools**: Use `mktemp -d` for one-off binaries (kind, kompose, etc.), not plain /tmp

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

## Kubernetes Testing

The Helm chart (`helm/ostrea`) supports both vanilla K8s (kind) and OpenShift (MicroShift).
Images are pulled from Quay.io (`quay.io/willirath/ostrea`).

See docs:
- [docs/image-building.md](docs/image-building.md) - Building and pushing images
- [docs/kind-deployment-test.md](docs/kind-deployment-test.md) - kind deployment (vanilla K8s)
- [docs/microshift-setup.md](docs/microshift-setup.md) - MicroShift cluster setup
- [docs/microshift-deployment-test.md](docs/microshift-deployment-test.md) - MicroShift deployment

Quick access after deployment: **http://localhost:5173/**
