# 🚴‍♂️ EcoBike

Pedalea, gana puntos y cuida el planeta. Una aplicación móvil que recompensa tus viajes en bicicleta.

## 🌐 Demo en Vivo

**[👉 Prueba la Demo Web Aquí](https://ecobike-demo.netlify.app)**

### 🎯 Credenciales Demo

```
📧 Email: demo@ecobike.com
🔒 Contraseña: demo123
```

> **Nota:** Esta es una versión de demostración web. La app móvil completa incluye GPS real, notificaciones push y más funcionalidades.

## ✨ Características

- 🗺️ **Seguimiento de rutas** - Simulador web (GPS real en móvil)
- 🏆 **Sistema de puntos** - Gana 10 puntos por cada kilómetro
- 🎁 **Recompensas** - Canjea puntos por descuentos y premios
- 👤 **Perfil personalizado** - Gestiona tu información y estadísticas
- 🎨 **Animaciones fluidas** - Efectos visuales estilo iOS con lava animada (#64cd69)
- 💾 **Modo demo** - Sin necesidad de registro ni Firebase

## 📱 Capturas de Pantalla

| Welcome | Login | Home | Mapa |
|---------|-------|------|------|
| ![Welcome](https://via.placeholder.com/200x400/64cd69/fff?text=Welcome) | ![Login](https://via.placeholder.com/200x400/64cd69/fff?text=Login) | ![Home](https://via.placeholder.com/200x400/64cd69/fff?text=Home) | ![Map](https://via.placeholder.com/200x400/64cd69/fff?text=Map) |

| Recompensas | Perfil |
|-------------|--------|
| ![Rewards](https://via.placeholder.com/200x400/64cd69/fff?text=Rewards) | ![Profile](https://via.placeholder.com/200x400/64cd69/fff?text=Profile) |

## 🛠️ Tecnologías

- **Frontend**: React Native + Expo
- **Web**: React Native Web
- **Navegación**: React Navigation v7
- **Animaciones**: Reanimated 2 + Expo Blur
- **Backend**: Firebase (Auth + Firestore) - Modo demo usa LocalStorage
- **Mapas**: react-native-maps (móvil) / Simulador (web)
- **Estilos**: StyleSheet + LinearGradient
- **Deploy**: Netlify

## 🚀 Instalación Local

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Expo CLI

### Pasos

```bash
# Clonar el repositorio
git clone https://github.com/DonatoNicolasAyalaOsorio/EcoBike.git
cd EcoBike

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npx expo start

# Para web
npx expo start --web

# Para móvil
npx expo start --android  # o --ios
```

## 🌐 Deploy

### Build para producción

```bash
npx expo export --platform web
```

### Deploy a Netlify

```bash
netlify deploy --prod
```

## 📂 Estructura del Proyecto

```
EcoBike/
├── src/
│   ├── auth/                    # Autenticación
│   │   ├── Welcome.js           # Pantalla de bienvenida
│   │   ├── SignIn.js            # Inicio de sesión
│   │   ├── Register.js          # Registro
│   │   └── PasswordResetScreen.js
│   ├── screens/                 # Pantallas principales
│   │   ├── Home.js              # Dashboard
│   │   ├── MapScreen.js         # Mapa nativo (móvil)
│   │   ├── MapScreen.web.js     # Mapa web (simulador)
│   │   ├── Rewards.js           # Sistema de recompensas
│   │   └── Profile.js           # Perfil de usuario
│   ├── components/              # Componentes reutilizables
│   │   └── MyBlur.tsx           # Fondo animado con efecto lava
│   ├── config/
│   │   └── demoConfig.js        # Configuración modo demo
│   ├── services/
│   │   └── authService.js       # Servicios de autenticación
│   ├── FireDataBase.js          # Configuración Firebase
│   └── MyNavigation.tsx         # Navegación de la app
├── assets/                      # Recursos estáticos
├── dist/                        # Build de producción (web)
├── app.json                     # Configuración Expo
├── package.json                 # Dependencias
└── README.md                    # Este archivo
```

## 🎨 Características Destacadas

### 🌊 Animación de Lava (MyBlur)

Componente de fondo animado con efectos de lámpara de lava:

- **10 burbujas animadas** independientemente
- **Movimiento fluido** estilo iOS con Reanimated 2
- **Base dinámica** que se estira y ondula
- **Color personalizado**: `#64cd69` (verde EcoBike)
- **Blur effect**: Glassmorphism con expo-blur

```typescript
<MyBlur>
  {/* Tu contenido aquí */}
</MyBlur>
```

### 💾 Modo Demo

Funciona sin backend ni Firebase:

- ✅ Autenticación simulada
- ✅ Datos en LocalStorage
- ✅ Usuario demo: `demo@ecobike.com` / `demo123`
- ✅ Rutas y puntos precargados
- ✅ Perfecto para testing y demos

### 📱 Responsive Web

- Adaptado para web con componentes específicos
- MapScreen.web.js para simular tracking
- UI optimizada para navegadores
- Compatible con todos los dispositivos

## 📊 Funcionalidades

### Sistema de Puntos
- 🎯 10 puntos por kilómetro recorrido
- 📈 Tracking de progreso en tiempo real
- 🏆 Historial de rutas completadas

### Recompensas
- 🎁 Catálogo de premios canjeables
- 💰 Descuentos en comercios aliados
- ⭐ Sistema de niveles y logros

### Perfil de Usuario
- 👤 Información personal
- 📊 Estadísticas de uso
- 🚴‍♂️ Kilómetros totales
- 🏅 Puntos acumulados

## 🗺️ Roadmap

- [ ] Integración con Strava
- [ ] Desafíos semanales y mensuales
- [ ] Ranking global de usuarios
- [ ] Modo oscuro
- [ ] Compartir logros en redes sociales
- [ ] Notificaciones push
- [ ] Badges y logros
- [ ] Equipos y competencias grupales
- [ ] Marketplace de recompensas ampliado

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Autor

**Donato Nicolas Ayala Osorio**

- GitHub: [@DonatoNicolasAyalaOsorio](https://github.com/DonatoNicolasAyalaOsorio)
- Demo Web: [ecobike-demo.netlify.app](https://ecobike-demo.netlify.app)

## 🙏 Agradecimientos

- Expo team por la increíble plataforma de desarrollo
- Firebase por los servicios backend gratuitos
- Netlify por el hosting web instantáneo
- Comunidad React Native por el soporte continuo

## 📞 Contacto

¿Tienes preguntas o sugerencias? ¡Abre un issue en GitHub!

---

<div align="center">

### ⭐ Si te gusta este proyecto, dale una estrella en GitHub!

**[🚀 Ver Demo](https://ecobike-demo.netlify.app)** | **[📱 Repositorio](https://github.com/DonatoNicolasAyalaOsorio/EcoBike)**

</div>
```

### 2. Commit y push los cambios

````powershell
git add README.md
git commit -m "Add Netlify demo URL to README"
git push origin main