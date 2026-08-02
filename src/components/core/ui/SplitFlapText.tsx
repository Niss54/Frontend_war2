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
    let animationFrame: number;
    let startTime = 0;
    let currentIdx = CHARACTERS.indexOf(targetCharUpper) > -1 ? 0 : -1;
    let frameCount = 0;
    const totalFrames = 15;

    if (currentIdx === -1 || targetCharUpper === ' ') {
      setDisplayChar(targetCharUpper);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed > delay) {
        setIsAnimating(true);
        if (elapsed % 50 < 20) {
          frameCount++;
          currentIdx = (currentIdx + 1) % CHARACTERS.length;
          const nextChar = CHARACTERS[currentIdx];
          
          if (frameCount >= totalFrames && nextChar === targetCharUpper) {
            setDisplayChar(targetCharUpper);
            setIsAnimating(false);
            return; // Stop animation
          }
          
          setDisplayChar(nextChar);
        }
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [targetCharUpper, delay]);

  return (
    <div className={`split-flap-char ${isAnimating ? 'animating' : ''}`}>
      <div className="char-top"><div className="char-inner">{displayChar}</div></div>
      <div className="char-bottom"><div className="char-inner">{displayChar}</div></div>
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
