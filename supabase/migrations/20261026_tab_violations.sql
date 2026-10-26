-- =====================================================================
-- Міграція: контроль виходу з вкладки під час тесту
--
-- Кожен вихід учня з вкладки тесту (інша вкладка, згорнутий браузер,
-- інша програма) — порушення. 1-ше і 2-ге — попередження,
-- на 3-тє тест анулюється: відповіді, введені до цього моменту,
-- зараховуються, спроба позначається «анульовано».
-- Працює для повних варіантів, тематичних тестів і сету.
--
-- Лічильник веде база (report_violation) — учень не може його скинути.
-- Змінити ліміт: max_violations у report_violation.
--
-- Потрібна міграція 20261026_stage2_server_scoring.sql.
-- Запускати в Supabase → SQL Editor ОДИН раз, ДО деплою нового коду.
-- Безпечна для повторного запуску.
-- =====================================================================

begin;

alter table public.attempts     add column if not exists violations integer not null default 0;
alter table public.attempts     add column if not exists annulled   boolean not null default false;
alter table public.set_attempts add column if not exists violations integer not null default 0;
alter table public.set_attempts add column if not exists annulled   boolean not null default false;


-- ---------- Нова спроба завжди починається з нуля порушень ----------
create or replace function public.reset_violations_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.scoring', true), '') <> '1' then
    new.violations := 0;
    new.annulled := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_violations on public.attempts;
create trigger trg_reset_violations
  before insert on public.attempts
  for each row execute function public.reset_violations_on_insert();

drop trigger if exists trg_reset_violations on public.set_attempts;
create trigger trg_reset_violations
  before insert on public.set_attempts
  for each row execute function public.reset_violations_on_insert();


-- ---------- Зафіксувати порушення ----------
-- p_kind: 'attempt' (варіант / тематичний тест) або 'set'.
-- p_answers — поточні відповіді з браузера (для сету — математика), p_ukr — українська.
-- На порушенні, що вичерпує ліміт, тест здається з цими відповідями й анулюється.
-- Повертає: {"violations": n, "limit": 3, "annulled": bool, "result": <відповідь submit_*>}
create or replace function public.report_violation(
  p_kind text, p_id uuid, p_answers jsonb default null, p_ukr jsonb default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  max_violations constant int := 3;
  v_student uuid; v_status text; v_count int; v_annulled boolean;
  res json;
begin
  if p_kind = 'attempt' then
    select student_id, status, violations, annulled
      into v_student, v_status, v_count, v_annulled
      from public.attempts where id = p_id for update;
  elsif p_kind = 'set' then
    select student_id, status, violations, annulled
      into v_student, v_status, v_count, v_annulled
      from public.set_attempts where id = p_id for update;
  else
    raise exception 'Невірний тип' using errcode = '22023';
  end if;

  if v_student is null or v_student is distinct from auth.uid() then
    raise exception 'Спробу не знайдено' using errcode = '42501';
  end if;

  -- Уже здано — нічого не змінюємо
  if v_status = 'done' then
    return json_build_object('violations', v_count, 'limit', max_violations, 'annulled', v_annulled);
  end if;

  v_count := v_count + 1;
  v_annulled := v_count >= max_violations;

  perform set_config('app.scoring', '1', true);
  if p_kind = 'attempt' then
    update public.attempts set violations = v_count, annulled = v_annulled where id = p_id;
  else
    update public.set_attempts set violations = v_count, annulled = v_annulled where id = p_id;
  end if;
  perform set_config('app.scoring', '', true);

  if v_annulled then
    if p_kind = 'attempt' then
      res := public.submit_attempt(p_id, coalesce(p_answers, '{}'::jsonb));
    else
      res := public.submit_set(p_id, p_answers, p_ukr);
    end if;
  end if;

  return json_build_object('violations', v_count, 'limit', max_violations,
                           'annulled', v_annulled, 'result', res);
end;
$$;

revoke all on function public.report_violation(text, uuid, jsonb, jsonb) from public;
grant execute on function public.report_violation(text, uuid, jsonb, jsonb) to authenticated;

commit;
