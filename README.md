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

## Documentación

- `CLAUDE.md`: convenciones técnicas del proyecto.
- `docs/contexto.md`: contexto, reglas de negocio y decisiones de modelado.
- `docs/DER_logico.jpg`: DER lógico.
- `docs/TODO.md`: lista de tareas y registro de avance.
