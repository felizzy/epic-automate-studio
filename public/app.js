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
  onSnapshot, 
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

// DOM Elements: Settings Tab
const userProfileEmail = document.getElementById("userProfileEmail");
const userProfileUid = document.getElementById("userProfileUid");
const userLargeAvatar = document.getElementById("userLargeAvatar");
const btnSignOut = document.getElementById("btnSignOut");
const settingsForm = document.getElementById("settingsForm");
const cfgKaggleUser = document.getElementById("cfgKaggleUser");
const cfgKaggleKey = document.getElementById("cfgKaggleKey");
const cfgNvidiaKey = document.getElementById("cfgNvidiaKey");
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
// 2. Logging & Terminal Console
// ==========================================================================
function appendLog(message, type = "info") {
  const line = document.createElement("div");
  line.className = `term-line ${type}`;
  
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  line.innerHTML = `<span class="term-time">[${timeStr}]</span> ${escapeHtml(message)}`;
  
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
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
  } else {
    currentUser = null;
    authModal.style.display = "flex";
    statusPillLabel.textContent = "Signed Out";
    userInitial.textContent = "?";
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
      if (data.kaggle_username) cfgKaggleUser.value = data.kaggle_username;
      if (data.kaggle_key) cfgKaggleKey.value = data.kaggle_key;
      if (data.nvidia_api_key) cfgNvidiaKey.value = data.nvidia_api_key;
      if (data.hf_token) cfgHfToken.value = data.hf_token;
      if (data.hf_dataset_repo) cfgHfRepo.value = data.hf_dataset_repo;
      if (data.pexels_key) cfgPexelsKey.value = data.pexels_key;
      if (data.unsplash_key) cfgUnsplashKey.value = data.unsplash_key;
      appendLog("Persistent user settings loaded from Cloud Firestore.", "sys");
    } else {
      // First-time initialization: persist global default credentials for this user
      await saveUserSettings(userId, false);
    }
  } catch (err) {
    console.warn("Could not load Firestore settings:", err);
  }
}

async function saveUserSettings(userId, showToast = true) {
  try {
    const settingsData = {
      kaggle_username: cfgKaggleUser.value.trim(),
      kaggle_key: cfgKaggleKey.value.trim(),
      nvidia_api_key: cfgNvidiaKey.value.trim(),
      hf_token: cfgHfToken.value.trim(),
      hf_dataset_repo: cfgHfRepo.value.trim(),
      pexels_key: cfgPexelsKey.value.trim(),
      unsplash_key: cfgUnsplashKey.value.trim(),
      updated_at: new Date().toISOString()
    };

    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, settingsData, { merge: true });

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
    alert("Please enter a video script before launching.");
    return;
  }

  // Split script into clean individual sentences at punctuation marks
  const sentences = rawScript
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length === 0) {
    alert("No valid sentences found. Ensure sentences end with a period, exclamation, or question mark.");
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
    nvidia_api_key: cfgNvidiaKey.value.trim(),
    kaggle_user: cfgKaggleUser.value.trim(),
    hf_dataset_repo: cfgHfRepo.value.trim(),
    status: "running",
    progress: 5,
    current_milestone: `Job initialized with ${sentences.length} scenes. Dispatching to Kaggle T4 compute...`,
    cancel_requested: false,
    asset_url: null,
    asset_type: "video",
    logs: [`[INITIALIZED] Split script into ${sentences.length} unique scenes.`],
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

    // Trigger real Kaggle T4 GPU compute worker
    await dispatchToKaggle(jobId, jobData);

  } catch (err) {
    console.error("Failed to write job to Firestore:", err);
    appendLog(`Job creation failed: ${err.message}`, "error");
    btnLaunch.disabled = false;
    btnCancel.disabled = true;
  }
});

