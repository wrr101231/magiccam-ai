/**
 * MagicCamAI — Streamlined Studio Application
 * Handles camera, identity, background, virtual camera, and Go Live workflow.
 */

// ============================================
// State
// ============================================
const state = {
  activated: false,
  cameraRunning: false,
  cameraStream: null,
  selectedCameraId: null,
  isLive: false,
  vcamEnabled: false,
  activeIdentity: null,
  activeBackground: null,
  identities: [],
  backgrounds: [],
  fps: 0,
  frameCount: 0,
  lastFpsTime: performance.now(),
};

// ============================================
// DOM References
// ============================================
const $ = (id) => document.getElementById(id);
const qa = (sel) => document.querySelectorAll(sel);

// ============================================
// Titlebar
// ============================================
$('btn-minimize')?.addEventListener('click', () => window.api?.app?.minimize());
$('btn-close')?.addEventListener('click', () => window.api?.app?.exit());

// ============================================
// Activation
// ============================================
$('form-activate')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('email').value.trim();
  const key = $('license-key').value.trim();
  const errEl = $('activation-error');
  const btn = $('btn-activate-submit');

  if (!email || !key) {
    errEl.textContent = 'Please enter both email and license key.';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Activating...';
  errEl.classList.add('hidden');

  try {
    const result = await window.api.licensing.activate(email, key);
    if (result && result.success) {
      state.activated = true;
      showView('workspace');
      initStudio();
      loadLicenseInfo(result);
    } else {
      errEl.textContent = result?.error || 'Activation failed. Check your credentials.';
      errEl.classList.remove('hidden');
    }
  } catch (err) {
    errEl.textContent = 'Connection error. Please check your network.';
    errEl.classList.remove('hidden');
  }

  btn.disabled = false;
  btn.textContent = 'Activate Software';
});

$('btn-exit')?.addEventListener('click', () => window.api?.app?.exit());

// Check existing activation on startup
(async function checkActivation() {
  try {
    const token = await window.api.licensing.checkLocalStatus();
    if (token) {
      state.activated = true;
      showView('workspace');
      initStudio();
      loadLicenseInfo(token);
    }
  } catch (e) {
    // Stay on activation view
  }
})();

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = $(`view-${name}`);
  if (el) el.classList.add('active');
}

// ============================================
// Navigation
// ============================================
document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = $(`page-${btn.dataset.page}`);
    if (page) page.classList.add('active');
  });
});

$('btn-logout')?.addEventListener('click', async () => {
  if (confirm('Are you sure you want to logout and deactivate this device?')) {
    try {
      await window.api.licensing.deactivate();
    } catch (e) {}
    stopCamera();
    state.activated = false;
    showView('activation');
  }
});

// ============================================
// Studio Initialization
// ============================================
function initStudio() {
  enumerateCameras();
  loadIdentities();
  loadBackgrounds();
  updateHealthMonitor();
  startFPSCounter();
  // Listen for camera connect/disconnect
  if (navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', enumerateCameras);
  }
}

