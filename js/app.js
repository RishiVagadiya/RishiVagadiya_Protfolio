import { initLiquidName } from "./liquidText.js?v=2";
import { initWorld } from "./world.js?v=6";
import * as SFX from "./sound.js?v=2";

/* -------------------- content -------------------- */
const PROJECTS = [
  {
    title: "Crowwed Color",
    tagline: "A 3D running game where players solve math questions while running.",
    body: "A 3D running game where players solve math questions while running. Features 5 levels in a single scene using Empty GameObjects. Features Unity Ads after each level.",
    tags: ["Unity 3D", "C#", "AI", "Physics"],
    emoji: "🏃‍♂️",
    color: "#ff8c00",
    playUrl: "https://drive.google.com/file/d/1ePns9H9h8htrAnfnYsxh1q-Z_slxIfbn/view"
  },
  {
    title: "Zombie Killing Game",
    tagline: "A 3D action game with proximity-based enemy AI.",
    body: "A 3D action game with proximity-based enemy AI. Enemies detect and chase the player, complete with combat mechanics and custom-designed environment.",
    tags: ["Unity 3D", "C#", "AI Nav", "3D"],
    emoji: "🧟",
    color: "#00ffcc",
    playUrl: "https://drive.google.com/file/d/13oiid8qWvXb2e8iPC3sSCjXkrtbv-KPP/view?usp=drive_link"
  },
  {
    title: "AR Experience",
    tagline: "An augmented reality application transforming your surroundings into an interactive experience.",
    body: "An augmented reality application transforming your surroundings into an interactive experience. Built with Unity AR Foundation.",
    tags: ["Unity 3D", "AR", "Mobile", "C#"],
    emoji: "🕶️",
    color: "#7a5cff",
    comingSoon: true
  },
  {
    title: "Car Parking",
    tagline: "A realistic 3D car parking simulation game with smooth vehicle controls.",
    body: "A realistic 3D car parking simulation game with smooth vehicle controls, tight parking challenges, and multiple levels. Play directly in your browser!",
    tags: ["Unity 3D", "WebGL", "C#", "Physics"],
    emoji: "🚗",
    color: "#00e0ff",
    webgl: true,
    playUrl: "/Car_Parking/index.html"
  },
  {
    title: "Fish v/s Fisherman",
    tagline: "An interactive WebGL fishing game with realistic water and catching mechanics.",
    body: "An immersive fishing simulator where players catch various fish species using precise casting and reeling mechanics. Play directly in your browser!",
    tags: ["Unity 3D", "WebGL", "C#", "Simulation"],
    emoji: "🎣",
    color: "#ffbe1a",
    webgl: true,
    playUrl: "/PATP/index.html"
  }
];

const CAREER = [
  { yr: "2026 — Present", h: "Unity Game Developer Programmer · JP Infotech", p: "Developing interactive 3D gameplay systems, optimizing performance for standalone and WebGL targets, and implementing advanced graphics/UI." },
  { yr: "2024 — 2025", h: "Game Developer · Corporate Studio", p: "Worked in a corporate game industry company managing gameplay loops, physics integration, UI systems, and backend services." },
  { yr: "2023 — 2024", h: "Game Dev Intern (7 Month Internship)", p: "Assisted in prototyping, level design, and tool scripting in Unity. Learned production workflows and multi-platform publishing." },
  { yr: "2023", h: "Started making games", p: "Self-taught Unity and C# coding. Created first simple 2D/3D prototypes and participated in game jams." }
];

const SKILLS = [
  { h: "Unity Engine", pct: 95 }, { h: "C# / .NET", pct: 92 },
  { h: "Gameplay Systems", pct: 90 }, { h: "Shaders / VFX (HLSL)", pct: 78 },
  { h: "3D Math & Physics", pct: 85 }, { h: "Tools / Editor Scripting", pct: 82 },
  { h: "Multiplayer / Netcode", pct: 72 }, { h: "Blender / 3D Assets", pct: 68 },
];

const RESEARCH = [
  { ic: "🧠", h: "Procedural Content Generation", p: "Wave-function-collapse level generation and difficulty adaptation from player telemetry." },
  { ic: "⚙️", h: "DOTS / ECS Performance", p: "Data-oriented design for simulating tens of thousands of entities at stable frame-rates." },
  { ic: "✨", h: "Real-time VFX & Shaders", p: "Custom URP shader graphs, GPU particles and 'game feel' juice systems." },
  { ic: "🕹️", h: "Player Experience & Feel", p: "Input buffering, coyote-time, screen-shake and haptics — the invisible craft that makes controls feel great." },
];

