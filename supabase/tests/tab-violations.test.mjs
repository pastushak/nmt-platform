// Перевірка міграції контролю вкладки на PGlite.
// Запуск: node tab-violations.test.mjs <20261026_enable_rls.sql> <20261026_stage2_server_scoring.sql> <20261026_tab_violations.sql>
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'

const db = new PGlite()
const RLS = fs.readFileSync(process.argv[2], 'utf8')
const ST2 = fs.readFileSync(process.argv[3], 'utf8')
const TV = fs.readFileSync(process.argv[4], 'utf8')

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
await db.exec(TV)
await db.exec(TV) // повторний запуск

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
const report = async (kind, id, ans = null, ukr = null) =>
  (await q(`select public.report_violation($1,$2,$3,$4) r`, [kind, id, ans, ukr]))[0].r

const qids = (await q(`select id, number from public.questions where variant_id='${VM}' order by number`)).map(r => r.id)

// ---------- Варіант ----------
const att = await as(S1, async () => {
  const a = (await q(`insert into public.attempts (student_id, variant_id, violations, annulled) values ('${S1}','${VM}', -50, false) returning id, violations`))[0]
  ok(a.violations === 0, 'учень не підставляє собі від’ємний лічильник', JSON.stringify(a))
  // учень не змінює лічильник напряму
  await q(`update public.attempts set violations = 0, annulled = false where id = '${a.id}'`)
  const r1 = await report('attempt', a.id)
  ok(r1.violations === 1 && r1.annulled === false && r1.limit === 3, '1-ше порушення — попередження', JSON.stringify(r1))
  await q(`update public.attempts set violations = 0 where id = '${a.id}'`)
  const r2 = await report('attempt', a.id)
  ok(r2.violations === 2 && !r2.annulled, '2-ге порушення — попередження (скинути напряму не вдалося)', JSON.stringify(r2))
  // 3 правильні відповіді на 1-3 у браузері (ще не збережені)
  const ans = { [qids[0]]: { answer_single: 'А' }, [qids[1]]: { answer_single: 'А' }, [qids[2]]: { answer_single: 'Б' } }
  const r3 = await report('attempt', a.id, ans)
  ok(r3.violations === 3 && r3.annulled === true, '3-тє — анулювання', JSON.stringify(r3))
  ok(r3.result?.score_total === 2, 'зараховано введені відповіді (2 правильні)', JSON.stringify(r3.result))
  const r4 = await report('attempt', a.id)
  ok(r4.violations === 3 && r4.annulled, 'після здачі лічильник не змінюється', JSON.stringify(r4))
  const ins = await tryq(`insert into public.answers (attempt_id, question_id, question_type, answer_single) values ('${a.id}','${qids[5]}','single','А')`)
  ok(!!ins.err, 'після анулювання відповіді не приймаються')
  return a.id
})
const row = (await q(`select status, annulled, violations, score_total from public.attempts where id='${att}'`))[0]
ok(row.status === 'done' && row.annulled && row.violations === 3 && row.score_total === 2, 'у БД: done, анульовано, 3 порушення, 2 бали', JSON.stringify(row))

// Чужа спроба
const other = await as(S2, () => tryq(`select public.report_violation('attempt','${att}')`))
ok(!!other.err, 'інший учень не звітує по чужій спробі')
ok(!!(await as(S1, () => tryq(`select public.report_violation('hack','${att}')`))).err, 'невірний тип відхилено')

// Вчитель бачить позначки
const t = await as(T, () => q(`select annulled, violations from public.attempts where id='${att}'`))
ok(t[0]?.annulled === true, 'вчитель бачить анулювання')

// ---------- Сет ----------
const sid = await as(S1, async () => {
  const s = (await q(`insert into public.set_attempts (student_id, math_variant_id, ukrainian_variant_id, violations) values ('${S1}','${VM}','${VU}', -9) returning id, violations`))[0]
  ok(s.violations === 0, 'сет: лічильник з нуля')
  await report('set', s.id); await report('set', s.id)
  const r = await report('set', s.id, { [qids[0]]: { answer_single: 'А' } }, {})
  ok(r.annulled && r.violations === 3, 'сет: 3-тє — анулювання', JSON.stringify(r))
  return s.id
})
const srow = (await q(`select status, annulled, math_score_total from public.set_attempts where id='${sid}'`))[0]
ok(srow.status === 'done' && srow.annulled && srow.math_score_total === 1, 'сет здано з введеними відповідями', JSON.stringify(srow))

// Звичайна здача без порушень — annulled = false
await as(S1, async () => {
  const a = (await q(`insert into public.attempts (student_id, variant_id) values ('${S1}','${VT}') returning id`))[0]
  await q(`select public.submit_attempt('${a.id}', '{}'::jsonb)`)
  const r = (await q(`select annulled, violations, status from public.attempts where id='${a.id}'`))[0]
  ok(r.status === 'done' && !r.annulled && r.violations === 0, 'звичайна здача не анулюється', JSON.stringify(r))
})

console.log(`\nПройдено: ${pass}, не пройдено: ${fail}`)
process.exit(fail ? 1 : 0)
