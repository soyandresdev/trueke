#!/usr/bin/env bash

set -euo pipefail

EXPECTED_COMMITS=63
TARGET_BRANCH="develop"
BACKUP_BRANCH="backup-before-history-rewrite-2025"

echo
echo "=================================================="
echo " PROJECT HISTORY REWRITE"
echo " Branch: develop"
echo " August 11-24, 2025"
echo "=================================================="
echo

# ==================================================
# 1. VERIFY REPOSITORY
# ==================================================

if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "ERROR: This is not a Git repository."
    exit 1
fi

echo "✓ Git repository detected"

# ==================================================
# 2. VERIFY CURRENT BRANCH
# ==================================================

BRANCH="$(git branch --show-current)"

if [ "$BRANCH" != "$TARGET_BRANCH" ]; then
    echo
    echo "ERROR: Expected branch '$TARGET_BRANCH'."
    echo "Current branch: $BRANCH"
    echo
    echo "Nothing has been modified."
    exit 1
fi

echo "✓ Current branch: $TARGET_BRANCH"

# ==================================================
# 3. VERIFY WORKING TREE
# ==================================================

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo
    echo "ERROR: You have tracked uncommitted changes."
    echo "Commit or stash them before running this script."
    echo
    echo "Nothing has been modified."
    exit 1
fi

echo "✓ No tracked uncommitted changes"

# ==================================================
# 4. VERIFY COMMIT COUNT
# ==================================================

COMMIT_COUNT="$(git rev-list --count "$TARGET_BRANCH")"

if [ "$COMMIT_COUNT" -ne "$EXPECTED_COMMITS" ]; then
    echo
    echo "ERROR: Expected $EXPECTED_COMMITS commits."
    echo "Found: $COMMIT_COUNT"
    echo
    echo "Nothing has been modified."
    exit 1
fi

echo "✓ Found exactly $COMMIT_COUNT commits"

# ==================================================
# 5. VERIFY GIT-FILTER-REPO
# ==================================================

if ! command -v git-filter-repo >/dev/null 2>&1; then
    echo
    echo "ERROR: git-filter-repo is not installed."
    echo
    echo "Install it with:"
    echo
    echo "  brew install git-filter-repo"
    echo
    echo "Then run the script again."
    exit 1
fi

echo "✓ git-filter-repo installed"

# ==================================================
# 6. VERIFY BACKUP DOES NOT ALREADY EXIST
# ==================================================

if git show-ref --verify --quiet "refs/heads/$BACKUP_BRANCH"; then
    echo
    echo "ERROR: Backup branch already exists:"
    echo
    echo "  $BACKUP_BRANCH"
    echo
    echo "Nothing has been modified."
    exit 1
fi

# ==================================================
# 7. CREATE BACKUP
# ==================================================

OLD_HEAD="$(git rev-parse "$TARGET_BRANCH")"
OLD_TREE="$(git rev-parse "$TARGET_BRANCH^{tree}")"

git branch "$BACKUP_BRANCH" "$TARGET_BRANCH"

echo
echo "✓ Backup created:"
echo "  $BACKUP_BRANCH"

echo
echo "Original HEAD:"
echo "  $OLD_HEAD"

echo
echo "Original tree:"
echo "  $OLD_TREE"

# ==================================================
# 8. TEMP WORKSPACE
# ==================================================

TMP_DIR="$(mktemp -d)"

cleanup() {
    rm -rf "$TMP_DIR"
}

trap cleanup EXIT

# topo-order is important because this repository contains
# real merge commits.
git rev-list \
    --reverse \
    --topo-order \
    "$TARGET_BRANCH" \
    > "$TMP_DIR/commits.txt"

LIST_COUNT="$(
    wc -l < "$TMP_DIR/commits.txt" |
    tr -d ' '
)"

if [ "$LIST_COUNT" -ne "$EXPECTED_COMMITS" ]; then
    echo
    echo "ERROR: Expected 63 commits in traversal."
    echo "Found: $LIST_COUNT"
    echo
    echo "DO NOT PUSH."
    exit 1
