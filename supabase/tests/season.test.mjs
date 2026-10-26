// Перевірка міграції сезону на PGlite.
// Запуск: node season.test.mjs <20261026_enable_rls.sql> <20261026_season_setting.sql>
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'

const db = new PGlite()
const [RLS, SEASON] = process.argv.slice(2, 4).map(p => fs.readFileSync(p, 'utf8'))
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
create table public.variants (id uuid primary key, is_published boolean default true);
create table public.questions (id uuid primary key, variant_id uuid);
create table public.attempts (id uuid primary key, student_id uuid, variant_id uuid, status text, nmt_score int);
create table public.answers (id uuid primary key, attempt_id uuid);
create table public.set_attempts (id uuid primary key, student_id uuid);
create table public.sets (id uuid primary key); create table public.materials (id uuid primary key);
create table public.score_conversion (raw int primary key, score int);
create function public.handle_new_user() returns trigger language plpgsql security definer as $f$ begin return new; end $f$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
`)
const T = '00000000-0000-0000-0000-00000000000a', S1 = '00000000-0000-0000-0000-0000000000b1', SN = '00000000-0000-0000-0000-0000000000b9'
await db.exec(`insert into public.users (id,name,role,season) values ('${T}','T','teacher',null),('${S1}','S1','student','2027'),('${SN}','SN','student',null);`)
await db.exec(RLS)
await db.exec(SEASON)
await db.exec(`grant all on all tables in schema public to anon, authenticated;`) // як у Supabase для нових таблиць
await db.exec(SEASON) // повторний запуск

let pass = 0, fail = 0
const ok = (c, name, extra = '') => { if (c) pass++; else { fail++; console.log('❌', name, extra) } }
const q = async (sql, p) => (await db.query(sql, p)).rows
const tryq = async (sql, p) => { try { return { rows: await q(sql, p) } } catch (e) { return { err: e.message } } }
async function as(uid, fn) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`) }
}

ok((await q(`select public.current_season() s`))[0].s === '2027', 'стартовий сезон 2027')
ok((await q(`select season from public.users where id='${SN}'`))[0].season === '2027', 'учень без сезону → 2027')
ok((await q(`select season from public.users where id='${T}'`))[0].season === null, 'вчителя не чіпаємо')

// Реєстрація: сезон за замовчуванням з налаштування
await db.exec(`insert into auth.users (id,email,raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000e1','n@x','{"name":"Новий"}')`)
ok((await q(`select season from public.users where id='00000000-0000-0000-0000-0000000000e1'`))[0]?.season === '2027', 'новий учень → поточний сезон')

// Учень не може змінити сезон ні функцією, ні напряму
await as(S1, async () => {
  ok(!!(await tryq(`select public.set_current_season('2028')`)).err, 'учень не викликає set_current_season')
  await tryq(`update public.app_settings set value='1999'`)
  ok(!!(await tryq(`insert into public.app_settings values ('current_season','1999')`)).err, 'учень не вставляє налаштування')
  ok((await q(`select public.current_season() s`))[0].s === '2027', 'учень читає сезон')
})
ok((await q(`select value from public.app_settings where key='current_season'`))[0].value === '2027', 'налаштування не змінене учнем')

// Вчитель: невалідний рік
await as(T, async () => {
  ok(!!(await tryq(`select public.set_current_season('28')`)).err, 'невалідний рік відхилено')
  const r = await q(`select public.set_current_season('2028') n`)
  ok(r[0].n === 3, 'в архів перейшло 3 учні (S1, SN, новий)', JSON.stringify(r))
})
ok((await q(`select public.current_season() s`))[0].s === '2028', 'сезон змінено на 2028')
await db.exec(`insert into auth.users (id,email,raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000e2','m@x','{"name":"Новий2"}')`)
ok((await q(`select season from public.users where id='00000000-0000-0000-0000-0000000000e2'`))[0]?.season === '2028', 'після зміни новий учень → 2028')
ok((await q(`select season from public.users where id='${S1}'`))[0].season === '2027', 'старі учні лишились у 2027 (архів)')

// Перенесення учня вчителем; учень сам себе не переносить
await as(SN, () => q(`update public.users set season='2028' where id='${SN}'`))
ok((await q(`select season from public.users where id='${SN}'`))[0].season === '2027', 'учень не переносить себе сам')
await as(T, () => q(`update public.users set season='2028' where id='${S1}'`))
ok((await q(`select season from public.users where id='${S1}'`))[0].season === '2028', 'вчитель переносить учня')

// Відкат
await as(T, () => q(`select public.set_current_season('2027')`))
ok((await q(`select public.current_season() s`))[0].s === '2027', 'відкат на 2027')

console.log(`\nПройдено: ${pass}, не пройдено: ${fail}`)
process.exit(fail ? 1 : 0)
