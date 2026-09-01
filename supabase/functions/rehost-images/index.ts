// rehost-images
// One-off repair job. Every photo on the website was still served from the Wix
// CDN belonging to the old, now cancelled Wix site. This downloads each one and
// copies it into this project storage instead, then repoints the gallery rows.
// Site files (index.html, app.js) are updated separately, using the fixed paths
// written here: site/hero.jpg, site/kitchen.jpg, site/bathroom.jpg, site/carpentry.jpg
//
// Deployed 1 September 2026. NOT YET RUN: the Supabase dashboard was down at the
// time and there was no other way to invoke it. Unproven code until it reports ok.

const BUCKET = "gallery";
const SITE = "https://www.tcooperinteriors.co.uk";

function secretKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (direct) return direct;
  const bundle = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (bundle) {
    try {
      const parsed = JSON.parse(bundle);
      const first = Object.values(parsed)[0];
      if (typeof first === "string") return first;
    } catch (_) { /* fall through */ }
  }
  throw new Error("No Supabase secret key is available to this function");
}

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = secretKey();
  const json = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };

  const copy = async (from: string, to: string) => {
    const bin = await fetch(from);
    if (!bin.ok) throw new Error("download " + bin.status + " for " + to);
    const bytes = new Uint8Array(await bin.arrayBuffer());
    const up = await fetch(url + "/storage/v1/object/" + BUCKET + "/" + to, {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: bytes,
    });
    if (!up.ok) throw new Error("upload " + up.status + " for " + to);
    return { path: to, bytes: bytes.length, publicUrl: url + "/storage/v1/object/public/" + BUCKET + "/" + to };
  };

  const results = { gallery: [], site: [], errors: [] };

  // 1. gallery rows still pointing at Wix
  const rowsRes = await fetch(url + "/rest/v1/tcooper_gallery?select=id,title,category,image_url&image_url=like.*wixstatic*", { headers: json });
  const rows = await rowsRes.json();
  for (const row of Array.isArray(rows) ? rows : []) {
    try {
      const slug = String(row.category || "job").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const done = await copy(row.image_url, "site/" + slug + ".jpg");
      const patch = await fetch(url + "/rest/v1/tcooper_gallery?id=eq." + row.id, {
        method: "PATCH",
        headers: Object.assign({}, json, { Prefer: "return=minimal" }),
        body: JSON.stringify({ image_url: done.publicUrl }),
      });
      if (!patch.ok) throw new Error("patch " + patch.status);
      results.gallery.push({ title: row.title, path: done.path, bytes: done.bytes });
    } catch (e) {
      results.errors.push({ where: "gallery", title: row.title, why: String(e) });
    }
  }

  // 2. the hero image referenced in index.html
  try {
    const html = await (await fetch(SITE + "/index.html?rehost=1")).text();
    const hero = html.match(/https:\/\/static\.wixstatic\.com\/media\/[^"\x27)\s]+/);
    if (hero) {
      const done = await copy(hero[0], "site/hero.jpg");
      results.site.push({ what: "hero", path: done.path, bytes: done.bytes });
    } else {
      results.site.push({ what: "hero", note: "no Wix URL found in index.html" });
    }
  } catch (e) {
    results.errors.push({ where: "hero", why: String(e) });
  }

  return Response.json({
    ok: results.errors.length === 0,
    rehosted: results.gallery.length + results.site.length,
    gallery: results.gallery,
    site: results.site,
    errors: results.errors,
  });
});
