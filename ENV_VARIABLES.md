# Environment Variables Reference

This document explains all environment variables used by the application.

## Server Configuration

### `PORT`
- **Type:** Number
- **Default:** 3000
- **Description:** HTTP server port
- **Example:** `PORT=3000`
- **Production Note:** Vercel automatically assigns port, but this is used locally

## Authentication & Sessions

### `SESSION_SECRET`
- **Type:** String (random hex)
- **Default:** None (REQUIRED)
- **Description:** Secret key for session encryption
- **Example:** `SESSION_SECRET=a47f2e8b9c1d6f3e4a7b2c8d9e1f3a4b`
- **Security:** Must be a strong random value (64+ hex characters)
- **Generate:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### `JWT_SECRET`
- **Type:** String (random hex)
- **Default:** None (REQUIRED)
- **Description:** Secret key for JWT token signing
- **Example:** `JWT_SECRET=e7f2a4c8b1d3e5f7a2c4e6f8b1d3e5f7`
- **Security:** Must be a strong random value (64+ hex characters)
- **Generate:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Database Configuration

### `MONGODB_URI`
- **Type:** String (connection URL)
- **Default:** `mongodb://127.0.0.1:27017`
- **Description:** MongoDB connection string
- **Local Development:** `mongodb://127.0.0.1:27017/?directConnection=true`
- **MongoDB Atlas:** `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`
- **Security Note:** Password must be URL-encoded if it contains special chars

### `MONGODB_DB_NAME`
- **Type:** String
- **Default:** `dynamics_node`
- **Description:** MongoDB database name
- **Example:** `MONGODB_DB_NAME=dynamics_node`

### `MONGODB_SERVER_SELECTION_TIMEOUT_MS`
- **Type:** Number (milliseconds)
- **Default:** 5000
- **Description:** MongoDB connection timeout
- **Local:** 5000 (5 seconds)
- **Production** (Vercel): 10000 (10 seconds) - more reliable for cloud
- **Example:** `MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000`

## Admin User (Auto-Created on First Boot)

### `ADMIN_EMAIL`
- **Type:** Email string
- **Default:** `admin@example.com`
- **Description:** Email for auto-created admin account
- **Example:** `ADMIN_EMAIL=admin@example.com`
- **Note:** Created if doesn't exist on first server start

### `ADMIN_PASSWORD`
- **Type:** String
- **Default:** `admin123`
- **Description:** Password for auto-created admin account
- **Example:** `ADMIN_PASSWORD=MySecurePassword123`
- **Security:** Should be changed after first login in production

## Optional / Legacy Variables

### `TELEGRAM_BUY_LINK`
- **Type:** String (URL)
- **Default:** `https://t.me/kuhyoudom`
- **Description:** Telegram link used by the Buy Now buttons on storefront pages
- **Example:** `TELEGRAM_BUY_LINK=https://t.me/kuhyoudom`
- **Note:** Use a Telegram `https://t.me/...` link so mobile devices can open the app when installed and fall back to the browser otherwise.

## Bakong KHQR / Payment Integration

### `BAKONG_DEV_BASE_API_URL`
- **Type:** String (URL)
- **Default:** `https://sit-api-bakong.nbc.gov.kh/v1`
- **Description:** Bakong sandbox API base URL used outside production

### `BAKONG_PROD_BASE_API_URL`
- **Type:** String (URL)
- **Default:** `https://api-bakong.nbc.gov.kh/v1`
- **Description:** Bakong production API base URL used when `NODE_ENV=production`

### `BAKONG_BASE_API_URL`
- **Type:** String (URL)
- **Default:** None
- **Description:** Overrides the automatic dev/prod Bakong base URL selection

### `BAKONG_TOKEN`
- **Type:** String
- **Default:** None (REQUIRED)
- **Description:** Bakong API bearer token used for payment generation and status checks

### `BAKONG_MERCHANT_ID`
- **Type:** String
- **Default:** None (REQUIRED)
- **Description:** Merchant Bakong account ID used to generate KHQR payloads

### `BAKONG_MERCHANT_NAME`
- **Type:** String
- **Default:** None (REQUIRED)
- **Description:** Display name embedded in the KHQR payload

### `BAKONG_ACQUIRING_BANK`
- **Type:** String
- **Default:** `Dev Bank`
- **Description:** Acquiring bank identifier required by the Bakong SDK merchant payload

### `BAKONG_MERCHANT_CITY`
- **Type:** String
- **Default:** `Phnom Penh`
- **Description:** Merchant city embedded in the KHQR payload

### `BAKONG_CHECK_TRANSACTION_PATH`
- **Type:** String
- **Default:** `/check_transaction_by_md5`
- **Description:** Bakong API path used to check payment status by MD5 hash

### `BAKONG_POLL_TIMEOUT_MS`
- **Type:** Number (milliseconds)
- **Default:** `60000`
- **Description:** Maximum wait time for payment confirmation before returning timeout

### `BAKONG_POLL_INTERVAL_MS`
- **Type:** Number (milliseconds)
- **Default:** `2000`
- **Description:** Delay between Bakong transaction status checks

## File Upload Storage

### `FILE_STORAGE`
- **Type:** String (`local`|`cloudinary`)
- **Default:** `local`
- **Description:** Selects where uploaded images/videos are stored
- **Example:** `FILE_STORAGE=local`

### `CLOUDINARY_CLOUD_NAME`
- **Type:** String
- **Default:** None
- **Description:** Cloudinary cloud name (required when `FILE_STORAGE=cloudinary`)

