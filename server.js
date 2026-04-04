const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { captureScreenshot } = require('./src/screenshot');
const { analyzeScreenshot } = require('./src/analyze');
const { generateAnnotations } = require('./src/annotate');
const { renderCard, renderStepCards } = require('./src/render');
const cron = require('node-cron');
const archiver = require('archiver');
const fs = require('fs');
const { isValidUrl, sanitizeFocus, cleanupOldFiles, ensureOutputDir, withTimeout, cropToVisibleArea } = require('./src/utils');

dotenv.config();

const generationCache = new Map();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/output', express.static(path.join(__dirname, 'output')));

// DEPLOY-03: Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/generate — full pipeline: screenshot -> analyze -> annotate -> render
app.post('/api/generate', async (req, res) => {
  let { url, focus: rawFocus } = req.body;

  // Auto-prepend https:// for bare domains
  if (url && !/^https?:\/\//i.test(url.trim())) {
    url = 'https://' + url.trim();
  }

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Please enter a valid URL (e.g. www.google.com)' });
  }

  const focus = sanitizeFocus(rawFocus);

  try {
    const result = await withTimeout(
      (async () => {
        const { base64: fullBase64 } = await captureScreenshot(url);
        // Crop to visible area so Gemini coordinates match the displayed portion
        const base64 = await cropToVisibleArea(fullBase64);
        const analysisData = await analyzeScreenshot(base64, focus);
        const annotationData = await generateAnnotations(analysisData, focus);
        const { filename } = await renderCard(annotationData, base64, focus, url, analysisData);
        // Store data in memory for step card generation (keyed by filename)
        generationCache.set(filename, { annotationData, screenshotBase64: base64, analysisData, url });
        // Auto-expire after 10 minutes
        setTimeout(() => generationCache.delete(filename), 600000);
        return { filename, stepCount: annotationData.steps.length };
      })(),
      60000,
      'Generation'
    );

    res.json({ imageUrl: `/output/${result.filename}`, stepCount: result.stepCount, overviewId: result.filename });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Generation error for ${url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/step-cards — generate zoomed step detail images from a previous generation
app.post('/api/step-cards', async (req, res) => {
  const { overviewId } = req.body;

  if (!overviewId) {
    return res.status(400).json({ error: 'Missing overviewId' });
  }

  const cached = generationCache.get(overviewId);
  if (!cached) {
    return res.status(404).json({ error: 'Generation data expired. Please generate the overview again.' });
  }

  try {
    const filenames = await withTimeout(
      renderStepCards(cached.annotationData, cached.screenshotBase64, cached.analysisData, cached.url),
      120000,
      'Step cards'
    );

    const imageUrls = filenames.map(f => `/output/${f}`);
    res.json({ imageUrls });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Step cards error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/download-all — zip overview + step images and stream to client
app.post('/api/download-all', (req, res) => {
  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files specified' });
  }

  const outputDir = path.join(__dirname, 'output');
  const validFiles = files
    .map(f => f.replace(/^\/output\//, ''))
    .filter(f => /^[\w-]+\.png$/.test(f) && fs.existsSync(path.join(outputDir, f)));

  if (validFiles.length === 0) {
    return res.status(404).json({ error: 'No valid files found' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="annotatorai-carousel.zip"');

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.pipe(res);

  // Add overview as first file
  validFiles.forEach((f, i) => {
    const name = i === 0 ? '0-overview.png' : `${i}-step-${i}.png`;
    archive.file(path.join(outputDir, f), { name });
  });

  archive.finalize();
});

// Error handler (Express 5 requires 4-param signature)
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

ensureOutputDir();

// D-03: Cleanup old output files on startup and every 10 minutes
cleanupOldFiles();
cron.schedule('*/10 * * * *', () => {
  cleanupOldFiles();
});

app.listen(PORT, () => {
  console.log(`AnnotatorAI running on port ${PORT}`);
});
