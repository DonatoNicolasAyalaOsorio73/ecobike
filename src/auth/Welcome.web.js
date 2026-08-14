import React, { useEffect } from 'react';
import { SafeAreaView, TouchableOpacity, ScrollView, Text, Image, View, StyleSheet, Dimensions } from 'react-native';
import MyBlur from '../components/MyBlur';
import { colors } from '../theme';

const { height } = Dimensions.get('window');

const CSS = `
@keyframes wcShimmer {
  0%   { background-position: -300% center; }
  100% { background-position: 300% center; }
}
.wc-glass-card {
  backdrop-filter: blur(28px) saturate(200%);
  -webkit-backdrop-filter: blur(28px) saturate(200%);
  background: rgba(255,255,255,0.16);
  border: 1px solid rgba(255,255,255,0.44);
  border-radius: 28px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.65);
  padding: 32px 24px 28px;
}
.wc-btn-join {
  flex: 1;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255,255,255,0.14);
  border: none;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
}
.wc-btn-join:hover { background: rgba(255,255,255,0.22); transform: translateY(-2px); }
.wc-btn-join:active { transform: scale(0.97); }
.wc-btn-enter {
  flex: 1;
  background: linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.55) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: none;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.wc-btn-enter:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.12); }
.wc-btn-enter:active { transform: scale(0.97); }
.wc-shimmer {
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9) 50%, transparent);
  background-size: 200% 100%;
  animation: wcShimmer 4s linear infinite;
  border-radius: 28px 28px 0 0;
  pointer-events: none;
}
`;

export default function Welcome({ navigation }) {
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  return (
    <View style={styles.root}>
      <MyBlur />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Hero image — same as original */}
          <Image
            source={{ uri: 'https://i.pinimg.com/originals/f1/8d/c4/f18dc48903a12e939904ef622bc37cc9.png' }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Glass card with original content */}
          <div className="wc-glass-card" style={{ position: 'relative', margin: '0 4px' }}>
            <div className="wc-shimmer" />

            <Text style={styles.title}>El mundo </Text>
            <Text style={styles.title}>sobre dos ruedas</Text>
            <Text style={styles.body}>
              Vive emocionantes aventuras en tu bicicleta y gana puntos canjeables por cupones en tus tiendas favoritas.
            </Text>

            {/* Buttons — original layout, liquid glass style */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginTop: 32 }}>
              <button
                className="wc-btn-join"
                onClick={() => navigation.navigate('Register')}
              >
                <Text style={styles.btnJoinText}>Únete</Text>
              </button>
              <button
                className="wc-btn-enter"
                onClick={() => navigation.navigate('SignIn')}
              >
                <Text style={styles.btnEnterText}>Entra</Text>
              </button>
            </div>
          </div>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 32,
  },
  heroImage: {
    width: '100%',
    height: (height / 4.2) * 1.5,
    borderRadius: 20,
    marginBottom: 32,
    marginTop: 60,
  },
  title: {
    fontSize: 32, fontWeight: '700', lineHeight: 35,
    textAlign: 'center', color: colors.textDark,
  },
  body: {
    paddingTop: 16, fontSize: 16, lineHeight: 22,
    fontWeight: '400', textAlign: 'center', color: colors.textBody,
  },
  btnJoinText: {
    fontSize: 16, fontWeight: '700', color: colors.textDark, textAlign: 'center',
  },
  btnEnterText: {
    fontSize: 16, fontWeight: '700', color: colors.accent, textAlign: 'center',
  },
});
