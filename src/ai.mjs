/* Claude для всех игр: генерация контента и реплики ведущих.
   Без ключа или без денег на счёте всё работает на встроенных паках — ИИ просто молчит. */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

export { z };

const MODEL = process.env.BALAGAN_MODEL || 'claude-opus-5-5';

export const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = aiEnabled ? new Anthropic() : null;

/* Красные линии — общие для всех игр (см. docs/RESEARCH.md, раздел 3) */
export const SAFETY = `Строгие ограничения контента. Никогда не касайся:
политики, власти, выборов, политиков; войны, армии, СВО, мобилизации; религии и верующих;
национальностей и этносов; ЛГБТ-тематики; наркотиков; суицида, тяжёлых болезней, смерти реальных людей;
блокировок, VPN и обхода ограничений; реальных людей как объекта насмешки.
Не смейся над внешностью, весом, бедностью. Подкалывай по-доброму, как друзья за столом.
Пиши живым разговорным русским языком, без канцелярита.`;

/* Отказ API → короткая фраза для экрана */
export function explain(e) {
  const msg = String(e?.message || e);
  if (e?.status === 400 && /credit balance/i.test(msg)) return 'на счёте Anthropic нет средств';
  if (e?.status === 401 || /authentication/i.test(msg)) return 'ключ не принят';
  if (e?.status === 429) return 'слишком много запросов';
  if (e?.status >= 500) return 'ИИ недоступен';
  return 'ИИ не ответил';
}

/* Один запрос со структурированным ответом.
   Возвращает { data, note }: data — разобранный объект или null, note — почему не вышло. */
export async function ask({ system, user, schema, effort = 'medium', maxTokens = 6000 }) {
  if (!client) return { data: null, note: null };
  try {
    const res = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: maxTokens,
      system: `${system}\n\n${SAFETY}`,
      // если модель откажется, запрос сам переедет на резервную
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort, format: betaZodOutputFormat(schema) },
      messages: [{ role: 'user', content: user }],
    });
    if (res.stop_reason === 'refusal') return { data: null, note: 'ИИ отказался от темы' };
    if (!res.parsed_output) return { data: null, note: 'ИИ ответил не по форме' };
    return { data: res.parsed_output, note: null };
  } catch (e) {
    const note = explain(e);
    console.warn(`[ai] ${note}:`, String(e?.message || e).slice(0, 200));
    return { data: null, note };
  }
}

/* Короткая реплика ведущего: строка или null */
export async function line({ host, user, max = 160 }) {
  const { data } = await ask({
    system: `${host}\nОтвечаешь одной репликой вслух: 4–16 слов, без кавычек и пояснений.`,
    user,
    schema: z.object({ line: z.string() }),
    effort: 'low',
    maxTokens: 800,
  });
  const s = data?.line?.trim();
  return s && s.length <= max ? s : null;
}
