diff --git a/js/app.js b/js/app.js
index e97347b..b127f8d 100644
--- a/js/app.js
+++ b/js/app.js
@@ -1,5 +1,5 @@
 import { initLiquidName } from "./liquidText.js?v=12";
-import { initWorld } from "./world.js?v=12";
+import { initWorld } from "./world.js?v=14";
 import * as SFX from "./sound.js?v=12";
 
 /* -------------------- content -------------------- */
@@ -50,6 +50,16 @@ const PROJECTS = [
     color: "#ffbe1a",
     webgl: true,
     playUrl: "/PATP/index.html"
+  },
+  {
+    title: "Fun Traget",
+    tagline: "A fun WebGL game",
+    body: "Description of the game.",
+    tags: ["Unity 3D", "WebGL", "C#", "Fun"],
+    emoji: "🎮",
+    color: "#ff69b4",
+    webgl: true,
+    playUrl: "/Fun_Traget/index.html"
   }
 ];
 
@@ -71,7 +81,7 @@ const RESEARCH = [
   { ic: "🧠", h: "Procedural Content Generation", p: "Wave-function-collapse level generation and difficulty adaptation from player telemetry." },
   { ic: "⚙️", h: "DOTS / ECS Performance", p: "Data-oriented design for simulating tens of thousands of entities at stable frame-rates." },
   { ic: "✨", h: "Real-time VFX & Shaders", p: "Custom URP shader graphs, GPU particles and 'game feel' juice systems." },
-  { ic: "🕹️", h: "Player Experience & Feel", p: "Input buffering, coyote-time, screen-shake and haptics — the invisible craft that makes controls feel great." },
+  { ic: "🕹️", h: "Player Experience & Feel", p: "Input buffering, coyote-time, screen-shake and haptics — the invisible craft that makes controls feel great." }
 ];
 
 /* -------------------- render sections -------------------- */
@@ -88,13 +98,13 @@ function launchWebGL(url) {
   isGamePlaying = true;
   webglIframe.src = url;
   webglOverlay.removeAttribute("hidden");
-  
+
   // Hide projects panel when playing
   const projectsPanel = document.getElementById("projects");
   if (projectsPanel) {
     projectsPanel.classList.remove("panel-active");
   }
-  
+
   SFX.select();
 }
 
@@ -102,13 +112,13 @@ function closeWebGL() {
   isGamePlaying = false;
   webglIframe.src = "";
   webglOverlay.setAttribute("hidden", "");
-  
+
   // Re-open projects panel
   const projectsPanel = document.getElementById("projects");
   if (projectsPanel) {
     projectsPanel.classList.add("panel-active");
   }
-  
+
   SFX.click();
 }
 