// Cancel execution
btnCancel.addEventListener("click", async () => {
  if (!currentJobId) return;
  
  const confirmCancel = confirm("Are you sure you want to abort this automation on Kaggle?");
  if (!confirmCancel) return;

  if (kaggleWatcherInterval) {
    clearInterval(kaggleWatcherInterval);
    kaggleWatcherInterval = null;
  }

  try {
    btnCancel.disabled = true;
    appendLog("⏹ Requesting immediate cancellation on Kaggle...", "warn");
    
    const jobDocRef = doc(db, "automations", currentJobId);
    await updateDoc(jobDocRef, {
      cancel_requested: true,
      status: "cancelled",
      current_milestone: "Cancellation requested by user. Terminating worker...",
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("Cancel failed:", err);
    appendLog(`Cancel failed: ${err.message}`, "error");
  }
});

// ==========================================================================
// 6. Real-Time Snapshot Telemetry Listener
// ==========================================================================
function listenToJob(jobId) {
  if (unsubscribeJobSnapshot) {
    unsubscribeJobSnapshot();
  }

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
        // Only append if not already logged
        appendLog(logLine, status === "failed" ? "error" : "info");
      });
    } else {
      appendLog(`[${status.toUpperCase()}] ${milestone}`);
    }

    // Terminal completion / failure states
    if (status === "completed") {
      if (kaggleWatcherInterval) {
        clearInterval(kaggleWatcherInterval);
        kaggleWatcherInterval = null;
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
        switchTab("studio");
      }
    } else if (status === "cancelled") {
      if (kaggleWatcherInterval) {
        clearInterval(kaggleWatcherInterval);
        kaggleWatcherInterval = null;
      }
      btnLaunch.disabled = false;
      btnCancel.disabled = true;
      progressFill.style.background = "#ef4444";
      appendLog("⏹ Job execution stopped by user.", "warn");
    } else if (status === "failed") {
      if (kaggleWatcherInterval) {
        clearInterval(kaggleWatcherInterval);
        kaggleWatcherInterval = null;
      }
      btnLaunch.disabled = false;
      btnCancel.disabled = true;
      progressFill.style.background = "#f59e0b";
      appendLog(`⚠️ Job failed: ${milestone}`, "error");
    }
  });
}

// Copy Asset URL helper
btnCopyAssetUrl.addEventListener("click", () => {
  if (!finalAssetUrl.value) return;
  navigator.clipboard.writeText(finalAssetUrl.value).then(() => {
    btnCopyAssetUrl.textContent = "✓ Copied!";
    setTimeout(() => {
      btnCopyAssetUrl.textContent = "📋 Copy Link";
    }, 2000);
  });
});

// Initial stats update
updateScriptStats();

// ==========================================================================
// 7. Kaggle T4 Dispatch & Real-Time Kernel Watchdog
// ==========================================================================
let kaggleWatcherInterval = null;

