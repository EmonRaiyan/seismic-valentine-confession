// =============================================================
//  feed.js — Renders confession cards, reactions, random, report
// =============================================================
(function () {
  const feedGrid  = document.getElementById("feedGrid");
  const feedLoad  = document.getElementById("feedLoading");
  const feedEmpty = document.getElementById("feedEmpty");
  const feedError = document.getElementById("feedError");
  const randomBtn = document.getElementById("randomBtn");
  const tpl       = document.getElementById("cardTemplate");

  let all = [];

  // Store confessions data for modal access
  let confessionsData = [];

  // Exposed so index.html can call it on tab switch
  window.loadFeed = async function () {
    console.log("Loading feed...");
    showState("loading");
    confessionsData = await window.fetchConfessions(100);
    console.log("Fetched confessions:", confessionsData);
    all = confessionsData;
    if (!all.length) {
      console.log("No confessions found");
      showState("empty");
      return;
    }
    console.log("Rendering", all.length, "confessions");
    renderCards(all);
    showState("grid");
  };

  // Modal functionality
  window.openConfessionDetail = function(confessionId) {
    const confession = confessionsData.find(c => c.id === confessionId);
    if (!confession) return;

    // Populate modal
    const modal = document.getElementById('confessionModal');
    const modalAvatar = document.getElementById('modalAvatar');
    const modalAvatarFallback = document.getElementById('modalAvatarFallback');
    const modalName = document.getElementById('modalName');
    const modalMag = document.getElementById('modalMag');
    const modalBadge = document.getElementById('modalBadge');
    const modalMessage = document.getElementById('modalMessage');
    const modalReactions = document.getElementById('modalReactions');
    const modalFrom = document.getElementById('modalFrom');
    const modalTime = document.getElementById('modalTime');
    const modalReport = document.getElementById('modalReport');

    // Avatar
    if (confession.target_pfp_url) {
      modalAvatar.src = confession.target_pfp_url;
      modalAvatar.style.display = 'block';
      modalAvatarFallback.style.display = 'none';
    } else {
      modalAvatar.style.display = 'none';
      modalAvatarFallback.style.display = 'flex';
    }

    // Name & MAG
    modalName.textContent = window.sanitise(confession.target_name);
    if (confession.target_mag) {
      modalMag.textContent = confession.target_mag;
      modalMag.style.display = 'block';
    } else {
      modalMag.style.display = 'none';
    }

    // Badge - hide it entirely, we show sender info in footer only
    modalBadge.style.display = "none";

    // Message
    modalMessage.textContent = window.sanitise(confession.message);

    // From
    if (confession.user_mode === "public" && (confession.user_name || confession.user_mag)) {
      modalFrom.textContent = "from " + window.sanitise(confession.user_name || confession.user_mag);
    } else {
      modalFrom.textContent = "from Anonymous";
    }

    // Time
    modalTime.textContent = window.timeAgo(confession.created_at);
    modalTime.title = new Date(confession.created_at).toLocaleString();

    // Reactions
    modalReactions.innerHTML = '';
    const reactions = confession.reactions || {"❤️":0,"🔥":0,"🫡":0};
    const local = new Set(JSON.parse(localStorage.getItem("smv_r") || "[]"));
    window.REACTION_TYPES.forEach(emoji => {
      const btn = document.createElement("button");
      btn.className = "rxn-btn";
      if (local.has(`${confession.id}_${emoji}`)) btn.classList.add("reacted");
      btn.innerHTML = `<span>${emoji}</span><span class="rxn-count">${reactions[emoji] || 0}</span>`;
      btn.addEventListener("click", () => window.toggleReaction(confession.id, emoji, btn));
      modalReactions.appendChild(btn);
    });

    // Report button
    modalReport.onclick = async () => {
      if (modalReport.dataset.done) { window.showToast("Already reported", "info"); return; }
      const { error } = await window._db.from(TABLE_NAME).update({ is_reported: true }).eq("id", confession.id);
      if (error) { window.showToast("Report failed", "error"); return; }
      modalReport.textContent = "✅ Reported";
      modalReport.classList.add("reported");
      modalReport.dataset.done = "1";
      window.showToast("Reported to moderators 🛡", "success");
    };

    // Show modal
    modal.style.display = 'flex';
  };

  // Close modal functionality
  window.closeConfessionModal = function() {
    const modal = document.getElementById('confessionModal');
    modal.style.display = 'none';
  };

  // Close modal when clicking outside
  document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('confessionModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeConfessionModal();
        }
      });
    }
  });

  function renderCards(list) {
    feedGrid.innerHTML = "";
    list.forEach((c, i) => {
      const node = buildCard(c, i);
      feedGrid.appendChild(node);
    });
  }

  function buildCard(c, i) {
    const frag = tpl.content.cloneNode(true);
    const card = frag.querySelector(".c-card");
    card.style.animationDelay = `${i * 50}ms`;
    card.dataset.confessionId = c.id;

    // Make card clickable
    card.style.cursor = "pointer";
    card.addEventListener("click", () => window.openConfessionDetail(c.id));

    // Avatar - Main image
    const img  = card.querySelector(".c-avatar");
    const fall = card.querySelector(".c-avatar-fallback");
    if (c.target_pfp_url) {
      img.src = c.target_pfp_url;
      img.alt = c.target_name;
      img.style.display = "block";
      fall.style.display = "none";
      img.onerror = () => { img.style.display="none"; fall.style.display="flex"; };
    } else {
      img.style.display = "none";
    }

    // Name
    card.querySelector(".c-name").textContent = window.sanitise(c.target_name);
    
    // MAG
    const magEl = card.querySelector(".c-mag");
    if (c.target_mag) { magEl.textContent = c.target_mag; }
    else { magEl.style.display = "none"; }

    // Badge - Show sender's name if public, anonymous if anonymous
    const badge = card.querySelector(".c-badge");
    if (c.user_mode === "anonymous") {
      badge.textContent = "🕶️ Anonymous"; badge.classList.add("anon");
    } else {
      // Show the sender's name for public confessions
      if (c.user_name) {
        badge.textContent = window.sanitise(c.user_name); 
        badge.classList.add("pub");
      } else {
        badge.textContent = "🌊 Public"; 
        badge.classList.add("pub");
      }
    }

    // Message - show full text in feed
    card.querySelector(".c-msg").textContent = window.sanitise(c.message);

    // From
    const fromEl = card.querySelector(".c-from");
    if (c.user_mode === "public" && (c.user_name || c.user_mag)) {
      fromEl.textContent = "from " + window.sanitise(c.user_name || c.user_mag);
    } else {
      fromEl.textContent = "from Anonymous";
    }

    // Time
    const timeEl = card.querySelector(".c-time");
    timeEl.textContent = window.timeAgo(c.created_at);
    timeEl.title = new Date(c.created_at).toLocaleString();

    // Reactions
    const rxnWrap = card.querySelector(".c-rxn");
    const reactions = c.reactions || {"❤️":0,"🔥":0,"🫡":0};
    const local = new Set(JSON.parse(localStorage.getItem("smv_r") || "[]"));
    window.REACTION_TYPES.forEach(emoji => {
      const btn = document.createElement("button");
      btn.className = "rxn-btn";
      if (local.has(`${c.id}_${emoji}`)) btn.classList.add("reacted");
      btn.innerHTML = `<span>${emoji}</span><span class="rxn-count">${reactions[emoji] || 0}</span>`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent card click when clicking reaction
        window.toggleReaction(c.id, emoji, btn);
      });
      rxnWrap.appendChild(btn);
    });

    // Report
    const rep = card.querySelector(".c-report");
    rep.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card click when clicking report
      if (rep.dataset.done) { window.showToast("Already reported", "info"); return; }
      // Open modal instead of direct report
      window.openConfessionDetail(c.id);
    });

    return frag;
  }

  // Random confession
  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      if (!all.length) { window.showToast("No confessions loaded yet", "info"); return; }
      const pick = all[Math.floor(Math.random() * all.length)];
      const el = feedGrid.querySelector(`[data-confession-id="${pick.id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("flash");
        setTimeout(() => el.classList.remove("flash"), 1600);
      }
    });
  }

  function showState(s) {
    feedLoad.classList.add("hidden");
    feedEmpty.classList.add("hidden");
    feedError.classList.add("hidden");
    feedGrid.classList.add("hidden");
    if (s === "loading") feedLoad.classList.remove("hidden");
    if (s === "empty")   feedEmpty.classList.remove("hidden");
    if (s === "error")   feedError.classList.remove("hidden");
    if (s === "grid")    feedGrid.classList.remove("hidden");
  }
})();