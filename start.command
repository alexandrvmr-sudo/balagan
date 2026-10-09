#!/bin/bash
# Двойной клик по этому файлу — вечеринка началась.
cd "$(dirname "$0")" || exit 1

PORT="${PORT:-7700}"

# окно не должно закрываться молча: любую ошибку видно
stop() {
  echo ""
  echo "  ⛔  $1"
  echo ""
  echo "  Нажми Enter, чтобы закрыть окно."
  read -r
  exit 1
}

clear
echo "🎪 Балаган готовится…"
echo ""

# node из nvm может быть не виден Finder — ищем любой подходящий
if ! command -v node >/dev/null 2>&1; then
  for d in /usr/local/bin /opt/homebrew/bin "$HOME/.nvm/versions/node"/*/bin; do
    [ -x "$d/node" ] && PATH="$d:$PATH" && break
  done
fi
command -v node >/dev/null 2>&1 || stop "Node.js не найден. Поставь его с nodejs.org и запусти снова."

MAJOR=$(node -p 'parseInt(process.versions.node, 10)' 2>/dev/null || echo 0)
[ "$MAJOR" -ge 20 ] 2>/dev/null || stop "Нужен Node.js 20 или новее, а сейчас $(node -v). Обнови с nodejs.org."

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  stop "Порт $PORT уже занят — похоже, Балаган уже запущен в другом окне. Закрой его и попробуй снова."
fi

if [ ! -d node_modules ]; then
  echo "   первый запуск: ставлю зависимости, это минута…"
  npm install --silent || stop "Не удалось поставить зависимости. Проверь интернет и попробуй снова."
fi

# экран откроется сам, когда сервер поднимется
if [ "$BALAGAN_NO_OPEN" != "1" ]; then
  ( for _ in $(seq 1 60); do
      if curl -fsS "http://localhost:$PORT/health" >/dev/null 2>&1; then
        open -a "Google Chrome" --args --app="http://localhost:$PORT/" 2>/dev/null \
          || open "http://localhost:$PORT/"
        break
      fi
      sleep 0.25
    done ) &
fi

echo "   готово. Закрыть игру — Ctrl+C или закрыть это окно."
echo ""

# caffeinate не даёт компьютеру уснуть, пока идёт игра
caffeinate -s node server.mjs || stop "Сервер остановился с ошибкой — текст выше."