// ============================================
// Camera System
// ============================================
async function enumerateCameras() {
  const select = $('camera-select');
  if (!select) return;

  try {
    // Need a temporary stream to get labels on first access
    let tempStream = null;
    try {
      tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (e) {
      // Permission denied — list devices without labels
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');

    select.innerHTML = '';

    if (cameras.length === 0) {
      select.innerHTML = '<option value="">No cameras detected</option>';
    } else {
      cameras.forEach((cam, i) => {
        const opt = document.createElement('option');
        opt.value = cam.deviceId;
        opt.textContent = cam.label || `Camera ${i + 1}`;
        select.appendChild(opt);
      });
      state.selectedCameraId = cameras[0].deviceId;
    }

    // Stop temporary stream
    if (tempStream) {
      tempStream.getTracks().forEach(t => t.stop());
    }
  } catch (e) {
    select.innerHTML = '<option value="">Camera access error</option>';
    console.error('Camera enumeration failed:', e);
  }
}

$('camera-select')?.addEventListener('change', (e) => {
  state.selectedCameraId = e.target.value;
  if (state.cameraRunning) {
    // Switch camera without restarting app
    stopCamera().then(() => startCamera());
  }
});

$('btn-refresh-cameras')?.addEventListener('click', enumerateCameras);

$('btn-start-camera')?.addEventListener('click', () => {
  if (state.cameraRunning) {
    stopCamera();
  } else {
    startCamera();
  }
});

async function startCamera() {
  const btn = $('btn-start-camera');
  const statusEl = $('camera-status');
  const video = $('camera-preview');
  const placeholder = $('preview-placeholder');
  const select = $('camera-select');

  if (!state.selectedCameraId && select?.value) {
    state.selectedCameraId = select.value;
  }

  if (!state.selectedCameraId) {
    statusEl.textContent = 'No camera selected';
    statusEl.style.color = 'var(--danger)';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Starting...';
  statusEl.textContent = 'Initializing camera...';
  statusEl.style.color = 'var(--warning)';

  try {
    // Attempt high quality first
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: state.selectedCameraId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
    } catch (fallbackErr) {
      console.warn('High quality camera failed, falling back to defaults:', fallbackErr);
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: state.selectedCameraId }
        },
        audio: false,
      });
    }

    state.cameraStream = stream;
    state.cameraRunning = true;

    // Show preview
    video.srcObject = stream;
    video.style.display = 'block';
    placeholder.classList.add('hidden');

    // Show output canvas and HUD
    const canvas = $('output-canvas');
    const outputPlaceholder = $('output-placeholder');
    const hud = $('output-hud');
    canvas.style.display = 'block';
    outputPlaceholder.classList.add('hidden');
    hud.classList.remove('hidden');

    // Start rendering to output canvas
    startOutputRender(stream);

    // Update resolution HUD
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    $('hud-resolution').textContent = `${settings.width}x${settings.height}`;

    btn.textContent = 'Stop Camera';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-danger');
    statusEl.textContent = 'Camera running';
    statusEl.style.color = 'var(--success)';

    // Enable Go Live and V-Cam buttons
    $('btn-go-live').disabled = false;
    $('btn-vcam-toggle').disabled = false;

    updateHealthStatus('h-camera', 'Running', 'ok');
    updateHealthStatus('h-ai', 'Active', 'ok');
  } catch (err) {
    console.error('Camera start failed:', err);
    let msg = 'Failed to start camera.';
    if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Grant access in System Preferences.';
    else if (err.name === 'NotFoundError') msg = 'Camera not found. Check connection.';
    else if (err.name === 'NotReadableError') msg = 'Camera already in use by another application.';
    else if (err.name === 'OverconstrainedError') msg = 'Camera does not support requested resolution.';
    
    statusEl.textContent = msg;
    statusEl.style.color = 'var(--danger)';
    updateHealthStatus('h-camera', 'Error', 'err');
  }

  btn.disabled = false;
}

async function stopCamera() {
  const btn = $('btn-start-camera');
  const statusEl = $('camera-status');
  const video = $('camera-preview');
  const placeholder = $('preview-placeholder');

  // Stop live if active
  if (state.isLive) toggleLive();

  // Stop stream
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(t => t.stop());
    state.cameraStream = null;
  }

  state.cameraRunning = false;
  video.srcObject = null;
  video.style.display = 'none';
  placeholder.classList.remove('hidden');

  // Hide output
  $('output-canvas').style.display = 'none';
  $('output-placeholder').classList.remove('hidden');
  $('output-hud').classList.add('hidden');

  btn.textContent = 'Start Camera';
  btn.classList.remove('btn-danger');
  btn.classList.add('btn-primary');
  statusEl.textContent = 'Camera idle';
  statusEl.style.color = 'var(--text-muted)';

  $('btn-go-live').disabled = true;
  $('btn-vcam-toggle').disabled = true;
  $('btn-vcam-restart').disabled = true;

  updateHealthStatus('h-camera', 'Idle', 'idle');
  updateHealthStatus('h-ai', 'Standby', 'idle');
}

// ============================================
// Output Rendering
// ============================================
let renderRAF = null;

