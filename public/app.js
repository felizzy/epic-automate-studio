// ==========================================================================
// Epic Automate - Studio Controller & Real-Time Firestore Sync
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  collection,
  query,
  where,
  getDocs,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase App Configuration (epic-studio-94147)
const firebaseConfig = {
  projectId: "epic-studio-94147",
  appId: "1:980221696860:web:92e546fd45d1fbbcbb3f99",
  storageBucket: "epic-studio-94147.firebasestorage.app",
  apiKey: "AIzaSyDvdwuSt-W6NDoB9VlJq66lYpMXqYblzAc",
  authDomain: "epic-studio-94147.firebaseapp.com",
  messagingSenderId: "980221696860",
  projectNumber: "980221696860"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Global State
let currentUser = null;
let currentJobId = null;
let unsubscribeJobSnapshot = null;
let isRegisterMode = false;

// DOM Elements: Navigation & Tabs
const tabButtons = document.querySelectorAll(".seg-btn");
const tabPanes = document.querySelectorAll(".tab-pane");
const logBadgeDot = document.getElementById("logBadgeDot");
const statusPillLabel = document.getElementById("statusPillLabel");
const userInitial = document.getElementById("userInitial");
const userAvatarBadge = document.getElementById("userAvatarBadge");

// DOM Elements: Studio Tab
const videoTitleInput = document.getElementById("videoTitle");
const videoScriptInput = document.getElementById("videoScript");
const sentenceCountEl = document.getElementById("sentenceCount");
const estDurationEl = document.getElementById("estDuration");
const btnLoadExample = document.getElementById("btnLoadExample");
const voiceSelect = document.getElementById("voiceSelect");
const voiceSpeed = document.getElementById("voiceSpeed");
const speedVal = document.getElementById("speedVal");
const toggleCaptions = document.getElementById("toggleCaptions");
const captionControls = document.getElementById("captionControls");
const captionPosition = document.getElementById("captionPosition");
const captionSize = document.getElementById("captionSize");
const captionStyle = document.getElementById("captionStyle");
const btnLaunch = document.getElementById("btnLaunch");
const btnCancel = document.getElementById("btnCancel");

// DOM Elements: AI Image Generation & Visual Styles
const toggleAiGenerator = document.getElementById("toggleAiGenerator");
const aiGeneratorOptions = document.getElementById("aiGeneratorOptions");
const visualModeBadge = document.getElementById("visualModeBadge");
const stockSourcesSection = document.getElementById("stockSourcesSection");
const imageStyleSelect = document.getElementById("imageStyleSelect");
const customStyleGroup = document.getElementById("customStyleGroup");
const customStyleInput = document.getElementById("customStyleInput");

// DOM Elements: Output & Media Player
const mediaOutputCard = document.getElementById("mediaOutputCard");
const finalVideoPlayer = document.getElementById("finalVideoPlayer");
const finalAssetUrl = document.getElementById("finalAssetUrl");
const btnCopyAssetUrl = document.getElementById("btnCopyAssetUrl");
const btnDownloadVideo = document.getElementById("btnDownloadVideo");

// DOM Elements: Live Monitor Tab
const jobIdLabel = document.getElementById("jobIdLabel");
const progressNumber = document.getElementById("progressNumber");
const progressFill = document.getElementById("progressFill");
const milestoneText = document.getElementById("milestoneText");
const terminalOutput = document.getElementById("terminalOutput");
const btnCopyLogs = document.getElementById("btnCopyLogs");
const btnClearLogs = document.getElementById("btnClearLogs");

// DOM Elements: Job History & Resume Engine
const activeJobResumeBanner = document.getElementById("activeJobResumeBanner");
const resumeBannerTitle = document.getElementById("resumeBannerTitle");
const resumeBannerDesc = document.getElementById("resumeBannerDesc");
const btnResumeActiveJob = document.getElementById("btnResumeActiveJob");
const activeJobControlsBar = document.getElementById("activeJobControlsBar");
const btnCancelActiveJob = document.getElementById("btnCancelActiveJob");
const btnDeleteActiveJob = document.getElementById("btnDeleteActiveJob");
const jobFilterPills = document.querySelectorAll(".filter-pill");
const jobsListContainer = document.getElementById("jobsListContainer");
const jobsEmptyState = document.getElementById("jobsEmptyState");
const countAll = document.getElementById("countAll");
const countRunning = document.getElementById("countRunning");
const countCompleted = document.getElementById("countCompleted");
const countFailed = document.getElementById("countFailed");
const btnRefreshJobs = document.getElementById("btnRefreshJobs");

// DOM Elements: Kie.ai Live Credit Balance
const kieCreditPill = document.getElementById("kieCreditPill");
const kieCreditValue = document.getElementById("kieCreditValue");
const btnRefreshCredit = document.getElementById("btnRefreshCredit");
const studioKieCreditBadge = document.getElementById("studioKieCreditBadge");
const studioKieCreditVal = document.getElementById("studioKieCreditVal");
const settingsKieCreditVal = document.getElementById("settingsKieCreditVal");

// Kie.ai Credit Balance Fetcher
async function fetchKieCredit(apiKey) {
  if (!apiKey) {
    updateKieCreditUI("--", 0);
    return;
  }
  try {
    const res = await fetch("https://api.kie.ai/api/v1/chat/credit", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    if (res.ok) {
      const result = await res.json();
      if (result && result.data !== undefined) {
        const credits = Number(result.data);
        const formatted = isNaN(credits) ? String(result.data) : credits.toFixed(2);
        updateKieCreditUI(formatted, credits);
      }
    } else {
      console.warn("Kie.ai balance check returned HTTP", res.status);
    }
  } catch (err) {
    console.warn("Kie.ai credit balance fetch notice:", err);
  }
}

function updateKieCreditUI(label, val) {
  if (kieCreditValue) kieCreditValue.textContent = `${label} Credits`;
  if (studioKieCreditVal) studioKieCreditVal.textContent = `${label} Credits`;
  if (settingsKieCreditVal) settingsKieCreditVal.textContent = `${label} Credits`;
}

// Global Jobs State
let allJobs = [];
let currentJobFilter = "all";
let unsubscribeJobsSnapshot = null;

// DOM Elements: Settings Tab
const userProfileEmail = document.getElementById("userProfileEmail");
const userProfileUid = document.getElementById("userProfileUid");
const userLargeAvatar = document.getElementById("userLargeAvatar");
const btnSignOut = document.getElementById("btnSignOut");
const settingsForm = document.getElementById("settingsForm");
const cfgGithubPat = document.getElementById("cfgGithubPat");
const cfgGithubRepo = document.getElementById("cfgGithubRepo");
const cfgKaggleUser = document.getElementById("cfgKaggleUser");
const cfgKaggleKey = document.getElementById("cfgKaggleKey");
const cfgNvidiaKey = document.getElementById("cfgNvidiaKey");
const cfgKieKey = document.getElementById("cfgKieKey");
const cfgHfToken = document.getElementById("cfgHfToken");
const cfgHfRepo = document.getElementById("cfgHfRepo");
const cfgPexelsKey = document.getElementById("cfgPexelsKey");
const cfgUnsplashKey = document.getElementById("cfgUnsplashKey");
const saveStatusToast = document.getElementById("saveStatusToast");

// DOM Elements: Auth Modal
const authModal = document.getElementById("authModal");
const btnGoogleSignIn = document.getElementById("btnGoogleSignIn");
const emailAuthForm = document.getElementById("emailAuthForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const btnEmailSignIn = document.getElementById("btnEmailSignIn");
const btnToggleAuthMode = document.getElementById("btnToggleAuthMode");
const authErrorMessage = document.getElementById("authErrorMessage");

// Stock source checkboxes
const srcPexels = document.getElementById("srcPexels");
const srcUnsplash = document.getElementById("srcUnsplash");
const srcPixabay = document.getElementById("srcPixabay");
const srcWikimedia = document.getElementById("srcWikimedia");
const srcDDG = document.getElementById("srcDDG");

// ==========================================================================
// 1. Tab Switching & UI Navigation
// ==========================================================================
function switchTab(targetTabId) {
  tabButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === targetTabId);
  });
  tabPanes.forEach(pane => {
    pane.classList.toggle("active", pane.id === `tab-${targetTabId}`);
  });
  if (targetTabId === "logs" && logBadgeDot) {
    logBadgeDot.style.display = "none";
  }
}

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

