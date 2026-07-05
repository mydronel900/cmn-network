import { put } from '@vercel/blob';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

    try {
        const { text } = req.body;
        // NOTE: Replace with your actual ElevenLabs Voice ID
        const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 

        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_monolingual_v1"
            })
        });

        if (!ttsResponse.ok) {
            const errText = await ttsResponse.text();
            throw new Error(`ElevenLabs API rejected request: ${errText}`);
        }

        // Standardized binary conversion
        const arrayBuffer = await ttsResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const blob = await put(`audio_${Date.now()}.mp3`, buffer, {
            access: 'public',
            contentType: 'audio/mpeg'
        });

        return res.status(200).json({ success: true, audio: blob.url });

    } catch (error) {
        console.error("Voice Generation Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
