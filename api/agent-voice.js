export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, message: 'No speech telemetry text provided.' });
  }

  try {
    // Uses your existing OPENAI_API_KEY environment variable in Vercel
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Missing OpenAI Voice core token infrastructure.' });
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1', // High-speed processing optimized model
        input: text,
        voice: 'onyx', // Deep, authoritative, revolutionary male voice profile
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ success: false, message: errData.error?.message || 'Voice Engine conversion mismatch.' });
    }

    // Convert the raw MP3 binary array buffer into a transportable base64 string
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    return res.status(200).json({ success: true, audio: `data:audio/mp3;base64,${base64Audio}` });

  } catch (error) {
    console.error('Voice Fleet Exception Intercept:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
