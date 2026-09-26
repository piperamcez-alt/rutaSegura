# 🗂️ Estructura del Proyecto — Furgón Seguro

```
furgon-seguro-react/
├── .env                        ← Variables de entorno locales (NO subir a Git)
├── .env.example                ← Plantilla de variables de entorno
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
│
└── src/
    ├── App.jsx                 ← Raíz de la aplicación + router de vistas
    ├── App.css                 ← Estilos globales + diseño tokens + responsive
    ├── index.css               ← Reset CSS + fuentes
    ├── main.jsx                ← Entry point de React
    │
    ├── map/                    ← 🗺️ CAPA DE MAPA (Mapbox GL JS)
    │   ├── config.js           ← Token, estilos, coordenadas del recorrido
    │   ├── useMapboxRoute.js   ← Hook: Mapbox Directions API + animación del furgón
    │   ├── MapboxParentCard.jsx← Mapa para la vista del apoderado
    │   └── MapboxDriverMap.jsx ← Mapa para la vista del conductor
    │
    ├── security/               ← 🔒 CAPA DE SEGURIDAD
    │   └── index.js            ← sanitización, hashing PBKDF2, rate limiting,
    │                              token CSRF, storage seguro, audit log, validadores
    │
    ├── components/             ← 🧩 COMPONENTES UI
    │   ├── AppHeader.jsx       ← Header del apoderado (notificaciones, perfil)
    │   ├── DriverHeader.jsx    ← Header del conductor (notificaciones, salir)
    │   ├── DriverDashboard.jsx ← Dashboard completo del conductor
    │   ├── DriverMap.jsx       ← Wrapper del mapa del conductor (tabs: mapa/paradas)
    │   ├── RouteCard.jsx       ← Tarjeta de ruta del apoderado (mapa + ETA)
    │   ├── AttendanceToggle.jsx← Toggle de asistencia del apoderado
    │   ├── ChildCard.jsx       ← Tarjeta del alumno en la vista del apoderado
    │   ├── GuardianSheet.jsx   ← Panel deslizable de apoderados y código PIN
    │   ├── DeliveryModal.jsx   ← Modal de entrega con verificación de PIN
    │   ├── LoginScreen.jsx     ← Pantalla de inicio de sesión
    │   ├── RegisterModal.jsx   ← Modal de registro de nuevo usuario
    │   ├── NotificationsPanel.jsx← Panel de notificaciones
    │   └── icons.jsx           ← Iconos SVG inline
    │
    ├── hooks/                  ← ⚙️ HOOKS DE ESTADO
    │   ├── useVanState.js      ← Estado central: sync apoderado↔conductor,
    │   │                          auth, alumnos, PIN, notificaciones, ruta
    │   ├── useClickOutside.js  ← Detecta clic fuera de un elemento
    │   └── usePickupCode.js    ← Gestión del código PIN de entrega
    │
    ├── data/                   ← 📊 DATOS MOCK (reemplazables por API real)
    │   ├── mockData.js         ← Usuarios, alumnos y estados iniciales
    │   └── guardians.js        ← Apoderados, alumno y coordenadas de ruta
    │
    └── utils/                  ← 🛠️ UTILIDADES GENERALES
        ├── sanitize.js         ← Helpers de sanitización (legacy, ver security/)
        └── mapStyles.js        ← Config de estilos de mapa (legacy, ver map/)
```

## 🔑 Configuración del Mapa

Edita el archivo `.env` y agrega tu token de Mapbox:

```env
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiTU...
```

Sin el token, el mapa usa **OpenStreetMap** automáticamente (gratis, sin registro).

Obtén tu token gratuito en [account.mapbox.com](https://account.mapbox.com).

## 🔒 Sistema de Seguridad

La capa `src/security/index.js` provee:

| Función | Descripción |
|---|---|
| `sanitizeText(v)` | Elimina HTML, XSS y trunca |
| `sanitizeEmail(v)` | Valida y normaliza correos |
| `sanitizePIN(v)` | Extrae solo dígitos del PIN |
| `hashPassword(pw)` | Hash PBKDF2-SHA256 con salt |
| `verifyPassword(pw, hash)` | Comparación en tiempo constante |
| `rateLimit.recordFail(email)` | Bloqueo tras 5 intentos (15 min) |
| `csrfToken.verify(t)` | Verifica token de sesión |
| `safeStorage.get/set/remove` | localStorage seguro con namespace |
| `auditLog.write(cat, msg)` | Registro de eventos de sesión |
| `validators.*` | Validadores de formulario integrados |
