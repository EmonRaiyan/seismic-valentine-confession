// =============================================================
//  app.js — Supabase client, utilities, bad word filter,
//           image upload, reactions, toast
// =============================================================

// ── 1. Supabase client ──────────────────────────────────────
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window._db = supabaseClient;
console.log("Supabase client initialized:", !!window._db);

// ── 2. Bad word filter ──────────────────────────────────────
const BAD_WORDS = [
  "fuck","shit","asshole","bitch","cunt","dick","cock",
  "pussy","bastard","slut","whore","nigger","faggot",
  "retard","rape","kill yourself","kys",
];
function containsBadWords(text) {
  if (!text) return false;
  const l = text.toLowerCase();
  return BAD_WORDS.some(w => l.includes(w));
}
function sanitise(text) {
  if (!text) return "";
  let r = text;
  BAD_WORDS.forEach(w => {
    r = r.replace(new RegExp(w, "gi"), "*".repeat(w.length));
  });
  return r;
}
window.containsBadWords = containsBadWords;
window.sanitise = sanitise;

// ── 3. Time helper ──────────────────────────────────────────
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)      return "just now";
  if (diff < 3600)    return Math.floor(diff/60) + "m ago";
  if (diff < 86400)   return Math.floor(diff/3600) + "h ago";
  if (diff < 2592000) return Math.floor(diff/86400) + "d ago";
  return new Date(iso).toLocaleDateString();
}
window.timeAgo = timeAgo;

// ── 4. Toast ────────────────────────────────────────────────
function showToast(msg, type = "info") {
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const t = document.createElement("div");
  t.className = "toast" + (type === "success" ? " ok" : type === "error" ? " err" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    t.addEventListener("transitionend", () => t.remove());
  }, 3200);
}
window.showToast = showToast;

// ── 5. Upload PFP ───────────────────────────────────────────
async function uploadPfp(file) {
  const ext = file.name.split(".").pop();
  const name = `pfp_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await window._db.storage
    .from(STORAGE_BUCKET)
    .upload(name, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) { console.error(error); return null; }
  const { data: u } = window._db.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
  return u?.publicUrl ?? null;
}
window.uploadPfp = uploadPfp;

// ── 6. Insert confession ────────────────────────────────────
async function insertConfession(payload) {
  return await window._db.from(TABLE_NAME).insert([payload]);
}
window.insertConfession = insertConfession;

// ── 7. Fetch confessions ────────────────────────────────────
async function fetchConfessions(limit = 80) {
  console.log("Fetching confessions from database...");
  const { data, error } = await window._db
    .from(TABLE_NAME)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { 
    console.error("Database error:", error); 
    return []; 
  }
  console.log("Fetched data:", data);
  return data ?? [];
}
window.fetchConfessions = fetchConfessions;

// ── 8. Reactions ────────────────────────────────────────────
const REACTION_TYPES = ["❤️","🔥","🫡"];
window.REACTION_TYPES = REACTION_TYPES;

function getLocalReactions() {
  try { return new Set(JSON.parse(localStorage.getItem("smv_r") || "[]")); }
  catch { return new Set(); }
}
function saveLocalReaction(key) {
  const s = getLocalReactions(); s.add(key);
  localStorage.setItem("smv_r", JSON.stringify([...s]));
}

async function toggleReaction(id, emoji, btn) {
  const key = `${id}_${emoji}`;
  if (getLocalReactions().has(key)) { showToast("Already reacted " + emoji, "info"); return; }

  const { data: row, error } = await window._db
    .from(TABLE_NAME).select("reactions").eq("id", id).single();
  if (error || !row) { showToast("Could not save reaction", "error"); return; }

  const cur = row.reactions || {"❤️":0,"🔥":0,"🫡":0};
  cur[emoji] = (cur[emoji] || 0) + 1;

  const { error: ue } = await window._db
    .from(TABLE_NAME).update({ reactions: cur }).eq("id", id);
  if (ue) { showToast("Reaction failed", "error"); return; }

  saveLocalReaction(key);
  const c = btn.querySelector(".rxn-count");
  if (c) c.textContent = cur[emoji];
  btn.classList.add("reacted");
  showToast(emoji + " Added!", "success");
}
window.toggleReaction = toggleReaction;