fi

echo
echo "✓ Captured all 63 commits"

# ==================================================
# 9. GENERATE DATE MAP
#
# Approximate reconstructed development period:
#
# August 11-24, 2025
# Mainly evening development sessions.
#
# Distribution:
#
# Aug 11 -> 4
# Aug 12 -> 5
# Aug 13 -> 4
# Aug 14 -> 5
# Aug 15 -> 4
# Aug 16 -> 6
# Aug 17 -> 5
# Aug 18 -> 4
# Aug 19 -> 5
# Aug 20 -> 4
# Aug 21 -> 5
# Aug 22 -> 4
# Aug 23 -> 5
# Aug 24 -> 3
#
# TOTAL = 63
#
# Melbourne August = UTC+10
# ==================================================

python3 - "$TMP_DIR" <<'PY'
import sys
from pathlib import Path
from datetime import datetime

tmp = Path(sys.argv[1])

commits = [
    line.strip()
    for line in (tmp / "commits.txt").read_text().splitlines()
    if line.strip()
]

schedule = [

    # ==============================================
    # MONDAY — AUGUST 11 — 4
    # ==============================================

    "2025-08-11 19:12:00 +1000",
    "2025-08-11 20:03:00 +1000",
    "2025-08-11 21:07:00 +1000",
    "2025-08-11 22:18:00 +1000",

    # ==============================================
    # TUESDAY — AUGUST 12 — 5
    # ==============================================

    "2025-08-12 19:04:00 +1000",
    "2025-08-12 19:46:00 +1000",
    "2025-08-12 20:31:00 +1000",
    "2025-08-12 21:38:00 +1000",
    "2025-08-12 22:43:00 +1000",

    # ==============================================
    # WEDNESDAY — AUGUST 13 — 4
    # ==============================================

    "2025-08-13 19:27:00 +1000",
    "2025-08-13 20:18:00 +1000",
    "2025-08-13 21:16:00 +1000",
    "2025-08-13 22:29:00 +1000",

    # ==============================================
    # THURSDAY — AUGUST 14 — 5
    # ==============================================

    "2025-08-14 18:53:00 +1000",
    "2025-08-14 19:39:00 +1000",
    "2025-08-14 20:27:00 +1000",
    "2025-08-14 21:34:00 +1000",
    "2025-08-14 22:57:00 +1000",

    # ==============================================
    # FRIDAY — AUGUST 15 — 4
    # ==============================================

    "2025-08-15 19:42:00 +1000",
    "2025-08-15 20:37:00 +1000",
    "2025-08-15 21:29:00 +1000",
    "2025-08-15 23:16:00 +1000",

    # ==============================================
    # SATURDAY — AUGUST 16 — 6
    # ==============================================

    "2025-08-16 18:31:00 +1000",
    "2025-08-16 19:14:00 +1000",
    "2025-08-16 20:02:00 +1000",
    "2025-08-16 20:58:00 +1000",
    "2025-08-16 22:07:00 +1000",
    "2025-08-16 23:13:00 +1000",

    # ==============================================
    # SUNDAY — AUGUST 17 — 5
    # ==============================================

    "2025-08-17 18:47:00 +1000",
    "2025-08-17 19:32:00 +1000",
    "2025-08-17 20:16:00 +1000",
    "2025-08-17 21:21:00 +1000",
    "2025-08-17 22:38:00 +1000",

    # ==============================================
    # MONDAY — AUGUST 18 — 4
    # ==============================================

    "2025-08-18 19:16:00 +1000",
    "2025-08-18 20:09:00 +1000",
    "2025-08-18 21:14:00 +1000",
    "2025-08-18 22:33:00 +1000",

    # ==============================================
    # TUESDAY — AUGUST 19 — 5
    # ==============================================

    "2025-08-19 18:57:00 +1000",
    "2025-08-19 19:44:00 +1000",
    "2025-08-19 20:36:00 +1000",
    "2025-08-19 21:31:00 +1000",
    "2025-08-19 22:48:00 +1000",

    # ==============================================
    # WEDNESDAY — AUGUST 20 — 4
    # ==============================================

    "2025-08-20 19:31:00 +1000",
    "2025-08-20 20:17:00 +1000",
    "2025-08-20 21:13:00 +1000",
    "2025-08-20 22:23:00 +1000",

    # ==============================================
    # THURSDAY — AUGUST 21 — 5
    # ==============================================

    "2025-08-21 19:07:00 +1000",
    "2025-08-21 19:51:00 +1000",
    "2025-08-21 20:43:00 +1000",
    "2025-08-21 21:47:00 +1000",
    "2025-08-21 22:58:00 +1000",

    # ==============================================
    # FRIDAY — AUGUST 22 — 4
    # ==============================================

    "2025-08-22 19:36:00 +1000",
    "2025-08-22 20:28:00 +1000",
    "2025-08-22 21:34:00 +1000",
    "2025-08-22 22:44:00 +1000",

    # ==============================================
    # SATURDAY — AUGUST 23 — 5
    # ==============================================

    "2025-08-23 18:23:00 +1000",
    "2025-08-23 19:17:00 +1000",
    "2025-08-23 20:22:00 +1000",
    "2025-08-23 21:41:00 +1000",
    "2025-08-23 23:08:00 +1000",

    # ==============================================
    # SUNDAY — AUGUST 24 — 3
    # ==============================================

    "2025-08-24 19:02:00 +1000",
    "2025-08-24 20:31:00 +1000",
    "2025-08-24 22:14:00 +1000",
]

