#!/bin/bash
# Нейросетевой голос ведущих — Silero (https://github.com/snakers4/silero-models).
# Ставит в папку .tts/: окружение Python с PyTorch (~700 МБ на диске) и модель v5_5_ru (145 МБ).
# Модель распространяется по лицензии CC BY-NC 4.0 — только для некоммерческого использования.
set -e
cd "$(dirname "$0")/.."

MODEL_URL="https://models.silero.ai/models/tts/ru/v5_5_ru.pt"
MODEL=".tts/models/v5_5_ru.pt"

# PyTorch нужен Python 3.10 или новее
PY=""
for v in python3.14 python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$v" >/dev/null && "$v" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then PY=$(command -v "$v"); break; fi
done
if [ -z "$PY" ]; then echo "Нужен Python 3.10+. Поставьте: brew install python"; exit 1; fi
command -v ffmpeg >/dev/null || { echo "Нужен ffmpeg: brew install ffmpeg"; exit 1; }

mkdir -p .tts/models
[ -x .tts/venv/bin/python ] || "$PY" -m venv .tts/venv
.tts/venv/bin/python -I -m pip install --quiet --upgrade pip
.tts/venv/bin/python -I -m pip install --quiet torch numpy
[ -f "$MODEL" ] || curl -L --fail -o "$MODEL" "$MODEL_URL"

echo '{"id":"1","text":"Проверка голоса. Раз, два, три.","speaker":"baya","out":"/tmp/balagan-voice-check.wav"}' \
  | .tts/venv/bin/python -I scripts/silero_tts.py "$MODEL" 2>/dev/null | grep -q '"ok": true' \
  && echo "Готово: при следующем запуске ведущие заговорят нейросетью." \
  || { echo "Модель не запустилась — останется голос Мака."; exit 1; }
