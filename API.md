# Kansaco 2025 API Documentation

Complete API reference for frontend integration.

## Base Configuration

- **Base URL**: `http://localhost:3000/api` (development)
- **Content-Type**: `application/json`
- **Date Format**: ISO 8601 strings in GMT-3 timezone
- **Authentication**: Bearer Token (JWT)

---

## Authentication

### Headers for Protected Endpoints

All protected endpoints require the following header:

```
Authorization: Bearer <jwt-token>
```

### Token Format

JWT tokens are returned on successful login and expire after 7 days (configurable via `JWT_EXPIRES_IN`).

---

## User Roles

| Role | Value | Description |
|------|-------|-------------|
| Admin | `ADMIN` | Full system access |
| Cliente Minorista | `CLIENTE_MINORISTA` | Retail customer |
| Cliente Mayorista | `CLIENTE_MAYORISTA` | Wholesale customer |
| Asistente | `ASISTENTE` | Sales assistant |

---

## API Endpoints

### 1. User Endpoints

#### 1.1 Register User

**Endpoint**: `POST /api/user/register`

**Authentication**: Not required

**Request Body**:
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

**Fields**:
- `email` (string, required): Valid email address
- `password` (string, required): Minimum 8 characters
- `nombre` (string, required): User's first name
- `apellido` (string, required): User's last name
- `direccion` (string, optional): User's address
- `telefono` (string, required): User's phone number
- `rol` (enum, optional): User role. Defaults to `CLIENTE_MINORISTA`
  - Values: `ADMIN`, `CLIENTE_MINORISTA`, `CLIENTE_MAYORISTA`, `ASISTENTE`

**Response** (201 Created):
```json
{
  "id": "d641b37b-360f-46e8-996f-fcd5d20b4cf5",
  "email": "user@example.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "direccion": "Av. Principal 123",
  "telefono": "+5491112345678",
  "rol": "CLIENTE_MINORISTA",
  "descuentosAplicados": []
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `409 Conflict`: Email already exists

---

#### 1.2 Login

**Endpoint**: `POST /api/user/login`

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "admin@kansaco.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ2NDFiMzdiLTM2MGYtNDZlOC05OTZmLWZjZDVkMjBiNGNmNSIsImVtYWlsIjoiYWRtaW5Aa2Fuc2Fjby5jb20iLCJyb2wiOiJBRE1JTiIsImlhdCI6MTczMzkwMjM0NSwiZXhwIjoxNzM0NTA3MTQ1fQ...",
  "user": {
    "id": "d641b37b-360f-46e8-996f-fcd5d20b4cf5",
    "email": "admin@kansaco.com",
    "nombre": "Admin",
    "apellido": "Sistema",
    "direccion": "Oficina Central",
    "telefono": "+5491112345678",
    "rol": "ADMIN",
    "descuentosAplicados": []
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid credentials

---

#### 1.3 Get All Users

**Endpoint**: `GET /api/user`

**Authentication**: Required

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
[
  {
    "id": "d641b37b-360f-46e8-996f-fcd5d20b4cf5",
    "email": "admin@kansaco.com",
    "nombre": "Admin",
    "apellido": "Sistema",
    "direccion": "Oficina Central",
    "telefono": "+5491112345678",
    "rol": "ADMIN",
    "descuentosAplicados": []
  },
  {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "email": "cliente@example.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "direccion": "Av. Principal 123",
    "telefono": "+5491112345679",
    "rol": "CLIENTE_MINORISTA",
    "descuentosAplicados": []
  }
]
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token

---

#### 1.4 Get User by ID

**Endpoint**: `GET /api/user/:id`

**Authentication**: Required

**Path Parameters**:
- `id` (string, required): User UUID

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
{
  "id": "d641b37b-360f-46e8-996f-fcd5d20b4cf5",
  "email": "admin@kansaco.com",
  "nombre": "Admin",
  "apellido": "Sistema",
  "direccion": "Oficina Central",
  "telefono": "+5491112345678",
  "rol": "ADMIN",
  "descuentosAplicados": []
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found

---

#### 1.5 Update User

**Endpoint**: `PUT /api/user/:id`

**Authentication**: Required

**Path Parameters**:
- `id` (string, required): User UUID

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Request Body** (all fields optional):
```json
{
  "nombre": "Juan Carlos",
  "apellido": "Pérez",
  "direccion": "Nueva dirección 456",
  "telefono": "+5491112345680",
  "email": "newemail@example.com",
  "password": "newpassword123",
  "rol": "CLIENTE_MAYORISTA"
}
```

**Response** (200 OK):
```json
{
  "id": "d641b37b-360f-46e8-996f-fcd5d20b4cf5",
  "email": "newemail@example.com",
  "nombre": "Juan Carlos",
  "apellido": "Pérez",
  "direccion": "Nueva dirección 456",
  "telefono": "+5491112345680",
  "rol": "CLIENTE_MAYORISTA",
  "descuentosAplicados": []
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found
- `409 Conflict`: Email already in use

---

#### 1.6 Delete User

**Endpoint**: `DELETE /api/user/:id`

**Authentication**: Required

**Path Parameters**:
- `id` (string, required): User UUID

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
{
  "message": "User deleted successfully"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found

---

### 2. Product Endpoints

#### 2.1 Get All Products

**Endpoint**: `GET /api/product`

**Authentication**: Required

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "name": "Product Name",
    "category": ["Category1", "Category2"],
    "price": 1500.50,
    "description": "Product description",
    "imageUrl": "https://example.com/image.jpg",
    "slug": "product-name",
    "sku": "SKU123",
    "presentation": "500ml",
    "aplication": "Industrial use",
    "stock": 100,
    "wholeSaler": "Supplier Name",
    "isVisible": true
  }
]
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token