async function dispatchToKaggle(jobId, jobData) {
  const kaggleUser = cfgKaggleUser.value.trim();
  const kaggleKey = cfgKaggleKey.value.trim();
  const hfToken = cfgHfToken.value.trim();
  const hfRepo = cfgHfRepo.value.trim();
  const nvidiaKey = cfgNvidiaKey.value.trim();
  const jobDocRef = doc(db, "automations", jobId);

  if (!kaggleUser || !kaggleKey) {
    appendLog("⚠️ Kaggle credentials missing in Settings. Please enter your Kaggle username and API key.", "warn");
    return;
  }

  appendLog(`🚀 Triggering Kaggle T4 compute for ${kaggleUser}/epic-automate-video-worker...`, "info");

  try {
    // 1. Fetch the master Kaggle worker script
    let pythonCode = "";
    try {
      const resp = await fetch("kaggle_executor.py?v=" + Date.now());
      if (resp.ok) pythonCode = await resp.text();
    } catch (e) {
      console.warn("Could not fetch kaggle_executor.py:", e);
    }

    if (!pythonCode || pythonCode.length < 100) {
      appendLog("Fetching pipeline worker script...", "sys");
      const resp2 = await fetch("kaggle_executor.py");
      if (resp2.ok) pythonCode = await resp2.text();
    }

    // 2. Inject job-specific environment overrides directly into Python code header
    const injectedHeader = `# Auto-injected execution parameters for Job: ${jobId}
import os
os.environ["FIREBASE_PROJECT_ID"] = "epic-studio-94147"
os.environ["JOB_ID"] = "${jobId}"
os.environ["HF_TOKEN"] = "${hfToken}"
os.environ["HF_DATASET_REPO"] = "${hfRepo}"
os.environ["NVIDIA_API_KEY"] = "${nvidiaKey}"
`;
    const finalCode = injectedHeader + "\n" + pythonCode;

    // 3. Dispatch to Kaggle API via REST
    const kaggleUrl = "https://www.kaggle.com/api/v1/kernels/push";
    const pushPayload = {
      slug: `${kaggleUser}/epic-automate-video-worker`,
      newTitle: "Epic Automate Video Worker",
      text: finalCode,
      language: "python",
      kernelType: "script",
      isPrivate: true,
      enableGpu: true,
      enableInternet: true
    };

    appendLog(`[KAGGLE API] POST https://www.kaggle.com/api/v1/kernels/push (Bearer ${kaggleKey.slice(0, 10)}...)`, "sys");

    const pushRes = await fetch(kaggleUrl, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + kaggleKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(pushPayload)
    });

    if (!pushRes.ok) {
      const errText = await pushRes.text();
      throw new Error(`Kaggle API returned HTTP ${pushRes.status}: ${errText}`);
    }

    const pushData = await pushRes.json();
    appendLog(`🎉 Kaggle T4 Worker successfully pushed! Version: ${pushData.versionNumber || 1}`, "success");
    appendLog(`🔗 Kaggle Kernel: https://www.kaggle.com/code/${kaggleUser}/epic-automate-video-worker`, "info");

    // Update Firestore to indicate Kaggle container is spinning up
    await updateDoc(jobDocRef, {
      current_milestone: `Kaggle T4 worker triggered (v${pushData.versionNumber || 1}). Container queued & allocating GPU...`,
      status: "running",
      progress: 5,
      updated_at: new Date().toISOString()
    });

    // Start polling Kaggle container status
    startKaggleStatusWatcher(kaggleUser, kaggleKey, jobId);

  } catch (err) {
    console.error("Kaggle Dispatch failed:", err);
    appendLog(`❌ Kaggle trigger failed: ${err.message}`, "error");
    try {
      await updateDoc(jobDocRef, {
        current_milestone: `Kaggle dispatch failed: ${err.message}`,
        status: "failed",
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
    btnLaunch.disabled = false;
    btnCancel.disabled = true;
  }
}

function startKaggleStatusWatcher(kaggleUser, kaggleKey, jobId) {
  if (kaggleWatcherInterval) {
    clearInterval(kaggleWatcherInterval);
  }

  let lastStatus = "";
  let pollTicks = 0;

  kaggleWatcherInterval = setInterval(async () => {
    pollTicks++;
    try {
      const res = await fetch(`https://www.kaggle.com/api/v1/kernels/status?userName=${kaggleUser}&kernelSlug=epic-automate-video-worker`, {
        headers: {
          "Authorization": "Bearer " + kaggleKey
        }
      });
      if (res.ok) {
        const data = await res.json();
        const currentKaggleStatus = data.status || "unknown";

        if (currentKaggleStatus !== lastStatus) {
          lastStatus = currentKaggleStatus;
          appendLog(`[KAGGLE T4 CONTAINER] Status updated to: ${currentKaggleStatus.toUpperCase()}`, "sys");

          if (currentKaggleStatus === "queued") {
            appendLog("⏳ Kaggle scheduler: Container queued in GPU cluster, preparing T4 accelerator...", "info");
          } else if (currentKaggleStatus === "running") {
            appendLog("⚡ Kaggle container running on Tesla T4 GPU. Executing Kokoro TTS & NVIDIA vision pipeline...", "info");
          } else if (currentKaggleStatus === "complete") {
            appendLog("✅ Kaggle kernel execution complete!", "success");
            clearInterval(kaggleWatcherInterval);
            kaggleWatcherInterval = null;
          } else if (currentKaggleStatus === "error" || currentKaggleStatus === "failed") {
            appendLog(`⚠️ Kaggle worker stopped with status: ${currentKaggleStatus}. Failure: ${data.failureMessage || 'None'}`, "error");
            clearInterval(kaggleWatcherInterval);
            kaggleWatcherInterval = null;
          }
        }
      }
    } catch (e) {
      console.warn("Kaggle status poll notice:", e);
    }
  }, 4500);
}

