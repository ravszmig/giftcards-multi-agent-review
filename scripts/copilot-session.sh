#!/usr/bin/env bash
# Starts Copilot CLI in this repository as one of two roles: builder or reviewer.
# Use scripts/copilot-builder or scripts/copilot-reviewer; both call this file.
#
# Every session gets a disposable profile under .lab/sessions/NN-<role>/profile, used as HOME
# and COPILOT_HOME, so no personal setting, skill, agent or saved approval reaches it. The
# session's own event log stays there for the facilitator's audit. .lab/ is git-ignored.
# Only PATH, JAVA_HOME, the Maven repository, the token and the terminal settings pass in.
# Any extra arguments go to Copilot CLI unchanged, for example -p "<prompt>" for a dry run.
# MAR_MODEL=<id> changes the model, gpt-6-luna by default.
set -euo pipefail

role=${1:?usage: copilot-session.sh builder|reviewer [copilot arguments]}
shift
W=$(cd "$(dirname "$0")/.." && pwd -P)
MODEL=${MAR_MODEL:-gpt-6-luna}

token=${COPILOT_GITHUB_TOKEN:-$(gh auth token 2>/dev/null || true)}
if [ -z "$token" ]; then
  echo "No token: sign in with 'gh auth login', or set COPILOT_GITHUB_TOKEN." >&2
  exit 1
fi

# MAR_SESSION=<an existing sessions/NN-role directory> reuses its profile, so --continue
# resumes that conversation. Dry runs with -p need it where the guide keeps a session open.
if [ -n "${MAR_SESSION:-}" ]; then
  S=$(cd "$MAR_SESSION" && pwd -P)
  [ -d "$S/profile/copilot" ] || { echo "No Copilot profile in $S" >&2; exit 1; }
else
  mkdir -p "$W/.lab/sessions"
  n=$(printf '%02d' $(( $(ls "$W/.lab/sessions" | wc -l) + 1 )))
  S="$W/.lab/sessions/$n-$role"
  mkdir -p "$S/profile/temp"
  chmod 700 "$S" "$S/profile"
  git -C "$W" rev-parse HEAD > "$S/head-before"
fi

# Copilot CLI checks shell commands by name; the deny rules win over the allow rules.
case "$role" in
builder)
  # The builder never sees docs/ or facilitator/: the reviewers' rules stay with the
  # reviewers, and the facilitator's answers with the facilitator. It cannot
  # commit, start a subagent, use a skill, or write the review setup, the tickets or review/.
  flags=(
    --no-ask-user
    --excluded-tools=task,skill,web_fetch,semantic_code_search,session_store_sql,run_dynamic_workflow,dynamic_workflows_manage
    --allow-tool=write --allow-tool='shell(mvn:*)' --allow-tool='shell(git status)'
    --allow-tool='shell(git diff)' --allow-tool='shell(ls)'
    --deny-tool='shell(git commit)' --deny-tool='shell(git push)' --deny-tool='shell(git reset)'
    --deny-tool='shell(git checkout)' --deny-tool='shell(git stash)'
    --deny-tool=url --deny-tool=memory
    --deny-tool="read($W/docs/**)" --deny-tool="read($W/facilitator/**)"
    --deny-tool="read($W/.lab/**)"
    --deny-tool="write($W/docs/**)" --deny-tool="write($W/.github/**)"
    --deny-tool="write($W/tickets/**)" --deny-tool="write($W/review/**)"
    --deny-tool="write($W/scripts/**)" --deny-tool="write($W/REVIEW-CONTRACT.md)"
    --deny-tool="write($W/facilitator/**)"
  ) ;;
reviewer)
  # The review session writes only under review/. Its one shell command is the skill's pin
  # script, run by its path so that one rule allows it. Copilot runs commands it knows as
  # read-only without asking, and in rehearsal a review ran wc and rg unasked, so those
  # commands are denied by name. A command not listed here still needs an approval, which
  # -p refuses. The reviewers themselves have read and search tools only.
  ro=(cat head tail less more wc rg grep egrep fgrep sed awk find ls tree file stat du diff
    cmp sort uniq cut tr nl jq xxd od strings echo printf pwd env which basename dirname
    realpath readlink date git node npx python python3 java mvn bash sh zsh)
  deny_ro=()
  for c in "${ro[@]}"; do deny_ro+=(--deny-tool="shell($c:*)"); done
  flags=(
    --no-ask-user --no-custom-instructions
    --excluded-tools=web_fetch,semantic_code_search,session_store_sql,run_dynamic_workflow,dynamic_workflows_manage
    --deny-tool=url --deny-tool=memory "${deny_ro[@]}"
    --allow-tool='shell(.github/skills/multi-agent-review/pin.mjs)'
    --allow-tool='write(review/**)'
    --deny-tool="read($W/facilitator/**)" --deny-tool="read($W/.lab/**)"
    --deny-tool="write($W/facilitator/**)"
    --deny-tool="write($W/src/**)" --deny-tool="write($W/docs/**)"
    --deny-tool="write($W/.github/**)" --deny-tool="write($W/tickets/**)"
    --deny-tool="write($W/scripts/**)" --deny-tool="write($W/review-templates/**)"
    --deny-tool="write($W/AGENTS.md)" --deny-tool="write($W/REVIEW-CONTRACT.md)"
    --deny-tool="write($W/pom.xml)"
  ) ;;
*)
  echo "Unknown role: $role (builder or reviewer)" >&2
  exit 2 ;;
esac

cd "$W"
exec env -i PATH="$PATH" HOME="$S/profile" TMPDIR="$S/profile/temp" \
  COPILOT_HOME="$S/profile/copilot" COPILOT_CACHE_HOME="$S/profile/cache" \
  GIT_CEILING_DIRECTORIES="$(dirname "$W")" ${JAVA_HOME:+JAVA_HOME="$JAVA_HOME"} \
  MAVEN_ARGS="-o -Dmaven.repo.local=${MAVEN_REPO:-$HOME/.m2/repository}" \
  COPILOT_GITHUB_TOKEN="$token" TERM="${TERM:-xterm-256color}" COLORTERM="${COLORTERM:-truecolor}" \
  LANG="${LANG:-en_GB.UTF-8}" \
  copilot --model "$MODEL" --no-auto-update --disable-builtin-mcps --disallow-temp-dir \
    --sync-session=off --secret-env-vars=COPILOT_GITHUB_TOKEN \
    --log-dir "$S/logs" --usage-output-file "$S/usage.json" "${flags[@]}" "$@"
