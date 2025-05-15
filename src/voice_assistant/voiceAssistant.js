class VoiceAssistant {
  constructor() {
    this.isListening = false;
    this.recognition = null;
    this.showChat = false;
    this.showHelp = false;
    this.currentLang = 'en-US'; // Default language
    this.translations = {
      'en-US': {
        title: 'Farming Assistant',
        placeholder: 'Listening...',
        helpTitle: 'What can I ask?',
        errorMessage: "I'm sorry, I couldn't understand that. Could you please rephrase your question?",
        sampleQuestions: [
          "What crops should I plant?",
          "How to control pests?",
          "When should I water my crops?",
          "What's the weather forecast?",
          "What are current crop prices?",
          "How to improve soil quality?"
        ],
        responses: {
          'what crops should I plant': 'Based on the current season and soil conditions, you might consider planting wheat, corn, or soybeans.',
          'how to control pests': 'You can use natural pest control methods like neem oil or introduce beneficial insects.',
          'when should I water': 'Water your crops early in the morning or late in the evening to minimize evaporation.',
          'help': 'I can help you with crop selection, pest control, irrigation advice, and other farming-related questions.',
          'weather': 'Let me check the weather forecast for your area.',
          'price': 'I can help you check current market prices for various crops.',
          'soil quality': 'To improve soil quality, you can add organic matter, maintain proper pH, and practice crop rotation.'
        }
      },
      'hi-IN': {
        title: 'कृषि सहायक',
        placeholder: 'सुन रहा हूं...',
        helpTitle: 'मैं क्या पूछ सकता हूं?',
        errorMessage: 'क्षमा करें, मैं आपकी बात नहीं समझ पाया। क्या आप अपना प्रश्न दोहरा सकते हैं?',
        sampleQuestions: [
          "कौन सी फसल बोनी चाहिए?",
          "कीट नियंत्रण कैसे करें?",
          "फसल को पानी कब देना चाहिए?",
          "मौसम का पूर्वानुमान क्या है?",
          "फसलों के वर्तमान भाव क्या हैं?",
          "मिट्टी की गुणवत्ता कैसे सुधारें?"
        ],
        responses: {
          'कौन सी फसल': 'मौजूदा मौसम और मिट्टी की स्थिति के आधार पर, आप गेहूं, मक्का, या सोयाबीन लगा सकते हैं।',
          'कीट नियंत्रण': 'आप नीम का तेल या लाभकारी कीड़ों का उपयोग करके प्राकृतिक कीट नियंत्रण कर सकते हैं।',
          'पानी कब दें': 'अपनी फसल को सुबह जल्दी या शाम को पानी दें, इससे पानी कम वाष्पित होगा।',
          'मदद': 'मैं फसल चयन, कीट नियंत्रण, सिंचाई सलाह और अन्य कृषि संबंधित प्रश्नों में आपकी मदद कर सकता हूं।',
          'मौसम': 'मैं आपके क्षेत्र के लिए मौसम की जानकारी देख सकता हूं।',
          'दाम': 'मैं विभिन्न फसलों के वर्तमान बाजार मूल्य की जांच कर सकता हूं।',
          'मिट्टी': 'मिट्टी की गुणवत्ता सुधारने के लिए, आप जैविक पदार्थ डाल सकते हैं, उचित पीएच बनाए रख सकते हैं, और फसल चक्र का अभ्यास कर सकते हैं।'
        }
      }
    };
    this.setupVoiceAssistant();
    this.createUI();
    this.setupLanguageSwitch();
  }

  setupVoiceAssistant() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new window.webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = this.currentLang;

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.updateTranscript(transcript);
        this.handleQuery(transcript);
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        this.updateMicButton();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateMicButton();
      };
    }
  }

  createUI() {
    // Create help menu
    const helpMenu = document.createElement('div');
    helpMenu.className = 'voice-help-menu';
    helpMenu.style.display = 'none';
    
    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.className = 'voice-chat-window';
    chatWindow.style.display = 'none';
    chatWindow.innerHTML = `
      <div class="voice-chat-header">
        <h3>${this.translations[this.currentLang].title}</h3>
        <div class="voice-header-controls">
          <div class="voice-language-selector">
            <button class="voice-lang-btn" data-lang="en-US">EN</button>
            <button class="voice-lang-btn" data-lang="hi-IN">हिं</button>
          </div>
          <button class="voice-help-btn">❓</button>
          <button class="voice-chat-close">×</button>
        </div>
      </div>
      <div class="voice-help-content">
        <h4>${this.translations[this.currentLang].helpTitle}</h4>
        <ul>
          ${this.translations[this.currentLang].sampleQuestions.map(q => `<li>${q}</li>`).join('')}
        </ul>
      </div>
      <div class="voice-chat-messages"></div>
      <div class="voice-chat-status">
        <span class="voice-status-dot"></span>
        <span class="voice-status-text">${this.translations[this.currentLang].placeholder}</span>
      </div>
    `;

    // Create mic button with tooltip
    const micContainer = document.createElement('div');
    micContainer.className = 'voice-mic-container';
    micContainer.innerHTML = `
      <button class="voice-floating-mic" title="Click to speak">🎤</button>
      <span class="voice-mic-tooltip">Ask your farming questions</span>
    `;

    // Add elements to body
    document.body.appendChild(chatWindow);
    document.body.appendChild(micContainer);

    // Add event listeners
    micContainer.querySelector('.voice-floating-mic').addEventListener('click', () => this.toggleListening());
    chatWindow.querySelector('.voice-chat-close').addEventListener('click', () => this.toggleChat());
    chatWindow.querySelector('.voice-help-btn').addEventListener('click', () => this.toggleHelp());

    // Store references
    this.chatWindow = chatWindow;
    this.micButton = micContainer.querySelector('.voice-floating-mic');
    this.messagesContainer = chatWindow.querySelector('.voice-chat-messages');
    this.helpContent = chatWindow.querySelector('.voice-help-content');
    this.statusText = chatWindow.querySelector('.voice-status-text');
    this.statusDot = chatWindow.querySelector('.voice-status-dot');
  }

  setupLanguageSwitch() {
    const langButtons = this.chatWindow.querySelectorAll('.voice-lang-btn');
    langButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentLang = btn.dataset.lang;
        this.recognition.lang = this.currentLang;
        langButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update all translations
        this.chatWindow.querySelector('h3').textContent = this.translations[this.currentLang].title;
        this.chatWindow.querySelector('.voice-help-content h4').textContent = this.translations[this.currentLang].helpTitle;
        const questionsList = this.translations[this.currentLang].sampleQuestions.map(q => `<li>${q}</li>`).join('');
        this.chatWindow.querySelector('.voice-help-content ul').innerHTML = questionsList;
        this.statusText.textContent = this.translations[this.currentLang].placeholder;
      });
      if (btn.dataset.lang === this.currentLang) {
        btn.classList.add('active');
      }
    });
  }

  toggleListening() {
    if (this.isListening) {
      this.recognition.stop();
      this.statusText.textContent = this.translations[this.currentLang].placeholder;
      this.statusDot.classList.remove('pulse');
    } else {
      this.recognition.lang = this.currentLang;
      this.recognition.start();
      this.showChat = true;
      this.chatWindow.style.display = 'block';
      this.statusText.textContent = this.translations[this.currentLang].placeholder;
      this.statusDot.classList.add('pulse');
    }
    this.isListening = !this.isListening;
    this.updateMicButton();
  }

  toggleChat() {
    this.showChat = !this.showChat;
    this.chatWindow.style.display = this.showChat ? 'block' : 'none';
    if (!this.showChat) {
      this.helpContent.style.display = 'none';
      this.showHelp = false;
    }
  }

  toggleHelp() {
    this.showHelp = !this.showHelp;
    this.helpContent.style.display = this.showHelp ? 'block' : 'none';
  }

  updateMicButton() {
    this.micButton.classList.toggle('listening', this.isListening);
  }

  updateTranscript(transcript) {
    const userMessage = document.createElement('div');
    userMessage.className = 'voice-user-message';
    userMessage.innerHTML = `<p>${transcript}</p>`;
    this.messagesContainer.appendChild(userMessage);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  async handleQuery(query) {
    try {
      const currentTranslations = this.translations[this.currentLang];
      const responses = currentTranslations.responses;
      
      let response = currentTranslations.errorMessage;
      for (const [key, value] of Object.entries(responses)) {
        if (query.toLowerCase().includes(key.toLowerCase())) {
          response = value;
          break;
        }
      }

      const assistantMessage = document.createElement('div');
      assistantMessage.className = 'voice-assistant-message';
      assistantMessage.innerHTML = `<p>${response}</p>`;
      this.messagesContainer.appendChild(assistantMessage);
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

      // Text-to-speech
      const utterance = new SpeechSynthesisUtterance(response);
      utterance.lang = this.currentLang;
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error processing query:', error);
    }
  }
}

// Initialize voice assistant when the page loads
window.addEventListener('load', () => {
  new VoiceAssistant();
}); 