// Перевірка міграцій RLS + етапу 2 на PGlite (Postgres у процесі Node).
// Запуск: node stage2.test.mjs <шлях до 20261026_enable_rls.sql> <шлях до 20261026_stage2_server_scoring.sql>
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'

const db = new PGlite()
const RLS = fs.readFileSync(process.argv[2], 'utf8')
const ST2 = fs.readFileSync(process.argv[3], 'utf8')

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
create table public.variants (id uuid primary key, title text, is_published boolean default false,
  subject text default 'math', kind text default 'full', topic text, layout jsonb, time_limit int default 60);
create table public.questions (id uuid primary key default gen_random_uuid(), variant_id uuid references public.variants(id),
  number int, type text, text text, image_url text, topic text, options jsonb, correct_single text,
  left_items jsonb, right_items jsonb, correct_matching jsonb, correct_open text, accepted_answers text[],
  unique(variant_id, number));
create table public.attempts (id uuid primary key default gen_random_uuid(), student_id uuid, variant_id uuid,
  status text default 'in_progress', started_at timestamptz default now(), finished_at timestamptz,
  score_single int default 0, score_matching int default 0, score_open int default 0, score_total int default 0, nmt_score int);
create table public.answers (id uuid primary key default gen_random_uuid(), attempt_id uuid references public.attempts(id) on delete cascade,
  question_id uuid, question_type text, answer_single text, answer_matching jsonb, answer_open text, score int default 0,
  answered_at timestamptz default now(), unique(attempt_id, question_id));
create table public.set_attempts (id uuid primary key default gen_random_uuid(), student_id uuid,
  math_variant_id uuid, ukrainian_variant_id uuid, status text default 'in_progress', started_at timestamptz default now(),
  finished_at timestamptz, math_answers jsonb, ukrainian_answers jsonb,
  math_score_single int, math_score_matching int, math_score_open int, math_score_total int, math_nmt_score int,
  ukrainian_score_single int, ukrainian_score_matching int, ukrainian_score_total int, ukrainian_nmt_score int);
create table public.sets (id uuid primary key); create table public.materials (id uuid primary key);
create table public.score_conversion (raw int primary key, score int);
create table public.explanations (id uuid primary key default gen_random_uuid(), attempt_id uuid, question_id uuid, user_id uuid, explanation text);
alter table public.explanations enable row level security;
create function public.handle_new_user() returns trigger language plpgsql security definer as $f$ begin return new; end $f$;
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
`)
await db.exec(RLS)
await db.exec(ST2)
await db.exec(ST2) // повторний запуск

const T = '00000000-0000-0000-0000-00000000000a', S1 = '00000000-0000-0000-0000-0000000000b1', S2 = '00000000-0000-0000-0000-0000000000b2'
const VM = '00000000-0000-0000-0000-0000000000c1', VU = '00000000-0000-0000-0000-0000000000c2'
const VT = '00000000-0000-0000-0000-0000000000c3', VH = '00000000-0000-0000-0000-0000000000c4'

// Варіант математики 15/3/4; правильні: single 'А', matching 1-А 2-Б 3-В, open '2.5' (приймається і '2,5')
let ins = `insert into public.users (id,name,role,is_verified) values ('${T}','T','teacher',true),('${S1}','S1','student',true),('${S2}','S2','student',true);
insert into public.variants (id,title,is_published,subject,kind,time_limit) values
 ('${VM}','Мат',true,'math','full',60), ('${VU}','Укр',true,'ukrainian','full',60), ('${VT}','Тема',true,'math','topic',30), ('${VH}','Чернетка',false,'math','full',60);`
for (let n = 1; n <= 22; n++) {
  const t = n <= 15 ? 'single' : n <= 18 ? 'matching' : 'open'
  ins += `insert into public.questions (variant_id,number,type,text,options,correct_single,left_items,right_items,correct_matching,correct_open,accepted_answers) values
   ('${VM}',${n},'${t}','q${n}','{"А":"1","Б":"2"}',${t === 'single' ? "'А'" : 'null'},
    ${t === 'matching' ? `'[{"id":"1","text":"x"}]'` : 'null'}, ${t === 'matching' ? `'[{"id":"А","text":"y"}]'` : 'null'},
    ${t === 'matching' ? `'{"1":"А","2":"Б","3":"В"}'` : 'null'}, ${t === 'open' ? "'2.5'" : 'null'}, ${t === 'open' ? "array['2.5','2,5']" : 'null'});`
}
// Українська 25 single + 5 matching (4 пари)
for (let n = 1; n <= 30; n++) {
  const t = n <= 25 ? 'single' : 'matching'
  ins += `insert into public.questions (variant_id,number,type,text,correct_single,correct_matching) values
   ('${VU}',${n},'${t}','u${n}',${t === 'single' ? "'Б'" : 'null'},${t === 'matching' ? `'{"1":"А","2":"Б","3":"В","4":"Г"}'` : 'null'});`
}
ins += `insert into public.questions (variant_id,number,type,text,correct_single) values ('${VT}',1,'single','t1','А'),('${VT}',2,'single','t2','В');
insert into public.questions (variant_id,number,type,text,correct_single) values ('${VH}',1,'single','секрет','Г');`
await db.exec(ins)

let pass = 0, fail = 0
const ok = (c, name, extra = '') => { if (c) pass++; else { fail++; console.log('❌', name, extra) } }
const q = async (sql, p) => (await db.query(sql, p)).rows
const tryq = async (sql, p) => { try { return { rows: await q(sql, p) } } catch (e) { return { err: e.message } } }
async function as(uid, fn) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`) }
}
const QID = {}
for (const r of await q(`select variant_id, number, id from public.questions`)) QID[`${r.variant_id}:${r.number}`] = r.id
const qid = async (v, n) => QID[`${v}:${n}`]

