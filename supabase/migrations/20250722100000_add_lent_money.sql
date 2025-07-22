create table if not exists public.lent_money (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  borrower_name text not null,
  borrower_contact text,
  amount decimal(15,2) not null check (amount > 0),
  interest_rate decimal(5,2) default 0 check (interest_rate >= 0),
  lent_date date not null,
      expected_return_date DATE,
  paid_date date,
  is_paid boolean default false not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index if not exists lent_money_user_id_idx on public.lent_money(user_id);
create index if not exists lent_money_is_paid_idx on public.lent_money(is_paid);
create index if not exists lent_money_lent_date_idx on public.lent_money(lent_date);

-- Enable RLS (Row Level Security)
alter table public.lent_money enable row level security;

-- Create policies
create policy "Users can view their own lent money records" on public.lent_money
  for select using (auth.uid() = user_id);

create policy "Users can insert their own lent money records" on public.lent_money
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own lent money records" on public.lent_money
  for update using (auth.uid() = user_id);

create policy "Users can delete their own lent money records" on public.lent_money
  for delete using (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger handle_lent_money_updated_at
  before update on public.lent_money
  for each row execute procedure public.handle_updated_at();
