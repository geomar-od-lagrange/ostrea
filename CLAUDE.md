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

## Kubernetes Testing (kind)

Use a temp directory for kind binary:
```bash
KIND_DIR=$(mktemp -d)
curl -Lo "$KIND_DIR/kind" https://kind.sigs.k8s.io/dl/v0.27.0/kind-darwin-arm64
chmod +x "$KIND_DIR/kind"
```

Create cluster and load images:
```bash
$KIND_DIR/kind create cluster --name oysters
docker compose build
$KIND_DIR/kind load docker-image 2024_hex_dashboard-frontend:latest \
  2024_hex_dashboard-api:latest 2024_hex_dashboard-db-init:latest --name oysters
```

Deploy and access:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/ -n 2024-hex-dashboard
kubectl port-forward svc/nginx 5173:5173 -n 2024-hex-dashboard &
# Dashboard at http://localhost:5173/
```

Cleanup:
```bash
$KIND_DIR/kind delete cluster --name oysters
rm -rf "$KIND_DIR"
```
