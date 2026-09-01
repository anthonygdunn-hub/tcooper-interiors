// ---- Supabase config ----
// Publishable/anon key only — safe to expose client-side, protected by RLS policies
// (public insert-only on enquiries, public read-only on testimonials/gallery).
const SUPABASE_URL = "https://acdpgarasgfhvupzsbxf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OWTVpDyadL1lITnCp4gfAQ_EZxVHldY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("year").textContent = new Date().getFullYear();

// ---- Mobile nav ----
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");
navToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});
mainNav.querySelectorAll("a").forEach(a =>
  a.addEventListener("click", () => mainNav.classList.remove("open"))
);

// ---- Fallback content (used if Supabase is unreachable) ----
const FALLBACK_GALLERY = [
  { title: "Modern Family Kitchen", category: "Kitchen", location: "Farnborough, Hampshire",
    image_url: "https://acdpgarasgfhvupzsbxf.supabase.co/storage/v1/object/public/gallery/site/kitchen.jpg" },
  { title: "Contemporary Bathroom", category: "Bathroom", location: "Hampshire",
    image_url: "https://acdpgarasgfhvupzsbxf.supabase.co/storage/v1/object/public/gallery/site/bathroom.jpg" },
  { title: "Bespoke Carpentry & Doors", category: "Carpentry", location: "Surrey",
    image_url: "https://acdpgarasgfhvupzsbxf.supabase.co/storage/v1/object/public/gallery/site/carpentry.jpg" }
];

const FALLBACK_REVIEWS = [
  { customer_name: "Hayley Hollidge", location: "Farnborough", rating: 5,
    quote: "Really pleased with our new kitchen and utility room that Terry fitted recently and wouldn't hesitate to recommend him." },
  { customer_name: "Ewan Jones", location: "Hampshire", rating: 5,
    quote: "Terry just installed our new bathroom and he honestly exceeded our expectations. Punctual, polite and took great care." },
  { customer_name: "Matt Sheridan", location: "Yateley", rating: 5,
    quote: "Understood immediately what I was after, offered solid advice and promptly sent a quote. Reliable and highly recommended." }
];

// ---- Gallery ----
let allGalleryItems = [];

function renderGallery(items) {
  const grid = document.getElementById("galleryGrid");
  if (!items.length) {
    grid.innerHTML = `<p class="loading">No projects to show yet.</p>`;
    return;
  }
  grid.innerHTML = items.map(item => `
    <div class="gallery-item" data-category="${item.category}">
      <img src="${item.image_url}" alt="${item.title}" loading="lazy">
      <div class="gallery-caption">
        <strong>${item.title}</strong>
        <span>${item.location || ""}</span>
      </div>
    </div>
  `).join("");
}

async function loadGallery() {
  try {
    const { data, error } = await supabaseClient
      .from("tcooper_gallery")
      .select("title, category, location, image_url, sort_order")
      .eq("featured", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    allGalleryItems = data && data.length ? data : FALLBACK_GALLERY;
  } catch (e) {
    console.warn("Gallery load failed, using fallback content:", e.message);
    allGalleryItems = FALLBACK_GALLERY;
  }
  renderGallery(allGalleryItems);
}

document.getElementById("galleryFilters").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll("#galleryFilters .chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  const filter = btn.dataset.filter;
  const items = filter === "all" ? allGalleryItems : allGalleryItems.filter(i => i.category === filter);
  renderGallery(items);
});

// ---- Reviews ----
function renderReviews(reviews) {
  const track = document.getElementById("reviewsTrack");
  if (!reviews.length) {
    track.innerHTML = `<p class="loading">No reviews yet.</p>`;
    return;
  }
  track.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
      <p class="review-quote">"${r.quote}"</p>
      <div class="review-name">${r.customer_name}</div>
      <div class="review-loc">${r.location || ""}</div>
    </div>
  `).join("");
}

async function loadReviews() {
  try {
    const { data, error } = await supabaseClient
      .from("tcooper_testimonials")
      .select("customer_name, location, quote, rating, sort_order")
      .eq("featured", true)
      .order("sort_order", { ascending: true })
      .limit(6);
    if (error) throw error;
    renderReviews(data && data.length ? data : FALLBACK_REVIEWS);
  } catch (e) {
    console.warn("Reviews load failed, using fallback content:", e.message);
    renderReviews(FALLBACK_REVIEWS);
  }
}

// ---- Quote form ----
const quoteForm = document.getElementById("quoteForm");
const quoteStatus = document.getElementById("quoteStatus");
const quoteSubmit = document.getElementById("quoteSubmit");

quoteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(quoteForm);
  const payload = {
    name: formData.get("name")?.toString().trim(),
    email: formData.get("email")?.toString().trim(),
    phone: formData.get("phone")?.toString().trim() || null,
    service: formData.get("service")?.toString(),
    message: formData.get("message")?.toString().trim() || null,
  };

  if (!payload.name || !payload.email) {
    quoteStatus.textContent = "Please fill in your name and email.";
    quoteStatus.className = "quote-status error";
    return;
  }

  quoteSubmit.disabled = true;
  quoteSubmit.textContent = "Sending...";
  quoteStatus.textContent = "";
  quoteStatus.className = "quote-status";

  try {
    const { error } = await supabaseClient.from("tcooper_enquiries").insert(payload);
    if (error) throw error;
    quoteForm.reset();
    quoteStatus.textContent = "Thanks! Your quote request has been sent — we'll be in touch shortly.";
    quoteStatus.className = "quote-status success";
  } catch (err) {
    console.error(err);
    quoteStatus.textContent = "Something went wrong sending that — please call us instead on 01252 500 863.";
    quoteStatus.className = "quote-status error";
  } finally {
    quoteSubmit.disabled = false;
    quoteSubmit.textContent = "Send My Quote Request";
  }
});

// ---- Header shrink on scroll ----
const header = document.getElementById("siteHeader");
window.addEventListener("scroll", () => {
  header.style.boxShadow = window.scrollY > 10 ? "0 4px 20px rgba(0,0,0,0.06)" : "none";
});

loadGallery();
loadReviews();
