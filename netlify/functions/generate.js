/**
 * StudyMate AI - Secure Gemini API Netlify Serverless Function
 * 
 * Generates structured study aids:
 * - AI Summary (Title, Content, Key Points, Keywords)
 * - AI Quiz (EXACTLY 5 Questions, 4 Options each, 0-3 correctAnswer index, Explanation)
 * - Interactive Flashcards (Questions and Answers)
 */

exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Please send a POST request.' })
    };
  }

  // 1. Verify Gemini API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YourGeminiApiKeyHere')) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Gemini API key is not configured on the server. Please set the GEMINI_API_KEY environment variable in Netlify Site Settings (or in your local .env file).'
      })
    };
  }

  // 2. Parse & Validate Client Request Body
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON request payload.' })
    };
  }

  const {
    input,
    mode = 'notes',
    explanationStyle = 'detailed',
    difficulty = 'medium'
  } = payload;

  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Please enter notes or a topic to generate study materials.' })
    };
  }

  const trimmedInput = input.trim();
  if (trimmedInput.length < 5) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Input is too short. Please provide at least 5 characters.' })
    };
  }

  if (trimmedInput.length > 30000) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Input exceeds the maximum limit of 30,000 characters. Please shorten your notes.' })
    };
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // 3. Construct System Prompt
  const prompt = buildPrompt({
    input: trimmedInput,
    mode,
    explanationStyle,
    difficulty
  });

  // 4. Call Gemini API (with 1 automatic retry on format failure)
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const responseData = await callGeminiAPI(apiKey, model, prompt);
      const parsedData = validateAndCleanResponse(responseData);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: parsedData
        })
      };
    } catch (error) {
      console.error(`Gemini Generation Attempt ${attempts} Error:`, error.message);

      if (attempts >= maxAttempts) {
        let statusCode = 500;
        let errorMessage = 'An error occurred while generating study materials with Gemini AI.';

        if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
          statusCode = 429;
          errorMessage = 'Gemini API rate limit or quota exceeded. Please wait a few moments and try again.';
        } else if (error.message.includes('401') || error.message.includes('403') || error.message.includes('API_KEY_INVALID')) {
          statusCode = 403;
          errorMessage = 'Invalid Gemini API key. Please check your GEMINI_API_KEY environment variable.';
        } else if (error.message.includes('validation')) {
          errorMessage = `AI output validation error: ${error.message}`;
        }

        return {
          statusCode,
          headers,
          body: JSON.stringify({ error: errorMessage })
        };
      }
    }
  }
};

/**
 * Build rigorous prompt ensuring structured JSON output
 */
function buildPrompt({ input, mode, explanationStyle, difficulty }) {
  const styleDescriptions = {
    simple: 'Simple: Use plain, accessible language, relatable everyday analogies, and clear, beginner-friendly explanations.',
    detailed: 'Detailed: Provide comprehensive academic depth, in-depth breakdowns, core underlying principles, and mechanisms.',
    'exam-focused': 'Exam-focused: Prioritize precise definitions, high-yield exam takeaways, bulleted formulas, and key points likely to be tested.'
  };

  const difficultyDescriptions = {
    easy: 'Easy: Straightforward factual recall questions with obvious incorrect distractors.',
    medium: 'Medium: Conceptual understanding and application questions with plausible distractors.',
    hard: 'Hard: Advanced scenario analysis, synthesis, nuanced distinctions, and challenging edge-case questions.'
  };

  const chosenStyle = styleDescriptions[explanationStyle] || styleDescriptions.detailed;
  const chosenDifficulty = difficultyDescriptions[difficulty] || difficultyDescriptions.medium;

  return `You are an elite educational AI and study tutor for StudyMate AI.
Generate a comprehensive study session based strictly on the user's input below.

Input Mode: ${mode === 'topic' ? 'Specified Topic' : 'Provided Notes / Text'}
Target Explanation Style: ${chosenStyle}
Target Quiz Difficulty: ${chosenDifficulty}

USER INPUT MATERIAL:
"""
${input}
"""

CRITICAL INSTRUCTIONS:
1. Return ONLY a single raw valid JSON object. Do not include markdown formatting or backticks outside the JSON.
2. The JSON MUST conform EXACTLY to this schema:

{
  "topic": "Concise topic title",
  "summary": {
    "title": "Comprehensive Title for the Summary",
    "content": "Rich, multi-paragraph conceptual summary explaining the material thoroughly according to the chosen explanation style.",
    "keyPoints": [
      "Crucial takeaway point 1",
      "Crucial takeaway point 2",
      "Crucial takeaway point 3",
      "Crucial takeaway point 4",
      "Crucial takeaway point 5"
    ],
    "keywords": [
      "Key Definition 1",
      "Key Definition 2",
      "Key Definition 3",
      "Key Definition 4",
      "Key Definition 5"
    ]
  },
  "quiz": [
    {
      "question": "Clear, specific question directly based on the study material?",
      "options": [
        "First option",
        "Second option",
        "Third option",
        "Fourth option"
      ],
      "correctAnswer": 0,
      "explanation": "Clear explanation of why this answer is correct and why the others are wrong."
    }
  ],
  "flashcards": [
    {
      "question": "Front of card question or key term",
      "answer": "Back of card concise, punchy explanation or answer"
    }
  ]
}

STRICT CONSTRAINTS:
- "quiz" MUST contain EXACTLY 5 questions (no more, no less).
- Every quiz question MUST contain EXACTLY 4 options in its "options" array.
- "correctAnswer" MUST be an integer between 0 and 3 (0 for first option, 1 for second, 2 for third, 3 for fourth).
- "flashcards" MUST contain between 8 and 12 high-yield flashcard items.
- Ensure all questions and flashcards are strictly grounded in the provided user input.`;
}