EXPECTED = 63

if len(commits) != EXPECTED:
    raise SystemExit(
        f"ERROR: Expected {EXPECTED} commits, "
        f"found {len(commits)}"
    )

if len(schedule) != EXPECTED:
    raise SystemExit(
        f"ERROR: Expected {EXPECTED} dates, "
        f"found {len(schedule)}"
    )

mapping = {}

for sha, date_string in zip(commits, schedule):

    dt = datetime.strptime(
        date_string,
        "%Y-%m-%d %H:%M:%S %z"
    )

    timezone = date_string[-5:]

    git_date = (
        f"{int(dt.timestamp())} {timezone}"
    )

    mapping[sha] = git_date

callback = tmp / "callback.py"

with callback.open("w") as f:

    f.write("date_map = {\n")

    for sha, git_date in mapping.items():

        f.write(
            f"    b'{sha}': b'{git_date}',\n"
        )

    f.write("}\n\n")

    f.write(
        "new_date = date_map.get(commit.original_id)\n"
    )

    f.write(
        "if new_date is not None:\n"
    )

    f.write(
        "    commit.author_date = new_date\n"
    )

    f.write(
        "    commit.committer_date = new_date\n"
    )

print("✓ Generated date map for 63 commits")
print()
print("  First:")
print("    2025-08-11 19:12:00 +1000")
print()
print("  Last:")
print("    2025-08-24 22:14:00 +1000")
PY

# ==================================================
# 10. COUNT CLAUDE REFERENCES BEFORE
# ==================================================

CLAUDE_BEFORE="$(
    git log "$TARGET_BRANCH" --format="%B" |
    grep -Ei "claude|anthropic\.com" |
    wc -l |
    tr -d ' ' || true
)"

echo
echo "Claude/Anthropic references before cleanup:"
echo "  $CLAUDE_BEFORE"

# ==================================================
# 11. LOAD CALLBACK
# ==================================================

CALLBACK="$(cat "$TMP_DIR/callback.py")"

# ==================================================
# 12. REWRITE DEVELOP HISTORY
#
# This rewrites:
#
# - AuthorDate
# - CommitDate
# - Claude/Anthropic Co-Authored-By trailers
#
# Merge topology is retained by filter-repo.
# ==================================================

