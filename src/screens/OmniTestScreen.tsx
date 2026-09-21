import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Key, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Music, 
  ShieldCheck, 
  Layers, 
  Play, 
  Activity, 
  Trash2, 
  Plus, 
  Edit2, 
  ArrowUp, 
  ArrowDown, 
  ChevronRight,
  HelpCircle,
  Flame,
  Check
} from 'lucide-react';
import { ScreenId, StudioProject } from '../types/audio';
import { CustomApiKeyProfile, OmniProviderType, TraceStep, RouteTestResult } from '../types/omni';

interface OmniTestScreenProps {
  onNavigate: (screen: ScreenId) => void;
  currentProject?: StudioProject | null;
}

export const OmniTestScreen: React.FC<OmniTestScreenProps> = ({ onNavigate, currentProject }) => {
  // User's custom API keys pool
  const [customKeys, setCustomKeys] = useState<CustomApiKeyProfile[]>([]);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [isAddingNewKey, setIsAddingNewKey] = useState(false);

  // Form state for Add/Edit Custom Key
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState<OmniProviderType>('gemini');
  const [formApiKey, setFormApiKey] = useState('');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formModel, setFormModel] = useState('');
  const [showFormApiKey, setShowFormApiKey] = useState(false);

  // Fallback Simulation & Router Test
  const [sampleLyrics, setSampleLyrics] = useState(
    "Khoya rehta hoon teri yaadon mein har pal\nTere bina yeh dil lagta nahi be-kal\nO re piya, aa bhi jaa ab to mere paas\nTu hi to hai meri jeene ki har ek aas"
  );
  const [simulateFailKeyIds, setSimulateFailKeyIds] = useState<string[]>([]);
  const [runningRouteTest, setRunningRouteTest] = useState(false);
  const [routeTestResult, setRouteTestResult] = useState<RouteTestResult | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Load saved keys from localStorage on mount & sync to server runtime
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let loadedPool: CustomApiKeyProfile[] = [];
      try {
        const rawPool = localStorage.getItem('surge_custom_api_keys');
        if (rawPool) {
          loadedPool = JSON.parse(rawPool);
          // Sort by priority order
          loadedPool.sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0));
          setCustomKeys(loadedPool);
        }
      } catch (e) {
        console.warn('Error reading custom keys pool:', e);
      }

      if (loadedPool.length > 0) {
        syncCustomKeysToServer(loadedPool);
      }
    }
  }, []);

  const syncCustomKeysToServer = async (pool: CustomApiKeyProfile[]) => {
    try {
      await fetch('/api/omni/save-custom-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customKeys: pool }),
      });
    } catch (err) {
      console.warn('Sync keys error:', err);
    }
  };

  const showFeedback = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Persist updated keys to both localStorage and server runtime
  const persistCustomKeys = async (updated: CustomApiKeyProfile[], successText?: string) => {
    // Ensure priorityOrder is sequential 1..N
    const reordered = updated.map((k, idx) => ({
      ...k,
      priorityOrder: idx + 1,
    }));

    setCustomKeys(reordered);
    if (typeof window !== 'undefined') {
      localStorage.setItem('surge_custom_api_keys', JSON.stringify(reordered));
    }
    await syncCustomKeysToServer(reordered);
    if (successText) showFeedback(successText);
  };

  // Quick Preset Adders
  const handleAddPresetKey = (provider: OmniProviderType) => {
    const existingOfProvider = customKeys.filter(k => k.provider === provider).length;
    const num = existingOfProvider + 1;

    let defaultName = '';
    let defaultEndpoint = '';
    let defaultModel = '';

    switch (provider) {
      case 'gemini':
        defaultName = `Gemini Key #${num} ${num === 1 ? '(Primary)' : '(Backup)'}`;
        defaultEndpoint = 'https://generativelanguage.googleapis.com';
        defaultModel = 'gemini-2.0-flash';
        break;
      case 'groq':
        defaultName = `Groq Llama-3.3 Key #${num}`;
        defaultEndpoint = 'https://api.groq.com/openai/v1';
        defaultModel = 'llama-3.3-70b-versatile';
        break;
      case 'deepseek':
        defaultName = `DeepSeek Chat Key #${num}`;
        defaultEndpoint = 'https://api.deepseek.com/v1';
        defaultModel = 'deepseek-chat';
        break;
      case 'mistral':
        defaultName = `Mistral Small Key #${num}`;
        defaultEndpoint = 'https://api.mistral.ai/v1';
        defaultModel = 'mistral-small-latest';
        break;
      case 'openai_compatible':
        defaultName = `OpenAI Compatible Proxy #${num}`;
        defaultEndpoint = 'https://api.openai.com/v1';
        defaultModel = 'gpt-4o-mini';
        break;
      case 'custom':
        defaultName = `Custom AI Endpoint #${num}`;
        defaultEndpoint = '';
        defaultModel = '';
        break;
    }

    setEditingKeyId(null);
    setIsAddingNewKey(true);
    setFormName(defaultName);
    setFormProvider(provider);
    setFormApiKey('');
    setFormEndpoint(defaultEndpoint);
    setFormModel(defaultModel);
    setShowFormApiKey(false);
  };

  // Quick Batch Setup: Add 4 Gemini Key slots for users with multiple free keys
  const handleAddGeminiBatch = () => {
    const existingGeminiCount = customKeys.filter(k => k.provider === 'gemini').length;
    const countToAdd = Math.max(1, 4 - existingGeminiCount);
    const newTemplates: CustomApiKeyProfile[] = [];

    for (let i = 1; i <= countToAdd; i++) {
      const slotNum = existingGeminiCount + i;
      newTemplates.push({
        id: `gemini-key-${Date.now()}-${i}`,
        name: `Gemini Key #${slotNum} ${slotNum === 1 ? '(Primary)' : slotNum === 2 ? '(Backup 1)' : slotNum === 3 ? '(Backup 2)' : '(Emergency Reserve)'}`,
        provider: 'gemini',
        apiKey: '',
        endpointUrl: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-2.0-flash',
        enabled: true,
        priorityOrder: customKeys.length + i,
        lastTestStatus: 'untested',
      });
    }

    const merged = [...customKeys, ...newTemplates];
    persistCustomKeys(merged, `Added ${newTemplates.length} Gemini API Key slot(s). Paste your keys and test them!`);
  };

  // Save Form (Add or Edit)
  const handleSaveFormCustomKey = () => {
    if (!formApiKey.trim()) {
      alert('Please enter an API Key.');
      return;
    }

    if (editingKeyId) {
      const updated = customKeys.map(k => {
        if (k.id === editingKeyId) {
          return {
            ...k,
            name: formName.trim() || `${formProvider.toUpperCase()} Key`,
            provider: formProvider,
            apiKey: formApiKey.trim(),
            endpointUrl: formEndpoint.trim() || undefined,
            modelName: formModel.trim() || undefined,
          };
        }
        return k;
      });
      persistCustomKeys(updated, 'API Key profile updated!');
      setEditingKeyId(null);
    } else {
      const newProfile: CustomApiKeyProfile = {
        id: `key-${Date.now()}`,
        name: formName.trim() || `${formProvider.toUpperCase()} Key #${customKeys.length + 1}`,
        provider: formProvider,
        apiKey: formApiKey.trim(),
        endpointUrl: formEndpoint.trim() || undefined,
        modelName: formModel.trim() || undefined,
        enabled: true,
        priorityOrder: customKeys.length + 1,
        lastTestStatus: 'untested',
      };
      persistCustomKeys([...customKeys, newProfile], `Key "${newProfile.name}" added to Automatic Fallback Router!`);
      setIsAddingNewKey(false);
    }

    // Reset Form
    setFormName('');
    setFormApiKey('');
    setFormEndpoint('');
    setFormModel('');
  };

  const handleStartEdit = (key: CustomApiKeyProfile) => {
    setEditingKeyId(key.id);
    setFormName(key.name);
    setFormProvider(key.provider);
    setFormApiKey(key.apiKey);
    setFormEndpoint(key.endpointUrl || '');
    setFormModel(key.modelName || '');
    setIsAddingNewKey(false);
    setShowFormApiKey(false);
  };

  const handleDeleteKey = (id: string) => {
    const updated = customKeys.filter(k => k.id !== id);
    persistCustomKeys(updated, 'API Key removed from router.');
    setSimulateFailKeyIds(prev => prev.filter(kId => kId !== id));
  };

  const handleToggleKeyEnabled = (id: string) => {
    const updated = customKeys.map(k => {
      if (k.id === id) {
        return { ...k, enabled: !k.enabled };
      }
      return k;
    });
    persistCustomKeys(updated);
  };

  // Move Key Up in Priority
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...customKeys];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    persistCustomKeys(copy, `Priority updated: "${copy[index - 1].name}" is now tried earlier!`);
  };

  // Move Key Down in Priority
  const handleMoveDown = (index: number) => {
    if (index === customKeys.length - 1) return;
    const copy = [...customKeys];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    persistCustomKeys(copy, `Priority updated: "${copy[index + 1].name}" is now tried later!`);
  };

  // Direct client-side verification for standalone APK or client-only environments
  const testCustomKeyInBrowser = async (profile: CustomApiKeyProfile): Promise<{ ok: boolean; message: string; latencyMs: number }> => {
    const start = Date.now();
    const apiKey = profile.apiKey?.trim();
    if (!apiKey) {
      return { ok: false, message: 'API Key is empty', latencyMs: 0 };
    }

    const model = profile.modelName?.trim() || 'gemini-2.5-flash';
    const customEndpoint = profile.endpointUrl?.trim();

    let url: string;
    if (customEndpoint && !customEndpoint.includes("generativelanguage.googleapis.com")) {
      const base = customEndpoint.replace(/\/+$/, "");
      url = `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    } else {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    }

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping test' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });
      const latencyMs = Date.now() - start;
      if (resp.ok) {
        return { ok: true, message: 'Key active & verified (Direct API)', latencyMs };
      } else {
        const errJson = await resp.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${resp.status} ${resp.statusText}`;
        return { ok: false, message: `API Error: ${msg}`, latencyMs };
      }
    } catch (err: any) {
      return { ok: false, message: `Connection error: ${err.message}`, latencyMs: Date.now() - start };
    }
  };

  const runClientSideRouteTest = async (
    lyrics: string,
    simulateFailKeyIds: string[],
    keysPool: CustomApiKeyProfile[]
  ): Promise<RouteTestResult> => {
    const trace: TraceStep[] = [];
    const start = Date.now();
    const activeKeys = keysPool.filter(k => k.enabled && k.apiKey.trim());

    let winner = 'local_fallback';
    let winnerName = 'Local Algorithmic Fallback Engine';
    let winnerModel = 'Local Engine (Offline)';
    let resultPreview = {
      songTitle: "Dil Ki Awaaz",
      genreStyle: "Bollywood Ballad",
      recommendedBpm: 92,
      recommendedKey: "C Minor",
      summary: "Client-side fallback generated plan",
      sections: []
    };

    for (let idx = 0; idx < activeKeys.length; idx++) {
      const keyProfile = activeKeys[idx];
      if (simulateFailKeyIds.includes(keyProfile.id)) {
        trace.push({
          priority: idx + 1,
          keyId: keyProfile.id,
          provider: keyProfile.provider,
          name: keyProfile.name,
          status: 'simulated_failure',
          message: 'Simulated Quota/Failure (Forced by Lab test)',
        });
        continue;
      }

      const testRes = await testCustomKeyInBrowser(keyProfile);
      if (testRes.ok) {
        trace.push({
          priority: idx + 1,
          keyId: keyProfile.id,
          provider: keyProfile.provider,
          name: keyProfile.name,
          status: 'success',
          latencyMs: testRes.latencyMs,
          message: testRes.message,
          modelUsed: keyProfile.modelName || 'gemini-2.5-flash',
        });
        winner = keyProfile.id;
        winnerName = keyProfile.name;
        winnerModel = keyProfile.modelName || 'gemini-2.5-flash';
        break;
      } else {
        trace.push({
          priority: idx + 1,
          keyId: keyProfile.id,
          provider: keyProfile.provider,
          name: keyProfile.name,
          status: 'failed',
          latencyMs: testRes.latencyMs,
          message: testRes.message,
          error: testRes.message,
        });
      }
    }

    if (winner === 'local_fallback') {
      trace.push({
        priority: trace.length + 1,
        keyId: 'local_fallback',
        provider: 'local',
        name: 'Local Algorithmic Engine',
        status: 'success',
        latencyMs: 12,
        message: 'Offline algorithmic fallback active',
        modelUsed: 'Local Rules Engine',
      });
    }

    return {
      testId: `lab-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      winner,
      winnerName,
      winnerModel,
      totalLatencyMs: Date.now() - start,
      trace,
      resultPreview,
    };
  };

  // Test single key live
  const handleTestSingleKey = async (profile: CustomApiKeyProfile) => {
    if (!profile.apiKey?.trim()) {
      alert('Please enter an API key for this slot before testing.');
      return;
    }
    setTestingKeyId(profile.id);
    try {
      let data: { ok: boolean; message: string; latencyMs: number };
      try {
        const res = await fetch('/api/omni/test-custom-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyProfile: profile }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          throw new Error('Server endpoint not available in APK');
        }
      } catch {
        data = await testCustomKeyInBrowser(profile);
      }

      const updated = customKeys.map(k => {
        if (k.id === profile.id) {
          return {
            ...k,
            lastTestedAt: new Date().toLocaleTimeString(),
            lastTestStatus: (data.ok ? 'success' : 'failed') as any,
            lastTestMessage: data.message,
            lastLatencyMs: data.latencyMs,
          };
        }
        return k;
      });
      persistCustomKeys(updated);
    } catch (err: any) {
      alert('Test failed: ' + err.message);
    } finally {
      setTestingKeyId(null);
    }
  };

  // Test all keys in the pool in sequence
  const handleTestAllKeys = async () => {
    const activeKeysWithApi = customKeys.filter(k => k.enabled && k.apiKey.trim());
    if (activeKeysWithApi.length === 0) {
      alert('No active keys with API keys found to test.');
      return;
    }

    setIsTestingAll(true);
    let currentPool = [...customKeys];

    for (const key of activeKeysWithApi) {
      setTestingKeyId(key.id);
      try {
        let data: { ok: boolean; message: string; latencyMs: number };
        try {
          const res = await fetch('/api/omni/test-custom-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyProfile: key }),
          });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            data = await res.json();
          } else {
            throw new Error('Server endpoint not available in APK');
          }
        } catch {
          data = await testCustomKeyInBrowser(key);
        }

        currentPool = currentPool.map(k => {
          if (k.id === key.id) {
            return {
              ...k,
              lastTestedAt: new Date().toLocaleTimeString(),
              lastTestStatus: (data.ok ? 'success' : 'failed') as any,
              lastTestMessage: data.message,
              lastLatencyMs: data.latencyMs,
            };
          }
          return k;
        });
      } catch (e: any) {
        console.warn('Test error for key', key.name, e);
      }
    }

    setTestingKeyId(null);
    setIsTestingAll(false);
    persistCustomKeys(currentPool, 'Tested all API keys in pool!');
  };

  // Run full automatic fallback route test
  const handleRunRouteTest = async () => {
    setRunningRouteTest(true);
    setRouteTestResult(null);
    try {
      let data: RouteTestResult;
      try {
        const res = await fetch('/api/omni/test-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lyrics: sampleLyrics,
            simulateFailKeyIds,
            customKeysPool: customKeys,
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          throw new Error('Server endpoint not available in APK');
        }
      } catch {
        data = await runClientSideRouteTest(sampleLyrics, simulateFailKeyIds, customKeys);
      }
      setRouteTestResult(data);
    } catch (err: any) {
      alert('Route test error: ' + err.message);
    } finally {
      setRunningRouteTest(false);
    }
  };

  const toggleSimulateFailKey = (id: string) => {
    setSimulateFailKeyIds(prev =>
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    );
  };

  const activeKeysCount = customKeys.filter(k => k.enabled && k.apiKey.trim()).length;

  return (
    <div className="space-y-6 pb-28 max-w-4xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center space-x-2 text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 transition-all active:scale-95 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Studio</span>
        </button>

        <div className="flex items-center space-x-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Automatic Fallback Router Online</span>
          </div>
          <button
            onClick={() => onNavigate('director')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 px-3 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Music Director</span>
          </button>
        </div>
      </div>

      {/* Hero Banner with Clear Purpose */}
      <div className="bg-gradient-to-r from-emerald-950/50 via-indigo-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
              <span>Automatic Fallback API Keys Router</span>
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Apni API keys yahan add karein (Gemini, Groq, DeepSeek, Mistral ya Custom proxy) aur unhe test karein. 
              Jab <strong>Key 1</strong> ka quota ya credit khatam hoga, toh <strong>Key 2</strong> apne aap take over karega, phir <strong>Key 3</strong>, aur aakhir mein <strong>Local Studio Brain</strong>.
              Aapka music generation kabhi nahi rukega!
            </p>
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="mt-4 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Visual Cascade Flow Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Active Automatic Fallback Cascade Sequence
            </h2>
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-400">
            {activeKeysCount} Active Key{activeKeysCount === 1 ? '' : 's'} Configured
          </span>
        </div>

        {/* Responsive Flow Pipeline */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {customKeys.length === 0 ? (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-slate-400 text-xs w-full flex items-center justify-between">
              <span>No user keys added yet. Add your keys below to activate automatic failover.</span>
              <span className="text-emerald-400 font-semibold text-[11px]">Local Studio Brain Active (100% Offline)</span>
            </div>
          ) : (
            <>
              {customKeys.map((k, idx) => (
                <React.Fragment key={k.id}>
                  <div className={`p-2.5 rounded-xl border flex items-center space-x-2 transition-all ${
                    k.enabled && k.apiKey.trim()
                      ? 'bg-slate-950 border-emerald-500/40 text-white'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                  }`}>
                    <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-xs truncate max-w-[140px]">{k.name}</div>
                      <div className="text-[10px] text-emerald-300 font-mono uppercase">{k.provider}</div>
                    </div>
                  </div>

                  {idx < customKeys.length - 1 && (
                    <div className="flex items-center text-slate-500 px-0.5">
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                </React.Fragment>
              ))}

              <div className="flex items-center text-slate-500 px-0.5">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>

              {/* Local Offline Safety Net */}
              <div className="p-2.5 rounded-xl border bg-indigo-950/30 border-indigo-500/40 text-white flex items-center space-x-2">
                <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                  ∞
                </div>
                <div>
                  <div className="font-bold text-xs">Local Studio Brain</div>
                  <div className="text-[10px] text-indigo-300 font-mono">100% Offline Guarantee</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* User API Keys Management Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg relative">
        <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Apni API Keys Pool
              </h2>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Auto-Fallback Chain
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Yahan aap jitni chahein API keys add kar sakte hain. Use <strong>Move Up / Down</strong> buttons to prioritize which key is tried first!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {customKeys.length > 0 && (
              <button
                onClick={handleTestAllKeys}
                disabled={isTestingAll}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-300 border border-emerald-500/30 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 active:scale-95 transition-all"
                title="Test all keys in pool to check credits"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin' : ''}`} />
                <span>Test All Keys</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsAddingNewKey(true);
                setEditingKeyId(null);
                setFormName('');
                setFormProvider('gemini');
                setFormApiKey('');
                setFormEndpoint('https://generativelanguage.googleapis.com');
                setFormModel('gemini-2.0-flash');
                setShowFormApiKey(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 active:scale-95 transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add API Key</span>
            </button>
          </div>
        </div>

        {/* Quick Add Presets Bar */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-400">Quick Presets:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={handleAddGeminiBatch}
              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Setup 4 Gemini Keys</span>
            </button>
            <button
              onClick={() => handleAddPresetKey('gemini')}
              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-medium"
            >
              + Gemini Key
            </button>
            <button
              onClick={() => handleAddPresetKey('groq')}
              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-medium"
            >
              + Groq (Llama-3.3)
            </button>
            <button
              onClick={() => handleAddPresetKey('deepseek')}
              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-medium"
            >
              + DeepSeek
            </button>
            <button
              onClick={() => handleAddPresetKey('mistral')}
              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-medium"
            >
              + Mistral
            </button>
            <button
              onClick={() => handleAddPresetKey('openai_compatible')}
              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-medium"
            >
              + Custom / Proxy
            </button>
          </div>
        </div>

        {/* Add / Edit Key Form Modal */}
        {(isAddingNewKey || editingKeyId) && (
          <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>{editingKeyId ? 'Edit API Key Profile' : 'Add New API Key to Fallback Router'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddingNewKey(false);
                  setEditingKeyId(null);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Key Label / Name:</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Gemini Primary, Groq Fast Backup, DeepSeek 3"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Provider Type:</label>
                <select
                  value={formProvider}
                  onChange={(e) => {
                    const p = e.target.value as OmniProviderType;
                    setFormProvider(p);
                    if (p === 'gemini') {
                      setFormEndpoint('https://generativelanguage.googleapis.com');
                      setFormModel('gemini-2.0-flash');
                    } else if (p === 'groq') {
                      setFormEndpoint('https://api.groq.com/openai/v1');
                      setFormModel('llama-3.3-70b-versatile');
                    } else if (p === 'deepseek') {
                      setFormEndpoint('https://api.deepseek.com/v1');
                      setFormModel('deepseek-chat');
                    } else if (p === 'mistral') {
                      setFormEndpoint('https://api.mistral.ai/v1');
                      setFormModel('mistral-small-latest');
                    } else if (p === 'openai_compatible') {
                      setFormEndpoint('https://api.openai.com/v1');
                      setFormModel('gpt-4o-mini');
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="gemini">Google Gemini (Default AI Studio)</option>
                  <option value="groq">Groq (Ultra-Fast Llama-3.3)</option>
                  <option value="deepseek">DeepSeek (deepseek-chat v3)</option>
                  <option value="mistral">Mistral AI (mistral-small)</option>
                  <option value="openai_compatible">OpenAI Compatible Proxy / Custom URL</option>
                  <option value="custom">Custom HTTP Endpoint</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-300 font-semibold block mb-1">
                  API Key String <span className="text-emerald-400">*</span>:
                </label>
                <div className="relative">
                  <input
                    type={showFormApiKey ? 'text' : 'password'}
                    value={formApiKey}
                    onChange={(e) => setFormApiKey(e.target.value)}
                    placeholder="Paste your API key here (e.g. AIzaSy... or gsk_... or sk-...)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 pr-10 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormApiKey(!showFormApiKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showFormApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Endpoint URL (Optional):
                </label>
                <input
                  type="text"
                  value={formEndpoint}
                  onChange={(e) => setFormEndpoint(e.target.value)}
                  placeholder="https://generativelanguage.googleapis.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-[11px]"
                />
                <span className="text-[10px] text-slate-500">Official endpoint pre-filled. Modify only for custom proxies.</span>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Model Name (Optional):
                </label>
                <input
                  type="text"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  placeholder="e.g. gemini-2.0-flash or llama-3.3-70b-versatile"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-[11px]"
                />
                <span className="text-[10px] text-slate-500">Best fast model automatically assigned.</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsAddingNewKey(false);
                  setEditingKeyId(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFormCustomKey}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
              >
                {editingKeyId ? 'Save Changes' : 'Add to Router Pool'}
              </button>
            </div>
          </div>
        )}

        {/* Keys List Display */}
        {customKeys.length === 0 ? (
          <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3">
            <Key className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Koi API Key Add Nahi Hui Hai</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Agar aapke paas 4 Gemini keys ya Groq/DeepSeek keys hain, upar <strong>"Setup 4 Gemini Keys"</strong> ya <strong>"Add API Key"</strong> par click karein. Aap har key ko test karke automatic fallback set kar sakte hain.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {customKeys.map((k, index) => {
              const isTested = k.lastTestStatus && k.lastTestStatus !== 'untested';
              const isSuccess = k.lastTestStatus === 'success';
              const isTesting = testingKeyId === k.id;
              const hasKey = Boolean(k.apiKey && k.apiKey.trim());

              return (
                <div
                  key={k.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    k.enabled 
                      ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40' 
                      : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      {/* Priority Badge */}
                      <div className="flex flex-col items-center space-y-1 shrink-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                          #{index + 1}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-tight text-slate-500">
                          {index === 0 ? 'Primary' : `Backup ${index}`}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">{k.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-emerald-300 border border-emerald-500/20 uppercase">
                            {k.provider}
                          </span>
                          {!k.enabled && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                              Disabled
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                          <span>
                            Key: <span className="text-slate-300 font-medium">
                              {hasKey ? `${k.apiKey.slice(0, 7)}••••••••${k.apiKey.slice(-4)}` : 'Empty (Click edit)'}
                            </span>
                          </span>
                          {k.modelName && (
                            <span>Model: <span className="text-emerald-300">{k.modelName}</span></span>
                          )}
                          {k.endpointUrl && (
                            <span className="truncate max-w-[180px]" title={k.endpointUrl}>
                              Endpoint: <span className="text-indigo-300">{k.endpointUrl}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions & Priority Reorder */}
                    <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
                      {/* Priority Reordering Buttons */}
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 hover:text-white"
                        title="Move Up in Fallback Priority"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === customKeys.length - 1}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 hover:text-white"
                        title="Move Down in Fallback Priority"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Live Test Button */}
                      <button
                        onClick={() => handleTestSingleKey(k)}
                        disabled={isTesting || !hasKey}
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 active:scale-95 transition-all ml-1"
                        title="Ping and test key live"
                      >
                        {isTesting ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        <span>Test</span>
                      </button>

                      {/* Active/Disable Toggle */}
                      <button
                        onClick={() => handleToggleKeyEnabled(k.id)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                          k.enabled ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }`}
                        title={k.enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        {k.enabled ? 'Active' : 'Off'}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleStartEdit(k)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                        title="Edit key profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteKey(k.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                        title="Delete key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Diagnostic Test Bar */}
                  {isTested && (
                    <div className={`mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] ${
                      isSuccess ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      <div className="flex items-center space-x-1.5">
                        {isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span className="font-semibold">{k.lastTestMessage || (isSuccess ? 'Key verified & active' : 'Test failed')}</span>
                      </div>
                      {typeof k.lastLatencyMs === 'number' && (
                        <span className="font-mono text-[10px] text-slate-400">
                          {k.lastLatencyMs} ms ({k.lastTestedAt})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dedicated Interactive Fallback Simulation & Router Test Lab */}
      <div className="bg-slate-900/90 border border-emerald-500/25 rounded-2xl p-5 space-y-5 shadow-lg relative overflow-hidden">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Automatic Fallback Router Live Verification Lab</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Check karein ki jab primary key ka quota khatam hota hai, toh router apne aap next key par kaise jump karta hai!
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
            Interactive Cascade Test
          </span>
        </div>

        {/* Test Lyrics */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-200">Test Lyrics (Hindi / Urdu):</label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSampleLyrics("Tere bin nahi jeena mar jaana\nDholna ve tere bin nahi jeena\nMain tenu samjhawan ki")}
                  className="text-[10px] text-emerald-300 hover:text-emerald-200 bg-slate-800 px-2 py-0.5 rounded"
                >
                  Sufi Romantic
                </button>
                <button
                  type="button"
                  onClick={() => setSampleLyrics("Bakhuda tumhi ho, har jagah tumhi ho\nYeh dil pukare bar bar tumhi ho\nKhoya rehta hoon main")}
                  className="text-[10px] text-emerald-300 hover:text-emerald-200 bg-slate-800 px-2 py-0.5 rounded"
                >
                  Bollywood Pop
                </button>
              </div>
            </div>
            <textarea
              value={sampleLyrics}
              onChange={(e) => setSampleLyrics(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none"
            />
          </div>

          {/* Quota Exhaustion Simulation Controls */}
          {customKeys.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Simulate Quota / Rate Limit (HTTP 429) to Test Automatic Fallback:</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Neeche kisi bhi key par click karke uska quota "Khatam" simulate karein, aur dekhein agla key kaise automatically chalta hai:
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {customKeys.map((k, idx) => {
                  const isSimulated = simulateFailKeyIds.includes(k.id);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => toggleSimulateFailKey(k.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center space-x-1.5 ${
                        isSimulated
                          ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span>Key #{idx + 1} ({k.name}):</span>
                      <span className={isSimulated ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {isSimulated ? '⚠️ Quota Khatam (429)' : 'Normal'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Run Route Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Live server-side musical director orchestration execution.
            </span>

            <button
              onClick={handleRunRouteTest}
              disabled={runningRouteTest}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-2 active:scale-95 shadow-lg shadow-emerald-600/30 transition-all shrink-0"
            >
              {runningRouteTest ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Cascading Keys...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>⚡ TEST AUTOMATIC FALLBACK ROUTER</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Test Results */}
        {routeTestResult && (
          <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2">
            {/* Winner Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-emerald-950/60 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Winner Engine (Handled Request)</div>
                  <div className="text-sm font-black text-white flex items-center space-x-2">
                    <span>{routeTestResult.winnerName || routeTestResult.winner}</span>
                    <span className="text-xs font-normal text-emerald-300 font-mono">({routeTestResult.winnerModel})</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-mono">Total Roundtrip</div>
                <div className="text-sm font-bold text-emerald-400 font-mono flex items-center justify-end space-x-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{routeTestResult.totalLatencyMs} ms</span>
                </div>
              </div>
            </div>

            {/* Step-by-Step Execution Journey Trace */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Fallback Cascade Journey (Ek Ke Baad Ek Trace):
              </h4>

              <div className="space-y-2">
                {routeTestResult.trace.map((step, idx) => {
                  const isSuccess = step.status === 'success';
                  const isQuota = step.status === 'quota_exhausted';
                  const isFailed = step.status === 'failed' || step.status === 'simulated_failure';
                  const isSkipped = step.status === 'skipped' || step.status === 'standby';
                  const isMissingKey = step.status === 'missing_key';

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-start justify-between text-xs transition-all ${
                        isSuccess
                          ? 'bg-emerald-950/25 border-emerald-500/40 text-slate-200'
                          : isQuota
                          ? 'bg-amber-950/25 border-amber-500/40 text-slate-200'
                          : isFailed
                          ? 'bg-rose-950/20 border-rose-500/30 text-slate-300'
                          : isMissingKey
                          ? 'bg-slate-900 border-slate-800 text-slate-300'
                          : 'bg-slate-950/40 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <div className="mt-0.5">
                          {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {isQuota && <AlertCircle className="w-4 h-4 text-amber-400" />}
                          {isFailed && <XCircle className="w-4 h-4 text-rose-400" />}
                          {isMissingKey && <AlertCircle className="w-4 h-4 text-slate-500" />}
                          {isSkipped && <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px] text-slate-500">•</div>}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white">Priority #{step.priority}: {step.name}</span>
                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                              isSuccess ? 'bg-emerald-500/20 text-emerald-300' :
                              isQuota ? 'bg-amber-500/20 text-amber-300' :
                              isFailed ? 'bg-rose-500/20 text-rose-300' :
                              isMissingKey ? 'bg-slate-800 text-slate-400' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {isQuota ? 'Quota Finished (429)' : isSkipped ? 'Standby (Resolved earlier)' : step.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">{step.message}</p>
                          {step.error && (
                            <p className="text-[10px] font-mono text-amber-400/90">{step.error}</p>
                          )}
                        </div>
                      </div>

                      {typeof step.latencyMs === 'number' && step.latencyMs > 0 && (
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800 shrink-0 ml-2">
                          {step.latencyMs} ms
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generated Music Arrangement Preview */}
            {routeTestResult.resultPreview && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center space-x-2">
                    <Music className="w-4 h-4 text-pink-400" />
                    <span className="text-xs font-bold text-white">Generated Bollywood Plan:</span>
                    <span className="text-xs font-bold text-pink-300">"{routeTestResult.resultPreview.songTitle}"</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {routeTestResult.resultPreview.recommendedBpm} BPM • Key of {routeTestResult.resultPreview.recommendedKey}
                  </div>
                </div>

                {routeTestResult.resultPreview.summary && (
                  <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    "{routeTestResult.resultPreview.summary}"
                  </p>
                )}

                {routeTestResult.resultPreview.sections && routeTestResult.resultPreview.sections.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Line & Chords Preview:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {routeTestResult.resultPreview.sections.slice(0, 2).map((sec: any, sIdx: number) => (
                        <div key={sIdx} className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg text-xs space-y-1.5">
                          <div className="font-bold text-emerald-300 text-[11px]">{sec.name || 'Section'}</div>
                          {(sec.lines || []).slice(0, 2).map((ln: any, lIdx: number) => (
                            <div key={lIdx} className="flex items-center justify-between text-[11px] border-t border-slate-800/60 pt-1">
                              <span className="text-slate-300 truncate max-w-[180px]">{ln.text}</span>
                              <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/20">
                                {ln.recommendedChord || 'Am'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onNavigate('director')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open in AI Music Director</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
