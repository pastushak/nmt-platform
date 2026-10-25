import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'

const db = new PGlite()
const MIG = fs.readFileSync(process.argv[2], 'utf8')

// ---- Модель середовища Supabase: ролі, auth.uid(), auth.users, схема як у проєкті ----
await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);

create table public.users (id uuid primary key, name text, email text, role text default 'student',
  is_verified boolean default false, is_active boolean default true, season text default '2027',
  created_at timestamptz default now(), last_seen_at timestamptz);
create table public.variants (id uuid primary key, title text, is_published boolean default false,
  subject text default 'math', kind text default 'full', topic text, layout jsonb, created_by uuid, created_at timestamptz default now(), time_limit int default 60, description text);
create table public.questions (id uuid primary key, variant_id uuid references public.variants(id), number int, type text,
  text text, correct_single text, unique(variant_id, number));
create table public.attempts (id uuid primary key, student_id uuid, variant_id uuid, status text default 'in_progress',
  score_total int default 0, nmt_score int, started_at timestamptz, finished_at timestamptz);
create table public.answers (id uuid primary key default gen_random_uuid(), attempt_id uuid references public.attempts(id) on delete cascade,
  question_id uuid, answer_single text, score int default 0, unique(attempt_id, question_id));
create table public.set_attempts (id uuid primary key, student_id uuid, status text default 'in_progress', math_nmt_score int);
create table public.sets (id uuid primary key, title text);
create table public.materials (id uuid primary key, title text);
create table public.score_conversion (raw int primary key, score int);
create table public.explanations (id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null, user_id uuid not null default auth.uid(), explanation text not null, unique(attempt_id, question_id));

alter table public.explanations enable row level security;
-- як у старій БД: тригер реєстрації, що бере роль з metadata, і старий тригер сезону
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path to 'public' as $f$
begin insert into public.users (id,name,email,role) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email,
 coalesce(new.raw_user_meta_data->>'role','student')); return new; end; $f$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.protect_user_season() returns trigger language plpgsql as $f$ begin return new; end; $f$;
create trigger trg_protect_user_season before update on public.users for each row execute function public.protect_user_season();
-- старі політики з рекурсією (як у реальній БД)
create policy teacher_select_all on public.users for select using ((select u.role from public.users u where u.id = auth.uid()) = 'teacher');
create policy users_select_own on public.users for select using (auth.uid() = id);

-- Supabase за замовчуванням дає ролям повні права на таблиці public
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
`)

const T = '00000000-0000-0000-0000-00000000000a'  // вчитель
const S1 = '00000000-0000-0000-0000-0000000000b1' // учень 1
const S2 = '00000000-0000-0000-0000-0000000000b2' // учень 2
const V_PUB = '00000000-0000-0000-0000-0000000000c1', V_HID = '00000000-0000-0000-0000-0000000000c2'
const A1 = '00000000-0000-0000-0000-0000000000d1', A2 = '00000000-0000-0000-0000-0000000000d2'

await db.exec(`
insert into public.users (id,name,email,role,is_verified) values
 ('${T}','Вчитель','t@x','teacher',true), ('${S1}','Учень Один','s1@x','student',true), ('${S2}','Учень Два','s2@x','student',false);
insert into public.variants (id,title,is_published) values ('${V_PUB}','Опубл.',true), ('${V_HID}','Чернетка',false);
insert into public.questions (id,variant_id,number,type,text,correct_single) values
 (gen_random_uuid(),'${V_PUB}',1,'single','q','А'), (gen_random_uuid(),'${V_HID}',1,'single','секрет','Б');
insert into public.attempts (id,student_id,variant_id,status,nmt_score) values
 ('${A1}','${S1}','${V_PUB}','done',150), ('${A2}','${S2}','${V_PUB}','done',170);
insert into public.set_attempts (id,student_id) values (gen_random_uuid(),'${S1}'), (gen_random_uuid(),'${S2}');
insert into public.score_conversion values (5,100);
`)

// ---- Застосувати міграцію (як у SQL Editor — суперкористувачем, auth.uid() = null) ----
await db.exec(MIG)
await db.exec(MIG) // повторний запуск має бути безпечним

let pass = 0, fail = 0
const ok = (cond, name, extra = '') => { if (cond) { pass++ } else { fail++; console.log('❌', name, extra) } }

async function as(role, uid, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${role};`)
  try { return await fn() } finally { await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);") }
}
const q = async (sql) => (await db.query(sql)).rows
const tryq = async (sql) => { try { return { rows: await q(sql) } } catch (e) { return { err: e.message } } }

// --- Анонімний відвідувач ---
await as('anon', null, async () => {
  ok((await tryq('select * from public.users')).rows?.length === 0 || (await tryq('select * from public.users')).err, 'anon не бачить users')
  const r = await tryq(`update public.users set role='teacher'`)
  ok(r.err || true, 'anon update users')
  ok((await tryq('select * from public.attempts')).rows?.length === 0 || (await tryq('select * from public.attempts')).err, 'anon не бачить attempts')
})
ok((await q(`select count(*)::int c from public.users where role='teacher'`))[0].c === 1, 'після anon вчитель лише один')

