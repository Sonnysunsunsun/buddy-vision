/**
 * Vercel Serverless Function: Analyze Image
 * Handles both Google Vision API and OpenAI GPT-4 Vision
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

// Google Vision API call
async function analyzeWithGoogleVision(imageBase64, apiKey) {
    const imageContent = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const requestBody = JSON.stringify({
        requests: [{
            image: { content: imageContent },
            features: [
                { type: 'LABEL_DETECTION', maxResults: 10 },
                { type: 'TEXT_DETECTION' },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                { type: 'LANDMARK_DETECTION', maxResults: 5 },
                { type: 'LOGO_DETECTION', maxResults: 5 },
                { type: 'FACE_DETECTION', maxResults: 5 }
            ]
        }]
    });

    const options = {
        hostname: 'vision.googleapis.com',
        path: `/v1/images:annotate?key=${apiKey}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        }
    };

    const response = await httpsRequest(options, requestBody);

    if (response.error) {
        throw new Error(`Google Vision API error: ${response.error.message}`);
    }

    const annotations = response.responses[0];

    // Process text detection
    const textAnnotations = annotations.textAnnotations || [];
    const fullText = textAnnotations.length > 0 ? textAnnotations[0].description : '';

    // Process labels
    const labels = (annotations.labelAnnotations || []).map(l => ({
        name: l.description,
        confidence: l.score
    }));

    // Process objects
    const objects = (annotations.localizedObjectAnnotations || []).map(o => ({
        name: o.name,
        confidence: o.score
    }));

    // Process landmarks
    const landmarks = (annotations.landmarkAnnotations || []).map(l => l.description);

    // Process logos
    const logos = (annotations.logoAnnotations || []).map(l => l.description);

    // Process faces
    const faces = (annotations.faceAnnotations || []).map(f => ({
        joy: f.joyLikelihood,
        sorrow: f.sorrowLikelihood,
        anger: f.angerLikelihood,
        surprise: f.surpriseLikelihood
    }));

    return {
        text: {
            hasText: textAnnotations.length > 0,
            fullText: fullText,
            confidence: textAnnotations.length > 0 ? textAnnotations[0].confidence : 0
        },
        labels,
        objects,
        landmarks,
        logos,
        faces
    };
}

// OpenAI GPT-4 Vision call
async function generateDescriptionWithGPT(visionData, settings, apiKey, language) {
    const detailLevel = settings.detailLevel || 'standard';

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

    let systemPrompt = `You are a navigation assistant for LA 2028 Olympics visitors. Your job is to help people identify where they are and navigate to where they need to go. IMPORTANT: You MUST respond in ${targetLanguage}. `;

    if (detailLevel === 'brief') {
        systemPrompt += `Provide a SHORT 1-2 sentence location identification and navigation help in ${targetLanguage}.`;
    } else if (detailLevel === 'detailed') {
        systemPrompt += `Provide DETAILED location analysis and navigation directions in ${targetLanguage}.`;
    } else {
        systemPrompt += `Identify the location and provide helpful navigation guidance in ${targetLanguage}.`;
    }

    // Build context from vision data
    let context = 'Vision Analysis:\n';

    if (visionData.text.hasText) {
        context += `\nText detected: "${visionData.text.fullText}"\n`;
    }

    if (visionData.labels.length > 0) {
        context += `\nLabels: ${visionData.labels.map(l => l.name).join(', ')}\n`;
    }

    if (visionData.objects.length > 0) {
        context += `\nObjects: ${visionData.objects.map(o => o.name).join(', ')}\n`;
    }

    if (visionData.landmarks.length > 0) {
        context += `\nLandmarks: ${visionData.landmarks.join(', ')}\n`;
    }

    if (visionData.logos.length > 0) {
        context += `\nLogos: ${visionData.logos.join(', ')}\n`;
    }

    // Add event/venue context if selected
    let eventContext = '';
    if (settings.selectedEvent && settings.selectedVenue) {
        eventContext = `\n\nIMPORTANT: The user is trying to attend ${settings.selectedEvent} at ${settings.selectedVenue}. Help them navigate there if possible.`;
    }

    const userPrompt = `${context}${eventContext}\n\nAnalyze this image to help a visitor navigate LA during the 2028 Olympics. Your response in ${targetLanguage} should:

1. IDENTIFY THE LOCATION: Try to determine where they are based on landmarks, street signs, building names, or venue markers.

2. SPOT LA28 WORKERS: Look for people wearing LA28 volunteer uniforms, Olympic staff badges, or official gear who can help.

3. PROVIDE NAVIGATION HELP: If you can identify the location, suggest directions or next steps. If nearby venues/facilities are visible, mention them.

4. IF LOCATION IS UNCLEAR: Tell the user "I can't determine your exact location from this image. For better navigation help, please take a photo of: a nearby street sign, a building with a visible address, or a recognizable LA landmark."

Be conversational and helpful. Focus on practical navigation guidance. Remember: Your entire response MUST be in ${targetLanguage}.`;

    const requestBody = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300
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
        const { imageData, settings, language } = req.body;

        if (!imageData) {
            return res.status(400).json({ error: 'Missing imageData' });
        }

        // Get API keys from environment variables
        const openaiKey = process.env.OPENAI_API_KEY;
        const visionKey = process.env.GOOGLE_VISION_API_KEY;

        if (!openaiKey || !visionKey) {
            return res.status(500).json({
                error: 'API keys not configured. Please set OPENAI_API_KEY and GOOGLE_VISION_API_KEY environment variables.'
            });
        }

        // Step 1: Analyze with Google Vision
        console.log('Analyzing with Google Vision...');
        const visionData = await analyzeWithGoogleVision(imageData, visionKey);

        // Step 2: Generate description with GPT in the user's language
        console.log('Generating description with GPT in language:', language || 'en-US');
        const description = await generateDescriptionWithGPT(visionData, settings || {}, openaiKey, language || 'en-US');

        // Return combined result
        return res.status(200).json({
            success: true,
            visionData,
            description
        });

    } catch (error) {
        console.error('Error in analyze function:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
};
