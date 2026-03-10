#!/usr/bin/env bash
set -euo pipefail

# Push the entire Socius monorepo in one go
# Usage:
#   scripts/push-all.sh [type] [subject] [body]
# Examples:
#   scripts/push-all.sh chore "sync all apps" "Update Admin/App/Backend together"
#   scripts/push-all.sh feat "new feature" "Add changes across projects"

root_dir=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ -z "${root_dir}" ]]; then
  echo "Not inside a git repository" >&2
  exit 1
fi
cd "${root_dir}"

current_branch=$(git branch --show-current)
if [[ -z "${current_branch}" ]]; then
  echo "Unable to determine current branch" >&2
  exit 1
fi

type=${1:-chore}
subject=${2:-"push all projects together"}
body=${3:-"Stage entire monorepo: SociusAdmin, SociusApp, SociusBackendApi"}

echo "Branch: ${current_branch}"
echo "Fetching remote..."
git fetch origin "${current_branch}" || true

echo "Staging all changes (respecting .gitignore)..."
git add -A

# Ensure no .env files are staged accidentally
staged_env_files=$(git diff --cached --name-only | grep -E '\\.env(\\.|$)' || true)
if [[ -n "${staged_env_files}" ]]; then
  echo "Unstaging .env files for safety:" ${staged_env_files}
  git restore --staged ${staged_env_files}
fi

# If nothing to commit, exit gracefully
if git diff --cached --quiet; then
  echo "No changes staged. Nothing to commit or push."
  exit 0
fi

echo "Committing with Conventional Commit: ${type}: ${subject}"
git commit -m "${type}(repo): ${subject}" -m "${body}"

echo "Pushing to origin/${current_branch}..."
git push -u origin "${current_branch}"

echo "Done."

