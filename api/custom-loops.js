export default async function handler(req, res) {
  // Enforce secure POST submission channels
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  let email = req.body?.email;
  
  // Fail-safe: If data was sent as a raw form string instead of clean JSON, parse it manually
  if (!email && typeof req.body === 'string') {
    try {
      const params = new URLSearchParams(req.body);
      email = params.get('email');
    } catch (e) {
      console.error('Failed parsing body string:', e);
    }
  }

  // If no email could be extracted, throw a clear payload validation error
  if (!email) {
    console.error('Validation Failure: No email key identified in payload. Received:', req.body);
    return res.status(400).json({ success: false, message: 'Email address missing from submission' });
  }

  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) {
    console.error('Configuration Error: LOOPS_API_KEY environment variable is missing on Vercel.');
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }

  try {
    // Send payload straight to Loops API Engine
    const loopsResponse = await fetch('https://app.loops.so/api/v1/contacts/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email: email,
        source: 'CMN Landing System Cohort 1'
      })
    });

    const data = await loopsResponse.json();

    if (!loopsResponse.ok) {
      console.error('Loops API Core Rejection:', data);
      return res.status(loopsResponse.status).json({ success: false, message: data.message || 'Loops API rejection' });
    }

    console.log('Data successfully logged to Loops for email:', email);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('System Routing Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

