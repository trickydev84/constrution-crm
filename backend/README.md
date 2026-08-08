# Construction CRM Backend

NestJS REST API with MongoDB, JWT authentication, Swagger, and modular domain structure.

```bash
cp .env.example .env
npm install
npm run start:dev
```

API: `http://localhost:4000/api`  
Swagger: `http://localhost:4000/docs`

## Seed users

The API automatically seeds users during startup when `SEED_USERS=true` (the default). It is safe to restart the API: existing email addresses are never overwritten.

Default development accounts all use `ChangeMe123!` unless overridden in `.env`:

| Role | Email |
| --- | --- |
| Superadmin | `superadmin@construction.local` |
| Administrator | `admin@construction.local` |
| Sales | `sales@construction.local` |
| Project manager | `project.manager@construction.local` |
| Supervisor | `supervisor@construction.local` |
| Accountant | `accountant@construction.local` |
| Customer | `customer@construction.local` |

To run the same seeder explicitly, use `npm run seed`.
