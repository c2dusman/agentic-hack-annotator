'use strict';
require('dotenv').config();
const { GoogleGenAI, Type } = require('@google/genai');
const { withJsonRetry } = require('./utils');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FOCUS_PROMPT = `You are analyzing a webpage screenshot to extract structured annotation data.
Your bounding boxes will be used to draw highlight rectangles on the screenshot, so accuracy is critical.

The user wants to create a tutorial focused on: "{{FOCUS_HINT}}"

With that focus in mind, analyze this screenshot and identify the 3 to 5 UI elements
most relevant to that specific goal. Ignore elements unrelated to the focus topic.

BOUNDING BOX RULES (critical for visual quality):
- x_percent, y_percent (0-100): the CENTER of the element's visible bounding box, where 0,0 is top-left of screenshot
- w_percent, h_percent (0-100): the FULL WIDTH and HEIGHT of the element as a percentage of the screenshot
- The bounding box must TIGHTLY wrap the visible element — include the entire button, entire heading, entire form section, etc.
- For buttons: include the full button background/border, not just the text
- For headings/text blocks: include all lines of the heading or paragraph
- For form sections: include labels and input fields together
- For navigation: include the full nav bar or tab row
- NEVER return tiny bounding boxes (w_percent < 5 or h_percent < 3) unless the element is genuinely that small (like a single icon)
- Double-check: if you drew a rectangle at these coordinates, would it fully surround the element? If not, adjust.
- Only annotate elements that are clearly visible in the screenshot — do not guess at elements that are cut off or hidden

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
Your bounding boxes will be used to draw highlight rectangles on the screenshot, so accuracy is critical.

Analyze this screenshot and identify the 3 to 5 most important interactive or
informational elements. Focus on what makes this page useful to a first-time visitor.

BOUNDING BOX RULES (critical for visual quality):
- x_percent, y_percent (0-100): the CENTER of the element's visible bounding box, where 0,0 is top-left of screenshot
- w_percent, h_percent (0-100): the FULL WIDTH and HEIGHT of the element as a percentage of the screenshot
- The bounding box must TIGHTLY wrap the visible element — include the entire button, entire heading, entire form section, etc.
- For buttons: include the full button background/border, not just the text
- For headings/text blocks: include all lines of the heading or paragraph
- For form sections: include labels and input fields together
- For navigation: include the full nav bar or tab row
- NEVER return tiny bounding boxes (w_percent < 5 or h_percent < 3) unless the element is genuinely that small (like a single icon)
- Double-check: if you drew a rectangle at these coordinates, would it fully surround the element? If not, adjust.
- Only annotate elements that are clearly visible in the screenshot — do not guess at elements that are cut off or hidden

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
