# Свои звуки, музыка и фоны

Сейчас в «Балагане» всё рисуется и звучит кодом: персонажи — SVG, музыка — секвенсор, эффекты — синтез. Это работает без единого файла, но живые записи звучат богаче. Любой файл из списка ниже можно положить в папку — и игра подхватит его сама, без правки кода. Удалили файл — вернулся синтез.

| Что | Куда | Формат |
|---|---|---|
| Звуковой эффект | `public/assets/sfx/<имя>.mp3` | mp3, ogg, wav, m4a. Короткий, без тишины в начале |
| Музыка игры | `public/assets/music/<игра>.mp3` | бесшовная петля 60–120 секунд |
| Музыка под настроение | `public/assets/music/<игра>-<настроение>.mp3` | то же; настроения ниже |
| Фон экрана | `public/assets/bg/<игра>.webp` | 1920×1080, webp/png/jpg, до 1 МБ |

Проверить, что файлы видны: откройте `http://localhost:7700/assets/manifest.json`. После добавления файла достаточно перезагрузить экран.

Идентификаторы игр: `menu`, `shutka`, `sanatoriy`, `sobes`, `lainer`, `baraban`, `gora`.

## Звуки — что важнее всего

Синтез хуже всего справляется с живыми голосами и толпой. Если генерировать, то начать с этих:

| Имя файла | Что это | Где звучит |
|---|---|---|
| `laugh` | смех зала, 2–3 с | Шутка: удачная шутка; Лайнер: панчлайн |
| `applause` | аплодисменты, 3–4 с | после выступлений, табло, посадка |
| `cheer` | ликование с криками «у-у-у!», 2–3 с | разгром «Шутка!», победы, Колесо победы |
| `aww` | разочарованное «о-о-оу», 1,5 с | пустой сектор, промах, отказ |
| `ooh` | удивлённое «у-у-у», 1,5 с | ничья, 18+ на старте |
| `boo` | недовольный гул зала | запас |
| `monster` | рык чудища из шахты, 1 с | Медная гора: неверная дверь |
| `rimshot` | ба-дум-тсс | Лайнер: панчлайн |
| `drumroll` | барабанная дробь, 1,5 с | перед любым итогом |
| `cymbal` | удар тарелки | заставки раундов |
| `sting` | телевизионная отбивка: медь + тарелка | начало раунда |
| `tada` | фанфара «та-да!» | победители |
| `airhorn` | дудка-гудок | разгром, «Жесть» |
| `chime` | двухтоновый «дин-дон» громкой связи самолёта | Лайнер: перед каждым объявлением |
| `jet` | рёв двигателей на взлёте, 3–4 с | Лайнер: взлёт и посадка |
| `thunder` | раскат грома | Лайнер: турбулентность |
| `seatbelt` | одиночный «дзынь» табло | Лайнер: голос пассажира, ремни |
| `peg` | щелчок колышка барабана о язычок, очень короткий | Барабан: десятки раз за оборот |
| `whoosh2` | мощный свист разгона | Барабан: старт вращения |
| `ding` | звонок остановки | Барабан: встал на секторе |
| `cash` | касса «дзынь-чинг» | очки, премии |
| `coin` | монетка | самоцвет, верный ответ |
| `stamp` | удар печатью | Собеседование, регистрация |
| `type` | клавиша печатной машинки | печать текста, принтер |
| `buzz` | гудение техники | кофемашина, шредер |
| `splash` | струя жидкости | кофемашина |
| `rumble` | гул в горе, обвал вдали | Медная гора, спуск |
| `torch` | вспыхнувший факел | Медная гора |
| `gurney` | скрип колёс каталки или вагонетки | Палата №6, Медная гора |
| `creak` | скрип двери | Палата №6 |
| `heartbeat` | сердцебиение | Палата №6 |
| `flatline` | писк кардиомонитора, 2 с | Палата №6: смерть |
| `ecg` | одиночный «пик» монитора | Палата №6: ответ принят |
| `tray` | звон металлического подноса | Палата №6 |
| `drip` | капля | Палата №6, Медная гора |
| `whisper` | шёпот | Палата №6 |

Остальные имена (`pop`, `clack`, `vote`, `open`, `round`, `reveal`, `swish`, `whoosh`, `boing`, `thud`, `slam`, `scribble`, `tick`, `win`, `sad`, `spin`, `bell`, `ghost`, `death`, `horn`, `scores`, `right`, `wrong`, `join`, `pick`, `menu`) синтез делает прилично — их можно не трогать.

Подсказка для генератора звуков: «short game show sound effect, no music, no voice, dry, starts immediately, 1–3 seconds, <описание>».

## Музыка

Настроения, которые переключает игра: `lobby` (лобби, всё играет), `calm` (спокойно), `think` (пишем ответы — тихо, ритмично), `tense` (голосование, отсчёт — быстрее, нервно), `reveal` (итоги — подклад без ударных), `win` (победа). Если положить один файл `<игра>.mp3`, громкость сама меняется по настроению. Отдельные файлы под настроения — по желанию.

| Игра | Описание для генератора |
|---|---|
| `menu` | upbeat funky game show theme, clavinet, synth bass, claps, 118 bpm, playful, instrumental loop |
| `shutka` | sassy late-night TV comedy show theme, brass stabs, clavinet, slap bass, 112 bpm, instrumental loop |
| `sanatoriy` | creepy Soviet hospital waltz, detuned music box and organ, flickering, slow 84 bpm, unsettling but playful, instrumental loop |
| `sobes` | corporate office elevator music, vibraphone, bossa nova, 96 bpm, slightly absurd, instrumental loop |
| `lainer` | airport lounge bossa nova, vibraphone, flute, soft brushes, 104 bpm, in-flight easy listening, instrumental loop |
| `baraban` | big brass TV gameshow wheel spin theme, drum fills, 120 bpm, triumphant, instrumental loop |
| `gora` | dark fairy-tale Ural folk, gusli and flute, low drone, cave echo, 92 bpm, mysterious, instrumental loop |

## Фоны

Фон кладётся поверх нарисованного кодом заднего плана (небо «Лайнера», офис «Собеседования», шахта «Медной горы»), поэтому он должен быть спокойным и тёмным по краям: по центру идут карточки и текст. Размер 1920×1080.

| Игра | Описание для генератора картинок |
|---|---|
| `shutka` | glossy TV comedy studio stage, magenta and gold, light rays, sticker art style, empty center, no text |
| `sanatoriy` | knitted wool diorama of a Soviet hospital ward at night, flickering lamp, eerie, felt texture, empty center, no text |
| `sobes` | cartoon office at evening, cubicles, window with city lights, flat illustration, muted navy, empty center, no text |
| `lainer` | cartoon airplane cabin aisle view, warm lights, seats, flat illustration, empty center, no text |
| `baraban` | night TV studio with starry backdrop and spotlights, gold accents, empty center, no text |
| `gora` | Ural mine cave with malachite crystals and copper veins, torches, Bazhov fairy tale style, dark, empty center, no text |

## Голос

Ведущих озвучивает нейросеть Silero (`npm run voice` ставит её на новый Мак). Голоса закреплены за ведущими в `src/tts.mjs`, таблица `NEURAL`: у модели есть мужские `aidar`, `eugene` и женские `baya`, `kseniya`, `xenia`. Там же тон и эффекты ffmpeg. Числа и латиницу сервер перед озвучкой переводит в слова, аббревиатуры читает по буквам.
