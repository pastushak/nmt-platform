-- =====================================================================
-- Міграція: збережені AI-пояснення + серверний ліміт (3 на спробу)
-- Запускати в Supabase → SQL Editor ОДИН раз, ДО деплою нового коду.
-- =====================================================================

create table if not exists public.explanations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null,
  user_id uuid not null default auth.uid(),
  explanation text not null,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists explanations_attempt_idx on public.explanations (attempt_id);

alter table public.explanations enable row level security;

-- Учень бачить свої пояснення, вчитель — усі
drop policy if exists "explanations_select" on public.explanations;
create policy "explanations_select" on public.explanations
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'teacher')
  );

-- Додати пояснення можна лише до власної спроби
drop policy if exists "explanations_insert" on public.explanations;
create policy "explanations_insert" on public.explanations
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.attempts a where a.id = attempt_id and a.student_id = auth.uid())
  );
