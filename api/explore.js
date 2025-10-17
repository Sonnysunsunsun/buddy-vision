/**
 * Vercel Serverless Function: Explore Neighborhood
 * Provides information about restaurants, attractions, and culture near a location
 */

const https = require('https');

// Helper function to make HTTPS requests
function httpsRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

// OpenAI GPT call for neighborhood info
async function getNeighborhoodInfo(location, apiKey, language) {
    // Map language codes to language names
    const languageNames = {
        'en-US': 'English',
        'es-ES': 'Spanish',
        'fr-FR': 'French',
        'de-DE': 'German',
        'it-IT': 'Italian',
        'pt-PT': 'Portuguese',
        'ru-RU': 'Russian',
        'ja-JP': 'Japanese',
        'ko-KR': 'Korean',
        'zh-CN': 'Chinese (Simplified)',
        'ar-SA': 'Arabic',
        'hi-IN': 'Hindi',
        'nl-NL': 'Dutch',
        'pl-PL': 'Polish',
        'tr-TR': 'Turkish'
    };

    const targetLanguage = languageNames[language] || 'English';

    const systemPrompt = `You are a local LA guide helping visitors explore neighborhoods around Olympic venues. Respond in ${targetLanguage}.`;

    const userPrompt = `Tell me about the neighborhood around ${location} in Los Angeles. Include:

1. TOP 3 RESTAURANTS: Popular local spots (with cuisine types)
2. ICONIC ATTRACTIONS: Must-see landmarks or cultural spots nearby
3. LOCAL VIBE: What makes this neighborhood special
4. VISITOR TIPS: Best times to visit, how to get around

Keep it concise (3-4 sentences total). Be enthusiastic and helpful. Respond entirely in ${targetLanguage}.`;

    const requestBody = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 250
    });

    const options = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(requestBody)
        }
    };

    const response = await httpsRequest(options, requestBody);

    if (response.error) {
        throw new Error(`OpenAI API error: ${response.error.message}`);
    }

    return response.choices[0].message.content.trim();
}

// Main serverless function handler
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { location, language } = req.body;

        if (!location) {
            return res.status(400).json({ error: 'Missing location' });
        }

        // Get API key from environment
        const openaiKey = process.env.OPENAI_API_KEY;

        if (!openaiKey) {
            return res.status(500).json({
                error: 'API key not configured. Please set OPENAI_API_KEY environment variable.'
            });
        }

        // Get neighborhood info
        console.log('Getting neighborhood info for:', location);
        const neighborhoodInfo = await getNeighborhoodInfo(location, openaiKey, language || 'en-US');

        // Return result
        return res.status(200).json({
            success: true,
            location,
            info: neighborhoodInfo
        });

    } catch (error) {
        console.error('Error in explore function:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
};
