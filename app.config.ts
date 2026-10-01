import type { ExpoConfig } from "expo/config";

// Public, client-embeddable config only. Firebase's `apiKey` etc. are not
// secrets (they identify a project, not authorize access — Firestore/Storage
// security rules do the actual authorization) but we still keep them in env
// vars so this file never hard-codes a specific project. See ENVIRONMENT.md.
const googleMapsAndroidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

const config: ExpoConfig = {
  name: "EcoBike",
  slug: "ecobike-app",
  version: "2.0.0",
  scheme: "ecobike",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  // Splash screen is fully configured via the expo-splash-screen plugin
  // below — the old top-level `splash` key was removed from the config
  // schema (SDK57's ExpoConfig.splash is PWA-only, under `web`).
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.ecobike.app",
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "EcoBike usa tu ubicación para mostrar el mapa y registrar tus recorridos en bicicleta.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "EcoBike puede seguir registrando tu recorrido en segundo plano cuando bloqueas el teléfono.",
      NSFaceIDUsageDescription:
        "Usa Face ID para desbloquear EcoBike rápidamente después de iniciar sesión.",
      UIBackgroundModes: ["location"],
    },
  },
  android: {
    package: "com.ecobike.app",
    adaptiveIcon: {
      backgroundColor: "#F6FBF3",
      foregroundImage: "./assets/adaptive-icon.png",
    },
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "USE_BIOMETRIC",
      "USE_FINGERPRINT",
    ],
    // expo-image-picker declares these for its camera/video capture path,
    // which this app never uses (avatar picking is library-only, images
    // only). Leaving them in would advertise "record audio" on the Play
    // Store listing for a permission the app can't even trigger.
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
    ...(googleMapsAndroidApiKey
      ? { config: { googleMaps: { apiKey: googleMapsAndroidApiKey } } }
      : {}),
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-apple-authentication",
    "expo-sqlite",
    // Required peer of @expo/vector-icons / expo-symbols — without it icons
    // fail to load in a real (non-Expo-Go) native build.
    "expo-font",
    [
      "expo-image-picker",
      {
        // Avatar picking (app/(tabs)/profile.tsx). iOS rejects a build that
        // opens the photo library with no usage description.
        photosPermission:
          "EcoBike accede a tus fotos solo para que elijas una imagen de perfil.",
      },
    ],
    [
      "expo-maps",
      {
        requestLocationPermission: true,
        locationPermission:
          "EcoBike usa tu ubicación para mostrar el mapa y registrar tus recorridos.",
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "EcoBike puede seguir registrando tu recorrido en segundo plano cuando bloqueas el teléfono.",
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 220,
        backgroundColor: "#F6FBF3",
        dark: {
          image: "./assets/splash-icon.png",
          backgroundColor: "#0E1410",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
  },
};

export default config;
