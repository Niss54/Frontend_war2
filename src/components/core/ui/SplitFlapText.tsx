import React, { useEffect, useState } from 'react';
import './SplitFlapText.css';

const CHARACTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-!@#$';

interface SplitFlapCharProps {
  targetChar: string;
  delay: number;
}

const SplitFlapChar: React.FC<SplitFlapCharProps> = ({ targetChar, delay }) => {
  const [displayChar, setDisplayChar] = useState(' ');
  const [isAnimating, setIsAnimating] = useState(false);
  const targetCharUpper = targetChar.toUpperCase();

  useEffect(() => {
    if (displayChar === targetCharUpper) return;

    let startTime = 0;
    let animationFrame: number;
    let currentIdx = CHARACTERS.indexOf(displayChar) > -1 ? CHARACTERS.indexOf(displayChar) : 0;
    
    // Cycle for minimum 10 frames after delay
    const totalFrames = 15; 
    let frameCount = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed > delay) {
        setIsAnimating(true);
        // Change char every 50ms approx
        if (elapsed % 50 < 20) {
          frameCount++;
          currentIdx = (currentIdx + 1) % CHARACTERS.length;
          setDisplayChar(CHARACTERS[currentIdx]);
        }
        
        if (frameCount >= totalFrames && CHARACTERS[currentIdx] === targetCharUpper) {
          setDisplayChar(targetCharUpper);
          setIsAnimating(false);
          return;
        }
      }
      
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [targetCharUpper, delay, displayChar]);

  return (
    <div className={`split-flap-char ${isAnimating ? 'animating' : ''}`}>
      <div className="char-top">{displayChar}</div>
      <div className="char-bottom">{displayChar}</div>
      <div className="flap"></div>
    </div>
  );
};

export interface SplitFlapTextProps {
  value: string;
  minLength?: number;
  className?: string;
  staggerDelay?: number;
}

export const SplitFlapText: React.FC<SplitFlapTextProps> = ({ 
  value, 
  minLength = 0,
  className = '',
  staggerDelay = 30
}) => {
  // Pad string if needed
  const paddedValue = value.padEnd(Math.max(value.length, minLength), ' ');
  
  return (
    <div className={`split-flap-text ${className}`}>
      {paddedValue.split('').map((char, index) => (
        <SplitFlapChar 
          key={index} 
          targetChar={char} 
          delay={index * staggerDelay} 
        />
      ))}
    </div>
  );
};
