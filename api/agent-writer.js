import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

    try {
        const { currentTopic } = req.body;

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a media production AI. Return ONLY a valid JSON object with keys: 'hook', 'body', 'cta'. 'hook' should be short/punchy. 'body' should be a script body. 'cta' should be a call to action. Do not include any markdown or extra text."
                },
                {
                    role: "user",
                    content: `Generate a script about: ${currentTopic}`
                }
            ],
            // FIXED: Updated to Groq's active 70B model
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const scriptData = JSON.parse(completion.choices[0].message.content);

        return res.status(200).json({ 
            success: true, 
            hook: scriptData.hook || "CRITICAL ALERT", 
            body: scriptData.body || "Data streams compiling...", 
            cta: scriptData.cta || "Initialize sequence." 
        });

    } catch (error) {
        console.error("Writer Logic Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