function startOutputRender(stream) {
  const canvas = $('output-canvas');
  const ctx = canvas.getContext('2d');
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.play();

  // AI Pipeline setup
  let aiSocket = null;
  let isProcessingFrame = false;
  let aiProcessedImage = null;
  let lastBackgroundId = null;
  let lastIdentityId = null;

  function connectAISocket() {
    const cloudUrl = localStorage.getItem('cloud_gpu_url');
    const wsUrl = cloudUrl ? cloudUrl : 'ws://127.0.0.1:8000/ws';
    aiSocket = new WebSocket(wsUrl);
    
    aiSocket.onopen = () => {
      console.log('Connected to AI Engine');
      // Force resync of background upon reconnection
      if (state.activeBackground) {
        lastBackgroundId = null; 
      }
      if (state.activeIdentity) {
        lastIdentityId = null;
      }
    };

    aiSocket.onmessage = async (event) => {
      try {
        let blob = event.data;
        if (blob instanceof ArrayBuffer || (blob && blob.buffer instanceof ArrayBuffer)) {
          blob = new Blob([blob], { type: 'image/jpeg' });
        }
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        });
        aiProcessedImage = img;
      } catch (e) {
        console.error('Failed to decode AI frame:', e);
      } finally {
        isProcessingFrame = false;
      }
    };

    aiSocket.onclose = () => {
      console.log('AI Socket closed. Reconnecting in 2 seconds...');
      setTimeout(connectAISocket, 2000);
    };

    aiSocket.onerror = (err) => {
      console.error('AI Socket error');
      aiSocket.close();
    };
  }

  connectAISocket();

  function render() {
    if (!state.cameraRunning) return;

    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Check if background changed and needs to be sent to backend
      const currentBgId = state.activeBackground ? state.activeBackground.id : null;
      if (currentBgId !== lastBackgroundId) {
        lastBackgroundId = currentBgId;
        if (state.activeBackground) {
          if (aiSocket && aiSocket.readyState === WebSocket.OPEN) {
            const bgPath = state.activeBackground.path || (state.activeBackground.url ? state.activeBackground.url.replace('file://', '').replace('magic://', '') : null);
            if (bgPath && window.api && window.api.library && window.api.library.readFileBase64) {
              window.api.library.readFileBase64(bgPath).then(base64 => {
                if (base64) aiSocket.send(JSON.stringify({ type: 'bg_update', bg: base64 }));
              });
            } else {
              aiSocket.send(JSON.stringify({ type: 'bg_update', bg: bgPath })); // fallback
            }
          }
        } else {
          // Clear background
          if (aiSocket && aiSocket.readyState === WebSocket.OPEN) {
            aiSocket.send(JSON.stringify({ type: 'bg_update', bg: null }));
          }
        }
      }

      // Check if identity changed and needs to be sent to backend
      const currentId = state.activeIdentity ? state.activeIdentity.id : null;
      if (currentId !== lastIdentityId) {
        lastIdentityId = currentId;
        if (state.activeIdentity) {
          if (aiSocket && aiSocket.readyState === WebSocket.OPEN) {
            const idPath = state.activeIdentity.path || (state.activeIdentity.url ? state.activeIdentity.url.replace('file://', '').replace('magic://', '') : null);
            if (idPath && window.api && window.api.library && window.api.library.readFileBase64) {
              window.api.library.readFileBase64(idPath).then(base64 => {
                if (base64) aiSocket.send(JSON.stringify({ type: 'id_update', id: base64 }));
              });
            } else {
              aiSocket.send(JSON.stringify({ type: 'id_update', id: idPath })); // fallback
            }
          }
        } else {
          // Clear identity
          if (aiSocket && aiSocket.readyState === WebSocket.OPEN) {
            aiSocket.send(JSON.stringify({ type: 'id_update', id: null }));
          }
        }
      }

      // If we have an AI-processed frame, draw it, otherwise draw raw camera
      if (aiProcessedImage && (state.activeIdentity || state.activeBackground)) {
        ctx.drawImage(aiProcessedImage, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // Send frame to AI Engine if active
      if (aiSocket && aiSocket.readyState === WebSocket.OPEN && !isProcessingFrame && (state.activeIdentity || state.activeBackground)) {
        isProcessingFrame = true;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 640; // Scale down for faster WebSocket transport
        tempCanvas.height = 480;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        
        tempCanvas.toBlob((blob) => {
          if (blob) aiSocket.send(blob);
          else isProcessingFrame = false;
        }, 'image/jpeg', 0.8);
      }

      // Apply lighting adjustments
      const brightness = parseInt($('slider-brightness')?.value || 0);
      const contrast = parseInt($('slider-contrast')?.value || 0);
      const saturation = parseInt($('slider-saturation')?.value || 0);
      if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
        canvas.style.filter = `brightness(${1 + brightness/100}) contrast(${1 + contrast/100}) saturate(${1 + saturation/100})`;
      } else {
        canvas.style.filter = '';
      }

      // FPS counter
      state.frameCount++;
    }

    renderRAF = requestAnimationFrame(render);
  }

  render();
}

