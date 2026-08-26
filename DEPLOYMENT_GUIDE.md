# 🚀 Guía de Deployment - EcoBike en GitHub Pages

## ✅ Pasos Completados

Tu proyecto EcoBike ha sido convertido exitosamente de **React Native** a **React Web** y está listo para publicar en GitHub Pages.

### Cambios Realizados:

1. ✅ **Estructura Web**
   - Creado `public/index.html` 
   - Creado `src/index.js` (entry point web)
   - Actualizado `package.json` con dependencias web

2. ✅ **Componentes Convertidos**
   - App.tsx → versión React web
   - MyNavigation.tsx → React Router + Bottom Navigation
   - Todos los screens actualizados: PointsScreen, MapScreen, FriendsScreen, UserScreen
   - Auth screens: Welcome, SignIn, Register, PasswordReset

3. ✅ **Estilos CSS**
   - Creados archivos CSS para cada pantalla
   - Diseño responsive para desktop y móvil
   - Navegación de pestañas en la parte inferior

4. ✅ **Dependencias Instaladas**
   - react-scripts para build y dev
   - react-router-dom para navegación
   - Firebase para backend
   - gh-pages para deployment

---

## 📋 CHECKLIST PRE-DEPLOYMENT

### 1. Configurar Firebase

```bash
# Copia el archivo de ejemplo
cp .env.example .env.local
```

Completa `.env.local` con tus credenciales de Firebase:
```
REACT_APP_FIREBASE_API_KEY=xxx
REACT_APP_FIREBASE_AUTH_DOMAIN=xxx
REACT_APP_FIREBASE_PROJECT_ID=xxx
REACT_APP_FIREBASE_STORAGE_BUCKET=xxx
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=xxx
REACT_APP_FIREBASE_APP_ID=xxx
REACT_APP_FIREBASE_MEASUREMENT_ID=xxx
PUBLIC_URL=/EcoBike
```

### 2. Crear Repositorio en GitHub

```bash
# Si aún no has iniciado git
git init
git add .
git commit -m "Initial commit: EcoBike Web App"

# Crea el repo en GitHub como "EcoBike"
# Luego conecta:
git remote add origin https://github.com/TU_USUARIO/EcoBike.git
git branch -M main
git push -u origin main
```

### 3. Actualizar `package.json`

Reemplaza `TU_USUARIO` con tu username de GitHub:

```json
{
  "homepage": "https://TU_USUARIO.github.io/EcoBike",
  ...
}
```

### 4. Actualizar Firebase Security Rules

En Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### 5. Configurar GitHub Pages

En tu repo de GitHub:
1. Ve a Settings → Pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` (se creará automáticamente al hacer deploy)
4. Guarda

---

## 🚀 DEPLOYMENT

### Opción A: Manual (Más Control)

```bash
# Desde la carpeta raíz del proyecto
npm run build
npm run deploy
```

Espera 2-3 minutos y tu app estará en: `https://TU_USUARIO.github.io/EcoBike`

### Opción B: Automático con GitHub Actions (Recomendado)

Crea el archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy EcoBike to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install --legacy-peer-deps
      
      - name: Build
        run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

Luego:
```bash
git add .
git commit -m "Add GitHub Actions deploy workflow"
git push origin main
```

GitHub hará el deploy automáticamente cada vez que hagas push a main.

---

## 🧪 TESTING LOCAL

### Probar el development server:
```bash
npm start
```
Se abrirá en `http://localhost:3000`

### Probar la versión de producción localmente:
```bash
npm run build
npx serve -s build
```
Se abrirá en `http://localhost:3000` mostrando la build de producción

---

## 🔍 VERIFICACIÓN POST-DEPLOYMENT

1. ✅ Accede a `https://TU_USUARIO.github.io/EcoBike`
2. ✅ Verifica que todas las pantallas cargan
3. ✅ Prueba el login/registro (asegúrate de tener Firebase configurado)
4. ✅ Verifica la navegación entre tabs
5. ✅ Prueba en navegador móvil (responsive)

---

## ⚠️ PROBLEMAS COMUNES

### "Page not found" en GitHub Pages
**Solución:** Asegúrate de que `homepage` en package.json es correcto

### CORS errors con Firebase
**Solución:** En Firebase Console → Project Settings → Authorized Domains, añade:
- `localhost:3000`
- `TU_USUARIO.github.io`

### Pantallas en blanco
**Solución:** 
1. Abre DevTools (F12)
2. Ve a Console
3. Busca errores
4. Verifica que `.env.local` tiene las credenciales correctas

### Build falló
**Solución:** 
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

---

## 📚 REFERENCIAS

- [React Documentation](https://react.dev)
- [Create React App](https://create-react-app.dev)
- [React Router](https://reactrouter.com)
- [Firebase Web SDK](https://firebase.google.com/docs/web)
- [GitHub Pages Docs](https://pages.github.com)

---

## 📝 PRÓXIMOS PASOS

Después del deployment, considera:

1. **Mejorar la UI**
   - Implementar Tailwind CSS o Material-UI
   - Añadir animaciones suaves
   - Optimizar colores y fuentes

2. **Funcionalidad**
   - Completar integración de mapas con Leaflet
   - Historial de viajes
   - Badges y achievements
   - Sistema de puntos

3. **Performance**
   - Code splitting
   - Lazy loading
   - Image optimization

4. **SEO**
   - Meta tags
   - Sitemap
   - Open Graph tags

---

## 🎉 ¡Felicidades!

Tu aplicación EcoBike ahora está publicada en GitHub Pages y es accesible desde cualquier navegador en el mundo.

**Dirección:** `https://TU_USUARIO.github.io/EcoBike`

Comparte con amigos y comienza a pedalear hacia un futuro más sostenible 🌍🚲
