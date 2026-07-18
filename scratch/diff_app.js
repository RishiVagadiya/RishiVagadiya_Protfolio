diff --git a/js/app.js b/js/app.js
index e97347b..55307d3 100644
--- a/js/app.js
+++ b/js/app.js
@@ -201,7 +201,57 @@ function openModal(i) {
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
+document.addEventListener("keydown", (e) => {
+  if (e.key === "Escape") {
+    if (!modal.hidden) closeModal();
+    if (suggestModal && !suggestModal.hidden) closeSuggestModal();
+  }
+});
 
 /* -------------------- sound wiring -------------------- */
 const rideHint = document.getElementById("rideHint");
@@ -231,12 +281,78 @@ document.addEventListener("click", (e) => {
 
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
+  }
+
+  // Show chatbot welcome bubble immediately when intro is dismissed/finished
+  const welcomeBubble = document.getElementById("chat-welcome-bubble");
+  if (welcomeBubble) {
+    setTimeout(() => {
+      welcomeBubble.classList.remove("bubble-hidden");
+      SFX.ping(); // Play notification sound
+    }, 1000); // 1s delay for smooth transition
+  }
+}
+
+if (introVideo) {
+  introVideo.addEventListener("ended", () => {
+    dismissIntro(true); // Auto-scroll to show starting portfolio world
+  });
+  introVideo.addEventListener("error", () => dismissIntro(false));
+}
 
-/* hide loader - safety fallback in case models fail to load */
-setTimeout(() => {
-  document.getElementById("loader")?.classList.add("hide");
-}, 15000);
+// Tap To Play button plays video unmuted and hides itself
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
+
+// Keydown skips intro
+window.addEventListener("keydown", (e) => {
+  if (introActive) {
+    return;
+  }
+});
 
 /* ================== VIRTUAL SCROLL ENGINE ================== */
 // Track maps scroll to bike Z and active UI section
@@ -272,6 +388,9 @@ let lastLockedSection = null;
 
 // Handle Wheel
 window.addEventListener("wheel", (e) => {
+  if (introActive) {
+    return;
+  }
   if (isGamePlaying || isPanelLocked) return;
   
   targetScroll += e.deltaY * 0.5;
@@ -282,6 +401,9 @@ window.addEventListener("wheel", (e) => {
 let ty = 0;
 window.addEventListener("touchstart", e => { ty = e.touches[0].clientY; }, { passive: true });
 window.addEventListener("touchmove", e => {
+  if (introActive) {
+    return;
+  }
   if (isGamePlaying || isPanelLocked) return;
 
   const dy = ty - e.touches[0].clientY;
@@ -293,6 +415,9 @@ window.addEventListener("touchmove", e => {
 // Nav Links
 document.querySelectorAll(".nav-links a, .cta[data-target]").forEach(btn => {
   btn.addEventListener("click", (e) => {
+    if (introActive) {
+      dismissIntro(false);
+    }
     if (isGamePlaying) return;
     const hrefVal = btn.getAttribute("href");
     if (hrefVal && hrefVal.endsWith(".pdf")) {
@@ -319,7 +444,9 @@ document.querySelectorAll(".nav-links a, .cta[data-target]").forEach(btn => {
       
       // Force update world Z position immediately
       let currentZ = mapRange(centerVal, seg.s, seg.e, seg.startZ, seg.endZ);
-      world.setDistance(currentZ, 0);
+      if (world) {
+        world.setDistance(currentZ, 0);
+      }
       SFX.setSpeed(0);
     }
     e.preventDefault();
@@ -369,7 +496,9 @@ function updateScroll() {
   
   if (isGamePlaying) {
     // Keep cyclist speed at 0 and stop scrolling/sound updates during gameplay
-    world.setDistance(world.currentZ || -30, 0);
+    if (world) {
+      world.setDistance(world.currentZ || -30, 0);
+    }
     SFX.setSpeed(0);
     return;
   }
@@ -418,7 +547,9 @@ function updateScroll() {
   } else {
     speed = Math.abs(targetScroll - smoothScroll) * 0.1;
   }
-  world.setDistance(currentZ, speed);
+  if (world) {
+    world.setDistance(currentZ, speed);
+  }
   SFX.setSpeed(Math.min(1, speed * 0.5));
 
   // Toggle UI sections
@@ -479,9 +610,49 @@ chatToggle.addEventListener("click", () => {
   if (!chatContainer.classList.contains("chat-hidden")) {
     chatInput.focus();
     chatMessages.scrollTop = chatMessages.scrollHeight;
+    
+    // Hide the notification dot when user opens the chat
+    const dot = chatToggle.querySelector(".notification-dot");
+    if (dot) {
+      dot.style.display = "none";
+    }
+    
+    // Also hide the welcome bubble
+    const welcomeBubble = document.getElementById("chat-welcome-bubble");
+    if (welcomeBubble) {
+      welcomeBubble.classList.add("bubble-hidden");
+    }
   }
 });
 
+// Welcome Bubble Click & Close Handling
+const welcomeBubble = document.getElementById("chat-welcome-bubble");
+const bubbleClose = document.getElementById("bubble-close");
+
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
+    
+    const dot = chatToggle.querySelector(".notification-dot");
+    if (dot) dot.style.display = "none";
+  });
+}
+
+if (bubbleClose && welcomeBubble) {
+  bubbleClose.addEventListener("click", (e) => {
+    e.stopPropagation(); // Stop click event propagation to parent bubble
+    welcomeBubble.classList.add("bubble-hidden");
+  });
+}
+
 chatClose.addEventListener("click", () => {
   chatContainer.classList.add("chat-hidden");
   chatSettingsPanel?.classList.add("chat-hidden");
@@ -528,42 +699,52 @@ chatSettingsClear?.addEventListener("click", () => {
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
+// System prompt has been moved to the backend to improve security and prevent tampering.
+
+
+// Local response generator fallback when API key is rate-limited or revoked
+function generateLocalResponse(query) {
+  const q = query.toLowerCase();
+  
+  if (/\b(hello|hi|hey|greet|greetings)\b/i.test(q)) {
+    return "👾 Hello! I'm Rishi's AI Assistant. How can I help you? I can tell you about his Unity 3D projects, C# skills, work experience, or contact details.";
+  }
+  if (q.includes("skill") || q.includes("c#") || q.includes("unity") || q.includes("hlsl") || q.includes("shader") || q.includes("dots") || q.includes("ecs") || q.includes("blender")) {
+    return "👾 Rishi's technical skills include:\n\n• Unity Engine (95%)\n• C# / .NET (92%)\n• Gameplay Systems (90%)\n• Shaders & VFX (HLSL) (78%)\n• 3D Math & Physics (85%)\n• Tools & Editor Scripting (82%)\n• Multiplayer Netcode (72%)\n• Blender 3D (68%)";
+  }
+  if (q.includes("nebula") || q.includes("drift")) {
+    return "👾 'Nebula Drift' is a 3D space-shooter roguelike featuring procedural sector generation, custom ship upgrades, and intense space physics built in Unity (URP).";
+  }
+  if (q.includes("hollow") || q.includes("keep")) {
+    return "👾 'Hollow Keep' is a 2.5D metroidvania game built in Unity (C#) featuring hand-tuned combat, rigid physics, and a complex state machine for player/enemy AI.";
+  }
+  if (q.includes("chrono") || q.includes("kart")) {
+    return "👾 'Chrono Karts' is a local-multiplayer arcade racing game featuring custom physics, spline-based track building, and fast-paced competitive gameplay.";
+  }
+  if (q.includes("last signal") || (q.includes("last") && q.includes("signal"))) {
+    return "👾 'Last Signal' is a co-op survival horror prototype that utilizes GOAP (Goal-Oriented Action Planning) AI for smart, terrifying enemies.";
+  }
+  if (q.includes("gridbound")) {
+    return "👾 'Gridbound' is a minimalist puzzle-automation game built using Unity's ECS/DOTS (Entity Component System) for high-performance simulation.";
+  }
+  if (q.includes("emberfall") || (q.includes("ember") && q.includes("fall") && q.includes("vr"))) {
+    return "👾 'Emberfall VR' is a room-scale VR climbing experience optimized specifically for standalone XR headsets.";
+  }
+  if (q.includes("project") || q.includes("game") || q.includes("work") || q.includes("build") || q.includes("portfolio")) {
+    return "👾 Rishi's featured projects include:\n\n1. Nebula Drift — Space-shooter roguelike with procedural sectors.\n2. Hollow Keep — 2.5D metroidvania with hand-tuned combat.\n3. Chrono Karts — Local-multiplayer arcade racer with splines & physics.\n4. Last Signal — Co-op survival horror prototype utilizing GOAP AI.\n5. Gridbound — Minimalist puzzle-automation using Unity ECS/DOTS.\n6. Emberfall VR — Standalone XR climbing experience.\n\nType the name of any project to hear more details!";
+  }
+  if (q.includes("contact") || q.includes("email") || q.includes("phone") || q.includes("call") || q.includes("mail") || q.includes("reach") || q.includes("social") || q.includes("linkedin") || q.includes("github")) {
+    return "👾 Here is how you can contact or connect with Rishi:\n\n• Email: Rishivagadiya613@gmail.com\n• Phone: +91 6352294215\n• Location: Ahmedabad, Gujarat, India\n• LinkedIn: linkedin.com/in/rishivagadiya\n• GitHub: github.com/RishiVagadiya";
+  }
+  if (q.includes("experience") || q.includes("career") || q.includes("job") || q.includes("hire") || q.includes("resume") || q.includes("company") || q.includes("filaments") || q.includes("jp infotech")) {
+    return "👾 Rishi's professional career details:\n\n• Unity 3D Developer Programmer at JP Infotech (Ahmedabad, India) — Present. Developing 3D systems and WebGL optimizations.\n• 3D Game Developer (Remote) at ExoMatrix.\n• Game Developer Intern (7 Months) — Assisted in prototyping, tool scripting, and level design.\n\nHe is currently open to new opportunities! You can contact him at Rishivagadiya613@gmail.com.";
+  }
+  if (q.includes("education") || q.includes("college") || q.includes("degree") || q.includes("study") || q.includes("bca") || q.includes("university")) {
+    return "👾 Rishi completed his BCA (Bachelor of Computer Applications) from Sssdiit, Junagadh, graduating in 2025.";
+  }
+  
+  return "👾 I'm here only to help you discuss Rishi Vagadiya and his work. Feel free to ask me about his projects, skills, experience, or contact details!";
+}
 
 // Send Message
 async function sendMessage(text) {
@@ -587,22 +768,18 @@ async function sendMessage(text) {
       .slice(-8)
       .map((item) => ({ role: item.role, content: item.content.slice(0, 1000) }));
 
-    const apiKey = customApiKey || DEFAULT_KEY;
+    const headers = {
+      "Content-Type": "application/json"
+    };
+    if (customApiKey) {
+      headers["Authorization"] = `Bearer ${customApiKey}`;
+    }
 
-    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
+    const response = await fetch("/api/chat", {
       method: "POST",
-      headers: {
-        "Authorization": `Bearer ${apiKey}`,
-        "Content-Type": "application/json"
-      },
+      headers: headers,
       body: JSON.stringify({
-        model: "llama-3.3-70b-versatile",
-        max_tokens: 600,
-        temperature: 0.7,
-        messages: [
-          { role: "system", content: SYSTEM_PROMPT },
-          ...safeHistory
-        ]
+        messages: safeHistory
       })
     });
 
@@ -618,13 +795,17 @@ async function sendMessage(text) {
       chatHistory.push({ role: "assistant", content: reply });
     } else {
       console.error("Groq API Error:", data);
-      renderMessage("ai", "👾 Sorry, I'm having trouble connecting to my brain right now. Please try again later!");
+      const reply = generateLocalResponse(text);
+      renderMessage("ai", reply);
+      chatHistory.push({ role: "assistant", content: reply });
     }
   } catch (error) {
     console.error("Chat Error:", error);
     const loadingEl = document.getElementById(loadingId);
     if (loadingEl) loadingEl.remove();
-    renderMessage("ai", "👾 Connection error. I couldn't reach the AI server directly.");
+    const reply = generateLocalResponse(text);
+    renderMessage("ai", reply);
+    chatHistory.push({ role: "assistant", content: reply });
   }
 }
 