/* -------------------- render sections -------------------- */
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }

// WebGL fullscreen launcher
const webglOverlay = document.getElementById("webgl-overlay");
const webglIframe = document.getElementById("webgl-iframe");
const webglClose = document.getElementById("webgl-close");

let isGamePlaying = false;

function launchWebGL(url) {
  isGamePlaying = true;
  webglIframe.src = url;
  webglOverlay.removeAttribute("hidden");
  
  // Hide projects panel when playing
  const projectsPanel = document.getElementById("projects");
  if (projectsPanel) {
    projectsPanel.classList.remove("panel-active");
  }
  
  SFX.select();
}

function closeWebGL() {
  isGamePlaying = false;
  webglIframe.src = "";
  webglOverlay.setAttribute("hidden", "");
  
  // Re-open projects panel
  const projectsPanel = document.getElementById("projects");
  if (projectsPanel) {
    projectsPanel.classList.add("panel-active");
  }
  
  SFX.click();
}

if (webglClose) {
  webglClose.addEventListener("click", closeWebGL);
}

const cardWrap = document.getElementById("projectCards");
PROJECTS.forEach((p, i) => {
  const isComingSoon = p.comingSoon;
  const btnText = isComingSoon ? "⏳ COMING SOON" : "▶ PLAY GAME";
  const btnClass = isComingSoon ? "play-btn btn-disabled" : "play-btn";
  const borderStyle = `border-top: 4px solid ${p.color};`;
  
  const c = el(`
    <article class="card" data-sound="select" data-i="${i}" style="${borderStyle}">
      <div class="card-top" style="color: ${p.color};">${p.emoji}</div>
      <div class="card-body">
        <span class="proj-num" style="color: ${p.color};">PROJECT_0${i+1} — ${p.tags[1]}</span>
        <h3>${p.title}</h3>
        <p class="tagline">${p.tagline}</p>
        <div class="tags">${p.tags.map(t => `<span class="tag" style="border-color: ${p.color}44; color: ${p.color};">${t}</span>`).join("")}</div>
        <button class="${btnClass}" style="border-color: ${p.color}; color: ${p.color};">${btnText}</button>
      </div>
    </article>`);

  const playBtn = c.querySelector(".play-btn");
  if (playBtn) {
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isComingSoon) return;
      SFX.click();
      if (p.webgl) {
        launchWebGL(p.playUrl);
      } else if (p.playUrl) {
        window.open(p.playUrl, "_blank");
      }
    });
  }

  c.addEventListener("click", () => openModal(i));
  cardWrap.appendChild(c);
});

const tl = document.getElementById("timeline");
CAREER.forEach(c => tl.appendChild(el(`
  <div class="tl-item"><div class="yr">${c.yr}</div><h3>${c.h}</h3><p>${c.p}</p></div>`)));

const sg = document.getElementById("skillsGrid");
SKILLS.forEach(s => sg.appendChild(el(`
  <div class="skill"><div class="row"><h4>${s.h}</h4><span class="pct">${s.pct}%</span></div>
  <div class="bar"><i style="width:${s.pct}%"></i></div></div>`)));

const rl = document.getElementById("researchList");
RESEARCH.forEach(r => rl.appendChild(el(`
  <div class="rp"><div class="ic">${r.ic}</div><div><h4>${r.h}</h4><p>${r.p}</p></div></div>`)));

/* -------------------- modal -------------------- */
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
function openModal(i) {
  const p = PROJECTS[i];
  const isComingSoon = p.comingSoon;
  const btnText = isComingSoon ? "⏳ COMING SOON" : "▶ PLAY GAME";
  const btnClass = isComingSoon ? "play-btn btn-disabled" : "play-btn";
  
  modalBody.innerHTML = `
    <div class="m-emoji" style="color: ${p.color}; text-shadow: 0 0 20px ${p.color}44;">${p.emoji}</div>
    <h3 style="color: ${p.color};">${p.title}</h3>
    <div class="m-tags tags" style="margin: 14px 0; justify-content: center;">${p.tags.map(t => `<span class="tag" style="border-color: ${p.color}44; color: ${p.color};">${t}</span>`).join("")}</div>
    <p style="margin-bottom: 24px; text-align: left;">${p.body}</p>
    <button class="${btnClass} modal-play-btn" style="border-color: ${p.color}; color: ${p.color}; max-width: 200px; margin: 0 auto; display: block;">${btnText}</button>`;
  
  const mPlayBtn = modalBody.querySelector(".modal-play-btn");
  if (mPlayBtn) {
    mPlayBtn.addEventListener("click", () => {
      if (isComingSoon) return;
      closeModal();
      if (p.webgl) {
        launchWebGL(p.playUrl);
      } else if (p.playUrl) {
        window.open(p.playUrl, "_blank");
      }
    });
  }

  modal.hidden = false;
  SFX.select();
}
function closeModal() { modal.hidden = true; SFX.click(); }
document.getElementById("modalX").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

