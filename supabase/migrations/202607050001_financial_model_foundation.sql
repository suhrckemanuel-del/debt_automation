-- F-002 deterministic covenant-calculator persistence.
-- Hosted target only. Local development continues to use the explicitly
-- configured synthetic SQLite adapter; this migration is not deployed here.

create table public.financial_model_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid not null,
  manifest_version_id uuid not null,
  model_id text not null,
  version integer not null check (version > 0),
  calculation_purpose text not null,
  formula text not null,
  test_date date not null,
  evaluation_date date not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  config_json jsonb not null check (jsonb_typeof(config_json) = 'object'),
  config_sha256 text not null check (config_sha256 ~ '^[0-9a-f]{64}$'),
  activated_by uuid not null references auth.users(id),
  activated_at timestamptz not null default now(),
  unique (workspace_id, model_id, version),
  unique (id, workspace_id),
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete restrict,
  foreign key (manifest_version_id, workspace_id)
    references public.manifest_versions(id, workspace_id) on delete restrict
);

create table public.financial_model_inputs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid not null,
  model_version_id uuid not null,
  input_key text not null
    check (input_key in ('debt_amount', 'valuation_amount')),
  decimal_value text not null
    check (decimal_value ~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$'),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  effective_date date not null,
  passage_id uuid not null,
  exact_quote text not null,
  unique (model_version_id, input_key),
  foreign key (model_version_id, workspace_id)
    references public.financial_model_versions(id, workspace_id)
    on delete restrict,
  foreign key (passage_id, workspace_id)
    references public.passages(id, workspace_id) on delete restrict,
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete restrict
);

create table public.workspace_financial_model_heads (
  organization_id uuid not null,
  workspace_id uuid not null,
  model_id text not null,
  model_version_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, model_id),
  foreign key (model_version_id, workspace_id)
    references public.financial_model_versions(id, workspace_id)
    on delete restrict,
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete cascade
);

create table public.financial_model_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid not null,
  model_version_id uuid not null,
  calculated_by uuid not null references auth.users(id),
  scenario_id text not null,
  result_json jsonb not null check (jsonb_typeof(result_json) = 'object'),
  result_sha256 text not null check (result_sha256 ~ '^[0-9a-f]{64}$'),
  calculated_at timestamptz not null default now(),
  foreign key (model_version_id, workspace_id)
    references public.financial_model_versions(id, workspace_id)
    on delete restrict,
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete restrict
);

create index financial_model_runs_workspace_time_idx
  on public.financial_model_runs(workspace_id, calculated_at desc);

create or replace function public.prevent_financial_model_record_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'activated financial model records are immutable';
end;
$$;

create trigger financial_model_versions_no_update
before update on public.financial_model_versions
for each row execute function public.prevent_financial_model_record_change();
create trigger financial_model_versions_no_delete
before delete on public.financial_model_versions
for each row execute function public.prevent_financial_model_record_change();
create trigger financial_model_inputs_no_update
before update on public.financial_model_inputs
for each row execute function public.prevent_financial_model_record_change();
create trigger financial_model_inputs_no_delete
before delete on public.financial_model_inputs
for each row execute function public.prevent_financial_model_record_change();
create trigger financial_model_runs_no_update
before update on public.financial_model_runs
for each row execute function public.prevent_financial_model_record_change();
create trigger financial_model_runs_no_delete
before delete on public.financial_model_runs
for each row execute function public.prevent_financial_model_record_change();

alter table public.financial_model_versions enable row level security;
alter table public.financial_model_inputs enable row level security;
alter table public.workspace_financial_model_heads enable row level security;
alter table public.financial_model_runs enable row level security;

create policy financial_model_versions_member_select
on public.financial_model_versions for select
using (public.has_workspace_access(workspace_id));

create policy financial_model_inputs_member_select
on public.financial_model_inputs for select
using (public.has_workspace_access(workspace_id));

create policy financial_model_heads_member_select
on public.workspace_financial_model_heads for select
using (public.has_workspace_access(workspace_id));

create policy financial_model_runs_member_select
on public.financial_model_runs for select
using (public.has_workspace_access(workspace_id));

create policy financial_model_runs_editor_insert
on public.financial_model_runs for insert
with check (
  public.can_edit_workspace(workspace_id)
  and calculated_by = auth.uid()
);

comment on table public.financial_model_versions is
  'Append-only, source-manifest-bound calculator definitions. The active head is advanced in the same transaction that inserts a validated version and its inputs.';
comment on table public.financial_model_inputs is
  'Immutable decimal input facts linked to exact private-workspace passages.';
comment on table public.financial_model_runs is
  'Immutable deterministic calculation results. These are calculations, not legal conclusions.';
