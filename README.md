# RESTAURANTES - Dashboard de Márgenes para Delivery

**Plataforma SaaS para restaurantes pequeños que usan delivery (Uber Eats, Glovo, Just Eat). Visualiza márgenes de ganancia en tiempo real, recibe alertas automáticas y optimiza la rentabilidad.**

**€39/mes | 14 días gratis | Sin tarjeta de crédito requerida**

---

## 🎯 Problema que Resuelve

Restaurantes pequeños pierden 8-12% de margen porque **no saben qué platos son rentables**. 

Cuando venden a través de plataformas de delivery:
- No tienen visibilidad de costos reales vs precio de venta
- No saben cuál es el margen real de cada plato
- No reciben alertas cuando la rentabilidad cae

**RESTAURANTES resuelve esto en minutos.**

---

## 🚀 Características

✅ **Dashboard en Tiempo Real**
- KPIs: Margen promedio, pedidos hoy, ingresos, platos activos
- Gráficos de márgenes por plato (código de color: rojo <15%, verde ≥15%)
- Gráfico de ventas últimos 7 días

✅ **Gestión de Platos**
- Crear, editar, eliminar platos
- Cálculo automático de márgenes
- Alertas personalizables por margen mínimo

✅ **Webhooks & Integración**
- Recibe órdenes vía webhook desde n8n
- Calcula márgenes en tiempo real
- Envia alertas (Telegram, Email) cuando margen cae

✅ **Analytics** (próximamente)
- Exportar reportes PDF
- Predicción de demanda con ML
- Multi-restaurante (white-label)

---

## 📋 Stack Tecnológico

**Frontend (estático, CDN-based):**
- HTML5 + CSS3 + JavaScript vanilla (sin frameworks)
- Tailwind CSS vía CDN
- Appwrite Web SDK vía CDN
- Chart.js para gráficos

**Backend (ya instalado en VPS):**
- **Appwrite** (autenticación + base de datos)
- **n8n** (webhooks + automatizaciones)

**Deployment:**
- Frontend → Cloudflare Pages
- Backend → VPS existente

---

## 🏗️ Estructura del Proyecto

```
restaurante-margins-dashboard/
├── README.md                          # Este archivo
├── .gitignore                         # Git ignore (vacío, no hay node_modules)
├── index.html                         # Landing page
├── login.html                         # Login
├── register.html                      # Registro
├── dashboard.html                     # App principal
├── _redirects                         # Cloudflare redirects
├── _headers                           # Cloudflare headers de seguridad
├── js/
│   ├── config.js                      # Config Appwrite + n8n
│   ├── auth.js                        # Autenticación (login/register/logout)
│   ├── app.js                         # Lógica de datos (CRUD platos, órdenes)
│   └── charts.js                      # Gráficos (Chart.js wrapper)
├── css/
│   └── styles.css                     # Estilos custom
├── assets/
│   └── logo.svg                       # Logo
└── n8n-workflows/
    ├── webhook-orders.json            # Recibe y procesa órdenes
    ├── calculate-margins.json         # Cron para recalcular márgenes
    └── uber-sync.json                 # Placeholder: futura integración Uber
```

---

## 📦 Configuración Inicial

### 1. Appwrite Database Schema

Crea estas 4 colecciones en Appwrite:

#### **restaurants** (para guardar restaurantes)
```
- $id (auto)
- user_id (string, required)
- name (string, required)
- email (string, required, unique)
- phone (string)
- subscription_status (enum: trial, active, cancelled)
- trial_ends (datetime)
- created_at (datetime)
```

#### **dishes** (para guardar platos)
```
- $id (auto)
- restaurant_id (string, required) [relationship: restaurants]
- name (string, required)
- category (string)
- sale_price (float, required)
- ingredient_cost (float, required)
- margin_percent (float, auto-calculated)
- min_margin_alert (float, default: 15)
- is_active (boolean, default: true)
- created_at (datetime)
```

