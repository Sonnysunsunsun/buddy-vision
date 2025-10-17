/**
 * Buddy Vision - OpenAI GPT-3.5-turbo Integration
 * Generates context-aware descriptions from vision data
 */

class AIDescriptionGenerator {
    constructor() {
        this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-3.5-turbo';

        // Venue-specific context
        this.venueData = {
            'staples-center': {
                name: 'Crypto.com Arena',
                sport: 'Basketball',
                context: 'This is a major indoor arena with multiple levels. Accessible entrances are typically on the south side. Olympic volunteers wear blue uniforms with LA28 badges.',
                layout: 'Main entrance is crowded during events. Elevator access is near Section 111. Accessible seating is on the lower level.'
            },
            'la-coliseum': {
                name: 'LA Memorial Coliseum',
                sport: 'Track & Field',
                context: 'Historic outdoor stadium. Accessible entrances are at Gates 1 and 22. Volunteers in yellow vests assist at all entry points.',
                layout: 'Stadium seating with wheelchair accessible areas in sections 1-4 and 23-26. Elevators at each corner.'
            },
            'ucla': {
                name: 'UCLA Pauley Pavilion',
                sport: 'Gymnastics',
                context: 'College campus venue. Volunteers in UCLA blue and gold help navigate campus. Accessible parking near Lot 8.',
                layout: 'Main entrance on north side. Elevator access to all seating levels. Less crowded than downtown venues.'
            },
            'rose-bowl': {
                name: 'Rose Bowl Stadium',
                sport: 'Soccer',
                context: 'Large outdoor stadium in Pasadena. Accessible shuttles from parking. Volunteers in white shirts with Olympic logos.',
                layout: 'Multiple entry gates (A-H). Accessible seating throughout. Bring sun protection.'
            },
            'convention-center': {
                name: 'LA Convention Center',
                sport: 'Wrestling',
                context: 'Large indoor complex. Well-marked accessible routes. Volunteers at all information desks.',
                layout: 'Modern facility with excellent accessibility. Clear signage throughout. Multiple elevators and ramps.'
            }
        };
    }

    /**
     * Generate description from vision data and settings
     * @param {Object} visionData - Processed vision data
     * @param {Object} settings - User settings (venue, detail level)
     * @param {string} apiKey - OpenAI API key
     * @returns {string} Generated description
     */
    async generateDescription(visionData, settings, apiKey) {
        try {
            console.log('Generating description with GPT-3.5-turbo...');

            // Get current language from voice controller
            const currentLanguage = window.buddyVoice?.currentLanguage || 'en-US';

            // Format vision data for GPT
            const formattedPrompt = this.formatVisionDataForGPT(visionData, settings, currentLanguage);

            // Prepare request
            const requestBody = {
                model: this.model,
                temperature: 0.7,
                max_tokens: this.getMaxTokens(settings.detailLevel),
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt(settings, currentLanguage)
                    },
                    {
                        role: 'user',
                        content: formattedPrompt
                    }
                ]
            };

            console.log('Sending request to OpenAI API...');

            // Make API request
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            // Extract description from response
            const description = data.choices[0]?.message?.content || 'No description generated';

