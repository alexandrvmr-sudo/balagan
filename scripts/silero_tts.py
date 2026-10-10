"""Нейросетевой голос для «Балагана»: Silero TTS на процессоре.

Сервер запускает этот процесс один раз и держит открытым:
    .tts/venv/bin/python -I scripts/silero_tts.py .tts/models/v5_5_ru.pt

Протокол — строки JSON. На вход: {"id": "...", "text": "...", "speaker": "baya", "out": "/путь/к/файлу.wav"}
На выход: {"id": "...", "ok": true} или {"id": "...", "ok": false, "error": "..."}
Первой строкой процесс пишет {"ready": true, "speakers": [...]}.
"""

import json
import sys
import wave

import torch

SAMPLE_RATE = 48000


def write_wav(path, audio):
    pcm = (audio.clamp(-1, 1) * 32767).to(torch.int16).numpy().tobytes()
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm)


def main():
    model_path = sys.argv[1]
    torch.set_num_threads(4)
    model = torch.package.PackageImporter(model_path).load_pickle('tts_models', 'model')
    model.to(torch.device('cpu'))
    speakers = list(getattr(model, 'speakers', []) or [])
    print(json.dumps({'ready': True, 'speakers': speakers}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        job = {}
        try:
            job = json.loads(line)
            audio = model.apply_tts(text=job['text'], speaker=job.get('speaker') or 'baya', sample_rate=SAMPLE_RATE)
            write_wav(job['out'], audio)
            print(json.dumps({'id': job.get('id'), 'ok': True}), flush=True)
        except Exception as e:  # одна плохая фраза не должна ронять голос
            print(json.dumps({'id': job.get('id'), 'ok': False, 'error': str(e)[:300]}), flush=True)


if __name__ == '__main__':
    main()
