# Surge Studio / MusicBase — v4 Advanced Online Omni Music Director

**Core Idea (never changed):**  
User only records raw vocals → App does **everything else** → Professional Bollywood-style song.

## What makes v4 “Real Music Director” level

### Omni Multi-Provider AI (Online First)
| Priority | Provider     | Role                          |
|----------|--------------|-------------------------------|
| 1        | xAI Grok     | Primary Music Director        |
| 2        | Google Gemini| Automatic fallback            |
| 3        | Local engine | Final safety net              |

Automatic fallback when any provider fails / rate-limits / token ends.

### Advanced Music Director Capabilities (v4)
- Full song identity & commercial title suggestion
- Precise BPM + Key + Raga/Scale decisions
- Bollywood structure (Mukhda, Antara, Pre-Chorus, Chorus, Interlude, Climax, Outro)
- Line-by-line emotional + chord + instrumentation direction
- **Vocal Direction** (how the singer should perform, harmony ideas, ad-lib places)
- **Mix & Master Recipe** (reverb style, vocal chain feel, commercial loudness)
- Energy curve of the entire song
- Final director note written as if speaking in a real studio

The AI now receives vocal analysis context (mood, key, BPM) so decisions are more musical and personal to the singer’s take.

### User Flow (still one simple action)
1. User sings / records raw song
2. App cleans + analyzes the voice
3. Advanced Omni Music Director creates the full professional direction package
4. Local synthesizer + mixer follows the direction and renders the song
5. Export

## Quick Start

```bash
npm install
cp .env.example .env
# Add keys:
# XAI_API_KEY=...
# GEMINI_API_KEY=...

npm run dev
```

### Test APIs
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/providers/test
```

## Environment
```env
XAI_API_KEY=your_xai_key
GEMINI_API_KEY=your_gemini_key
APP_URL=http://localhost:3000
```

## Honest Status
- **Creative Direction / Arrangement intelligence** → Real Music Director level (thanks to Omni AI)
- **Final audio realism** → Still limited by local algorithmic synthesizer (not full sample libraries or neural audio generation yet)

This is currently the strongest practical version of the original core idea.

Version: 4.0.0-advanced-director