// --- шкали ---
const sc = (await q(`select public.nmt_math_score(4) a, public.nmt_math_score(5) b, public.nmt_math_score(21) c, public.nmt_math_score(32) d,
  public.nmt_ukr_score(7) e, public.nmt_ukr_score(8) f, public.nmt_ukr_score(30) g, public.nmt_ukr_score(45) h`))[0]
ok(sc.a === null && sc.b === 100 && sc.c === 155 && sc.d === 200, 'шкала математики', JSON.stringify(sc))
ok(sc.e === null && sc.f === 100 && sc.g === 159 && sc.h === 200, 'шкала української', JSON.stringify(sc))

// --- питання під час тесту ---
let A1
await as(S1, async () => {
  const qs = await q(`select * from public.get_test_questions('${VM}')`)
  ok(qs.length === 22, 'учень отримує 22 питання')
  const keys = Object.keys(qs[0].get_test_questions)
  ok(!keys.some(k => k.startsWith('correct') || k === 'accepted_answers'), 'у питаннях немає правильних відповідей', keys.join(','))
  ok((await q(`select * from public.get_test_questions('${VH}')`)).length === 0, 'чернетку не віддає')
  ok((await q(`select id from public.questions where variant_id='${VM}'`)).length === 0, 'до завершення таблиця questions учню недоступна')

  // підробка при створенні спроби
  const r = await q(`insert into public.attempts (student_id,variant_id,status,nmt_score,score_total,started_at)
     values ('${S1}','${VM}','done',200,32, now() + interval '5 hours') returning *`)
  A1 = r[0].id
  ok(r[0].status === 'in_progress' && r[0].nmt_score === null && r[0].score_total === 0, 'підроблені поля при створенні скинуто', JSON.stringify(r[0]))
  ok(Math.abs(new Date(r[0].started_at) - Date.now()) < 60_000, 'started_at = now()')
  await q(`update public.attempts set nmt_score=200, status='done' where id='${A1}'`)
  // автозбереження відповідей
  const s1 = await qid(VM, 1)
  ok(!(await tryq(`insert into public.answers (attempt_id,question_id,question_type,answer_single,score) values ('${A1}','${s1}','single','Б',1)`)).err, 'автозбереження у свою спробу')
})
const a1row = (await q(`select status,nmt_score from public.attempts where id='${A1}'`))[0]
ok(a1row.status === 'in_progress' && a1row.nmt_score === null, 'учень не змінив статус/бал напряму', JSON.stringify(a1row))

// --- чужий учень не здає чужу спробу ---
await as(S2, async () => {
  const r = await tryq(`select public.submit_attempt('${A1}', '{}'::jsonb)`)
  ok(!!r.err, 'чужу спробу здати не можна')
})

// --- здавання: 10 single правильно, matching 3+2+0, open: '2,5', ' 2.5 ', '−2.5' неправильно, порожньо ---
const ans = {}
for (let n = 1; n <= 15; n++) ans[await qid(VM, n)] = { answer_single: n <= 10 ? 'А' : 'Б' }
ans[await qid(VM, 16)] = { answer_matching: { '1': 'А', '2': 'Б', '3': 'В' } }
ans[await qid(VM, 17)] = { answer_matching: { '1': 'А', '2': 'Б', '3': 'Г' } }
ans[await qid(VM, 18)] = { answer_matching: { '1': 'Д' } }
ans[await qid(VM, 19)] = { answer_open: '2,5' }
ans[await qid(VM, 20)] = { answer_open: ' 2.5 ' }
ans[await qid(VM, 21)] = { answer_open: '3' }
await as(S1, async () => {
  const r = (await q(`select public.submit_attempt($1, $2::jsonb) r`, [A1, JSON.stringify(ans)]))[0].r
  ok(r.score_total === 19, 'бал = 10 + 5 + 4 = 19', JSON.stringify(r))
  ok((await q(`select id from public.questions where variant_id='${VM}'`)).length === 22, 'після завершення питання з відповідями доступні')
  const w = await tryq(`update public.answers set score=99 where attempt_id='${A1}'`)
  const again = (await q(`select public.submit_attempt('${A1}', '{}'::jsonb) r`))[0].r
  ok(again.already_done === true, 'повторне здавання нічого не змінює')
})
const fin = (await q(`select * from public.attempts where id='${A1}'`))[0]
ok(fin.status === 'done' && fin.score_single === 10 && fin.score_matching === 5 && fin.score_open === 4 && fin.nmt_score === 151,
   'спроба: 10/5/4, НМТ 151', JSON.stringify(fin))
