#!/bin/bash
# Script de build para Railway
# Railway lo ejecuta automáticamente antes de iniciar el servidor.
# Ejecuta: npm install + vite build + collectstatic + migrate

set -e  # detener si cualquier comando falla

echo "==> Instalando dependencias Python..."
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

echo "==> Instalando dependencias Node.js..."
npm ci --prefer-offline

echo "==> Compilando React con Vite..."
npm run build

echo "==> Recolectando archivos estáticos de Django..."
python manage.py collectstatic --noinput --clear

echo "==> Aplicando migraciones de base de datos..."
python manage.py migrate --noinput

echo "✅ Build completado con éxito."
