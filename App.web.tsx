import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StatusBar, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MyNavigation from './src/MyNavigation';
import { showAlert, AlertHost } from './src/components/AppAlert.web';

// Route every RN Alert.alert through the in-frame glass host so warnings look
// consistent and stay inside the iPhone frame (default web behaviour is an
// out-of-frame browser dialog).
(Alert as any).alert = showAlert;

// iPhone 15 Pro logical dimensions
const PHONE_W = 393;
const PHONE_H = 852;
// iPhone 15 Pro safe area insets
const PHONE_INSETS = { top: 59, left: 0, right: 0, bottom: 34 };

const PAGE_KEYFRAMES = `
@keyframes pgBlob1 {
  0%, 100% { transform: translate(0,0) scale(1); }
  33%       { transform: translate(40px,-30px) scale(1.1); }
  66%       { transform: translate(-30px,40px) scale(0.9); }
}
@keyframes pgBlob2 {
  0%, 100% { transform: translate(0,0) scale(1); }
  50%       { transform: translate(-50px,30px) scale(1.15); }
}
@keyframes pgBlob3 {
  0%, 100% { transform: translate(0,0) scale(1); }
  40%       { transform: translate(25px,-40px) scale(0.88); }
  80%       { transform: translate(-15px,25px) scale(1.05); }
}
@keyframes phoneGlow {
  0%, 100% { box-shadow: 0 70px 120px rgba(0,0,0,0.7), 0 0 60px rgba(173,241,75,0.08), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.12); }
  50%       { box-shadow: 0 70px 120px rgba(0,0,0,0.7), 0 0 80px rgba(173,241,75,0.18), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.16); }
}
`;

function usePhoneScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const calc = () => {
      const sh = window.innerHeight - 48;
      const sw = window.innerWidth - 48;
      setScale(Math.min(1, sh / PHONE_H, sw / (PHONE_W + 32)));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  return scale;
}

export default function AppWeb() {
  const scale = usePhoneScale();

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = PAGE_KEYFRAMES;
    document.head.appendChild(el);
    // Prevent body scroll / set dark bg
    document.body.style.cssText = 'margin:0;overflow:hidden;background:#070b10;';
    return () => {
      document.head.removeChild(el);
    };
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        background: '#070b10',
      }}
    >
      {/* ── Liquid glass ambient blobs ── */}
      <div
        style={{
          position: 'absolute',
          width: 700,
          height: 700,
          top: '-15%',
          left: '-10%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(173,241,75,0.18) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'pgBlob1 10s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          bottom: '-10%',
          right: '-8%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(84,205,100,0.15) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'pgBlob2 13s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 450,
          height: 450,
          top: '30%',
          right: '5%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(80,130,255,0.1) 0%, transparent 70%)',
          filter: 'blur(45px)',
          animation: 'pgBlob3 16s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* ── iPhone frame ── */}
      <div
        style={{
          position: 'relative',
          width: PHONE_W + 28,
          height: PHONE_H + 28,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
      >
        {/* Physical chassis */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 60,
            background:
              'linear-gradient(160deg, #2c2c3e 0%, #1a1a2a 40%, #0e0e1a 100%)',
            animation: 'phoneGlow 4s ease-in-out infinite',
          }}
        >
          {/* Top specular edge */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '12%',
              right: '12%',
              height: 1,
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
              borderRadius: '0 0 50% 50%',
            }}
          />
          {/* Left volume buttons */}
          {[100, 150, 215].map((top, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: -5,
                top,
                width: 5,
                height: i === 0 ? 28 : 52,
                borderRadius: '4px 0 0 4px',
                background:
                  'linear-gradient(180deg, #252535, #151525)',
                boxShadow: 'inset 0 0 3px rgba(0,0,0,0.6)',
              }}
            />
          ))}
          {/* Right power button */}
          <div
            style={{
              position: 'absolute',
              right: -5,
              top: 180,
              width: 5,
              height: 76,
              borderRadius: '0 4px 4px 0',
              background: 'linear-gradient(180deg, #252535, #151525)',
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.6)',
            }}
          />
        </div>

        {/* ── Screen glass ── */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            right: 14,
            bottom: 14,
            borderRadius: 48,
            overflow: 'hidden',
            background: 'linear-gradient(160deg, #f0f5ec 0%, #eaf2e4 50%, #f3f7f0 100%)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
            // ponytail: flex context required so RN Web children get height via flex:1
            display: 'flex',
            flexDirection: 'column',
            width: PHONE_W,
            height: PHONE_H,
          }}
        >
          <SafeAreaProvider
            initialMetrics={{
              frame: { x: 0, y: 0, width: PHONE_W, height: PHONE_H },
              insets: PHONE_INSETS,
            }}
          >
            <StatusBar barStyle="dark-content" />
            <NavigationContainer>
              <MyNavigation />
            </NavigationContainer>
            <AlertHost />
          </SafeAreaProvider>
        </div>

        {/* ── Dynamic Island ── */}
        <div
          style={{
            position: 'absolute',
            top: 26,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 126,
            height: 37,
            background: '#000',
            borderRadius: 20,
            zIndex: 10,
            boxShadow: '0 0 12px rgba(0,0,0,0.8)',
          }}
        />

        {/* ── Home indicator ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 134,
            height: 5,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 3,
            zIndex: 10,
          }}
        />
      </div>

      {/* ── Bottom label ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.25)',
          fontSize: 12,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          letterSpacing: '0.08em',
          pointerEvents: 'none',
        }}
      >
        EcoBike · Portfolio Demo
      </div>
    </div>
  );
}
