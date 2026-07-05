-- F-001 Agreement Intelligence persistence foundation.
-- Hosted target only: this migration is version-controlled but is not deployed
-- by the local synthetic milestone.

create extension if not exists pgcrypto;

create type public.membership_role as enum (
  'owner', 'admin', 'reviewer', 'viewer'
);
create type public.mapping_status as enum (
  'unmapped', 'draft', 'invalid', 'ready'
);
create type public.mapping_draft_status as enum (
  'draft', 'invalid', 'activated'
);
create type public.answer_support_status as enum (
  'supported', 'partially_supported', 'source_not_found',
  'legal_review_required'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 3 and 120),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z][a-z0-9-]{1,39}$'),
  name text not null check (length(name) between 3 and 120),
  description text not null default '',
  default_as_of_date date not null,
  mapping_status public.mapping_status not null default 'unmapped',
  active_manifest_version_id uuid,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (id, organization_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid not null,
  external_id text not null,
  document_type text not null,
  title text not null check (length(title) between 1 and 240),
  execution_date date,
  effective_date date not null,
  current_status text not null,
  source_path text,
  storage_key text,
  media_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  content_sha256 text check (
    content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'
  ),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, external_id),
  unique (id, workspace_id),
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete cascade,
  check (storage_key is null or (
    storage_key !~ '^/' and
    storage_key like organization_id::text || '/' || workspace_id::text || '/%'
  ))
);

comment on column public.documents.storage_key is
  'Private object-storage key only. Original file bytes are not stored in Postgres.';

create table public.passages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid not null,
  document_id uuid not null,
  locator text not null,
  page_number integer not null check (page_number > 0),
  heading text not null default '',
  passage_text text not null,
  passage_sha256 text not null check (passage_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (document_id, locator, passage_sha256),
  unique (id, workspace_id),
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete cascade,
  foreign key (document_id, workspace_id)
    references public.documents(id, workspace_id) on delete cascade
);

create table public.mapping_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid not null,
  created_by uuid not null references auth.users(id),
  status public.mapping_draft_status not null default 'draft',
  expected_slot_count integer not null check (expected_slot_count >= 0),
  last_validation_errors jsonb not null default '[]'::jsonb
    check (jsonb_typeof(last_validation_errors) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete cascade
);

create unique index one_open_mapping_draft
  on public.mapping_drafts(workspace_id)
  where status in ('draft', 'invalid');

create table public.mapping_draft_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid not null,
  draft_id uuid not null,
  slot_key text not null,
  document_id uuid,
  passage_id uuid,
  locator text,
  exact_quote text,
  values_json jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  validation_error text,
  unique (draft_id, slot_key),
  foreign key (draft_id, workspace_id)
    references public.mapping_drafts(id, workspace_id) on delete cascade,
  foreign key (document_id, workspace_id)
    references public.documents(id, workspace_id) on delete restrict,
  foreign key (passage_id)
    references public.passages(id) on delete restrict,
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete cascade,
  check (
    (reviewed_at is null and reviewed_by is null) or
    (reviewed_at is not null and reviewed_by is not null)
  )
);

create table public.manifest_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid not null,
  version integer not null check (version > 0),
  source_draft_id uuid not null,
  snapshot_json jsonb not null,
  snapshot_sha256 text not null check (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  activated_by uuid not null references auth.users(id),
  activated_at timestamptz not null default now(),
  unique (workspace_id, version),
  unique (id, workspace_id),
  foreign key (source_draft_id, workspace_id)
    references public.mapping_drafts(id, workspace_id) on delete restrict,
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete restrict
);

alter table public.workspaces
  add constraint workspaces_active_manifest_fk
  foreign key (active_manifest_version_id, id)
  references public.manifest_versions(id, workspace_id)
  deferrable initially deferred;

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid not null,
  manifest_version_id uuid,
  asked_by uuid not null references auth.users(id),
  question text not null,
  as_of_date date not null,
  test_date date,
  support_status public.answer_support_status not null,
  short_answer text not null,
  assumptions jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  human_review_required boolean not null,
  review_note text not null default '',
  notes_on_currentness text not null default '',
  query_category text not null,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete cascade,
  foreign key (manifest_version_id, workspace_id)
    references public.manifest_versions(id, workspace_id) on delete restrict,
  check (jsonb_typeof(assumptions) = 'array'),
  check (jsonb_typeof(missing_information) = 'array'),
  unique (id, workspace_id)
);

