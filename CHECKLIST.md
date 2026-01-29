# ✅ CHECKLIST: Publicar EcoBike en GitHub Pages

## 📋 PRE-REQUISITOS
- [ ] Tienes Node.js v14+ instalado (`node --version`)
- [ ] Tienes npm instalado (`npm --version`)
- [ ] Tienes Git instalado (`git --version`)
- [ ] Tienes una cuenta en GitHub
- [ ] Tienes una cuenta en Firebase (o crea una gratis)

---

## 🔧 CONFIGURACIÓN LOCAL

### 1. Firebase Setup
- [ ] Accede a https://console.firebase.google.com
- [ ] Crea un nuevo proyecto o usa uno existente
- [ ] Ve a Configuración del Proyecto
- [ ] Copia las credenciales (API Key, Project ID, etc.)
- [ ] Ejecuta: `cp .env.example .env.local`
- [ ] Edita `.env.local` y pega las credenciales
- [ ] Verifica que `PUBLIC_URL=/EcoBike`

### 2. Verificar Instalación
- [ ] `npm --version` (debería ser v6+)
- [ ] `node --version` (debería ser v14+)
- [ ] Estás en la carpeta correcta: `c:\Users\donalduck\Documents\EcoBike`

### 3. Instalar Dependencias
```bash
npm install --legacy-peer-deps
```
- [ ] Instalar completó sin errores
- [ ] Carpeta `node_modules/` existe

---

## 🧪 TESTING LOCAL

### 4. Probar en Desarrollo
```bash
npm start
```
- [ ] Se abre `http://localhost:3000` automáticamente
- [ ] Ves la pantalla Welcome
- [ ] Los botones funcionan
- [ ] La navegación entre tabs funciona
- [ ] No hay errores en la consola (F12)

### 5. Parar el Servidor
- [ ] Presiona `Ctrl+C` en la terminal

---

## 📚 GITHUB SETUP

### 6. Crear Repositorio
- [ ] Ve a https://github.com/new
- [ ] Nombre: `EcoBike`
- [ ] Descripción: "Aplicación web para rastrear ciclos en bicicleta"
- [ ] Privado o Público (tu elección)
- [ ] Crea el repo
- [ ] Copia la URL: `https://github.com/TU_USUARIO/EcoBike.git`

### 7. Configurar Git Localmente
```bash
git init
git add .
git commit -m "Initial commit: EcoBike Web App"
git remote add origin https://github.com/TU_USUARIO/EcoBike.git
git branch -M main
git push -u origin main
```
- [ ] Sin errores de conexión
- [ ] Los archivos están en GitHub (verifica el repo)

---

## 🔧 CONFIGURACIÓN FINAL

### 8. Actualizar package.json
Edita `package.json` línea 4:
```json
"homepage": "https://TU_USUARIO.github.io/EcoBike",
```
- [ ] Reemplazaste `TU_USUARIO` con tu username de GitHub
- [ ] NO hay espacios extra
- [ ] Guardaste el archivo

### 9. Commit del cambio
```bash
git add package.json
git commit -m "Update homepage for GitHub Pages"
git push origin main
```
- [ ] Push exitoso

### 10. Configurar GitHub Pages
1. [ ] Ve a tu repo: `https://github.com/TU_USUARIO/EcoBike`
2. [ ] Haz clic en **Settings** (arriba a la derecha)
3. [ ] En el sidebar izquierdo, haz clic en **Pages**
4. [ ] En "Source", selecciona **Deploy from a branch**
5. [ ] Rama: `gh-pages` (se creará automáticamente)
6. [ ] Haz clic en **Save**
7. [ ] Espera 1 minuto y actualiza la página

---

## 🚀 DEPLOYMENT

### 11. Build y Deploy
```bash
npm run build
npm run deploy
```
- [ ] Build completó sin errores
- [ ] Deploy completó sin errores
- [ ] La carpeta `build/` fue creada
- [ ] GitHub realizó push a rama `gh-pages`

### 12. Verificar Deploy
1. [ ] Espera 2-3 minutos
2. [ ] Ve a: `https://TU_USUARIO.github.io/EcoBike`
3. [ ] ¿Se cargó la página? Si no, espera más
4. [ ] ¿Ves la pantalla Welcome?
5. [ ] ¿Funciona la navegación?

---

## 🔐 FIREBASE SECURITY

### 13. Configurar Firestore Rules
1. [ ] Ve a https://console.firebase.google.com
2. [ ] Selecciona tu proyecto
3. [ ] Ve a **Firestore Database**
4. [ ] Haz clic en **Rules**
5. [ ] Copia estas rules:

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

6. [ ] Haz clic en **Publish**

### 14. Configurar API Key
1. [ ] Ve a **Project Settings** en Firebase
2. [ ] Haz clic en **Service Accounts**
3. [ ] Haz clic en **All clusters** a la izquierda
4. [ ] Ve a **API Keys** (en Google Cloud Console que se abre)
5. [ ] Edita la API Key de navegador
6. [ ] Añade restricciones HTTP referrers:
   - `http://localhost:3000`
   - `https://TU_USUARIO.github.io`
7. [ ] Guarda

---

## ✅ PRUEBAS FINALES

### 15. Probar la App Web
Ve a `https://TU_USUARIO.github.io/EcoBike`:
- [ ] La página se carga
- [ ] Ves la interfaz completa
- [ ] Los botones responden
- [ ] Puedes navegar entre tabs
- [ ] Es responsive (prueba en móvil o resize)

### 16. Probar Autenticación
- [ ] Haz clic en "Crear Cuenta"
- [ ] Completa el formulario con datos válidos
- [ ] ¿Se registró sin error?
- [ ] ¿Ahora ves el dashboard?
- [ ] Haz clic en el tab "Perfil"
- [ ] Haz clic en "Cerrar Sesión"
- [ ] ¿Vuelve a Welcome?

---

## 🎉 ¡LISTO!

Si completaste todos los checkboxes arriba, **¡tu app está publicada!**

### URL Final
```
https://TU_USUARIO.github.io/EcoBike
```

### Próximos Pasos
- [ ] Comparte el link con amigos
- [ ] Mejora el diseño (agrega más estilos)
- [ ] Completa la funcionalidad (historial, leaderboard, etc.)
- [ ] Considera SEO y meta tags
- [ ] Monitorea errores en Firebase Console

---

## 🆘 TROUBLESHOOTING RÁPIDO

| Problema | Solución |
|----------|----------|
| "Page not found en GitHub Pages" | Verifica `homepage` en package.json |
| Firebase auth errors | Verifica `.env.local` con credenciales correctas |
| Pantalla en blanco | Abre DevTools (F12) → Console, busca errores |
| CORS errors | Ve a Firebase Console → Authorized Domains, añade tu dominio |
| Build falla | `rm -rf node_modules && npm install --legacy-peer-deps` |

---

## 📞 REFERENCIAS

- [INICIO_RAPIDO.md](INICIO_RAPIDO.md) - Guía rápida
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Guía detallada
- [README-WEB.md](README-WEB.md) - Documentación técnica
- [CONVERSION_SUMMARY.md](CONVERSION_SUMMARY.md) - Resumen de cambios

---

**Marca los checkboxes conforme completes cada paso** ✅

*Última actualización: 29 de Enero de 2026*