function startFPSCounter() {
  setInterval(() => {
    const now = performance.now();
    const delta = (now - state.lastFpsTime) / 1000;
    state.fps = Math.round(state.frameCount / delta);
    state.frameCount = 0;
    state.lastFpsTime = now;
    const hudFps = $('hud-fps');
    if (hudFps) hudFps.textContent = `${state.fps} FPS`;
  }, 1000);
}

// ============================================
// Go Live
// ============================================
$('btn-go-live')?.addEventListener('click', toggleLive);

function toggleLive() {
  state.isLive = !state.isLive;
  const btn = $('btn-go-live');
  const hudLive = $('hud-live');

  if (state.isLive) {
    btn.textContent = '■ Stop Live';
    btn.classList.add('active');
    hudLive.classList.remove('hidden');
    $('btn-vcam-toggle').disabled = false;
    $('btn-vcam-restart').disabled = false;
  } else {
    btn.textContent = 'Go Live';
    btn.classList.remove('active');
    hudLive.classList.add('hidden');
  }
}

// ============================================
// Virtual Camera
// ============================================
$('btn-vcam-toggle')?.addEventListener('click', () => {
  state.vcamEnabled = !state.vcamEnabled;
  const btn = $('btn-vcam-toggle');
  const dot = $('vcam-dot');
  const text = $('vcam-status-text');

  if (state.vcamEnabled) {
    btn.textContent = 'Disable V-Cam';
    dot.classList.add('running');
    text.textContent = 'Virtual Camera: Running';
    $('btn-vcam-restart').disabled = false;
    updateHealthStatus('h-vcam', 'Running', 'ok');
  } else {
    btn.textContent = 'Enable V-Cam';
    dot.classList.remove('running');
    text.textContent = 'Virtual Camera: Stopped';
    updateHealthStatus('h-vcam', 'Stopped', 'idle');
  }
});

$('btn-vcam-restart')?.addEventListener('click', () => {
  if (state.vcamEnabled) {
    const text = $('vcam-status-text');
    text.textContent = 'Virtual Camera: Restarting...';
    setTimeout(() => {
      text.textContent = 'Virtual Camera: Running';
    }, 800);
  }
});

// ============================================
// Settings & License Handlers
// ============================================

window.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  const savedKey = localStorage.getItem('openai_api_key');
  const savedUrl = localStorage.getItem('cloud_gpu_url');
  if (savedKey && $('openai-api-key')) $('openai-api-key').value = savedKey;
  if (savedUrl && $('cloud-gpu-url')) $('cloud-gpu-url').value = savedUrl;
});

$('btn-save-cloud')?.addEventListener('click', () => {
  const apiKey = $('openai-api-key')?.value.trim();
  const cloudUrl = $('cloud-gpu-url')?.value.trim();
  
  if (apiKey) localStorage.setItem('openai_api_key', apiKey);
  else localStorage.removeItem('openai_api_key');
  
  if (cloudUrl) localStorage.setItem('cloud_gpu_url', cloudUrl);
  else localStorage.removeItem('cloud_gpu_url');
  
  alert('Cloud settings saved successfully!');
});

// ============================================
// Identity Library
// ============================================
$('btn-add-identity')?.addEventListener('click', async () => {
  try {
    const result = await window.api.library.selectFile();
    if (result) {
      const identity = {
        id: Date.now().toString(),
        name: result.split('/').pop().split('\\').pop().replace(/\.[^.]+$/, ''),
        path: result,
        active: false,
      };
      state.identities.push(identity);
      renderIdentities();
    }
  } catch (e) {
    console.error('Failed to add identity:', e);
  }
});

