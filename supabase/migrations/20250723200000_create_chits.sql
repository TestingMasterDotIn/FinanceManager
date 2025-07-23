-- Create chits table for chitfund tracking
create table if not exists public.chits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  chit_name text not null,
  organizer_name text not null,
  organizer_contact text,
  total_members integer not null check (total_members > 0),
  chit_value numeric(15, 2) not null check (chit_value > 0),
  monthly_contribution numeric(15, 2) not null check (monthly_contribution > 0),
  total_months integer not null check (total_months > 0),
  start_date date not null,
  member_number integer not null check (member_number > 0),
  current_month integer default 1 check (current_month >= 1),
  status text default 'active' check (status in ('active', 'won', 'completed', 'discontinued')),
  won_month integer check (won_month > 0 and won_month <= total_months),
  won_amount numeric(15, 2) check (won_amount > 0),
  auction_amount numeric(15, 2) check (auction_amount > 0),
  total_paid numeric(15, 2) default 0,
  remaining_amount numeric(15, 2) default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create chit payments table for tracking individual payments
create table if not exists public.chit_payments (
  id uuid default gen_random_uuid() primary key,
  chit_id uuid references public.chits(id) on delete cascade not null,
  month_number integer not null check (month_number > 0),
  payment_date date not null,
  amount_paid numeric(15, 2) not null check (amount_paid > 0),
  is_dividend boolean default false,
  dividend_amount numeric(15, 2) default 0,
  net_payment numeric(15, 2) not null check (net_payment > 0),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(chit_id, month_number)
);

-- Create indexes for better performance
create index if not exists idx_chits_user_id on public.chits(user_id);
create index if not exists idx_chits_status on public.chits(status);
create index if not exists idx_chit_payments_chit_id on public.chit_payments(chit_id);
create index if not exists idx_chit_payments_month on public.chit_payments(month_number);

-- Enable RLS
alter table public.chits enable row level security;
alter table public.chit_payments enable row level security;

-- Create RLS policies
create policy "Users can view their own chits" on public.chits
  for select using (auth.uid() = user_id);

create policy "Users can insert their own chits" on public.chits
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own chits" on public.chits
  for update using (auth.uid() = user_id);

create policy "Users can delete their own chits" on public.chits
  for delete using (auth.uid() = user_id);

create policy "Users can view their own chit payments" on public.chit_payments
  for select using (
    exists (
      select 1 from public.chits
      where chits.id = chit_payments.chit_id
      and chits.user_id = auth.uid()
    )
  );

create policy "Users can insert payments for their own chits" on public.chit_payments
  for insert with check (
    exists (
      select 1 from public.chits
      where chits.id = chit_payments.chit_id
      and chits.user_id = auth.uid()
    )
  );

create policy "Users can update payments for their own chits" on public.chit_payments
  for update using (
    exists (
      select 1 from public.chits
      where chits.id = chit_payments.chit_id
      and chits.user_id = auth.uid()
    )
  );

create policy "Users can delete payments for their own chits" on public.chit_payments
  for delete using (
    exists (
      select 1 from public.chits
      where chits.id = chit_payments.chit_id
      and chits.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger update_chits_updated_at
  before update on public.chits
  for each row execute function update_updated_at_column();

create trigger update_chit_payments_updated_at
  before update on public.chit_payments
  for each row execute function update_updated_at_column();
