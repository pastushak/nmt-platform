-- =====================================================================
-- Етап 2: чесні тести
--  • під час тесту учень отримує питання БЕЗ правильних відповідей
--  • бал рахує база (submit_attempt / submit_set), а не браузер
--  • учень не може сам записати собі бал, статус «done» чи зсунути час старту
--  • після закінчення часу (+2 хв запасу) відповіді більше не приймаються
--
-- Потрібна попередня міграція 20261026_enable_rls.sql (функція is_teacher()).
-- Запускати в Supabase → SQL Editor ОДИН раз. Безпечна для повторного запуску.
-- =====================================================================

begin;

-- ---------- 1. Таблиці переведення в шкалу 100–200 ----------
create or replace function public.nmt_math_score(raw integer)
returns integer language sql immutable as $$
  select (array[100,108,115,123,131,134,137,140,143,145,147,148,149,150,151,152,
                155,159,163,167,170,173,176,180,184,189,194,200])[raw - 4]
  where raw between 5 and 32;
$$;

create or replace function public.nmt_ukr_score(raw integer)
returns integer language sql immutable as $$
  select (array[100,105,110,120,125,130,134,136,138,140,142,143,144,145,146,148,149,150,
                152,154,156,157,159,160,162,163,165,167,170,172,175,177,180,183,186,191,195,200])[raw - 7]
  where raw between 8 and 45;
$$;


-- ---------- 2. Оцінювання однієї відповіді (та сама логіка, що була в lib/scoring.ts) ----------
drop function if exists public.score_answer(text, text, jsonb, jsonb, text, jsonb, text);
create or replace function public.score_answer(
  q_type text, correct_single text, correct_matching jsonb, accepted jsonb,
  a_single text, a_matching jsonb, a_open text, correct_open text default null)
returns integer language plpgsql immutable as $$
declare
  pts integer := 0;
  k text;
  norm text;
begin
  if q_type = 'single' then
    return case when a_single is not null and a_single = correct_single then 1 else 0 end;
  elsif q_type = 'matching' then
    if a_matching is null or correct_matching is null
       or jsonb_typeof(a_matching) <> 'object' or jsonb_typeof(correct_matching) <> 'object' then return 0; end if;
    for k in select jsonb_object_keys(correct_matching) loop
      if (a_matching ->> k) = (correct_matching ->> k) then pts := pts + 1; end if;
    end loop;
    return pts;
  elsif q_type = 'open' then
    if a_open is null then return 0; end if;
    accepted := coalesce(accepted, '[]'::jsonb);
    if jsonb_typeof(accepted) <> 'array' then accepted := '[]'::jsonb; end if;
    if correct_open is not null then accepted := accepted || to_jsonb(correct_open); end if;
    norm := replace(replace(lower(regexp_replace(a_open, '^\s+|\s+$', '', 'g')), ',', '.'), '−', '-');
    if exists (
      select 1 from jsonb_array_elements_text(accepted) v
      where replace(replace(lower(regexp_replace(v, '^\s+|\s+$', '', 'g')), ',', '.'), '−', '-') = norm
    ) then return 2; end if;
    return 0;
  end if;
  return 0;
end;
$$;


-- ---------- 3. Питання для проходження тесту — без правильних відповідей ----------
create or replace function public.get_test_questions(p_variant_id uuid)
returns setof json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'id', q.id, 'variant_id', q.variant_id, 'number', q.number, 'type', q.type,
    'text', q.text, 'image_url', q.image_url, 'topic', q.topic,
    'options', to_jsonb(q.options),
    'left_items', to_jsonb(q.left_items),
    'right_items', to_jsonb(q.right_items)
  )
  from public.questions q
  join public.variants v on v.id = q.variant_id
  where q.variant_id = p_variant_id
    and auth.uid() is not null
    and (v.is_published or public.is_teacher())
  order by q.number;
$$;

revoke all on function public.get_test_questions(uuid) from public;
grant execute on function public.get_test_questions(uuid) to authenticated;


