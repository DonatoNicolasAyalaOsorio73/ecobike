# EcoBike - Aplicación Web

EcoBike es una aplicación web que te ayuda a rastrear tu actividad en bicicleta y acumular puntos ecológicos.

## 🚀 Inicio Rápido

### Requisitos
- Node.js 14+ 
- npm o yarn
- Una cuenta en Firebase
- Una cuenta en GitHub

### Instalación

1. **Clona el repositorio**
```bash
git clone https://github.com/yourusername/EcoBike.git
cd EcoBike
```

2. **Instala las dependencias**
```bash
npm install
```

3. **Configura Firebase**
   - Copia `.env.example` a `.env.local`
   - Completa las variables de ambiente con tus credenciales de Firebase
```bash
cp .env.example .env.local
```

4. **Inicia el servidor de desarrollo**
```bash
npm start
```

La aplicación se abrirá en `http://localhost:3000`

## 📦 Build para Producción

```bash
npm run build
```

Esto crea una carpeta `/build` optimizada para producción.

## 🌐 Desplegar en GitHub Pages

### Paso 1: Actualiza `package.json`
Reemplaza `yourusername` con tu usuario de GitHub en la línea de `homepage`:
```json
"homepage": "https://yourusername.github.io/EcoBike",
```

### Paso 2: Despliega
```bash
npm run deploy
```

¡Tu app estará disponible en `https://yourusername.github.io/EcoBike`

### Configuración Automática con GitHub Actions (Opcional)

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

## 🔥 Variables de Ambiente

Necesitas configurar Firebase. Crea un archivo `.env.local` basado en `.env.example`:

```
REACT_APP_FIREBASE_API_KEY=tu_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=tu_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=tu_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
REACT_APP_FIREBASE_APP_ID=tu_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=tu_measurement_id
PUBLIC_URL=/EcoBike
```

⚠️ **IMPORTANTE**: Nunca hagas commit del archivo `.env.local`. Siempre usa `.env.example` para plantillas.

## 🏗️ Estructura del Proyecto

```
EcoBike/
├── public/
│   └── index.html
├── src/
│   ├── auth/              # Pantallas de autenticación
│   │   ├── Welcome.tsx
│   │   ├── SignIn.tsx
│   │   ├── Register.tsx
│   │   └── PasswordResetScreen.tsx
│   ├── screens/           # Pantallas principales
│   │   ├── PointsScreen.tsx
│   │   ├── MapScreen.tsx
│   │   ├── FriendsScreen.tsx
│   │   └── UserScreen.tsx
│   ├── components/        # Componentes reutilizables
│   ├── services/          # Servicios (Firebase, etc)
│   ├── App.tsx
│   ├── MyNavigation.tsx
│   └── index.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🔐 Seguridad en Firebase

### Reglas de Firestore (Importante para Producción)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden leer/escribir sus propios documentos
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Rutas públicas (lectura)
    match /publicData/{document=**} {
      allow read: if request.auth != null;
    }
  }
}
```

### Seguridad de API Key

La API Key de Firebase está expuesta en el código (esto es normal en apps frontend). Para proteger tu proyecto:

1. **Usa Google Cloud Console**
   - Restringe la API Key a solo servicios necesarios
   - Configura restricciones de referencia HTTP

2. **Habilita la autenticación**
   - Requiere que los usuarios se autentiquen antes de acceder

3. **Configura Firestore Security Rules**
   - Solo permite acceso a datos propios del usuario

## 📱 Características Principales

- ✅ Autenticación con Firebase Auth
- ✅ Registro de viajes en bicicleta
- ✅ Acumulación de puntos
- ✅ Rastreo de ubicación (Geolocation API)
- ✅ Perfil de usuario
- ✅ Red de amigos

## 🧪 Testing

```bash
npm test
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo licencia MIT.

## 📞 Soporte

Para problemas o preguntas, abre un [Issue](https://github.com/yourusername/EcoBike/issues).

---

**Hecho con 💚 para un futuro más sostenible**
