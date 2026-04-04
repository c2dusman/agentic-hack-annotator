'use strict';
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { withJsonRetry } = require('./utils');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FOCUS_PROMPT = `You are writing copy for a social media tutorial card about a webpage.

The user's specific goal is: "{{FOCUS_HINT}}"

Here is the structured page analysis:
{{PAGE_ANALYSIS_JSON}}

Write annotation copy tightly aligned to the user's goal.
Return a JSON object with exactly this structure:
{
  "cardTitle": "Action-oriented title max 6 words — must reflect the focus goal",
  "cardSubtitle": "One line explaining exactly what this tutorial achieves",
  "steps": [
    {
      "number": 1,
      "label": "Short bold step label (2-4 words)",
      "description": "One clear sentence explaining this step toward the goal"
    }
  ]
}

Rules:
- Card title must start with a verb (e.g. "Add", "Connect", "Set Up", "Use")
- All steps must directly serve the focus goal — nothing off-topic
- Write for a non-technical audience
- Keep it punchy and clear
- Create exactly one step for each element in the elements array — use the element label and description as the basis for that step. The number of steps MUST equal the number of elements.
- Return ONLY valid JSON. No explanation. No markdown.`;

const NO_FOCUS_PROMPT = `You are writing copy for a social media tutorial card about a webpage.

Here is the structured page analysis including the AI's inferred focus:
{{PAGE_ANALYSIS_JSON}}

Write annotation copy based on the detectedFocus field and the elements identified.
Return a JSON object with exactly this structure:
{
  "cardTitle": "Action-oriented title max 6 words",
  "cardSubtitle": "One line explaining what this tutorial shows",
  "steps": [
    {
      "number": 1,
      "label": "Short bold step label (2-4 words)",
      "description": "One clear sentence explaining this step"
    }
  ]
}

Rules:
- Card title must start with a verb (e.g. "Add", "Connect", "Set Up", "Use")
- Steps should be sequential and actionable
- Write for a non-technical audience
- Keep it punchy and clear
- Create exactly one step for each element in the elements array — use the element label and description as the basis for that step. The number of steps MUST equal the number of elements.
- Return ONLY valid JSON. No explanation. No markdown.`;

async function generateAnnotations(analysisData, focus = null) {
  const analysisJson = JSON.stringify(analysisData, null, 2);

  const promptText = focus
    ? FOCUS_PROMPT.replace('{{FOCUS_HINT}}', focus).replace('{{PAGE_ANALYSIS_JSON}}', analysisJson)
    : NO_FOCUS_PROMPT.replace('{{PAGE_ANALYSIS_JSON}}', analysisJson);

  try {
    const result = await withJsonRetry(async () => {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: promptText }]
      });
      return message.content[0].text;
    }, 2);

    return result;
  } catch (err) {
    throw new Error(`Copy generation failed: ${err.message}`);
  }
}

module.exports = { generateAnnotations };
