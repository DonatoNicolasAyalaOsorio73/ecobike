# EcoBike — Expo / React Native ("Liquid Glass" UI)

Recreación fiel de las 3 pantallas (Bienvenida, Registro, Recuperar
contraseña) usando el lenguaje visual "Liquid Glass" de iOS: superficies
traslúcidas con `expo-blur`, degradados suaves con `expo-linear-gradient`,
bordes de brillo y sombras difusas sobre un fondo con "blobs" verdes
desenfocados. Incluye también una pantalla de Inicio de sesión (no estaba
en las capturas, pero es necesaria porque los otros 3 flujos enlazan a
ella).

## Instalar y correr

```bash
npm install
npx expo start
```

Luego abre la app en el simulador de iOS, Android, o escanea el QR con
Expo Go. Está pensada primero para iOS (donde el efecto de vidrio se ve
mejor), pero funciona igual en Android y Web.

## Estructura

```
App.js                          Navegación (stack: Welcome → Login/Register/ForgotPassword)
src/
  theme/colors.js                Paleta y tokens (glass fills, verdes, sombras)
  components/
    BackgroundBlobs.js           Fondo con blobs verdes desenfocados
    GlassInput.js                Input de vidrio con ícono + toggle de contraseña
    GlassButton.js                Botón primario (gradiente verde) y secundario (glass blanco)
    SocialRow.js                  Fila "O continúa con" + círculos Google/Apple/Facebook
    BackButton.js                  Botón circular de regreso
    Logo.js                        Logotipo eco BIKE (hoja + bicicleta, sin assets)
  screens/
    WelcomeScreen.js               Pantalla 1
    RegisterScreen.js              Pantalla 2
    ForgotPasswordScreen.js        Pantalla 3
    LoginScreen.js                 Bonus, estilo consistente
```

## Notas de diseño

- El efecto "liquid glass" se logra combinando `BlurView` (expo-blur) con
  rellenos blancos semitransparentes (`rgba(255,255,255,0.45–0.65)`) y
  bordes de 1px casi blancos (`rgba(255,255,255,0.8–0.9)`) que simulan el
  brillo de refracción del vidrio.
- El botón primario usa un degradado verde claro → verde (`LinearGradient`)
  en vez de un verde plano, para que combine con el resto de superficies
  de vidrio.
- Todo el logo e íconos usan `@expo/vector-icons` (Ionicons /
  MaterialCommunityIcons / AntDesign / FontAwesome), así que no se
  necesitan imágenes ni fuentes externas para correr el proyecto.
- Los inputs, tarjetas y botones son componentes reutilizables en
  `src/components`, pensados para extenderse a otras pantallas
  (perfil, canje de puntos, etc.).