---

#### 2.2 Get Filtered Products

**Endpoint**: `GET /api/product/filter`

**Authentication**: Required

**Query Parameters** (all optional):
- `name` (string): Filter by product name
- `category` (string[]): Filter by category (can be repeated: `?category=cat1&category=cat2`)
- `sku` (string): Filter by SKU
- `stock` (number): Filter by stock level
- `wholeSaler` (string): Filter by wholesaler
- `isVisible` (boolean): Filter by visibility
- `slug` (string): Filter by slug

**Example Query**:
```
GET /api/product/filter?name=Product&category=Category1&category=Category2&isVisible=true
```

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "name": "Product Name",
    "category": ["Category1", "Category2"],
    "price": 1500.50,
    "description": "Product description",
    "imageUrl": "https://example.com/image.jpg",
    "slug": "product-name",
    "sku": "SKU123",
    "presentation": "500ml",
    "aplication": "Industrial use",
    "stock": 100,
    "wholeSaler": "Supplier Name",
    "isVisible": true
  }
]
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token

---

#### 2.3 Get Product by ID

**Endpoint**: `GET /api/product/:id`

**Authentication**: Required

**Path Parameters**:
- `id` (number, required): Product ID

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "Product Name",
  "category": ["Category1", "Category2"],
  "price": 1500.50,
  "description": "Product description",
  "imageUrl": "https://example.com/image.jpg",
  "slug": "product-name",
  "sku": "SKU123",
  "presentation": "500ml",
  "aplication": "Industrial use",
  "stock": 100,
  "wholeSaler": "Supplier Name",
  "isVisible": true
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Product not found

---

#### 2.4 Create Product

**Endpoint**: `POST /api/product/create`

**Authentication**: Required

**Required Roles**: `ADMIN`, `ASISTENTE`

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Request Body**:
```json
{
  "name": "New Product",
  "category": ["Category1"],
  "price": 2000.00,
  "description": "Product description",
  "imageUrl": "https://example.com/image.jpg",
  "slug": "new-product",
  "sku": "SKU456",
  "presentation": "1L",
  "aplication": "Commercial use",
  "stock": 50,
  "wholeSaler": "Supplier Name",
  "isVisible": true
}
```

