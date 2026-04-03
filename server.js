const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { ensureOutputDir } = require('./src/utils');

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

// Error handler (Express 5 requires 4-param signature)
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

ensureOutputDir();

app.listen(PORT, () => {
  console.log(`AnnotatorAI running on port ${PORT}`);
});
