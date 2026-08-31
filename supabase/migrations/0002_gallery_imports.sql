-- 0002_gallery_imports.sql
-- Lets the facebook-sync edge function import photos into the gallery without
-- duplicating them, and without anything reaching the website unapproved.
-- Applied to the live project on 31 August 2026.

alter table tcooper_gallery
  add column if not exists source text not null default 'manual',
  add column if not exists external_id text,
  add column if not exists imported_at timestamptz;

-- One row per Facebook photo id, so the sync can run repeatedly and be idempotent.
create unique index if not exists tcooper_gallery_external_id_key
  on tcooper_gallery (external_id) where external_id is not null;

-- Imported images are copied here because Facebook CDN URLs are signed and expire.
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "gallery public read" on storage.objects;
create policy "gallery public read" on storage.objects
  for select using (bucket_id = 'gallery');
