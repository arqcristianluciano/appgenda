-- Fix: teams_read policy bloqueaba SELECT después de INSERT
-- porque el creador aún no estaba en team_members.

-- 1. Limpiar equipos huérfanos (creados sin miembros por el bug)
delete from teams
where id not in (select distinct team_id from team_members);

-- 2. Recrear policy para incluir al creador
drop policy if exists "teams_read" on teams;
create policy "teams_read" on teams
  for select using (is_team_member(id) or auth.uid() = created_by);
