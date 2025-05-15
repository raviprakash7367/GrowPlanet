import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VoiceAssistant.css';
import FloatingMic from './FloatingMic';

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [showChat, setShowChat] = useState(false);

  let recognition = null;

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTranscript(transcript);
        handleQuery(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
    } else {
      setTranscript('');
      recognition.start();
    }
    setIsListening(!isListening);
    setShowChat(true); // Always show chat when starting to listen
  };

  const handleQuery = async (query) => {
    try {
      // Here you would typically make an API call to your backend
      // For now, we'll use some basic responses
      const farmerResponses = {
        'what crops should I plant': 'Based on the current season and soil conditions, you might consider planting wheat, corn, or soybeans.',
        'how to control pests': 'You can use natural pest control methods like neem oil or introduce beneficial insects.',
        'when should I water': 'Water your crops early in the morning or late in the evening to minimize evaporation.',
        'help': 'I can help you with crop selection, pest control, irrigation advice, and other farming-related questions.'
      };

      const bestMatch = Object.keys(farmerResponses).find(key => 
        query.toLowerCase().includes(key.toLowerCase())
      );

      setResponse(bestMatch 
        ? farmerResponses[bestMatch]
        : "I'm sorry, I couldn't understand that. Could you please rephrase your question?");
    } catch (error) {
      console.error('Error processing query:', error);
      setResponse('Sorry, I encountered an error processing your request.');
    }
  };

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  return (
    <div className="voice-assistant-container">
      {showChat && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Farming Assistant</h3>
            <button onClick={toggleChat}>×</button>
          </div>
          <div className="chat-messages">
            {transcript && (
              <div className="user-message">
                <p>{transcript}</p>
              </div>
            )}
            {response && (
              <div className="assistant-message">
                <p>{response}</p>
              </div>
            )}
          </div>
        </div>
      )}
      <FloatingMic onClick={toggleListening} />
    </div>
  );
};

export default VoiceAssistant; 