-- ---------- 4. Учень бачить питання з відповідями лише після завершення спроби ----------
drop policy if exists questions_select on public.questions;
create policy questions_select on public.questions
  for select to authenticated
  using (
    public.is_teacher()
    or exists (select 1 from public.attempts a
               where a.variant_id = questions.variant_id
                 and a.student_id = auth.uid() and a.status = 'done')
    or exists (select 1 from public.set_attempts s
               where s.student_id = auth.uid() and s.status = 'done'
                 and (s.math_variant_id = questions.variant_id
                      or s.ukrainian_variant_id = questions.variant_id))
  );


-- ---------- 5. attempts: учень лише створює спробу; бал і статус — тільки через submit ----------
create or replace function public.guard_attempts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or current_setting('app.scoring', true) = '1' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Час старту ставить база для всіх (від нього рахується дедлайн)
    new.status := 'in_progress';
    new.started_at := now();
    new.finished_at := null;
    if public.is_teacher() then return new; end if;
    if not exists (select 1 from public.variants v where v.id = new.variant_id and v.is_published) then
      raise exception 'Варіант недоступний' using errcode = '42501';
    end if;
    new.score_single := 0; new.score_matching := 0; new.score_open := 0;
    new.score_total := 0;  new.nmt_score := null;
  elsif public.is_teacher() then
    return new;
  else
    -- Будь-які зміни учня поза submit_attempt ігноруються
    new := old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_attempts on public.attempts;
create trigger trg_guard_attempts
  before insert or update on public.attempts
  for each row execute function public.guard_attempts();

-- Оновлювати спроби напряму учню більше не потрібно (лише через submit_attempt)
drop policy if exists attempts_update on public.attempts;
create policy attempts_update on public.attempts
  for update to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());


-- ---------- 6. answers: писати можна лише у свою незавершену спробу і до кінця часу ----------
drop policy if exists answers_own on public.answers;
drop policy if exists answers_own_select on public.answers;
drop policy if exists answers_own_insert on public.answers;
drop policy if exists answers_own_update on public.answers;
drop policy if exists answers_own_delete on public.answers;

create or replace function public.attempt_is_open(p_attempt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.attempts a
    join public.variants v on v.id = a.variant_id
    where a.id = p_attempt_id
      and a.student_id = auth.uid()
      and a.status = 'in_progress'
      and now() <= a.started_at + make_interval(mins => coalesce(v.time_limit, 60)::int + 2)
  );
$$;
revoke all on function public.attempt_is_open(uuid) from public;
grant execute on function public.attempt_is_open(uuid) to authenticated;

create policy answers_own_select on public.answers
  for select to authenticated
  using (exists (select 1 from public.attempts a
                 where a.id = answers.attempt_id and a.student_id = auth.uid()));

create policy answers_own_insert on public.answers
  for insert to authenticated
  with check (public.attempt_is_open(attempt_id));

create policy answers_own_update on public.answers
  for update to authenticated
  using (public.attempt_is_open(attempt_id))
  with check (public.attempt_is_open(attempt_id));

create policy answers_own_delete on public.answers
  for delete to authenticated
  using (public.attempt_is_open(attempt_id));