// --- Учень 1 ---
await as('authenticated', S1, async () => {
  const users = await q('select id from public.users')
  ok(users.length === 1 && users[0].id === S1, 'учень бачить лише себе', JSON.stringify(users))
  await q(`update public.users set role='teacher', is_active=true, is_verified=true, season='2026', name='Нове Імʼя' where id='${S1}'`)
  await q(`update public.users set name='Зламав' where id='${S2}'`)
})
let me = (await q(`select * from public.users where id='${S1}'`))[0]
ok(me.role === 'student' && me.season === '2027', 'учень не змінив собі role/season', JSON.stringify(me))
ok(me.name === 'Нове Імʼя', 'учень змінив своє імʼя')
ok((await q(`select name from public.users where id='${S2}'`))[0].name === 'Учень Два', 'учень не змінив чужий рядок')
await db.exec(`update public.users set is_active=false where id='${S2}'`)
await as('authenticated', S2, async () => { await q(`update public.users set is_active=true where id='${S2}'`) })
ok((await q(`select is_active from public.users where id='${S2}'`))[0].is_active === false, 'заблокований учень не розблокував себе')
await db.exec(`update public.users set is_active=true where id='${S2}'`)

await as('authenticated', S1, async () => {
  ok((await q('select id from public.variants')).length === 1, 'учень бачить лише опубліковані варіанти')
  ok((await q('select text from public.questions')).every(r => r.text !== 'секрет'), 'учень не бачить питань чернетки')
  ok((await q('select id from public.attempts')).every(r => r.id === A1), 'учень бачить лише свої спроби')
  ok((await q('select id from public.set_attempts')).length === 1, 'учень бачить лише свої сети')
  const ins = await tryq(`insert into public.attempts (id,student_id,variant_id) values (gen_random_uuid(),'${S2}','${V_PUB}')`)
  ok(!!ins.err, 'учень не створює спробу від чужого імені')
  const ins2 = await tryq(`insert into public.attempts (id,student_id,variant_id) values (gen_random_uuid(),'${S1}','${V_PUB}')`)
  ok(!ins2.err, 'учень створює свою спробу', ins2.err)
  await q(`update public.attempts set nmt_score=200 where id='${A2}'`)
  await q(`delete from public.attempts where id='${A1}'`)
  const ans = await tryq(`insert into public.answers (attempt_id,question_id,answer_single) values ('${A2}',gen_random_uuid(),'А')`)
  ok(!!ans.err, 'учень не пише відповіді в чужу спробу')
  const ans2 = await tryq(`insert into public.answers (attempt_id,question_id,answer_single) values ('${A1}',gen_random_uuid(),'А')`)
  ok(!ans2.err, 'учень пише відповіді у свою спробу', ans2.err)
  const v = await tryq(`update public.variants set is_published=true where id='${V_HID}'`)
  const avg = await q('select * from public.class_variant_averages()')
  ok(avg.length === 1 && avg[0].avg_score === 160, 'середній бал класу через RPC', JSON.stringify(avg))
  ok((await q('select public.is_teacher() t'))[0].t === false, 'is_teacher() для учня = false')
})
ok((await q(`select nmt_score from public.attempts where id='${A2}'`))[0].nmt_score === 170, 'учень не змінив чужий бал')
ok((await q(`select count(*)::int c from public.attempts where id='${A1}'`))[0].c === 1, 'учень не видалив спробу')
ok((await q(`select is_published from public.variants where id='${V_HID}'`))[0].is_published === false, 'учень не опублікував варіант')

// --- Вчитель ---
await as('authenticated', T, async () => {
  ok((await q('select id from public.users')).length === 3, 'вчитель бачить усіх учнів')
  ok((await q('select id from public.variants')).length === 2, 'вчитель бачить чернетки')
  ok((await q('select id from public.attempts')).length === 3, 'вчитель бачить усі спроби')
  await q(`update public.users set is_verified=true, season='2026' where id='${S2}'`)
  await q(`update public.variants set is_published=true where id='${V_HID}'`)
  await q(`insert into public.questions (id,variant_id,number,type,text) values (gen_random_uuid(),'${V_HID}',2,'single','нове')`)
  await q(`delete from public.answers where attempt_id='${A1}'`)
  const del = await q(`delete from public.attempts where id='${A1}' returning id`)
  ok(del.length === 1, 'вчитель видаляє спробу')
  const up = await q(`insert into public.users (id,name,email,role,is_verified,is_active) values ('00000000-0000-0000-0000-0000000000b3','Новий','n@x','student',true,true)
    on conflict (id) do update set is_verified=true returning id`)
  ok(up.length === 1, 'вчитель додає учня (upsert)')
})
const s2 = (await q(`select is_verified, season from public.users where id='${S2}'`))[0]
ok(s2.is_verified === true && s2.season === '2026', 'вчитель змінив статус і сезон учня', JSON.stringify(s2))
ok((await q(`select is_published from public.variants where id='${V_HID}'`))[0].is_published === true, 'вчитель публікує варіант')

// --- Реєстрація: роль з metadata ігнорується ---
await db.exec(`insert into auth.users (id,email,raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000e1','hack@x','{"role":"teacher","name":"Хакер"}')`)
const h = (await q(`select role, name, season from public.users where id='00000000-0000-0000-0000-0000000000e1'`))[0]
ok(h.role === 'student' && h.name === 'Хакер' && h.season === '2027', 'signUp з role=teacher створює учня', JSON.stringify(h))

// --- RLS увімкнено всюди ---
const off = await q(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`)
ok(off.length === 0, 'RLS увімкнено на всіх таблицях', JSON.stringify(off))

console.log(`\nПройдено: ${pass}, не пройдено: ${fail}`)
process.exit(fail ? 1 : 0)