@@ -122,7 +132,7 @@ PROJECTS.forEach((p, i) => {
   const btnText = isComingSoon ? "⏳ COMING SOON" : "▶ PLAY GAME";
   const btnClass = isComingSoon ? "play-btn btn-disabled" : "play-btn";
   const borderStyle = `border-top: 4px solid ${p.color};`;
-  
+
   const c = el(`
     <article class="card" data-sound="select" data-i="${i}" style="${borderStyle}">
       <div class="card-top" style="color: ${p.color};">${p.emoji}</div>
@@ -174,14 +184,14 @@ function openModal(i) {
   const isComingSoon = p.comingSoon;
   const btnText = isComingSoon ? "⏳ COMING SOON" : "▶ PLAY GAME";
   const btnClass = isComingSoon ? "play-btn btn-disabled" : "play-btn";
-  
+
   modalBody.innerHTML = `
     <div class="m-emoji" style="color: ${p.color}; text-shadow: 0 0 20px ${p.color}44;">${p.emoji}</div>
     <h3 style="color: ${p.color};">${p.title}</h3>
     <div class="m-tags tags" style="margin: 14px 0; justify-content: center;">${p.tags.map(t => `<span class="tag" style="border-color: ${p.color}44; color: ${p.color};">${t}</span>`).join("")}</div>
     <p style="margin-bottom: 24px; text-align: left;">${p.body}</p>
     <button class="${btnClass} modal-play-btn" style="border-color: ${p.color}; color: ${p.color}; max-width: 200px; margin: 0 auto; display: block;">${btnText}</button>`;
-  
+
   const mPlayBtn = modalBody.querySelector(".modal-play-btn");
   if (mPlayBtn) {
     mPlayBtn.addEventListener("click", () => {
@@ -201,7 +211,229 @@ function openModal(i) {
 function closeModal() { modal.hidden = true; SFX.click(); }
 document.getElementById("modalX").addEventListener("click", closeModal);
 modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
-document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
+
+// Suggestion Modal Wiring
+const suggestToggle = document.getElementById("suggest-toggle");
+const suggestModal = document.getElementById("suggestModal");
+const suggestModalX = document.getElementById("suggestModalX");
+const suggestSubmit = document.getElementById("suggestSubmit");
+const suggestInput = document.getElementById("suggestInput");
+
+if (suggestToggle && suggestModal) {
+  suggestToggle.addEventListener("click", () => {
+    suggestModal.hidden = false;
+    SFX.select();
+  });
+}
+
+function closeSuggestModal() {
+  if (suggestModal) {
+    suggestModal.hidden = true;
+    SFX.click();
+  }
+}
+
+if (suggestModalX) {
+  suggestModalX.addEventListener("click", closeSuggestModal);
+}
+
+if (suggestModal) {
+  suggestModal.addEventListener("click", (e) => {
+    if (e.target === suggestModal) closeSuggestModal();
+  });
+}
+
+if (suggestSubmit && suggestInput) {
+  suggestSubmit.addEventListener("click", () => {
+    const text = suggestInput.value.trim();
+    if (text) {
+      alert("Thank you for your suggestion!");
+      suggestInput.value = "";
+      closeSuggestModal();
+    } else {
+      alert("Please enter a suggestion first.");
+    }
+  });
+}
+
+// Chatbot Welcome Bubble
+const welcomeBubble = document.getElementById("chat-welcome-bubble");
+const bubbleClose = document.getElementById("bubble-close");
+
+if (welcomeBubble) {
+  welcomeBubble.addEventListener("click", (e) => {
+    if (e.target === bubbleClose || bubbleClose.contains(e.target)) {
+      return;
+    }
+    welcomeBubble.classList.add("bubble-hidden");
+    chatContainer.classList.remove("chat-hidden");
+    chatInput.focus();
+    chatMessages.scrollTop = chatMessages.scrollHeight;
+
+    const dot = chatToggle.querySelector(".notification-dot");
+    if (dot) dot.style.display = "none";
+  });
+}
+
+if (bubbleClose && welcomeBubble) {
+  bubbleClose.addEventListener("click", (e) => {
+    e.stopPropagation();
+    welcomeBubble.classList.add("bubble-hidden");
+  });
+}
+
+chatClose.addEventListener("click", () => {
+  chatContainer.classList.add("chat-hidden");
+});
+
+// Chat history tracking
+let chatHistory = [];
+
+// The Groq API is called ONLY from the backend (/api/chat on Vercel, see
+// api/chat.js) — no API key ever ships to the browser.
+
+// Local response generator fallback when the backend is unreachable
+function generateLocalResponse(query) {
+  const q = query.toLowerCase();
+
+  // greetings match whole words only ("his skills" must NOT match "hi"),
+  // and only when the message is a short greeting rather than a question
+  if (/\b(hello|hi|hey|yo|greetings|namaste)\b/.test(q) && q.length < 25 && !q.includes("?")) {
+    return "👾 Hello! I'm Rishi's AI Assistant. How can I help you? I can tell you about his Unity 3D projects, C# skills, work experience, or contact details.";
+  }
+  if (q.includes("skill") || q.includes("c#") || q.includes("unity") || q.includes("hlsl") || q.includes("shader") || q.includes("dots") || q.includes("ecs") || q.includes("blender")) {
+    return "👾 Rishi's technical skills include:\n\n• Unity Engine (95%)\n• C# / .NET (92%)\n• Gameplay Systems (90%)\n• Shaders & VFX (HLSL) (78%)\n• 3D Math & Physics (85%)\n• Tools & Editor Scripting (82%)\n• Multiplayer Netcode (72%)\n• Blender 3D (68%)";
+  }
+  if (q.includes("project") || q.includes("game") || q.includes("work") || q.includes("build") || q.includes("portfolio")) {
+    if (q.includes("nebula") || q.includes("drift")) {
+      return "👾 'Nebula Drift' is a 3D space-shooter roguelike featuring procedural sector generation, custom ship upgrades, and intense space physics built in Unity (URP).";
+    }
+    if (q.includes("hollow") || q.includes("keep")) {
+      return "👾 'Hollow Keep' is a 2.5D metroidvania game built in Unity (C#) featuring hand-tuned combat, rigid physics, and a complex state machine for player/enemy AI.";
+    }
+    return "👾 Rishi's featured projects include:\n\n1. Nebula Drift — Space-shooter roguelike with procedural sectors.\n2. Hollow Keep — 2.5D metroidvania with hand-tuned combat.\n3. Chrono Karts — Local-multiplayer arcade racer with splines & physics.\n4. Last Signal — Co-op survival horror prototype utilizing GOAP AI.\n5. Gridbound — Minimalist puzzle-automation using Unity ECS/DOTS.\n6. Emberfall VR — Standalone XR climbing experience.\n\nType the name of any project to hear more details!";
+  }
+  if (q.includes("contact") || q.includes("email") || q.includes("phone") || q.includes("call") || q.includes("mail") || q.includes("reach") || q.includes("social") || q.includes("linkedin") || q.includes("github")) {
+    return "👾 Here is how you can contact or connect with Rishi:\n\n• Email: Rishivagadiya613@gmail.com\n• Phone: +91 6352294215\n• Location: Ahmedabad, Gujarat, India\n• LinkedIn: linkedin.com/in/rishivagadiya\n• GitHub: github.com/RishiVagadiya";
+  }
+  if (q.includes("experience") || q.includes("career") || q.includes("job") || q.includes("hire") || q.includes("resume") || q.includes("company") || q.includes("filaments") || q.includes("available")) {
+    return "👾 Rishi's professional career details:\n\n• Unity 3D Programmer at Virtual Filaments Pvt Ltd (Ahmedabad, India) — Present. Gameplay systems, AI, VFX/shaders and optimization.\n• 3D Game Developer (Remote) at ExoMatrix.\n\nHe is actively open to new Unity / C# opportunities (remote or relocation) and replies within 24 hours! Contact him at Rishivagadiya613@gmail.com or +91 6352294215.";
+  }
+  if (q.includes("education") || q.includes("college") || q.includes("degree") || q.includes("study") || q.includes("bca") || q.includes("university")) {
+    return "👾 Rishi completed his BCA (Bachelor of Computer Applications) from Sssdiit, Junagadh, graduating in 2025.";
+  }
+
+  return "👾 I'm here only to help you discuss Rishi Vagadiya and his work. Feel free to ask me about his projects, skills, experience, or contact details!";
+}
+
+// Send Message
+async function sendMessage(text) {
+  if (!text || !text.trim()) return;
+  text = text.trim();
+
+  // Render User Message
+  renderMessage("user", text);
+  chatInput.value = "";
+
+  // Append user message to history
+  chatHistory.push({ role: "user", content: text });
+
+  // Render AI Loading Message
+  const loadingId = "msg-loading-" + Date.now();
+  renderLoadingMessage(loadingId);
+
+  try {
+    const safeHistory = chatHistory
+      .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
+      .slice(-8)
+      .map((item) => ({ role: item.role, content: item.content.slice(0, 1000) }));
+
+    // All model access goes through our own backend (api/chat.js on Vercel);
+    // the browser never talks to Groq and never sees an API key.
+    const response = await fetch("/api/chat", {
+      method: "POST",
+      headers: { "Content-Type": "application/json" },
+      body: JSON.stringify({ messages: safeHistory })
+    });
+
+    const data = await response.json();
+
+    // Remove loading message
+    const loadingEl = document.getElementById(loadingId);
+    if (loadingEl) loadingEl.remove();
+
+    if (response.ok && typeof data.reply === "string" && data.reply) {
+      renderMessage("ai", data.reply);
+      chatHistory.push({ role: "assistant", content: data.reply });
+    } else {
+      console.error("Chat backend error:", data);
+      const reply = generateLocalResponse(text);
+      renderMessage("ai", reply);
+      chatHistory.push({ role: "assistant", content: reply });
+    }
+  } catch (error) {
+    console.error("Chat Error:", error);
+    const loadingEl = document.getElementById(loadingId);
+    if (loadingEl) loadingEl.remove();
+    const reply = generateLocalResponse(text);
+    renderMessage("ai", reply);
+    chatHistory.push({ role: "assistant", content: reply });
+  }
+}
+
+// Render message in chat area
+function renderMessage(sender, content) {
+  const msgWrap = document.createElement("div");
+  msgWrap.className = `chat-msg ${sender}`;
+
+  const contentEl = document.createElement("div");
+  contentEl.className = "msg-content";
+  contentEl.innerText = content;
+  msgWrap.appendChild(contentEl);
+
+  const timeEl = document.createElement("div");
+  timeEl.className = "msg-time";
+  const now = new Date();
+  let hrs = now.getHours();
+  const mins = String(now.getMinutes()).padStart(2, "0");
+  const ampm = hrs >= 12 ? "PM" : "AM";
+  hrs = hrs % 12;
+  hrs = hrs ? hrs : 12;
+  timeEl.innerText = `${hrs}:${mins} ${ampm}`;
+  msgWrap.appendChild(timeEl);
+
+  chatMessages.appendChild(msgWrap);
+  chatMessages.scrollTop = chatMessages.scrollHeight;
+}
+
+// Render AI typing/loading bubble
+function renderLoadingMessage(id) {
+  const msgWrap = document.createElement("div");
+  msgWrap.className = "chat-msg ai";
+  msgWrap.id = id;
+
+  const contentEl = document.createElement("div");
+  contentEl.className = "msg-content";
+  contentEl.innerHTML = `<span style="font-family:'Inter', sans-serif;opacity:0.6;">Thinking...</span>`;
+  msgWrap.appendChild(contentEl);
+
+  chatMessages.appendChild(msgWrap);
+  chatMessages.scrollTop = chatMessages.scrollHeight;
+}
+
+// Wire send button & enter key
+chatSend.addEventListener("click", () => sendMessage(chatInput.value));
+chatInput.addEventListener("keydown", (e) => {
+  if (e.key === "Enter") sendMessage(chatInput.value);
+});
+
+// Wire query chips
+chatChips.forEach(chip => {
+  chip.addEventListener("click", () => {
+    const query = chip.getAttribute("data-query");
+    sendMessage(query);
+  });
+});
 
 /* -------------------- sound wiring -------------------- */
 const rideHint = document.getElementById("rideHint");
@@ -231,12 +463,89 @@ document.addEventListener("click", (e) => {
 
 /* -------------------- boot 3D + name -------------------- */
 initLiquidName(document.getElementById("liquidName"), "Rishi Vagadiya");
-const world = initWorld(document.getElementById("scene"));
+let world = null;
+
+// Initialize Three.js world immediately on load
+world = initWorld(document.getElementById("scene"));
+
+/* ================== INTRO VIDEO HANDLER ================== */
+let introActive = true;
+const introContainer = document.getElementById("intro-video-container");
+const introVideo = document.getElementById("intro-video");
+const tapToPlayBtn = document.getElementById("tap-to-play-btn");
+
+function dismissIntro(autoScroll = false) {
+  if (!introActive) return;
+  introActive = false;
+
+  // Reveal portfolio elements immediately when intro is dismissed
+  document.body.classList.remove("intro-active");
+
+  if (introContainer) {
+    introContainer.classList.add("hide");
+    setTimeout(() => {
+      if (introVideo) {
+        introVideo.pause();
+        introVideo.removeAttribute("src");
+        introVideo.load();
+      }
+      introContainer.remove(); // Completely remove from DOM to destroy compositor layer
+    }, 800);
+  }
+
+  // If auto-scroll is requested (video ended naturally), smoothly drive the bike forward
+  if (autoScroll) {
+    targetScroll = 150;
+
+    // Open chatbot UI immediately after video ends
+    const chatContainer = document.getElementById("chat-container");
+    if (chatContainer) {
+      chatContainer.classList.remove("chat-hidden");
+      // Focus the input and scroll to bottom after a short delay to let the animation finish
+      setTimeout(() => {
+        const chatInput = document.getElementById("chat-input");
+        if (chatInput) chatInput.focus();
+        const chatMessages = document.getElementById("chat-messages");
+        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
+      }, 500);
+    }
+  } else {
+    // Show chatbot welcome bubble immediately when intro is dismissed/finished
+    const welcomeBubble = document.getElementById("chat-welcome-bubble");
+    if (welcomeBubble) {
+      setTimeout(() => {
+        welcomeBubble.classList.remove("bubble-hidden");
+        SFX.ping(); // Play notification sound
+      }, 1000); // 1s delay for smooth transition
+    }
+  }
+}
+
+if (introVideo) {
+  introVideo.addEventListener("ended", () => {
+    dismissIntro(true); // Auto-scroll to show starting portfolio world
+  });
+  introVideo.addEventListener("error", () => dismissIntro(false));
+}
+
+// Tap To Play Video
+if (tapToPlayBtn && introVideo) {
+  tapToPlayBtn.addEventListener("click", (e) => {
+    e.stopPropagation();
+    introVideo.muted = false;
+    introVideo.play().catch(err => console.warn(err));
+    SFX.unlock();
+    tapToPlayBtn.classList.add("hide");
+    setTimeout(() => {
+      tapToPlayBtn.style.display = "none";
+    }, 300);
+  });
+}
 
-/* hide loader - safety fallback in case models fail to load */
-setTimeout(() => {
-  document.getElementById("loader")?.classList.add("hide");
-}, 15000);
+// Keydown skips intro
+window.addEventListener("keydown", () => {
+  if (introActive) dismissIntro(false);
+});
 
 /* ================== VIRTUAL SCROLL ENGINE ================== */
 // Track maps scroll to bike Z and active UI section
@@ -270,10 +579,20 @@ const stops = [
 let isPanelLocked = false;
 let lastLockedSection = null;
 
+// Scrolling inside floating UI (chatbot, modals, game overlay) must scroll
+// that UI only — never ride the bicycle forward.
+function isUIScrollTarget(el) {
+  return el instanceof Element &&
+    !!el.closest("#chat-container, #chat-welcome-bubble, #modal, #suggestModal, #webgl-overlay");
+}
+
 // Handle Wheel
 window.addEventListener("wheel", (e) => {
-  if (isGamePlaying || isPanelLocked) return;
-  
+  if (introActive) {
+    return;
+  }
+  if (isGamePlaying || isPanelLocked || isUIScrollTarget(e.target)) return;
+
   targetScroll += e.deltaY * 0.5;
   targetScroll = Math.max(0, Math.min(targetScroll, MAX_SCROLL));
 }, { passive: true });
@@ -282,7 +601,10 @@ window.addEventListener("wheel", (e) => {
 let ty = 0;
 window.addEventListener("touchstart", e => { ty = e.touches[0].clientY; }, { passive: true });
 window.addEventListener("touchmove", e => {
-  if (isGamePlaying || isPanelLocked) return;
+  if (introActive) {
+    return;
+  }
+  if (isGamePlaying || isPanelLocked || isUIScrollTarget(e.target)) return;
 
   const dy = ty - e.touches[0].clientY;
   targetScroll += dy * 1.5;
@@ -293,6 +615,9 @@ window.addEventListener("touchmove", e => {
 // Nav Links
 document.querySelectorAll(".nav-links a, .cta[data-target]").forEach(btn => {
   btn.addEventListener("click", (e) => {
+    if (introActive) {
+      dismissIntro(false);
+    }
     if (isGamePlaying) return;
     const hrefVal = btn.getAttribute("href");
     if (hrefVal && hrefVal.endsWith(".pdf")) {
@@ -304,22 +629,24 @@ document.querySelectorAll(".nav-links a, .cta[data-target]").forEach(btn => {
     if (seg) {
       const stop = stops.find(s => s.id === id);
       const centerVal = stop ? stop.center : (seg.s + (seg.e - seg.s) / 2);
-      
+
       isPanelLocked = true;
       lastLockedSection = id;
       targetScroll = centerVal;
       smoothScroll = centerVal; // Teleport instantly
-      
+
       SFX.stopDrivingSound(); // Instantly mute driving sound
-      
+
       // Open panel immediately
       document.querySelectorAll(".panel").forEach(p => p.classList.remove("panel-active"));
       document.getElementById(id)?.classList.add("panel-active");
       activeSection = id;
-      
+
       // Force update world Z position immediately
       let currentZ = mapRange(centerVal, seg.s, seg.e, seg.startZ, seg.endZ);
-      world.setDistance(currentZ, 0);
+      if (world) {
+        world.setDistance(currentZ, 0);
+      }
       SFX.setSpeed(0);
     }
     e.preventDefault();
@@ -366,17 +693,19 @@ function mapRange(val, in_min, in_max, out_min, out_max) {
 
 function updateScroll() {
   requestAnimationFrame(updateScroll);
-  
+
   if (isGamePlaying) {
     // Keep cyclist speed at 0 and stop scrolling/sound updates during gameplay
-    world.setDistance(world.currentZ || -30, 0);
+    if (world) {
+      world.setDistance(world.currentZ || -30, 0);
+    }
     SFX.setSpeed(0);
     return;
   }
-  
+
   // Smoothly interpolate scroll
   smoothScroll += (targetScroll - smoothScroll) * 0.08;
-  
+
   // Check if we just arrived at a stop range
   if (!isPanelLocked) {
     for (const stop of stops) {
@@ -397,11 +726,11 @@ function updateScroll() {
       }
     }
   }
-  
+
   // Find current segment
   let currentZ = 0;
   let newSection = null;
-  
+
   for (const seg of track) {
     if (smoothScroll >= seg.s && smoothScroll <= seg.e) {
       currentZ = mapRange(smoothScroll, seg.s, seg.e, seg.startZ, seg.endZ);
@@ -418,7 +747,9 @@ function updateScroll() {
   } else {
     speed = Math.abs(targetScroll - smoothScroll) * 0.1;
   }
-  world.setDistance(currentZ, speed);
+  if (world) {
+    world.setDistance(currentZ, speed);
+  }
   SFX.setSpeed(Math.min(1, speed * 0.5));
 
   // Toggle UI sections
@@ -479,91 +810,90 @@ chatToggle.addEventListener("click", () => {
   if (!chatContainer.classList.contains("chat-hidden")) {
     chatInput.focus();
     chatMessages.scrollTop = chatMessages.scrollHeight;
+
+    // Hide the notification dot when user opens the chat
+    const dot = chatToggle.querySelector(".notification-dot");
+    if (dot) dot.style.display = "none";
+
+    // Also hide the welcome bubble
+    const welcomeBubble = document.getElementById("chat-welcome-bubble");
+    if (welcomeBubble) {
+      welcomeBubble.classList.add("bubble-hidden");
+    }
   }
 });
 
-chatClose.addEventListener("click", () => {
-  chatContainer.classList.add("chat-hidden");
-  chatSettingsPanel?.classList.add("chat-hidden");
-});
+// Welcome Bubble Click & Close Handling
+const welcomeBubble = document.getElementById("chat-welcome-bubble");
+const bubbleClose = document.getElementById("bubble-close");
 
-// Chat settings handlers
-const chatSettingsBtn = document.getElementById("chat-settings-btn");
-const chatSettingsPanel = document.getElementById("chat-settings-panel");
-const chatApiKeyInput = document.getElementById("chat-api-key");
-const chatSettingsSave = document.getElementById("chat-settings-save");
-const chatSettingsClear = document.getElementById("chat-settings-clear");
+if (welcomeBubble) {
+  welcomeBubble.addEventListener("click", (e) => {
+    // If they clicked the close button, don't open the chat
+    if (e.target === bubbleClose || bubbleClose.contains(e.target)) {
+      return;
+    }
+    // Otherwise open the chatbot panel and hide the bubble
+    welcomeBubble.classList.add("bubble-hidden");
+    chatContainer.classList.remove("chat-hidden");
+    chatInput.focus();
+    chatMessages.scrollTop = chatMessages.scrollHeight;
 
-let customApiKey = localStorage.getItem("groq_api_key") || "";
-if (chatApiKeyInput) {
-  chatApiKeyInput.value = customApiKey;
+    const dot = chatToggle.querySelector(".notification-dot");
+    if (dot) dot.style.display = "none";
+  });
 }
 
-chatSettingsBtn?.addEventListener("click", () => {
-  chatSettingsPanel?.classList.toggle("chat-hidden");
-  SFX.click();
-});
-
-chatSettingsSave?.addEventListener("click", () => {
-  const newKey = chatApiKeyInput.value.trim();
-  if (newKey) {
-    localStorage.setItem("groq_api_key", newKey);
-    customApiKey = newKey;
-  } else {
-    localStorage.removeItem("groq_api_key");
-    customApiKey = "";
-  }
-  chatSettingsPanel?.classList.add("chat-hidden");
-  SFX.click();
-});
+if (bubbleClose && welcomeBubble) {
+  bubbleClose.addEventListener("click", (e) => {
+    e.stopPropagation(); // Stop click event propagation to parent bubble
+    welcomeBubble.classList.add("bubble-hidden");
+  });
+}
 
-chatSettingsClear?.addEventListener("click", () => {
-  localStorage.removeItem("groq_api_key");
-  customApiKey = "";
-  if (chatApiKeyInput) chatApiKeyInput.value = "";
-  chatSettingsPanel?.classList.add("chat-hidden");
-  SFX.click();
+chatClose.addEventListener("click", () => {
+  chatContainer.classList.add("chat-hidden");
 });
 
 // Chat history tracking
 let chatHistory = [];
 
-const DEFAULT_KEY = "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";
-const SYSTEM_PROMPT = `You are an AI assistant exclusively for Rishi Vagadiya's portfolio website.
-
-Your ONLY purpose is to answer questions about Rishi Vagadiya: his skills, projects, experience, education, contact details, availability, and professional background.
-
-STRICT RULES:
-1. ONLY answer questions related to Rishi Vagadiya and his portfolio.
-2. If anyone asks about ANYTHING else, politely decline and redirect them back to asking about Rishi.
-3. NEVER write code for users, NEVER answer general questions, NEVER discuss topics unrelated to Rishi.
-4. Always stay in character as Rishi's personal portfolio assistant.
-5. Keep answers concise, professional, and useful for recruiters, clients, or collaborators.
-6. Do not invent facts. If the answer is not in the profile facts below, say you only know the portfolio information provided.
-
-When someone asks something off-topic, respond:
-"I'm here only to help you discuss Rishi Vagadiya and his work. Feel free to ask me about his projects, skills, or experience."
-
-About Rishi Vagadiya:
-- Position: Unity 3D Developer and Game Developer
-- Current Job: Unity 3D Programmer at Virtual Filaments Pvt Ltd, Ahmedabad, Gujarat, India (managing gameplay systems, AI, VFX/shaders, optimization).
-- Past Job: 3D Game Developer (Remote) at ExoMatrix.
-- Key Skills: Unity Engine, C# / .NET, Gameplay Systems, Shaders/VFX (HLSL), 3D Math & Physics, Tools/Editor scripting, Multiplayer Netcode, Blender 3D.
-- Education: BCA (Bachelor of Computer Applications) from Sssdiit, Junagadh (Graduated 2025).
-- Personal Details:
-  * Location: Ahmedabad, Gujarat, India
-  * Email: Rishivagadiya613@gmail.com
-  * Phone: +91 6352294215
-  * LinkedIn: https://www.linkedin.com/in/rishivagadiya
-  * GitHub: https://github.com/RishiVagadiya
-- Featured Projects:
-  1. Nebula Drift: Roguelike space-shooter with procedural sectors (Unity, URP, C#).
-  2. Hollow Keep: 2.5D metroidvania with hand-tuned combat and state machines (Unity, C#).
-  3. Chrono Karts: Local-multiplayer arcade racer with physics and splines.
-  4. Last Signal: Co-op survival horror prototype with GOAP AI.
-  5. Gridbound: Minimalist puzzle-automation utilizing ECS/DOTS.
-  6. Emberfall VR: Room-scale VR climbing experience optimized for standalone XR.
-- Research Interests: Procedural Content Generation (PCG), DOTS/ECS performance simulation, real-time HLSL shader scripting, and player experience game feel.`;
+// The Groq API is called ONLY from the backend (/api/chat on Vercel, see
+// api/chat.js) — no API key ever ships to the browser.
+
+// Local response generator fallback when the backend is unreachable
+function generateLocalResponse(query) {
+  const q = query.toLowerCase();
+
+  // greetings match whole words only ("his skills" must NOT match "hi"),
+  // and only when the message is a short greeting rather than a question
+  if (/\b(hello|hi|hey|yo|greetings|namaste)\b/.test(q) && q.length < 25 && !q.includes("?")) {
+    return "👾 Hello! I'm Rishi's AI Assistant. How can I help you? I can tell you about his Unity 3D projects, C# skills, work experience, or contact details.";
+  }
+  if (q.includes("skill") || q.includes("c#") || q.includes("unity") || q.includes("hlsl") || q.includes("shader") || q.includes("dots") || q.includes("ecs") || q.includes("blender")) {
+    return "👾 Rishi's technical skills include:\n\n• Unity Engine (95%)\n• C# / .NET (92%)\n• Gameplay Systems (90%)\n• Shaders & VFX (HLSL) (78%)\n• 3D Math & Physics (85%)\n• Tools & Editor Scripting (82%)\n• Multiplayer Netcode (72%)\n• Blender 3D (68%)";
+  }
+  if (q.includes("project") || q.includes("game") || q.includes("work") || q.includes("build") || q.includes("portfolio")) {
+    if (q.includes("nebula") || q.includes("drift")) {
+      return "👾 'Nebula Drift' is a 3D space-shooter roguelike featuring procedural sector generation, custom ship upgrades, and intense space physics built in Unity (URP).";
+    }
+    if (q.includes("hollow") || q.includes("keep")) {
+      return "👾 'Hollow Keep' is a 2.5D metroidvania game built in Unity (C#) featuring hand-tuned combat, rigid physics, and a complex state machine for player/enemy AI.";
+    }
+    return "👾 Rishi's featured projects include:\n\n1. Nebula Drift — Space-shooter roguelike with procedural sectors.\n2. Hollow Keep — 2.5D metroidvania with hand-tuned combat.\n3. Chrono Karts — Local-multiplayer arcade racer with splines & physics.\n4. Last Signal — Co-op survival horror prototype utilizing GOAP AI.\n5. Gridbound — Minimalist puzzle-automation using Unity ECS/DOTS.\n6. Emberfall VR — Standalone XR climbing experience.\n\nType the name of any project to hear more details!";
+  }
+  if (q.includes("contact") || q.includes("email") || q.includes("phone") || q.includes("call") || q.includes("mail") || q.includes("reach") || q.includes("social") || q.includes("linkedin") || q.includes("github")) {
+    return "👾 Here is how you can contact or connect with Rishi:\n\n• Email: Rishivagadiya613@gmail.com\n• Phone: +91 6352294215\n• Location: Ahmedabad, Gujarat, India\n• LinkedIn: linkedin.com/in/rishivagadiya\n• GitHub: github.com/RishiVagadiya";
+  }
+  if (q.includes("experience") || q.includes("career") || q.includes("job") || q.includes("hire") || q.includes("resume") || q.includes("company") || q.includes("filaments") || q.includes("available")) {
+    return "👾 Rishi's professional career details:\n\n• Unity 3D Programmer at Virtual Filaments Pvt Ltd (Ahmedabad, India) — Present. Gameplay systems, AI, VFX/shaders and optimization.\n• 3D Game Developer (Remote) at ExoMatrix.\n\nHe is actively open to new Unity / C# opportunities (remote or relocation) and replies within 24 hours! Contact him at Rishivagadiya613@gmail.com or +91 6352294215.";
+  }
+  if (q.includes("education") || q.includes("college") || q.includes("degree") || q.includes("study") || q.includes("bca") || q.includes("university")) {
+    return "👾 Rishi completed his BCA (Bachelor of Computer Applications) from Sssdiit, Junagadh, graduating in 2025.";
+  }
+
+  return "👾 I'm here only to help you discuss Rishi Vagadiya and his work. Feel free to ask me about his projects, skills, experience, or contact details!";
+}
 
 // Send Message
 async function sendMessage(text) {
@@ -587,97 +917,35 @@ async function sendMessage(text) {
       .slice(-8)
       .map((item) => ({ role: item.role, content: item.content.slice(0, 1000) }));
 
-    const apiKey = customApiKey || DEFAULT_KEY;
-
-    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
+    // All model access goes through our own backend (api/chat.js on Vercel);
+    // the browser never talks to Groq and never sees an API key.
+    const response = await fetch("/api/chat", {
       method: "POST",
-      headers: {
-        "Authorization": `Bearer ${apiKey}`,
-        "Content-Type": "application/json"
-      },
-      body: JSON.stringify({
-        model: "llama-3.3-70b-versatile",
-        max_tokens: 600,
-        temperature: 0.7,
-        messages: [
-          { role: "system", content: SYSTEM_PROMPT },
-          ...safeHistory
-        ]
-      })
+      headers: { "Content-Type": "application/json" },
+      body: JSON.stringify({ messages: safeHistory })
     });
 
     const data = await response.json();
-    
+
     // Remove loading message
     const loadingEl = document.getElementById(loadingId);
-    if (loadingEl) loadingEl.remove();
+    if (loadingEl) loggingEl.remove();
 
-    if (response.ok && data.choices?.[0]?.message?.content) {
-      const reply = data.choices[0].message.content;
+    if (response.ok && typeof data.reply === "string" && data.reply) {
+      renderMessage("ai", data.reply);
+      chatHistory.push({ role: "assistant", content: data.reply });
+    } else {
+      console.error("Chat backend error:", data);
+      const reply = generateLocalResponse(text);
       renderMessage("ai", reply);
       chatHistory.push({ role: "assistant", content: reply });
-    } else {
-      console.error("Groq API Error:", data);
-      renderMessage("ai", "👾 Sorry, I'm having trouble connecting to my brain right now. Please try again later!");
     }
   } catch (error) {
     console.error("Chat Error:", error);
     const loadingEl = document.getElementById(loadingId);
-    if (loadingEl) loadingEl.remove();
-    renderMessage("ai", "👾 Connection error. I couldn't reach the AI server directly.");
+    if (loadingEl) loggingEl.remove();
+    const reply = generateLocalResponse(text);
+    renderMessage("ai", reply);
+    chatHistory.push({ role: "assistant", content: reply });
   }
-}
-
-// Render message in chat area
-function renderMessage(sender, content) {
-  const msgWrap = document.createElement("div");
-  msgWrap.className = `chat-msg ${sender}`;
-
-  const contentEl = document.createElement("div");
-  contentEl.className = "msg-content";
-  contentEl.innerText = content;
-  msgWrap.appendChild(contentEl);
-
-  const timeEl = document.createElement("div");
-  timeEl.className = "msg-time";
-  const now = new Date();
-  let hrs = now.getHours();
-  const mins = String(now.getMinutes()).padStart(2, "0");
-  const ampm = hrs >= 12 ? "PM" : "AM";
-  hrs = hrs % 12;
-  hrs = hrs ? hrs : 12;
-  timeEl.innerText = `${hrs}:${mins} ${ampm}`;
-  msgWrap.appendChild(timeEl);
-
-  chatMessages.appendChild(msgWrap);
-  chatMessages.scrollTop = chatMessages.scrollHeight;
-}
-
-// Render AI typing/loading bubble
-function renderLoadingMessage(id) {
-  const msgWrap = document.createElement("div");
-  msgWrap.className = "chat-msg ai";
-  msgWrap.id = id;
-
-  const contentEl = document.createElement("div");
-  contentEl.className = "msg-content";
-  contentEl.innerHTML = `<span style="font-family:'Inter', sans-serif;opacity:0.6;">Thinking...</span>`;
-  msgWrap.appendChild(contentEl);
-
-  chatMessages.appendChild(msgWrap);
-  chatMessages.scrollTop = chatMessages.scrollHeight;
-}
-
-// Wire send button & enter key
-chatSend.addEventListener("click", () => sendMessage(chatInput.value));
-chatInput.addEventListener("keydown", (e) => {
-  if (e.key === "Enter") sendMessage(chatInput.value);
-});
-
-// Wire query chips
-chatChips.forEach(chip => {
-  chip.addEventListener("click", () => {
-    const query = chip.getAttribute("data-query");
-    sendMessage(query);
-  });
-});
+}
\ No newline at end of file
