'use strict';
require('dotenv').config();
const { GoogleGenAI, Type } = require('@google/genai');
const { withJsonRetry } = require('./utils');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FOCUS_PROMPT = `You are analyzing a webpage screenshot to extract structured annotation data.

The user wants to create a tutorial focused on: "{{FOCUS_HINT}}"

With that focus in mind, analyze this screenshot and identify the 3 to 5 UI elements
most relevant to that specific goal. Ignore elements unrelated to the focus topic.

For each element, provide:
- x_percent, y_percent (0-100): the CENTER of the element, where 0,0 is top-left
- w_percent, h_percent (0-100): the WIDTH and HEIGHT of the element as a percentage of the screenshot

Be precise — look at where each element actually is and how large it is.

Return a JSON object with exactly this structure:
{
  "pageTitle": "Short descriptive title of what this page/tool is",
  "pageTopic": "One sentence describing what this page does",
  "detectedFocus": "Restate the focus goal in your own words",
  "elements": [
    {
      "id": 1,
      "label": "Short element name",
      "description": "What this element is and how it relates to the focus goal",
      "x_percent": 25.5,
      "y_percent": 40.0,
      "w_percent": 20.0,
      "h_percent": 5.0
    }
  ]
}

Return ONLY valid JSON. No explanation. No markdown.`;

const NO_FOCUS_PROMPT = `You are analyzing a webpage screenshot to extract structured annotation data.

Analyze this screenshot and identify the 3 to 5 most important interactive or
informational elements. Focus on what makes this page useful to a first-time visitor.

For each element, provide:
- x_percent, y_percent (0-100): the CENTER of the element, where 0,0 is top-left
- w_percent, h_percent (0-100): the WIDTH and HEIGHT of the element as a percentage of the screenshot

Be precise — look at where each element actually is and how large it is.

Return a JSON object with exactly this structure:
{
  "pageTitle": "Short descriptive title of what this page/tool is",
  "pageTopic": "One sentence describing what this page does",
  "detectedFocus": "Your best inference of what a tutorial about this page should explain",
  "elements": [
    {
      "id": 1,
      "label": "Short element name",
      "description": "What this element is and what it does",
      "x_percent": 25.5,
      "y_percent": 40.0,
      "w_percent": 20.0,
      "h_percent": 5.0
    }
  ]
}

Return ONLY valid JSON. No explanation. No markdown.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    pageTitle: { type: Type.STRING },
    pageTopic: { type: Type.STRING },
    detectedFocus: { type: Type.STRING },
    elements: {
      type: Type.ARRAY,
      minItems: 3,
      maxItems: 5,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.NUMBER },
          label: { type: Type.STRING },
          description: { type: Type.STRING },
          x_percent: { type: Type.NUMBER },
          y_percent: { type: Type.NUMBER },
          w_percent: { type: Type.NUMBER },
          h_percent: { type: Type.NUMBER }
        },
        required: ['id', 'label', 'description', 'x_percent', 'y_percent', 'w_percent', 'h_percent']
      }
    }
  },
  required: ['pageTitle', 'pageTopic', 'detectedFocus', 'elements']
};

async function analyzeScreenshot(base64Image, focus = null) {
  const promptText = focus
    ? FOCUS_PROMPT.replace('{{FOCUS_HINT}}', focus)
    : NO_FOCUS_PROMPT;

  try {
    const result = await withJsonRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: [
              { text: promptText },
              { inlineData: { data: base64Image, mimeType: 'image/png' } }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA
        }
      });
      return response.text;
    }, 2);

    return result;
  } catch (err) {
    throw new Error(`Analysis failed: could not interpret screenshot — ${err.message}`);
  }
}

module.exports = { analyzeScreenshot };
