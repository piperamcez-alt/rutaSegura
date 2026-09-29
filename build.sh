#!/bin/bash
# Script de build para Railway
# Railway lo ejecuta automáticamente antes de iniciar el servidor

set -e  # detener si cualquier comando falla

echo "==> Instalando dependencias Node.js..."
npm install

echo "==> Compilando React con Vite..."
npm run build

echo "==> Recolectando archivos estáticos de Django..."
python manage.py collectstatic --noinput

echo "==> Aplicando migraciones de base de datos..."
python manage.py migrate --noinput

echo "✅ Build completado con éxito."