if (userAvatarBadge) {
  userAvatarBadge.addEventListener("click", () => switchTab("settings"));
}

// Script duration & sentence counter
function updateScriptStats() {
  const text = (videoScriptInput.value || "").trim();
  if (!text) {
    sentenceCountEl.textContent = "0";
    estDurationEl.textContent = "~0s";
    return;
  }
  // Split on full stops, exclamation points, and question marks
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || (text ? [text] : []);
  const count = sentences.filter(s => s.trim().length > 0).length;
  sentenceCountEl.textContent = count;
  // Average sentence ~3.5 seconds
  const estSeconds = Math.round(count * 3.5);
  estDurationEl.textContent = `~${estSeconds}s`;
}

videoScriptInput.addEventListener("input", updateScriptStats);

// Voice speed display
voiceSpeed.addEventListener("input", () => {
  speedVal.textContent = `${parseFloat(voiceSpeed.value).toFixed(2)}x`;
});

// Caption controls toggle
toggleCaptions.addEventListener("change", () => {
  captionControls.style.display = toggleCaptions.checked ? "grid" : "none";
});

// AI Generator Toggle & Style Presets
const STYLE_DESCRIPTIONS = {
  hyper_realistic: "Hyper realistic photograph, 8k resolution, cinematic lighting, ultra-detailed, photorealistic",
  claymation: "Claymation stop-motion style, handcrafted plasticine textures, miniature set, soft warm studio lighting, tactile clay aesthetic",
  "2d_painting": "2D digital concept art painting, expressive brushstrokes, dynamic color palette, atmospheric concept art illustration",
  "3d_pixar": "3D animated Disney Pixar style, vibrant expressive character lighting, smooth stylized textures, delightful cinematic 3D render",
  anime: "Anime aesthetic, Studio Ghibli inspired, lush painted background, delicate line art, nostalgic warm lighting",
  oil_painting: "Classical oil painting, rich canvas texture, masterwork chiaroscuro lighting, deep traditional oil colors, museum grade",
  cyberpunk: "Cyberpunk sci-fi aesthetic, neon glowing reflections, rainy night megacity, volumetric hologram fog, futuristic high-tech",
  custom: ""
};

if (toggleAiGenerator) {
  toggleAiGenerator.addEventListener("change", () => {
    const isAi = toggleAiGenerator.checked;
    if (aiGeneratorOptions) aiGeneratorOptions.style.display = isAi ? "block" : "none";
    if (stockSourcesSection) {
      stockSourcesSection.style.opacity = isAi ? "0.45" : "1";
      stockSourcesSection.style.pointerEvents = isAi ? "none" : "auto";
    }
    if (visualModeBadge) {
      visualModeBadge.textContent = isAi ? "AI Z-Image" : "Stock Photos";
      visualModeBadge.className = isAi ? "badge-mini badge-blue" : "badge-mini badge-purple";
    }
  });
}

if (imageStyleSelect) {
  imageStyleSelect.addEventListener("change", () => {
    const val = imageStyleSelect.value;
    if (customStyleInput) {
      if (val === "custom") {
        customStyleInput.value = "";
        customStyleInput.placeholder = "Type custom style (e.g. vintage 70s polaroid, watercolor, comic book)...";
        customStyleInput.focus();
      } else {
        customStyleInput.value = STYLE_DESCRIPTIONS[val] || val;
      }
    }
  });
}

// Load sample script
btnLoadExample.addEventListener("click", () => {
  videoTitleInput.value = "The Wonders of the Deep Cosmos";
  videoScriptInput.value = 
    "In the quiet darkness of the universe, billions of galaxies dance in silent harmony. " +
    "Massive stellar nurseries ignite with incandescent clouds of hydrogen and ancient stardust. " +
    "Across unimaginable distances, light journeys through empty space for millions of years before reaching our eyes. " +
    "Every element in our bodies was forged deep inside the nuclear furnaces of dying stars. " +
    "We are not merely observers of the cosmos; we are the universe experiencing itself.";
  updateScriptStats();
});

// ==========================================================================
// 2. Logging, Terminal Console & In-App UI Dialogs
// ==========================================================================
function appendLog(message, type = "info") {
  const line = document.createElement("div");
  line.className = `term-line ${type}`;
  
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  line.innerHTML = `<span class="term-time">[${timeStr}]</span> ${escapeHtml(message)}`;
  
  terminalOutput.appendChild(line);
  // Cap terminal lines at 150 to keep DOM lightning fast and avoid memory churn
  while (terminalOutput.children.length > 150) {
    terminalOutput.removeChild(terminalOutput.firstElementChild);
  }
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// In-app non-blocking confirmation dialog (never suppressed by browser popup blockers)
function showAppConfirm(title, message, confirmText = "Confirm", isDanger = false, icon = "⚠️") {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmModal");
    const titleEl = document.getElementById("confirmModalTitle");
    const msgEl = document.getElementById("confirmModalMessage");
    const okBtn = document.getElementById("btnConfirmOk");
    const cancelBtn = document.getElementById("btnConfirmCancel");
    const iconEl = document.getElementById("confirmModalIcon");

    if (!modal || !okBtn || !cancelBtn) {
      resolve(window.confirm(`${title}\n\n${message}`));
      return;
    }

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;
    okBtn.textContent = confirmText;
    okBtn.className = isDanger ? "ios-btn ios-btn-danger" : "ios-btn ios-btn-primary";

    modal.style.display = "flex";

    const cleanup = () => {
      modal.style.display = "none";
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
    };

    const onOk = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  });
}

