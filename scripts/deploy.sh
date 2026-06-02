#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${SITE_URL:-https://kaareke.dataleaper.com}"
REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-gh-pages}"
WORKTREE_DIR="${WORKTREE_DIR:-/tmp/kaareke-gh-pages}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$REPO_ROOT/build"
SOURCE_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo "initial")"
DEPLOY_MARKER="$(date -u +%Y%m%dT%H%M%SZ)-$SOURCE_SHA"

cd "$REPO_ROOT"

cleanup() {
  git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "Building frontend"
npm run build

echo "Preparing $BRANCH worktree at $WORKTREE_DIR"
rm -rf "$WORKTREE_DIR"

# Ensure remote branch exists or fetch it, or create locally
if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  if git fetch "$REMOTE" "$BRANCH" >/dev/null 2>&1; then
    echo "Fetched remote branch $BRANCH"
  else
    echo "Checking if branch needs creation..."
    # If there's no remote repository configured or accessible, we log a warning but proceed locally
    if git remote | grep -q "$REMOTE"; then
      git checkout -b "$BRANCH"
      git commit --allow-empty -m "Initial $BRANCH commit"
      git push "$REMOTE" "$BRANCH" || true
      git checkout -
    else
      echo "No remote $REMOTE found. Doing local deployment prep."
    fi
  fi
fi

# Fetch branch and create worktree
if git remote | grep -q "$REMOTE"; then
  git fetch "$REMOTE" "$BRANCH"
  git worktree add --detach "$WORKTREE_DIR" "FETCH_HEAD"
else
  # Fallback for pure local testing/init where no remote push is set up
  if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
    git checkout --orphan "$BRANCH"
    git rm -rf .
    git commit --allow-empty -m "Initial $BRANCH commit"
    git checkout -
  fi
  git worktree add --detach "$WORKTREE_DIR" "$BRANCH"
fi

echo "Copying build output"
find "$WORKTREE_DIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$BUILD_DIR"/. "$WORKTREE_DIR"/
printf '%s\n' "$DEPLOY_MARKER" > "$WORKTREE_DIR/deploy-version.txt"

cd "$WORKTREE_DIR"
git add .

if git diff --cached --quiet; then
  echo "No frontend changes to deploy"
  exit 0
fi

git commit -m "Deploy Kaareke"
DEPLOY_SHA="$(git rev-parse HEAD)"

if git remote | grep -q "$REMOTE"; then
  echo "Pushing changes to $REMOTE ($BRANCH)..."
  git push "$REMOTE" "HEAD:$BRANCH"
else
  echo "No remote configured. Commited locally to branch $BRANCH at $DEPLOY_SHA."
fi

cd "$REPO_ROOT"
echo "Frontend deployment complete!"
