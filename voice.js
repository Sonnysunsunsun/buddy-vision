/**
 * Buddy Vision - Web Speech API Integration
 * Handles text-to-speech output with adjustable settings
 */

class VoiceController {
    constructor() {
        // Check for speech synthesis support
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.currentVoice = null;
        this.rate = 1.0;
        this.pitch = 1.0;
        this.volume = 1.0;
        this.isSpeaking = false;

        // Language settings
        this.currentLanguage = this.loadLanguage();

        // Initialize
        this.init();
    }

    /**
     * Load saved language from localStorage
     * @returns {string} Language code
     */
    loadLanguage() {
        const savedLanguage = localStorage.getItem('buddyVisionLanguage');
        return savedLanguage || 'en-US';
    }

    /**
     * Save language to localStorage
     * @param {string} languageCode - Language code (e.g., 'es-ES')
     */
    saveLanguage(languageCode) {
        localStorage.setItem('buddyVisionLanguage', languageCode);
        this.currentLanguage = languageCode;
        console.log(`Language saved: ${languageCode}`);
    }

    /**
     * Change the current language
     * @param {string} languageCode - Language code (e.g., 'es-ES')
     */
    changeLanguage(languageCode) {
        console.log('Changing language to:', languageCode);
        this.saveLanguage(languageCode);

        // Reload voices for new language
        const voices = this.synth.getVoices();
        this.selectVoiceForLanguage(voices, languageCode);

        // Update UI translations
        console.log('Checking for updateUILanguage function:', typeof window.updateUILanguage);
        if (window.updateUILanguage) {
            console.log('Calling updateUILanguage');
            window.updateUILanguage(languageCode);
        } else {
            console.error('updateUILanguage function not found on window object!');
        }

        // Announce language change
        const translations = window.buddyTranslations?.getTranslations(languageCode);
        console.log('Translations found:', !!translations);
        if (translations) {
            console.log('Speaking:', translations.languageSelected);
            this.speak(translations.languageSelected, { lang: languageCode });
        }
    }

    async init() {
        if (!this.synth) {
            console.warn('Speech synthesis not supported in this browser');
            return;
        }

        // Wait for voices to load
        await this.loadVoices();

        // Set up language selector
        this.setupLanguageSelector();

        console.log('Voice Controller initialized');
        console.log('Available voices:', this.synth.getVoices().length);
        console.log('Current language:', this.currentLanguage);
    }

