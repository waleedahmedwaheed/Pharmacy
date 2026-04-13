import React, { useMemo } from 'react';

interface MedicationIconProps {
  name: string;
  className?: string;
}

const COLORS = {
  white: '#f8fafc',
  offWhite: '#e2e8f0',
  red: '#ef4444',
  darkRed: '#b91c1c',
  orange: '#fb923c',
  darkOrange: '#c2410c',
  yellow: '#facc15',
  cream: '#fef3c7',
  green: '#4ade80',
  darkGreen: '#15803d',
  blue: '#60a5fa',
  darkBlue: '#1e40af',
  purple: '#c084fc',
  brown: '#854d0e',
  darkBrown: '#451a03',
  cyan: '#22d3ee',
  darkCyan: '#0e7490'
};

// Styles matching the provided image reference
const PILL_STYLES = [
  // Capsules
  { type: 'capsule', top: COLORS.white, bottom: COLORS.white },
  { type: 'capsule', top: COLORS.orange, bottom: COLORS.darkRed },
  { type: 'capsule', top: COLORS.white, bottom: COLORS.darkBlue },
  { type: 'capsule', top: COLORS.white, bottom: COLORS.darkGreen },
  { type: 'capsule', top: COLORS.yellow, bottom: COLORS.yellow },
  { type: 'capsule', top: COLORS.orange, bottom: COLORS.orange },
  { type: 'capsule', top: COLORS.cyan, bottom: COLORS.darkCyan },
  { type: 'capsule', top: COLORS.darkGreen, bottom: COLORS.darkGreen },
  { type: 'capsule', top: COLORS.brown, bottom: COLORS.darkBrown },
  // Tablets
  { type: 'tablet', color: COLORS.darkOrange },
  { type: 'tablet', color: COLORS.red },
  { type: 'tablet', color: COLORS.blue },
  { type: 'tablet', color: COLORS.cream },
  { type: 'tablet', color: COLORS.white },
  { type: 'tablet', color: COLORS.purple },
];

export const MedicationIcon: React.FC<MedicationIconProps> = ({ name, className = "w-10 h-10" }) => {
  const style = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PILL_STYLES.length;
    return PILL_STYLES[index];
  }, [name]);

  const uniqueId = useMemo(() => `grad-${Math.random().toString(36).substr(2, 9)}`, []);

  // Standard glossy highlight path for capsule
  const capsuleHighlight = "M 15 5 Q 25 5 25 15 V 35 Q 25 45 15 45 Q 5 45 5 35 V 15 Q 5 5 15 5";
  // Standard glossy highlight for tablet
  const tabletHighlight = "M 25 5 A 20 20 0 0 0 25 45 A 20 20 0 0 0 25 5";

  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg viewBox="0 0 50 50" className="w-full h-full drop-shadow-sm">
        <defs>
          <linearGradient id={`${uniqueId}-gloss`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="50%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${uniqueId}-tablet-shine`} cx="30%" cy="30%" r="70%">
             <stop offset="0%" stopColor="white" stopOpacity="0.4" />
             <stop offset="100%" stopColor="black" stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {style.type === 'capsule' ? (
          <g transform="rotate(45, 25, 25)">
            {/* Bottom Half */}
            <path 
              d="M 10 25 L 40 25 L 40 35 Q 40 45 25 45 Q 10 45 10 35 Z" 
              fill={style.bottom} 
              stroke={style.bottom === COLORS.white ? '#cbd5e1' : 'none'}
              strokeWidth={style.bottom === COLORS.white ? 0.5 : 0}
            />
            {/* Top Half */}
            <path 
              d="M 10 25 L 40 25 L 40 15 Q 40 5 25 5 Q 10 5 10 15 Z" 
              fill={style.top}
              stroke={style.top === COLORS.white ? '#cbd5e1' : 'none'}
              strokeWidth={style.top === COLORS.white ? 0.5 : 0}
            />
            
            {/* Shadow/Depth Overlay */}
            <path 
              d="M 10 15 Q 10 5 25 5 Q 40 5 40 15 V 35 Q 40 45 25 45 Q 10 45 10 35 Z" 
              fill={`url(#${uniqueId}-gloss)`} 
              style={{ mixBlendMode: 'overlay' }}
            />
            {/* Specular Highlight */}
            <ellipse cx="20" cy="15" rx="5" ry="3" fill="white" fillOpacity="0.4" transform="rotate(-10)" />
          </g>
        ) : (
          <g>
            {/* Tablet Body */}
            <circle 
              cx="25" cy="25" r="20" 
              fill={style.color} 
              stroke={style.color === COLORS.white ? '#cbd5e1' : 'none'}
              strokeWidth={style.color === COLORS.white ? 1 : 0}
            />
            
            {/* 3D Depth Gradient */}
            <circle cx="25" cy="25" r="20" fill={`url(#${uniqueId}-tablet-shine)`} />
            
            {/* Scored Line (optional, render on some) */}
            {style.color === COLORS.white && (
               <line x1="10" y1="25" x2="40" y2="25" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            )}
            
            {/* Specular Highlight */}
            <ellipse cx="25" cy="15" rx="10" ry="5" fill="white" fillOpacity="0.3" />
          </g>
        )}
      </svg>
    </div>
  );
};