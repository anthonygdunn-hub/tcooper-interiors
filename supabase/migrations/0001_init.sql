-- T Cooper Interiors — schema for enquiries, testimonials, gallery
-- Applied to Supabase project: acdpgarasgfhvupzsbxf (anthonygdunn-hub's Project)

create table if not exists public.tcooper_enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  service text,
  message text,
  status text not null default 'new'
);

alter table public.tcooper_enquiries enable row level security;

create policy "public can submit enquiries"
  on public.tcooper_enquiries
  for insert
  to anon
  with check (true);
-- Intentionally no SELECT policy for anon: enquiries are only readable from the
-- Supabase dashboard / service role, never by site visitors.

create table if not exists public.tcooper_testimonials (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  location text,
  quote text not null,
  rating int not null default 5 check (rating between 1 and 5),
  featured boolean not null default true,
  sort_order int not null default 0
);

alter table public.tcooper_testimonials enable row level security;

create policy "anyone can read featured testimonials"
  on public.tcooper_testimonials
  for select
  to anon
  using (featured = true);

create table if not exists public.tcooper_gallery (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  category text not null,
  description text,
  image_url text not null,
  location text,
  featured boolean not null default true,
  sort_order int not null default 0
);

alter table public.tcooper_gallery enable row level security;

create policy "anyone can read featured gallery items"
  on public.tcooper_gallery
  for select
  to anon
  using (featured = true);