-- ---------- 7. Здавання тесту ----------
-- p_answers: {"<question_id>": {"answer_single": "А"} | {"answer_matching": {...}} | {"answer_open": "3,5"}}
create or replace function public.submit_attempt(p_attempt_id uuid, p_answers jsonb default '{}'::jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  att   public.attempts%rowtype;
  var   public.variants%rowtype;
  q     record;
  a     jsonb;
  s     integer;
  s_single integer := 0; s_matching integer := 0; s_open integer := 0;
  in_time boolean;
begin
  select * into att from public.attempts where id = p_attempt_id for update;
  if not found or att.student_id is distinct from auth.uid() then
    raise exception 'Спробу не знайдено' using errcode = '42501';
  end if;
  if att.status = 'done' then
    return json_build_object('attempt_id', att.id, 'score_total', att.score_total,
                             'nmt_score', att.nmt_score, 'already_done', true);
  end if;

  select * into var from public.variants where id = att.variant_id;
  in_time := now() <= att.started_at + make_interval(mins => coalesce(var.time_limit, 60)::int + 2);

  -- Свіжі відповіді з браузера приймаємо лише вчасно; інакше рахуємо збережені
  if in_time and p_answers is not null then
    for q in select id, type from public.questions where variant_id = att.variant_id loop
      a := p_answers -> q.id::text;
      if a is not null then
        insert into public.answers (attempt_id, question_id, question_type,
                                    answer_single, answer_matching, answer_open, score)
        values (att.id, q.id, q.type,
                a ->> 'answer_single', a -> 'answer_matching', a ->> 'answer_open', 0)
        on conflict (attempt_id, question_id) do update
          set question_type = excluded.question_type,
              answer_single = excluded.answer_single,
              answer_matching = excluded.answer_matching,
              answer_open = excluded.answer_open;
      end if;
    end loop;
  end if;

  -- Оцінюємо кожне питання варіанта (рядок відповіді створюємо і для пропущених)
  for q in
    select qq.id, qq.type, qq.correct_single, qq.correct_open::text as co,
           to_jsonb(qq.correct_matching) as cm, to_jsonb(qq.accepted_answers) as acc,
           an.answer_single, to_jsonb(an.answer_matching) as am, an.answer_open
    from public.questions qq
    left join public.answers an on an.attempt_id = att.id and an.question_id = qq.id
    where qq.variant_id = att.variant_id
  loop
    s := public.score_answer(q.type, q.correct_single, q.cm, q.acc, q.answer_single, q.am, q.answer_open, q.co);
    if q.type = 'single' then s_single := s_single + s;
    elsif q.type = 'matching' then s_matching := s_matching + s;
    else s_open := s_open + s; end if;

    insert into public.answers (attempt_id, question_id, question_type, score)
    values (att.id, q.id, q.type, s)
    on conflict (attempt_id, question_id) do update set score = excluded.score;
  end loop;

  perform set_config('app.scoring', '1', true);
  update public.attempts set
    status = 'done',
    finished_at = least(now(), att.started_at + make_interval(mins => coalesce(var.time_limit, 60)::int + 2)),
    score_single = s_single,
    score_matching = s_matching,
    score_open = s_open,
    score_total = s_single + s_matching + s_open,
    nmt_score = case when var.kind = 'topic' then null
                     when var.subject = 'ukrainian' then public.nmt_ukr_score(s_single + s_matching + s_open)
                     else public.nmt_math_score(s_single + s_matching + s_open) end
  where id = att.id;
  perform set_config('app.scoring', '', true);

  return json_build_object('attempt_id', att.id,
                           'score_total', s_single + s_matching + s_open,
                           'in_time', in_time);
end;
$$;

revoke all on function public.submit_attempt(uuid, jsonb) from public;
grant execute on function public.submit_attempt(uuid, jsonb) to authenticated;


-- ---------- 8. set_attempts: учень змінює лише свої відповіді, і лише вчасно ----------
create or replace function public.guard_set_attempts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or current_setting('app.scoring', true) = '1' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'in_progress';
    new.started_at := now();
    new.finished_at := null;
    if public.is_teacher() then return new; end if;
    -- Лише опублікований повний варіант математики + опублікований варіант української
    if not exists (select 1 from public.variants v where v.id = new.math_variant_id
                   and v.is_published and v.subject = 'math' and coalesce(v.kind, 'full') = 'full')
       or not exists (select 1 from public.variants v where v.id = new.ukrainian_variant_id
                      and v.is_published and v.subject = 'ukrainian') then
      raise exception 'Невірний варіант' using errcode = '42501';
    end if;
    new.math_answers := null; new.ukrainian_answers := null;
    new.math_score_single := 0; new.math_score_matching := 0; new.math_score_open := 0;
    new.math_score_total := 0;  new.math_nmt_score := null;
    new.ukrainian_score_single := 0; new.ukrainian_score_matching := 0;
    new.ukrainian_score_total := 0;  new.ukrainian_nmt_score := null;
    return new;
  end if;

  if public.is_teacher() then return new; end if;

  -- UPDATE: лише відповіді, лише в незавершеному сеті й до кінця часу (120 хв + 2)
  if old.status = 'in_progress' and now() <= old.started_at + interval '122 minutes' then
    return jsonb_populate_record(old, jsonb_build_object(
      'math_answers', to_jsonb(new.math_answers),
      'ukrainian_answers', to_jsonb(new.ukrainian_answers)));
  end if;
  return old;
end;
$$;

drop trigger if exists trg_guard_set_attempts on public.set_attempts;
create trigger trg_guard_set_attempts
  before insert or update on public.set_attempts
  for each row execute function public.guard_set_attempts();


-- ---------- 9. Здавання сету ----------
create or replace function public.submit_set(
  p_set_id uuid, p_math jsonb default null, p_ukr jsonb default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  st    public.set_attempts%rowtype;
  q     record;
  s     integer;
  m_single integer := 0; m_matching integer := 0; m_open integer := 0;
  u_single integer := 0; u_matching integer := 0;
  m_ans jsonb; u_ans jsonb;
  in_time boolean;
begin
  select * into st from public.set_attempts where id = p_set_id for update;
  if not found or st.student_id is distinct from auth.uid() then
    raise exception 'Сет не знайдено' using errcode = '42501';
  end if;
  if st.status = 'done' then
    return json_build_object('set_id', st.id, 'already_done', true);
  end if;

  in_time := now() <= st.started_at + interval '122 minutes';
  m_ans := coalesce(case when in_time then p_math end, to_jsonb(st.math_answers), '{}'::jsonb);
  u_ans := coalesce(case when in_time then p_ukr end, to_jsonb(st.ukrainian_answers), '{}'::jsonb);

  for q in
    select id, type, correct_single, correct_open::text co, to_jsonb(correct_matching) cm, to_jsonb(accepted_answers) acc
    from public.questions where variant_id = st.math_variant_id
  loop
    s := public.score_answer(q.type, q.correct_single, q.cm, q.acc,
           m_ans -> q.id::text ->> 'answer_single', m_ans -> q.id::text -> 'answer_matching',
           m_ans -> q.id::text ->> 'answer_open', q.co);
    if q.type = 'single' then m_single := m_single + s;
    elsif q.type = 'matching' then m_matching := m_matching + s;
    else m_open := m_open + s; end if;
  end loop;

  for q in
    select id, type, correct_single, correct_open::text co, to_jsonb(correct_matching) cm, to_jsonb(accepted_answers) acc
    from public.questions where variant_id = st.ukrainian_variant_id
  loop
    s := public.score_answer(q.type, q.correct_single, q.cm, q.acc,
           u_ans -> q.id::text ->> 'answer_single', u_ans -> q.id::text -> 'answer_matching',
           u_ans -> q.id::text ->> 'answer_open', q.co);
    if q.type = 'matching' then u_matching := u_matching + s;
    else u_single := u_single + s; end if;
  end loop;

  perform set_config('app.scoring', '1', true);
  update public.set_attempts set
    status = 'done',
    finished_at = least(now(), st.started_at + interval '122 minutes'),
    math_answers = m_ans,
    ukrainian_answers = u_ans,
    math_score_single = m_single,
    math_score_matching = m_matching,
    math_score_open = m_open,
    math_score_total = m_single + m_matching + m_open,
    math_nmt_score = public.nmt_math_score(m_single + m_matching + m_open),
    ukrainian_score_single = u_single,
    ukrainian_score_matching = u_matching,
    ukrainian_score_total = u_single + u_matching,
    ukrainian_nmt_score = public.nmt_ukr_score(u_single + u_matching)
  where id = st.id;
  perform set_config('app.scoring', '', true);

  return json_build_object('set_id', st.id, 'in_time', in_time);
end;
$$;

revoke all on function public.submit_set(uuid, jsonb, jsonb) from public;
grant execute on function public.submit_set(uuid, jsonb, jsonb) to authenticated;

commit;
