# Strategic Growth Intelligence Platform

An AI-powered SaaS platform that automates market research, competitor intelligence, and customer insights to generate evidence-backed strategic recommendations for startups and small businesses.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Organization Management**: Company onboarding with comprehensive business context
- **Market Research Pipeline**: Automated research across competitors, markets, and customer discussions
- **Strategic Analysis**: AI-generated recommendations backed by real sources
- **Human Verification**: Approval workflow for AI recommendations
- **Professional Reports**: PDF generation with source citations

## Tech Stack

- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL, Sequelize ORM
- **Authentication**: JWT, Passport
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd market-analysis
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=market_analysis

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=5h

PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

5. Create the database:
```bash
createdb market_analysis
```

## Running the Application

### Development mode:
```bash
npm run start:dev
```

### Production mode:
```bash
npm run build
npm run start:prod
```

The application will be available at:
- API: `http://localhost:3000`
- Swagger Documentation: `http://localhost:3000/api/docs`

## API Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "profilePicture": "https://gravatar.com/...",
    "organizationId": null,
    "organizationName": null,
    "organizationStatus": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "5h",
  "expiresAt": 1234567890,
  "message": "Login successful"
}
```

#### Create Organization
```http
POST /auth/organization
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Tech Startup Inc",
  "description": "Innovative SaaS company",
  "industry": "Software Development",
  "website": "https://techstartup.com",
  "product_or_service": "We provide AI-powered business intelligence tools",
  "target_customers": "Small to medium-sized businesses in the tech sector",
  "business_goals": "Achieve 1000 paying customers by Q4 2024",
  "current_challenges": "Limited market visibility and customer acquisition",
  "known_competitors": ["Competitor A", "Competitor B"],
  "company_size": "10-50 employees",
  "location": "San Francisco, CA"
}
```

#### Get Profile
```http
GET /auth/profile
Authorization: Bearer <token>
```

#### Verify Token
```http
GET /auth/me
Authorization: Bearer <token>
```

## Project Structure

```
src/
├── auth/
│   ├── decorators/       # Custom decorators (Public, CurrentUser, Roles)
│   ├── dto/             # Data Transfer Objects
│   ├── guards/          # Authentication & authorization guards
│   ├── strategies/      # Passport strategies (JWT)
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── common/
│   └── enums.ts         # Application enums
├── config/
│   └── database.config.ts
├── models/
│   ├── user.model.ts
│   ├── organization.model.ts
│   └── organizationMember.model.ts
├── app.module.ts
└── main.ts
```

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `name` (String)
- `email` (String, Unique)
- `password` (String, Hashed)
- `profile_picture` (String, Gravatar URL)
- `role` (Enum: SUPER_ADMIN, ADMIN, USER)
- `is_verified` (Boolean)
- `status` (Enum: ACTIVE, INACTIVE, SUSPENDED)

### Organizations Table
- `id` (UUID, Primary Key)
- `name` (String)
- `description` (Text)
- `industry` (String)
- `website` (String)
- `product_or_service` (Text)
- `target_customers` (Text)
- `business_goals` (Text)
- `current_challenges` (Text)
- `known_competitors` (Array)
- `company_size` (String)
- `location` (String)
- `status` (Enum: PENDING_APPROVAL, ACTIVE, REJECTED, SUSPENDED)

### Organization Members Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `organization_id` (UUID, Foreign Key)
- `role` (Enum: OWNER, ADMIN, MANAGER, MEMBER, VIEWER)
- `status` (Enum: ACTIVE, SUSPENDED, REMOVED)

## Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: class-validator for all DTOs
- **CORS Protection**: Configured for frontend origin
- **Role-Based Access Control**: Guard-based authorization
- **Global Guards**: JWT protection on all routes except @Public()

## Development

### Code Quality
```bash
npm run lint        # Run ESLint
npm run format      # Run Prettier
```

### Testing
```bash
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests
npm run test:cov    # Test coverage
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | `market_analysis` |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration time | `5h` |
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

## Next Steps

The MVP includes:
- ✅ User authentication with JWT
- ✅ Organization registration and management
- ⏳ Company knowledge vector storage (Qdrant)
- ⏳ Competitor research module
- ⏳ Market research module
- ⏳ Customer voice research module
- ⏳ Strategic analysis engine
- ⏳ Human verification workflow
- ⏳ PDF report generation

## Contributing

This project follows production-grade development practices:
- Strong TypeScript typing
- Modular architecture
- Single responsibility principle
- Comprehensive validation
- Security best practices

## License

Proprietary - All rights reserved
