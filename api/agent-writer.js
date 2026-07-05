export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { currentTopic } = req.body;

  const MANIFESTO_CONTEXT = `
    The Decentralized Global Economic Architecture (DGEA) replaces fiat monetary printing with resource anchoring (Energy, Water, Space). 
    It eliminates the 30% middleman extraction tax imposed by corporate tech platforms using zero-friction parallel routing networks.
    Governance is strictly 1 verified human identity = 1 node signature. Capital cannot buy voting weight.
    Stage 1 is the Information Faucet: users lock in Genesis Node IDs at cmn.network.
  `;

  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ success: false, message: 'Missing Groq API credential infrastructure.' });
    }

    // Ping Groq's blazing-fast inference endpoint
    const response = await fetch('[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', 
        temperature: 0.1, // FIX 1: Low temperature forces structural discipline and stops conversational filler
        messages: [
          {
            role: 'system',
            // FIX 2: Explicitly commanding JSON format here satisfies Groq's JSON Mode criteria
            content: 'You are the lead Creative Director Agent for the DGEA Network. Your voice is revolutionary, calm, authoritative, and deeply persuasive. Avoid corporate fluff, hype words, or emojis. CRITICAL: You must respond ONLY with a raw, valid JSON object. Do not include markdown blocks, backticks, or prologue/epilogue text.'
          },
          {
            role: 'user',
            // FIX 3: Swapped numbered guidelines out for an absolute structural syntax map
            content: `
              Using this DGEA Framework Context: "${MANIFESTO_CONTEXT}"
              Write a 9:16 vertical short-form video script addressing this current macroeconomic event: "${currentTopic || 'General inflation and purchasing power loss'}"
              
              Output a JSON object that strictly maps to this key template layout:
              {
                "hook": "A magnetic 3-second visual and spoken opener text",
                "body": "3 concise, hard-hitting facts breaking down the issue and presenting DGEA as the architecture",
                "cta": "A direct call to action to secure a Genesis Node ID at cmn.network"
              }
            `
          }
        ],
        response_format: { type: "json_object" } 
      })
    });

    const aiData = await response.json();
    
    // Safety check for backend processing
    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: aiData.error?.message || 'Groq Core API rejection.' });
    }

    // Parse verified payload content safely
    const rawContent = aiData.choices[0].message.content;
    const generatedScript = JSON.parse(rawContent);
    
    return res.status(200).json({ success: true, script: generatedScript });

  } catch (error) {
    console.error('Do Fleet Operational Interruption:', error);
    return res.status(500).json({ success: false, message: `Pipeline Exception: ${error.message}` });
  }
}