**Response** (200 OK):
```json
{
  "id": 2,
  "name": "New Product",
  "category": ["Category1"],
  "price": 2000.00,
  "description": "Product description",
  "imageUrl": "https://example.com/image.jpg",
  "slug": "new-product",
  "sku": "SKU456",
  "presentation": "1L",
  "aplication": "Commercial use",
  "stock": 50,
  "wholeSaler": "Supplier Name",
  "isVisible": true
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions

---

#### 2.5 Update Product

**Endpoint**: `PUT /api/product/:id/edit`

**Authentication**: Required

**Required Roles**: `ADMIN`, `ASISTENTE`

**Path Parameters**:
- `id` (number, required): Product ID

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Request Body** (all fields optional):
```json
{
  "name": "Updated Product Name",
  "price": 1800.00,
  "stock": 75,
  "isVisible": false
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "Updated Product Name",
  "category": ["Category1", "Category2"],
  "price": 1800.00,
  "description": "Product description",
  "imageUrl": "https://example.com/image.jpg",
  "slug": "product-name",
  "sku": "SKU123",
  "presentation": "500ml",
  "aplication": "Industrial use",
  "stock": 75,
  "wholeSaler": "Supplier Name",
  "isVisible": false
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Product not found

---

#### 2.6 Delete Product

**Endpoint**: `DELETE /api/product/:id`

**Authentication**: Required

**Required Roles**: `ADMIN`

**Path Parameters**:
- `id` (number, required): Product ID

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "Product Name",
  "category": ["Category1", "Category2"],
  "price": 1500.50,
  "description": "Product description",
  "imageUrl": "https://example.com/image.jpg",
  "slug": "product-name",
  "sku": "SKU123",
  "presentation": "500ml",
  "aplication": "Industrial use",
  "stock": 100,
  "wholeSaler": "Supplier Name",
  "isVisible": true
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Product not found

---

#### 2.7 Get Products List for Price Update (File Download)

**Endpoint**: `GET /api/product/file/listUpdatePrices`

**Authentication**: Required

**Required Roles**: `ADMIN`

**Query Parameters**:
- `format` (string, required): File format - `csv`, `xlsx`, or `xml`

**Example Query**:
```
GET /api/product/file/listUpdatePrices?format=xlsx
```

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx)
- Content-Type: `text/csv` (csv)
- Content-Type: `application/xml` (xml)
- Content-Disposition: `attachment; filename="productos-al-[date].[extension]"`

Returns a file download with product data (id and price columns).

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions

---

#### 2.8 Update Prices from File

**Endpoint**: `PATCH /api/product/file/updatePrices`

**Authentication**: Required

**Required Roles**: `ADMIN`

**Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Request Body** (Form Data):
- `file` (file, required): CSV, XML, or XLSX file with columns `id` and `price`
- Max file size: 6MB

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "name": "Product Name",
    "category": ["Category1"],
    "price": 1800.00,
    "description": "Product description",
    "imageUrl": "https://example.com/image.jpg",
    "slug": "product-name",
    "sku": "SKU123",
    "presentation": "500ml",
    "aplication": "Industrial use",
    "stock": 100,
    "wholeSaler": "Supplier Name",
    "isVisible": true
  }
]
```

**Error Responses**:
- `400 Bad Request`: No file uploaded or invalid file format
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions

---

### 3. Cart Endpoints

#### 3.1 Get Cart by Cart ID

**Endpoint**: `GET /api/cart/:id`

**Authentication**: Required

**Path Parameters**:
- `id` (number, required): Cart ID

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "createdAt": "2025-12-11T20:00:00.000-03:00",
  "updatedAt": "2025-12-11T20:30:00.000-03:00",
  "userId": "d641b37b-360f-46e8-996f-fcd5d20b4cf5",
  "items": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 2,
      "cartId": 1
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Cart not found

---

#### 3.2 Get Cart by User ID

**Endpoint**: `GET /api/cart/:userId`

**Authentication**: Required

**Path Parameters**:
- `userId` (string, required): User UUID

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "createdAt": "2025-12-11T20:00:00.000-03:00",
  "updatedAt": "2025-12-11T20:30:00.000-03:00",
  "userId": "d641b37b-360f-46e8-996f-fcd5d20b4cf5",
  "items": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 2,
      "cartId": 1
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Cart not found

---

#### 3.3 Create Cart

**Endpoint**: `POST /api/cart/create`

**Authentication**: Required

**Required Roles**: `ADMIN`, `ASISTENTE`

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Request Body**:
```json
{
  "userId": "d641b37b-360f-46e8-996f-fcd5d20b4cf5"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "createdAt": "2025-12-11T20:00:00.000-03:00",
  "updatedAt": "2025-12-11T20:00:00.000-03:00",
  "userId": "d641b37b-360f-46e8-996f-fcd5d20b4cf5",
  "items": []
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions

---

#### 3.4 Add Item to Cart

**Endpoint**: `PUT /api/cart/:cartId/add/product/:productId`

**Authentication**: Required

**Path Parameters**:
- `cartId` (number, required): Cart ID
- `productId` (number, required): Product ID

**Query Parameters**:
- `quantity` (number, optional): Quantity to add. Defaults to 1

**Example Query**:
```
PUT /api/cart/1/add/product/5?quantity=3
```

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "createdAt": "2025-12-11T20:00:00.000-03:00",
  "updatedAt": "2025-12-11T20:35:00.000-03:00",
  "userId": "d641b37b-360f-46e8-996f-fcd5d20b4cf5",
  "items": [
    {
      "id": 1,
      "productId": 5,
      "quantity": 3,
      "cartId": 1
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Cart or product not found

---

#### 3.5 Remove Item from Cart

**Endpoint**: `PATCH /api/cart/:cartId/delete/product/:productId`

**Authentication**: Required

**Path Parameters**:
- `cartId` (number, required): Cart ID
- `productId` (number, required): Product ID

**Query Parameters**:
- `quantity` (number, optional): Quantity to remove. Defaults to 1

**Example Query**:
```
PATCH /api/cart/1/delete/product/5?quantity=2
```

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "createdAt": "2025-12-11T20:00:00.000-03:00",
  "updatedAt": "2025-12-11T20:40:00.000-03:00",
  "userId": "d641b37b-360f-46e8-996f-fcd5d20b4cf5",
  "items": []
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Cart or product not found

---

#### 3.6 Empty Cart

**Endpoint**: `PATCH /api/cart/:id/empty`

**Authentication**: Required

**Path Parameters**:
- `id` (number, required): Cart ID

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "createdAt": "2025-12-11T20:00:00.000-03:00",
  "updatedAt": "2025-12-11T20:45:00.000-03:00",
  "userId": "d641b37b-360f-46e8-996f-fcd5d20b4cf5",
  "items": []
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Cart not found

---

### 4. Admin Settings Endpoints

#### 4.1 Get Minimum Order Amount

**Endpoint**: `GET /api/admin-settings/minimum-order-amount`

**Authentication**: Required

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
5000
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token

---

#### 4.2 Set Minimum Order Amount

**Endpoint**: `PUT /api/admin-settings/minimum-order-amount`

**Authentication**: Required

**Required Roles**: `ADMIN`

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Request Body**:
```json
{
  "minimumOrderAmount": 5000,
  "id": 1
}
```

**Response** (200 OK):
```json
null
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions

---

#### 4.3 Get Seller Email

**Endpoint**: `GET /api/admin-settings/seller-email`

**Authentication**: Required

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
"seller@kansaco.com"
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token

---

#### 4.4 Set Seller Email

**Endpoint**: `PUT /api/admin-settings/seller-email`

**Authentication**: Required

**Required Roles**: `ADMIN`

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Request Body**:
```json
{
  "sellerEmail": "seller@kansaco.com",
  "id": 1
}
```

**Response** (200 OK):
```json
null
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions

---

#### 4.5 Get Info Email

**Endpoint**: `GET /api/admin-settings/info-email`

**Authentication**: Required

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
"info@kansaco.com"
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token

---

#### 4.6 Set Info Email

**Endpoint**: `PUT /api/admin-settings/info-email`

**Authentication**: Required

**Required Roles**: `ADMIN`

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Request Body**:
```json
{
  "infoEmail": "info@kansaco.com",
  "id": 1
}
```

**Response** (200 OK):
```json
null
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions

---

## Data Types

### User Type

```typescript
interface User {
  id: string; // UUID
  email: string;
  nombre: string;
  apellido: string;
  direccion?: string;
  telefono: string;
  rol: 'ADMIN' | 'CLIENTE_MINORISTA' | 'CLIENTE_MAYORISTA' | 'ASISTENTE';
  descuentosAplicados: Discount[];
}
```

### Product Type

```typescript
interface Product {
  id: number;
  name: string;
  category: string[];
  price: number;
  description: string;
  imageUrl: string;
  slug: string;
  sku: string;
  presentation: string;
  aplication: string;
  stock: number;
  wholeSaler: string;
  isVisible: boolean;
}
```

### Cart Type

```typescript
interface Cart {
  id: number;
  createdAt: string; // ISO 8601 in GMT-3
  updatedAt: string; // ISO 8601 in GMT-3
  userId: string; // UUID
  items: CartItem[];
}

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  cartId: number;
}
```

**Note**: When fetching a cart with relations, the `items` array contains `CartItem` objects. The full product information is not included in the response by default, but can be accessed through the productId.

### Discount Type

```typescript
interface Discount {
  id: number;
  porcentaje: number; // Decimal (5,2)
  clientes: User[];
  productos: Product[];
}
```

---

## Error Responses

### Standard Error Format

All errors follow this format:

```json
{
  "statusCode": 400,
  "timestamp": "2025-12-11T20:00:00.000-03:00",
  "path": "/api/user/register",
  "message": "Validation error message or error description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Validation error or invalid input |
| 401 | Unauthorized - Missing or invalid authentication token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource conflict (e.g., email already exists) |
| 500 | Internal Server Error - Server error |

---

## CORS Configuration

The API supports CORS with the following configuration:

- **Origins**: All origins allowed (development)
- **Methods**: GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, Accept, X-Requested-With
- **Credentials**: Enabled

---

## Notes

1. **Date Format**: All dates are returned as ISO 8601 strings in GMT-3 timezone (America/Argentina/Buenos_Aires).

2. **Password Security**: 
   - Passwords are hashed using bcrypt with 12 rounds
   - Passwords are never returned in API responses
   - Minimum password length: 8 characters

3. **JWT Tokens**:
   - Tokens expire after 7 days (configurable via `JWT_EXPIRES_IN`)
   - Token payload includes: `id`, `email`, `rol`

4. **File Uploads**:
   - Maximum file size: 6MB
   - Supported formats: CSV, XLSX, XML

5. **Query Parameters**:
   - Array parameters can be repeated: `?category=cat1&category=cat2`
   - Boolean parameters: `true` or `false` (as strings)

---

## Example Frontend Usage

### TypeScript/JavaScript Example

```typescript
// Login
const loginResponse = await fetch('http://localhost:3000/api/user/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@kansaco.com',
    password: 'password123',
  }),
});

const { token, user } = await loginResponse.json();

// Get Products (Protected)
const productsResponse = await fetch('http://localhost:3000/api/product', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

const products = await productsResponse.json();
```

---

## Swagger Documentation

Interactive API documentation is available at:
- **Development**: `http://localhost:3000/docs`

The Swagger UI allows you to:
- Test endpoints directly
- View request/response schemas
- Authenticate with JWT tokens

