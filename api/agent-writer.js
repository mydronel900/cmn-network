import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// NEW: The Visual Agent sub-routine
async function fetchVisuals(searchQuery) {
    try {
        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&orientation=portrait&size=large&per_page=3`, {
            headers: {
                Authorization: process.env.PEXELS_API_KEY
            }
        });
        
        if (!response.ok) throw new Error('Pexels API failed');
        
        const data = await response.json();
        
        // Extract just the raw, high-res image URLs
        return data.photos.map(photo => photo.src.large2x || photo.src.large);
    } catch (error) {
        console.warn("Visual Agent failed, using fallbacks:", error);
        // Fallback images so the video rendering never crashes
        return [
            "https://images.pexels.com/photos/255379/pexels-photo-255379.jpeg",
            "https://images.pexels.com/photos/15286/pexels-photo.jpg",
            "https://images.pexels.com/photos/572897/pexels-photo-572897.jpeg"
        ];
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

    try {
        const { currentTopic } = req.body;

        // 1. Tell Groq to also generate a visual search query
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a media production AI. Return ONLY a valid JSON object with keys: 'hook', 'body', 'cta', and 'visualQuery'. 'hook' should be short/punchy. 'body' should be a script body. 'cta' should be a call to action. 'visualQuery' must be a 1-2 word string describing the aesthetic of the video (e.g., 'cyberpunk city', 'dark forest', 'gold coins'). Do not include any extra text."
                },
                {
                    role: "user",
                    content: `Generate a script about: ${currentTopic}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const scriptData = JSON.parse(completion.choices[0].message.content);
        const aestheticQuery = scriptData.visualQuery || currentTopic;

        // 2. Unleash the Visual Agent to fetch the images based on Groq's query
        const automatedImages = await fetchVisuals(aestheticQuery);

        // 3. Return the complete package to the frontend
        return res.status(200).json({ 
            success: true, 
            hook: scriptData.hook || "CRITICAL ALERT", 
            body: scriptData.body || "Data streams compiling...", 
            cta: scriptData.cta || "Initialize sequence.",
            images: automatedImages // Pass the automated images back to the dashboard
        });

    } catch (error) {
        console.error("Writer Logic Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
