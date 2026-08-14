import React, { useEffect } from 'react';
import { View } from 'react-native';

// Liquid glass background — iOS 26 aesthetic
const KEYFRAMES = `
@keyframes lgShift1 {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
  33%       { transform: translate(15px, -25px) scale(1.08); opacity: 0.9; }
  66%       { transform: translate(-20px, 15px) scale(0.95); opacity: 0.6; }
}
@keyframes lgShift2 {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
  50%       { transform: translate(-25px, 20px) scale(1.1); opacity: 0.8; }
}
@keyframes lgShimmer {
  0%, 100% { opacity: 0.15; }
  50%       { opacity: 0.35; }
}
`;

export default function MyBlur() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = KEYFRAMES;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Base layer */}
      <div style={{ position: 'absolute', inset: 0, background: '#e5e8ef' }} />

      {/* Animated green blob */}
      <div
        style={{
          position: 'absolute',
          width: '130%',
          height: '130%',
          top: '-15%',
          left: '-15%',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at 40% 50%, rgba(173,241,75,0.55) 0%, rgba(84,205,100,0.3) 45%, transparent 70%)',
          filter: 'blur(28px)',
          animation: 'lgShift1 9s ease-in-out infinite',
        }}
      />

      {/* Secondary teal blob */}
      <div
        style={{
          position: 'absolute',
          width: '110%',
          height: '110%',
          bottom: '-10%',
          right: '-10%',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at 60% 60%, rgba(54,205,140,0.35) 0%, transparent 65%)',
          filter: 'blur(24px)',
          animation: 'lgShift2 12s ease-in-out infinite',
        }}
      />

      {/* Liquid glass shimmer overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          animation: 'lgShimmer 5s ease-in-out infinite',
        }}
      />

      {/* Top specular highlight — glass edge */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
          borderRadius: '0 0 50% 50%',
        }}
      />
    </View>
  );
}
