// =============================================================
//  submit.js — Confession form logic (single-page version)
// =============================================================
(function () {
  const form        = document.getElementById("confessionForm");
  if (!form) return;

  const modeRadios  = document.querySelectorAll('input[name="mode"]');
  const userSection = document.getElementById("userInfoSection");
  const pfpInput    = document.getElementById("targetPfp");
  const pfpPreview  = document.getElementById("pfpPreview");
  const pfpHolder   = document.getElementById("pfpPlaceholder");
  const charCount   = document.getElementById("charCount");
  const msgInput    = document.getElementById("message");
  const submitBtn   = document.getElementById("submitBtn");
  const btnText     = document.getElementById("btnText");
  const btnLoad     = document.getElementById("btnLoading");
  const successBanner = document.getElementById("successMessage");
  const errorBanner = document.getElementById("errorMessage");
  const errorText   = document.getElementById("errorText");

  // Mode toggle
  modeRadios.forEach(r => {
    r.addEventListener("change", () => {
      const pub = r.value === "public" && r.checked;
      userSection.style.display = pub ? "block" : "none";
    });
  });

  // Image preview
  pfpInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      window.showToast("Image must be under 5MB", "error");
      pfpInput.value = ""; return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      pfpPreview.src = ev.target.result;
      pfpPreview.classList.remove("hidden");
      pfpHolder.classList.add("hidden");
    };
    reader.readAsDataURL(file);
  });

  // Char counter
  msgInput.addEventListener("input", () => {
    charCount.textContent = msgInput.value.length;
  });

  // Submit
  form.addEventListener("submit", async e => {
    e.preventDefault();
    hideError();

    const mode       = document.querySelector('input[name="mode"]:checked').value;
    const userName   = document.getElementById("userName").value.trim();
    const userMag    = document.getElementById("userMag").value.trim();
    const targetName = document.getElementById("targetName").value.trim();
    const targetMag  = document.getElementById("targetMag").value.trim();
    const message    = msgInput.value.trim();
    const pfpFile    = pfpInput.files[0] || null;

    if (!targetName)      { showError("Please enter their name 💌"); return; }
    if (!message)         { showError("Confession message can't be empty 💬"); return; }
    if (message.length < 10) { showError("Write a little more — at least 10 characters."); return; }
    if (window.containsBadWords && (window.containsBadWords(message) || window.containsBadWords(targetName) || window.containsBadWords(userName))) {
      showError("Please keep it kind 🌸 — inappropriate language detected."); return;
    }

    setLoading(true);
    try {
      let pfpUrl = null;
      if (pfpFile) {
        window.showToast("Uploading photo...", "info");
        pfpUrl = await window.uploadPfp(pfpFile);
        if (!pfpUrl) { showError("Photo upload failed. Try a different image or skip it."); setLoading(false); return; }
      }

      const payload = {
        user_mode:      mode,
        user_name:      mode === "public" ? userName || null : null,
        user_mag:       mode === "public" ? userMag  || null : null,
        target_name:    targetName,
        target_mag:     targetMag || null,
        target_pfp_url: pfpUrl,
        message,
        reactions: { "❤️": 0, "🔥": 0, "🫡": 0 },
      };

      const { error } = await window.insertConfession(payload);
      if (error) throw error;

      // Reset
      form.reset();
      pfpPreview.classList.add("hidden");
      pfpHolder.classList.remove("hidden");
      charCount.textContent = "0";
      userSection.style.display = "none";
      successBanner.classList.remove("hidden");
      successBanner.scrollIntoView({ behavior: "smooth", block: "center" });
      window.showToast("Confession sent! 💌", "success");

      // Reload feed data next time user switches
      window._feedLoaded = false;

    } catch (err) {
      console.error(err);
      showError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  });

  function setLoading(on) {
    submitBtn.disabled = on;
    btnText.classList.toggle("hidden", on);
    btnLoad.classList.toggle("hidden", !on);
  }
  function showError(msg) {
    errorText.textContent = msg;
    errorBanner.classList.remove("hidden");
    errorBanner.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function hideError() { errorBanner.classList.add("hidden"); }
})();
