#!/bin/bash
# Двойной клик по этому файлу — вечеринка началась.
cd "$(dirname "$0")" || exit 1

clear
echo "🎪 Балаган готовится…"

if [ ! -d node_modules ]; then
  echo "   первый запуск: ставлю зависимости…"
  npm install --silent || { echo "не вышло поставить зависимости"; read -r; exit 1; }
fi

PORT="${PORT:-7700}"

# экран откроется сам, когда сервер поднимется
( for _ in $(seq 1 40); do
    if curl -fsS "http://localhost:$PORT/health" >/dev/null 2>&1; then
      open -a "Google Chrome" --args --app="http://localhost:$PORT/" 2>/dev/null \
        || open "http://localhost:$PORT/"
      break
    fi
    sleep 0.25
  done ) &

# caffeinate не даёт компьютеру уснуть, пока идёт игра
exec caffeinate -s node server.mjs
