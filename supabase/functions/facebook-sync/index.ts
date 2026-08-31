// facebook-sync
// Pulls photos from the T Cooper Interiors Facebook Page, copies each image into
// Supabase Storage (Facebook CDN URLs are signed and expire within days, so they
// cannot be linked directly), and inserts gallery rows with featured = false so
// nothing reaches the website until someone approves it.

const GRAPH = "https://graph.facebook.com/v21.0";
const BUCKET = "gallery";

function secretKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (direct) return direct;
  const bundle = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (bundle) {
    try {
      const parsed = JSON.parse(bundle);
      const first = Object.values(parsed)[0];
      if (typeof first === "string") return first;
    } catch (_) { /* fall through to the error below */ }
  }
  throw new Error("No Supabase secret key is available to this function");
}

Deno.serve(async () => {
  const token = Deno.env.get("FB_PAGE_TOKEN");
  const pageId = Deno.env.get("FB_PAGE_ID") ?? "Tcooperinteriors";
  if (!token) {
    return Response.json({ ok: false, error: "FB_PAGE_TOKEN is not set. Add it under Edge Functions, Secrets." }, { status: 400 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = secretKey();
  const headers = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };

  const seenRes = await fetch(url + "/rest/v1/tcooper_gallery?select=external_id&external_id=not.is.null", { headers });
  const seenRows = await seenRes.json();
  const seen = new Set((Array.isArray(seenRows) ? seenRows : []).map((r) => r.external_id));

  const fbRes = await fetch(GRAPH + "/" + pageId + "/photos?type=uploaded&fields=id,created_time,name,images&limit=50&access_token=" + token);
  const fb = await fbRes.json();
  if (fb.error) {
    return Response.json({ ok: false, stage: "graph", error: fb.error.message }, { status: 502 });
  }

  const imported = [];
  const skipped = [];
  const failed = [];

  for (const photo of fb.data ?? []) {
    if (seen.has(photo.id)) { skipped.push(photo.id); continue; }
    try {
      const images = (photo.images ?? []).slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
      if (!images.length) { failed.push({ id: photo.id, why: "no image sizes returned" }); continue; }

      const bin = await fetch(images[0].source);
      if (!bin.ok) { failed.push({ id: photo.id, why: "download " + bin.status }); continue; }
      const bytes = new Uint8Array(await bin.arrayBuffer());

      const path = "facebook/" + photo.id + ".jpg";
      const up = await fetch(url + "/storage/v1/object/" + BUCKET + "/" + path, {
        method: "POST",
        headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "image/jpeg", "x-upsert": "true" },
        body: bytes,
      });
      if (!up.ok) { failed.push({ id: photo.id, why: "upload " + up.status }); continue; }

      const publicUrl = url + "/storage/v1/object/public/" + BUCKET + "/" + path;
      const caption = (photo.name ?? "").trim();
      const title = caption ? caption.split("\n")[0].slice(0, 80) : "Recent work";

      const ins = await fetch(url + "/rest/v1/tcooper_gallery", {
        method: "POST",
        headers: Object.assign({}, headers, { Prefer: "return=minimal" }),
        body: JSON.stringify({
          title: title,
          category: "Uncategorised",
          description: caption || null,
          image_url: publicUrl,
          featured: false,
          sort_order: 999,
          source: "facebook",
          external_id: photo.id,
          imported_at: new Date().toISOString(),
        }),
      });
      if (!ins.ok) { failed.push({ id: photo.id, why: "insert " + ins.status }); continue; }
      imported.push(photo.id);
    } catch (e) {
      failed.push({ id: photo.id, why: String(e) });
    }
  }

  return Response.json({
    ok: true,
    imported: imported.length,
    skipped: skipped.length,
    failed: failed,
    note: "Imported photos stay hidden until featured is set to true.",
  });
});
