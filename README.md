# Club360

Plataforma web de gestión para clubes deportivos: socios, cuotas, ligas, categorías, partidos, citaciones, rutinas y notificaciones. Es un proyecto integrador escolar que se desarrolla en profundidad sobre un caso real, el **club Valencia** y su módulo de **Vóley**, con arquitectura multi-club desde el diseño.

**Demo:** https://club360-ten.vercel.app (usuarios de prueba en [`docs/demo-usuarios.md`](docs/demo-usuarios.md); las
contraseñas se piden al equipo).

## Funciones por rol

- **Admin del Club:** socios (alta presencial con número de socio, baja, reactivación y desbloqueo), staff, roles y
  permisos, configuración del club y sus deportes, cuotas (generación, pagos en secretaría y revisión de transferencias),
  avisos generales, bitácora, integridad de datos (verificación y reparación) y copias de seguridad.
- **Representante:** inscripciones de su deporte, ligas y categorías, fixture con detección de partidos superpuestos,
  resultados y campaña de cada categoría, cuotas de las jugadoras y su panel de inicio con los pendientes.
- **Entrenadora:** sus categorías, partidos, citaciones (dentro de la ventana de 7 días a 48 horas) y resolución de
  conflictos de horario.
- **Preparadora física:** rutinas diarias por categoría y seguimiento de cómo le fue a cada jugadora.
- **Socio:** sus cuotas y pagos (tarjeta simulada o transferencia con comprobante, y el comprobante de pago en PDF), inscripción a los deportes y la
  información del club.
- **Jugadora:** partidos (próximos y jugados), citaciones para confirmar o rechazar, rutina con su registro, objetivos y
  progreso con gráficos, y su panel de inicio.
- **Familia:** partidos, citaciones y estado de cuenta de las jugadoras menores vinculadas, con el pago de sus cuotas.
- **Para todos:** un panel de inicio propio de cada rol con lo que hay que atender, notificaciones in-app (y por email las
  importantes), Mi cuenta y, para Socio, Jugadora y Familia, un asistente de consultas con menú de botones y texto libre
  que responde dudas generales sin acceder a datos personales. Sin sesión, la plataforma abre en una página de bienvenida; el login separa "Ya tengo cuenta" de "Es mi primera vez" (número de socio, código de vínculo o email de activación), y un asistente público explica cómo entrar y qué es la plataforma.

## Integrantes

- Sofía Bacher
- Thiago Chaile
- Ignacio Jericó
- Julián Prol

## Stack

- **Backend (`api/`):** Node.js, Express 5, Sequelize 6, MySQL 8, JWT, express-validator, multer, Cloudinary (archivos en producción), node-cron, API HTTP de Brevo (emails).
- **Frontend (`client/`):** React 19, Vite, Material UI 7, React Router 7, axios.

## Cómo levantar el proyecto en local

Requisitos: Node.js 20 o superior, MySQL 8 y git.

### 1. Clonar el repo

```bash
git clone https://github.com/sofiabacher/Club360.git
cd Club360
```

### 2. Base de datos

Crear la base `club360` en MySQL:

```sql
CREATE DATABASE club360 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Backend

```bash
cd api
cp .env.example .env     # completar los datos de MySQL, las claves y SEED_ADMIN_PASSWORD / SEED_DEMO_PASSWORD
npm install
npm run dev              # API en http://localhost:3000 (crea las tablas al arrancar)
```

En otra terminal, también desde `api/`:

```bash
npm run seed             # carga inicial: deportes, club Valencia, permisos, roles base y el usuario Admin
npm run seed:demo        # datos de la demo (socias, staff, ligas, partidos, cuotas...); --reset para volver a cargarlos
```

Para comprobar que la API responde: `GET http://localhost:3000/health`.

### 4. Frontend

```bash
cd client
cp .env.example .env     # VITE_API_URL=http://localhost:3000
npm install
npm run dev              # http://localhost:5173
```

## Scripts

| `api/` | Qué hace |
|---|---|
| `npm run dev` | Servidor con recarga automática |
| `npm start` | Servidor |
| `npm run seed` | Carga inicial del club (idempotente; se corre a mano) |
| `npm run seed:demo` | Datos de la demo sobre el seed (`-- --reset` para borrarlos y volver a cargarlos) |
| `npm run db:snapshot` | Guarda todos los datos de la base en `api/backups/` |
| `npm run db:restore` | Vuelve a cargar el último snapshot en una base recién recreada |
| `npm run bot:eval` | Evalúa el asistente de consultas con su set de prueba |

| `client/` | Qué hace |
|---|---|
| `npm run dev` | Vite en http://localhost:5173 |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build para probarlo |

## Cambios en el modelo

Cuando un cambio del modelo obliga a recrear las tablas (por ejemplo, una columna nueva), se recrea la base **conservando
los datos cargados**. Desde `api/`:

1. Guardar los datos:
   ```bash
   npm run db:snapshot      # guarda todas las tablas en api/backups/snapshot-AAAAMMDD-HHmmss.json
   ```
2. Recrear las tablas: poner `DB_FORCE_SYNC=true` en `api/.env`, correr `npm run dev` hasta que diga
   "Tablas sincronizadas", frenarlo con Ctrl+C y volver a `DB_FORCE_SYNC=false` (si no, cada arranque borra todo).
3. Volver a cargar los datos, **sin** correr el seed antes:
   ```bash
   npm run db:restore       # usa el snapshot más reciente; o: npm run db:restore -- <archivo>
   ```

El restore frena si la base no está vacía, inserta las filas tal cual estaban (con sus ids, el teléfono cifrado y los
dígitos verificadores) y al final verifica la integridad. Si avisa que hay DVH que no coinciden porque cambió el tipo de
una columna, repetir los pasos 2 y 3 con `npm run db:restore -- --recompute-dvh`. Es una herramienta de desarrollo: en la
demo, las copias de seguridad son del módulo de backup.

## Demo deployada

- **Front (Vercel):** https://club360-ten.vercel.app
- **API (Render):** `/health` para comprobar que responde

La base está en Railway, las imágenes y los comprobantes en Cloudinary, y los emails salen por la API de Brevo. Los pasos
para publicarla (cuentas, variables y carga de datos) están en [`docs/deploy.md`](docs/deploy.md).

## Documentación

- `CLAUDE.md`: convenciones técnicas del proyecto.
- `docs/contexto.md`: contexto, reglas de negocio y decisiones de modelado.
- `docs/DER_logico.jpg`: DER lógico.
- `docs/deploy.md`: guía de deploy de la demo.
- `docs/demo-usuarios.md`: usuarios de la demo y el caso que muestra cada uno.
- `docs/pruebas/`: casos de prueba, un archivo por módulo, y la evaluación del asistente.
- `docs/prompts/`: los prompts con los que se construyó cada parte.
- `docs/revision-final.md`: revisión final del código antes de la entrega.
- `docs/TODO.md`: lista de tareas y registro de avance.