/**
 * Call Gemini API endpoint
 */
async function callGeminiAPI(apiKey, model, promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API HTTP ${response.status}: ${errorText}`);
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Gemini API returned an empty or unparseable response.');
  }

  return rawText;
}

/**
 * Clean markdown formatting and validate schema
 */
function validateAndCleanResponse(rawText) {
  // Strip code fences if present (e.g. ```json ... ```)
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  const data = JSON.parse(cleaned);

  // Validate topic
  if (!data.topic || typeof data.topic !== 'string') {
    data.topic = 'Study Session';
  }

  // Validate summary
  if (!data.summary || typeof data.summary !== 'object') {
    throw new Error('validation: Missing summary object.');
  }
  if (!data.summary.title) data.summary.title = `${data.topic} Summary`;
  if (!data.summary.content) data.summary.content = 'Summary content generated.';
  if (!Array.isArray(data.summary.keyPoints) || data.summary.keyPoints.length === 0) {
    data.summary.keyPoints = ['Core concept review', 'Key principles discussed in material'];
  }
  if (!Array.isArray(data.summary.keywords) || data.summary.keywords.length === 0) {
    data.summary.keywords = [data.topic];
  }

  // Validate quiz: EXACTLY 5 questions, 4 options each, valid correctAnswer index
  if (!Array.isArray(data.quiz) || data.quiz.length < 5) {
    throw new Error(`validation: Quiz must contain at least 5 questions, received ${data.quiz?.length || 0}.`);
  }

  // Ensure exactly 5 questions
  data.quiz = data.quiz.slice(0, 5).map((q, idx) => {
    if (!q.question || typeof q.question !== 'string') {
      throw new Error(`validation: Question ${idx + 1} has invalid text.`);
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`validation: Question ${idx + 1} must have exactly 4 options.`);
    }
    let answerIdx = Number(q.correctAnswer);
    if (isNaN(answerIdx) || answerIdx < 0 || answerIdx > 3) {
      answerIdx = 0;
    }
    return {
      question: q.question.trim(),
      options: q.options.map((opt) => String(opt).trim()),
      correctAnswer: answerIdx,
      explanation: q.explanation || `Option ${String.fromCharCode(65 + answerIdx)} is correct.`
    };
  });

  // Validate flashcards
  if (!Array.isArray(data.flashcards) || data.flashcards.length === 0) {
    throw new Error('validation: Flashcards array is missing or empty.');
  }

  data.flashcards = data.flashcards.map((f, idx) => {
    return {
      id: `card_${idx + 1}`,
      question: f.question || `Concept ${idx + 1}`,
      answer: f.answer || 'Details explained in summary.',
      status: 'unreviewed' // Default initial status
    };
  });

  return data;
}

