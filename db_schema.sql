-- Criação das tabelas para o Sistema de Check-in

-- Tabela de Eventos
create table public.events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  date timestamp with time zone not null,
  location text,
  is_open boolean default true
);

-- Tabela de Participantes
create table public.attendees (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text not null,
  cpf text not null,
  phone text
);

-- Tabela de Inscrições (Relacionamento N:N)
create table public.registrations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  event_id uuid references public.events(id) on delete cascade not null,
  attendee_id uuid references public.attendees(id) on delete cascade not null,
  checked_in boolean default false,
  checkin_time timestamp with time zone
);

-- Habilitar RLS (Opcional - para simplicidade, vamos permitir acesso público por enquanto ou criar políticas simples)
alter table public.events enable row level security;
alter table public.attendees enable row level security;
alter table public.registrations enable row level security;

-- Políticas de acesso público (CUIDADO: Em produção real, restrinja isso!)
create policy "Acesso público a eventos" on public.events for all using (true);
create policy "Acesso público a participantes" on public.attendees for all using (true);
create policy "Acesso público a inscrições" on public.registrations for all using (true);
