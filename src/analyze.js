'use strict';
require('dotenv').config();
const { GoogleGenAI, Type } = require('@google/genai');
const { withJsonRetry } = require('./utils');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FOCUS_PROMPT = `You are analyzing a webpage screenshot to extract structured annotation data.

The user wants to create a tutorial focused on: "{{FOCUS_HINT}}"

With that focus in mind, analyze this screenshot and identify the 3 to 5 UI elements
most relevant to that specific goal. Ignore elements unrelated to the focus topic.

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
      "position": "top-left|top-right|center|bottom-left|bottom-right|top-center|bottom-center"
    }
  ]
}

Return ONLY valid JSON. No explanation. No markdown.`;

const NO_FOCUS_PROMPT = `You are analyzing a webpage screenshot to extract structured annotation data.

Analyze this screenshot and identify the 3 to 5 most important interactive or
informational elements. Focus on what makes this page useful to a first-time visitor.

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
      "position": "top-left|top-right|center|bottom-left|bottom-right|top-center|bottom-center"
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
          position: { type: Type.STRING }
        },
        required: ['id', 'label', 'description', 'position']
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
