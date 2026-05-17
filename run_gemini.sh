#!/bin/bash
PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJ_NAME=$(basename "$PROJ_DIR")
cd "$PROJ_DIR" || exit 1
mkdir -p logs

LOOP_COUNT=0
MAX_LOOPS=200

while [ $LOOP_COUNT -lt $MAX_LOOPS ]; do
  LOOP_COUNT=$((LOOP_COUNT + 1))
  REM=$(grep -c "^- \[ \]" TODO.md 2>/dev/null | head -1)
  REM=${REM:-0}

  if [ "$REM" -le 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$PROJ_NAME] TODO 全消化、終了" | tee -a logs/gemini_$(date +%Y%m%d).log
    break
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$PROJ_NAME Loop $LOOP_COUNT] 残 $REM タスク (yolo)..." | tee -a logs/gemini_$(date +%Y%m%d).log

  PROMPT="DO NOT ASK FOR APPROVAL. DO NOT PROPOSE PLANS. DO NOT WAIT FOR CONFIRMATION.

You are an autonomous coding agent for project $PROJ_NAME. The user is sleeping and will NOT respond to any questions. Execute immediately.

INSTRUCTIONS:
1. Read SPEC.md and TODO.md
2. Pick the FIRST unchecked task '- [ ]' in TODO.md
3. Implement it directly. No plan, no proposal, no confirmation.
4. If you cannot use a tool, find a workaround. Do not stop.
5. Mark the task as '[x]' in TODO.md
6. Run: git add -A && git commit -m 'Txxx: <summary>'
7. Report completion in one line and exit.

ABSOLUTELY FORBIDDEN:
- 'Does this strategy look good?' style questions
- Plan Mode proposals
- 'I will create...' future tense (just do it)
- 'Please confirm' phrases
- Waiting for user input

STACK: Manifest V3, TypeScript+Vite, chrome.storage.local, chrome.i18n
RULES: no external API, no personal data, no ads, minimum permissions

Execute ONE task. Then exit."

  gtimeout 900 gemini --yolo -p "$PROMPT" 2>&1 | tee -a logs/gemini_$(date +%Y%m%d).log
  RC=${PIPESTATUS[0]}

  if [ "$RC" -ne 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$PROJ_NAME] Gemini エラー (RC=$RC)、3分待機..." | tee -a logs/gemini_$(date +%Y%m%d).log
    sleep 180
  else
    sleep 8
  fi
done
