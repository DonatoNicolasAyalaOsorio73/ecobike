# Story 1.1: Inicializacion Expo, NativeWind y Componente Base

Status: done

## Story

Como equipo de desarrollo,
quiero tener el proyecto Expo inicializado con NativeWind v4, todos los paquetes requeridos y el componente GlassView base,
para que el entorno de UI este listo antes de conectar cualquier servicio externo.

## Acceptance Criteria

1. **Dado** que no existe el proyecto EcoBike en Expo SDK 57
   **Cuando** se ejecuta `npx create-expo-app@latest EcoBike --template tabs`
   **Entonces** el proyecto arranca en iOS y Android sin errores de compilacion

2. **Dado** que el proyecto esta inicializado
   **Cuando** se instalan los paquetes requeridos
   **Entonces** estan presentes en package.json y funcionando: `expo-location@57`, `expo-task-manager`, `expo-haptics`, `expo-notifications`, `expo-secure-store`, `expo-camera`, `@react-native-community/netinfo`, `expo-blur`, `expo-local-authentication`

3. **Dado** que NativeWind v4 esta configurado
   **Cuando** se usa cualquier clase de Tailwind en un componente
   **Entonces** aplica correctamente con los tokens de marca: `brand.green.500` (#64cd69) para acciones principales y `brand.amber.500` (#F5A623) para puntos y recompensas

4. **Dado** que se necesita el componente base de superficies translucidas
   **Cuando** cualquier pantalla usa el componente `GlassView`
   **Entonces** muestra superficie con blur en iOS y Android API >= 31, y fallback `rgba(255,255,255,0.92)` sin blur en Android API < 31

## Tasks / Subtasks

- [x] Task 1: Inicializar proyecto Expo SDK 57 con template tabs (AC: 1)
  - [x] Subtask 1.1: Ejecutar `npx create-expo-app@latest EcoBike --template tabs` y verificar arranque en iOS y Android sin errores
  - [x] Subtask 1.2: Limpiar contenido de ejemplo del template (pantallas de placeholder, estilos default) manteniendo la estructura de rutas Expo Router

- [x] Task 2: Instalar todos los paquetes requeridos (AC: 2)
  - [x] Subtask 2.1: Instalar paquetes de ubicacion y tracking: `expo-location@57`, `expo-task-manager`
  - [x] Subtask 2.2: Instalar paquetes de UX nativa: `expo-haptics`, `expo-notifications`, `expo-secure-store`, `expo-local-authentication`
  - [x] Subtask 2.3: Instalar paquetes de hardware y red: `expo-camera`, `@react-native-community/netinfo`, `expo-blur`
  - [x] Subtask 2.4: Verificar que todos los paquetes arrancan sin error en iOS y Android (npx expo start)

- [x] Task 3: Configurar NativeWind v4 con tokens de marca EcoBike (AC: 3)
  - [x] Subtask 3.1: Instalar NativeWind v4 (`nativewind`) y sus dependencias peer (`tailwindcss`)
  - [x] Subtask 3.2: Crear `tailwind.config.js` con tokens de color EcoBike: `brand.green.*` y `brand.amber.*`, escala de espaciado base 4px, radios de borde definidos
  - [x] Subtask 3.3: Configurar `babel.config.js` para incluir `nativewind/babel` y crear `global.css` con directivas Tailwind
  - [x] Subtask 3.4: Verificar funcionamiento con componente de prueba: `<Text className="text-brand-green-500">Test</Text>` aplica color #64cd69

- [x] Task 4: Crear componente GlassView con fallback Android (AC: 4)
  - [x] Subtask 4.1: Crear `src/components/ui/GlassView/GlassView.tsx` usando `BlurView` de `expo-blur` con deteccion de plataforma
  - [x] Subtask 4.2: Implementar fallback para Android API < 31: `Platform.OS === 'android' && Platform.Version < 31` → `backgroundColor: 'rgba(255,255,255,0.92)'`
  - [x] Subtask 4.3: Crear `src/components/ui/GlassView/GlassView.web.tsx` con `backdrop-filter: blur()` via estilos CSS
  - [x] Subtask 4.4: Crear `src/components/ui/GlassView/index.ts` como re-exportacion del componente
  - [x] Subtask 4.5: Escribir tests de render y assertion para GlassView: variant `light`, variant `dark`, variant `reward`, alias `alert`, blur custom, y fallback Android

- [x] Task 5: Establecer estructura de carpetas y constantes del proyecto (requerido por arquitectura)
  - [x] Subtask 5.1: Crear estructura base: `src/features/`, `src/stores/`, `src/services/`, `src/components/ui/`, `src/components/shared/`, `src/types/`, `src/constants/`
  - [x] Subtask 5.2: Crear `src/constants/glass.ts` con tokens Glass del sistema visual Liquid Glass
  - [x] Subtask 5.3: Crear `src/constants/theme.ts` con tokens de color y tipografia tipados para uso en Reanimated

## Dev Notes

### Contexto Critico — Por que esta historia importa

Esta es la historia fundacional bloqueante. Sin ella no puede existir ningun componente de UI, ningun servicio Firebase, ni ningun store de Zustand. Todo el sistema visual Liquid Glass (el diferenciador visual de EcoBike) depende de `GlassView` y NativeWind v4. El orden de implementacion dentro de esta historia es estricto: proyecto → paquetes → NativeWind → GlassView → estructura.

### Stack Tecnico Obligatorio

- **Expo SDK 57** — version exacta requerida por `expo-location@57` (GPS background confiable en iOS 14+)
- **Expo Router 57** — genera rutas nativas y web desde el mismo arbol de archivos (panel de partners web sin proyecto separado)
- **NativeWind v4** — no NativeWind v2/v3; la API es diferente y la config de v4 es requerida
- **Firebase JS SDK v11** — ya instalado en el prototipo brownfield, compatible con Expo sin prebuild adicional
- **React Native Maps** + **React Leaflet** — para mapa nativo y web respectivamente (ADR-004); NO instalar en esta historia, se agrega en Epic 4
- **Zustand** — para los 3 stores globales; NO configurar en esta historia, se instala en Story 1.2

### Comando Exacto de Inicializacion

```bash
npx create-expo-app@latest EcoBike --template tabs
```

Este comando genera la estructura con Expo Router ya configurado. NO usar `--template blank` ni otros templates. El template `tabs` genera el layout de tabs que es la base de la navegacion de EcoBike.

[Source: architecture.md#Stack Base Seleccionado]

### Paquetes — Instalacion y Notas

```bash
# Ubicacion y tracking GPS
npx expo install expo-location expo-task-manager

# UX nativa
npx expo install expo-haptics expo-notifications expo-secure-store expo-local-authentication

# Hardware y red
npx expo install expo-camera @react-native-community/netinfo expo-blur
```

**CRITICO:** Usar `npx expo install` (NO `npm install` ni `yarn add`) para que Expo resuelva versiones compatibles con el SDK 57. Instalar paquetes incompatibles puede romper el build de EAS.

`expo-local-authentication` — para biometria (Face ID / Touch ID) en Story 1.4. Instalarlo ahora evita reinstalacion mas tarde.

[Source: epics.md#Additional Requirements, architecture.md#Paquetes requeridos adicionales]

### NativeWind v4 — Configuracion Completa

**tailwind.config.js** (tokens de marca obligatorios):
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            50:  '#e8f5e9',
            100: '#c8e6c9',
            500: '#64cd69',  // Primario — CTA, nav activa, puntos
            600: '#55b85a',
            700: '#2e7d32',
            900: '#1B4D1E',
          },
          amber: {
            400: '#FFCA28',
            500: '#F5A623',  // Valor de puntos, badges de recompensa
            600: '#E8900A',
          },
        },
        neutral: {
          50:  '#F8FBF9',
          100: '#F0F4F1',
          200: '#E0E8E2',
          500: '#6B7E6E',
          700: '#374D3A',
          900: '#0D1F0E',
        },
      },
      spacing: {
        // Base 4px — todos los valores son multiplos de 4
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
        'xl': '24px',
      },
    },
  },
  plugins: [],
}
```

**global.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**babel.config.js** — agregar plugin de NativeWind:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

[Source: ux-design-specification.md#Design System Foundation, architecture.md]

### Tokens Glass — constants/glass.ts

```typescript
// src/constants/glass.ts
export const Glass = {
  light: {
    background: 'rgba(255, 255, 255, 0.20)',
    border: 'rgba(255, 255, 255, 0.45)',
    blur: 20,
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    background: 'rgba(15, 25, 15, 0.48)',
    border: 'rgba(255, 255, 255, 0.10)',
    blur: 24,
    shadow: 'rgba(0, 0, 0, 0.30)',
  },
  reward: {
    background: 'rgba(255, 255, 255, 0.25)',
    border: 'rgba(255, 255, 255, 0.50)',
    blur: 16,
    shadow: 'rgba(0, 0, 0, 0.10)',
  },
} as const;
```

[Source: ux-design-specification.md#Implementation Approach]

### GlassView — Implementacion Requerida

```typescript
// src/components/ui/GlassView/GlassView.tsx
import { BlurView } from 'expo-blur';
import { Platform, View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { Glass } from '@/constants/glass';

interface GlassViewProps {
  variant?: 'light' | 'dark' | 'reward' | 'alert';
  blur?: number;
  children: ReactNode;
  style?: ViewStyle;
}

export function GlassView({ variant = 'light', blur, children, style }: GlassViewProps) {
  const config = Glass[variant === 'alert' ? 'light' : variant];
  const blurIntensity = blur ?? config.blur;

  // ponytail: fallback solido para Android API < 31 que no soporta backdrop blur
  const isAndroidLegacy = Platform.OS === 'android' && (Platform.Version as number) < 31;

  if (isAndroidLegacy) {
    return (
      <View style={[{ backgroundColor: 'rgba(255,255,255,0.92)' }, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={blurIntensity}
      tint={variant === 'dark' ? 'dark' : 'light'}
      style={[{ backgroundColor: config.background }, style]}
    >
      {children}
    </BlurView>
  );
}
```

**GlassView.web.tsx** — implementacion web:
```typescript
// src/components/ui/GlassView/GlassView.web.tsx
import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { Glass } from '@/constants/glass';

interface GlassViewProps {
  variant?: 'light' | 'dark' | 'reward' | 'alert';
  blur?: number;
  children: ReactNode;
  style?: ViewStyle;
}

export function GlassView({ variant = 'light', blur, children, style }: GlassViewProps) {
  const config = Glass[variant === 'alert' ? 'light' : variant];
  const blurValue = blur ?? config.blur;

  return (
    <View
      style={[
        {
          backgroundColor: config.background,
          backdropFilter: `blur(${blurValue}px)`,
          WebkitBackdropFilter: `blur(${blurValue}px)`,
          borderColor: config.border,
          borderWidth: 1,
        } as ViewStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}
```

[Source: ux-design-specification.md#GlassView, ux-design-specification.md#Design Direction Decision]

### Estructura de Carpetas Requerida por Arquitectura

```
EcoBike/
├── app/                          # Expo Router (NO tocar estructura base del template)
│   ├── _layout.tsx
│   ├── (auth)/
│   └── (tabs)/
├── src/
│   ├── features/                 # Organizacion por feature (Epic 1 en adelante)
│   ├── stores/                   # Zustand stores (se crean en Story 1.2)
│   ├── services/                 # Firebase, Cloud Functions (se crean en Story 1.2)
│   ├── components/
│   │   ├── ui/                   # GlassView y primitives Liquid Glass
│   │   │   └── GlassView/
│   │   │       ├── GlassView.tsx
│   │   │       ├── GlassView.web.tsx
│   │   │       └── index.ts
│   │   └── shared/               # Button, Skeleton, ErrorBoundary (futuras historias)
│   ├── types/
│   │   └── index.ts              # Re-exporta todos los tipos
│   └── constants/
│       ├── glass.ts              # Tokens Glass (esta historia)
│       └── theme.ts              # Tokens de color tipados (esta historia)
├── assets/
├── tailwind.config.js            # Tokens de marca NativeWind
├── global.css                    # Directivas Tailwind
└── babel.config.js               # Plugin NativeWind
```

[Source: architecture.md#Arbol Completo del Proyecto]

### Convenciones de Naming Obligatorias

- **Archivos de componentes:** PascalCase — `GlassView.tsx`, `PointsFloat.tsx`
- **Archivos de rutas Expo Router:** kebab-case — `sign-in.tsx`, `map.tsx`
- **Hooks:** camelCase con prefijo `use` — `useRouteTracking.ts`
- **Stores Zustand:** exportado como `use[Name]Store`
- **Tipos TypeScript:** PascalCase sin prefijo `I` — `User`, `Route`, `Reward`
- **Tests:** co-localizados junto al archivo — `GlassView.test.tsx` en misma carpeta
- **Platform-specific:** sufijos `.native.tsx` / `.web.tsx`

[Source: architecture.md#Patrones de Naming]

### Testing — Requisitos para esta Historia

Framework de testing de Expo: Jest + `@testing-library/react-native`.

Test minimo requerido para GlassView:
```typescript
// src/components/ui/GlassView/GlassView.test.tsx
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GlassView } from './GlassView';

describe('GlassView', () => {
  it('renderiza children correctamente en variant light', () => {
    const { getByText } = render(
      <GlassView variant="light"><Text>Test</Text></GlassView>
    );
    expect(getByText('Test')).toBeTruthy();
  });

  it('renderiza children correctamente en variant dark', () => {
    const { getByText } = render(
      <GlassView variant="dark"><Text>Dark</Text></GlassView>
    );
    expect(getByText('Dark')).toBeTruthy();
  });
});
```

El test del fallback Android requiere mockear `Platform`:
```typescript
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android',
  Version: 30, // < 31 para activar fallback
  select: (obj: any) => obj.android,
}));
```

### Advertencias Clave del Reporte de Preparacion

1. Esta historia NO incluye Firebase ni Zustand — eso es Story 1.2
2. Esta historia NO incluye autenticacion — eso es Story 1.3
3. `react-native-maps` y `react-leaflet` NO se instalan aqui — son Epic 4
4. El template `tabs` generara pantallas de ejemplo que deben limpiarse, pero mantener `_layout.tsx` y la estructura `(tabs)/`

### Project Structure Notes

- Alignment: La estructura de `src/` sigue exactamente el arbol de arquitectura definido en `architecture.md#Arbol Completo del Proyecto`
- El alias `@/` debe configurarse en `tsconfig.json` apuntando a `./src` para imports limpios
- Conflicto potencial: el template `tabs` genera `app/(tabs)/index.tsx` y `app/(tabs)/two.tsx` — renombrar `two.tsx` a algo descriptivo o eliminar si no se usa en MVP

### References

- [Source: epics.md#Story 1.1: Inicializacion Expo, NativeWind y Componente Base]
- [Source: architecture.md#Stack Base Seleccionado: Expo SDK 57 + Expo Router]
- [Source: architecture.md#Decisiones Arquitectonicas de Sub-Paquetes (ADRs)]
- [Source: architecture.md#Patrones de Naming]
- [Source: architecture.md#Arbol Completo del Proyecto]
- [Source: ux-design-specification.md#Design System Foundation]
- [Source: ux-design-specification.md#Design Direction Decision - iOS 27 Liquid Glass]
- [Source: ux-design-specification.md#GlassView]
- [Source: ux-design-specification.md#Component Implementation Strategy]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- RNTL v14 render() es async — todos los tests requieren await render(). Corregido.
- tsconfig alias @/* apuntaba a "./*" (raiz del template). Actualizado a "./src/*" para coincidir con arquitectura. Los layouts del template se actualizaron a imports relativos.
- NativeWind v4 requiere metro.config.js con withNativeWind() ademas de babel.config.js.
- Mocking de Platform para Android fallback: jest.mock('react-native') falla por DevMenu nativo. Solucion: Object.defineProperty en Platform.OS y Platform.Version directamente.
- @types/jest no incluido en el template Expo 57. Instalado manualmente con "types": ["jest"] en tsconfig.

### Completion Notes List

- Proyecto EcoBike creado en EcoBike-main/EcoBike/ con Expo SDK ~57.0.15 + Expo Router ~57.0.15
- 9 paquetes de features instalados con npx expo install (versiones SDK 57 resueltas automaticamente)
- NativeWind v4.2.6 + Tailwind v3.4.19 configurados con metro.config.js + babel.config.js + global.css
- Alias @/* apunta a ./src/* en tsconfig.json y Jest moduleNameMapper
- GlassView implementado con BlurView (iOS/Android API>=31) y fallback View solido (Android API<31)
- GlassView.web.tsx usa backdropFilter CSS para navegadores
- 6/6 tests pasan incluyendo test de fallback Android via Object.defineProperty en Platform
- TypeScript 0 errores

### File List

EcoBike/app.json
EcoBike/babel.config.js
EcoBike/global.css
EcoBike/metro.config.js
EcoBike/nativewind-env.d.ts
EcoBike/package.json
EcoBike/package-lock.json
EcoBike/tailwind.config.js
EcoBike/tsconfig.json
EcoBike/app/+html.tsx
EcoBike/app/_layout.tsx
EcoBike/app/+not-found.tsx
EcoBike/app/modal.tsx
EcoBike/app/(tabs)/index.tsx
EcoBike/app/(tabs)/rewards.tsx
EcoBike/app/(tabs)/_layout.tsx
EcoBike/src/components/ui/GlassView/GlassView.tsx
EcoBike/src/components/ui/GlassView/GlassView.web.tsx
EcoBike/src/components/ui/GlassView/GlassView.test.tsx
EcoBike/src/components/ui/GlassView/index.ts
EcoBike/src/constants/glass.ts
EcoBike/src/constants/theme.ts
EcoBike/src/types/index.ts
EcoBike/src/hooks/useColorScheme.ts
EcoBike/src/hooks/useColorScheme.web.ts
EcoBike/src/hooks/useClientOnlyValue.ts
EcoBike/src/hooks/useClientOnlyValue.web.ts

### Change Log

- 2026-08-23: Inicializacion completa Story 1.1 — Expo SDK 57 + NativeWind v4 + GlassView + estructura src/. 6 tests pasan.
- 2026-08-24: Code review — File List corregido (two.tsx→rewards.tsx, +html.tsx agregado); dead code eliminado (EditScreenInfo, StyledText, Themed, ExternalLink, constants/Colors.ts); _layout.tsx migrado a Theme de @/constants/theme; subtask 4.5 actualizado a render+assertion tests. Mejoras: test intensidad blur usa UNSAFE_getByType en vez de nombre interno del mock; GlassView.web.tsx reemplaza cast "as ViewStyle" con tipo WebViewStyle; Dev Notes token reward sincronizado con implementacion (campo shadow).
- 2026-08-24: Code review adversarial — (H1) iconos placeholder corregidos en (tabs)/_layout.tsx (house.fill/home para Inicio, star.fill/star para Recompensas); (H2) hooks de template migrados de components/ raiz a src/hooks/, imports actualizados con alias @/, carpeta components/ eliminada; (H3) test fallback Android agrega UNSAFE_queryByType(BlurView) toBeNull; (M1) escala spacing completa con valores 7/9/10/11; (M2) token Glass.shadow aplicado en GlassView.tsx (shadowColor/elevation) y GlassView.web.tsx (boxShadow).