create table public.citations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid not null,
  answer_id uuid not null,
  passage_id uuid not null,
  ordinal integer not null check (ordinal > 0),
  supporting_passage text not null,
  locator text not null,
  page_number integer not null check (page_number > 0),
  created_at timestamptz not null default now(),
  unique (answer_id, ordinal),
  foreign key (answer_id, workspace_id)
    references public.answers(id, workspace_id) on delete cascade,
  foreign key (passage_id, workspace_id)
    references public.passages(id, workspace_id) on delete restrict,
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete cascade
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  workspace_id uuid,
  actor_user_id uuid not null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  detail_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  check (jsonb_typeof(detail_json) = 'object'),
  foreign key (workspace_id, organization_id)
    references public.workspaces(id, organization_id) on delete cascade
);

create index passages_workspace_document_idx
  on public.passages(workspace_id, document_id);
create index documents_workspace_effective_idx
  on public.documents(workspace_id, effective_date);
create index answers_workspace_created_idx
  on public.answers(workspace_id, created_at desc);
create index audit_workspace_time_idx
  on public.audit_events(workspace_id, occurred_at desc);

create or replace function public.is_organization_member(target_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization
      and membership.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_access(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces workspace
    join public.organization_memberships membership
      on membership.organization_id = workspace.organization_id
    where workspace.id = target_workspace
      and membership.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_workspace(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces workspace
    join public.organization_memberships membership
      on membership.organization_id = workspace.organization_id
    where workspace.id = target_workspace
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin', 'reviewer')
  );
$$;

create or replace function public.prevent_manifest_version_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'manifest versions are immutable';
end;
$$;

create trigger manifest_versions_no_update
before update on public.manifest_versions
for each row execute function public.prevent_manifest_version_change();

create trigger manifest_versions_no_delete
before delete on public.manifest_versions
for each row execute function public.prevent_manifest_version_change();

create or replace function public.activate_mapping_draft(
  target_workspace uuid,
  target_draft uuid,
  manifest_snapshot jsonb
)
returns public.manifest_versions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  selected_workspace public.workspaces;
  selected_draft public.mapping_drafts;
  reviewed_slots integer;
  next_version integer;
  created_manifest public.manifest_versions;
begin
  if not public.can_edit_workspace(target_workspace) then
    raise exception 'workspace access denied';
  end if;

  select * into selected_workspace
  from public.workspaces
  where id = target_workspace
  for update;

  select * into selected_draft
  from public.mapping_drafts
  where id = target_draft
    and workspace_id = target_workspace
    and status in ('draft', 'invalid')
  for update;

  if selected_draft.id is null then
    raise exception 'open mapping draft not found';
  end if;

  select count(*) into reviewed_slots
  from public.mapping_draft_slots
  where draft_id = target_draft
    and reviewed_at is not null
    and validation_error is null;

  if reviewed_slots <> selected_draft.expected_slot_count
     or jsonb_array_length(selected_draft.last_validation_errors) > 0 then
    raise exception
      'mapping activation requires every slot to be reviewed and source-valid';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.manifest_versions
  where workspace_id = target_workspace;

  insert into public.manifest_versions (
    organization_id, workspace_id, version, source_draft_id,
    snapshot_json, snapshot_sha256, activated_by
  ) values (
    selected_workspace.organization_id,
    target_workspace,
    next_version,
    target_draft,
    manifest_snapshot,
    encode(digest(manifest_snapshot::text, 'sha256'), 'hex'),
    auth.uid()
  )
  returning * into created_manifest;

  update public.workspaces
  set active_manifest_version_id = created_manifest.id,
      mapping_status = 'ready',
      updated_at = now()
  where id = target_workspace;

  update public.mapping_drafts
  set status = 'activated', updated_at = now()
  where id = target_draft;

  insert into public.audit_events (
    organization_id, workspace_id, actor_user_id, action,
    entity_type, entity_id, detail_json
  ) values (
    selected_workspace.organization_id,
    target_workspace,
    auth.uid(),
    'mapping.activated',
    'manifest_version',
    created_manifest.id,
    jsonb_build_object(
      'version', created_manifest.version,
      'draft_id', target_draft,
      'snapshot_sha256', created_manifest.snapshot_sha256
    )
  );

  return created_manifest;
end;
$$;

revoke all on function public.activate_mapping_draft(uuid, uuid, jsonb)
from public;
grant execute on function public.activate_mapping_draft(uuid, uuid, jsonb)
to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.workspaces enable row level security;
alter table public.documents enable row level security;
alter table public.passages enable row level security;
alter table public.mapping_drafts enable row level security;
alter table public.mapping_draft_slots enable row level security;
alter table public.manifest_versions enable row level security;
alter table public.answers enable row level security;
alter table public.citations enable row level security;
alter table public.audit_events enable row level security;

create policy organizations_member_select on public.organizations
for select using (public.is_organization_member(id));

create policy profiles_self_select on public.profiles
for select using (id = auth.uid());

create policy memberships_member_select on public.organization_memberships
for select using (public.is_organization_member(organization_id));

create policy workspaces_member_select on public.workspaces
for select using (public.is_organization_member(organization_id));
create policy workspaces_editor_insert on public.workspaces
for insert with check (
  public.is_organization_member(organization_id) and created_by = auth.uid()
);
create policy workspaces_editor_update on public.workspaces
for update using (public.can_edit_workspace(id))
with check (public.can_edit_workspace(id));

create policy documents_member_select on public.documents
for select using (public.has_workspace_access(workspace_id));
create policy documents_editor_insert on public.documents
for insert with check (
  public.can_edit_workspace(workspace_id) and created_by = auth.uid()
);
create policy documents_editor_update on public.documents
for update using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy passages_member_select on public.passages
for select using (public.has_workspace_access(workspace_id));
create policy passages_editor_insert on public.passages
for insert with check (public.can_edit_workspace(workspace_id));

create policy mapping_drafts_member_select on public.mapping_drafts
for select using (public.has_workspace_access(workspace_id));
create policy mapping_drafts_editor_insert on public.mapping_drafts
for insert with check (
  public.can_edit_workspace(workspace_id) and created_by = auth.uid()
);
create policy mapping_drafts_editor_update on public.mapping_drafts
for update using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy mapping_slots_member_select on public.mapping_draft_slots
for select using (public.has_workspace_access(workspace_id));
create policy mapping_slots_editor_insert on public.mapping_draft_slots
for insert with check (public.can_edit_workspace(workspace_id));
create policy mapping_slots_editor_update on public.mapping_draft_slots
for update using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy manifest_versions_member_select on public.manifest_versions
for select using (public.has_workspace_access(workspace_id));

create policy answers_member_select on public.answers
for select using (public.has_workspace_access(workspace_id));
create policy answers_editor_insert on public.answers
for insert with check (
  public.has_workspace_access(workspace_id) and asked_by = auth.uid()
);

create policy citations_member_select on public.citations
for select using (public.has_workspace_access(workspace_id));
create policy citations_editor_insert on public.citations
for insert with check (public.has_workspace_access(workspace_id));

create policy audit_events_member_select on public.audit_events
for select using (public.is_organization_member(organization_id));

insert into storage.buckets (id, name, public)
values ('agreement-documents', 'agreement-documents', false)
on conflict (id) do update set public = false;

create policy agreement_documents_member_read on storage.objects
for select to authenticated
using (
  bucket_id = 'agreement-documents'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
  and public.has_workspace_access(
    ((storage.foldername(name))[2])::uuid
  )
);

create policy agreement_documents_editor_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'agreement-documents'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
  and public.can_edit_workspace(
    ((storage.foldername(name))[2])::uuid
  )
);

create policy agreement_documents_editor_update on storage.objects
for update to authenticated
using (
  bucket_id = 'agreement-documents'
  and public.can_edit_workspace(
    ((storage.foldername(name))[2])::uuid
  )
)
with check (
  bucket_id = 'agreement-documents'
  and public.can_edit_workspace(
    ((storage.foldername(name))[2])::uuid
  )
);

comment on table public.manifest_versions is
  'Append-only activated mapping snapshots. Activation is transactional via activate_mapping_draft.';
comment on table public.audit_events is
  'Application audit trail; database backups do not replace private object-storage backups.';