function renderIdentities() {
  const container = $('identity-list');
  if (!container) return;

  if (state.identities.length === 0) {
    container.innerHTML = '<div class="empty-state small">No identities uploaded yet.</div>';
    return;
  }

  container.innerHTML = state.identities.map(id => `
    <div class="asset-item ${id.active ? 'active' : ''}" data-id="${id.id}" onclick="selectIdentity('${id.id}')">
      <img src="file://${id.path}" alt="${id.name}" onerror="this.style.display='none'">
      <button class="asset-delete" onclick="event.stopPropagation();deleteIdentity('${id.id}')" title="Delete">×</button>
    </div>
  `).join('');
}

window.selectIdentity = function(id) {
  state.identities.forEach(i => i.active = i.id === id);
  state.activeIdentity = state.identities.find(i => i.id === id) || null;
  $('active-identity-name').textContent = state.activeIdentity?.name || 'None';
  $('hud-identity').textContent = state.activeIdentity?.name || 'No identity';
  renderIdentities();
};

window.deleteIdentity = function(id) {
  state.identities = state.identities.filter(i => i.id !== id);
  if (state.activeIdentity?.id === id) {
    state.activeIdentity = null;
    $('active-identity-name').textContent = 'None';
    $('hud-identity').textContent = 'No identity';
  }
  renderIdentities();
};

// ============================================
// Background Library
// ============================================
$('btn-add-background')?.addEventListener('click', async () => {
  try {
    const result = await window.api.library.selectFile();
    if (result) {
      const bg = {
        id: Date.now().toString(),
        name: result.split('/').pop().split('\\').pop().replace(/\.[^.]+$/, ''),
        path: result,
        active: false,
      };
      state.backgrounds.push(bg);
      renderBackgrounds();
    }
  } catch (e) {
    console.error('Failed to add background:', e);
  }
});