### `CLOUDINARY_API_KEY`
- **Type:** String
- **Default:** None
- **Description:** Cloudinary API key (required when `FILE_STORAGE=cloudinary`)

### `CLOUDINARY_API_SECRET`
- **Type:** String
- **Default:** None
- **Description:** Cloudinary API secret (required when `FILE_STORAGE=cloudinary`)

### `CLOUDINARY_FOLDER`
- **Type:** String
- **Default:** `dynamics-node/uploads`
- **Description:** Target Cloudinary folder for uploaded product assets

### `NODE_ENV`
- **Type:** String (development|production)
- **Default:** Auto-detected
- **Description:** Environment mode
- **Note:** Set by Vercel automatically in production

### `VERCEL`
- **Type:** Boolean (presence indicates Vercel)
- **Default:** Not set
- **Description:** Set by Vercel, indicates serverless environment
- **Note:** Used to skip local server startup code

## Database Configuration (Legacy - SQL Support)

### `DB_DIALECT`
- **Type:** String (mysql|sqlite)
- **Default:** `sqlite`
- **Description:** Database type for Sequelize ORM
- **Note:** Currently using MongoDB, these are legacy options

### `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`
- **Type:** String
- **Description:** MySQL connection details (if using SQL backend)
- **Note:** Legacy - not used in current MongoDB setup

---

## Environment Variables by Context

### Local Development (.env)
```env
PORT=3000
SESSION_SECRET=<random-hex-string>
JWT_SECRET=<random-hex-string>
MONGODB_URI=mongodb://127.0.0.1:27017/?directConnection=true
MONGODB_DB_NAME=dynamics_node
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
TELEGRAM_BUY_LINK=https://t.me/kuhyoudom
FILE_STORAGE=local
BAKONG_DEV_BASE_API_URL=https://sit-api-bakong.nbc.gov.kh/v1
BAKONG_TOKEN=<bakong-token>
BAKONG_MERCHANT_ID=<bakong-account-id>
BAKONG_MERCHANT_NAME=SOKLIN CHEN
BAKONG_ACQUIRING_BANK=Dev Bank
BAKONG_MERCHANT_CITY=Phnom Penh
```

### Cloudinary Upload Mode (.env)
```env
FILE_STORAGE=cloudinary
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
CLOUDINARY_FOLDER=dynamics-node/uploads
```

### Vercel Production
```env
PORT=3000
SESSION_SECRET=<random-hex-string>
JWT_SECRET=<random-hex-string>
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dynamics_node?retryWrites=true&w=majority
MONGODB_DB_NAME=dynamics_node
MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<secure-password>
TELEGRAM_BUY_LINK=https://t.me/kuhyoudom
NODE_ENV=production
BAKONG_PROD_BASE_API_URL=https://api-bakong.nbc.gov.kh/v1
BAKONG_TOKEN=<bakong-token>
BAKONG_MERCHANT_ID=<bakong-account-id>
BAKONG_MERCHANT_NAME=SOKLIN CHEN
BAKONG_ACQUIRING_BANK=Dev Bank
BAKONG_MERCHANT_CITY=Phnom Penh
```

### Docker
```env
PORT=3000
SESSION_SECRET=<random-hex-string>
JWT_SECRET=<random-hex-string>
MONGODB_URI=mongodb://mongo:27017
MONGODB_DB_NAME=dynamics_node
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
TELEGRAM_BUY_LINK=https://t.me/kuhyoudom
```

## How to Generate Secure Secrets

### Using Node.js (All Platforms)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Using OpenSSL (Mac/Linux)
```bash
openssl rand -hex 32
```

### Using PowerShell (Windows)
```powershell
-join (1..64 | ForEach-Object {'{0:x}' -f (Get-Random -Maximum 16)})
```

## Variable Validation

### Required Variables
- `SESSION_SECRET` - Must be set and non-empty
- `JWT_SECRET` - Must be set and non-empty
- `MONGODB_URI` - Must be valid MongoDB connection string

### Optional Variables (Have Defaults)
- `PORT` - Defaults to 3000
- `MONGODB_DB_NAME` - Defaults to dynamics_node
- `MONGODB_SERVER_SELECTION_TIMEOUT_MS` - Defaults to 5000
- `ADMIN_EMAIL` - Defaults to admin@example.com
- `ADMIN_PASSWORD` - Defaults to admin123
- `TELEGRAM_BUY_LINK` - Defaults to https://t.me/kuhyoudom

## Security Best Practices

1. **Never commit .env to Git** - Use .gitignore
2. **Use strong secrets** - Minimum 32 characters, random
3. **Rotate secrets periodically** - Change SESSION_SECRET and JWT_SECRET
4. **Use environment variables** - Never hardcode secrets
5. **Restrict database access** - MongoDB Atlas whitelist IPs in production
6. **URL-encode passwords** - If password contains special chars: `pass@word` → `pass%40word`
7. **Use HTTPS** - Always in production (Vercel does this automatically)

## Troubleshooting

### Error: "MongoDB connection refused"
- Check `MONGODB_URI` is correct
- Verify MongoDB is running (local) or accessible (cloud)
- Check network whitelist in MongoDB Atlas

### Error: "Invalid session"
- Check `SESSION_SECRET` is set
- Should be different from `JWT_SECRET`
- Try restarting server

### Error: "JWT malformed"
- Check `JWT_SECRET` is set
- Token expired? (JWT expires after 2 hours)
- JWT must match between server and client

### Error: "Admin account not created"
- Check `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set
- Database might already have admin user
- Try manual login or create via `/register`

---

**Last Updated:** April 2, 2026  
**Repository:** https://github.com/khuyoudom/test-school
