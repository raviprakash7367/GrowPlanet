import React from 'react';
import './FloatingMic.css';

const FloatingMic = ({ onClick }) => {
  return (
    <button className="floating-mic" onClick={onClick}>
      🎤
    </button>
  );
};

export default FloatingMic; 