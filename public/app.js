// DOM element references
const generateForm = document.getElementById('generate-form');
const urlInput = document.getElementById('url-input');
const focusInput = document.getElementById('focus-input');
const generateBtn = document.getElementById('generate-btn');
const loadingSection = document.getElementById('loading-section');
const resultSection = document.getElementById('result-section');
const errorSection = document.getElementById('error-section');
const statusText = document.getElementById('status-text');
const longRunningNotice = document.getElementById('long-running-notice');
const resultImage = document.getElementById('result-image');
const downloadBtn = document.getElementById('download-btn');
const errorText = document.getElementById('error-text');
const inlineError = document.getElementById('inline-error');

// Loading stage labels (D-01: emoji + label per UI-SPEC Copywriting Contract)
const STAGES = [
  '📸 Capturing screenshot...',
  '🔍 Analyzing page...',
  '✍️ Writing annotations...',
  '🎨 Rendering image...'
];

// Auto-prepend https:// if the user entered a bare domain
function normalizeUrl(str) {
  str = str.trim();
  if (!/^https?:\/\//i.test(str)) {
    str = 'https://' + str;
  }
  return str;
}

// Client-side URL validation
function isValidUrlClient(str) {
  try {
    const parsed = new URL(str);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function showInlineError(msg) {
  inlineError.textContent = msg;
  inlineError.hidden = false;
}

function hideInlineError() {
  inlineError.hidden = true;
}

// Module-level state for loading cycle
let stageIndex = 0;
let stageInterval = null;
let longRunningTimeout = null;

function startLoading() {
  generateBtn.disabled = true;
  loadingSection.hidden = false;
  resultSection.hidden = true;
  errorSection.hidden = true;
  longRunningNotice.hidden = true;
  hideInlineError();

  stageIndex = 0;
  statusText.textContent = STAGES[0];

  // D-01: cycle through 4 emoji stage labels every 5000ms
  stageInterval = setInterval(() => {
    stageIndex = (stageIndex + 1) % STAGES.length;
    statusText.textContent = STAGES[stageIndex];
  }, 5000);

  // D-02: show long-running notice after 30s
  longRunningTimeout = setTimeout(() => {
    longRunningNotice.hidden = false;
  }, 30000);
}

function stopLoading() {
  clearInterval(stageInterval);
  clearTimeout(longRunningTimeout);
  loadingSection.hidden = true;
  generateBtn.disabled = false;
}

function showResult(imageUrl) {
  resultImage.src = imageUrl;
  downloadBtn.href = imageUrl;
  downloadBtn.download = imageUrl.split('/').pop();
  resultSection.hidden = false;
}

function showError(message) {
  errorText.textContent = message;
  errorSection.hidden = false;
}

// Form submit handler
generateForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  hideInlineError();

  let url = urlInput.value.trim();
  const focus = focusInput.value.trim();

  if (!url) {
    showInlineError('URL is required');
    return;
  }

  url = normalizeUrl(url);
  urlInput.value = url;

  if (!isValidUrlClient(url)) {
    showInlineError('Please enter a valid URL (e.g. www.google.com)');
    return;
  }

  startLoading();

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, focus: focus || undefined })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'Generation failed.');
    } else {
      showResult(data.imageUrl);
    }
  } catch {
    showError('Network error. Please try again.');
  } finally {
    stopLoading();
  }
});