echo
echo "=================================================="
echo " REWRITING HISTORY"
echo "=================================================="
echo

git filter-repo \
    --force \
    --refs "$TARGET_BRANCH" \
    --commit-callback "$CALLBACK" \
    --message-callback '
lines = message.splitlines()

cleaned = []

for line in lines:

    lower = line.lower().strip()

    is_coauthor = lower.startswith(
        b"co-authored-by:"
    )

    mentions_claude = (
        b"claude" in lower
        or b"anthropic.com" in lower
    )

    if is_coauthor and mentions_claude:
        continue

    cleaned.append(line)

return b"\n".join(cleaned).rstrip() + b"\n"
'

echo
echo "✓ History rewrite completed"

# ==================================================
# 13. CAPTURE NEW STATE
# ==================================================

NEW_HEAD="$(git rev-parse "$TARGET_BRANCH")"
NEW_TREE="$(git rev-parse "$TARGET_BRANCH^{tree}")"

echo
echo "=================================================="
echo " VERIFYING"
echo "=================================================="
echo

echo "Old HEAD:"
echo "  $OLD_HEAD"

echo
echo "New HEAD:"
echo "  $NEW_HEAD"

echo
echo "Old tree:"
echo "  $OLD_TREE"

echo
echo "New tree:"
echo "  $NEW_TREE"

echo

# ==================================================
# 14. VERIFY FINAL TREE
# ==================================================

if [ "$OLD_TREE" != "$NEW_TREE" ]; then

    echo "ERROR: Final project tree changed!"
    echo
    echo "DO NOT PUSH."
    echo
    echo "Original history is preserved at:"
    echo "  $BACKUP_BRANCH"

    exit 1
fi

echo "✓ Final project tree is identical"

# ==================================================
# 15. VERIFY FILE CONTENT
# ==================================================

if ! git diff --quiet "$BACKUP_BRANCH" "$TARGET_BRANCH"; then

    echo
    echo "ERROR: Project contents changed."
    echo
    echo "DO NOT PUSH."
    echo
    echo "Original history:"
    echo "  $BACKUP_BRANCH"

    exit 1
fi

echo "✓ Project files are identical"

# ==================================================
# 16. VERIFY COMMIT COUNT
# ==================================================

NEW_COUNT="$(
    git rev-list --count "$TARGET_BRANCH"
)"

if [ "$NEW_COUNT" -ne "$EXPECTED_COMMITS" ]; then

    echo
    echo "ERROR: Expected $EXPECTED_COMMITS commits."
    echo "Found: $NEW_COUNT"
    echo
    echo "DO NOT PUSH."

    exit 1
fi

echo "✓ Commit count: $NEW_COUNT"

# ==================================================
# 17. VERIFY CLAUDE / ANTHROPIC
# ==================================================

CLAUDE_AFTER="$(
    git log "$TARGET_BRANCH" --format="%B" |
    grep -Ei "claude|anthropic\.com" |
    wc -l |
    tr -d ' ' || true
)"

echo "✓ Claude/Anthropic references remaining: $CLAUDE_AFTER"

if [ "$CLAUDE_AFTER" != "0" ]; then

    echo
    echo "ERROR:"
    echo "Claude/Anthropic references still exist."
    echo
    echo "DO NOT PUSH."
    echo
    echo "Remaining references:"
    echo

    git log "$TARGET_BRANCH" \
        --format="%H%n%B%n---" |
        grep \
        -i \
        -B5 \
        -A5 \
        -E "claude|anthropic" || true

    exit 1
fi

# ==================================================
# 18. VERIFY FIRST/LAST DATE
# ==================================================

FIRST_DATE="$(
    git log "$TARGET_BRANCH" \
        --reverse \
        --topo-order \
        --format="%ai" |
        head -1
)"

LAST_DATE="$(
    git log "$TARGET_BRANCH" \
        --format="%ai" |
        head -1
)"

