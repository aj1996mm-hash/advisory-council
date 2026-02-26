export default async function handler(req, res) {
  // التأكد من أن الطلب من نوع POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemPrompt, userMessage } = req.body;
  
  // سنقوم بجلب المفتاح من إعدادات Vercel السرية (Environment Variables)
  const apiKey = process.env.GEMINI_API_KEY; 

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Instructions: ${systemPrompt}\n\nIMPORTANT: End with VOTE: (مع/ضد/امتنع) + Reason.\n\nUser: ${userMessage}`
          }]
        }]
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect to AI server' });
  }
}
