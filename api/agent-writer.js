import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// The Visual Agent: Fetches imagery based on the script's specific aesthetic
async function fetchVisuals(searchQuery) {
    try {
        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&orientation=portrait&size=large&per_page=3`, {
            headers: {
                Authorization: process.env.PEXELS_API_KEY
            }
        });
        
        if (!response.ok) throw new Error('Pexels API failed');
        
        const data = await response.json();
        return data.photos.map(photo => photo.src.large2x || photo.src.large);
    } catch (error) {
        console.warn("Visual Agent fallback triggered:", error);
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

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are the lead DGEA Evangelist. Your audience is Gen Z, Gen Alpha, and forward-thinking Millennials. 
                    
                    COMMUNICATION STYLE RULES:
                    1. NO CORPORATE JARGON. Never use words like 'infrastructure,' 'architecture,' or 'protocol' unless they are vital. 
                    2. INTERNET NATIVE. Write like a creator on TikTok/Reels. Use short, punchy sentences.
                    3. THE 'POV' APPROACH. Start with 'POV:' or a direct observation about their reality (e.g., 'Stop working 9-5s for money that loses value every month.').
                    4. VIBE CHECK. Focus on 'Individual Sovereignty' and 'Financial Freedom' as the ultimate vibe. 
                    5. THE GLITCH. Frame traditional finance as a failing game. Frame DGEA as the 'hidden cheat code' that lets them win.
                    6. ELI5. Explain complex economics as if you're explaining a video game mechanic.
                    
                    Return ONLY a valid JSON object with keys: "hook", "body", "cta", "visualQuery". 
                    - 'hook': Must be a scroll-stopper (under 5 seconds). 
                    - 'body': Punchy, fast-paced, relatable, and educational.
                    - 'cta': Low-friction invitation to join the 'Common' revolution.
                    - 'visualQuery': 1-2 words defining the visual aesthetic (e.g., 'cyberpunk city').`
                },
                {
                    role: "user",
                    content: `Create a script about: ${currentTopic}. Focus on why the current financial system is failing and how the DGEA 'glitch' fixes it.`
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const scriptData = JSON.parse(completion.choices[0].message.content);
        
        // Execute visual agent based on the script's aesthetic
        const automatedImages = await fetchVisuals(scriptData.visualQuery || currentTopic);

        return res.status(200).json({ 
            success: true, 
            hook: scriptData.hook, 
            body: scriptData.body, 
            cta: scriptData.cta,
            images: automatedImages 
        });

    } catch (error) {
        console.error("DGEA Strategy Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
