/* Генерация контента через Claude API.
   Без ключа ANTHROPIC_API_KEY всё работает на встроенном паке — ИИ просто выключен. */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const MODEL = process.env.BALAGAN_MODEL || 'claude-opus-5-5';

export const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = aiEnabled ? new Anthropic() : null;

const RULES = `Ты — автор заданий для вечериночной игры «Шутка на двоих» (жанр Quiplash) на русском языке.
Задание — короткая затравка, на которую игроки дописывают смешной ответ. Пропуск обозначается знаком ___.

Как писать хорошо:
- Коротко: 4–12 слов. Длинная затравка убивает шутку.
- Конкретно и неожиданно: не «Назови что-нибудь смешное», а «Худшее название для детского сада: ___».
- Затравка должна допускать десятки разных ответов — это соль игры.
- Живой разговорный русский, без канцелярита и без пояснений в скобках.
- Разные типы: «худшее название для…», «что сказать, когда…», «новая строчка в резюме…», «реклама …», «твой тост на …», сравнения, советы.

Запрещено: политика и выборы, национальность и религия, шутки про смерть и болезни,
сексуальное содержание, оскорбления конкретных реальных людей,
задания, где надо выдать личные данные кого-то из игроков.`;

const PromptPack = z.object({
  prompts: z.array(z.string()).describe('Затравки с ___ на месте пропуска'),
});

const Quip = z.object({
  line: z.string().describe('Реплика ведущего, 4–14 слов'),
});

/* Разбираем отказ API в человеческую фразу для экрана */
function explain(e) {
  const msg = String(e?.message || e);
  if (e?.status === 400 && /credit balance/i.test(msg)) return 'на счёте Anthropic нет средств';
  if (e?.status === 401 || /authentication/i.test(msg)) return 'ключ не принят';
  if (e?.status === 429) return 'слишком много запросов';
  if (e?.status >= 500) return 'ИИ недоступен';
  return 'ИИ не ответил';
}

/* --- затравки --- */
export async function generatePrompts({ count = 12, topic = '', names = [] } = {}) {
  if (!client) return { list: null, note: null };

  const ctx = [
    topic ? `Тема и контекст вечеринки: ${topic}.` : 'Тема: обычная дружеская вечеринка.',
    names.length ? `За столом: ${names.join(', ')}. Можешь иногда обыгрывать имена по-доброму, но не чаще чем в каждой четвёртой затравке и только безобидно.` : '',
    `Сочини ровно ${count} затравок. Все разные по типу и ритму.`,
  ].filter(Boolean).join('\n');

  try {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: RULES,
      output_config: { effort: 'medium', format: zodOutputFormat(PromptPack) },
      messages: [{ role: 'user', content: ctx }],
    });
    if (res.stop_reason === 'refusal') return { list: null, note: 'ИИ отказался от темы' };
    const list = (res.parsed_output?.prompts || [])
      .map((s) => String(s).trim())
      .filter((s) => s.length > 6 && s.includes('_'));
    return list.length ? { list, note: null } : { list: null, note: 'ИИ не ответил' };
  } catch (e) {
    const note = explain(e);
    console.warn(`[ai] затравки не вышли (${note}):`, e?.message || e);
    return { list: null, note };
  }
}

/* --- реплика конферансье по итогам раунда --- */
export async function hostQuip({ prompt, winner, loser, shutout }) {
  if (!client) return null;
  const task = [
    `Затравка: «${prompt}»`,
    winner ? `Победил ответ: «${winner.text}» (автор ${winner.name}), голосов ${winner.votes}.` : '',
    loser ? `Проиграл ответ: «${loser.text}» (автор ${loser.name}), голосов ${loser.votes}.` : '',
    shutout ? 'Разгром: победитель забрал все голоса.' : '',
    'Одна реплика ведущего вслух: живая, с характером, без пояснений и без кавычек. 4–14 слов.',
  ].filter(Boolean).join('\n');

  try {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 700,
      system: `Ты — ведущий вечериночной игры. Говоришь коротко, тепло и с юмором, подкалываешь по-доброму.
Никогда не обижаешь, не поучаешь и не объясняешь шутку. Только русский язык.`,
      output_config: { effort: 'low', format: zodOutputFormat(Quip) },
      messages: [{ role: 'user', content: task }],
    });
    if (res.stop_reason === 'refusal') return null;
    const line = res.parsed_output?.line?.trim();
    return line && line.length < 160 ? line : null;
  } catch (e) {
    console.warn('[ai] реплика не вышла:', e?.message || e);
    return null;
  }
}