            console.log('GPT description generated:', description);
            return description.trim();

        } catch (error) {
            console.error('AI description error:', error);
            throw new Error(`Failed to generate description: ${error.message}`);
        }
    }

    /**
     * Get system prompt based on settings
     * @param {Object} settings - User settings
     * @param {string} language - Target language code (e.g., 'es-ES')
     * @returns {string} System prompt
     */
    getSystemPrompt(settings, language = 'en-US') {
        const languageInstructions = this.getLanguageInstructions(language);

        return `You are Buddy Vision, a universal AI visual assistant helping ALL visitors at the LA 2028 Olympics understand their environment.

Your users include:
- Visually impaired individuals
- Non-English speakers needing translations
- Elderly visitors needing clarity
- Tourists unfamiliar with venues
- Anyone needing quick visual information

Your responses should:
1. Provide clear, actionable descriptions of what's visible
2. Identify text on signs, menus, schedules (for translation)
3. Describe navigation options (exits, directions, accessible routes)
4. Note important Olympic elements (volunteers, event info, facilities)
5. Explain crowd conditions and safety considerations
6. Use natural, conversational language accessible to all

Adapt your description length based on the user's setting:
- Quick: 1-2 sentences, essential info only
- Standard: 3-4 sentences, balanced detail
- Detailed: 5-7 sentences, comprehensive scene understanding

CRITICAL: Provide meaningful context, not just object lists. Include visible TEXT exactly as written (for translation). Mention people, their activities, and the overall atmosphere.

Focus on practical needs: Where am I? What's around me? Where can I go? What do signs say? Is it safe to proceed?

${languageInstructions}`;
    }

    /**
     * Get language-specific instructions
     * @param {string} language - Language code
     * @returns {string} Language instructions
     */
    getLanguageInstructions(language) {
        const languageMap = {
            'en-US': 'RESPOND IN ENGLISH.',
            'en-GB': 'RESPOND IN ENGLISH (UK).',
            'en-AU': 'RESPOND IN ENGLISH (AUSTRALIAN).',
            'es-ES': 'RESPONDE EN ESPAÑOL. Proporciona todas las descripciones en español.',
            'es-MX': 'RESPONDE EN ESPAÑOL MEXICANO. Proporciona todas las descripciones en español.',
            'es-AR': 'RESPONDE EN ESPAÑOL ARGENTINO. Proporciona todas las descripciones en español.',
            'fr-FR': 'RÉPONDEZ EN FRANÇAIS. Fournissez toutes les descriptions en français.',
            'fr-CA': 'RÉPONDEZ EN FRANÇAIS CANADIEN. Fournissez toutes les descriptions en français.',
            'de-DE': 'ANTWORTE AUF DEUTSCH. Gib alle Beschreibungen auf Deutsch.',
            'it-IT': 'RISPONDI IN ITALIANO. Fornisci tutte le descrizioni in italiano.',
            'pt-BR': 'RESPONDA EM PORTUGUÊS BRASILEIRO. Forneça todas as descrições em português.',
            'pt-PT': 'RESPONDA EM PORTUGUÊS EUROPEU. Forneça todas as descrições em português.',
            'nl-NL': 'ANTWOORD IN HET NEDERLANDS. Geef alle beschrijvingen in het Nederlands.',
            'ru-RU': 'ОТВЕЧАЙ ПО-РУССКИ. Предоставляй все описания на русском языке.',
            'ja-JP': '日本語で応答してください。すべての説明を日本語で提供してください。',
            'ko-KR': '한국어로 응답하세요. 모든 설명을 한국어로 제공하세요.',
            'zh-CN': '用简体中文回答。用简体中文提供所有描述。',
            'zh-TW': '用繁體中文回答。用繁體中文提供所有描述。',
            'zh-HK': '用繁體中文（香港）回答。用繁體中文提供所有描述。',
            'ar-SA': 'أجب بالعربية. قدم جميع الأوصاف باللغة العربية.',
            'ar-EG': 'أجب بالعربية المصرية. قدم جميع الأوصاف باللغة العربية.',
            'hi-IN': 'हिंदी में उत्तर दें। सभी विवरण हिंदी में प्रदान करें।',
            'tr-TR': 'TÜRKÇE CEVAPLAYIN. Tüm açıklamaları Türkçe olarak sağlayın.',
            'pl-PL': 'ODPOWIADAJ PO POLSKU. Podaj wszystkie opisy po polsku.',
            'sv-SE': 'SVARA PÅ SVENSKA. Ge alla beskrivningar på svenska.',
            'nb-NO': 'SVAR PÅ NORSK. Gi alle beskrivelser på norsk.',
            'da-DK': 'SVAR PÅ DANSK. Giv alle beskrivelser på dansk.',
            'fi-FI': 'VASTAA SUOMEKSI. Anna kaikki kuvaukset suomeksi.',
            'el-GR': 'ΑΠΑΝΤΗΣΤΕ ΣΤΑ ΕΛΛΗΝΙΚΑ. Δώστε όλες τις περιγραφές στα ελληνικά.',
            'he-IL': 'ענה בעברית. ספק את כל התיאורים בעברית.',
            'th-TH': 'ตอบเป็นภาษาไทย ให้คำอธิบายทั้งหมดเป็นภาษาไทย',
            'vi-VN': 'TRẢ LỜI BẰNG TIẾNG VIỆT. Cung cấp tất cả mô tả bằng tiếng Việt.',
            'id-ID': 'JAWAB DALAM BAHASA INDONESIA. Berikan semua deskripsi dalam bahasa Indonesia.',
            'ms-MY': 'JAWAB DALAM BAHASA MELAYU. Berikan semua huraian dalam bahasa Melayu.',
            'fil-PH': 'SUMAGOT SA FILIPINO. Magbigay ng lahat ng paglalarawan sa Filipino.'
        };

        return languageMap[language] || 'RESPOND IN ENGLISH.';
    }

    /**
     * Format vision data for GPT prompt
     * @param {Object} visionData - Vision analysis data
     * @param {Object} settings - User settings
     * @param {string} language - Target language code
     * @returns {string} Formatted prompt
     */
    formatVisionDataForGPT(visionData, settings, language = 'en-US') {
        // Generate unique timestamp to prevent caching
        const captureTime = new Date().toISOString();
        const randomId = Math.random().toString(36).substring(7);

        // Build prompt sections
        let prompt = `[UNIQUE CAPTURE ID: ${randomId} at ${captureTime}]\n`;
        prompt += `Describe this scene for an LA 2028 Olympics visitor who needs visual assistance.\n`;
        prompt += `User may be visually impaired, non-English speaking, elderly, or simply need quick info.\n\n`;

        // Detected elements
        prompt += `Detected elements:\n`;

        // People and emotions
        if (visionData.faces.count > 0) {
            prompt += `- People: ${visionData.faces.count} person${visionData.faces.count > 1 ? 's' : ''} detected\n`;

            // Add emotion context if available
            const emotions = visionData.faces.emotions
                .filter(e => e.emotion !== 'neutral')
                .map(e => e.emotion);

            if (emotions.length > 0) {
                prompt += `  Emotions: ${emotions.join(', ')}\n`;
            }
        } else {
            prompt += `- People: No people detected in immediate view\n`;
        }

        // Objects
        if (visionData.objects.length > 0) {
            const topObjects = visionData.objects
                .slice(0, 8)
                .map(o => `${o.name} (${o.position})`)
                .join(', ');
            prompt += `- Objects: ${topObjects}\n`;
        }

        // Text
        if (visionData.text.hasText) {
            prompt += `- Visible text: "${visionData.text.fullText}"\n`;
        }

        // Scene type
        if (visionData.labels.length > 0) {
            const topLabels = visionData.labels.slice(0, 5).map(l => l.name).join(', ');
            prompt += `- Scene type: ${topLabels}\n`;
        }

        // User needs (removed venue-specific context - let AI determine from image)
        prompt += `\nIMPORTANT: This is a NEW capture at ${new Date().toLocaleTimeString()}. Give a FRESH description.\n\n`;
        prompt += `Context: LA 2028 Olympics. Universal accessibility - help ALL visitors understand:\n`;
        prompt += `1. VISIBLE TEXT: Quote any signs, schedules, menus EXACTLY (for translation)\n`;
        prompt += `2. NAVIGATION: Exits, directions, accessible routes, facilities\n`;
        prompt += `3. PEOPLE & CROWD: Where people are, what they're doing, Olympic staff presence\n`;
        prompt += `4. LOCATION CONTEXT: What venue/area this appears to be based on visible cues\n`;
        prompt += `5. SAFETY: Obstacles, crowd density, moving objects, steps/ramps\n`;
        prompt += `6. PRACTICAL INFO: Food, bathrooms, seating, ticket areas if visible\n`;

        // Detail level instruction
        prompt += `\nProvide a ${settings.detailLevel || 'standard'} description:\n`;
        prompt += `- Quick: 1-2 sentences, just the essentials\n`;
        prompt += `- Standard: 3-4 sentences, balanced and helpful\n`;
        prompt += `- Detailed: 5-7 sentences, comprehensive understanding\n`;

        prompt += `\nBe conversational and focus on what matters for someone who cannot see. Don't just list objects - paint a picture of the social and physical environment.`;

        return prompt;
    }

    /**
     * Get max tokens based on detail level
     * @param {string} detailLevel - Detail level setting
     * @returns {number} Max tokens
     */
    getMaxTokens(detailLevel) {
        const tokens = {
            'quick': 100,
            'standard': 300,
            'detailed': 500
        };
        return tokens[detailLevel] || 300;
    }

    /**
     * Generate fallback description (if API fails)
     * @param {Object} visionData - Vision data
     * @returns {string} Basic description
     */
    generateFallbackDescription(visionData) {
        const parts = [];

        // People
        if (visionData.faces.count > 0) {
            parts.push(`${visionData.faces.count} person${visionData.faces.count > 1 ? 's' : ''} detected`);
        }

        // Objects
        if (visionData.objects.length > 0) {
            const mainObjects = visionData.objects.slice(0, 3).map(o => o.name);
            parts.push(`including ${mainObjects.join(', ')}`);
        }

        // Text
        if (visionData.text.hasText) {
            parts.push(`Text visible: ${visionData.text.fullText.substring(0, 50)}`);
        }

        // Scene
        if (visionData.labels.length > 0) {
            parts.push(`Scene appears to be ${visionData.labels[0].name.toLowerCase()}`);
        }

        return parts.length > 0
            ? parts.join('. ') + '.'
            : 'Unable to generate detailed description. Please try again.';
    }
}

// Initialize and expose globally
window.buddyAI = new AIDescriptionGenerator();
console.log('AI Description Generator initialized');
