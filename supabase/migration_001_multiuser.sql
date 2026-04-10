-- ============================================================
-- MIGRACIÓN 001: Multi-usuario para APPgenda
-- Ejecutar en Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  name text not null default '',
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_read_all" on profiles
  for select using (true);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Auto-crear perfil al registrarse
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    name = coalesce(excluded.name, profiles.name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. TEAMS
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#2B5E3E',
  created_by uuid not null references profiles on delete cascade,
  created_at timestamptz default now()
);

alter table teams enable row level security;

-- 3. TEAM_MEMBERS
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor', 'viewer')),
  joined_at timestamptz default now(),
  unique (team_id, user_id)
);

alter table team_members enable row level security;

-- Helper: ¿el usuario es miembro del equipo?
create or replace function is_team_member(t_id uuid)
returns boolean as $$
  select exists (
    select 1 from team_members where team_id = t_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Helper: ¿el usuario tiene rol admin en el equipo?
create or replace function is_team_admin(t_id uuid)
returns boolean as $$
  select exists (
    select 1 from team_members where team_id = t_id and user_id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- RLS teams
create policy "teams_read" on teams
  for select using (is_team_member(id));

create policy "teams_insert" on teams
  for insert with check (auth.uid() = created_by);

create policy "teams_update" on teams
  for update using (is_team_admin(id));

create policy "teams_delete" on teams
  for delete using (is_team_admin(id));

-- RLS team_members
create policy "tm_read" on team_members
  for select using (is_team_member(team_id));

create policy "tm_insert" on team_members
  for insert with check (is_team_admin(team_id) or (
    auth.uid() = user_id and team_id in (select id from teams where created_by = auth.uid())
  ));

create policy "tm_update" on team_members
  for update using (is_team_admin(team_id));

create policy "tm_delete" on team_members
  for delete using (
    is_team_admin(team_id) or auth.uid() = user_id
  );

-- 4. PROJECTS
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#2B5E3E',
  owner_id uuid not null references profiles on delete cascade,
  team_id uuid references teams on delete cascade,
  created_at timestamptz default now()
);

alter table projects enable row level security;

create policy "projects_read" on projects
  for select using (
    owner_id = auth.uid() or is_team_member(team_id)
  );

create policy "projects_insert" on projects
  for insert with check (
    owner_id = auth.uid()
  );

create policy "projects_update" on projects
  for update using (
    owner_id = auth.uid() or is_team_member(team_id)
  );

create policy "projects_delete" on projects
  for delete using (
    owner_id = auth.uid() or is_team_admin(team_id)
  );

-- 5. TASKS
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  done boolean not null default false,
  priority text not null default 'media' check (priority in ('alta', 'media', 'baja')),
  project_id uuid references projects on delete set null,
  assignee_id uuid references profiles on delete set null,
  created_by uuid not null references profiles on delete cascade,
  team_id uuid references teams on delete cascade,
  date text not null default '',
  note text not null default '',
  notification text,
  position integer not null default 0,
  created_at timestamptz default now()
);

alter table tasks enable row level security;

create policy "tasks_read" on tasks
  for select using (
    created_by = auth.uid()
    or assignee_id = auth.uid()
    or is_team_member(team_id)
  );

create policy "tasks_insert" on tasks
  for insert with check (created_by = auth.uid());

create policy "tasks_update" on tasks
  for update using (
    created_by = auth.uid()
    or assignee_id = auth.uid()
    or is_team_member(team_id)
  );

create policy "tasks_delete" on tasks
  for delete using (
    created_by = auth.uid() or is_team_admin(team_id)
  );

-- 6. EVENTS
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date text not null,
  date_end text,
  time_start text not null default '',
  time_end text,
  note text not null default '',
  all_day boolean default false,
  color text,
  done boolean default false,
  source text default 'local' check (source in ('local', 'google', 'icloud', 'finances', 'tasks')),
  source_id text,
  calendar_source_id text,
  notification text,
  project_id uuid references projects on delete set null,
  team_id uuid references teams on delete cascade,
  created_by uuid not null references profiles on delete cascade,
  created_at timestamptz default now()
);

alter table events enable row level security;

create policy "events_read" on events
  for select using (
    created_by = auth.uid() or is_team_member(team_id)
  );

create policy "events_insert" on events
  for insert with check (created_by = auth.uid());

create policy "events_update" on events
  for update using (
    created_by = auth.uid() or is_team_member(team_id)
  );

create policy "events_delete" on events
  for delete using (
    created_by = auth.uid() or is_team_admin(team_id)
  );

-- 7. OBLIGATIONS
create table if not exists obligations (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  type text not null check (type in ('tarjeta', 'prestamo')),
  owner_id uuid not null references profiles on delete cascade,
  team_id uuid references teams on delete cascade,
  created_at timestamptz default now()
);

alter table obligations enable row level security;

create policy "obligations_read" on obligations
  for select using (
    owner_id = auth.uid() or is_team_member(team_id)
  );

create policy "obligations_insert" on obligations
  for insert with check (owner_id = auth.uid());

create policy "obligations_update" on obligations
  for update using (
    owner_id = auth.uid() or is_team_member(team_id)
  );

create policy "obligations_delete" on obligations
  for delete using (
    owner_id = auth.uid() or is_team_admin(team_id)
  );

-- 8. PAYMENTS
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references obligations on delete cascade,
  month text not null,
  done boolean not null default false,
  date text not null default '',
  created_at timestamptz default now()
);

alter table payments enable row level security;

