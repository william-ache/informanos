# Informa Aragua

Plataforma de emergencia para el **Estado Aragua, Venezuela**. Permite visualizar centros de acopio en un mapa interactivo, registrar necesidades, coordinar por chat en tiempo real y consultar estadísticas informativas de visitantes.

## Características

- **Mapa interactivo** con OpenStreetMap y delimitación del estado Aragua
- **Centros de acopio**: registro con clic en mapa, listado y detalle de necesidades
- **Chat en tiempo real** (polling) con mensajes flotantes sobre el mapa
- **Reporte de necesidades** por centro con niveles de urgencia
- **Presencia informativa**: usuarios en línea e IPs únicas (hash SHA-256, sin almacenar IP en texto plano)
- **Mobile-first**: navegación inferior, diseño adaptable y safe areas

## Stack

| Capa        | Tecnología                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 15, React 19, Tailwind CSS 4 |
| Mapa        | Leaflet, react-leaflet              |
| Datos       | SWR (polling)                       |
| Backend     | Next.js App Router (API Routes)     |
| Base de datos | MySQL 8.0                         |

## Requisitos

- Node.js 20+
- MySQL 8.0+

## Instalación local

```bash
git clone git@github.com:william-ache/informanos.git
cd informanos
npm install
cp .env.example .env.local
```

Configura `.env.local`:

```env
DB_HOST=127.0.0.1
DB_USER=informa
DB_PASSWORD=informa_aragua_secure
DB_NAME=informa_aragua
```

Crea la base de datos:

```bash
mysql -u root -p < mysql/schema.sql
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

> Si ves errores 500 por caché corrupta: `npm run dev:clean` (solo un proceso `next dev` a la vez).

## Scripts

| Comando           | Descripción                          |
|-------------------|--------------------------------------|
| `npm run dev`     | Servidor de desarrollo               |
| `npm run dev:clean` | Borra `.next` y arranca dev        |
| `npm run build`   | Build de producción                  |
| `npm run start`   | Servidor de producción (puerto 3000) |
| `npm run lint`    | ESLint                               |

## API

| Ruta               | Métodos   | Descripción                    |
|--------------------|-----------|--------------------------------|
| `/api/centros`     | GET, POST | Listar / registrar centros     |
| `/api/necesidades` | POST      | Registrar necesidad            |
| `/api/chat`        | GET, POST | Mensajes del chat              |
| `/api/presence`    | GET, POST | Estadísticas y heartbeat       |

## Estructura del proyecto

```
app/              Páginas y API Routes
components/       UI (mapa, chat, dashboard)
hooks/            Hooks de cliente
lib/              DB, utilidades, geolocalización Aragua
mysql/            Schema SQL
public/           Assets estáticos (iconos Leaflet)
types/            Tipos TypeScript
```

## Despliegue en VPS

El proyecto está preparado para correr detrás de **nginx** con **PM2**:

```bash
# En el servidor (/var/www/informanos)
git clone git@github.com:william-ache/informanos.git .
npm ci
cp .env.example .env.local   # editar credenciales
mysql -u root -p < mysql/schema.sql
npm run build
pm2 start ecosystem.config.js
pm2 save
```

Configura nginx como reverse proxy al puerto 3000. Ver `deploy/nginx.conf.example`.

## Licencia

Proyecto privado — uso comunitario para emergencias en Aragua.