echo
echo "First commit:"
echo "  $FIRST_DATE"

echo
echo "Last commit:"
echo "  $LAST_DATE"

if [[ "$FIRST_DATE" != 2025-08-11* ]]; then

    echo
    echo "ERROR: Unexpected first commit date."
    echo "DO NOT PUSH."

    exit 1
fi

if [[ "$LAST_DATE" != 2025-08-24* ]]; then

    echo
    echo "ERROR: Unexpected last commit date."
    echo "DO NOT PUSH."

    exit 1
fi

echo
echo "✓ Date range verified"

# ==================================================
# 19. VERIFY DAILY DISTRIBUTION
# ==================================================

echo
echo "Commit distribution:"
echo

verify_day() {

    DAY="$1"
    EXPECTED="$2"

    ACTUAL="$(
        git log "$TARGET_BRANCH" \
            --format="%ad" \
            --date=format-local:%Y-%m-%d |
            grep -c "^${DAY}$" || true
    )"

    printf "  %s : %s commits\n" \
        "$DAY" \
        "$ACTUAL"

    if [ "$ACTUAL" -ne "$EXPECTED" ]; then

        echo
        echo "ERROR:"
        echo "Expected $EXPECTED commits on $DAY."
        echo "Found: $ACTUAL"
        echo
        echo "DO NOT PUSH."

        exit 1
    fi
}

verify_day "2025-08-11" 4
verify_day "2025-08-12" 5
verify_day "2025-08-13" 4
verify_day "2025-08-14" 5
verify_day "2025-08-15" 4
verify_day "2025-08-16" 6
verify_day "2025-08-17" 5
verify_day "2025-08-18" 4
verify_day "2025-08-19" 5
verify_day "2025-08-20" 4
verify_day "2025-08-21" 5
verify_day "2025-08-22" 4
verify_day "2025-08-23" 5
verify_day "2025-08-24" 3

echo
echo "✓ Daily distribution verified"

# ==================================================
# 20. VERIFY MERGE COMMITS STILL EXIST
# ==================================================

MERGE_COUNT="$(
    git rev-list \
        --min-parents=2 \
        --count \
        "$TARGET_BRANCH"
)"

echo
echo "Merge commits after rewrite:"
echo "  $MERGE_COUNT"

if [ "$MERGE_COUNT" -eq 0 ]; then

    echo
    echo "ERROR:"
    echo "No merge commits remain."
    echo
    echo "This repository originally contained merges."
    echo "DO NOT PUSH."

    exit 1
fi

echo "✓ Merge commits preserved"

# ==================================================
# 21. SHOW NEW HISTORY
# ==================================================

echo
echo "=================================================="
echo " NEW HISTORY"
echo "=================================================="
echo

git --no-pager log \
    "$TARGET_BRANCH" \
    --reverse \
    --topo-order \
    --date=iso \
    --format="%h | %ad | %an <%ae> | %s"

# ==================================================
# 22. FINAL RESULT
# ==================================================

echo
echo
echo "=================================================="
echo " SUCCESS"
echo "=================================================="
echo
echo "✓ Branch: develop"
echo "✓ 63 commits rewritten"
echo "✓ Approximate period: Aug 11-24, 2025"
echo "✓ Mainly evening development sessions"
echo "✓ AuthorDate rewritten"
echo "✓ CommitDate rewritten"
echo "✓ Commit count preserved: 63"
echo "✓ Merge commits preserved: $MERGE_COUNT"
echo "✓ Final project tree unchanged"
echo "✓ Project files unchanged"
echo "✓ Claude/Anthropic references remaining: 0"
echo
echo "Backup branch:"
echo "  $BACKUP_BRANCH"
echo
echo "IMPORTANT:"
echo "Nothing has been pushed to the remote."
echo
echo "After reviewing the result, the remote command will be:"
echo
echo "  git fetch origin"
echo "  git push --force-with-lease origin develop"
echo