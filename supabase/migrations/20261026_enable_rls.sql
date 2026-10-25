-- =====================================================================
-- Міграція: увімкнути RLS на всіх таблицях і закрити доступ до чужих даних
--
-- Проблема: RLS був вимкнений, тож будь-хто з публічним (anon) ключем,
-- навіть без входу, міг читати й змінювати всі таблиці, зокрема ставити
-- собі role = 'teacher'. Крім того, тригер реєстрації брав роль із даних,
-- які надсилає сам користувач.
--
-- Запускати в Supabase → SQL Editor ОДИН раз. Безпечна для повторного запуску.
-- Код застосунку для цього міняти не обов'язково, окрім середніх балів класу
-- в статистиці учня (функція class_variant_averages нижче).
-- =====================================================================

begin;

-- ---------- 0. Допоміжна функція: чи поточний користувач — вчитель ----------
-- SECURITY DEFINER, щоб політики на users не викликали самі себе (рекурсія).
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'teacher'
  );
$$;

revoke all on function public.is_teacher() from public;
grant execute on function public.is_teacher() to anon, authenticated;


-- ---------- 1. Реєстрація: роль завжди 'student' ----------
-- Раніше роль бралась з raw_user_meta_data, яку задає сам користувач при signUp.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.users where id = new.id) then
    insert into public.users (id, name, email, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      new.email,
      'student'
    );
  end if;
  return new;
end;
$$;


-- ---------- 2. Захист службових колонок users ----------
-- Учень може змінити лише своє ім'я. Роль, блокування, підтвердження, сезон
-- і email змінює тільки вчитель (або SQL Editor / service role, де auth.uid() = null).
create or replace function public.protect_user_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_teacher() then
    new.id          := old.id;
    new.role        := old.role;
    new.email       := old.email;
    new.is_active   := old.is_active;
    new.is_verified := old.is_verified;
    new.season      := old.season;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_user_season on public.users;
drop trigger if exists trg_protect_user_columns on public.users;
create trigger trg_protect_user_columns
  before update on public.users
  for each row execute function public.protect_user_columns();

-- Старий тригер більше не потрібен
drop function if exists public.protect_user_season();


-- ---------- 3. Прибрати старі політики (будуть створені заново, узгоджено) ----------
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('users','variants','questions','attempts','answers',
                        'set_attempts','sets','materials','score_conversion')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;


-- ---------- 4. users ----------
alter table public.users enable row level security;

create policy users_select on public.users
  for select to authenticated
  using (id = auth.uid() or public.is_teacher());

-- Власний профіль (запасний шлях у /auth/callback) — лише як учень; вчитель — будь-кого
create policy users_insert on public.users
  for insert to authenticated
  with check ((id = auth.uid() and role = 'student') or public.is_teacher());

-- Оновлення власного рядка (захищені колонки повертає тригер) або будь-якого — вчителем
create policy users_update on public.users
  for update to authenticated
  using (id = auth.uid() or public.is_teacher())
  with check (id = auth.uid() or public.is_teacher());

create policy users_delete on public.users
  for delete to authenticated
  using (public.is_teacher());


-- ---------- 5. variants ----------
alter table public.variants enable row level security;

create policy variants_select on public.variants
  for select to authenticated
  using (is_published = true or public.is_teacher());

create policy variants_teacher_write on public.variants
  for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());


-- ---------- 6. questions ----------
-- (Правильні відповіді учні поки бачать — це закриває етап 2.)
alter table public.questions enable row level security;

create policy questions_select on public.questions
  for select to authenticated
  using (
    public.is_teacher()
    or exists (select 1 from public.variants v
               where v.id = questions.variant_id and v.is_published = true)
  );

create policy questions_teacher_write on public.questions
  for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());


-- ---------- 7. attempts ----------
alter table public.attempts enable row level security;

create policy attempts_select on public.attempts
  for select to authenticated
  using (student_id = auth.uid() or public.is_teacher());

create policy attempts_insert on public.attempts
  for insert to authenticated
  with check (student_id = auth.uid());

create policy attempts_update on public.attempts
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy attempts_delete on public.attempts
  for delete to authenticated
  using (public.is_teacher());


-- ---------- 8. answers ----------
alter table public.answers enable row level security;

create policy answers_own on public.answers
  for all to authenticated
  using (exists (select 1 from public.attempts a
                 where a.id = answers.attempt_id and a.student_id = auth.uid()))
  with check (exists (select 1 from public.attempts a
                      where a.id = answers.attempt_id and a.student_id = auth.uid()));

create policy answers_teacher_select on public.answers
  for select to authenticated
  using (public.is_teacher());

create policy answers_teacher_delete on public.answers
  for delete to authenticated
  using (public.is_teacher());


-- ---------- 9. set_attempts ----------
alter table public.set_attempts enable row level security;

create policy set_attempts_select on public.set_attempts
  for select to authenticated
  using (student_id = auth.uid() or public.is_teacher());

create policy set_attempts_insert on public.set_attempts
  for insert to authenticated
  with check (student_id = auth.uid());

create policy set_attempts_update on public.set_attempts
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy set_attempts_delete on public.set_attempts
  for delete to authenticated
  using (public.is_teacher());


-- ---------- 10. Довідкові таблиці (застосунок зараз їх не змінює) ----------
alter table public.score_conversion enable row level security;
create policy score_conversion_read on public.score_conversion
  for select to authenticated using (true);
create policy score_conversion_teacher on public.score_conversion
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

alter table public.sets enable row level security;
create policy sets_read on public.sets
  for select to authenticated using (true);
create policy sets_teacher on public.sets
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

alter table public.materials enable row level security;
create policy materials_read on public.materials
  for select to authenticated using (true);
create policy materials_teacher on public.materials
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());


-- ---------- 11. Середні бали класу для статистики учня ----------
-- Учень більше не бачить чужих спроб, тому агрегат рахуємо на сервері.
create or replace function public.class_variant_averages()
returns table (variant_id uuid, avg_score integer)
language sql
stable
security definer
set search_path = public
as $$
  select a.variant_id, round(avg(a.nmt_score))::integer
  from public.attempts a
  where a.status = 'done' and a.nmt_score is not null
  group by a.variant_id;
$$;

revoke all on function public.class_variant_averages() from public;
grant execute on function public.class_variant_averages() to authenticated;

commit;

-- ---------- Перевірка після запуску ----------
-- 1) RLS увімкнено всюди (усі rls_on = true):
-- select c.relname, c.relrowsecurity as rls_on from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind = 'r' order by 1;
-- 2) Вчителі — лише ті, кого ви очікуєте:
-- select id, name, email, role from public.users where role = 'teacher';
