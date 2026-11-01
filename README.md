# Club360

Plataforma web de gestión para clubes deportivos: socios, cuotas, ligas, categorías, partidos, citaciones, rutinas y notificaciones. Es un proyecto integrador escolar que se desarrolla en profundidad sobre un caso real, el **club Valencia** y su módulo de **Vóley**, con arquitectura multi-club desde el diseño.

## Integrantes

- Sofía Bacher
- Thiago Chaile
- Ignacio Jericó
- Julián Prol

## Stack

- **Backend (`api/`):** Node.js, Express 5, Sequelize 6, MySQL 8, JWT, express-validator, multer, node-cron, Resend.
- **Frontend (`client/`):** React 19, Vite, Material UI 7, React Router 7, axios.

## Cómo levantar el proyecto en local

Requisitos: Node.js 20 o superior y MySQL 8.

### 1. Base de datos

Crear la base `club360` en MySQL:

```sql
CREATE DATABASE club360 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd api
cp .env.example .env     # completar los datos de MySQL y las claves
npm install
npm run dev              # API en http://localhost:3000
npm run seed             # carga inicial del club (una sola vez)
```

Para comprobar que la API responde: `GET http://localhost:3000/health`.

### 3. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

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

## Documentación

- `CLAUDE.md`: convenciones técnicas del proyecto.
- `docs/contexto.md`: contexto, reglas de negocio y decisiones de modelado.
- `docs/DER_logico.jpg`: DER lógico.
- `docs/TODO.md`: lista de tareas y registro de avance.
