-- ============================================================
-- MIGRACIÓN 003: Completar realtime para todas las tablas
-- Necesario para sync entre múltiples dispositivos del mismo usuario.
-- Idempotente: usa pg_publication_tables para evitar duplicados.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='obligations') then
    alter publication supabase_realtime add table public.obligations;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='investments') then
    alter publication supabase_realtime add table public.investments;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='bank_accounts') then
    alter publication supabase_realtime add table public.bank_accounts;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='contacts') then
    alter publication supabase_realtime add table public.contacts;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='remote_accesses') then
    alter publication supabase_realtime add table public.remote_accesses;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='calendar_configs') then
    alter publication supabase_realtime add table public.calendar_configs;
  end if;
end $$;