/* -------------------- sound wiring -------------------- */
const rideHint = document.getElementById("rideHint");
function firstGesture() {
  SFX.unlock();
  rideHint?.classList.add("gone");
  ["pointerdown", "keydown", "wheel", "touchstart", "scroll"].forEach(ev =>
    window.removeEventListener(ev, firstGesture));
}
["pointerdown", "keydown", "wheel", "touchstart", "scroll"].forEach(ev =>
  window.addEventListener(ev, firstGesture, { passive: true }));

document.addEventListener("pointerover", (e) => {
  const t = e.target.closest("[data-sound='hover']");
  if (t && !t._hovered) { t._hovered = true; SFX.hover(); }
});
document.addEventListener("pointerout", (e) => {
  const t = e.target.closest("[data-sound='hover']");
  if (t) t._hovered = false;
});
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-sound]");
  if (!t) return;
  const kind = t.getAttribute("data-sound");
  if (kind === "click") SFX.click();
});

/* -------------------- boot 3D + name -------------------- */
initLiquidName(document.getElementById("liquidName"), "Rishi Vagadiya");
const world = initWorld(document.getElementById("scene"));

/* hide loader */
window.addEventListener("load", () => {
  setTimeout(() => document.getElementById("loader").classList.add("hide"), 500);
});
setTimeout(() => document.getElementById("loader").classList.add("hide"), 2500);

/* ================== VIRTUAL SCROLL ENGINE ================== */
// Track maps scroll to bike Z and active UI section
const track = [
  { s: 0,    e: 100,  startZ: 0,    endZ: -10,  ui: "hero" },
  { s: 100,  e: 400,  startZ: -10,  endZ: -30,  ui: null },      // Drive to Building 1
  { s: 400,  e: 800,  startZ: -30,  endZ: -30,  ui: "projects" }, // Stop
  { s: 800,  e: 1200, startZ: -30,  endZ: -70,  ui: null },      // Drive to Building 2
  { s: 1200, e: 1600, startZ: -70,  endZ: -70,  ui: "career" },   // Stop
  { s: 1600, e: 2000, startZ: -70,  endZ: -110, ui: null },      // Drive to Building 3
  { s: 2000, e: 2400, startZ: -110, endZ: -110, ui: "skills" },   // Stop
  { s: 2400, e: 2800, startZ: -110, endZ: -150, ui: null },      // Drive to Building 4
  { s: 2800, e: 3200, startZ: -150, endZ: -150, ui: "research" }, // Stop
  { s: 3200, e: 3600, startZ: -150, endZ: -190, ui: null },      // Drive to Building 5
  { s: 3600, e: 4000, startZ: -190, endZ: -190, ui: "contact" }   // Stop
];

let targetScroll = 0;
let smoothScroll = 0;
const MAX_SCROLL = 4000;

// Panel lock states
const stops = [
  { id: "projects", min: 400, max: 800, center: 600 },
  { id: "career", min: 1200, max: 1600, center: 1400 },
  { id: "skills", min: 2000, max: 2400, center: 2200 },
  { id: "research", min: 2800, max: 3200, center: 3000 },
  { id: "contact", min: 3600, max: 4000, center: 3800 }
];

let isPanelLocked = false;
let lastLockedSection = null;

// Handle Wheel
window.addEventListener("wheel", (e) => {
  if (isGamePlaying || isPanelLocked) return;
  targetScroll += e.deltaY * 0.5;
  targetScroll = Math.max(0, Math.min(targetScroll, MAX_SCROLL));
}, { passive: true });

