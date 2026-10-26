// Перевірка міграції ліміту AI-пояснень на PGlite.
// Запуск: node explain-quota.test.mjs <20261026_enable_rls.sql> <20261025_explanations.sql> <20261026_explain_quota.sql>
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'

const db = new PGlite()
const [RLS, EXPL, QUOTA] = process.argv.slice(2, 5).map(p => fs.readFileSync(p, 'utf8'))

await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create table public.users (id uuid primary key, name text, email text, role text default 'student',
  is_verified boolean default false, is_active boolean default true, season text default '2027');
create table public.variants (id uuid primary key, title text, is_published boolean default true);
create table public.questions (id uuid primary key default gen_random_uuid(), variant_id uuid);
create table public.attempts (id uuid primary key default gen_random_uuid(), student_id uuid, variant_id uuid,
  status text default 'in_progress', nmt_score int);
create table public.answers (id uuid primary key default gen_random_uuid(), attempt_id uuid);
create table public.set_attempts (id uuid primary key default gen_random_uuid(), student_id uuid);
create table public.sets (id uuid primary key); create table public.materials (id uuid primary key);
create table public.score_conversion (raw int primary key, score int);
create function public.handle_new_user() returns trigger language plpgsql security definer as $f$ begin return new; end $f$;
grant usage on schema public to anon, authenticated;
`)
await db.exec(RLS)
await db.exec(EXPL)
await db.exec(`grant all on all tables in schema public to anon, authenticated;`)
await db.exec(QUOTA)
await db.exec(QUOTA) // повторний запуск

const T = '00000000-0000-0000-0000-00000000000a', S1 = '00000000-0000-0000-0000-0000000000b1', S2 = '00000000-0000-0000-0000-0000000000b2'
const A = i => `00000000-0000-0000-0000-0000000001${String(i).padStart(2, '0')}` // спроби S1
const A_S2 = '00000000-0000-0000-0000-000000000299', A_OPEN = '00000000-0000-0000-0000-000000000298'
const Q = i => `00000000-0000-0000-0000-0000000003${String(i).padStart(2, '0')}`

let ins = `insert into public.users (id,name,role) values ('${T}','T','teacher'),('${S1}','S1','student'),('${S2}','S2','student');`
for (let i = 1; i <= 10; i++) ins += `insert into public.attempts (id,student_id,status) values ('${A(i)}','${S1}','done');`
ins += `insert into public.attempts (id,student_id,status) values ('${A_S2}','${S2}','done'),('${A_OPEN}','${S1}','in_progress');`
await db.exec(ins)

let pass = 0, fail = 0
const ok = (c, name, extra = '') => { if (c) pass++; else { fail++; console.log('❌', name, extra) } }
const q = async (sql, p) => (await db.query(sql, p)).rows
const tryq = async (sql, p) => { try { return { rows: await q(sql, p) } } catch (e) { return { err: e.message } } }
async function as(uid, fn) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`) }
}
const reserve = async (a, qq) => (await q(`select public.reserve_explanation($1,$2) r`, [a, qq]))[0].r
const finish = async (a, qq, t) => (await q(`select public.finish_explanation($1,$2,$3) r`, [a, qq, t]))[0].r
const release = (a, qq) => q(`select public.release_explanation($1,$2)`, [a, qq])

await as(S1, async () => {
  // 1. Звичайний шлях
  ok(await reserve(A(1), Q(1)) === 'ok', 'перша бронь ok')
  ok(await reserve(A(1), Q(1)) === 'busy', 'повторний запит, поки готується → busy')
  ok(await finish(A(1), Q(1), 'Пояснення 1') === true, 'збереження тексту')
  ok(await reserve(A(1), Q(1)) === 'cached', 'готове пояснення → cached')
  ok(await finish(A(1), Q(1), 'Підміна') === false, 'готовий текст не перезаписується')

  // 2. Невдача ШІ: бронь знімається, ліміт не витрачено
  ok(await reserve(A(1), Q(2)) === 'ok', 'бронь 2')
  await release(A(1), Q(2))
  ok((await q(`select count(*)::int c from public.explanations where attempt_id='${A(1)}'`))[0].c === 1, 'знята бронь не рахується')

  // 3. Ліміт на спробу: 3 (броні теж рахуються — так закрито гонку)
  ok(await reserve(A(1), Q(2)) === 'ok', 'бронь 2 знову')
  ok(await reserve(A(1), Q(3)) === 'ok', 'бронь 3 (ще не збережена)')
  ok(await reserve(A(1), Q(4)) === 'limit_attempt', '4-те пояснення в спробі → limit_attempt')

  // 4. Чужа / незавершена спроба
  ok(await reserve(A_S2, Q(1)) === 'forbidden', 'чужа спроба → forbidden')
  ok(await reserve(A_OPEN, Q(1)) === 'forbidden', 'незавершена спроба → forbidden')

  // 5. Прямий запис у таблицю заборонено
  const direct = await tryq(`insert into public.explanations (attempt_id,question_id,user_id,explanation) values ('${A(5)}','${Q(9)}','${S1}','x')`)
  ok(!!direct.err, 'учень не пише в explanations напряму')
  const upd = await q(`update public.explanations set explanation='hack' where attempt_id='${A(1)}' returning id`)
  ok(upd.length === 0, 'учень не редагує пояснення напряму')
})

// 6. Денний ліміт: 15 на учня за 24 год (зараз уже 3 рядки в A(1))
await as(S1, async () => {
  let got = 0, last = ''
  for (let i = 2; i <= 10 && last !== 'limit_day'; i++)
    for (let j = 1; j <= 3; j++) {
      last = await reserve(A(i), Q(j))
      if (last === 'ok') { got++; await finish(A(i), Q(j), 'т') }
      if (last === 'limit_day') break
    }
  ok(got === 12 && last === 'limit_day', 'денний ліміт 15 (3 + 12), далі limit_day', `got=${got} last=${last}`)
})
// Через добу ліміт оновлюється
await db.exec(`update public.explanations set created_at = now() - interval '25 hours' where user_id='${S1}'`)
await as(S1, async () => ok(await reserve(A(10), Q(1)) === 'ok', 'після 24 год ліміт знову доступний'))

// 7. Завислі брони (старші 2 хв) прибираються й не рахуються
await db.exec(`update public.explanations set created_at = now() - interval '5 minutes' where attempt_id='${A(10)}' and explanation is null`)
await as(S1, async () => ok(await reserve(A(10), Q(1)) === 'ok', 'зависла бронь не блокує повторний запит'))

// 8. Видимість: учень — свої, вчитель — усі, учень 2 — нічого
ok((await as(S2, () => q(`select id from public.explanations`))).length === 0, 'інший учень не бачить чужих пояснень')
ok((await as(S1, () => q(`select id from public.explanations`))).length > 0, 'учень бачить свої')
ok((await as(T, () => q(`select id from public.explanations`))).length > 0, 'вчитель бачить усі')

// 9. Анонім не може бронювати
const anon = await tryq(`set role anon; select public.reserve_explanation('${A(1)}','${Q(7)}')`)
await db.exec('reset role')
ok(!!anon.err, 'анонім не викликає reserve_explanation')

console.log(`\nПройдено: ${pass}, не пройдено: ${fail}`)
process.exit(fail ? 1 : 0)
