export default async function handler(req, res) {
  // 1. Enforce strict POST request routing
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use POST to stream audio telemetry.' 
    });
  }

  const { text } = req.body;

  // 2. Validate input text buffer payload
  if (!text || text.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'No script text provided for voice compilation.' 
    });
  }

  // 3. Define your target open-source server parameters
  // If you are running a self-hosted Docker container or local instance,
  // simply swap this URL out for your local address (e.g., http://localhost:3000/v1/audio/speech)
  const OPEN_SOURCE_TTS_URL = 'https://api.easyvoice.ae/v1/audio/speech';
  const CORE_AUTH_TOKEN = process.env.OPEN_SOURCE_TTS_KEY || 'free-tier-no-token-needed';

  try {
    // 4. Dispatch text-to-speech instructions to the open-source compiler
    const response = await fetch(OPEN_SOURCE_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CORE_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        model: 'kokoro', // Targets the open-weight 82M parameter framework
        input: text,
        voice: 'am_adam', // Clean, authoritative American male narrative profile
        response_format: 'mp3',
        speed: 1.05 // Subtle tempo acceleration for tight short-form narrative pacing
      })
    });

    // 5. Intercept and parse upstream server errors
    if (!response.ok) {
      // Attempt to extract JSON error descriptions from the server instance if available
      const errorContent = await response.json().catch(() => null);
      const systemErrorMessage = errorContent?.error?.message || `HTTP compilation fault: ${response.status}`;
      
      return res.status(response.status).json({ 
        success: false, 
        message: `Upstream Voice Engine Rejection: ${systemErrorMessage}` 
      });
    }

    // 6. Buffer Parsing: Extract raw binary audio stream array elements
    const binaryBufferArray = await response.arrayBuffer();
    
    if (!binaryBufferArray || binaryBufferArray.byteLength === 0) {
      return res.status(502).json({
        success: false,
        message: 'Voice engine returned an unallocated, empty audio buffer layer.'
      });
    }

    // 7. Data transformation: Map binary data blocks into a standard transport Base64 string
    const transportBase64Data = Buffer.from(binaryBufferArray).toString('base64');

    // 8. Dispatch finalized audio data stream straight to the client interface
    return res.status(200).json({ 
      success: true, 
      audio: `data:audio/mp3;base64,${transportBase64Data}` 
    });

  } catch (error) {
    // 9. Global Pipeline Intercept: Catch unexpected serverless edge runtime failures
    console.error('Critical Audio Node Interruption:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Internal Server Audio Pipeline Exception: ${error.message}` 
    });
  }
}
