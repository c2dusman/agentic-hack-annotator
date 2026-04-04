const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { captureScreenshot } = require('./src/screenshot');
const { analyzeScreenshot } = require('./src/analyze');
const { generateAnnotations } = require('./src/annotate');
const { renderCard } = require('./src/render');
const cron = require('node-cron');
const { isValidUrl, sanitizeFocus, cleanupOldFiles, ensureOutputDir, withTimeout } = require('./src/utils');

dotenv.config();

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
  const { url, focus: rawFocus } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Please enter a valid URL starting with http:// or https://' });
  }

  const focus = sanitizeFocus(rawFocus);

  try {
    const filename = await withTimeout(
      (async () => {
        const { base64 } = await captureScreenshot(url);
        const analysisData = await analyzeScreenshot(base64, focus);
        const annotationData = await generateAnnotations(analysisData, focus);
        const { filename } = await renderCard(annotationData, base64, focus, url, analysisData);
        return filename;
      })(),
      60000,
      'Generation'
    );

    res.json({ imageUrl: `/output/${filename}` });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Generation error for ${url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
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
