-- Run in Supabase: SQL Editor -> New query -> Run
create extension if not exists "pgcrypto";

create table if not exists halls (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  capacity int not null check (capacity > 0),
  price_per_day integer not null check (price_per_day > 0),   -- in rupees
  advance_percent integer not null default 30 check (advance_percent between 1 and 100),
  active boolean not null default true
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  hall_id uuid not null references halls(id),
  event_date date not null,
  event_type text not null,
  guests int not null check (guests > 0),
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  total_amount integer not null,          -- rupees
  advance_amount integer not null,        -- rupees, charged online
  balance_amount integer not null,        -- rupees, due at venue
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  hold_expires_at timestamptz,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- One confirmed booking per hall per date (prevents double booking)
create unique index if not exists one_confirmed_per_day
  on bookings (hall_id, event_date) where status = 'confirmed';

create index if not exists bookings_lookup on bookings (hall_id, event_date, status);

-- Lock tables from public access; the server uses the service-role key
alter table halls enable row level security;
alter table bookings enable row level security;

insert into halls (name, description, capacity, price_per_day, advance_percent) values
  ('Grand Ballroom', 'Air-conditioned hall with stage, ideal for weddings and receptions.', 500, 75000, 30),
  ('Garden Pavilion', 'Open-air lawn with covered dining area for engagements and parties.', 250, 45000, 30),
  ('Mini Hall', 'Compact hall for birthdays, naming ceremonies and meetings.', 100, 20000, 30);
