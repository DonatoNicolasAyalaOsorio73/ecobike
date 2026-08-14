import React, { FC, useEffect } from 'react';
import { Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../../../theme';

const ICON_MAP: Record<string, string> = {
  Mapa: 'map',
  Puntos: 'award',
  Amigos: 'users',
  Usuario: 'user',
  AdminPanel: 'settings',
};

const CSS = `
@keyframes lgPulse {
  0%,100% { box-shadow: 0 0 14px rgba(173,241,75,0.32), inset 0 1px 0 rgba(255,255,255,0.55); }
  50%      { box-shadow: 0 0 26px rgba(173,241,75,0.6),  inset 0 1px 0 rgba(255,255,255,0.8); }
}
@keyframes lgSpecular {
  0%   { background-position: -300% center; }
  100% { background-position: 300% center; }
}
.ecobike-tab { transition: background 0.2s ease, transform 0.15s ease; }
.ecobike-tab:hover { background: rgba(255,255,255,0.22) !important; transform: translateY(-2px); }
.ecobike-tab:active { transform: translateY(0px) scale(0.96); }
`;

export const CustomBottomTab: FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
        right: 14,
        height: 68,
        display: 'flex',
        flexDirection: 'row',
        zIndex: 100,
        borderRadius: 26,
        overflow: 'hidden',
        // ponytail: floating liquid glass pill
        backdropFilter: 'blur(40px) saturate(220%)',
        WebkitBackdropFilter: 'blur(40px) saturate(220%)',
        background:
          'linear-gradient(160deg, rgba(240,248,230,0.82) 0%, rgba(218,236,206,0.9) 100%)',
        border: '0.5px solid rgba(255,255,255,0.65)',
        boxShadow:
          '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      {state.routes.map((route, index) => {
        const isActive = index === state.index;
        const icon = ICON_MAP[route.name] ?? 'circle';
        const label =
          (descriptors[route.key].options.tabBarLabel as string) ?? route.name;

        return (
          <div
            key={route.key}
            className="ecobike-tab"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              background: 'transparent',
              borderRadius: 0,
            }}
            onClick={() => navigation.navigate(route.name)}
          >
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: 7,
                  width: 52,
                  height: 34,
                  borderRadius: 17,
                  background:
                    'linear-gradient(135deg, rgba(173,241,75,0.38) 0%, rgba(84,205,100,0.28) 100%)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(173,241,75,0.52)',
                  animation: 'lgPulse 2.8s ease-in-out infinite',
                }}
              />
            )}
            <Feather
              name={icon as any}
              size={21}
              color={isActive ? colors.accent : colors.textMuted2}
            />
            <Text
              style={{
                fontSize: 10,
                marginTop: 4,
                color: isActive ? colors.accent : colors.textMuted2,
                fontWeight: isActive ? '700' : '400',
                letterSpacing: 0.3,
              }}
            >
              {label}
            </Text>
          </div>
        );
      })}

      {/* Top specular edge — liquid glass "rim" */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '5%',
          right: '5%',
          height: 1,
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.85) 60%, transparent)',
          backgroundSize: '200% 100%',
          animation: 'lgSpecular 5s linear infinite',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default CustomBottomTab;