#### **orders** (para guardar órdenes)
```
- $id (auto)
- restaurant_id (string, required) [relationship: restaurants]
- dish_id (string, required) [relationship: dishes]
- platform (enum: uber_eats, glovo, just_eat, manual)
- quantity (integer)
- sale_price (float)
- cost (float)
- margin (float)
- margin_percent (float)
- order_date (datetime)
```

#### **alerts** (para alertas)
```
- $id (auto)
- restaurant_id (string, required) [relationship: restaurants]
- alert_type (enum: low_margin, stock_low)
- dish_id (string) [relationship: dishes]
- threshold (float)
- notification_method (enum: email, telegram)
- is_active (boolean)
```

**Permisos:** Cada usuario solo puede leer/escribir sus propios datos (filtrado por restaurant_id).

---

### 2. Variables de Entorno

Actualiza `js/config.js` con tus valores:

```javascript
export const config = {
  appwriteEndpoint: 'https://tu-appwrite-url.com',
  appwriteProject: 'tu-project-id-aqui',
  n8nWebhookUrl: 'https://tu-n8n-url.com/webhook/restaurant-orders',
};
```

---

### 3. Importar Workflows en n8n

1. Abre tu instancia de n8n: `https://n8n.rolifra.com`
2. Crea nuevo workflow
3. En menú **Workflow** → **Import from URL** o **Import from JSON file**
4. Importa cada archivo JSON de `n8n-workflows/`:
   - `webhook-orders.json`
   - `calculate-margins.json`
   - `uber-sync.json`
5. Para el workflow **webhook-orders**, obtén la URL del webhook:
   - Click en el nodo **Webhook**
   - Copia la URL completa
   - Pásala a la variable de config

---

## 🔧 Instalación Local

### Requisitos
- Python 3.x (para servidor local)
- Navegador moderno (Chrome, Firefox, Safari)

### Pasos

1. **Clona el repositorio**
```bash
git clone https://github.com/tu-usuario/restaurante-margins-dashboard.git
cd restaurante-margins-dashboard
```

2. **Inicia servidor local**
```bash
python3 -m http.server 8000
# Accede a http://localhost:8000
```

3. **Configura variables**
   - Abre `js/config.js`
   - Reemplaza `APPWRITE_ENDPOINT` y `PROJECT_ID` con tus valores
   - Reemplaza `N8N_WEBHOOK_URL` con la URL del webhook de n8n

4. **Prueba en navegador**
   - Landing: `http://localhost:8000`
   - Registro: `http://localhost:8000/register.html`
   - Login: `http://localhost:8000/login.html`
   - Dashboard: `http://localhost:8000/dashboard.html` (solo si estás logged)

---

## 🚀 Deploy en Cloudflare Pages

### Opción 1: GitHub Auto-Deploy (Recomendado)

1. **Push a GitHub**
```bash
git init
git add .
git commit -m "Initial commit: RESTAURANTES MVP"
gh repo create restaurante-margins-dashboard --public --source=. --remote=origin
git push -u origin main
```

2. **Conectar a Cloudflare**
   - Ve a https://dash.cloudflare.com
   - **Pages** → **Create a project** → **Connect to Git**
   - Selecciona tu repo `restaurante-margins-dashboard`
   - Build settings:
     - **Build command:** `(empty)` - no build needed
     - **Build output directory:** `/` (root)
   - Deploy

3. **DNS (opcional)**
   - Asigna dominio personalizado en Cloudflare Pages

### Opción 2: Manual Deploy

1. **Conecta Cloudflare**
```bash
npm install -g wrangler  # Si no lo tienes
wrangler pages deploy .
```

---

## 📝 Testing Checklist