create policy "payments_read" on payments
  for select using (
    exists (
      select 1 from obligations o
      where o.id = payments.obligation_id
      and (o.owner_id = auth.uid() or is_team_member(o.team_id))
    )
  );

create policy "payments_insert" on payments
  for insert with check (
    exists (
      select 1 from obligations o
      where o.id = obligation_id
      and (o.owner_id = auth.uid() or is_team_member(o.team_id))
    )
  );

create policy "payments_update" on payments
  for update using (
    exists (
      select 1 from obligations o
      where o.id = payments.obligation_id
      and (o.owner_id = auth.uid() or is_team_member(o.team_id))
    )
  );

create policy "payments_delete" on payments
  for delete using (
    exists (
      select 1 from obligations o
      where o.id = payments.obligation_id
      and (o.owner_id = auth.uid() or is_team_admin(o.team_id))
    )
  );

-- 9. INVESTMENTS
create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('inmobiliario', 'vehiculos', 'financiero', 'empresas')),
  currency text not null default 'USD' check (currency in ('USD', 'DOP')),
  purchase_price numeric not null default 0,
  current_price numeric not null default 0,
  date text not null default '',
  note text not null default '',
  owner_id uuid not null references profiles on delete cascade,
  team_id uuid references teams on delete cascade,
  created_at timestamptz default now()
);

alter table investments enable row level security;

create policy "investments_read" on investments
  for select using (
    owner_id = auth.uid() or is_team_member(team_id)
  );

create policy "investments_insert" on investments
  for insert with check (owner_id = auth.uid());

create policy "investments_update" on investments
  for update using (
    owner_id = auth.uid() or is_team_member(team_id)
  );

create policy "investments_delete" on investments
  for delete using (
    owner_id = auth.uid() or is_team_admin(team_id)
  );

-- 10. BANK_ACCOUNTS
create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  team_id uuid references teams on delete cascade,
  banco text not null default '',
  tipo text not null default '',
  numero text not null default '',
  titular text not null default '',
  telefono text not null default '',
  nota text not null default '',
  tipo_cuenta text default 'personal' check (tipo_cuenta in ('personal', 'empresarial')),
  cedula text,
  rnc text,
  pais text,
  swift text,
  iban text,
  banco_intermediario text,
  direccion_banco text,
  created_at timestamptz default now()
);

alter table bank_accounts enable row level security;

create policy "bank_accounts_read" on bank_accounts
  for select using (owner_id = auth.uid() or is_team_member(team_id));

create policy "bank_accounts_insert" on bank_accounts
  for insert with check (owner_id = auth.uid());

create policy "bank_accounts_update" on bank_accounts
  for update using (owner_id = auth.uid() or is_team_member(team_id));

create policy "bank_accounts_delete" on bank_accounts
  for delete using (owner_id = auth.uid() or is_team_admin(team_id));

-- 11. CONTACTS
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  team_id uuid references teams on delete cascade,
  nombre text not null default '',
  cedula text not null default '',
  telefono text not null default '',
  email text not null default '',
  nota text not null default '',
  created_at timestamptz default now()
);

alter table contacts enable row level security;

create policy "contacts_read" on contacts
  for select using (owner_id = auth.uid() or is_team_member(team_id));

create policy "contacts_insert" on contacts
  for insert with check (owner_id = auth.uid());

create policy "contacts_update" on contacts
  for update using (owner_id = auth.uid() or is_team_member(team_id));

create policy "contacts_delete" on contacts
  for delete using (owner_id = auth.uid() or is_team_admin(team_id));

-- 12. REMOTE_ACCESSES
create table if not exists remote_accesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  team_id uuid references teams on delete cascade,
  nombre text not null default '',
  app text not null default 'anydesk' check (app in ('anydesk', 'teamviewer', 'rdp', 'otro')),
  codigo text not null default '',
  password text not null default '',
  nota text not null default '',
  created_at timestamptz default now()
);

alter table remote_accesses enable row level security;

create policy "remote_accesses_read" on remote_accesses
  for select using (owner_id = auth.uid() or is_team_member(team_id));

create policy "remote_accesses_insert" on remote_accesses
  for insert with check (owner_id = auth.uid());

create policy "remote_accesses_update" on remote_accesses
  for update using (owner_id = auth.uid() or is_team_member(team_id));

create policy "remote_accesses_delete" on remote_accesses
  for delete using (owner_id = auth.uid() or is_team_admin(team_id));

-- 13. CALENDAR_CONFIG (personal, para tokens de Google/iCloud)
create table if not exists calendar_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references profiles on delete cascade,
  config jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table calendar_configs enable row level security;

create policy "calconfig_read" on calendar_configs
  for select using (user_id = auth.uid());

create policy "calconfig_insert" on calendar_configs
  for insert with check (user_id = auth.uid());

create policy "calconfig_update" on calendar_configs
  for update using (user_id = auth.uid());

-- INDEXES
create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_tasks_assignee on tasks(assignee_id);
create index if not exists idx_tasks_team on tasks(team_id);
create index if not exists idx_tasks_created_by on tasks(created_by);
create index if not exists idx_events_date on events(date);
create index if not exists idx_events_team on events(team_id);
create index if not exists idx_events_created_by on events(created_by);
create index if not exists idx_projects_team on projects(team_id);
create index if not exists idx_projects_owner on projects(owner_id);
create index if not exists idx_payments_obligation on payments(obligation_id);
create index if not exists idx_team_members_user on team_members(user_id);
create index if not exists idx_team_members_team on team_members(team_id);

-- REALTIME: habilitar publicaciones para sync en tiempo real
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table team_members;
alter publication supabase_realtime add table payments;
