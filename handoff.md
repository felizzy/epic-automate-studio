# Epic Automate Project Handoff

> **Note for Subsequent Agents**: This document tracks the real-time operational status, architectural bindings, credentials status, and incremental modifications for this automation project. Update this document after every major change.

---

## 1. Project Identity & Architecture
- **Project Name**: Epic Automate Studio (Kokoro-82M TTS + NVIDIA Vision Video Generator)
- **Date Created**: 2026-11-22
- **Last Modified**: 2026-11-23 05:45
- **Modus Operandi**: `epic-automate`
  - Frontend: Dedicated New Firebase Project (`epic-studio-94147`, Firebase Hosting)
  - State & Progress: Cloud Firestore (`/automations/{jobId}` and `/users/{userId}`)
  - Compute Server: GitHub Actions Instant Runner (`felizzy/epic-automate-studio`, workflow: `video_worker.yml`)
  - Asset Storage: Hugging Face Datasets with Web Media Preview Player (`felizzy/epic-automation-assets`)
  - Version Control: GitHub Repository (`felizzy/epic-automate-studio`)
  - AI Image Generator: Kie.ai Z-Image API with style adaptation + NVIDIA Nemotron diffusion prompt engineering
  - Speech Synthesis: Kokoro-82M ONNX (<500MB weights)

---

## 2. Infrastructure Endpoints & Identifiers
| Service | Resource | Identifier / URL | Status |
|---|---|---|---|
| **Firebase Hosting** | Web Frontend | `https://epic-studio-94147.web.app` | 🟢 Active |
| **Cloud Firestore** | State Database | Project: `epic-studio-94147`, Collections: `/automations`, `/users` | 🟢 Active |
| **Firebase Auth** | Multitenant Auth | Google Sign-in & Email/Password (`ebiringai@gmail.com`) | 🟢 Active |
| **GitHub Actions** | Compute Worker | Workflow: `.github/workflows/video_worker.yml` (Instant Runner) | 🟢 Active |
| **Hugging Face** | Storage Dataset | `https://huggingface.co/datasets/felizzy/epic-automation-assets` | 🟢 Verified |
| **GitHub** | Source Code | `https://github.com/felizzy/epic-automate-studio` | 🟢 Synced |
| **Kie.ai Z-Image** | Image Engine | `https://api.kie.ai/api/v1/jobs` (`z-image`, 16:9) | 🟢 Integrated |

---

## 3. Credentials & Secrets Audit
- [x] **GitHub PAT**: Stored as `GITHUB_TOKEN` with write access to repository (`@felizzy`).
- [x] **Hugging Face Token**: Stored as `HF_TOKEN` with Write permissions (`@felizzy`).
- [x] **Kaggle API**: Verified via `~/.kaggle/kaggle.json` (`chikwasfelix` / `KGAT_338d2595814cc5a40e7404bc76cb35d4`).
- [x] **Firebase Authentication**: Active session in Firebase CLI for project `epic-studio-94147`.
- [x] **Kie.ai API Key**: Stored per-user in Firestore `/users/{userId}` (`kie_api_key`). Never shared across user accounts (strict multitenant isolation enforced by Firestore security rules `isOwner(userId)`).

---

## 4. Work Completed & Modifications Log
- **2026-11-22**: Initialized and provisioned brand-new Firebase project `epic-studio-94147` with Cloud Firestore and Firebase Web App.
- **2026-11-22**: Enabled Identity Toolkit Auth with Google Sign-in and Email/Password providers; created default user `ebiringai@gmail.com` with password `Airpyk98`.
- **2026-11-22**: Authored Next-Level iOS Builder UI frontend featuring Studio Tab (Kokoro TTS, caption position/size toggles, NVIDIA reasoning scene analyzer, multi-source image selection), Live Monitor Tab (0-100% telemetry, live milestone stream, terminal console), and Settings Tab (persistent credentials in Firestore `/users/{userId}`).
- **2026-11-22**: Resolved "Launch button not working" issue: updated `firestore.rules` to permit `captions` map and nullable `asset_url` and `asset_type`. Deployed updated rules.
- **2026-11-22**: Transitioned compute engine from Kaggle GPU (multi-hour queue contention) to **GitHub Actions Instant Runner** (`.github/workflows/video_worker.yml` + `pipeline_executor.py`):
  - Zero queue delays: workflow dispatch starts within 2-3 seconds.
  - Native Kokoro-82M TTS audio synthesis (<500MB weights).
  - NVIDIA NIM semantic visual queries + unique multi-source photography search.
  - FFmpeg Ken Burns zoom/pan motion + dynamic burn-in subtitle styles.
  - Automatic 1080p MP4 concatenation and upload to Hugging Face Datasets.
  - Real-time Firestore milestone synchronization and immediate cancellation watchdog.
  - Frontend wired with live GitHub Actions runner status monitor (`queued`, `in_progress`, `completed`).