ok((await q(`select count(*)::int c from public.answers where attempt_id='${A1}'`))[0].c === 22, 'рядок відповіді для кожного з 22 питань')
ok((await q(`select max(score)::int m from public.answers where attempt_id='${A1}'`))[0].m <= 3, 'учень не переписав score після завершення')

// --- тематичний тест: без шкали НМТ ---
await as(S1, async () => {
  const a = (await q(`insert into public.attempts (student_id,variant_id) values ('${S1}','${VT}') returning id`))[0].id
  const t1 = await qid(VT, 1), t2 = await qid(VT, 2)
  await q(`select public.submit_attempt($1, $2::jsonb)`, [a, JSON.stringify({ [t1]: { answer_single: 'А' }, [t2]: { answer_single: 'А' } })])
  const r = (await q(`select score_total, nmt_score from public.attempts where id='${a}'`))[0]
  ok(r.score_total === 1 && r.nmt_score === null, 'тематичний тест: бал 1, НМТ null', JSON.stringify(r))
})

// --- запізнення: відповіді з браузера ігноруються ---
let A2
await as(S1, async () => {
  A2 = (await q(`insert into public.attempts (student_id,variant_id) values ('${S1}','${VM}') returning id`))[0].id
  await q(`insert into public.answers (attempt_id,question_id,question_type,answer_single) values ('${A2}','${await qid(VM, 1)}','single','А')`)
})
await db.exec(`update public.attempts set started_at = now() - interval '70 minutes' where id='${A2}'`)
await as(S1, async () => {
  const late = await tryq(`insert into public.answers (attempt_id,question_id,question_type,answer_single) values ('${A2}','${await qid(VM, 2)}','single','А')`)
  ok(!!late.err, 'після дедлайну автозбереження заборонене')
  const r = (await q(`select public.submit_attempt($1, $2::jsonb) r`, [A2, JSON.stringify(ans)]))[0].r
  ok(r.in_time === false && r.score_total === 1, 'після дедлайну рахуються лише збережені вчасно відповіді', JSON.stringify(r))
})

// --- сет ---
let SET
const mAns = {}, uAns = {}
for (let n = 1; n <= 15; n++) mAns[await qid(VM, n)] = { type: 'single', answer_single: 'А' }   // 15
for (let n = 1; n <= 25; n++) uAns[await qid(VU, n)] = { type: 'single', answer_single: n <= 20 ? 'Б' : 'А' } // 20
uAns[await qid(VU, 26)] = { type: 'matching', answer_matching: { '1': 'А', '2': 'Б', '3': 'В', '4': 'Г' } } // +4
await as(S1, async () => {
  const r = (await q(`insert into public.set_attempts (student_id,math_variant_id,ukrainian_variant_id,status,math_nmt_score,started_at)
     values ('${S1}','${VM}','${VU}','done',200, now() - interval '1 day') returning *`))[0]
  SET = r.id
  ok(r.status === 'in_progress' && r.math_nmt_score === null, 'підробка при створенні сету скинута', JSON.stringify({ s: r.status, m: r.math_nmt_score }))
  await q(`update public.set_attempts set math_answers=$1::jsonb, ukrainian_nmt_score=200, status='done' where id='${SET}'`, [JSON.stringify(mAns)])
  const after = (await q(`select status, ukrainian_nmt_score, math_answers from public.set_attempts where id='${SET}'`))[0]
  ok(after.status === 'in_progress' && after.ukrainian_nmt_score === null && Object.keys(after.math_answers).length === 15,
     'у сеті учень змінює лише відповіді', JSON.stringify({ s: after.status, u: after.ukrainian_nmt_score }))
  ok((await q(`select * from public.get_test_questions('${VU}')`)).length === 30, 'питання сету з української')
  const res = (await q(`select public.submit_set($1, $2::jsonb, $3::jsonb) r`, [SET, JSON.stringify(mAns), JSON.stringify(uAns)]))[0].r
  ok(res.in_time === true, 'сет зданий вчасно')
})
const sr = (await q(`select * from public.set_attempts where id='${SET}'`))[0]
ok(sr.status === 'done' && sr.math_score_total === 15 && sr.math_nmt_score === 147 && sr.ukrainian_score_total === 24 && sr.ukrainian_nmt_score === 149,
   'сет: математика 15→147, українська 24→149', JSON.stringify({ m: sr.math_score_total, mn: sr.math_nmt_score, u: sr.ukrainian_score_total, un: sr.ukrainian_nmt_score }))

// --- вчитель ---
await as(T, async () => {
  ok((await q(`select id from public.questions`)).length === 22 + 30 + 2 + 1, 'вчитель бачить усі питання')
  await q(`update public.attempts set nmt_score = 101 where id='${A2}'`)
})
ok((await q(`select nmt_score from public.attempts where id='${A2}'`))[0].nmt_score === 101, 'вчитель може виправити бал')

console.log(`\nПройдено: ${pass}, не пройдено: ${fail}`)
process.exit(fail ? 1 : 0)