// Handle Touch
let ty = 0;
window.addEventListener("touchstart", e => { ty = e.touches[0].clientY; }, { passive: true });
window.addEventListener("touchmove", e => {
  if (isGamePlaying || isPanelLocked) return;
  const dy = ty - e.touches[0].clientY;
  targetScroll += dy * 1.5;
  targetScroll = Math.max(0, Math.min(targetScroll, MAX_SCROLL));
  ty = e.touches[0].clientY;
}, { passive: true });

// Nav Links
document.querySelectorAll(".nav-links a, .cta[data-target]").forEach(btn => {
  btn.addEventListener("click", (e) => {
    if (isGamePlaying) return;
    const hrefVal = btn.getAttribute("href");
    if (hrefVal && hrefVal.endsWith(".pdf")) {
      return; // Open Resume PDF normally
    }
    const id = hrefVal?.substring(1) || btn.dataset.target;
    // Find the track segment for this UI
    const seg = track.find(t => t.ui === id);
    if (seg) {
      const stop = stops.find(s => s.id === id);
      const centerVal = stop ? stop.center : (seg.s + (seg.e - seg.s) / 2);
      
      isPanelLocked = true;
      lastLockedSection = id;
      targetScroll = centerVal;
      smoothScroll = centerVal; // Teleport instantly
      
      SFX.stopDrivingSound(); // Instantly mute driving sound
      
      // Open panel immediately
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("panel-active"));
      document.getElementById(id)?.classList.add("panel-active");
      activeSection = id;
      
      // Force update world Z position immediately
      let currentZ = mapRange(centerVal, seg.s, seg.e, seg.startZ, seg.endZ);
      world.setDistance(currentZ, 0);
      SFX.setSpeed(0);
    }
    e.preventDefault();
  });
});

// Mobile menu toggle
const navToggle = document.getElementById("nav-toggle");
const navElement = document.getElementById("nav");

navToggle?.addEventListener("click", () => {
  navElement?.classList.toggle("nav-open");
  SFX.click();
});

// Close mobile menu when clicking links
document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    navElement?.classList.remove("nav-open");
  });
});

// Close buttons logic
document.querySelectorAll(".panel-close-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    isPanelLocked = false;
    // Hide panel immediately by removing panel-active
    if (activeSection) {
      document.getElementById(activeSection)?.classList.remove("panel-active");
    }
    // Blur any active element (like the close button itself) to return focus to page body
    document.activeElement?.blur();
    window.focus();
    SFX.click();
  });
});

let activeSection = "hero";