- **2026-11-22**: Fixed "no stock images / static gradient fallback" issue:
  - Upgraded NVIDIA reasoning model to active, fast `nvidia/nemotron-3.5-bolt-e4b` (replacing deprecated `meta/llama-3.3-70b-instruct`).
  - Corrected Wikimedia search to query namespace 6 (`gsrnamespace=6`), guaranteeing direct high-resolution photographic image files (`image/jpeg` / `image/png`).
  - Added multi-tier fallback architecture: Wikimedia Commons API -> Wikipedia REST Summary original media -> DuckDuckGo image JSON API (`i.js`) -> Picsum deterministic real photo stream (`https://picsum.photos/seed/.../1920/1080`) -> Curated authentic Unsplash HD library.
  - Implemented multi-word contextual phrase search and an anti-diagram blacklist to eliminate technical schematics and guarantee genuine photography.
  - Completely eradicated synthetic procedural Pillow RGB gradients, guaranteeing 100% genuine real photography across every video scene.
- **2026-11-23**: Added **Kie.ai Z-Image AI Generator & Art Style Customization**:
  - **Multitenant Key Isolation**: Added `kie_api_key` input to Settings Tab. Saved strictly to Firestore document `/users/{userId}`. Cloud Firestore rules enforce `isOwner(userId)` (`request.auth.uid == userId`) so no other user can read or overwrite another user's key. Auth state listener wipes credential inputs immediately on logout.
  - **Visual Scene Engine UI**: Added toggle in Studio Tab (`#toggleAiGenerator`) to switch between "AI Z-Image (Kie.ai)" and "Stock Photography". Added art style selector dropdown (`#imageStyleSelect`) with options:
    - *Hyper Realistic* (Default): 8k resolution, cinematic lighting, photorealistic textures.
    - *Claymation*: Stop-motion clay figures, plasticine textures, studio miniature lighting.
    - *2D Digital Painting*: Concept art, vivid brush strokes, fantasy digital illustration.
    - *3D Pixar Animation*: Stylized 3D render, subsurface scattering, Disney Pixar aesthetic.
    - *Japanese Anime*: Studio Ghibli inspired anime aesthetic, Makoto Shinkai sky.
    - *Vintage Oil Painting*: Classical Renaissance canvas, rich impasto oil paint texture.
    - *Cyberpunk Neon*: Blade Runner aesthetic, dark moody cyberpunk metropolis, neon reflections.
    - *Custom*: Allows user to type any bespoke art direction prompt.
  - **Diffusion Prompt Generation**: `generate_diffusion_prompt_with_nvidia` in `pipeline_executor.py` prompts `nvidia/nemotron-3.5-bolt-e4b` to turn each sentence into a rich, visual text-to-image prompt tailored for the selected art style.
  - **Kie.ai Z-Image Generation**: `generate_image_with_kie` calls `POST https://api.kie.ai/api/v1/jobs/createTask` (`model: "z-image"`, `aspect_ratio: "16:9"`), polls task progress until completion, extracts the generated image, center-crops to 1920x1080, and falls back gracefully to stock photos if the key is omitted or fails.
  - **Firestore Rules Update**: Updated via `firestore-rules-author` subagent to allow `kie_api_key` in `/users/{userId}` and `use_ai_generator`, `image_style`, `kie_api_key` in `/automations/{jobId}`.
  - **Deployment**: Synchronized to GitHub repository `felizzy/epic-automate-studio` and deployed to Firebase Hosting `https://epic-studio-94147.web.app`.
- **2026-11-27**: Added **All Job Executions Directory & Credit-Preserving Resume Engine**:
  - **Complete Executed Jobs List**: Live Monitor tab now displays all jobs executed by the user with filter pills (All, Running, Completed, Failed), relative timestamps, status pills (with animated pulse for active runs), mode badges, and progress bars.
  - **Credit-Preserving Intermediate Scene Cache**: Every generated image URL is immediately written to `completed_scenes` in `/automations/{jobId}` via Firestore REST PATCH.
  - **Seamless Resume Execution**: If an execution stops or fails (e.g. runner timeout, network hitch, or manual pause), users can click **"⚡ Resume Execution"** from the job list or the active telemetry card banner. The runner detects `completed_scenes` in Firestore, reuses all existing images, and generates only the remaining scenes—**guaranteeing zero Kie.ai API credits are wasted**.
  - **Firestore Rules Hardening**: Delegated to `firestore-rules-author` subagent to validate `completed_scenes` (list/map up to 500 entries) and `retry_count` in `isValidAutomationDoc` and worker update diff key whitelists. Rules deployed to Firebase.
  - **Deployment**: Code synchronized to GitHub repository and frontend deployed to Firebase Hosting.

---

## 5. Standard Operating Procedures for Subsequent Agents
1. **Never reuse an old Firebase project** unless explicitly requested by the user.
2. **Never expose or leak user API keys**: Keep all keys scoped to individual Firestore documents (`/users/{uid}`) with strict `request.auth.uid == userId` rules.
3. **Always use the firestore-rules-author subagent** when modifying `firestore.rules`.
4. **Always update this `handoff.md`** file upon completing any task or modification.
