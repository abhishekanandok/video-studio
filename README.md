# Drishyya — Video Studio

> **"Your idea, your voice, our visuals."**  
> An autonomous AI video studio for documentary, educational, and motion-graphics films, tailored for Hindi and Hinglish creators. Research, script, voice generation, visual layout, storyboard review, and Remotion video rendering — with every stage inspectable, cacheable, and editable.
>
> <img width="1902" height="1025" alt="image" src="https://github.com/user-attachments/assets/7e89070d-1f61-4e49-a4e6-f4b376c92604" />
<img width="1917" height="1077" alt="image" src="https://github.com/user-attachments/assets/7814863f-bd55-4edf-8931-cd49c9a58e22" />
<img width="1917" height="1085" alt="image" src="https://github.com/user-attachments/assets/8ce2efb4-c31e-4eb2-bd06-fcabd9489517" />




---

## Table of Contents

1. [Overview & Capabilities](#overview--capabilities)
2. [Architecture & Service Map](#architecture--service-map)
3. [Prerequisites](#prerequisites)
4. [Quick Start (One-Click)](#quick-start-one-click)
5. [Manual Service Setup & Run](#manual-service-setup--run)
   - [1. Database (PostgreSQL 17)](#1-database-postgresql-17)
   - [2. Backend API (FastAPI)](#2-backend-api-fastapi)
   - [3. Video Engine (Remotion & CLI)](#3-video-engine-remotion--cli)
   - [4. Frontend Web App (Next.js 16)](#4-frontend-web-app-nextjs-16)
   - [5. ComfyUI (Optional Diffusion Worker)](#5-comfyui-optional-diffusion-worker)
6. [Configuration & Environment Variables](#configuration--environment-variables)
7. [Pipelines & Film Engines](#pipelines--film-engines)
   - [Oneshot Motion Graphics (with Storyboard Gate)](#1-oneshot-motion-graphics-adrs-0013--0014)
   - [Documentary Studio](#2-documentary-studio)
   - [Exam Notes Films](#3-exam-notes-films-exam)
   - [Audio Films & Transcripts](#4-audio-films)
   - [Cinema (Google Veo)](#5-cinema-veo)
8. [Repository Directory Structure](#repository-directory-structure)
9. [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## Overview & Capabilities

Drishyya (Video Studio) is an end-to-end video production system. Originally split out of the Tayyari project on 2026-10-03, it operates with complete independence: its own database, isolated ports, independent worker processes, and dedicated configuration.

### What the Studio Does:
- **Researches & Plans**: Ingests notes, books, research papers, or raw prompts and generates structured story arcs, world bibles, and factual anchors.
- **Scripts & Narrates**: Writes natural conversational scripts (Hindi, Hinglish, or English) and synthesizes studio-grade audio via Gemini TTS (featuring signature hosts Kabir, Tara, Aoede, and Enceladus).
- **Times Every Word**: Extracts precise word-level timestamps using `faster-whisper` so graphics sync frame-accurately to spoken words.
- **Draws Graphics in Code**: Rather than relying exclusively on pre-baked templates or static images, the AI can program custom React/Remotion TypeScript scenes with rich vector drawings, timelines, charts, and animations.
- **Human-in-the-Loop Storyboard Gate**: Creators approve, tweak words, or request card redraws before heavy video compilation and rendering begins.
- **High-Definition Remotion Rendering**: Compiles scenes into 16:9 master files (and upcoming 9:16 Shorts) using Chromium rendering and FFmpeg (with NVENC GPU acceleration).

---

## Architecture & Service Map

The system is organized into a modular tree:

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Browser (User)                       │
│                   http://localhost:3030                     │
└──────────────┬───────────────────────────────▲──────────────┘
               │                               │
               ▼                               │
┌──────────────────────────────┐ ┌─────────────┴──────────────┐
│       Next.js Frontend       │ │       Media Assets         │
│         (Port 3030)          │ │  /studio-assets, /studio-out│
└──────────────┬───────────────┘ └─────────────▲──────────────┘
               │ REST API / SWR Polling        │
               ▼                               │ Static Mounts
┌──────────────────────────────────────────────┴──────────────┐
│                    FastAPI Backend Server                   │
│                         (Port 8020)                         │
└───────┬──────────────────┬───────────────────┬──────────────┘
        │                  │                   │
        ▼                  ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐
│  PostgreSQL  │   │   ComfyUI    │   │ Long-Running Worker   │
│  (Port 5442) │   │ (Port 8188)  │   │ Processes (Detached)  │
│  videostudio │   │ Qwen / Wan   │   │ oneshot.py, doc.py,   │
└──────────────┘   └──────────────┘   │ notes.py, etc.        │
                                      └───────────┬───────────┘
                                                  │
                                                  ▼
                                      ┌───────────────────────┐
                                      │ Remotion 4 Engine     │
                                      │ React + ThreeJS/D3    │
                                      │ Output: video/out/*.mp4│
                                      └───────────────────────┘
```

### Services Summary:

| Service | Port | Tech Stack | Role |
|---|---|---|---|
| **Frontend** | `3030` | Next.js 16, React 19, Tailwind v4, Motion, SWR | Creator UI, live pipeline inspector, storyboard reviewer, scene editor, and landing page. |
| **Backend API** | `8020` | FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2 | Manages film configurations, launches detached pipeline workers, serves `/studio-assets` and `/studio-out`. |
| **Database** | `5442` (host) $\rightarrow$ `5432` (container) | PostgreSQL 17 (Docker) | Stores film records, pipeline presets, settings, and Skill Lab data. |
| **Video Engine** | CLI / Headless | Remotion 4, React 19, Three.js, D3-geo, FFmpeg | Generates frames and encodes final MP4 videos. |
| **ComfyUI** *(Optional)* | `8188` | ComfyUI, Qwen-Image 2.1, Wan 2.2 | Local GPU worker for image/video diffusion models. |

---

## Prerequisites

Ensure the following tools are installed on your machine:

1. **Docker Desktop**: For running the PostgreSQL 17 container.
2. **Python 3.11+ or 3.12**: For the backend and video pipeline scripts.
3. **Node.js 20+ & npm**: For both frontend and Remotion dependencies.
4. **FFmpeg**: Must be available on your system `PATH` (used for audio stitching and video encoding).
5. **NVIDIA GPU with CUDA** *(Recommended)*: For fast local transcription (`faster-whisper`), ComfyUI, and hardware-accelerated video rendering.

---

## Quick Start (One-Click)

### Windows (PowerShell)
If you are on Windows, you can start all services (Docker container, FastAPI backend, Next.js frontend, and ComfyUI) in one command:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-all.ps1
```

This script:
1. Verifies/starts Docker Desktop and spins up `videostudio-db` on port `5442`.
2. Launches the FastAPI backend on `http://localhost:8020`.
3. Launches the Next.js dev server on `http://localhost:3030`.
4. Optionally starts local ComfyUI on port `8188`.
5. Probes each port and notifies you once everything is live.

Open **[http://localhost:3030](http://localhost:3030)** in your browser.

---

## Manual Service Setup & Run

### 1. Database (PostgreSQL 17)
The database runs via Docker Compose.

```bash
# Start the database container in the background
docker compose up -d

# Verify it is healthy on port 5442
docker ps --filter "name=videostudio-db"
```

To stop the database:
```bash
docker compose down
# Data persists in the 'pgdata' docker volume
```

### 2. Backend API (FastAPI)
The backend manages film configurations, interfaces with LLMs, and monitors worker processes.

```bash
cd backend

# Create virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server on port 8020
python -m uvicorn app.main:app --host 0.0.0.0 --port 8020
```
* Health check: `http://localhost:8020/health`
* Static Assets: `http://localhost:8020/studio-assets/`
* Video Outputs: `http://localhost:8020/studio-out/`

### 3. Video Engine (Remotion & CLI)
The video rendering code lives in `video/`. It must have its Node dependencies installed:

```bash
cd video
npm install
```

You can test Remotion compositions in preview mode at any time:
```bash
npm run studio
```

### 4. Frontend Web App (Next.js 16)
The frontend serves the creator studio, storyboard gate, and landing page.

```bash
cd frontend

# Install dependencies
npm install

# Run development server on port 3030
npm run dev
```

Visit **[http://localhost:3030](http://localhost:3030)**.

### 5. ComfyUI (Optional Diffusion Worker)
Used for local image generation in audio films (`video/audiofilm.py`). If running ComfyUI locally, ensure it is listening on port `8188` (`http://127.0.0.1:8188`) with the Qwen-Image models configured.

---

## Configuration & Environment Variables

Settings are read from `backend/.env` using Pydantic Settings. Create `backend/.env` (never commit this file to source control):

```ini
# Database
DATABASE_URL=postgresql+psycopg://prep:prep@localhost:5442/videostudio

# Frontend URL
FRONTEND_URL=http://localhost:3030

# Primary LLM (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_VERTEX=false
GEMINI_MODEL=gemini-3.8-flash
GEMINI_MODEL_SMART=gemini-3.8-flash
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image

# Alternative LLM: OpenAI (Fallback / Optional)
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-5-mini
OPENAI_MODEL_SMART=gpt-5

# Alternative LLM: OpenRouter (Optional, e.g. for GLM-5.3)
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=z-ai/glm-5.3
OPENROUTER_MODEL_SMART=z-ai/glm-5.3
OPENROUTER_VISION_MODEL=z-ai/glm-5.3-flash

# Whisper (Speech-to-Text)
WHISPER_MODEL=large-v3-turbo

# ComfyUI (Local Diffusion)
COMFY_URL=http://127.0.0.1:8188
COMFY_UNET=qwen_image_2.1_int8_convrot.safetensors
COMFY_CLIP=qwen3vl_8b_int8_convrot.safetensors
COMFY_VAE=qwen_image_2.1_vae_bf16.safetensors
COMFY_STEPS=25

# Google Veo (Cinematic Shots - Optional)
VEO_API_KEY=your_veo_key_here
VEO_PROJECT=your_gcp_project_id
VEO_LOCATION=us-central1
VEO_MODEL=veo-3.1-generate-001
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Execution Timeouts & Retries
LLM_RATE_LIMIT_RETRIES=6
LLM_TIMEOUT_SEC=480
```

---

## Pipelines & Film Engines

Drishyya features specialized video pipelines tailored to different storytelling styles:

### 1. Oneshot Motion Graphics (ADRs 0013 & 0014)
* **Runner**: `video/oneshot.py`
* **Entry Point**: Frontend `/app/motion/oneshot` or `/app/motion/films`
* **How It Works**:
  1. **Plan & Script**: Researches the topic, crafts a beat-by-beat timeline, and drafts narration.
  2. **Voice & Word Sync**: Synthesizes Gemini TTS audio and aligns every spoken word with `faster-whisper`.
  3. **Storyboard Review Gate**: Halts execution and presents card-by-card visual blueprints in the UI. Creators can approve cards, edit speech lines, or request single-card redraws.
  4. **Code Generation**: Once all cards are approved, the agent writes a complete, self-contained Remotion TypeScript React file (`film.tsx`) using pure SVG, vector animations, kinetic typography, and math easings.
  5. **Compile & Render**: Compiles via `tsc`, validates syntax, and encodes the MP4.

### 2. Documentary Studio
* **Runner**: `video/doc.py`
* **Entry Point**: Frontend `/studio`
* **How It Works**:
  1. Builds a comprehensive "Story World Bible" and verifies facts against strict no-hallucination rules.
  2. Breaks the narrative into acts and scenes.
  3. Generates diverse visual assets per scene (Vox-style collage, archival photography, technical blueprints, 2D cartoon, or macro photos).
  4. Records distinct voices for co-hosts/characters.
  5. Renders the Remotion `Doc` composition to `video/out/<slug>.mp4`.

### 3. Exam Notes Films (`/exam`)
* **Runner**: `video/notes.py`
* **Entry Point**: Frontend `/exam`
* **How It Works**:
  1. Ingests competitive exam notes, textbook chapters, or PDFs (page-by-page OCR support).
  2. Generates structured, bilingual Hinglish slides highlighting key concepts in yellow and formulas/examples in neon-green.
  3. Uses hosts Kabir & Tara to narrate conversational podcast-style explanations.
  4. Renders scenes independently via `notes-render.mjs`, then stitches them seamlessly with background audio.

### 4. Audio Films
* **Runner**: `video/audiofilm.py`
* **Entry Point**: Frontend `/audio`
* **How It Works**:
  1. Upload raw audio/lecture recordings.
  2. Generates word-level transcripts via Whisper.
  3. Plans visual beats and queries local ComfyUI (Qwen-Image) or web archives for matching visuals.
  4. Renders the synchronized video.

### 5. Cinema (Veo)
* **Runner**: `video/cinema.py`
* **Entry Point**: Frontend `/studio/cinema`
* **How It Works**: Generates cinematic short videos powered by Google Veo text-to-video models with custom camera directions and motion profiles.

---

## Repository Directory Structure

```
video-studio/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/                # Route controllers (studio, oneshot, notes, etc.)
│   │   ├── config.py           # Settings from .env
│   │   ├── db.py               # SQLAlchemy sync session engine
│   │   ├── models.py           # Film, Setting, Skill database tables
│   │   ├── procs.py            # Process tracking & group management
│   │   ├── llm.py              # LLM client abstractions & retries
│   │   ├── comfy.py            # Local ComfyUI HTTP client
│   │   └── main.py             # FastAPI app, static mounts, and CORS
│   └── tests/                  # Backend test suite
│
├── frontend/                   # Next.js 16 Web Application
│   ├── app/
│   │   ├── page.tsx            # Marketing landing page
│   │   ├── studio/             # Documentary studio UI
│   │   ├── exam/               # Exam notes films UI
│   │   ├── app/motion/         # Oneshot & motion storyboard review UI
│   │   └── rules/              # Picture rules & visual settings
│   ├── components/             # Reusable UI & player components
│   └── lib/                    # API client and hooks (SWR)
│
├── video/                      # Video Engine & Worker Scripts
│   ├── oneshot.py              # Single-file motion graphics generator
│   ├── doc.py                  # Multi-stage documentary pipeline
│   ├── notes.py                # Exam notes pipeline
│   ├── audiofilm.py            # Speech-to-video pipeline
│   ├── cinema.py               # Google Veo cinema generator
│   ├── storyboard.py           # Storyboard gate and state manager
│   ├── fastrender.py           # NVENC accelerated rendering
│   ├── public/                 # Per-film working state & assets (status.json, etc.)
│   ├── out/                    # Final rendered MP4 files
│   └── src/                    # Remotion compositions (Doc, Notes, Argon, etc.)
│
├── docs/                       # Architecture, decisions (ADRs), and guides
│   ├── system/                 # HLD, CODEMAP, RISKS
│   ├── decisions/              # Architecture Decision Records (ADR 0001 - 0014)
│   └── STYLE.md                # House visual rules
│
├── docker-compose.yml          # PostgreSQL 17 container definition
├── start-all.ps1               # Automated startup script (Windows)
└── README.md                   # Project documentation
```

---

## Troubleshooting & FAQs

### 1. Database Connection Refused (`port 5442`)
* Check if the Docker container is running:
  ```bash
  docker ps
  ```
* If stopped, start it with `docker compose up -d` or `docker start videostudio-db`.
* Note: Postgres runs on internal port `5432`, but is forwarded to host port **`5442`** to avoid conflicts with other local Postgres instances.

### 2. Pipeline Shows "Stopped" or Unresponsive
* Generation pipelines run as detached operating system processes.
* Check the logs in the film's working directory:
  ```bash
  # Example for oneshot film:
  cat video/public/oneshot/<slug>/proc.log
  cat video/public/oneshot/<slug>/run.log
  ```
* If a Python traceback is present, fix the underlying prompt or configuration and click **Continue** or re-trigger the step.

### 3. Remotion Rendering Errors / Chromium Missing
* If Remotion fails to launch headless browser instances, verify that dependencies are installed:
  ```bash
  cd video && npm install
  ```
* Ensure your system has sufficient RAM/VRAM during render passes.

### 4. Gemini API Rate Limits (429)
* High concurrency or multi-scene parallel writing can hit per-minute quota limits.
* The system includes built-in retries with exponential backoff (`llm_rate_limit_retries` in `backend/app/config.py`).
* Consider using Vertex AI (`GEMINI_VERTEX=true`) or supplying an OpenRouter fallback key (`OPENROUTER_API_KEY`) if AI Studio tiers are restricted.

---

## License & Attribution

Internal lab software. Portions derived from Tayyari (`exam-prep-agent`).
All rights reserved.