    /**
     * Set up language selector event listener
     */
    setupLanguageSelector() {
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            // Set the current language
            languageSelect.value = this.currentLanguage;

            // Update UI immediately with current language
            console.log('Setting up language selector, current language:', this.currentLanguage);
            if (window.updateUILanguage) {
                console.log('Calling updateUILanguage for initial setup');
                window.updateUILanguage(this.currentLanguage);
            } else {
                console.warn('updateUILanguage not available yet, will retry');
                // Retry after a short delay
                setTimeout(() => {
                    if (window.updateUILanguage) {
                        window.updateUILanguage(this.currentLanguage);
                    }
                }, 100);
            }

            // Listen for changes
            languageSelect.addEventListener('change', (e) => {
                console.log('Language changed to:', e.target.value);
                this.changeLanguage(e.target.value);
            });

            console.log('Language selector initialized');
        } else {
            console.error('Language select element not found!');
        }
    }

    /**
     * Load available voices
     * @returns {Promise<void>}
     */
    loadVoices() {
        return new Promise((resolve) => {
            // Voices are loaded asynchronously
            let voices = this.synth.getVoices();

            if (voices.length > 0) {
                this.selectVoiceForLanguage(voices, this.currentLanguage);
                resolve();
            } else {
                // Wait for voiceschanged event
                this.synth.addEventListener('voiceschanged', () => {
                    voices = this.synth.getVoices();
                    this.selectVoiceForLanguage(voices, this.currentLanguage);
                    resolve();
                }, { once: true });
            }
        });
    }

    /**
     * Select the best available voice for the specified language
     * @param {Array} voices - Available voices
     * @param {string} languageCode - Language code (e.g., 'es-ES')
     */
    selectVoiceForLanguage(voices, languageCode) {
        // Get the language prefix (e.g., 'es' from 'es-ES')
        const langPrefix = languageCode.split('-')[0];

        // Preference order:
        // 1. Exact language match with natural/premium/enhanced voices
        // 2. Exact language match
        // 3. Language prefix match with natural voices
        // 4. Language prefix match
        // 5. Default voice

        // Try to find premium/natural voices for exact language
        let preferredVoice = voices.find(voice =>
            voice.lang === languageCode &&
            (voice.name.includes('Natural') ||
                voice.name.includes('Premium') ||
                voice.name.includes('Enhanced') ||
                voice.name.includes('Google') ||
                voice.name.includes('Microsoft'))
        );

        // Fall back to exact language match
        if (!preferredVoice) {
            preferredVoice = voices.find(voice => voice.lang === languageCode);
        }

        // Try language prefix with natural voices
        if (!preferredVoice) {
            preferredVoice = voices.find(voice =>
                voice.lang.startsWith(langPrefix) &&
                (voice.name.includes('Natural') ||
                    voice.name.includes('Premium') ||
                    voice.name.includes('Enhanced') ||
                    voice.name.includes('Google') ||
                    voice.name.includes('Microsoft'))
            );
        }

        // Fall back to any voice matching language prefix
        if (!preferredVoice) {
            preferredVoice = voices.find(voice => voice.lang.startsWith(langPrefix));
        }

        // Last resort: use default
        if (!preferredVoice && voices.length > 0) {
            preferredVoice = voices[0];
        }

        this.currentVoice = preferredVoice;

        if (this.currentVoice) {
            console.log(`Selected voice: ${this.currentVoice.name} (${this.currentVoice.lang}) for language ${languageCode}`);
        } else {
            console.warn(`No voice found for language ${languageCode}`);
        }
    }

    /**
     * Select the best available voice for English (legacy method, now uses selectVoiceForLanguage)
     * @param {Array} voices - Available voices
     */
    selectBestVoice(voices) {
        this.selectVoiceForLanguage(voices, this.currentLanguage);
    }

    /**
     * Speak text aloud
     * @param {string} text - Text to speak
     * @param {Object} options - Speech options
     * @returns {Promise<void>}
     */
    speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.synth) {
                console.warn('Speech synthesis not available');
                resolve();
                return;
            }

            // Cancel any ongoing speech
            this.stop();

            // Create new utterance
            this.utterance = new SpeechSynthesisUtterance(text);

            // Set voice
            if (this.currentVoice) {
                this.utterance.voice = this.currentVoice;
            }

            // Set properties
            this.utterance.rate = options.rate || this.rate;
            this.utterance.pitch = options.pitch || this.pitch;
            this.utterance.volume = options.volume || this.volume;
            this.utterance.lang = options.lang || this.currentLanguage;

            // Event handlers
            this.utterance.onstart = () => {
                this.isSpeaking = true;
                console.log('Speech started');
            };

            this.utterance.onend = () => {
                this.isSpeaking = false;
                console.log('Speech ended');
                resolve();
            };

            this.utterance.onerror = (event) => {
                this.isSpeaking = false;
                console.error('Speech error:', event.error);

                // Some browsers fire 'interrupted' or 'cancelled' errors normally
                if (event.error !== 'interrupted' && event.error !== 'cancelled') {
                    reject(new Error(`Speech error: ${event.error}`));
                } else {
                    resolve();
                }
            };

            this.utterance.onpause = () => {
                console.log('Speech paused');
            };

            this.utterance.onresume = () => {
                console.log('Speech resumed');
            };

            // Speak
            try {
                this.synth.speak(this.utterance);
            } catch (error) {
                console.error('Failed to speak:', error);
                reject(error);
            }
        });
    }

    /**
     * Stop speaking
     */
    stop() {
        if (this.synth && this.synth.speaking) {
            this.synth.cancel();
            this.isSpeaking = false;
        }
    }

    /**
     * Pause speaking
     */
    pause() {
        if (this.synth && this.synth.speaking && !this.synth.paused) {
            this.synth.pause();
        }
    }

    /**
     * Resume speaking
     */
    resume() {
        if (this.synth && this.synth.paused) {
            this.synth.resume();
        }
    }

    /**
     * Set speech rate
     * @param {number} rate - Speech rate (0.5 to 2.0)
     */
    setRate(rate) {
        this.rate = Math.max(0.5, Math.min(2.0, rate));
        console.log(`Speech rate set to ${this.rate}`);
    }

    /**
     * Set speech pitch
     * @param {number} pitch - Speech pitch (0.5 to 2.0)
     */
    setPitch(pitch) {
        this.pitch = Math.max(0.5, Math.min(2.0, pitch));
    }

    /**
     * Set speech volume
     * @param {number} volume - Speech volume (0.0 to 1.0)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Check if currently speaking
     * @returns {boolean}
     */
    isSpeaking() {
        return this.isSpeaking;
    }

    /**
     * Get available voices
     * @returns {Array}
     */
    getVoices() {
        return this.synth ? this.synth.getVoices() : [];
    }

    /**
     * Set specific voice by name
     * @param {string} voiceName - Voice name
     */
    setVoice(voiceName) {
        const voices = this.getVoices();
        const voice = voices.find(v => v.name === voiceName);

        if (voice) {
            this.currentVoice = voice;
            console.log(`Voice changed to: ${voice.name}`);
        } else {
            console.warn(`Voice not found: ${voiceName}`);
        }
    }

    /**
     * Speak with emphasis on important words
     * @param {string} text - Text to speak with SSML-like markup
     */
    speakWithEmphasis(text) {
        // Web Speech API doesn't fully support SSML,
        // but we can add pauses and emphasis through punctuation

        // Add pauses for better clarity
        let processedText = text
            .replace(/\./g, '. ') // Pause after periods
            .replace(/,/g, ', ') // Slight pause after commas
            .replace(/:/g, ': '); // Pause after colons

        return this.speak(processedText);
    }

    /**
     * Announce important information (higher priority)
     * @param {string} text - Text to announce
     */
    announce(text) {
        // For announcements, use slightly slower rate for clarity
        return this.speak(text, {
            rate: this.rate * 0.9,
            volume: 1.0
        });
    }

    /**
     * Test speech synthesis
     */
    test() {
        this.speak('Buddy Vision speech test. If you can hear this, voice output is working correctly.');
    }
}

// Initialize and expose globally
window.buddyVoice = new VoiceController();
console.log('Voice Controller initialized');

// Enable voice command button once voice is ready
setTimeout(() => {
    const voiceBtn = document.getElementById('voice-command-btn');
    if (voiceBtn && window.buddyVoice.synth) {
        voiceBtn.disabled = false;
        voiceBtn.addEventListener('click', () => {
            window.buddyVoice.test();
        });
    }
}, 1000);
