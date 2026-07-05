import { put } from '@vercel/blob';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { text } = req.body;
    const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Replace with your preferred ElevenLabs Voice ID

    try {
        // 1. Request audio from ElevenLabs
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_flash_v2_5', // High-speed model for faster exports
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!ttsResponse.ok) throw new Error("ElevenLabs generation failed.");

        const audioBuffer = await ttsResponse.arrayBuffer();

        // 2. Store in Vercel Blob (Permanent Public URL)
        const filename = `narration_${Date.now()}.mp3`;
        const blob = await put(filename, audioBuffer, {
            access: 'public',
            contentType: 'audio/mpeg'
        });

        // 3. Return the public URL to your dashboard
        return res.status(200).json({ success: true, audio: blob.url });

    } catch (error) {
        console.error("Voice Generation Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
