# Epic Automate Project Handoff

> **Note for Subsequent Agents**: This document tracks the real-time operational status, architectural bindings, credentials status, and incremental modifications for this automation project. Update this document after every major change.

---

## 1. Project Identity & Architecture
- **Project Name**: Epic Automate Studio (Kokoro-82M TTS + NVIDIA Vision Video Generator)
- **Date Created**: 2026-11-22
- **Last Modified**: 2026-11-22 07:26
- **Modus Operandi**: `epic-automate`
  - Frontend: Dedicated New Firebase Project (`epic-studio-94147`, Firebase Hosting)
  - State & Progress: Cloud Firestore (`/automations/{jobId}` and `/users/{userId}`)
  - Compute Server: Kaggle T4 GPU (`nvidiaTeslaT4`) via Kernel Push
  - Asset Storage: Hugging Face Datasets with Web Media Preview Player (`felizzy/epic-automation-assets`)
  - Version Control: GitHub Repository (`felizzy/epic-automate-studio`)

---

## 2. Infrastructure Endpoints & Identifiers
| Service | Resource | Identifier / URL | Status |
|---|---|---|---|
| **Firebase Hosting** | Web Frontend | `https://epic-studio-94147.web.app` | 🟢 Active |
| **Cloud Firestore** | State Database | Project: `epic-studio-94147`, Collections: `/automations`, `/users` | 🟢 Active |
| **Firebase Auth** | Multitenant Auth | Google Sign-in & Email/Password (`ebiringai@gmail.com`) | 🟢 Active |
| **Kaggle Kernel** | Compute Worker | Slug: `chikwasfelix/epic-automate-video-worker` | 🟢 Configured |
| **Kaggle Accelerator** | GPU Spec | `nvidiaTeslaT4` (Verified) | 🟢 Enabled |
| **Hugging Face** | Storage Dataset | `https://huggingface.co/datasets/felizzy/epic-automation-assets` | 🟢 Verified |
| **GitHub** | Source Code | `https://github.com/felizzy/epic-automate-studio` | 🟢 Synced |

---

## 3. Credentials & Secrets Audit
- [x] **GitHub PAT**: Stored as `GITHUB_TOKEN` with write access to repository (`@felizzy`).
- [x] **Hugging Face Token**: Stored as `HF_TOKEN` with Write permissions (`@felizzy`).
- [x] **Kaggle API**: Verified via `~/.kaggle/kaggle.json` (`chikwasfelix` / `KGAT_338d2595814cc5a40e7404bc76cb35d4`).
- [x] **Firebase Authentication**: Active session in Firebase CLI for project `epic-studio-94147`.

---

## 4. Work Completed & Modifications Log
- **2026-11-22**: Initialized and provisioned brand-new Firebase project `epic-studio-94147` with Cloud Firestore and Firebase Web App.
- **2026-11-22**: Enabled Identity Toolkit Auth with Google Sign-in and Email/Password providers; created default user `ebiringai@gmail.com` with password `Airpyk98`.
- **2026-11-22**: Authored Next-Level iOS Builder UI frontend featuring Studio Tab (Kokoro TTS, caption position/size toggles, NVIDIA reasoning scene analyzer, multi-source image selection), Live Monitor Tab (0-100% telemetry, live milestone stream, terminal console), and Settings Tab (persistent credentials in Firestore `/users/{userId}`).
- **2026-11-22**: Authored production Kaggle T4 worker (`kaggle_executor.py`) with sentence splitting, Kokoro-82M TTS, unique image fetching, FFmpeg dynamic subtitle burn-in, video concatenation, Hugging Face dataset upload, and Firestore cancellation watchdog.
- **2026-11-22**: Delegated and validated Cloud Firestore Security Rules (`firestore.rules`) with strict multitenant user isolation and Kaggle worker status updates.
- **2026-11-22**: Resolved "Launch button not working" issue: updated `firestore.rules` to permit `captions` map and nullable `asset_url` and `asset_type`. Deployed updated rules.
- **2026-11-22**: Integrated direct Kaggle T4 GPU compute trigger into frontend: Launch button now directly packages and pushes the worker kernel via Kaggle REST API (`POST https://www.kaggle.com/api/v1/kernels/push`) with Bearer token authentication (`KGAT_...`) and automatic runtime parameter injection (`JOB_ID`, `HF_TOKEN`, `NVIDIA_API_KEY`). Added real-time Kaggle container status watchdog polling (`GET /api/v1/kernels/status`) and synchronized Firestore real-time progress.

---

## 5. Standard Operating Procedures for Subsequent Agents
1. **Never reuse an old Firebase project** unless explicitly requested by the user.
2. **Always re-verify Kaggle's latest T4 accelerator syntax** before pushing kernels.
3. **Verify the cancellation watchdog** functions properly when testing workers.
4. **Always update this `handoff.md`** file upon completing any task or modification.
