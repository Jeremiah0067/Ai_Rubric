// Netlify function format
exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server is missing GEMINI_API_KEY. Add it in Netlify → Site settings → Environment variables.' }),
    };
  }

  const { mimeType, imageBase64, prompt } = JSON.parse(event.body || '{}');
  if (!mimeType || !imageBase64 || !prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing mimeType, imageBase64, or prompt in request body.' }) };
  }

  try {
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mimeType, data: imageBase64 } }, { text: prompt }] }],
        }),
      }
    );

    const data = await geminiResponse.json();
    if (!geminiResponse.ok) {
      return { statusCode: geminiResponse.status, body: JSON.stringify({ error: `Gemini API error: ${data?.error?.message || geminiResponse.statusText}` }) };
    }

    const candidate = data.candidates && data.candidates[0];
    const textPart = candidate?.content?.parts?.find((p) => p.text);
    if (!textPart) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No text returned from Gemini.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ result: textPart.text }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: `Server error: ${err.message}` }) };
  }
};
