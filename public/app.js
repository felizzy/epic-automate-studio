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
const cfgGithubPat = document.getElementById("cfgGithubPat");
const cfgGithubRepo = document.getElementById("cfgGithubRepo");
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
      if (data.github_pat && cfgGithubPat) cfgGithubPat.value = data.github_pat;
      if (data.settings && data.settings.github_repo && cfgGithubRepo) cfgGithubRepo.value = data.settings.github_repo;
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
      github_pat: cfgGithubPat ? cfgGithubPat.value.trim() : "",
      kaggle_username: cfgKaggleUser ? cfgKaggleUser.value.trim() : "",
      kaggle_key: cfgKaggleKey ? cfgKaggleKey.value.trim() : "",
      nvidia_api_key: cfgNvidiaKey.value.trim(),
      hf_token: cfgHfToken.value.trim(),
      hf_dataset_repo: cfgHfRepo.value.trim(),
      settings: {
        github_repo: cfgGithubRepo ? cfgGithubRepo.value.trim() : "felizzy/epic-automate-studio"
      },
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

    // Trigger real GitHub Actions compute runner
    await dispatchToGithubActions(jobId, jobData);

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
  
  const confirmCancel = confirm("Are you sure you want to abort this automation on GitHub Actions?");
  if (!confirmCancel) return;

  if (githubWatcherInterval) {
    clearInterval(githubWatcherInterval);
    githubWatcherInterval = null;
  }

  try {
    btnCancel.disabled = true;
    appendLog("⏹ Requesting immediate cancellation on GitHub Actions...", "warn");
    
    const jobDocRef = doc(db, "automations", currentJobId);
    await updateDoc(jobDocRef, {
      cancel_requested: true,
      status: "cancelled",
      current_milestone: "Cancellation requested by user. Terminating runner...",
      updated_at: new Date().toISOString()
    });

    // Also attempt API cancellation of active GitHub Actions run if known
    if (activeRunId && cfgGithubPat && cfgGithubRepo) {
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
        switchTab("studio");
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
// 7. GitHub Actions Dispatch & Real-Time Runner Watchdog
// ==========================================================================
let githubWatcherInterval = null;
let activeRunId = null;

async function dispatchToGithubActions(jobId, jobData) {
  const githubPat = cfgGithubPat ? cfgGithubPat.value.trim() : "";
  const githubRepo = cfgGithubRepo ? cfgGithubRepo.value.trim() : "felizzy/epic-automate-studio";
  const hfToken = cfgHfToken.value.trim();
  const hfRepo = cfgHfRepo.value.trim();
  const nvidiaKey = cfgNvidiaKey.value.trim();
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
        nvidia_api_key: nvidiaKey
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

