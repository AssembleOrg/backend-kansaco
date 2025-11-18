# Authentication Endpoints Documentation

Base URL: `/api/user`

## Table of Contents
- [Public Endpoints](#public-endpoints)
  - [Register](#register)
  - [Login](#login)
- [Protected Endpoints](#protected-endpoints)
  - [Get All Users](#get-all-users)
  - [Get User by ID](#get-user-by-id)
  - [Update User](#update-user)
  - [Delete User](#delete-user)
- [Authentication](#authentication)
- [User Roles](#user-roles)
- [Error Responses](#error-responses)

---

## Public Endpoints

### Register

Create a new user account.

**Endpoint:** `POST /api/user/register`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "nombre": "Juan",
  "apellido": "Pérez",
  "direccion": "Av. Principal 123",
  "telefono": "+5491112345678",
  "rol": "CLIENTE_MINORISTA"
}
```

**Fields:**
- `email` (string, required): Valid email address
- `password` (string, required): Minimum 8 characters
- `nombre` (string, required): User's first name
- `apellido` (string, required): User's last name
- `direccion` (string, optional): User's address
- `telefono` (string, required): User's phone number
- `rol` (enum, optional): User role. Defaults to `CLIENTE_MINORISTA`
  - Values: `ADMIN`, `CLIENTE_MINORISTA`, `CLIENTE_MAYORISTA`, `ASISTENTE`

**Success Response (201):**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "direccion": "Av. Principal 123",
  "telefono": "+5491112345678",
  "rol": "CLIENTE_MINORISTA",
  "descuentosAplicados": []
}
```

**Error Responses:**
- `400 Bad Request`: Validation error (invalid email, password too short, etc.)
- `409 Conflict`: Email already exists

---

### Login

Authenticate user and receive JWT token.

**Endpoint:** `POST /api/user/login`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Fields:**
- `email` (string, required): User's email address
- `password` (string, required): User's password (minimum 8 characters)

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "direccion": "Av. Principal 123",
    "telefono": "+5491112345678",
    "rol": "CLIENTE_MINORISTA",
    "descuentosAplicados": []
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid credentials

---

## Protected Endpoints

All protected endpoints require authentication via Bearer token in the Authorization header.

**Authorization Header:**
```
Authorization: Bearer <jwt-token>
```

---

### Get All Users

Retrieve a list of all users.

**Endpoint:** `GET /api/user`

**Authentication:** Required

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
[
  {
    "id": "uuid-here",
    "email": "user@example.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "direccion": "Av. Principal 123",
    "telefono": "+5491112345678",
    "rol": "CLIENTE_MINORISTA",
    "descuentosAplicados": []
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

---

### Get User by ID

Retrieve a specific user by their ID.

**Endpoint:** `GET /api/user/:id`

**Authentication:** Required

**Path Parameters:**
- `id` (uuid, required): User's UUID

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "direccion": "Av. Principal 123",
  "telefono": "+5491112345678",
  "rol": "CLIENTE_MINORISTA",
  "descuentosAplicados": []
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found

---

### Update User

Update user information.

**Endpoint:** `PUT /api/user/:id`

**Authentication:** Required

**Path Parameters:**
- `id` (uuid, required): User's UUID

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "nombre": "Juan Carlos",
  "apellido": "Pérez",
  "direccion": "Nueva dirección 456",
  "telefono": "+5491112345679",
  "password": "newpassword123",
  "rol": "CLIENTE_MAYORISTA"
}
```

**Fields:** (All optional, only include fields to update)
- `email` (string, optional): New email address
- `password` (string, optional): New password (minimum 8 characters)
- `nombre` (string, optional): New first name
- `apellido` (string, optional): New last name
- `direccion` (string, optional): New address
- `telefono` (string, optional): New phone number
- `rol` (enum, optional): New role

**Success Response (200):**
```json
{
  "id": "uuid-here",
  "email": "newemail@example.com",
  "nombre": "Juan Carlos",
  "apellido": "Pérez",
  "direccion": "Nueva dirección 456",
  "telefono": "+5491112345679",
  "rol": "CLIENTE_MAYORISTA",
  "descuentosAplicados": []
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found
- `409 Conflict`: Email already in use by another user

---

### Delete User

Delete a user account.

**Endpoint:** `DELETE /api/user/:id`

**Authentication:** Required

**Path Parameters:**
- `id` (uuid, required): User's UUID

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found

---

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. After successful login, you'll receive a token that must be included in subsequent requests.

### Token Format
```
Bearer <jwt-token>
```

### Token Expiration
Tokens expire after 7 days (configurable via `JWT_EXPIRES_IN` environment variable).

### Password Security
- Passwords are hashed using bcrypt with 12 rounds
- Passwords are never returned in API responses
- Minimum password length: 8 characters

---

## User Roles

The system supports the following user roles:

| Role | Value | Description |
|------|-------|-------------|
| Admin | `ADMIN` | Full system access |
| Cliente Minorista | `CLIENTE_MINORISTA` | Retail customer |
| Cliente Mayorista | `CLIENTE_MAYORISTA` | Wholesale customer |
| Asistente | `ASISTENTE` | Sales assistant |

---

## Error Responses

### Standard Error Format
```json
{
  "statusCode": 400,
  "timestamp": "2025-04-30T23:30:00.000Z",
  "path": "/api/user/register",
  "message": "Validation error message or error description"
}
```

### Common Status Codes
- `400 Bad Request`: Validation errors, invalid input
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., email already exists)
- `500 Internal Server Error`: Server error

---

## Example Usage

### cURL Examples

#### Register
```bash
curl -X POST http://localhost:3001/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "nombre": "Juan",
    "apellido": "Pérez",
    "telefono": "+5491112345678"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3001/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Get All Users (Protected)
```bash
curl -X GET http://localhost:3001/api/user \
  -H "Authorization: Bearer <your-jwt-token>"
```

#### Update User (Protected)
```bash
curl -X PUT http://localhost:3001/api/user/<user-id> \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Carlos",
    "direccion": "Nueva dirección 456"
  }'
```

#### Delete User (Protected)
```bash
curl -X DELETE http://localhost:3001/api/user/<user-id> \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

## Notes

- All dates are returned in ISO 8601 format with GMT-3 timezone
- User passwords are automatically hashed using bcrypt (12 rounds)
- Each user automatically gets a cart created upon registration
- Email addresses must be unique across the system
- The `descuentosAplicados` field contains an array of discounts applied to the user

