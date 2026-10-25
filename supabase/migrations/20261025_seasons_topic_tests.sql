-- =====================================================================
-- Міграція: сезони підготовки (архів НМТ-2026) + тематичні тести
-- Запускати в Supabase → SQL Editor ОДИН раз, ДО деплою нового коду.
-- Безпечна для повторного запуску (if not exists / or replace).
-- =====================================================================

-- ---------- 1. СЕЗОНИ ----------

-- Сезон учня: '2026' = НМТ-2026, '2027' = НМТ-2027 і т.д.
alter table public.users
  add column if not exists season text;

-- Розподіл наявних учнів: зареєстровані до 1 вересня 2026 — сезон 2026 (архів),
-- пізніше — поточний сезон 2027. Вчителів не чіпаємо (season = null).
update public.users
set season = case
  when created_at < '2026-09-01' then '2026'
  else '2027'
end
where role = 'student' and season is null;

-- Нові учні за замовчуванням потрапляють у поточний сезон.
-- НАСТУПНОГО РОКУ: змінити тут на '2028' і CURRENT_SEASON у lib/season.ts.
alter table public.users
  alter column season set default '2027';

-- Учень не може сам змінити собі сезон (і так обійти архівне блокування).
create or replace function public.protect_user_season()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() = null — це SQL Editor / service role: їм дозволено все
  if new.season is distinct from old.season
     and auth.uid() is not null
     and not exists (
       select 1 from public.users u
       where u.id = auth.uid() and u.role = 'teacher'
     )
  then
    new.season := old.season;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_user_season on public.users;
create trigger trg_protect_user_season
  before update on public.users
  for each row execute function public.protect_user_season();


-- ---------- 2. ТЕМАТИЧНІ ТЕСТИ ----------

-- Тип варіанта: 'full' — повний варіант НМТ, 'topic' — тематичний тест
alter table public.variants
  add column if not exists kind text not null default 'full';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'variants_kind_check'
  ) then
    alter table public.variants
      add constraint variants_kind_check check (kind in ('full', 'topic'));
  end if;
end $$;

-- Тема тематичного тесту (наприклад «Похідна»)
alter table public.variants
  add column if not exists topic text;

-- Структура тематичного тесту: {"single": 10, "matching": 1, "open": 2}
-- Для повних варіантів лишається null (діє стандартна схема 15/3/4).
alter table public.variants
  add column if not exists layout jsonb;

-- ---------- Перевірка ----------
-- select season, count(*) from public.users where role = 'student' group by season;
-- select kind, count(*) from public.variants group by kind;
