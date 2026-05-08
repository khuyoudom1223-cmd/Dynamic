# ☁️ Cloudflare Pages Deployment Guide

This project is now optimized for **Cloudflare Pages**. Since Cloudflare uses a serverless Worker environment, specific configurations have been added to handle Express, EJS templates, and MongoDB connections.

---

## 🛠️ Step 1: Cloudflare Dashboard Configuration

1. **Create a New Pages Project**:
   - Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
   - Navigate to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
   - Select your repository (`test-school`).

2. **Build Settings**:
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `public`
   - **Root directory**: `/`

3. **Environment Variables**:
   Click **"Add variables"** and add all variables from your `.env` file. At a minimum, you MUST include:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `MONGODB_DB_NAME`: `dynamics_node`
   - `SESSION_SECRET`: A random string for session security.
   - `JWT_SECRET`: A random string for token security.
   - `NODE_VERSION`: `20` (Required for Node.js compatibility).
   - `CLOUDINARY_CLOUD_NAME`: (Optional, but required for uploads to work).
   - `CLOUDINARY_API_KEY`: (Optional).
   - `CLOUDINARY_API_SECRET`: (Optional).
   - `FILE_STORAGE`: `cloudinary` (Highly recommended for Cloudflare).

---

## 🚀 Step 2: Deployment Process

1. **Build & Deploy**:
   - Every time you push to the `main` branch, Cloudflare will:
     - Run `npm run build` (which bundles your EJS templates into `src/config/templates.js`).
     - Deploy the `public` folder for static assets.
     - Deploy the `functions` folder which contains the Express bridge.

2. **Node.js Compatibility**:
   - We have added a `wrangler.toml` with `compatibility_flags = ["nodejs_compat"]`. This allows Express and MongoDB to run in the Worker environment.

---

## 🔍 Step 3: Verifying the Deployment

After deployment completes, check these URLs:

1. `https://your-project.pages.dev/` - Homepage (Should load instantly).
2. `https://your-project.pages.dev/health/mongodb` - Database Health Check.
3. `https://your-project.pages.dev/api/products` - API Access.

---

## ⚠️ Important Considerations for Cloudflare

- **Read-Only Filesystem**: You cannot save files to the local `uploads` folder on Cloudflare. You **must** set up Cloudinary for file uploads to work.
- **Cold Starts**: The first request after some inactivity might be slightly slower as the Worker starts up and connects to MongoDB.
- **Bundle Size**: We have added `express-to-worker` to bridge Express. If your bundle exceeds 1MB (Free tier) or 10MB (Paid), you may need to optimize your dependencies.
- **EJS Templates**: Templates are bundled into the code during the build step. If you add new `.ejs` files, make sure the build command runs successfully.

---

## 🛠️ Troubleshooting

### "Build Command Failed"
- Check that `scripts/bundle-templates.js` exists and is working.
- Ensure `NODE_VERSION` is set to `20` in the environment variables.

### "Internal Server Error"
- Check the **Cloudflare Pages Logs** in the dashboard.
- Common cause: Missing `MONGODB_URI` or the MongoDB Atlas IP whitelist is not set to "Allow Access from Anywhere".

### "Template not found"
- This means the `.ejs` file was missing during the build step. Ensure all templates are in the `views` directory before pushing.