// In-app floating toast banner
let toastTimeout = null;
function showAppToast(message, type = "info") {
  const toast = document.getElementById("appToast");
  const textEl = document.getElementById("appToastText");
  const iconEl = document.getElementById("appToastIcon");
  if (!toast || !textEl) {
    appendLog(message, type);
    return;
  }

  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  textEl.textContent = message;
  toast.className = `ios-floating-toast toast-${type}`;
  if (iconEl) {
    iconEl.textContent = type === "warn" ? "⚠️" : type === "error" ? "❌" : type === "success" ? "✓" : "⚡";
  }

  toast.style.display = "flex";
  toastTimeout = setTimeout(() => {
    toast.style.display = "none";
    toastTimeout = null;
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

btnClearLogs.addEventListener("click", () => {
  terminalOutput.innerHTML = '<div class="term-line sys"><span class="term-time">[SYSTEM]</span> Console cleared.</div>';
});

btnCopyLogs.addEventListener("click", () => {
  const text = terminalOutput.innerText;
  navigator.clipboard.writeText(text).then(() => {
    appendLog("Copied terminal logs to clipboard.", "sys");
  });
});

// ==========================================================================
// 3. User Authentication & Profile Synchronization
// ==========================================================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authModal.style.display = "none";
    statusPillLabel.textContent = "Online";
    
    // Update user headers
    const initial = (user.email || "U")[0].toUpperCase();
    userInitial.textContent = initial;
    userLargeAvatar.textContent = initial;
    userProfileEmail.textContent = user.email || "User";
    userProfileUid.textContent = `UID: ${user.uid}`;
    
    appendLog(`Authenticated as ${user.email} (UID: ${user.uid.slice(0, 8)}...)`, "success");
    
    // Load persistent user settings from Cloud Firestore
    await loadUserSettings(user.uid);
    
    // Listen in real-time to all executed jobs for this user
    listenToAllJobs(user.uid);
  } else {
    currentUser = null;
    if (unsubscribeJobsSnapshot) {
      unsubscribeJobsSnapshot();
      unsubscribeJobsSnapshot = null;
    }
    allJobs = [];
    renderJobsList();
    authModal.style.display = "flex";
    statusPillLabel.textContent = "Signed Out";
    userInitial.textContent = "?";
    if (cfgKieKey) cfgKieKey.value = "";
    if (cfgGithubPat) cfgGithubPat.value = "";
    if (cfgHfToken) cfgHfToken.value = "";
    if (cfgNvidiaKey) cfgNvidiaKey.value = "";
    if (cfgKaggleKey) cfgKaggleKey.value = "";
    if (cfgKaggleUser) cfgKaggleUser.value = "";
  }
});

// Google Sign-In
btnGoogleSignIn.addEventListener("click", async () => {
  try {
    authErrorMessage.style.display = "none";
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Google Auth error:", error);
    authErrorMessage.textContent = error.message;
    authErrorMessage.style.display = "block";
  }
});

// Email / Password Sign-In
emailAuthForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authErrorMessage.style.display = "none";
  const email = authEmail.value.trim();
  const password = authPassword.value;

  try {
    if (isRegisterMode) {
      await createUserWithEmailAndPassword(auth, email, password);
      appendLog(`Created new user account: ${email}`, "success");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    console.error("Auth error:", error);
    authErrorMessage.textContent = error.message;
    authErrorMessage.style.display = "block";
  }
});

btnToggleAuthMode.addEventListener("click", () => {
  isRegisterMode = !isRegisterMode;
  btnEmailSignIn.textContent = isRegisterMode ? "Create Account" : "Sign In";
  btnToggleAuthMode.textContent = isRegisterMode ? "Already have an account? Sign In" : "Need an account? Register";
});

btnSignOut.addEventListener("click", () => {
  signOut(auth);
});

// ==========================================================================
// 4. Persistent User Settings (Saved in /users/{userId} in Firestore)
// ==========================================================================
async function loadUserSettings(userId) {
  try {
    const userDocRef = doc(db, "users", userId);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data.github_pat && cfgGithubPat) cfgGithubPat.value = data.github_pat;

      if (data.settings && data.settings.github_repo && cfgGithubRepo) cfgGithubRepo.value = data.settings.github_repo;
      if (data.kaggle_username) cfgKaggleUser.value = data.kaggle_username;
      if (data.kaggle_key) cfgKaggleKey.value = data.kaggle_key;

      if (data.nvidia_api_key) cfgNvidiaKey.value = data.nvidia_api_key;

      if (data.kie_api_key && cfgKieKey) {
        cfgKieKey.value = data.kie_api_key;
        fetchKieCredit(data.kie_api_key);
      } else if (cfgKieKey) {
        cfgKieKey.value = "";
        updateKieCreditUI("--", 0);
      }

      if (data.hf_token) cfgHfToken.value = data.hf_token;

      if (data.hf_dataset_repo) cfgHfRepo.value = data.hf_dataset_repo;
      if (data.pexels_key) cfgPexelsKey.value = data.pexels_key;
      if (data.unsplash_key) cfgUnsplashKey.value = data.unsplash_key;
      appendLog("Persistent user settings loaded from Cloud Firestore.", "sys");
    } else {
      appendLog("User profile initialized. Enter credentials in Settings.", "info");
    }
  } catch (err) {
    console.warn("Could not load Firestore settings:", err);
  }
}

async function saveUserSettings(userId, showToast = true) {
  try {
    const settingsData = {
      github_pat: cfgGithubPat ? cfgGithubPat.value.trim() : "",
      kaggle_username: cfgKaggleUser ? cfgKaggleUser.value.trim() : "",
      kaggle_key: cfgKaggleKey ? cfgKaggleKey.value.trim() : "",
      nvidia_api_key: cfgNvidiaKey.value.trim(),
      kie_api_key: cfgKieKey ? cfgKieKey.value.trim() : "",
      hf_token: cfgHfToken.value.trim(),
      hf_dataset_repo: cfgHfRepo.value.trim(),
      settings: {
        github_repo: cfgGithubRepo ? cfgGithubRepo.value.trim() : "felizzy/epic-automate-studio"
      },
      updated_at: new Date().toISOString()
    };

    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, settingsData, { merge: true });

    if (cfgKieKey && cfgKieKey.value.trim()) {
      fetchKieCredit(cfgKieKey.value.trim());
    }

    if (showToast) {
      saveStatusToast.style.display = "inline";
      setTimeout(() => {
        saveStatusToast.style.display = "none";
      }, 3000);
      appendLog("User settings successfully saved to Cloud Firestore.", "success");
    }
  } catch (err) {
    console.error("Save settings error:", err);
    appendLog(`Failed to save settings: ${err.message}`, "error");
  }
}

settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  await saveUserSettings(currentUser.uid, true);
});

// Refresh Kie.ai Credit Balance Listeners
if (cfgKieKey) {
  cfgKieKey.addEventListener("change", () => {
    fetchKieCredit(cfgKieKey.value.trim());
  });
}

if (btnRefreshCredit) {
  btnRefreshCredit.addEventListener("click", () => {
    const key = cfgKieKey ? cfgKieKey.value.trim() : "";
    if (key) {
      appendLog("Checking live Kie.ai credit balance...", "sys");
      fetchKieCredit(key);
    } else {
      appendLog("Enter Kie.ai API Key in Settings to view credit balance.", "warn");
    }
  });
}

