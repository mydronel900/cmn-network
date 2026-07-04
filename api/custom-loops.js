export default async function handler(req, res) {
  // Only allow secure POST submission requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email field is required' });
  }

  try {
    const apiKey = process.env.LOOPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Server error: Missing internal credential validation' });
    }

    // Forward the email payload securely to the Loops Core API
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
      return res.status(loopsResponse.status).json({ success: false, message: data.message || 'Loops sync rejection' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