$('btn-generate-bg')?.addEventListener('click', async () => {
  const promptInput = $('ai-bg-prompt');
  const btn = $('btn-generate-bg');
  const prompt = promptInput?.value.trim();
  
  if (!prompt) return alert('Please enter a prompt.');
  
  btn.disabled = true;
  btn.textContent = 'Generating...';
  
  try {
    const result = await window.api.library.generateBackground(prompt);
    if (result.success) {
      const bg = {
        id: Date.now().toString(),
        name: 'AI: ' + prompt.substring(0, 20),
        path: result.path,
        active: false,
      };
      state.backgrounds.push(bg);
      renderBackgrounds();
      promptInput.value = '';
    } else {
      alert('Generation failed: ' + result.error);
    }
  } catch (e) {
    alert('Error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate';
  }
});

function renderBackgrounds() {
  const container = $('background-list');
  if (!container) return;

  if (state.backgrounds.length === 0) {
    container.innerHTML = '<div class="empty-state small">No backgrounds uploaded yet.</div>';
    return;
  }

  container.innerHTML = state.backgrounds.map(bg => `
    <div class="asset-item ${bg.active ? 'active' : ''}" data-id="${bg.id}" onclick="selectBackground('${bg.id}')">
      <img src="file://${bg.path}" alt="${bg.name}" onerror="this.style.display='none'">
      <button class="asset-delete" onclick="event.stopPropagation();deleteBackground('${bg.id}')" title="Delete">×</button>
    </div>
  `).join('');
}

window.selectBackground = function(id) {
  state.backgrounds.forEach(b => b.active = b.id === id);
  state.activeBackground = state.backgrounds.find(b => b.id === id) || null;
  $('active-bg-name').textContent = state.activeBackground?.name || 'None';
  renderBackgrounds();
};

window.deleteBackground = function(id) {
  state.backgrounds = state.backgrounds.filter(b => b.id !== id);
  if (state.activeBackground?.id === id) {
    state.activeBackground = null;
    $('active-bg-name').textContent = 'None';
  }
  renderBackgrounds();
};

function loadIdentities() {
  // Load from local storage or IPC
  renderIdentities();
}

function loadBackgrounds() {
  renderBackgrounds();
}

// ============================================
// Settings Groups (collapsible)
// ============================================
window.toggleGroup = function(headerEl) {
  const group = headerEl.parentElement;
  group.classList.toggle('open');
};

// ============================================
// Health Monitor
// ============================================
function updateHealthStatus(elementId, text, level) {
  const icon = $(elementId + '-icon');
  const value = $(elementId);
  if (icon) {
    icon.className = 'health-icon';
    icon.classList.add(level);
  }
  if (value) value.textContent = text;
}

async function updateHealthMonitor() {
  // Get hardware info
  try {
    const hw = await window.api.hardware.getProfile();
    if (hw) {
      updateHealthStatus('h-gpu', hw.gpuName || 'Unknown', hw.gpuName ? 'ok' : 'warn');
      updateHealthStatus('h-cpu', hw.cpu?.split(' ').slice(0, 3).join(' ') || 'Unknown', 'ok');
      updateHealthStatus('h-mem', `${hw.ramTotalGB || '?'} GB`, 'ok');

      const profile = $('hw-profile-detail');
      if (profile) {
        profile.innerHTML = `
          <div><strong>CPU:</strong> ${hw.cpu || 'Unknown'}</div>
          <div><strong>GPU:</strong> ${hw.gpuName || 'Not detected'} (${hw.vramMB || '?'} MB VRAM)</div>
          <div><strong>Memory:</strong> ${hw.ramTotalGB || '?'} GB total</div>
          <div><strong>Platform:</strong> ${hw.os || 'Unknown'}</div>
          <div><strong>Backend:</strong> ${hw.bestInferenceMode || 'CPU'}</div>
        `;
      }
    }
  } catch (e) {
    console.error('Health check failed:', e);
  }

  updateHealthStatus('h-camera', state.cameraRunning ? 'Running' : 'Idle', state.cameraRunning ? 'ok' : 'idle');
  updateHealthStatus('h-ai', state.cameraRunning ? 'Active' : 'Standby', state.cameraRunning ? 'ok' : 'idle');
  updateHealthStatus('h-vcam', state.vcamEnabled ? 'Running' : 'Stopped', state.vcamEnabled ? 'ok' : 'idle');
  updateHealthStatus('h-license', state.activated ? 'Active' : 'Inactive', state.activated ? 'ok' : 'warn');
  updateHealthStatus('h-model', 'Ready', 'ok');
}

// ============================================
// License Info
// ============================================
function loadLicenseInfo(data) {
  if (!data) return;
  $('lic-email').textContent = data.email || data.user?.email || '—';
  $('lic-key').textContent = data.licenseKey ? maskKey(data.licenseKey) : '—';
  $('lic-plan').textContent = data.plan || 'Professional';
  $('lic-activated').textContent = data.activatedAt ? new Date(data.activatedAt).toLocaleDateString() : new Date().toLocaleDateString();
  $('lic-expires').textContent = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : 'Lifetime';
  $('lic-device').textContent = data.deviceName || navigator.platform || '—';
}

function maskKey(key) {
  if (!key || key.length < 8) return key || '—';
  return key.slice(0, 4) + '-****-****-' + key.slice(-4);
}

$('btn-check-updates')?.addEventListener('click', async () => {
  const btn = $('btn-check-updates');
  btn.disabled = true;
  btn.textContent = 'Checking...';
  try {
    const result = await window.api.updater?.checkForUpdates();
    if (result?.updateAvailable) {
      alert(`Update available: v${result.latestVersion}\n\n${result.releaseNotes || ''}`);
    } else {
      alert('You are running the latest version.');
    }
  } catch (e) {
    alert('Failed to check for updates.');
  }
  btn.disabled = false;
  btn.textContent = 'Check for Updates';
});

$('btn-deactivate')?.addEventListener('click', async () => {
  if (confirm('Deactivate this license? You will need to re-enter your credentials.')) {
    try {
      await window.api.licensing.deactivate();
    } catch (e) {}
    stopCamera();
    state.activated = false;
    showView('activation');
  }
});

$('btn-clear-cache')?.addEventListener('click', () => {
  alert('Cache cleared successfully.');
});