// ==========================================================================
// 5. Job Execution & Kaggle T4 Triggering
// ==========================================================================
btnLaunch.addEventListener("click", async () => {
  if (!currentUser) {
    authModal.style.display = "flex";
    return;
  }

  const title = (videoTitleInput.value || "Untitled Video").trim();
  const rawScript = (videoScriptInput.value || "").trim();

  if (!rawScript) {
    showAppToast("Please enter a video script before launching.", "warn");
    videoScriptInput.classList.add("input-error-glow");
    videoScriptInput.focus();
    setTimeout(() => {
      videoScriptInput.classList.remove("input-error-glow");
    }, 2000);
    return;
  }

  // Split script into clean individual sentences at punctuation marks
  const sentences = rawScript
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length === 0) {
    showAppToast("No valid sentences found. Ensure sentences end with a period, exclamation, or question mark.", "warn");
    videoScriptInput.classList.add("input-error-glow");
    videoScriptInput.focus();
    setTimeout(() => {
      videoScriptInput.classList.remove("input-error-glow");
    }, 2000);
    return;
  }

  const isAiGen = toggleAiGenerator ? toggleAiGenerator.checked : false;
  const chosenStyle = customStyleInput ? (customStyleInput.value.trim() || "Hyper realistic photograph, 8k resolution, cinematic lighting") : "Hyper realistic photograph, 8k resolution";
  const kieKey = cfgKieKey ? cfgKieKey.value.trim() : "";

  if (isAiGen && !kieKey) {
    showAppToast("Kie.ai API Key is required for AI Image Generation. Redirecting to Settings...", "warn");
    appendLog("⚠️ Kie.ai API Key missing in Settings. Please enter your key in Settings to generate AI images.", "warn");
    switchTab("settings");
    if (cfgKieKey) {
      cfgKieKey.classList.add("input-error-glow");
      cfgKieKey.focus();
      setTimeout(() => {
        cfgKieKey.classList.remove("input-error-glow");
      }, 2500);
    }
    return;
  }

  const selectedSources = [];
  if (srcPexels.checked) selectedSources.push("pexels");
  if (srcUnsplash.checked) selectedSources.push("unsplash");
  if (srcPixabay.checked) selectedSources.push("pixabay");
  if (srcWikimedia.checked) selectedSources.push("wikimedia");
  if (srcDDG.checked) selectedSources.push("duckduckgo");

  const jobId = `job_${Date.now()}`;
  currentJobId = jobId;
  localStorage.setItem("epic_active_job_id", jobId);

  // Prepare job payload
  const jobData = {
    jobId: jobId,
    userId: currentUser.uid,
    userEmail: currentUser.email,
    title: title,
    script: rawScript,
    sentences: sentences,
    sentence_count: sentences.length,
    voice: voiceSelect.value,
    speed: parseFloat(voiceSpeed.value),
    captions: {
      enabled: toggleCaptions.checked,
      position: captionPosition.value,
      size: captionSize.value,
      style: captionStyle.value
    },
    sources: selectedSources,
    use_ai_generator: isAiGen,
    image_style: chosenStyle,
    kie_api_key: kieKey,
    nvidia_api_key: cfgNvidiaKey.value.trim(),
    kaggle_user: cfgKaggleUser.value.trim(),
    hf_dataset_repo: cfgHfRepo.value.trim(),
    status: "running",
    progress: 5,
    current_milestone: isAiGen 
      ? `Job initialized with ${sentences.length} scenes. Generating AI prompts (${chosenStyle.slice(0, 30)}...)...`
      : `Job initialized with ${sentences.length} scenes. Searching stock photography...`,
    cancel_requested: false,
    asset_url: null,
    asset_type: "video",
    completed_scenes: [],
    logs: [`[INITIALIZED] Split script into ${sentences.length} unique scenes. Mode: ${isAiGen ? 'Kie.ai Z-Image' : 'Stock Photos'}.`],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  btnLaunch.disabled = true;
  btnCancel.disabled = false;
  mediaOutputCard.style.display = "none";
  finalVideoPlayer.src = "";

  appendLog(`🚀 Launching Job ${jobId}: "${title}" with ${sentences.length} scenes...`, "info");
  
  // 1. Write job to Firestore
  try {
    const jobDocRef = doc(db, "automations", jobId);
    await setDoc(jobDocRef, jobData);
    appendLog("Firestore state synchronized.", "sys");

    // Switch to Live Monitor tab so the user sees live telemetry immediately
    switchTab("logs");
    if (logBadgeDot) logBadgeDot.style.display = "block";

    // Start Real-Time Snapshot Listener
    listenToJob(jobId);

    // Trigger real GitHub Actions compute runner
    await dispatchToGithubActions(jobId, jobData);

  } catch (err) {
    console.error("Failed to write job to Firestore:", err);
    appendLog(`Job creation failed: ${err.message}`, "error");
    btnLaunch.disabled = false;
    btnCancel.disabled = true;
  }
});

// Cancel execution button in Studio tab
btnCancel.addEventListener("click", () => {
  if (currentJobId) {
    cancelJob(currentJobId);
  }
});

// ==========================================================================
// 6. Real-Time Snapshot Telemetry Listener & Active Job Banner
// ==========================================================================
let seenLogsForJob = new Set();
let lastSeenMilestone = "";

function listenToJob(jobId) {
  if (unsubscribeJobSnapshot) {
    unsubscribeJobSnapshot();
  }

  if (currentJobId !== jobId) {
    seenLogsForJob.clear();
    lastSeenMilestone = "";
  }

  currentJobId = jobId;
  localStorage.setItem("epic_active_job_id", jobId);
  jobIdLabel.textContent = `Active Job ID: ${jobId}`;

  const jobDocRef = doc(db, "automations", jobId);
  unsubscribeJobSnapshot = onSnapshot(jobDocRef, (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();
    const progress = data.progress || 0;
    const milestone = data.current_milestone || "Processing...";
    const status = (data.status || "running").toLowerCase();

    // Update Progress UI
    progressNumber.textContent = `${progress}%`;
    progressFill.style.width = `${progress}%`;
    milestoneText.textContent = milestone;

    if (data.logs && Array.isArray(data.logs)) {
      data.logs.forEach(logLine => {
        if (!seenLogsForJob.has(logLine)) {
          seenLogsForJob.add(logLine);
          appendLog(logLine, status === "failed" ? "error" : "info");
        }
      });
    } else if (milestone && milestone !== lastSeenMilestone) {
      lastSeenMilestone = milestone;
      appendLog(`[${status.toUpperCase()}] ${milestone}`);
    }

    // Update Resume Banner for Active Job
    updateActiveJobResumeBanner(data);

    // Terminal completion / failure states
    if (status === "completed") {
      if (githubWatcherInterval) {
        clearInterval(githubWatcherInterval);
        githubWatcherInterval = null;
      }
      btnLaunch.disabled = false;
      btnCancel.disabled = true;
      progressFill.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
      appendLog("🎉 Automation completed successfully!", "success");

      if (data.asset_url) {
        mediaOutputCard.style.display = "block";
        finalAssetUrl.value = data.asset_url;
        finalVideoPlayer.src = data.asset_url;
        finalVideoPlayer.load();
        btnDownloadVideo.href = data.asset_url;
      }
    } else if (status === "cancelled") {
      if (githubWatcherInterval) {
        clearInterval(githubWatcherInterval);
        githubWatcherInterval = null;
      }
      btnLaunch.disabled = false;
      btnCancel.disabled = true;
      progressFill.style.background = "#ef4444";
      appendLog("⏹ Job execution stopped by user.", "warn");
    } else if (status === "failed") {
      if (githubWatcherInterval) {
        clearInterval(githubWatcherInterval);
        githubWatcherInterval = null;
      }
      btnLaunch.disabled = false;
      btnCancel.disabled = true;
      progressFill.style.background = "#f59e0b";
      appendLog(`⚠️ Job failed: ${milestone}`, "error");
    }
  });
}

