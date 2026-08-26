#!/bin/bash
# Script de setup para EcoBike Web
# Ejecuta: bash setup.sh

echo "🚀 Configurando EcoBike para GitHub Pages..."
echo ""

# 1. Instalar dependencias
echo "📦 1. Instalando dependencias..."
npm install --legacy-peer-deps
echo "✅ Dependencias instaladas"
echo ""

# 2. Verificar .env.local
if [ ! -f .env.local ]; then
  echo "⚠️  IMPORTANTE: Necesitas configurar .env.local"
  echo "   1. Copia: cp .env.example .env.local"
  echo "   2. Edita .env.local con tus credenciales de Firebase"
  echo "   3. Reemplaza 'yourusername' en package.json con tu usuario de GitHub"
  echo ""
  read -p "¿Has completado esto? (s/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Setup cancelado. Por favor configura primero."
    exit 1
  fi
fi

# 3. Test development
echo ""
echo "🧪 2. Testing en modo desarrollo..."
echo "   Ejecuta: npm start"
echo "   Accede a: http://localhost:3000"
read -p "¿Listo para continuar? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "⏸️  Setup pausado."
  exit 0
fi

# 4. Build
echo ""
echo "🔨 3. Generando build de producción..."
npm run build
if [ $? -eq 0 ]; then
  echo "✅ Build completado"
else
  echo "❌ Error en build. Revisa los logs."
  exit 1
fi

# 5. Deploy
echo ""
echo "🌐 4. Deployando a GitHub Pages..."
npm run deploy
if [ $? -eq 0 ]; then
  echo "✅ Deployment completado"
  echo ""
  echo "🎉 ¡EcoBike publicado en GitHub Pages!"
  USERNAME=$(node -p "require('./package.json').homepage.split('/')[3]")
  echo "   Accede a: $(node -p "require('./package.json').homepage")"
else
  echo "❌ Error en deployment. Revisa los logs."
  exit 1
fi

echo ""
echo "📝 Próximos pasos:"
echo "   1. Verifica que el sitio está accesible"
echo "   2. Prueba login/registro con Firebase"
echo "   3. Comparte el link con amigos 🚲"