### Funcional
- [ ] Registro crea usuario en Appwrite con trial 14 días
- [ ] Login redirige a dashboard
- [ ] Dashboard carga KPIs correctamente
- [ ] Añadir plato guarda y recalcula margen
- [ ] Editar plato actualiza datos
- [ ] Eliminar plato remueve de tabla
- [ ] Gráficos renderizan (margin chart, sales chart)
- [ ] Color rojo si margen <15%, verde si ≥15%
- [ ] Logout borra sesión y redirige a inicio
- [ ] Webhook n8n recibe POST y crea orden
- [ ] Pedido con margen bajo dispara alerta Telegram/email
- [ ] Trial expiry bloquea acceso después de 14 días

### Técnico
- [ ] Zero console errors en Chrome/Firefox/Safari
- [ ] Responsive: funciona en 320px - 1920px
- [ ] Cloudflare Pages deploy exitoso
- [ ] n8n workflows importables sin errores
- [ ] Webhook URL actualizada en config.js

---

## 📊 Datos de Prueba

Ejemplo de platos para testing:

```
Nombre: Pizza Margarita
Precio: €12.00
Costo: €3.50
Margen esperado: 70.8%

Nombre: Pasta Carbonara
Precio: €14.00
Costo: €4.20
Margen esperado: 70%

Nombre: Ensalada César
Precio: €9.50
Costo: €2.80
Margen esperado: 70.5%

Nombre: Hamburguesa
Precio: €11.00
Costo: €4.50
Margen esperado: 59% (ALERTA: <15%)
```

---

## 🔌 Integración Webhooks

Para registrar una orden via webhook:

```bash
curl -X POST https://n8n.rolifra.com/webhook/restaurant-orders \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": "user_id_aqui",
    "dish_id": "plato_id_aqui",
    "quantity": 1,
    "sale_price": 12.00,
    "platform": "uber_eats"
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "orderId": "order_123",
  "margin_percent": 70.8,
  "alert_sent": false
}
```

---

## 🛡️ Seguridad

✅ **Implementado:**
- Appwrite permisos: cada usuario solo accede sus datos
- Validation client-side (forms)
- Headers de seguridad (_headers)
- No hardcodear API keys en código

⚠️ **Recomendaciones:**
- Usa variables de entorno en Cloudflare para Appwrite Project ID
- Rotate Telegram bot tokens regularmente
- SMTP credentials en n8n (no en código)
- Rate limiting en Appwrite

---

## 📞 Soporte

- **Documentación Appwrite:** https://appwrite.io/docs
- **Documentación n8n:** https://docs.n8n.io
- **Documentación Cloudflare Pages:** https://pages.cloudflare.com

---

## 🔮 Roadmap Post-MVP

1. **Integración Uber Eats** - OAuth + fetch automático
2. **Integración Glovo** - API webhook
3. **Analytics Avanzado** - Predicción demanda, reporting PDF
4. **Multi-restaurante** - Manage múltiples locales desde dashboard
5. **PWA** - App mobile instalable
6. **Whitelabel** - Vende a otros restaurantes bajo tu marca

---

## 📄 Licencia

Propietario. Código confidencial de RESTAURANTES SL.

---

## 👤 Creado Por

RESTAURANTES MVP - Mayo 2026

Hecho con ❤️ para restaurantes españoles.

---

## Variables de Entorno Necesarias en n8n

Para que los workflows funcionen, configura en n8n:

```
TELEGRAM_BOT_TOKEN=tu_bot_token_aqui
TELEGRAM_CHAT_ID=tu_chat_id_aqui
APPWRITE_API_KEY=tu_api_key_aqui
SMTP_HOST=smtp.tuproveedor.com
SMTP_USER=tu_email@ejemplo.com
SMTP_PASS=tu_contraseña
```

---

## 🎓 Comandos Útiles

```bash
# Crear repositorio
git init && git add . && git commit -m "Initial commit"

# Deploy a GitHub
gh repo create restaurante-margins-dashboard --public --source=. --remote=origin
git push -u origin main

# Server local
python3 -m http.server 8000

# Ver archivos
ls -la

# Git status
git status
```

---

**¡Listo para empezar!** Sigue los pasos de configuración y tendrás tu dashboard funcionando en 30 minutos.
