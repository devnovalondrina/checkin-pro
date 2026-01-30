-- Tabela de Participantes (Dados Pessoais)
create table if not exists attendees (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text not null,
  cpf text not null unique check (cpf ~ '^[0-9]+$'),
  phone text not null
);

-- Tabela de Eventos
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  date timestamp with time zone not null,
  location text,
  is_open boolean default true,
  workload integer default 0,
  certificates_released boolean default false
);

-- Tabela de Inscrições (Relacionamento N:N)
create table if not exists registrations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  attendee_id uuid references attendees(id) not null,
  event_id uuid references events(id) not null,
  checked_in boolean default false,
  checkin_time timestamp with time zone,
  certificate_code text,
  unique(attendee_id, event_id)
);

-- RLS Policies
alter table attendees enable row level security;
alter table events enable row level security;
alter table registrations enable row level security;

-- Drop existing policies to ensure clean state
drop policy if exists "Public read attendees" on attendees;
drop policy if exists "Public insert attendees" on attendees;
drop policy if exists "Public update attendees" on attendees;
drop policy if exists "Public read events" on events;
drop policy if exists "Public insert events" on events;
drop policy if exists "Public update events" on events;
drop policy if exists "Public delete events" on events;
drop policy if exists "Public read registrations" on registrations;
drop policy if exists "Public insert registrations" on registrations;
drop policy if exists "Public update registrations" on registrations;

-- Admin Policies (Authenticated Users)
create policy "Admin full access attendees" on attendees for all to authenticated using (true) with check (true);
create policy "Admin full access events" on events for all to authenticated using (true) with check (true);
create policy "Admin full access registrations" on registrations for all to authenticated using (true) with check (true);

-- Public/Anon Policies
-- Events: Everyone can view events
create policy "Public read events" on events for select to anon using (true);

-- Attendees: Everyone can register (insert) and lookup (select)
create policy "Public read attendees" on attendees for select to anon using (true);
create policy "Public insert attendees" on attendees for insert to anon with check (true);

-- Registrations: Everyone can register (insert), check status (select), and check-in (update)
create policy "Public read registrations" on registrations for select to anon using (true);
create policy "Public insert registrations" on registrations for insert to anon with check (true);
create policy "Public update registrations" on registrations for update to anon using (true);