function mapRange(val, in_min, in_max, out_min, out_max) {
  return (val - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function updateScroll() {
  requestAnimationFrame(updateScroll);
  
  if (isGamePlaying) {
    // Keep cyclist speed at 0 and stop scrolling/sound updates during gameplay
    world.setDistance(world.currentZ || -30, 0);
    SFX.setSpeed(0);
    return;
  }
  
  // Smoothly interpolate scroll
  smoothScroll += (targetScroll - smoothScroll) * 0.08;
  
  // Check if we just arrived at a stop range
  if (!isPanelLocked) {
    for (const stop of stops) {
      if (smoothScroll >= stop.min && smoothScroll <= stop.max && lastLockedSection !== stop.id) {
        isPanelLocked = true;
        lastLockedSection = stop.id;
        targetScroll = stop.center; // Glide perfectly to the center
        SFX.stopDrivingSound(); // Instantly stop the driving audio
        break;
      }
    }
  } else {
    // If unlocked, check if we have exited the last locked section range
    if (lastLockedSection) {
      const currentStop = stops.find(s => s.id === lastLockedSection);
      if (currentStop && (smoothScroll < currentStop.min || smoothScroll > currentStop.max)) {
        lastLockedSection = null; // Reset lock memory once we drive away
      }
    }
  }
  
  // Find current segment
  let currentZ = 0;
  let newSection = null;
  
  for (const seg of track) {
    if (smoothScroll >= seg.s && smoothScroll <= seg.e) {
      currentZ = mapRange(smoothScroll, seg.s, seg.e, seg.startZ, seg.endZ);
      newSection = seg.ui;
      break;
    }
  }

  // Update 3D World (world.js will handle pedaling based on Z changes)
  let speed = 0;
  if (isPanelLocked) {
    speed = 0;
    SFX.stopDrivingSound(); // Force audio stop when locked
  } else {
    speed = Math.abs(targetScroll - smoothScroll) * 0.1;
  }
  world.setDistance(currentZ, speed);
  SFX.setSpeed(Math.min(1, speed * 0.5));

  // Toggle UI sections
  if (newSection !== activeSection) {
    if (activeSection) {
      document.getElementById(activeSection)?.classList.remove("panel-active");
    }
    if (newSection) {
      document.getElementById(newSection)?.classList.add("panel-active");
    }
    activeSection = newSection;
  }

  // Update Ride Hint
  if (rideHint) {
    if (smoothScroll > 3600) {
      rideHint.innerHTML = "SCROLL REVERSE ↑";
      rideHint.classList.remove("gone");
    } else {
      if (smoothScroll > 100) {
        rideHint.classList.add("gone");
      } else {
        rideHint.innerHTML = "SCROLL TO RIDE ↓";
        rideHint.classList.remove("gone");
      }
    }
  }
}
updateScroll();

/* ================== CHATBOT CLIENT LOGIC ================== */
const chatToggle = document.getElementById("chat-toggle");
const chatClose = document.getElementById("chat-close");
const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatChips = document.querySelectorAll(".chat-chip");

// Set dynamic current time for initial AI message
function updateInitialTime() {
  const startTimeEl = document.getElementById("chat-start-time");
  if (startTimeEl) {
    const now = new Date();
    let hrs = now.getHours();
    const mins = String(now.getMinutes()).padStart(2, "0");
    const ampm = hrs >= 12 ? "PM" : "AM";
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12;
    startTimeEl.innerText = `${hrs}:${mins} ${ampm}`;
  }
}
updateInitialTime();

// Toggle chat window
chatToggle.addEventListener("click", () => {
  chatContainer.classList.toggle("chat-hidden");
  if (!chatContainer.classList.contains("chat-hidden")) {
    chatInput.focus();
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});

chatClose.addEventListener("click", () => {
  chatContainer.classList.add("chat-hidden");
  chatSettingsPanel?.classList.add("chat-hidden");
});

// Chat settings handlers
const chatSettingsBtn = document.getElementById("chat-settings-btn");
const chatSettingsPanel = document.getElementById("chat-settings-panel");
const chatApiKeyInput = document.getElementById("chat-api-key");
const chatSettingsSave = document.getElementById("chat-settings-save");
const chatSettingsClear = document.getElementById("chat-settings-clear");

let customApiKey = localStorage.getItem("groq_api_key") || "";
if (chatApiKeyInput) {
  chatApiKeyInput.value = customApiKey;
}

chatSettingsBtn?.addEventListener("click", () => {
  chatSettingsPanel?.classList.toggle("chat-hidden");
  SFX.click();
});

chatSettingsSave?.addEventListener("click", () => {
  const newKey = chatApiKeyInput.value.trim();
  if (newKey) {
    localStorage.setItem("groq_api_key", newKey);
    customApiKey = newKey;
  } else {
    localStorage.removeItem("groq_api_key");
    customApiKey = "";
  }
  chatSettingsPanel?.classList.add("chat-hidden");
  SFX.click();
});

chatSettingsClear?.addEventListener("click", () => {
  localStorage.removeItem("groq_api_key");
  customApiKey = "";
  if (chatApiKeyInput) chatApiKeyInput.value = "";
  chatSettingsPanel?.classList.add("chat-hidden");
  SFX.click();
});

// Chat history tracking
let chatHistory = [];

const DEFAULT_KEY = "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";
const SYSTEM_PROMPT = `You are an AI assistant exclusively for Rishi Vagadiya's portfolio website.

Your ONLY purpose is to answer questions about Rishi Vagadiya: his skills, projects, experience, education, contact details, availability, and professional background.

STRICT RULES:
1. ONLY answer questions related to Rishi Vagadiya and his portfolio.
2. If anyone asks about ANYTHING else, politely decline and redirect them back to asking about Rishi.
3. NEVER write code for users, NEVER answer general questions, NEVER discuss topics unrelated to Rishi.
4. Always stay in character as Rishi's personal portfolio assistant.
5. Keep answers concise, professional, and useful for recruiters, clients, or collaborators.
6. Do not invent facts. If the answer is not in the profile facts below, say you only know the portfolio information provided.

When someone asks something off-topic, respond:
"I'm here only to help you discuss Rishi Vagadiya and his work. Feel free to ask me about his projects, skills, or experience."

About Rishi Vagadiya:
- Position: Unity 3D Developer and Game Developer
- Current Job: Unity 3D Programmer at Virtual Filaments Pvt Ltd, Ahmedabad, Gujarat, India (managing gameplay systems, AI, VFX/shaders, optimization).
- Past Job: 3D Game Developer (Remote) at ExoMatrix.
- Key Skills: Unity Engine, C# / .NET, Gameplay Systems, Shaders/VFX (HLSL), 3D Math & Physics, Tools/Editor scripting, Multiplayer Netcode, Blender 3D.
- Education: BCA (Bachelor of Computer Applications) from Sssdiit, Junagadh (Graduated 2025).
- Personal Details:
  * Location: Ahmedabad, Gujarat, India
  * Email: Rishivagadiya613@gmail.com
  * Phone: +91 6352294215
  * LinkedIn: https://www.linkedin.com/in/rishivagadiya
  * GitHub: https://github.com/RishiVagadiya
- Featured Projects:
  1. Nebula Drift: Roguelike space-shooter with procedural sectors (Unity, URP, C#).
  2. Hollow Keep: 2.5D metroidvania with hand-tuned combat and state machines (Unity, C#).
  3. Chrono Karts: Local-multiplayer arcade racer with physics and splines.
  4. Last Signal: Co-op survival horror prototype with GOAP AI.
  5. Gridbound: Minimalist puzzle-automation utilizing ECS/DOTS.
  6. Emberfall VR: Room-scale VR climbing experience optimized for standalone XR.
- Research Interests: Procedural Content Generation (PCG), DOTS/ECS performance simulation, real-time HLSL shader scripting, and player experience game feel.`;

// Send Message
async function sendMessage(text) {
  if (!text || !text.trim()) return;
  text = text.trim();

  // Render User Message
  renderMessage("user", text);
  chatInput.value = "";

  // Append user message to history
  chatHistory.push({ role: "user", content: text });

  // Render AI Loading Message
  const loadingId = "msg-loading-" + Date.now();
  renderLoadingMessage(loadingId);

  try {
    const safeHistory = chatHistory
      .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content.slice(0, 1000) }));

    const apiKey = customApiKey || DEFAULT_KEY;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 600,
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...safeHistory
        ]
      })
    });

    const data = await response.json();
    
    // Remove loading message
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();

    if (response.ok && data.choices?.[0]?.message?.content) {
      const reply = data.choices[0].message.content;
      renderMessage("ai", reply);
      chatHistory.push({ role: "assistant", content: reply });
    } else {
      console.error("Groq API Error:", data);
      renderMessage("ai", "👾 Sorry, I'm having trouble connecting to my brain right now. Please try again later!");
    }
  } catch (error) {
    console.error("Chat Error:", error);
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();
    renderMessage("ai", "👾 Connection error. I couldn't reach the AI server directly.");
  }
}