// Update the Active Job Resume Alert Banner and Controls
function updateActiveJobResumeBanner(jobData) {
  const data = jobData || (currentJobId ? allJobs.find(j => (j.jobId || j.job_id || j.id) === currentJobId) : null);

  // Manage Active Job Controls Bar (Cancel & Delete)
  if (activeJobControlsBar) {
    if (currentJobId && data) {
      activeJobControlsBar.style.display = "flex";
      const s = (data.status || "").toLowerCase();
      if (btnCancelActiveJob) {
        btnCancelActiveJob.style.display = (s === "running" || s === "queued") ? "inline-flex" : "none";
      }
      if (btnDeleteActiveJob) {
        btnDeleteActiveJob.style.display = "inline-flex";
      }
    } else {
      activeJobControlsBar.style.display = "none";
    }
  }

  if (!activeJobResumeBanner) return;

  if (!data) {
    activeJobResumeBanner.style.display = "none";
    return;
  }

  const status = (data.status || "").toLowerCase();
  const cachedCount = (data.completed_scenes && Array.isArray(data.completed_scenes)) ? data.completed_scenes.length : 0;
  const totalCount = data.sentence_count || (data.sentences && data.sentences.length) || 0;

  // Show if job is failed, cancelled, or halted partially
  if (status === "failed" || status === "cancelled" || (status !== "completed" && cachedCount > 0)) {
    activeJobResumeBanner.style.display = "flex";
    if (cachedCount > 0) {
      resumeBannerTitle.textContent = `Job Stopped: ${cachedCount}/${totalCount} Scenes Cached in Cloud`;
      resumeBannerDesc.textContent = `Resuming now will reuse all ${cachedCount} already generated images. Zero Kie.ai credits will be wasted!`;
    } else {
      resumeBannerTitle.textContent = `Job Halted: Execution ${status.toUpperCase()}`;
      resumeBannerDesc.textContent = `You can restart the workflow runner to re-attempt scene generation.`;
    }
  } else {
    activeJobResumeBanner.style.display = "none";
  }
}

// ==========================================================================
// 6.5 All Executed Jobs Directory & Credit-Preserving Resume Engine
// ==========================================================================
function listenToAllJobs(userId) {
  if (unsubscribeJobsSnapshot) {
    unsubscribeJobsSnapshot();
    unsubscribeJobsSnapshot = null;
  }

  if (!userId) return;

  const q = query(
    collection(db, "automations"),
    where("userId", "==", userId)
  );

  unsubscribeJobsSnapshot = onSnapshot(q, (snapshot) => {
    const freshJobs = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      freshJobs.push({
        ...data,
        id: docSnap.id,
        jobId: data.jobId || data.job_id || docSnap.id
      });
    });

    // Sort descending by created_at or updated_at
    freshJobs.sort((a, b) => {
      const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
      const timeB = new Date(b.created_at || b.updated_at || 0).getTime();
      return timeB - timeA;
    });

    allJobs = freshJobs;

    updateJobFilterCounts();
    renderJobsList();
    updateActiveJobResumeBanner();

    // Auto-attach active job on initial load, page refresh, or device restart
    if (!currentJobId && allJobs.length > 0) {
      const savedJobId = localStorage.getItem("epic_active_job_id");
      const matchedSaved = savedJobId ? allJobs.find(j => (j.jobId || j.id) === savedJobId) : null;
      if (matchedSaved) {
        selectJob(savedJobId);
      } else {
        const runningJob = allJobs.find(j => {
          const s = (j.status || "").toLowerCase();
          return s === "running" || s === "queued";
        });
        if (runningJob) {
          selectJob(runningJob.jobId || runningJob.id);
        } else {
          selectJob(allJobs[0].jobId || allJobs[0].id);
        }
      }
    }
  }, (err) => {
    console.warn("Real-time all jobs listener notice:", err);
  });
}

function updateJobFilterCounts() {
  const counts = {
    all: allJobs.length,
    running: 0,
    completed: 0,
    failed: 0
  };

  allJobs.forEach(job => {
    const s = (job.status || "running").toLowerCase();
    if (s === "running" || s === "queued") counts.running++;
    else if (s === "completed") counts.completed++;
    else if (s === "failed" || s === "cancelled") counts.failed++;
  });

  if (countAll) countAll.textContent = counts.all;
  if (countRunning) countRunning.textContent = counts.running;
  if (countCompleted) countCompleted.textContent = counts.completed;
  if (countFailed) countFailed.textContent = counts.failed;
}

function renderJobCardInnerHtml(job, jId, status, progress, cachedCount, sceneCount, timeStr, modeTag, canResume) {
  return `
    <div class="job-item-header">
      <div class="job-title-group">
        <div class="job-item-title">${escapeHtml(job.title || "Untitled Video Automation")}</div>
        <div class="job-item-id-time">
          <span>#${escapeHtml(jId.slice(-8))}</span>
          <span>•</span>
          <span>${escapeHtml(timeStr)}</span>
        </div>
      </div>
      <span class="job-status-pill status-${status}">
        ${status === 'running' ? '<span class="pulse-dot"></span>' : ''}
        ${status}
      </span>
    </div>

    <div class="job-meta-row">
      <span class="job-tag">${modeTag}</span>
      <span class="job-tag">${sceneCount} scenes</span>
      ${cachedCount > 0 ? `<span class="job-tag job-tag-credit">💾 ${cachedCount}/${sceneCount} scenes cached (credits safe)</span>` : ''}
      ${job.voice ? `<span class="job-tag">🗣 ${escapeHtml(job.voice)}</span>` : ''}
    </div>

    <div class="job-progress-row">
      <div class="job-progress-header">
        <span class="job-milestone-snippet">${escapeHtml(job.current_milestone || "Processing...")}</span>
        <span class="job-pct-val">${progress}%</span>
      </div>
      <div class="job-progress-bar">
        <div class="job-progress-fill" style="width: ${progress}%; ${status === 'completed' ? 'background: #10b981;' : status === 'failed' ? 'background: #ef4444;' : ''}"></div>
      </div>
    </div>

    <div class="job-actions-row">
      <button type="button" class="btn-job-action btn-job-view" data-job-id="${escapeHtml(jId)}">
        📊 View Telemetry
      </button>
      ${canResume ? `
        <button type="button" class="btn-job-action btn-job-resume" data-job-id="${escapeHtml(jId)}">
          ⚡ Resume (${cachedCount > 0 ? 'Reuse ' + cachedCount + ' Images' : 'Retry'})
        </button>
      ` : ''}
      ${(status === 'running' || status === 'queued') ? `
        <button type="button" class="btn-job-action btn-job-cancel" data-job-id="${escapeHtml(jId)}">
          ⏹ Cancel
        </button>
      ` : ''}
      ${job.asset_url && status === 'completed' ? `
        <button type="button" class="btn-job-action btn-job-watch" data-asset-url="${escapeHtml(job.asset_url)}">
          🎬 Watch Video
        </button>
      ` : ''}
      ${job.script ? `
        <button type="button" class="btn-job-action btn-job-edit" data-job-id="${escapeHtml(jId)}">
          📋 Load in Studio
        </button>
      ` : ''}
      <button type="button" class="btn-job-action btn-job-delete" data-job-id="${escapeHtml(jId)}" title="Delete permanently">
        🗑 Delete
      </button>
    </div>
  `;
}

