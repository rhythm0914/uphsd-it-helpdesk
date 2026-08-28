-- Phase 9: Office Computer & IT Equipment Asset Management
-- Reproduces the client's Excel inventory ("Office Computer Inventory")
-- exactly, EXCEPT the two explicitly removed fields: "Installed Sangfor"
-- and "PMS". Movement history is a separate table (never an inventory
-- column). Additive + idempotent; no existing tables are modified.

-- 16 inventory columns (Excel terminology preserved in the UI):
--   re, ict_asset, manufacturer, model, serial_number, specification,
--   asset_number, date_acquired, accountable_personnel, accountable_position,
--   condition, department_office, bldg, remarks, domain_name, computer_name
create table if not exists public.ict_assets (
  id uuid primary key default gen_random_uuid(),
  re text,
  ict_asset text not null,
  manufacturer text,
  model text,
  serial_number text,
  specification text,
  asset_number text,
  date_acquired date,
  accountable_personnel text,
  accountable_position text,
  condition text,
  department_office text,
  bldg text,
  remarks text,
  domain_name text,
  computer_name text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent accidental duplicate equipment records (nullable fields may repeat
-- only when empty).
create unique index if not exists ict_assets_asset_number_key
  on public.ict_assets (lower(asset_number))
  where asset_number is not null and asset_number <> '';

create unique index if not exists ict_assets_serial_number_key
  on public.ict_assets (lower(serial_number))
  where serial_number is not null and serial_number <> '';

create index if not exists ict_assets_department_idx
  on public.ict_assets (department_office);
create index if not exists ict_assets_condition_idx
  on public.ict_assets (condition);

-- Separate movement/history table. The current ict_assets row is the CURRENT
-- state; every transfer appends here. History is never overwritten.
create table if not exists public.asset_movements (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.ict_assets (id) on delete cascade,
  previous_accountable_personnel text,
  new_accountable_personnel text,
  previous_accountable_position text,
  new_accountable_position text,
  previous_department_office text,
  new_department_office text,
  previous_bldg text,
  new_bldg text,
  remarks text,
  performed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists asset_movements_asset_idx
  on public.asset_movements (asset_id, created_at desc);

alter table public.ict_assets enable row level security;
alter table public.asset_movements enable row level security;

-- Staff (it_staff/admin/manager) may view the inventory and its history.
drop policy if exists "Staff can view ICT assets" on public.ict_assets;
create policy "Staff can view ICT assets"
  on public.ict_assets for select
  using (
    public.is_admin_or_manager()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('it_staff', 'admin', 'manager')
    )
  );

drop policy if exists "Admin/manager can manage ICT assets" on public.ict_assets;
create policy "Admin/manager can manage ICT assets"
  on public.ict_assets for all
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "Staff can view asset movements" on public.asset_movements;
create policy "Staff can view asset movements"
  on public.asset_movements for select
  using (
    public.is_admin_or_manager()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('it_staff', 'admin', 'manager')
    )
  );

-- Movement inserts ride on the asset-update policy via SECURITY DEFINER
-- server actions; no direct client inserts (history must not be editable).
drop policy if exists "Admin/manager can insert asset movements" on public.asset_movements;
create policy "Admin/manager can insert asset movements"
  on public.asset_movements for insert
  with check (public.is_admin_or_manager());

do $$
begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at_column') then
    execute 'drop trigger if exists set_ict_assets_updated_at on public.ict_assets';
    execute 'create trigger set_ict_assets_updated_at before update on public.ict_assets
      for each row execute function update_updated_at_column()';
  end if;
end
$$;
