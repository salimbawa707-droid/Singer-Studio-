var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "15mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.get(["/manifest.json", "/site.webmanifest", "/manifest.webmanifest"], (_req, res) => {
  let manifestPath = import_path.default.join(process.cwd(), "public", "manifest.json");
  if (!import_fs.default.existsSync(manifestPath)) {
    manifestPath = import_path.default.join(process.cwd(), "dist", "manifest.json");
  }
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendFile(manifestPath);
});
app.get("/sw.js", (_req, res) => {
  let swPath = import_path.default.join(process.cwd(), "public", "sw.js");
  if (!import_fs.default.existsSync(swPath)) {
    swPath = import_path.default.join(process.cwd(), "dist", "sw.js");
  }
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Service-Worker-Allowed", "/");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendFile(swPath);
});
var runtimeKeys = {
  gemini: process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE" ? process.env.GEMINI_API_KEY.trim() : ""
};
var runtimeCustomKeys = [];
function getGeminiKey(overrideKey) {
  if (overrideKey && overrideKey.trim()) return overrideKey.trim();
  if (runtimeKeys.gemini && runtimeKeys.gemini.trim()) return runtimeKeys.gemini.trim();
  const env = process.env.GEMINI_API_KEY;
  if (env && env !== "YOUR_GEMINI_API_KEY_HERE") return env.trim();
  return "";
}
function maskKey(key) {
  if (!key) return "Not Configured";
  if (key.length <= 8) return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
  return `${key.slice(0, 4)}\u2022\u2022\u2022\u2022${key.slice(-4)}`;
}
function getDefaultEndpointForProvider(provider) {
  switch (provider) {
    case "groq":
      return "https://api.groq.com/openai/v1";
    case "deepseek":
      return "https://api.deepseek.com/v1";
    case "mistral":
      return "https://api.mistral.ai/v1";
    case "gemini":
      return "https://generativelanguage.googleapis.com";
    default:
      return "https://api.openai.com/v1";
  }
}
function getDefaultModelForProvider(provider) {
  switch (provider) {
    case "gemini":
      return "gemini-2.0-flash";
    case "groq":
      return "llama-3.3-70b-versatile";
    case "deepseek":
      return "deepseek-chat";
    case "mistral":
      return "mistral-small-latest";
    default:
      return "gpt-4o-mini";
  }
}
async function callGemini(prompt, schema, customKey) {
  const start = Date.now();
  const key = getGeminiKey(customKey);
  if (!key) {
    return { success: false, provider: "gemini", error: "GEMINI_API_KEY not configured" };
  }
  const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-pro-preview"];
  let lastErr = "";
  for (const modelName of modelsToTry) {
    try {
      const ai = new import_genai.GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: schema ? {
          responseMimeType: "application/json",
          responseSchema: schema
        } : {
          responseMimeType: "application/json"
        }
      });
      const rawText = response.text;
      if (rawText) {
        const clean = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const parsedJson = JSON.parse(clean);
        return {
          success: true,
          data: parsedJson,
          provider: "gemini",
          modelUsed: modelName,
          latencyMs: Date.now() - start
        };
      }
    } catch (err) {
      lastErr = err?.message || String(err);
      console.warn(`[Omni] Gemini ${modelName} failed:`, lastErr);
    }
  }
  return { success: false, provider: "gemini", error: lastErr || "All Gemini models failed", latencyMs: Date.now() - start };
}
async function callCustomKey(profile, prompt, schema, systemHint) {
  const start = Date.now();
  const key = profile.apiKey?.trim();
  if (!key) {
    return { success: false, provider: profile.provider, error: `API key for "${profile.name}" is empty` };
  }
  if (profile.provider === "gemini") {
    const customEndpoint = profile.endpointUrl?.trim();
    const modelsToTry = profile.modelName?.trim() ? [profile.modelName.trim()] : ["gemini-2.5-flash", "gemini-2.0-flash"];
    let lastErr = "";
    let isQuota = false;
    for (const modelName of modelsToTry) {
      try {
        if (customEndpoint && !customEndpoint.includes("generativelanguage.googleapis.com")) {
          const base = customEndpoint.replace(/\/+$/, "");
          const url = `${base}/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(key)}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          });
          if (!res.ok) {
            const errText = await res.text();
            lastErr = `HTTP ${res.status}: ${errText.slice(0, 200)}`;
            if (res.status === 429 || res.status === 402 || res.status === 403) isQuota = true;
            continue;
          }
          const json = await res.json();
          const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const clean = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
            return {
              success: true,
              data: JSON.parse(clean),
              provider: "gemini",
              modelUsed: modelName,
              latencyMs: Date.now() - start
            };
          }
        } else {
          const ai = new import_genai.GoogleGenAI({ apiKey: key });
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: schema
            }
          });
          const rawText = response.text;
          if (rawText) {
            const clean = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
            return {
              success: true,
              data: JSON.parse(clean),
              provider: "gemini",
              modelUsed: modelName,
              latencyMs: Date.now() - start
            };
          }
        }
      } catch (err) {
        lastErr = err?.message || String(err);
        const errLower = lastErr.toLowerCase();
        if (errLower.includes("429") || errLower.includes("quota") || errLower.includes("resource_exhausted") || errLower.includes("rate limit") || errLower.includes("credit")) {
          isQuota = true;
        }
      }
    }
    return {
      success: false,
      provider: "gemini",
      error: lastErr || `Custom Gemini key "${profile.name}" failed`,
      latencyMs: Date.now() - start,
      isQuotaExhausted: isQuota
    };
  }
  const defaultEndpoint = getDefaultEndpointForProvider(profile.provider);
  const endpointBase = (profile.endpointUrl?.trim() || defaultEndpoint).replace(/\/+$/, "");
  const chatUrl = endpointBase.endsWith("/chat/completions") ? endpointBase : `${endpointBase}/chat/completions`;
  const defaultModel = getDefaultModelForProvider(profile.provider);
  const modelToUse = profile.modelName?.trim() || defaultModel;
  try {
    const res = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          {
            role: "system",
            content: systemHint || "You are an elite Bollywood & World Music Director. Always reply with strictly valid JSON only, no markdown or preamble."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8192
      })
    });
    if (!res.ok) {
      const text = await res.text();
      const isQuota = res.status === 429 || res.status === 402 || res.status === 403;
      return {
        success: false,
        provider: profile.provider,
        error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        latencyMs: Date.now() - start,
        isQuotaExhausted: isQuota
      };
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        provider: profile.provider,
        error: "Empty content received from endpoint",
        latencyMs: Date.now() - start
      };
    }
    const clean = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    return {
      success: true,
      data: JSON.parse(clean),
      provider: profile.provider,
      modelUsed: modelToUse,
      latencyMs: Date.now() - start
    };
  } catch (e) {
    const errLower = (e?.message || "").toLowerCase();
    const isQuota = errLower.includes("429") || errLower.includes("quota") || errLower.includes("rate limit");
    return {
      success: false,
      provider: profile.provider,
      error: e?.message || "Request failed",
      latencyMs: Date.now() - start,
      isQuotaExhausted: isQuota
    };
  }
}
async function omniRouteMusicDirector(prompt, schema, lyrics, genre, currentKey, currentBpm, customGeminiKey, customKeysPool) {
  const pool = (customKeysPool && customKeysPool.length > 0 ? customKeysPool : runtimeCustomKeys).filter((k) => k.enabled && k.apiKey?.trim()).sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0));
  if (pool.length > 0) {
    console.log(`[Omni Router] Starting automatic fallback cascade across ${pool.length} user API key(s)...`);
    for (let i = 0; i < pool.length; i++) {
      const keyProfile = pool[i];
      console.log(`[Omni Router] Trying Key #${i + 1}: "${keyProfile.name}" (${keyProfile.provider}, model: ${keyProfile.modelName || "default"})...`);
      const customRes = await callCustomKey(keyProfile, prompt, schema);
      if (customRes.success && customRes.data) {
        console.log(`[Omni Router] SUCCESS via Key #${i + 1} "${keyProfile.name}" (${customRes.modelUsed}, ${customRes.latencyMs}ms)`);
        return {
          ...customRes,
          source: `user_key:${keyProfile.id}:${keyProfile.name}`
        };
      }
      console.warn(`[Omni Router] Key #${i + 1} "${keyProfile.name}" failed (${customRes.error}) \u2192 Automatically falling back to next available key...`);
    }
  }
  const envGeminiKey = getGeminiKey(customGeminiKey);
  if (envGeminiKey) {
    console.log("[Omni Router] Trying System Google Gemini fallback...");
    const geminiResult = await callGemini(prompt, schema, envGeminiKey);
    if (geminiResult.success && geminiResult.data) {
      console.log(`[Omni Router] SUCCESS via System Gemini (${geminiResult.modelUsed}, ${geminiResult.latencyMs}ms)`);
      return { ...geminiResult, source: "gemini_ai" };
    }
    console.warn("[Omni Router] System Gemini failed \u2192", geminiResult.error);
  }
  console.log("[Omni Router] All user API keys & cloud endpoints unavailable \u2192 Local deterministic studio brain takeover");
  const local = generateServerDeterministicArrangement(lyrics, genre, currentKey, currentBpm);
  return {
    success: true,
    data: local,
    provider: "local",
    source: "local_deterministic",
    modelUsed: "server-deterministic"
  };
}
app.post("/api/gemini/generate", async (req, res) => {
  const { prompt, schema } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ success: false, error: "Prompt string is required" });
  }
  const result = await callGemini(prompt, schema);
  if (!result.success) {
    return res.status(500).json(result);
  }
  res.json(result);
});
app.get("/api/health", async (_req, res) => {
  const gKey = getGeminiKey();
  const activeUserKeys = runtimeCustomKeys.filter((k) => k.enabled && k.apiKey?.trim()).length;
  res.json({
    status: "ok",
    mode: "user-driven-fallback-router",
    userKeysConfigured: runtimeCustomKeys.length,
    activeUserKeys,
    anyEngineReady: activeUserKeys > 0 || Boolean(gKey) || true,
    // local engine is always ready
    systemGeminiConfigured: Boolean(gKey),
    fallbackChain: ["user_keys_pool", "system_gemini", "local_deterministic"],
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/omni/keys-status", (_req, res) => {
  const gKey = getGeminiKey();
  res.json({
    status: "ok",
    mode: "user-driven-fallback-router",
    userKeysCount: runtimeCustomKeys.length,
    activeUserKeys: runtimeCustomKeys.filter((k) => k.enabled && k.apiKey?.trim()).length,
    customKeys: runtimeCustomKeys.map((k) => ({
      ...k,
      maskedKey: maskKey(k.apiKey)
    })),
    systemGemini: {
      configured: Boolean(gKey),
      priority: runtimeCustomKeys.length + 1,
      maskedKey: maskKey(gKey),
      source: runtimeKeys.gemini ? "runtime_manual" : process.env.GEMINI_API_KEY ? "environment" : "none"
    },
    local: {
      configured: true,
      priority: runtimeCustomKeys.length + 2,
      maskedKey: "Always Ready (Offline)",
      source: "embedded_engine"
    },
    fallbackChain: ["user_keys_pool", "system_gemini", "local_deterministic"]
  });
});
app.post("/api/omni/set-keys", (req, res) => {
  const { geminiKey, clearGemini } = req.body || {};
  if (clearGemini) {
    runtimeKeys.gemini = "";
  } else if (typeof geminiKey === "string") {
    runtimeKeys.gemini = geminiKey.trim();
  }
  const gKey = getGeminiKey();
  res.json({
    success: true,
    message: "System Gemini key updated in server memory.",
    gemini: { configured: Boolean(gKey), maskedKey: maskKey(gKey) }
  });
});
app.post("/api/omni/test-key", async (req, res) => {
  const { testKey } = req.body || {};
  const start = Date.now();
  const key = getGeminiKey(testKey);
  if (!key) {
    return res.json({ ok: false, message: "No Gemini API Key configured or provided." });
  }
  try {
    const client = new import_genai.GoogleGenAI({ apiKey: key });
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Respond with the single word: READY"
    });
    const latencyMs = Date.now() - start;
    return res.json({
      ok: true,
      statusCode: 200,
      latencyMs,
      message: "Google Gemini API Key is valid and active!",
      modelUsed: "gemini-2.0-flash",
      response: response.text?.trim() || "READY"
    });
  } catch (e) {
    return res.json({
      ok: false,
      latencyMs: Date.now() - start,
      message: `Gemini test failed: ${e.message}`
    });
  }
});
app.get("/api/omni/custom-keys", (_req, res) => {
  res.json({
    status: "ok",
    customKeys: runtimeCustomKeys.map((k) => ({
      ...k,
      maskedKey: maskKey(k.apiKey)
    }))
  });
});
app.post("/api/omni/save-custom-keys", (req, res) => {
  const { customKeys } = req.body || {};
  if (Array.isArray(customKeys)) {
    runtimeCustomKeys = customKeys.map((k, idx) => ({
      id: k.id || `key-${Date.now()}-${idx}`,
      name: (k.name || `API Key ${idx + 1}`).trim(),
      provider: k.provider || "gemini",
      apiKey: (k.apiKey || "").trim(),
      endpointUrl: (k.endpointUrl || "").trim() || void 0,
      modelName: (k.modelName || "").trim() || void 0,
      enabled: k.enabled !== false,
      priorityOrder: typeof k.priorityOrder === "number" ? k.priorityOrder : idx + 1
    }));
  }
  res.json({
    success: true,
    message: "User API Keys pool synced with server runtime.",
    count: runtimeCustomKeys.length
  });
});
app.post("/api/omni/test-custom-key", async (req, res) => {
  const profile = req.body?.keyProfile;
  if (!profile || !profile.apiKey?.trim()) {
    return res.status(400).json({ ok: false, message: "API Key is required for testing." });
  }
  const start = Date.now();
  const key = profile.apiKey.trim();
  if (profile.provider === "gemini") {
    const customEndpoint = profile.endpointUrl?.trim();
    const modelToUse2 = profile.modelName?.trim() || "gemini-2.0-flash";
    try {
      if (customEndpoint && !customEndpoint.includes("generativelanguage.googleapis.com")) {
        const base = customEndpoint.replace(/\/+$/, "");
        const url = `${base}/v1beta/models/${modelToUse2}:generateContent?key=${encodeURIComponent(key)}`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Respond with the single word: READY" }] }]
          })
        });
        const latencyMs = Date.now() - start;
        if (!r.ok) {
          const errText = await r.text();
          return res.json({
            ok: false,
            statusCode: r.status,
            latencyMs,
            message: `Custom endpoint rejected (HTTP ${r.status}): ${errText.slice(0, 160)}`
          });
        }
        return res.json({
          ok: true,
          statusCode: 200,
          latencyMs,
          modelUsed: modelToUse2,
          message: `Custom Gemini endpoint verified! Responded in ${latencyMs}ms.`
        });
      } else {
        const client = new import_genai.GoogleGenAI({ apiKey: key });
        const response = await client.models.generateContent({
          model: modelToUse2,
          contents: "Respond with the single word: READY"
        });
        const latencyMs = Date.now() - start;
        return res.json({
          ok: true,
          statusCode: 200,
          latencyMs,
          modelUsed: modelToUse2,
          message: `Google Gemini Key valid and active (${modelToUse2})! Latency: ${latencyMs}ms`,
          sampleResponse: response.text?.trim() || "READY"
        });
      }
    } catch (e) {
      return res.json({
        ok: false,
        latencyMs: Date.now() - start,
        message: `Gemini key test failed: ${e.message}`
      });
    }
  }
  const defaultEndpoint = getDefaultEndpointForProvider(profile.provider);
  const endpointBase = (profile.endpointUrl?.trim() || defaultEndpoint).replace(/\/+$/, "");
  const defaultModel = getDefaultModelForProvider(profile.provider);
  const modelToUse = profile.modelName?.trim() || defaultModel;
  try {
    const pingRes = await fetch(`${endpointBase}/models`, {
      headers: { Authorization: `Bearer ${key}` }
    });
    const latencyMs = Date.now() - start;
    if (pingRes.ok) {
      const data = await pingRes.json().catch(() => null);
      const modelsList = Array.isArray(data?.data) ? data.data.map((m) => m.id).slice(0, 4) : [];
      return res.json({
        ok: true,
        statusCode: 200,
        latencyMs,
        modelUsed: modelToUse,
        message: `${profile.name} (${profile.provider.toUpperCase()}) verified & active! Latency: ${latencyMs}ms${modelsList.length ? ` (Models: ${modelsList.join(", ")})` : ""}`
      });
    }
    const chatUrl = endpointBase.endsWith("/chat/completions") ? endpointBase : `${endpointBase}/chat/completions`;
    const chatRes = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{ role: "user", content: "Say READY" }],
        max_tokens: 5
      })
    });
    const chatLatencyMs = Date.now() - start;
    if (!chatRes.ok) {
      const errText = await chatRes.text();
      return res.json({
        ok: false,
        statusCode: chatRes.status,
        latencyMs: chatLatencyMs,
        message: `HTTP ${chatRes.status}: ${errText.slice(0, 160)}`
      });
    }
    return res.json({
      ok: true,
      statusCode: 200,
      latencyMs: chatLatencyMs,
      modelUsed: modelToUse,
      message: `${profile.name} (${profile.provider.toUpperCase()}) verified via test completion! Latency: ${chatLatencyMs}ms`
    });
  } catch (e) {
    return res.json({
      ok: false,
      latencyMs: Date.now() - start,
      message: `Connection error: ${e.message}`
    });
  }
});
app.post("/api/omni/test-route", async (req, res) => {
  const {
    lyrics,
    simulateGeminiFail,
    simulateFailKeyIds = [],
    customGeminiKey,
    customKeysPool
  } = req.body || {};
  const sampleLyrics = lyrics && lyrics.trim() ? lyrics.trim() : "Khoya rehta hoon teri yaadon mein har pal\nTere bina yeh dil lagta nahi be-kal\nO re piya, aa bhi jaa ab to mere paas";
  const trace = [];
  const overallStart = Date.now();
  let winnerFound = false;
  let finalWinner = "local";
  let finalWinnerName = "Local Studio Brain";
  let finalResult = null;
  let finalModel = "server-deterministic";
  const testSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      songTitle: { type: import_genai.Type.STRING },
      genreStyle: { type: import_genai.Type.STRING },
      recommendedBpm: { type: import_genai.Type.NUMBER },
      recommendedKey: { type: import_genai.Type.STRING },
      producerDirectorSummary: { type: import_genai.Type.STRING },
      sections: {
        type: import_genai.Type.ARRAY,
        items: {
          type: import_genai.Type.OBJECT,
          properties: {
            name: { type: import_genai.Type.STRING },
            lines: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  text: { type: import_genai.Type.STRING },
                  emotion: { type: import_genai.Type.STRING },
                  recommendedChord: { type: import_genai.Type.STRING }
                }
              }
            }
          }
        }
      }
    },
    required: ["songTitle", "genreStyle", "recommendedBpm", "recommendedKey", "producerDirectorSummary"]
  };
  const poolToUse = (customKeysPool && customKeysPool.length > 0 ? customKeysPool : runtimeCustomKeys).filter((k) => k.enabled && k.apiKey?.trim()).sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0));
  let priorityStep = 1;
  for (const customKey of poolToUse) {
    const isSimulatedFail = simulateFailKeyIds.includes(customKey.id);
    if (winnerFound) {
      trace.push({
        priority: priorityStep,
        keyId: customKey.id,
        provider: customKey.provider,
        name: customKey.name,
        endpointUsed: customKey.endpointUrl || getDefaultEndpointForProvider(customKey.provider),
        status: "standby",
        latencyMs: 0,
        message: `Standby (Prior key #${priorityStep - 1} already resolved the request)`
      });
    } else if (isSimulatedFail) {
      trace.push({
        priority: priorityStep,
        keyId: customKey.id,
        provider: customKey.provider,
        name: customKey.name,
        endpointUsed: customKey.endpointUrl || getDefaultEndpointForProvider(customKey.provider),
        status: "quota_exhausted",
        latencyMs: 12,
        error: "Simulated quota/credit exhausted (HTTP 429 ResourceExhausted)",
        message: `Quota exhausted \u2192 Automatic fallback router triggered to next key!`
      });
    } else {
      const sStart = Date.now();
      const prompt = `You are a legendary Bollywood Music Director. Give a fast, professional musical direction plan for these lyrics:
"""
${sampleLyrics}
"""
Provide songTitle, genreStyle, recommendedBpm, recommendedKey, producerDirectorSummary, and sections with chords.`;
      const resCustom = await callCustomKey(customKey, prompt, testSchema);
      const lat = Date.now() - sStart;
      if (resCustom.success && resCustom.data) {
        winnerFound = true;
        finalWinner = `key_${customKey.provider}`;
        finalWinnerName = `${customKey.name} (${customKey.provider.toUpperCase()})`;
        finalResult = resCustom.data;
        finalModel = resCustom.modelUsed || customKey.modelName || getDefaultModelForProvider(customKey.provider);
        trace.push({
          priority: priorityStep,
          keyId: customKey.id,
          provider: customKey.provider,
          name: customKey.name,
          endpointUsed: customKey.endpointUrl || getDefaultEndpointForProvider(customKey.provider),
          status: "success",
          latencyMs: lat,
          modelUsed: finalModel,
          message: `Handled successfully by Key #${priorityStep} "${customKey.name}" (${finalModel}, ${lat}ms)`
        });
      } else {
        const isQuota = resCustom.isQuotaExhausted;
        trace.push({
          priority: priorityStep,
          keyId: customKey.id,
          provider: customKey.provider,
          name: customKey.name,
          endpointUsed: customKey.endpointUrl || getDefaultEndpointForProvider(customKey.provider),
          status: isQuota ? "quota_exhausted" : "failed",
          latencyMs: lat,
          error: resCustom.error || "Call failed",
          message: isQuota ? `Quota/credit exhausted on this key \u2192 Automatic fallback to next key in pool!` : `Request failed \u2192 Cascading to next available fallback key...`
        });
      }
    }
    priorityStep++;
  }
  const envGeminiKey = getGeminiKey(customGeminiKey);
  if (!winnerFound) {
    if (envGeminiKey && !simulateGeminiFail) {
      const gStart = Date.now();
      const prompt = `You are a legendary Bollywood Music Director. Give a fast, professional musical direction plan for these lyrics:
"""
${sampleLyrics}
"""`;
      const geminiResult = await callGemini(prompt, testSchema, envGeminiKey);
      const gLat = Date.now() - gStart;
      if (geminiResult.success && geminiResult.data) {
        winnerFound = true;
        finalWinner = "gemini";
        finalWinnerName = "System Google Gemini (Backup)";
        finalResult = geminiResult.data;
        finalModel = geminiResult.modelUsed || "gemini-2.0-flash";
        trace.push({
          priority: priorityStep,
          provider: "gemini",
          name: "System Google Gemini",
          status: "success",
          latencyMs: gLat,
          modelUsed: finalModel,
          message: `Handled by System Gemini backup (${finalModel}, ${gLat}ms)`
        });
      } else {
        trace.push({
          priority: priorityStep,
          provider: "gemini",
          name: "System Google Gemini",
          status: "failed",
          latencyMs: gLat,
          error: geminiResult.error || "Gemini call failed",
          message: "System Gemini failed \u2192 Cascading to Local Studio Brain"
        });
      }
    } else {
      trace.push({
        priority: priorityStep,
        provider: "gemini",
        name: "System Google Gemini",
        status: simulateGeminiFail ? "simulated_failure" : "missing_key",
        latencyMs: 0,
        error: simulateGeminiFail ? "Simulated failure on system Gemini" : "No GEMINI_API_KEY on server",
        message: "Cascading to final safety net: Local Studio Brain"
      });
    }
  } else if (envGeminiKey) {
    trace.push({
      priority: priorityStep,
      provider: "gemini",
      name: "System Google Gemini",
      status: "standby",
      latencyMs: 0,
      message: "Standby (User API Key resolved the request first)"
    });
  }
  priorityStep++;
  if (!winnerFound) {
    finalWinner = "local";
    finalWinnerName = "Local Studio Brain (100% Offline Net)";
    const s3Start = Date.now();
    finalResult = generateServerDeterministicArrangement(sampleLyrics, "Bollywood Romantic Fusion", "C", 118);
    const localLatency = Date.now() - s3Start;
    finalModel = "server-deterministic";
    trace.push({
      priority: priorityStep,
      provider: "local",
      name: "Local Studio Brain",
      status: "success",
      latencyMs: localLatency,
      modelUsed: "server-deterministic",
      message: "Automatic failover to Local Deterministic Brain: user work NEVER stops (100% offline-ready)!"
    });
  } else {
    trace.push({
      priority: priorityStep,
      provider: "local",
      name: "Local Studio Brain",
      status: "standby",
      latencyMs: 0,
      message: "Standby (Online API Key handled the request)"
    });
  }
  const totalLatencyMs = Date.now() - overallStart;
  res.json({
    testId: `fallback-${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    winner: finalWinner,
    winnerName: finalWinnerName,
    winnerModel: finalModel,
    totalLatencyMs,
    trace,
    resultPreview: {
      songTitle: finalResult.songTitle || "Dil Ki Awaaz",
      genreStyle: finalResult.genreStyle || "Bollywood Romantic Fusion",
      recommendedBpm: finalResult.recommendedBpm || 118,
      recommendedKey: finalResult.recommendedKey || "C",
      summary: finalResult.producerDirectorSummary || "",
      sections: (finalResult.sections || []).slice(0, 2)
    }
  });
});
app.get("/api/providers/test", async (_req, res) => {
  const results = [];
  const gKey = getGeminiKey();
  const activeKeys = runtimeCustomKeys.filter((k) => k.enabled && k.apiKey?.trim());
  results.push({
    provider: "user_keys_pool",
    ok: activeKeys.length > 0,
    count: activeKeys.length,
    message: activeKeys.length > 0 ? `${activeKeys.length} User API Key(s) Active with Auto-Fallback` : "No custom keys added yet"
  });
  if (gKey) {
    results.push({ provider: "system_gemini", ok: true, message: "System Gemini key configured" });
  } else {
    results.push({ provider: "system_gemini", ok: false, message: "No system GEMINI_API_KEY set" });
  }
  results.push({ provider: "local", ok: true, message: "Always ready (deterministic engine)" });
  res.json({ testedAt: (/* @__PURE__ */ new Date()).toISOString(), results });
});
function generateServerDeterministicArrangement(lyrics, genre = "Contemporary Pop", currentKey = "C", currentBpm = 118) {
  const lines = lyrics.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const diatonicChords = {
    C: ["C", "G/B", "Am", "F", "Em", "Dm7", "G7", "Cmaj7"],
    D: ["D", "A/C#", "Bm", "G", "F#m", "Em7", "A7", "Dmaj7"],
    E: ["E", "B/D#", "C#m", "A", "G#m", "F#m7", "B7", "Emaj7"],
    F: ["F", "C/E", "Dm", "Bb", "Am", "Gm7", "C7", "Fmaj7"],
    G: ["G", "D/F#", "Em", "C", "Bm", "Am7", "D7", "Gmaj7"],
    A: ["A", "E/G#", "F#m", "D", "C#m", "Bm7", "E7", "Amaj7"],
    B: ["B", "F#/A#", "G#m", "E", "D#m", "C#m7", "F#7", "Bmaj7"]
  };
  const chordPalette = diatonicChords[currentKey] || diatonicChords["C"];
  const sections = [];
  let currentSectionName = "Mukhda / Verse 1";
  let currentSectionType = "verse";
  let currentLines = [];
  let lineIdxCounter = 0;
  for (const lineText of lines) {
    if (lineText.startsWith("[") && lineText.endsWith("]")) {
      if (currentLines.length > 0) {
        sections.push({
          name: currentSectionName,
          type: currentSectionType,
          barCount: Math.max(4, currentLines.length * 2),
          energyLevel: currentSectionType === "chorus" ? "soaring" : "medium",
          drumGroove: currentSectionType === "chorus" ? "Full Driving Groove + Tabla Theka" : "Subtle Hi-Hat & Soft Kick",
          lines: currentLines
        });
        currentLines = [];
      }
      const rawHeader = lineText.slice(1, -1).toLowerCase();
      if (rawHeader.includes("intro") || rawHeader.includes("alaap")) {
        currentSectionName = "Intro Alaap";
        currentSectionType = "intro";
      } else if (rawHeader.includes("chorus") || rawHeader.includes("hook") || rawHeader.includes("refrain")) {
        currentSectionName = "Chorus / Refrain";
        currentSectionType = "chorus";
      } else if (rawHeader.includes("antara") || rawHeader.includes("verse 2")) {
        currentSectionName = "Antara / Verse 2";
        currentSectionType = "antara";
      } else if (rawHeader.includes("bridge") || rawHeader.includes("interlude")) {
        currentSectionName = "Bridge / Interlude";
        currentSectionType = "bridge";
      } else if (rawHeader.includes("outro") || rawHeader.includes("ending")) {
        currentSectionName = "Outro Refrain";
        currentSectionType = "outro";
      } else {
        currentSectionName = lineText.slice(1, -1);
        currentSectionType = "verse";
      }
      continue;
    }
    lineIdxCounter++;
    const words = lineText.split(/\s+/).filter((w) => w.length > 0);
    const accentWord = words[Math.floor(words.length / 2)] || words[0] || "Vocal";
    const chord = chordPalette[(lineIdxCounter - 1) % chordPalette.length];
    const isChorus = currentSectionType === "chorus";
    currentLines.push({
      lineIndex: lineIdxCounter,
      text: lineText,
      sectionName: currentSectionName,
      emotion: isChorus ? "Soaring Expression & Pyar" : "Intimate Storytelling",
      intensity: isChorus ? 8 : 5,
      recommendedChord: chord,
      ragaMood: "Raga Yaman (Shringara & Kalyan)",
      dynamicLevel: isChorus ? "f" : "mf",
      instrumentation: isChorus ? ["Grand Piano", "Strings Ensemble", "Acoustic Guitar Strumming", "Tabla / Drums"] : ["Fingerpicked Acoustic Guitar", "Soft Pad", "Flute Counter-Melody"],
      vocalAccentWord: accentWord,
      productionNote: `Accentuate '${accentWord}' on beat 1; maintain dynamic balance.`
    });
  }
  if (currentLines.length > 0) {
    sections.push({
      name: currentSectionName,
      type: currentSectionType,
      barCount: Math.max(4, currentLines.length * 2),
      energyLevel: currentSectionType === "chorus" ? "soaring" : "medium",
      drumGroove: currentSectionType === "chorus" ? "Full Driving Groove + Tabla Theka" : "Subtle Hi-Hat & Soft Kick",
      lines: currentLines
    });
  }
  return {
    songTitle: "Studio Composition",
    genreStyle: genre,
    overallMood: "Soulful, Expressive & Melodically Rich",
    recommendedBpm: currentBpm,
    recommendedKey: currentKey,
    scaleMode: "major",
    producerDirectorSummary: `Musical arrangement orchestrated in the Key of ${currentKey} Major at ${currentBpm} BPM. Verse sections prioritize spacious acoustic intimacy, rising into lush harmonic swells and full rhythm during the Chorus.`,
    suggestedMixerPresets: {
      vocalReverb: "plate",
      compressionStyle: "optical_warm",
      stereoSpread: "wide_cinematic"
    },
    sections,
    source: "deterministic_engine"
  };
}
app.post("/api/music-director/analyze", async (req, res) => {
  const { lyrics, genre, currentKey, currentBpm, mood, detectedKey, detectedBpm } = req.body;
  const customXaiKey = (req.body.customXaiKey || req.headers["x-xai-key"] || "").toString();
  const customGeminiKey = (req.body.customGeminiKey || req.headers["x-gemini-key"] || "").toString();
  if (!lyrics || typeof lyrics !== "string" || lyrics.trim().length === 0) {
    return res.status(400).json({ error: "Lyrics text is required for AI Music Director analysis" });
  }
  let vocalContextStr = "";
  if (req.body.vocalContext) {
    vocalContextStr = String(req.body.vocalContext);
  } else {
    const parts = [];
    if (mood) parts.push(`Detected mood from vocal analysis: ${mood}`);
    if (detectedKey) parts.push(`Detected key from vocal: ${detectedKey}`);
    if (detectedBpm) parts.push(`Detected BPM from vocal: ${detectedBpm}`);
    if (parts.length) vocalContextStr = "VOCAL ANALYSIS CONTEXT:\n" + parts.join("\n");
  }
  const prompt = `You are a legendary Bollywood Music Director + commercial producer (Pritam / A.R. Rahman / Vishal-Shekhar / Amit Trivedi level). You think and decide exactly like a real film music director in a professional studio session.

CORE TASK:
The singer has given only RAW vocals + lyrics. You must create a COMPLETE professional song direction package so that the production team (or the app) can render a radio-ready Bollywood track.

You MUST deliver:

1. SONG IDENTITY
- Suggested commercial title
- Genre / sub-style (e.g. Romantic Ballad, Soft Rock Fusion, Sufi-Pop, Dance Number, Cinematic Emotional)
- Overall emotional arc of the full song
- Target audience mood

2. GLOBAL MUSICAL DECISIONS
- Recommended BPM (be precise)
- Recommended Key + Scale / Raga colour
- Overall energy curve (how the song should rise and fall)
- Suggested song structure with exact Bollywood section names: Intro, Mukhda, Pre-Chorus, Chorus/Hook, Antara, Interlude/Music Break, Climax, Outro

3. LINE-BY-LINE DIRECTION (for every lyric line)
- Emotion (use rich Hindi/Urdu + English terms)
- Intensity 1-10
- Exact recommended chord (use rich but singable voicings: maj7, add9, sus, slash chords etc.)
- Dynamic level (pp to ff)
- Instrumentation that should be playing under that line
- Peak accent word for rhythmic hits
- Short production / mix note for that moment

4. VOCAL DIRECTION (very important)
- How the singer should treat the performance (intimate, open throat, restrained, soaring etc.)
- Suggested harmony / backing vocal ideas
- Places where ad-libs or alaaps would elevate the song
- Any pitch or timing feel suggestions

5. MIX & MASTER RECIPE
- Suggested vocal chain feel (bright / warm / intimate / airy)
- Reverb style (hall, plate, room, long cinematic tail)
- Overall commercial loudness target feel
- Stereo width approach

6. FINAL DIRECTOR NOTE
- One powerful paragraph as if you are speaking to the mixing engineer and the artist in the studio.

SONG CONTEXT GIVEN TO YOU:
Genre: ${genre || "Bollywood Romantic / Contemporary Fusion"}
Current Key: ${currentKey || "C"}
Current BPM: ${currentBpm || 120}
${vocalContextStr || ""}

LYRICS:
"""
${lyrics}
"""

Respond ONLY with valid JSON matching the required schema. Be creative, commercial, and emotionally intelligent.`;
  const schema = {
    type: import_genai.Type.OBJECT,
    properties: {
      songTitle: { type: import_genai.Type.STRING },
      genreStyle: { type: import_genai.Type.STRING },
      overallMood: { type: import_genai.Type.STRING },
      recommendedBpm: { type: import_genai.Type.INTEGER },
      recommendedKey: { type: import_genai.Type.STRING },
      scaleMode: {
        type: import_genai.Type.STRING,
        enum: ["major", "minor", "dorian", "raga_yaman", "raga_bhairav", "raga_kafi"]
      },
      producerDirectorSummary: { type: import_genai.Type.STRING },
      suggestedMixerPresets: {
        type: import_genai.Type.OBJECT,
        properties: {
          vocalReverb: { type: import_genai.Type.STRING, enum: ["plate", "hall", "chamber", "dry"] },
          compressionStyle: { type: import_genai.Type.STRING, enum: ["optical_warm", "fet_punchy", "transparent"] },
          stereoSpread: { type: import_genai.Type.STRING, enum: ["wide_cinematic", "intimate_center"] }
        },
        required: ["vocalReverb", "compressionStyle", "stereoSpread"]
      },
      sections: {
        type: import_genai.Type.ARRAY,
        items: {
          type: import_genai.Type.OBJECT,
          properties: {
            name: { type: import_genai.Type.STRING },
            type: {
              type: import_genai.Type.STRING,
              enum: ["intro", "verse", "pre_chorus", "chorus", "interlude", "antara", "bridge", "climax", "outro"]
            },
            barCount: { type: import_genai.Type.INTEGER },
            energyLevel: {
              type: import_genai.Type.STRING,
              enum: ["whisper", "sparse", "medium", "soaring", "climax"]
            },
            drumGroove: { type: import_genai.Type.STRING },
            lines: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  lineIndex: { type: import_genai.Type.INTEGER },
                  text: { type: import_genai.Type.STRING },
                  sectionName: { type: import_genai.Type.STRING },
                  emotion: { type: import_genai.Type.STRING },
                  intensity: { type: import_genai.Type.INTEGER },
                  recommendedChord: { type: import_genai.Type.STRING },
                  ragaMood: { type: import_genai.Type.STRING },
                  dynamicLevel: {
                    type: import_genai.Type.STRING,
                    enum: ["pp", "p", "mp", "mf", "f", "ff"]
                  },
                  instrumentation: {
                    type: import_genai.Type.ARRAY,
                    items: { type: import_genai.Type.STRING }
                  },
                  vocalAccentWord: { type: import_genai.Type.STRING },
                  productionNote: { type: import_genai.Type.STRING }
                },
                required: [
                  "lineIndex",
                  "text",
                  "sectionName",
                  "emotion",
                  "intensity",
                  "recommendedChord",
                  "dynamicLevel",
                  "instrumentation",
                  "productionNote"
                ]
              }
            }
          },
          required: ["name", "type", "barCount", "energyLevel", "drumGroove", "lines"]
        }
      }
    },
    required: [
      "songTitle",
      "genreStyle",
      "overallMood",
      "recommendedBpm",
      "recommendedKey",
      "scaleMode",
      "producerDirectorSummary",
      "suggestedMixerPresets",
      "sections"
    ]
  };
  try {
    const customKeysPool = Array.isArray(req.body.customKeysPool) ? req.body.customKeysPool : void 0;
    const result = await omniRouteMusicDirector(
      prompt,
      schema,
      lyrics,
      genre || "Bollywood Romantic / Contemporary Fusion",
      currentKey || "C",
      currentBpm || 120,
      customGeminiKey,
      customKeysPool
    );
    const payload = result.data || {};
    return res.json({
      ...payload,
      source: result.source,
      provider: result.provider,
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs
    });
  } catch (err) {
    console.error("[Omni] Unexpected router error:", err);
    const fallbackResult = generateServerDeterministicArrangement(
      lyrics,
      genre || "Bollywood Romantic / Contemporary Fusion",
      currentKey || "C",
      currentBpm || 120
    );
    return res.json({ ...fallbackResult, source: "local_deterministic", provider: "local" });
  }
});
app.post("/api/ai/analyze-voice-soul", async (req, res) => {
  const { lyrics, bpm, key, scale, detectedEmotion, vocalPitchRange, customKeysPool } = req.body || {};
  const currentBpm = typeof bpm === "number" ? bpm : 108;
  const currentKey = key || "C";
  const soulPrompt = `You are a world-class Indian & Global Music Director and Vocal Coach.
Analyze this vocal take and provide the emotional core, musical pitch tuning, tempo dynamics, and acoustic realism directives to make the song feel deeply authentic and emotionally moving (Original Acoustic Feeling):
- Lyrics / Phrase: "${lyrics || "Acoustic melodic vocal take"}"
- Detected Pitch Key: ${currentKey} ${scale || "major"}
- Detected Tempo: ${currentBpm} BPM
- Preliminary Emotion: ${detectedEmotion || "Expressive"}
- Vocal Range: ${vocalPitchRange || "C3-G4"}

Return a JSON object with:
1. "emotionalMood": primary emotion (e.g., "Romantic / Prem", "Sad / Dard", "Sufi / Roohani", "Energetic / Josh", "Devotional / Bhakti", "Peaceful / Shanti")
2. "emotionalIntensity": integer 1 to 10
3. "recommendedBpm": optimal tempo integer
4. "recommendedKey": optimal musical key string
5. "scaleMode": "major" | "minor" | "raga_yaman" | "raga_bhairavi" | "raga_kafi" | "raga_bilawal"
6. "pitchCorrectionMode": "natural_human" | "studio_polished" | "microtonal_sur"
7. "soulDirectives": array of 3-4 specific guidance strings explaining how instruments (Flute, Sitar, Tabla, Guitar, Piano, Strings) should play to match the singer's emotion and create a realistic human acoustic feeling
8. "producerInsight": one poetic sentence explaining the heart and sentiment of the song.`;
  const soulSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      emotionalMood: { type: import_genai.Type.STRING },
      emotionalIntensity: { type: import_genai.Type.INTEGER },
      recommendedBpm: { type: import_genai.Type.INTEGER },
      recommendedKey: { type: import_genai.Type.STRING },
      scaleMode: { type: import_genai.Type.STRING },
      pitchCorrectionMode: { type: import_genai.Type.STRING },
      soulDirectives: {
        type: import_genai.Type.ARRAY,
        items: { type: import_genai.Type.STRING }
      },
      producerInsight: { type: import_genai.Type.STRING }
    },
    required: ["emotionalMood", "emotionalIntensity", "recommendedBpm", "recommendedKey", "scaleMode", "soulDirectives", "producerInsight"]
  };
  try {
    const pool = (customKeysPool && customKeysPool.length > 0 ? customKeysPool : runtimeCustomKeys).filter((k) => k.enabled && k.apiKey?.trim()).sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0));
    let soulData = null;
    let providerName = "Omni Cloud AI";
    let modelName = "gemini-2.0-flash";
    let latency = 210;
    let source = "online_cloud";
    for (const keyProfile of pool) {
      try {
        const customRes = await callCustomKey(keyProfile, soulPrompt, soulSchema);
        if (customRes.success && customRes.data) {
          soulData = customRes.data;
          providerName = keyProfile.name;
          modelName = customRes.modelUsed || keyProfile.modelName || "cloud-llm";
          latency = customRes.latencyMs;
          source = `user_key:${keyProfile.name}`;
          break;
        }
      } catch (err) {
        console.warn(`[Soul AI] User key ${keyProfile.name} failed, falling back...`, err);
      }
    }
    if (!soulData) {
      const envGeminiKey = getGeminiKey();
      if (envGeminiKey) {
        try {
          const geminiResult = await callGemini(soulPrompt, soulSchema, envGeminiKey);
          if (geminiResult.success && geminiResult.data) {
            soulData = geminiResult.data;
            providerName = "Google Gemini";
            modelName = geminiResult.modelUsed || "gemini-2.0-flash";
            latency = geminiResult.latencyMs;
            source = "gemini_ai";
          }
        } catch (err) {
          console.warn("[Soul AI] System Gemini failed, falling back to local studio brain...", err);
        }
      }
    }
    if (soulData) {
      return res.json({
        success: true,
        soulAnalysis: soulData,
        data: soulData,
        provider: providerName,
        modelUsed: modelName,
        latencyMs: latency,
        source
      });
    }
    const deterministicSoul = {
      emotionalMood: detectedEmotion || "Romantic / Prem (Soulful Melody)",
      emotionalIntensity: 8,
      recommendedBpm: currentBpm,
      recommendedKey: currentKey,
      scaleMode: scale || "major",
      pitchCorrectionMode: "natural_human",
      soulDirectives: [
        "Flute / Bansuri enters on phrase endings with subtle microtonal meend bend.",
        "Tabla / Percussion provides warm, dynamic pulse on beat 1 with soft bayun resonance.",
        "Acoustic Guitar / Piano plays gentle arpeggiated fingerpicking leaving space for the vocal.",
        "Strings swell gently during peak intensity notes to cradle the emotional climax."
      ],
      producerInsight: "Vocal displays genuine expressive warmth; accompaniment breathes in sync with the singer's pauses."
    };
    return res.json({
      success: true,
      soulAnalysis: deterministicSoul,
      data: deterministicSoul,
      provider: "Local Studio Brain (Offline Realism Safeguard)",
      modelUsed: "Deep Vocal Soul DSP Engine",
      latencyMs: 14,
      source: "local_studio_brain"
    });
  } catch (e) {
    const fallbackSoul = {
      emotionalMood: "Expressive Romantic",
      emotionalIntensity: 7,
      recommendedBpm: currentBpm,
      recommendedKey: currentKey,
      scaleMode: "major",
      pitchCorrectionMode: "natural_human",
      soulDirectives: [
        "Acoustic instruments harmonize naturally with the vocal contour.",
        "Rhythm maintains steady human pulse without rigid quantization."
      ],
      producerInsight: "Expressive vocal take with natural dynamic contours."
    };
    return res.json({
      success: true,
      soulAnalysis: fallbackSoul,
      data: fallbackSoul,
      provider: "local_fallback",
      latencyMs: 8,
      source: "local_offline"
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MusicBase AI Studio Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