function renderJobsList() {
  if (!jobsListContainer) return;

  // Filter jobs
  const filtered = allJobs.filter(job => {
    const s = (job.status || "running").toLowerCase();
    if (currentJobFilter === "running") return s === "running" || s === "queued";
    if (currentJobFilter === "completed") return s === "completed";
    if (currentJobFilter === "failed") return s === "failed" || s === "cancelled";
    return true; // "all"
  });

  if (filtered.length === 0) {
    jobsListContainer.innerHTML = `
      <div class="jobs-empty-state">
        <span class="empty-icon">📂</span>
        <p>${currentJobFilter === 'all' 
          ? 'No executed jobs found yet. Launch a video pipeline in the Studio tab!' 
          : `No ${currentJobFilter} jobs found.`}</p>
      </div>
    `;
    return;
  }

  // Remove empty state placeholder if present
  const emptyState = jobsListContainer.querySelector(".jobs-empty-state");
  if (emptyState) emptyState.remove();

  // Index existing cards by jobId to preserve DOM nodes and prevent swallowing user clicks!
  const existingCards = new Map();
  jobsListContainer.querySelectorAll(".job-item-card").forEach(el => {
    if (el.dataset.jobId) existingCards.set(el.dataset.jobId, el);
  });

  const targetIds = new Set(filtered.map(j => j.jobId || j.id));

  // Remove cards that are no longer in filtered list
  existingCards.forEach((el, id) => {
    if (!targetIds.has(id)) {
      el.remove();
      existingCards.delete(id);
    }
  });

  filtered.forEach(job => {
    const jId = job.jobId || job.id;
    const status = (job.status || "running").toLowerCase();
    const isActive = currentJobId === jId;
    const progress = Math.min(100, Math.max(0, job.progress || 0));
    const cachedCount = (job.completed_scenes && Array.isArray(job.completed_scenes)) ? job.completed_scenes.length : 0;
    const sceneCount = job.sentence_count || (job.sentences && job.sentences.length) || 0;

    let timeStr = "";
    if (job.created_at) {
      try {
        const d = new Date(job.created_at);
        timeStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + " at " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (_) {
        timeStr = job.created_at;
      }
    } else {
      timeStr = "Recent";
    }

    let modeTag = "📸 Stock Photos";
    if (job.use_ai_generator) {
      const styleName = job.image_style ? job.image_style.slice(0, 20) : "Hyper Realistic";
      modeTag = `🎨 Kie.ai Z-Image (${styleName})`;
    }

    const canResume = status === "failed" || status === "cancelled" || (status === "running" && progress < 100);

    const existing = existingCards.get(jId);
    if (existing) {
      // In-place updates: Keeps button DOM nodes alive without swallowing click events!
      existing.classList.toggle("is-active-job", isActive);

      const pill = existing.querySelector(".job-status-pill");
      if (pill && pill.dataset.lastStatus !== status) {
        pill.dataset.lastStatus = status;
        pill.className = `job-status-pill status-${status}`;
        pill.innerHTML = `${status === 'running' ? '<span class="pulse-dot"></span>' : ''}${status}`;
      }

      const milestoneEl = existing.querySelector(".job-milestone-snippet");
      if (milestoneEl && milestoneEl.textContent !== (job.current_milestone || "Processing...")) {
        milestoneEl.textContent = job.current_milestone || "Processing...";
      }

      const pctEl = existing.querySelector(".job-pct-val");
      if (pctEl && pctEl.textContent !== `${progress}%`) {
        pctEl.textContent = `${progress}%`;
      }

      const fillEl = existing.querySelector(".job-progress-fill");
      if (fillEl) {
        fillEl.style.width = `${progress}%`;
        fillEl.style.background = status === 'completed' ? '#10b981' : status === 'failed' ? '#ef4444' : '';
      }

      // Only rebuild buttons if status or resume capability changed
      if (existing.dataset.status !== status || existing.dataset.canResume !== String(canResume)) {
        existing.dataset.status = status;
        existing.dataset.canResume = String(canResume);
        const actionsRow = existing.querySelector(".job-actions-row");
        if (actionsRow) {
          actionsRow.innerHTML = `
            <button type="button" class="btn-job-action btn-job-view" data-job-id="${escapeHtml(jId)}">
              📊 View Telemetry
            </button>
            ${canResume ? `
              <button type="button" class="btn-job-action btn-job-resume" data-job-id="${escapeHtml(jId)}">
                ⚡ Resume (${cachedCount > 0 ? 'Reuse ' + cachedCount + ' Images' : 'Retry'})
              </button>
            ` : ''}
            ${(status === 'running' || status === 'queued') ? `
              <button type="button" class="btn-job-action btn-job-cancel" data-job-id="${escapeHtml(jId)}">
                ⏹ Cancel
              </button>
            ` : ''}
            ${job.asset_url && status === 'completed' ? `
              <button type="button" class="btn-job-action btn-job-watch" data-asset-url="${escapeHtml(job.asset_url)}">
                🎬 Watch Video
              </button>
            ` : ''}
            ${job.script ? `
              <button type="button" class="btn-job-action btn-job-edit" data-job-id="${escapeHtml(jId)}">
                📋 Load in Studio
              </button>
            ` : ''}
            <button type="button" class="btn-job-action btn-job-delete" data-job-id="${escapeHtml(jId)}" title="Delete permanently">
              🗑 Delete
            </button>
          `;
        }
      }
    } else {
      // Card creation
      const card = document.createElement("div");
      card.className = `job-item-card ${isActive ? 'is-active-job' : ''}`;
      card.dataset.jobId = jId;
      card.dataset.status = status;
      card.dataset.canResume = String(canResume);
      card.innerHTML = renderJobCardInnerHtml(job, jId, status, progress, cachedCount, sceneCount, timeStr, modeTag, canResume);
      jobsListContainer.appendChild(card);
    }
  });
}

// Select a job to view in telemetry & logs
function selectJob(jobId) {
  currentJobId = jobId;
  localStorage.setItem("epic_active_job_id", jobId);

  seenLogsForJob.clear();
  lastSeenMilestone = "";

  const selectedJob = allJobs.find(j => (j.jobId || j.id) === jobId);
  if (selectedJob) {
    terminalOutput.innerHTML = `<div class="term-line sys"><span class="term-time">[SYSTEM]</span> Switched live telemetry focus to Job #${jobId.slice(-8)}.</div>`;
    if (selectedJob.logs && Array.isArray(selectedJob.logs)) {
      selectedJob.logs.forEach(l => {
        seenLogsForJob.add(l);
        appendLog(l, selectedJob.status === "failed" ? "error" : "info");
      });
    }
  }

  listenToJob(jobId);
  renderJobsList();
  updateActiveJobResumeBanner(selectedJob);

  // Scroll to telemetry card smoothly
  const telemetryCard = document.querySelector(".ios-card");
  if (telemetryCard) {
    telemetryCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Cancel an active or queued job
async function cancelJob(jobId) {
  if (!jobId) return;
  const confirmCancel = await showAppConfirm(
    "Cancel Automation",
    `Are you sure you want to abort Job #${jobId.slice(-8)}? The runner will be halted immediately.`,
    "Yes, Cancel Run",
    true,
    "⏹"
  );
  if (!confirmCancel) return;

  if (jobId === currentJobId && githubWatcherInterval) {
    clearInterval(githubWatcherInterval);
    githubWatcherInterval = null;
  }

  try {
    if (btnCancel && jobId === currentJobId) btnCancel.disabled = true;
    showAppToast(`Aborting Job #${jobId.slice(-8)}...`, "warn");
    appendLog(`⏹ Requesting cancellation for Job #${jobId.slice(-8)}...`, "warn");
    const jobDocRef = doc(db, "automations", jobId);
    await updateDoc(jobDocRef, {
      cancel_requested: true,
      status: "cancelled",
      current_milestone: "Cancellation requested by user. Runner terminating...",
      updated_at: new Date().toISOString()
    });

    // Also attempt API cancellation of active GitHub Actions run if known
    if (activeRunId && cfgGithubPat && cfgGithubRepo && cfgGithubPat.value.trim()) {
      try {
        await fetch(`https://api.github.com/repos/${cfgGithubRepo.value.trim()}/actions/runs/${activeRunId}/cancel`, {
          method: "POST",
          headers: {
            "Authorization": "token " + cfgGithubPat.value.trim(),
            "Accept": "application/vnd.github.v3+json"
          }
        });
        appendLog(`[GITHUB RUNNER] Cancel signal sent to Run #${activeRunId}`, "sys");
      } catch (cErr) {
        console.warn("GitHub Actions cancel call notice:", cErr);
      }
    }
    showAppToast(`Job #${jobId.slice(-8)} cancelled successfully.`, "warn");
    appendLog(`Job #${jobId.slice(-8)} cancelled.`, "warn");
  } catch (err) {
    console.error("Cancel failed:", err);
    showAppToast(`Cancel failed: ${err.message}`, "error");
    appendLog(`Cancel failed: ${err.message}`, "error");
  }
}

// Permanently delete a job record from Firestore
async function deleteJob(jobId) {
  if (!jobId) return;
  const confirmDel = await showAppConfirm(
    "Delete Job Record",
    `Are you sure you want to permanently delete Job #${jobId.slice(-8)}? This will remove all its telemetry records.`,
    "Yes, Delete Record",
    true,
    "🗑"
  );
  if (!confirmDel) return;

  try {
    showAppToast(`Deleting Job #${jobId.slice(-8)}...`, "info");
    appendLog(`🗑 Deleting Job #${jobId.slice(-8)} from Firestore...`, "sys");
    const jobDocRef = doc(db, "automations", jobId);
    await deleteDoc(jobDocRef);
    showAppToast(`Job #${jobId.slice(-8)} deleted.`, "success");
    appendLog(`Job #${jobId.slice(-8)} permanently deleted.`, "success");

    if (currentJobId === jobId) {
      if (unsubscribeJobSnapshot) {
        unsubscribeJobSnapshot();
        unsubscribeJobSnapshot = null;
      }
      currentJobId = null;
      localStorage.removeItem("epic_active_job_id");
      jobIdLabel.textContent = "Select or launch a job";
      progressNumber.textContent = "0%";
      progressFill.style.width = "0%";
      milestoneText.textContent = "System idle. Ready to process script.";
      if (activeJobResumeBanner) activeJobResumeBanner.style.display = "none";
      if (activeJobControlsBar) activeJobControlsBar.style.display = "none";
      btnLaunch.disabled = false;
      btnCancel.disabled = true;
    }
  } catch (err) {
    console.error("Delete failed:", err);
    showAppToast(`Delete failed: ${err.message}`, "error");
    appendLog(`Delete failed: ${err.message}`, "error");
  }
}

// Resume a failed, cancelled, or partial job without re-spending Kie.ai credits
async function resumeJob(job) {
  if (!job) return;
  const jobId = job.jobId || job.id;
  const cachedCount = (job.completed_scenes && Array.isArray(job.completed_scenes)) ? job.completed_scenes.length : 0;
  const totalCount = job.sentence_count || (job.sentences && job.sentences.length) || 0;

  appendLog(`[RESUME ENGINE] Initializing resume for Job #${jobId.slice(-8)}: "${job.title || 'Untitled'}"...`, "info");
  if (cachedCount > 0) {
    appendLog(`[CREDIT PROTECTION] Found ${cachedCount}/${totalCount} scenes already cached! Reusing existing images with zero credit loss.`, "success");
  }

  const jobDocRef = doc(db, "automations", jobId);
  try {
    await updateDoc(jobDocRef, {
      status: "running",
      cancel_requested: false,
      current_milestone: `Resuming execution. Reusing ${cachedCount} cached scene images (credits preserved)...`,
      updated_at: new Date().toISOString()
    });

    selectJob(jobId);
    appendLog("Firestore state updated to RUNNING. Dispatching GitHub Actions compute runner...", "sys");

    // Trigger GitHub Actions worker
    await dispatchToGithubActions(jobId, job);
  } catch (err) {
    console.error("Resume failed:", err);
    appendLog(`Resume failed: ${err.message}`, "error");
  }
}

// Button to resume the currently active job
btnResumeActiveJob.addEventListener("click", () => {
  if (!currentJobId) return;
  const activeJob = allJobs.find(j => (j.jobId || j.id) === currentJobId);
  if (activeJob) {
    resumeJob(activeJob);
  }
});

// Active Job Controls Bar: Cancel & Delete
if (btnCancelActiveJob) {
  btnCancelActiveJob.addEventListener("click", () => {
    if (currentJobId) cancelJob(currentJobId);
  });
}

if (btnDeleteActiveJob) {
  btnDeleteActiveJob.addEventListener("click", () => {
    if (currentJobId) deleteJob(currentJobId);
  });
}

// Filter pill events via event delegation
const jobFilterPillsContainer = document.getElementById("jobFilterPills");
if (jobFilterPillsContainer) {
  jobFilterPillsContainer.addEventListener("click", (e) => {
    const pill = e.target.closest(".filter-pill");
    if (!pill) return;
    jobFilterPillsContainer.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    currentJobFilter = pill.dataset.filter || "all";
    renderJobsList();
  });
}

// Refresh button event
if (btnRefreshJobs) {
  btnRefreshJobs.addEventListener("click", () => {
    if (currentUser) {
      appendLog("Refreshing job executions list...", "sys");
      listenToAllJobs(currentUser.uid);
    }
  });
}

// Event delegation for job card buttons
if (jobsListContainer) {
  jobsListContainer.addEventListener("click", (e) => {
    const viewBtn = e.target.closest(".btn-job-view");
    if (viewBtn) {
      const jobId = viewBtn.dataset.jobId;
      if (jobId) selectJob(jobId);
      return;
    }

    const resumeBtn = e.target.closest(".btn-job-resume");
    if (resumeBtn) {
      const jobId = resumeBtn.dataset.jobId;
      const job = allJobs.find(j => (j.jobId || j.id) === jobId);
      if (job) resumeJob(job);
      return;
    }

    const watchBtn = e.target.closest(".btn-job-watch");
    if (watchBtn) {
      const assetUrl = watchBtn.dataset.assetUrl;
      if (assetUrl) {
        mediaOutputCard.style.display = "block";
        finalAssetUrl.value = assetUrl;
        finalVideoPlayer.src = assetUrl;
        finalVideoPlayer.load();
        btnDownloadVideo.href = assetUrl;
        switchTab("studio");
        mediaOutputCard.scrollIntoView({ behavior: "smooth" });
        showAppToast("Video loaded in Studio tab.", "info");
      }
      return;
    }

    const editBtn = e.target.closest(".btn-job-edit");
    if (editBtn) {
      const jobId = editBtn.dataset.jobId;
      const job = allJobs.find(j => (j.jobId || j.id) === jobId);
      if (job) {
        if (job.title) videoTitleInput.value = job.title;
        if (job.script) videoScriptInput.value = job.script;
        if (job.voice) voiceSelect.value = job.voice;
        if (job.speed) {
          voiceSpeed.value = job.speed;
          speedVal.textContent = job.speed + "x";
        }
        if (job.use_ai_generator !== undefined) {
          toggleAiGenerator.checked = job.use_ai_generator;
          toggleAiGenerator.dispatchEvent(new Event("change"));
        }
        if (job.image_style && customStyleInput) {
          customStyleInput.value = job.image_style;
        }
        updateScriptStats();
        switchTab("studio");
        appendLog(`Loaded settings from Job #${jobId.slice(-8)} into Studio.`, "info");
      }
      return;
    }

    const cancelBtn = e.target.closest(".btn-job-cancel");
    if (cancelBtn) {
      const jobId = cancelBtn.dataset.jobId;
      if (jobId) cancelJob(jobId);
      return;
    }

    const deleteBtn = e.target.closest(".btn-job-delete");
    if (deleteBtn) {
      const jobId = deleteBtn.dataset.jobId;
      if (jobId) deleteJob(jobId);
      return;
    }
  });
}

// Copy Asset URL helper
btnCopyAssetUrl.addEventListener("click", () => {
  if (!finalAssetUrl.value) return;
  navigator.clipboard.writeText(finalAssetUrl.value).then(() => {
    btnCopyAssetUrl.textContent = "✓ Copied!";
    showAppToast("Video link copied to clipboard!", "success");
    setTimeout(() => {
      btnCopyAssetUrl.textContent = "📋 Copy Link";
    }, 2000);
  });
});

if (finalVideoPlayer) {
  finalVideoPlayer.addEventListener("error", () => {
    appendLog("Video player notice: If direct video playback is restricted by source host, click 'Copy Link' or 'Download' to view the media file directly.", "info");
  });
}

// Initial stats update
updateScriptStats();

// ==========================================================================
// 7. GitHub Actions Dispatch & Real-Time Runner Watchdog
// ==========================================================================
let githubWatcherInterval = null;
let activeRunId = null;

async function dispatchToGithubActions(jobId, jobData) {
  const githubPat = (cfgGithubPat ? cfgGithubPat.value.trim() : "");
  const githubRepo = (cfgGithubRepo ? cfgGithubRepo.value.trim() : "") || "felizzy/epic-automate-studio";
  const hfToken = (cfgHfToken ? cfgHfToken.value.trim() : "");
  const hfRepo = (cfgHfRepo ? cfgHfRepo.value.trim() : "") || "felizzy/epic-automation-assets";
  const nvidiaKey = (cfgNvidiaKey ? cfgNvidiaKey.value.trim() : "");
  const jobDocRef = doc(db, "automations", jobId);

  if (!githubPat) {
    appendLog("⚠️ GitHub PAT missing in Settings. Please enter your personal access token with repo access.", "warn");
    return;
  }

  appendLog(`🚀 Triggering GitHub Actions video runner on ${githubRepo}...`, "info");

  try {
    const dispatchUrl = `https://api.github.com/repos/${githubRepo}/actions/workflows/video_worker.yml/dispatches`;
    const dispatchPayload = {
      ref: "main",
      inputs: {
        job_id: jobId,
        firebase_project_id: "epic-studio-94147",
        hf_dataset_repo: hfRepo,
        hf_token: hfToken,
        nvidia_api_key: nvidiaKey,
        use_ai_generator: (jobData.use_ai_generator ? "true" : "false"),
        image_style: (jobData.image_style || "hyper realistic"),
        kie_api_key: (jobData.kie_api_key || "")
      }
    };

    appendLog(`[GITHUB API] POST /repos/${githubRepo}/actions/workflows/video_worker.yml/dispatches`, "sys");

    const ghRes = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "Authorization": "token " + githubPat,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dispatchPayload)
    });

    if (!ghRes.ok && ghRes.status !== 204) {
      const errText = await ghRes.text();
      throw new Error(`GitHub Actions API returned HTTP ${ghRes.status}: ${errText}`);
    }

    appendLog(`🎉 GitHub Actions workflow dispatched successfully! Runner starting instantly...`, "success");
    appendLog(`🔗 Workflow Run Dashboard: https://github.com/${githubRepo}/actions`, "info");

    // Update Firestore to indicate GitHub Actions worker is spinning up
    await updateDoc(jobDocRef, {
      current_milestone: `GitHub Actions runner dispatched. Ubuntu runner starting Kokoro TTS pipeline...`,
      status: "running",
      progress: 5,
      updated_at: new Date().toISOString()
    });

    // Start polling GitHub Actions runner status
    startGithubActionsWatcher(githubRepo, githubPat, jobId);

  } catch (err) {
    console.error("GitHub Actions Dispatch failed:", err);
    appendLog(`❌ GitHub Actions trigger failed: ${err.message}`, "error");
    try {
      await updateDoc(jobDocRef, {
        current_milestone: `GitHub Actions dispatch failed: ${err.message}`,
        status: "failed",
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
    btnLaunch.disabled = false;
    btnCancel.disabled = true;
  }
}

function startGithubActionsWatcher(githubRepo, githubPat, jobId) {
  if (githubWatcherInterval) {
    clearInterval(githubWatcherInterval);
  }

  let lastStatus = "";
  let pollTicks = 0;

  githubWatcherInterval = setInterval(async () => {
    pollTicks++;
    try {
      const res = await fetch(`https://api.github.com/repos/${githubRepo}/actions/runs?event=workflow_dispatch&per_page=1`, {
        headers: {
          "Authorization": "token " + githubPat,
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workflow_runs && data.workflow_runs.length > 0) {
          const run = data.workflow_runs[0];
          activeRunId = run.id;
          const currentStatus = run.status;
          const conclusion = run.conclusion;

          if (currentStatus !== lastStatus) {
            lastStatus = currentStatus;
            appendLog(`[GITHUB RUNNER] Run #${run.id} Status: ${currentStatus.toUpperCase()}${conclusion ? ' (' + conclusion + ')' : ''}`, "sys");

            if (currentStatus === "queued") {
              appendLog("⏳ GitHub Actions: Runner queued, provisioning VM container...", "info");
            } else if (currentStatus === "in_progress") {
              appendLog("⚡ GitHub Actions: Ubuntu runner active! Executing Kokoro TTS & NVIDIA vision pipeline...", "info");
            } else if (currentStatus === "completed") {
              if (conclusion === "success") {
                appendLog("✅ GitHub Actions runner execution finished successfully!", "success");
              } else {
                appendLog(`⚠️ GitHub Actions runner completed with conclusion: ${conclusion}`, "warn");
              }
              clearInterval(githubWatcherInterval);
              githubWatcherInterval = null;
            }
          }
        }
      }
    } catch (e) {
      console.warn("GitHub Actions status poll notice:", e);
    }
  }, 4000);
}

