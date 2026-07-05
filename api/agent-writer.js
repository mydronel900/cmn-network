import { put } from '@vercel/blob';

export default async function handler(req, res) {
    const { text } = req.body;

    try {
        // 1. Call your preferred TTS Provider (e.g., ElevenLabs)
        const ttsResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/...', {
            method: 'POST',
            // ... headers and body ...
        });
        const audioBuffer = await ttsResponse.buffer();

        // 2. Save the audio to Vercel Blob to get a public URL
        const blob = await put(`voice_${Date.now()}.mp3`, audioBuffer, {
            access: 'public',
        });

        // 3. Return the PUBLIC URL, not a stream
        return res.status(200).json({ success: true, audio: blob.url });
        
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server TTS failed." });
    }
}
