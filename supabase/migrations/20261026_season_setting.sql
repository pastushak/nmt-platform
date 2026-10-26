-- =====================================================================
-- Міграція: поточний сезон зберігається в базі, а не в коді
--
-- Після неї новий сезон розпочинається кнопкою в адмінці
-- (Архів сезонів → «Розпочати новий сезон»). Учні попереднього сезону
-- автоматично потрапляють в архів: результати лишаються, вхід закривається.
-- Окремого учня можна повернути в поточний сезон кнопкою на його картці.
--
-- Запускати в Supabase → SQL Editor ОДИН раз. Безпечна для повторного запуску.
-- Код можна публікувати і до, і після неї (без неї сайт вважає сезон 2027).
-- =====================================================================

begin;

-- ---------- Налаштування застосунку ----------
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('current_season', '2027')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select to authenticated using (true);
-- Писати напряму не можна нікому; сезон змінює лише функція нижче


-- ---------- Поточний сезон ----------
create or replace function public.current_season()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value from public.app_settings where key = 'current_season'), '2027');
$$;

revoke all on function public.current_season() from public;
grant execute on function public.current_season() to anon, authenticated;

-- Нові учні отримують поточний сезон автоматично
alter table public.users alter column season set default public.current_season();

-- Учні без сезону раніше вважались «поточними» (2027) — фіксуємо це явно,
-- щоб після зміни сезону вони коректно потрапили в архів
update public.users set season = '2027' where role = 'student' and season is null;


-- ---------- Зміна сезону (лише вчитель) ----------
-- Повертає кількість учнів, що залишились у попередньому сезоні (тепер — архів).
create or replace function public.set_current_season(p_season text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  old_season text := public.current_season();
  archived   integer;
begin
  if not public.is_teacher() then
    raise exception 'Лише вчитель може змінити сезон';
  end if;
  if p_season is null or p_season !~ '^20[0-9]{2}$' then
    raise exception 'Сезон — це рік, наприклад 2028';
  end if;

  insert into public.app_settings (key, value, updated_at)
  values ('current_season', p_season, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();

  select count(*) into archived from public.users
  where role = 'student' and season = old_season and old_season <> p_season;
  return archived;
end;
$$;

revoke all on function public.set_current_season(text) from public;
grant execute on function public.set_current_season(text) to authenticated;

commit;

-- Перевірка:
-- select public.current_season();