// Render message in chat area
function renderMessage(sender, content) {
  const msgWrap = document.createElement("div");
  msgWrap.className = `chat-msg ${sender}`;

  const contentEl = document.createElement("div");
  contentEl.className = "msg-content";
  contentEl.innerText = content;
  msgWrap.appendChild(contentEl);

  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  const now = new Date();
  let hrs = now.getHours();
  const mins = String(now.getMinutes()).padStart(2, "0");
  const ampm = hrs >= 12 ? "PM" : "AM";
  hrs = hrs % 12;
  hrs = hrs ? hrs : 12;
  timeEl.innerText = `${hrs}:${mins} ${ampm}`;
  msgWrap.appendChild(timeEl);

  chatMessages.appendChild(msgWrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Render AI typing/loading bubble
function renderLoadingMessage(id) {
  const msgWrap = document.createElement("div");
  msgWrap.className = "chat-msg ai";
  msgWrap.id = id;

  const contentEl = document.createElement("div");
  contentEl.className = "msg-content";
  contentEl.innerHTML = `<span style="font-family:'Inter', sans-serif;opacity:0.6;">Thinking...</span>`;
  msgWrap.appendChild(contentEl);

  chatMessages.appendChild(msgWrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Wire send button & enter key
chatSend.addEventListener("click", () => sendMessage(chatInput.value));
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage(chatInput.value);
});

// Wire query chips
chatChips.forEach(chip => {
  chip.addEventListener("click", () => {
    const query = chip.getAttribute("data-query");
    sendMessage(query);
  });
});
