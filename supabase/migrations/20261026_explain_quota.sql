-- =====================================================================
-- Міграція: чесний ліміт AI-пояснень
--
-- Було: ліміт перевірявся ДО запиту до ШІ, а запис — ПІСЛЯ. Кілька
-- одночасних натискань проходили перевірку всі разом. Крім того, ліміт
-- був лише «3 на спробу» — нова (навіть порожня) спроба давала ще 3.
--
-- Стало: перед запитом до ШІ база атомарно бронює місце (рядок без тексту)
-- і перевіряє обидва ліміти:
--   • 3 пояснення на одну спробу;
--   • 15 пояснень на учня за останні 24 години.
-- Якщо ШІ не відповів — бронь знімається, ліміт не витрачається.
-- Змінити ліміти: числа max_per_attempt / max_per_day у reserve_explanation.
--
-- Запускати в Supabase → SQL Editor ОДИН раз, ДО деплою нового коду.
-- Безпечна для повторного запуску.
-- =====================================================================

begin;

-- Бронь = рядок без тексту
alter table public.explanations alter column explanation drop not null;
create index if not exists explanations_user_created_idx
  on public.explanations (user_id, created_at);

-- Учень більше не пише в таблицю напряму — лише через функції нижче
drop policy if exists "explanations_insert" on public.explanations;

-- Учень бачить свої пояснення, вчитель — усі (узгоджено з is_teacher())
drop policy if exists "explanations_select" on public.explanations;
create policy "explanations_select" on public.explanations
  for select to authenticated
  using (user_id = auth.uid() or public.is_teacher());


-- ---------- Бронювання ----------
-- Повертає: 'cached' (уже є готове), 'ok' (заброньовано), 'busy' (вже готується),
-- 'limit_attempt', 'limit_day', 'forbidden'.
create or replace function public.reserve_explanation(p_attempt uuid, p_question uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  max_per_attempt constant int := 3;
  max_per_day     constant int := 15;
  stale           constant interval := interval '2 minutes'; -- бронь, що «зависла»
  uid uuid := auth.uid();
  r   public.explanations%rowtype;
begin
  if uid is null then return 'forbidden'; end if;

  -- Усі запити одного учня — по черзі (прибирає гонку одночасних натискань)
  perform pg_advisory_xact_lock(hashtext('explain:' || uid::text));

  if not exists (select 1 from public.attempts a
                 where a.id = p_attempt and a.student_id = uid and a.status = 'done') then
    return 'forbidden';
  end if;

  -- Завислі брони (сервер упав посеред запиту) не рахуються й прибираються
  delete from public.explanations
  where user_id = uid and explanation is null and created_at < now() - stale;

  select * into r from public.explanations
  where attempt_id = p_attempt and question_id = p_question;
  if found then
    return case when r.explanation is not null then 'cached' else 'busy' end;
  end if;

  if (select count(*) from public.explanations where attempt_id = p_attempt) >= max_per_attempt then
    return 'limit_attempt';
  end if;

  if (select count(*) from public.explanations
      where user_id = uid and created_at > now() - interval '24 hours') >= max_per_day then
    return 'limit_day';
  end if;

  insert into public.explanations (attempt_id, question_id, user_id, explanation)
  values (p_attempt, p_question, uid, null);
  return 'ok';
end;
$$;


-- ---------- Зберегти текст у свою бронь ----------
create or replace function public.finish_explanation(p_attempt uuid, p_question uuid, p_text text)
returns boolean
language sql
security definer
set search_path = public
as $$
  with u as (
    update public.explanations
    set explanation = p_text, created_at = now()
    where attempt_id = p_attempt and question_id = p_question
      and user_id = auth.uid() and explanation is null
      and coalesce(p_text, '') <> ''
    returning 1
  )
  select exists (select 1 from u);
$$;


-- ---------- Зняти бронь (ШІ не відповів — ліміт не витрачається) ----------
create or replace function public.release_explanation(p_attempt uuid, p_question uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.explanations
  where attempt_id = p_attempt and question_id = p_question
    and user_id = auth.uid() and explanation is null;
$$;

revoke all on function public.reserve_explanation(uuid, uuid) from public;
revoke all on function public.finish_explanation(uuid, uuid, text) from public;
revoke all on function public.release_explanation(uuid, uuid) from public;
grant execute on function public.reserve_explanation(uuid, uuid) to authenticated;
grant execute on function public.finish_explanation(uuid, uuid, text) to authenticated;
grant execute on function public.release_explanation(uuid, uuid) to authenticated;

commit;
