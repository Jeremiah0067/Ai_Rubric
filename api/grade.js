// Vercel serverless function — this is your free backend.
// Deployed automatically from the /api folder, no extra config needed.
// It keeps your Gemini API key on the server; the browser never sees it.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb', // headroom for a compressed classroom photo
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server is missing GEMINI_API_KEY. Add it in your Vercel project settings under Environment Variables.',
    });
  }

  const { mimeType, imageBase64, prompt } = req.body || {};
  if (!mimeType || !imageBase64 || !prompt) {
    return res.status(400).json({ error: 'Missing mimeType, imageBase64, or prompt in request body.' });
  }

  try {
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: prompt },
              ],
            },
          ],
        }),
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        error: `Gemini API error: ${data?.error?.message || geminiResponse.statusText}`,
      });
    }

    const candidate = data.candidates && data.candidates[0];
    const textPart =
      candidate &&
      candidate.content &&
      candidate.content.parts &&
      candidate.content.parts.find((p) => p.text);

    if (!textPart) {
      return res.status(500).json({ error: 'No text returned from Gemini.' });
    }

    return res.status(200).json({ result: textPart.text });
  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
