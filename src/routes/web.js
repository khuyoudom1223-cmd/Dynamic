const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { body, validationResult } = require("express-validator");
const upload = require("../middleware/upload");
const { ensureAuth, ensureAdmin } = require("../middleware/auth");
const { getDb, toObjectId } = require("../config/mongodb");

function getValidationErrors(req) {
  const errors = validationResult(req);
  return errors.isEmpty() ? [] : errors.array().map((item) => item.msg);
}
// Extracts validation error messages from the request object and returns them as an array of strings
// ដកយកសារលើកដង្ហាប់ពីការផ្ទៀងផ្ទាត់សំណើ ហើយត្រឡប់វាជាបញ្ជីខ្សែអក្សរ
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Escapes special regex characters in a string to safely use it in regex patterns
// លុបបង្ហាញតួអក្សរពិសេសក្នុងខ្សែអក្សរដើម្បីប្រើប្រាស់វាក្នុងលំនាំ regex ដោយសុវត្ថិភាព

function formatPrice(value) {
  return Number(value || 0).toFixed(2);
}
// Formats a price value to exactly 2 decimal places as a string
// រៀបចំតម្លៃឱ្យមាន 2 ខ្ទង់ទសភាគពិតប្រាកដ

function buildTelegramMessageLink(baseLink, message) {
  const safeBaseLink = String(baseLink || "https://t.me/kuhyoudom").trim();
  const separator = safeBaseLink.includes("?") ? "&" : "?";
  return `${safeBaseLink}${separator}text=${encodeURIComponent(message)}`;
}
// Constructs a Telegram link with a pre-filled message, using the provided base link or a default
// សាងសង់តំណ Telegram ដែលមានសារជាមុន ដោយប្រើលីងមូលដ្ឋាន ឬលីងលម្អិត

function isLocalUploadPath(value) {
  return typeof value === "string" && value.startsWith("/uploads/");
}
// Checks if a value is a local upload path (starts with /uploads/)
// ពិនិត្យថាតម្លៃជាផ្លូវឯកសារក្នុងស្រុក (ចាប់ផ្តើមដោយ /uploads/)

function isVideoFileName(value) {
  return /\.(mp4|webm|mov)$/i.test(String(value || ""));
}
// Checks if a filename has a video extension (mp4, webm, or mov)
// ពិនិត្យថាឈ្មោះឯកសារម្ជុលជាឯកសារវីដេអូ (mp4, webm ឬ mov)

async function hasPaidCategoryAccess(db, userId, categoryId) {
  if (!userId || !categoryId) {
    return false;
  }

  const userObjectId = toObjectId(userId);
  const categoryObjectId = toObjectId(categoryId);
  if (!userObjectId || !categoryObjectId) {
    return false;
  }

  const paidOrder = await db.collection("orders").findOne({
    user_id: userObjectId,
    category_id: categoryObjectId,
    status: "paid"
  });

  return Boolean(paidOrder);
}
// Checks if a user has a paid order for a specific category, returning true if they do
// ពិនិត្យថាអ្នកប្រើប្រាស់មាននិក្ខេបបង់ប្រាក់សម្រាប់ប្រភេទជាក់លាក់ ត្រឡប់ true ប្រសិនបើពួកគេមាន

async function hasPaidProductAccess(db, userId, productId) {
  if (!userId || !productId) return false;
  const userObjectId = toObjectId(userId);
  const productObjectId = toObjectId(productId);
  if (!userObjectId || !productObjectId) return false;

  const paidOrder = await db.collection("orders").findOne({
    user_id: userObjectId,
    product_id: productObjectId,
    status: "paid"
  });

  return Boolean(paidOrder);
}
// Checks if a user has a paid order for a specific product, returning true if they do
// ពិនិត្យថាអ្នកប្រើប្រាស់មាននិក្ខេបបង់ប្រាក់សម្រាប់ផលិតផលជាក់លាក់ ត្រឡប់ true ប្រសិនបើពួកគេមាន

async function canAccessProductVideo(db, product, user) {
  if (!product || !product.video) {
    return false;
  }

  if (user && user.role === "admin") {
    return true;
  }

  const category = await db.collection("categories").findOne({ _id: toObjectId(product.category_id) });
  const isFreeCategory = !category || !category.price || Number(category.price) === 0;
  const isResource = product.type === "resource";

  if (isFreeCategory || isResource) {
    return true;
  }

  const hasCategoryAccess = await hasPaidCategoryAccess(db, user?.id, product.category_id);
  if (hasCategoryAccess) return true;

  return await hasPaidProductAccess(db, user?.id, product._id);
}
// Determines if a user can access a product's video based on admin status, category price, product type, and purchase history
// កំណត់ថាតើអ្នកប្រើប្រាស់អាចចូលទៅលើវីដេអូផលិតផលដោយផ្អែកលើតួនាទីរដ្ឋបាល តម្លៃប្រភេទ ប្រភេទផលិតផល និងប្រវត្តិការទិញ

async function getPaidCategoryIdSet(db, userId) {
  if (!userId) {
    return new Set();
  }

  const userObjectId = toObjectId(userId);
  if (!userObjectId) {
    return new Set();
  }

  const orders = await db.collection("orders").find(
    { user_id: userObjectId, status: "paid" },
    { projection: { category_id: 1 } }
  ).toArray();

  return new Set(
    orders
      .map((order) => order.category_id && order.category_id.toString())
      .filter(Boolean)
  );
}
// Returns a Set of all category IDs that a user has purchased (paid orders only)
// ត្រឡប់សំណុំនៃលេខសម្គាល់ប្រភេទទាំងអស់ដែលអ្នកប្រើប្រាស់បានទិញ (មានតែលម្អិតបង់ប្រាក់ប៉ុណ្ណោះ)

function buildPublicProductStatusClause() {
  return {
    $or: [
      { status: "Active" },
      { status: "active" },
      { status: { $exists: false } },
      { status: null }
    ]
  };
}
// Returns a MongoDB query clause to filter products that are publicly visible (active or no status)
// ត្រឡប់លក្ខខណ្ឌសំណួរ MongoDB ដើម្បីត្រង់ផលិតផលដែលមាននូវលក្ខណៈដឹងខ្លួន (សកម្ម ឬគ្មានស្ថានភាព)

function isPublicProductStatus(value) {
  return value == null || String(value).toLowerCase() === "active";
}
// Checks if a product status indicates it is publicly visible (null, undefined, or 'active')
// ពិនិត្យថាស្ថានភាពផលិតផលបង្ហាញថាវាមាននូវលក្ខណៈដឹងខ្លួន (គ្មាន ឬ 'សកម្ម')

async function resolveProductForMedia(db, filename) {
  const uploadPath = `/uploads/${filename}`;
  return db.collection("products").findOne({
    $or: [
      { image: uploadPath },
      { video: uploadPath },
      { image: { $regex: `${filename}$`, $options: "i" } },
      { video: { $regex: `${filename}$`, $options: "i" } }
    ]
  });
}
// Finds and returns a product that contains the specified media filename in its image or video fields
// ស្វែងរក ហើយត្រឡប់ផលិតផលដែលមាន filename មិនទាន់បង្ហាញក្នុងវាលរូបភាព ឬវីដេអូរបស់វា

async function proxyRemoteMedia(req, res, remoteUrl) {
  const response = await fetch(remoteUrl, {
    headers: {
      range: req.headers.range || ""
    }
  });

  if (!response.ok || !response.body) {
    return res.status(502).render("error", {
      title: "Unavailable",
      message: "The requested video could not be loaded."
    });
  }

  const contentType = response.headers.get("content-type");
  const contentLength = response.headers.get("content-length");
  const acceptRanges = response.headers.get("accept-ranges");
  const contentRange = response.headers.get("content-range");

  if (contentType) {
    res.setHeader("Content-Type", contentType);
  }
  if (contentLength) {
    res.setHeader("Content-Length", contentLength);
  }
  if (acceptRanges) {
    res.setHeader("Accept-Ranges", acceptRanges);
  }
  if (contentRange) {
    res.setHeader("Content-Range", contentRange);
  }
  res.setHeader("Cache-Control", "private, no-store");

  res.status(response.status);
  Readable.fromWeb(response.body).pipe(res);
}
// Proxies remote media from a URL to the client, forwarding response headers and supporting range requests
// ធ្វើឱ្យលឺក media ពីចម្ងាយទៅក្រុមបាល់ ឆ្លងផ្ទៀងផ្ទាត់ headers ប្រតិកម្ម ហើយគាំទ្រសំណើលេខ

function normalizeId(doc) {
  if (!doc) return null;
  return {
    ...doc,
    id: doc._id.toString()
  };
}
// Converts a MongoDB document's _id field to an id field as a string for easier client-side handling
// បំលែង MongoDB ឯកសារ _id ទៅ id វាល ដែលបង្ហាញជាខ្សែអក្សរ

function toCategoryMap(categories) {
  const map = new Map();
  categories.forEach((item) => {
    map.set(item._id.toString(), item);
  });
  return map;
}
// Converts an array of categories into a Map keyed by their MongoDB _id (as strings) for fast lookups
// បំលែង array នៃប្រភេទទៅក្នុង Map ដែលមានលក្ខណៈដោយ MongoDB _id សម្រាប់ការស្វែងរកលឿន

const DEFAULT_CATEGORY_NAMES = [
  "Learning hub",
  "Listening",
  "Reading",
  "Writing",
  "Speaking",
  "Grammar",
  "Vocabulary",
  "Business English",
  "General English"
];

const CATEGORY_SLUG_ROUTES = [
  { path: "/hub", name: "Learning hub" },
  { path: "/learning-hub", name: "Learning hub" },
  { path: "/listening", name: "Listening" },
  { path: "/reading", name: "Reading" },
  { path: "/writing", name: "Writing" },
  { path: "/speaking", name: "Speaking" },
  { path: "/grammar", name: "Grammar" },
  { path: "/vocabulary", name: "Vocabulary" },
  { path: "/business", name: "Business English" },
  { path: "/business-english", name: "Business English" },
  { path: "/general", name: "General English" },
  { path: "/general-english", name: "General English" }
];

function normalizeCategoryName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
// Normalizes a category name by trimming whitespace and collapsing multiple spaces into single spaces
// ធម្មតាលក្ខណៈនាមប្រភេទដោយលុបចោលលក្ខណៈប្រវែង ហើយលុបចោលលក្ខណៈឯកទេសច្រើនទៅលក្ខណៈឯកទេសលម្អ

function normalizeCategoryKey(value) {
  return normalizeCategoryName(value).toLowerCase();
}
// Normalizes a category name to a lowercase key for case-insensitive comparisons
// ធម្មតាលក្ខណៈលេខប្រភេទទៅលើលក្ខណៈគន្លឹះដែលមាន lowercase សម្រាប់ការប្រៀបធៀkommune

async function ensureDefaultCategories(db) {
  const existingCategories = await db.collection("categories").find({}, { projection: { name: 1 } }).toArray();
  const existingCategoryKeys = new Set(existingCategories.map((item) => normalizeCategoryKey(item.name)));
  const categoriesToInsert = DEFAULT_CATEGORY_NAMES
    .map((name) => normalizeCategoryName(name))
    .filter((name) => name && !existingCategoryKeys.has(normalizeCategoryKey(name)))
    .map((name) => ({ name, created_at: new Date() }));

  if (categoriesToInsert.length > 0) {
    await db.collection("categories").insertMany(categoriesToInsert);
  }
}
// Ensures all default categories exist in the database by inserting any that are missing
// ធានាថាប្រភេទលម្អិតទាំងអស់មាននៅក្នុង database ដោយការដាក់បញ្ចូលដែលបាត់

async function createCategoryIfValid(db, rawName, rawPrice = 0, type = "course", imageUrl = null) {
  const name = normalizeCategoryName(rawName);
  if (!name) {
    return { error: "Category name is required." };
  }

  let price = Math.max(Number(rawPrice || 0), 0);
  const cleanType = type || "course";

  // Optional: Enforce price for paid categories if needed, 
  // but allow 0 during initial creation from product modal to avoid blocking.
  // const isPaidType = cleanType === "course" || cleanType === "ielts" || cleanType === "level_test" || cleanType === "book";
  // if (isPaidType && price <= 0) {
  //   return { error: "Paid categories (Courses, Books, IELTS, Level Tests) must have a price greater than 0." };
  // }

  // Enforce zero price for resources
  if (cleanType === "resource") {
    price = 0;
  }

  const categories = await db.collection("categories").find({}).toArray();
  const existing = categories.find((item) => normalizeCategoryKey(item.name) === normalizeCategoryKey(name));
  if (existing) {
    return { category: existing, alreadyExists: true };
  }

  const result = await db.collection("categories").insertOne({
    name,
    price,
    type: cleanType,
    image: imageUrl,
    created_at: new Date()
  });
  const category = await db.collection("categories").findOne({ _id: result.insertedId });
  return { category, alreadyExists: false };
}
// Creates a new category after validating the name and enforcing price rules based on category type
// បង្កើតប្រភេទថ្មីបន្ទាប់ពីការផ្ទៀងផ្ទាត់ លក្ខណៈលេខ ហើយការ enforce rules តម្លៃលើផ្អែកលើប្រភេទ

function resolveUploadedFileUrl(file) {
  if (!file) return null;
  if (file.path && /^https?:\/\//i.test(file.path)) {
    return file.path;
  }
  if (file.filename) {
    return `/uploads/${file.filename}`;
  }
  return null;
}
// Resolves the URL of an uploaded file, returning either a full URL or a relative /uploads/ path
// ដោះស្រាយ URL នៃឯកសារដែលបាន upload ត្រឡប់ URL ពេញលេញ ឬផ្លូវទាក់ទង /uploads/

function hasCloudinaryCredentials() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}
// Checks if all required Cloudinary environment variables are configured
// ពិនិត្យលក្ខខណ្ឌ Cloudinary ដែលចាំបាច់ទាំងអស់ត្រូវបានកំណត់នៅក្នុងបរិស្ថាន

async function pingCloudinary() {
  const { v2: cloudinary } = require("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  return new Promise((resolve, reject) => {
    cloudinary.api.ping((error, result) => {
      if (error) {
        return reject(error);
      }
      return resolve(result);
    });
  });
}
// Pings the Cloudinary API to verify that credentials are valid and the service is reachable
// ឈានលើ API Cloudinary ដើម្បីផ្ទៀងផ្ទាត់ថាលក្ខខណ្ឌមានសុពលភាព ហើយសេវាកម្មអាចឈានលើបាន

function toProductPayload(req, existingProduct = null) {
  const rawTitle = (req.body.name || req.body.title || "").trim();
  const rawPrice = req.body.price;
  const rawStock = req.body.stock;
  const price = Number(rawPrice);
  if (!rawTitle) {
    return { error: "Product name is required." };
  }

  let stock = Number(rawStock || 0);
  if (isNaN(stock)) stock = 0;

  const isDigital = (req.body.type === "course" || req.body.type === "book" || req.body.type === "ielts" || req.body.type === "level_test" || req.body.type === "resource" || (req.files?.video && req.files.video.length > 0));

  if (!isDigital && (!Number.isInteger(stock) || stock < 0)) {
    return { error: "Stock quantity must be a whole number greater than or equal to 0." };
  }

  if (isDigital) stock = 0;

  const type = req.body.type || "course";
  const categoryId = toObjectId(req.body.category_id);
  if (!categoryId && type !== "book") {
    return { error: "Category is required." };
  }

  if (type === "book" && (rawPrice === undefined || rawPrice === "" || isNaN(price) || price <= 0)) {
    return { error: "A price greater than 0 is required for books." };
  }

  const nextStatus = req.body.status === "Inactive" ? "Inactive" : "Active";
  const imageFile = req.files?.image?.[0];
  const pdfFile = req.files?.pdf_file?.[0];

  // Handle multiple videos
  let videos = [];
  if (existingProduct && Array.isArray(existingProduct.videos)) {
    videos = [...existingProduct.videos];
  } else if (existingProduct && existingProduct.video) {
    // Migrate single video to array
    videos = [existingProduct.video];
  }

  // Handle new uploads
  if (req.files?.video) {
    req.files.video.forEach(file => {
      videos.push(resolveUploadedFileUrl(file));
    });
  }

  // Allow deleting videos via a field in the body if needed
  if (req.body.delete_video_indices) {
    try {
      const indicesToDelete = JSON.parse(req.body.delete_video_indices);
      if (Array.isArray(indicesToDelete)) {
        videos = videos.filter((_, index) => !indicesToDelete.includes(index));
      }
    } catch (e) {
      console.error("Error parsing delete_video_indices:", e);
    }
  }

  return {
    payload: {
      name: rawTitle,
      title: rawTitle,
      description: (req.body.description || "").trim(),
      stock,
      status: nextStatus,
      category_id: categoryId || null,
      type: type,
      price: type === 'book' ? (Number.isFinite(price) ? price : 0) : null,
      image: resolveUploadedFileUrl(imageFile) || existingProduct?.image || null,
      pdf_file: resolveUploadedFileUrl(pdfFile) || existingProduct?.pdf_file || null,
      videos: videos,
      video: videos[0] || null // Maintain backward compatibility for single video
    }
  };
}
// Converts and validates request body into a product payload, handling files, videos, pricing, and stock rules
// បំលែង ហើយផ្ទៀងផ្ទាត់ request body ក្នុង product payload ដោយដោះស្រាយឯកសារ វីដេអូ តម្លៃ ហើយ stock rules

async function getDashboardStats(db) {
  const [users, products, categories, orders] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("products").countDocuments(),
    db.collection("categories").countDocuments(),
    db.collection("orders").countDocuments()
  ]);

  const grouped = await db
    .collection("orders")
    .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    .toArray();

  const ordersByStatus = grouped.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});

  return { users, products, categories, orders, ordersByStatus };
}
// Retrieves dashboard statistics including counts of users, products, categories, orders and breakdown of orders by status
// ទទួលបានលក្ខណៈលេខផ្ទាំងឧបករណ៍ រួមទាំង counts នៃ users ផលិតផល ប្រភេទ orders ហើយការប្រៀបធៀប នៃ orders ដោយស្ថានភាព

module.exports = function webRoutes(router) {
  CATEGORY_SLUG_ROUTES.forEach(({ path, name }) => {
    router.get(path, async (_req, res) => {
      const db = getDb();
      await ensureDefaultCategories(db);

      const category = await db.collection("categories").findOne({
        name: { $regex: `^${escapeRegex(name)}$`, $options: "i" }
      });

      if (!category) {
        return res.redirect("/products");
      }

      return res.redirect(`/products?category=${category._id.toString()}`);
    });
  });

  router.get("/free-resources", (_req, res) => {
    return res.redirect("/products?filter=free");
  });

  router.get("/online-courses", (_req, res) => {
    return res.redirect("/products?filter=premium");
  });

  router.get("/ielts", async (_req, res) => {
    return res.redirect("/products?type=ielts");
  });

  router.get("/level-test", (_req, res) => {
    return res.redirect("/products?type=level_test");
  });

  router.get("/gallery", async (_req, res) => {
    const db = getDb();
    const [items, categories] = await Promise.all([
      db.collection("products")
        .find(buildPublicProductStatusClause())
        .sort({ created_at: -1 })
        .limit(24)
        .toArray(),
      db.collection("categories").find({}).toArray()
    ]);

    const categoryMap = toCategoryMap(categories);
    const galleryItems = items.map((item) => {
      const category = item.category_id ? categoryMap.get(item.category_id.toString()) : null;
      return normalizeId({
        ...item,
        category: category ? normalizeId(category) : null
      });
    });

    return res.render("gallery", {
      title: "Gallery",
      galleryItems
    });
  });



  router.get("/", async (_req, res) => {
    const db = getDb();
    const currentUser = _req.session.user || null;
    const [products, categoriesRaw] = await Promise.all([
      db.collection("products").find(buildPublicProductStatusClause()).sort({ created_at: 1 }).limit(10).toArray(),
      db.collection("categories").find({}).toArray()
    ]);

    // Count active products per category to hide empty ones
    const categoryStats = await db.collection("products").aggregate([
      { $match: buildPublicProductStatusClause() },
      { $group: { _id: "$category_id", count: { $sum: 1 } } }
    ]).toArray();

    const activeCatIds = new Set(categoryStats.map(s => s._id?.toString()).filter(Boolean));
    const categories = categoriesRaw.filter(c => activeCatIds.has(c._id.toString()));

    const categoryMap = toCategoryMap(categoriesRaw);
    const featuredProducts = products.map((item) => {
      const category = item.category_id ? categoryMap.get(item.category_id.toString()) : null;
      return normalizeId({ ...item, category: category ? normalizeId(category) : null });
    });
    const paidCategoryIds = currentUser ? await getPaidCategoryIdSet(db, currentUser.id) : new Set();

    return res.render("home", {
      title: "Home",
      featuredProducts,
      categories: categories.map(normalizeId),
      paidCategoryIds
    });
  });

  router.get("/products", async (req, res) => {
    const db = getDb();
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = 8;
    const offset = (page - 1) * limit;

    const q = (req.query.q || "").trim();
    const categoryId = req.query.category || "";
    const filterType = req.query.filter || ""; // 'free' or 'premium'
    const productType = req.query.type || ""; // 'course' or 'resource'

    const filterClauses = [buildPublicProductStatusClause()];

    // If filterType or productType is specified, we need to respect the category-based model
    if (filterType || productType) {
      const catFilter = {};
      if (filterType === "free") catFilter.price = { $lte: 0 };
      if (filterType === "premium") catFilter.price = { $gt: 0 };
      if (productType) catFilter.type = productType;

      const matchingCats = await db.collection("categories").find(catFilter).toArray();
      const catIds = matchingCats.map(c => c._id);

      filterClauses.push({ category_id: { $in: catIds } });
    }

    if (q) {
      const safeQuery = escapeRegex(q);
      filterClauses.push({
        $or: [
          { title: { $regex: safeQuery, $options: "i" } },
          { name: { $regex: safeQuery, $options: "i" } },
          { description: { $regex: safeQuery, $options: "i" } }
        ]
      });
    }

    const categoryObjectId = toObjectId(categoryId);
    if (categoryId && categoryObjectId) {
      filterClauses.push({ category_id: categoryObjectId });
    }

    const filter = filterClauses.length === 1 ? filterClauses[0] : { $and: filterClauses };

    const [productsRaw, total, categories] = await Promise.all([
      db.collection("products").find(filter).sort({ created_at: 1 }).skip(offset).limit(limit).toArray(),
      db.collection("products").countDocuments(filter),
      db.collection("categories").find({}).sort({ name: 1 }).toArray()
    ]);

    const categoryMap = toCategoryMap(categories);
    const products = productsRaw.map((item) => {
      const category = item.category_id ? categoryMap.get(item.category_id.toString()) : null;
      return normalizeId({ ...item, category: category ? normalizeId(category) : null });
    });
    const currentUser = req.session.user || null;
    const paidCategoryIds = currentUser ? await getPaidCategoryIdSet(db, currentUser.id) : new Set();

    return res.render("products", {
      title: "Products",
      products,
      categories: categories.map((item) => normalizeId(item)),
      total,
      page,
      pageCount: Math.max(Math.ceil(total / limit), 1),
      q,
      categoryId,
      paidCategoryIds
    });
  });

  router.get("/products/:id", async (req, res) => {
    const db = getDb();
    const productId = toObjectId(req.params.id);
    if (!productId) {
      return res.status(404).render("error", { title: "Not Found", message: "Product not found" });
    }

    // Only show active products to public
    const product = await db.collection("products").findOne({
      _id: productId,
      ...buildPublicProductStatusClause()
    });
    if (!product) {
      return res.status(404).render("error", { title: "Not Found", message: "Product not found or inactive" });
    }

    const category = product.category_id
      ? await db.collection("categories").findOne({ _id: product.category_id })
      : null;

    const currentUser = req.session.user || null;
    const hasPaidCategory = product.category_id ? await hasPaidCategoryAccess(db, currentUser?.id, product.category_id) : false;
    const hasPaidProduct = await hasPaidProductAccess(db, currentUser?.id, product._id);
    const hasPaidAccess = hasPaidCategory || hasPaidProduct;
    const isPaid = hasPaidAccess;
    const videoIndex = parseInt(req.query.v || "0");
    const videoUrl = product.video ? `/media/videos/${product._id.toString()}` : null;

    return res.render("product-detail", {
      title: product.name || product.title,
      product: normalizeId({ ...product, category: normalizeId(category) }),
      isPaid,
      videoUrl,
      videoIndex,
      hasPaidAccess: isPaid
    });
  });

  router.get(["/media/videos/:id", "/media/videos/:id/:index"], async (req, res) => {
    const db = getDb();
    const productId = toObjectId(req.params.id);
    const videoIndex = parseInt(req.params.index || "0");

    if (!productId) {
      return res.status(404).render("error", { title: "Not Found", message: "Video not found" });
    }

    const product = await db.collection("products").findOne({
      _id: productId,
      ...buildPublicProductStatusClause()
    });
    if (!product) {
      return res.status(404).render("error", { title: "Not Found", message: "Video not found" });
    }

    const videos = Array.isArray(product.videos) ? product.videos : (product.video ? [product.video] : []);
    const videoPath = videos[videoIndex];

    if (!videoPath) {
      return res.status(404).render("error", { title: "Not Found", message: "Video not found" });
    }

    const currentUser = req.session.user || null;
    const allowed = await canAccessProductVideo(db, product, currentUser);
    if (!allowed) {
      return res.status(403).render("error", {
        title: "Access Denied",
        message: "Purchase Required: This video is part of a locked category. Please purchase the category to gain access."
      });
    }

    if (isLocalUploadPath(videoPath)) {
      const filename = path.basename(videoPath);
      const isServerless = process.env.VERCEL || process.env.CF_PAGES || process.env.CLOUDFLARE;

      if (isServerless) {
        // In serverless, we usually serve from public folder via CDN or Cloudinary
        // If it's a local path, we redirect to the static asset URL
        return res.redirect(videoPath);
      }

      const filePath = path.join(process.cwd(), "public", "uploads", filename);
      try {
        if (fs.existsSync(filePath)) {
          return res.sendFile(filePath);
        }
        return res.status(404).render("error", { title: "Not Found", message: "Video file not found" });
      } catch (_error) {
        return res.status(404).render("error", { title: "Not Found", message: "Video file not found" });
      }
    }

    if (/^https?:\/\//i.test(videoPath)) {
      return proxyRemoteMedia(req, res, videoPath);
    }

    return res.status(404).render("error", { title: "Not Found", message: "Video not available" });
  });

  router.get("/uploads/:filename", async (req, res) => {
    const db = getDb();
    const filename = path.basename(req.params.filename || "");
    if (!filename) {
      return res.status(404).render("error", { title: "Not Found", message: "File not found" });
    }

    const isServerless = process.env.VERCEL || process.env.CF_PAGES || process.env.CLOUDFLARE;
    if (isServerless) {
      return res.redirect(`/uploads/${filename}`);
    }

    const filePath = path.join(process.cwd(), "public", "uploads", filename);
    try {
      if (!fs.existsSync(filePath)) {
        return res.status(404).render("error", { title: "Not Found", message: "File not found" });
      }
    } catch (_error) {
      return res.status(404).render("error", { title: "Not Found", message: "File not found" });
    }

    const isVideo = isVideoFileName(filename);
    const product = await resolveProductForMedia(db, filename);
    if (isVideo) {
      if (!product) {
        return res.status(403).render("error", {
          title: "Access Denied",
          message: "Purchase Required: This content is locked."
        });
      }

      const currentUser = req.session.user || null;
      const allowed = await canAccessProductVideo(db, product, currentUser);
      if (!allowed) {
        return res.status(403).render("error", {
          title: "Access Denied",
          message: "Purchase Required: Please purchase the category to access this video."
        });
      }
    }

    return res.sendFile(filePath);
  });

  router.post("/orders/buy-now", ensureAuth, async (req, res) => {
    const db = getDb();
    const productId = req.body.productId ? toObjectId(req.body.productId) : null;

    if (!productId) {
      return res.status(400).render("error", {
        title: "Invalid Order",
        message: "Invalid product selection."
      });
    }

    const product = await db.collection("products").findOne({
      _id: productId,
      ...buildPublicProductStatusClause()
    });
    if (!product) {
      return res.status(404).render("error", {
        title: "Error",
        message: "Product is currently unavailable."
      });
    }

    if (product.stock !== undefined && product.stock <= 0) {
      return res.status(400).render("error", {
        title: "Error",
        message: "Product is out of stock."
      });
    }

    const totalPrice = Number(product.price || 0);
    const user = req.session.user || null;
    const orderData = {
      total_price: totalPrice,
      status: totalPrice === 0 ? "completed" : "pending",
      product_id: productId,
      created_at: new Date()
    };

    if (user && user.id) {
      const userObjectId = toObjectId(user.id);
      if (userObjectId) {
        orderData.user_id = userObjectId;
      }
    }

    const orderResult = await db.collection("orders").insertOne(orderData);

    // Redirect to orders page
    return res.redirect("/orders?success=Order+placed");
  });

  router.post("/orders/buy-category", ensureAuth, async (req, res) => {
    const db = getDb();
    const categoryId = toObjectId(req.body.categoryId);
    if (!categoryId) {
      return res.status(400).render("error", { title: "Error", message: "Invalid category selection." });
    }

    const category = await db.collection("categories").findOne({ _id: categoryId });
    if (!category) {
      return res.status(404).render("error", { title: "Error", message: "Category not found." });
    }

    const totalPrice = Number(category.price || 0);
    const user = req.session.user;

    const productId = req.body.productId ? toObjectId(req.body.productId) : null;
    const qty = parseInt(req.body.qty || 1);

    const orderData = {
      user_id: toObjectId(user.id),
      total_price: totalPrice,
      status: totalPrice === 0 ? "paid" : "pending",
      category_id: categoryId,
      product_id: productId,
      quantity: qty,
      type: productId ? "individual_purchase" : "category_subscription",
      created_at: new Date()
    };

    const orderResult = await db.collection("orders").insertOne(orderData);

    // Redirect to orders page
    return res.redirect("/orders?success=Order+placed");
  });



  router.post("/orders", ensureAuth, async (req, res) => {
    const db = getDb();
    const totalPrice = Number(req.body.total_price || 0);
    const productId = req.body.productId ? toObjectId(req.body.productId) : null;

    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
      return res.status(400).render("error", {
        title: "Invalid Order",
        message: "Invalid product price."
      });
    }

    if (productId) {
      const product = await db.collection("products").findOne({ _id: productId });
      if (!product || !isPublicProductStatus(product.status)) {
        return res.status(404).render("error", { title: "Error", message: "Product is currently unavailable." });
      }
      if (product.stock !== undefined && product.stock <= 0) {
        return res.status(400).render("error", { title: "Error", message: "Product is out of stock." });
      }
      // Deduct stock
      await db.collection("products").updateOne(
        { _id: productId },
        { $inc: { stock: -1 } }
      );
    }

    const isFreeContent = totalPrice === 0;
    const orderData = {
      user_id: toObjectId(req.session.user.id),
      total_price: totalPrice,
      status: isFreeContent ? "completed" : "pending",
      created_at: new Date()
    };

    if (productId) {
      orderData.product_id = productId;
    }

    await db.collection("orders").insertOne(orderData);

    return res.redirect("/orders");
  });


  router.get("/orders", ensureAuth, async (req, res) => {
    const db = getDb();
    const filter = req.session.user.role === "admin" ? {} : { user_id: toObjectId(req.session.user.id) };
    const [orders, users, products] = await Promise.all([
      db.collection("orders").find(filter).sort({ created_at: -1 }).toArray(),
      db.collection("users").find({}, { projection: { password: 0 } }).toArray(),
      db.collection("products").find({}).toArray()

    ]);
    const userMap = new Map(users.map((item) => [item._id.toString(), normalizeId(item)]));
    const productMap = new Map(products.map((item) => [item._id.toString(), normalizeId(item)]));
    const categoryMap = new Map((await db.collection("categories").find({}).toArray()).map(c => [c._id.toString(), normalizeId(c)]));

    const resolvedOrders = orders.map((item) => {
      const prod = item.product_id ? productMap.get(item.product_id.toString()) : null;
      const cat = item.category_id ? categoryMap.get(item.category_id.toString()) : null;
      const hasAnyVideo = prod && (prod.video || (Array.isArray(prod.videos) && prod.videos.length > 0));

      return normalizeId({
        ...item,
        user: item.user_id ? userMap.get(item.user_id.toString()) : null,
        product: prod,
        category: cat,
        canWatch: Boolean(item.status === "paid" && item.product_id && hasAnyVideo)
      });
    });

    return res.render("my-orders", {
      title: "My Orders",
      orders: resolvedOrders
    });
  });

  router.get("/about", (_req, res) => res.render("about", { title: "About" }));
  router.get("/contact", (_req, res) => res.render("contact", { title: "Contact" }));

  router.get("/register", (_req, res) => {
    res.render("register", { title: "Register", errors: [] });
  });

  router.post(
    "/register",
    [
      body("name").isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
      body("email").isEmail().withMessage("Valid email is required"),
      body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    ],
    async (req, res) => {
      const db = getDb();
      const errors = getValidationErrors(req);
      if (errors.length > 0) {
        return res.status(400).render("register", { title: "Register", errors });
      }

      const email = req.body.email.toLowerCase();
      const existing = await db.collection("users").findOne({ email });
      if (existing) {
        return res.status(400).render("register", { title: "Register", errors: ["Email already in use"] });
      }

      const passwordHash = await bcrypt.hash(req.body.password, 10);
      const result = await db.collection("users").insertOne({
        name: req.body.name,
        email,
        password: passwordHash,
        role: "user",
        created_at: new Date()
      });

      req.session.user = {
        id: result.insertedId.toString(),
        name: req.body.name,
        email,
        role: "user"
      };

      return res.redirect("/");
    }
  );

  router.get("/login", (_req, res) => {
    res.render("login", { title: "Login", errors: [] });
  });

  router.post(
    "/login",
    [
      body("email").notEmpty().withMessage("Email is required"),
      body("password").notEmpty().withMessage("Password is required")
    ],
    async (req, res) => {
      const db = getDb();
      const errors = getValidationErrors(req);
      if (errors.length > 0) {
        return res.status(400).render("login", { title: "Login", errors });
      }

      const email = req.body.email.toLowerCase();
      const user = await db.collection("users").findOne({ email });
      if (!user) {
        return res.status(401).render("login", { title: "Login", errors: ["Invalid credentials"] });
      }

      const validPassword = await bcrypt.compare(req.body.password, user.password);
      if (!validPassword) {
        return res.status(401).render("login", { title: "Login", errors: ["Invalid credentials"] });
      }

      req.session.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      };

      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role },
        process.env.JWT_SECRET || "dev-secret",
        { expiresIn: "2h" }
      );

      req.session.apiToken = token;

      const redirectTo = req.session.returnTo || "/";
      delete req.session.returnTo;
      return res.redirect(redirectTo);
    }
  );

  router.post("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });

  router.get("/admin", ensureAuth, ensureAdmin, async (_req, res) => {
    const db = getDb();
    const stats = await getDashboardStats(db);
    return res.render("admin/dashboard", {
      title: "Admin Dashboard",
      stats
    });
  });

  router.get("/admin/users", ensureAuth, ensureAdmin, async (_req, res) => {
    const db = getDb();
    const users = await db.collection("users").find({}, { projection: { password: 0 } }).sort({ created_at: -1 }).toArray();
    return res.render("admin/users", { title: "Manage Users", users: users.map((item) => normalizeId(item)) });
  });

  router.post("/admin/users/:id/role", ensureAuth, ensureAdmin, async (req, res) => {
    const db = getDb();
    const userId = toObjectId(req.params.id);
    const role = req.body.role === "admin" ? "admin" : "user";
    if (userId) {
      await db.collection("users").updateOne({ _id: userId }, { $set: { role } });
    }
    return res.redirect("/admin/users");
  });

  router.get("/admin/categories", ensureAuth, ensureAdmin, async (req, res) => {
    const db = getDb();
    await ensureDefaultCategories(db);
    const categories = await db.collection("categories").find({}).sort({ name: 1 }).toArray();
    return res.render("admin/categories", {
      title: "Manage Categories",
      categories: categories.map((item) => normalizeId(item)),
      error: req.query.error || "",
      success: req.query.success || ""
    });
  });

  router.post("/admin/categories", ensureAuth, ensureAdmin, upload.single("image"), async (req, res) => {
    try {
      const db = getDb();
      const imageUrl = req.file ? resolveUploadedFileUrl(req.file) : null;
      const result = await createCategoryIfValid(db, req.body.name, req.body.price, req.body.type, imageUrl);
      if (result.error) {
        return res.redirect(`/admin/categories?error=${encodeURIComponent(result.error)}`);
      }
      return res.redirect("/admin/categories");
    } catch (err) {
      console.error("Create category error:", err);
      return res.redirect("/admin/categories?error=Internal+server+error");
    }
  });

  router.put("/admin/categories/:id", ensureAuth, ensureAdmin, upload.single("image"), async (req, res) => {
    const db = getDb();
    const categoryId = toObjectId(req.params.id);
    if (categoryId) {
      const updateData = {
        name: req.body.name,
        price: Math.max(Number(req.body.price || 0), 0),
        type: req.body.type || "course",
        updated_at: new Date()
      };

      if (req.file) {
        updateData.image = resolveUploadedFileUrl(req.file);
      }

      await db.collection("categories").updateOne(
        { _id: categoryId },
        { $set: updateData }
      );
    }
    return res.redirect("/admin/categories?success=Category+updated+successfully");
  });

  router.delete("/admin/categories/:id", ensureAuth, ensureAdmin, async (req, res) => {
    const db = getDb();
    const categoryId = toObjectId(req.params.id);
    if (categoryId) {
      await db.collection("categories").deleteOne({ _id: categoryId });
    }
    return res.redirect("/admin/categories?success=Category+deleted+successfully");
  });

  // Category API routes for the React Dashboard
  router.get("/admin/api/categories", ensureAuth, ensureAdmin, async (_req, res) => {
    try {
      const db = getDb();
      const categories = await db.collection("categories").find({}).sort({ name: 1 }).toArray();
      return res.json({ categories: categories.map((item) => normalizeId(item)) });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/admin/api/categories", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const db = getDb();
      const result = await createCategoryIfValid(db, req.body.name, req.body.price, req.body.type);
      if (result.error) {
        return res.status(400).json({ message: result.error });
      }
      return res.status(result.alreadyExists ? 200 : 201).json({
        message: result.alreadyExists ? "Category already exists" : "Category created",
        category: normalizeId(result.category)
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/admin/products", ensureAuth, ensureAdmin, async (req, res) => {
    const db = getDb();
    await ensureDefaultCategories(db);
    const storageInfo = typeof upload.getStorageInfo === "function"
      ? upload.getStorageInfo()
      : { requestedMode: "Local", activeMode: "Local", isFallback: false, warning: "" };

    return res.render("admin/products", {
      title: "Manage Products",
      uploadError: req.query.error || "",
      storageMode: storageInfo.activeMode,
      storageRequestedMode: storageInfo.requestedMode,
      storageWarning: storageInfo.warning || ""
    });
  });



  router.get("/admin/api/storage/health", ensureAuth, ensureAdmin, async (_req, res) => {
    const requestedMode = process.env.FILE_STORAGE === "cloudinary" ? "Cloudinary" : "Local";
    const storageInfo = typeof upload.getStorageInfo === "function"
      ? upload.getStorageInfo()
      : { activeMode: "Local", isFallback: false, warning: "" };

    if (requestedMode === "Local") {
      return res.json({
        ok: true,
        requestedMode,
        activeMode: storageInfo.activeMode,
        isFallback: storageInfo.isFallback,
        message: "Local storage is active. No external cloud check required."
      });
    }

    if (!hasCloudinaryCredentials()) {
      return res.status(400).json({
        ok: false,
        requestedMode,
        activeMode: storageInfo.activeMode,
        isFallback: storageInfo.isFallback,
        message: "Cloudinary credentials are missing. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
      });
    }

    try {
      const result = await pingCloudinary();
      return res.json({
        ok: true,
        requestedMode,
        activeMode: storageInfo.activeMode,
        isFallback: storageInfo.isFallback,
        message: "Cloudinary connection is healthy.",
        cloudinaryStatus: result?.status || "ok"
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        requestedMode,
        activeMode: storageInfo.activeMode,
        isFallback: storageInfo.isFallback,
        message: `Cloudinary connection failed: ${error.message}`
      });
    }
  });


  router.post("/orders/checkout-cart", ensureAuth, async (req, res) => {
    try {
      const db = getDb();
      const items = req.body.items || [];
      const user = req.session.user;

      if (!items.length) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      const orderDocs = items.map(item => ({
        user_id: toObjectId(user.id),
        category_id: toObjectId(item.categoryId),
        product_id: toObjectId(item.productId),
        quantity: parseInt(item.qty) || 1,
        status: "paid",
        created_at: new Date(),
        type: "individual_purchase"
      }));

      await db.collection("orders").insertMany(orderDocs);

      // Construct Telegram message for the batch order
      const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price) * (parseInt(item.qty) || 1)), 0);
      const itemLines = items.map(item => `- ${item.name} (Qty: ${item.qty})`).join("\n");

      const telegramMessage = [
        "📦 New Multi-Item Order",
        `Buyer: ${user.name || "User"}`,
        `Email: ${user.email || "Not provided"}`,
        "\nItems:",
        itemLines,
        `\nTotal Amount: $${totalAmount.toFixed(2)}`,
        `Admin Orders: ${req.protocol}://${req.get("host")}/admin/orders`
      ].join("\n");

      const telegramUrl = buildTelegramMessageLink(res.locals.telegramLink, telegramMessage);

      return res.json({
        message: "Order placed successfully",
        telegramUrl: telegramUrl
      });
    } catch (error) {
      console.error("Checkout error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/orders/my", ensureAuth, async (req, res) => {
    try {
      const db = getDb();
      const user_id = toObjectId(req.session.user.id);

      const [orders, categories, products] = await Promise.all([
        db.collection("orders").find({ user_id }).sort({ created_at: -1 }).toArray(),
        db.collection("categories").find({}).toArray(),
        db.collection("products").find({}).toArray()
      ]);

      const categoryMap = new Map(categories.map(c => [c._id.toString(), c]));
      const productMap = new Map(products.map(p => [p._id.toString(), p]));

      const resolvedOrders = orders.map(order => ({
        ...normalizeId(order),
        category: order.category_id ? normalizeId(categoryMap.get(order.category_id.toString())) : null,
        product: order.product_id ? normalizeId(productMap.get(order.product_id.toString())) : null
      }));

      return res.render("orders", {
        title: "My Purchases",
        orders: resolvedOrders
      });
    } catch (error) {
      console.error("My orders error:", error);
      return res.redirect("/");
    }
  });

  router.get("/admin/api/products", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const db = getDb();
      const search = (req.query.search || "").trim();
      const status = req.query.status === "Inactive" ? "Inactive" : req.query.status === "Active" ? "Active" : "";
      const categoryId = req.query.categoryId || "";
      const type = req.query.type || "";

      const filter = {};
      if (type) {
        filter.type = type;
      }
      if (search) {
        const safeQuery = escapeRegex(search);
        filter.$or = [
          { title: { $regex: safeQuery, $options: "i" } },
          { name: { $regex: safeQuery, $options: "i" } },
          { description: { $regex: safeQuery, $options: "i" } }
        ];
      }

      if (status) {
        filter.status = status;
      }

      const categoryObjectId = toObjectId(categoryId);
      if (categoryObjectId) {
        filter.category_id = categoryObjectId;
      }

      const [products, categories] = await Promise.all([
        db.collection("products").find(filter).sort({ created_at: -1 }).toArray(),
        db.collection("categories").find({}).toArray()
      ]);

      const categoryMap = toCategoryMap(categories);
      const resolvedProducts = products.map((item) => {
        const category = item.category_id ? categoryMap.get(item.category_id.toString()) : null;
        return normalizeId({
          ...item,
          category: category ? normalizeId(category) : null
        });
      });

      return res.json({ products: resolvedProducts });
    } catch (error) {
      console.error('/admin/api/products error:', error && error.stack ? error.stack : error);
      // Return JSON so client-side code can consistently parse errors.
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  router.post(
    "/admin/api/products",
    ensureAuth,
    ensureAdmin,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "video", maxCount: 20 },
      { name: "pdf_file", maxCount: 1 }
    ]),
    async (req, res) => {
      const db = getDb();
      const { payload, error } = toProductPayload(req);
      if (error) {
        return res.status(400).json({ message: error });
      }

      const result = await db.collection("products").insertOne({
        ...payload,
        created_at: new Date()
      });

      const insertedProduct = await db.collection("products").findOne({ _id: result.insertedId });
      return res.status(201).json({
        message: "Product added successfully",
        product: normalizeId(insertedProduct)
      });
    }
  );

  router.put(
    "/admin/api/products/:id",
    ensureAuth,
    ensureAdmin,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "video", maxCount: 20 },
      { name: "pdf_file", maxCount: 1 }
    ]),
    async (req, res) => {
      const db = getDb();
      const productId = toObjectId(req.params.id);
      if (!productId) {
        return res.status(400).json({ message: "Invalid product id." });
      }

      const existing = await db.collection("products").findOne({ _id: productId });
      if (!existing) {
        return res.status(404).json({ message: "Product not found." });
      }

      const { payload, error } = toProductPayload(req, existing);
      if (error) {
        return res.status(400).json({ message: error });
      }

      await db.collection("products").updateOne(
        { _id: productId },
        {
          $set: payload
        }
      );

      const updated = await db.collection("products").findOne({ _id: productId });
      return res.json({
        message: "Product updated successfully",
        product: normalizeId(updated)
      });
    }
  );

  router.delete("/admin/api/products/:id", ensureAuth, ensureAdmin, async (req, res) => {
    const db = getDb();
    const productId = toObjectId(req.params.id);
    if (!productId) {
      return res.status(400).json({ message: "Invalid product id." });
    }

    const result = await db.collection("products").deleteOne({ _id: productId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.json({ message: "Product deleted successfully" });
  });

  router.post(
    "/admin/products",
    ensureAuth,
    ensureAdmin,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "video", maxCount: 1 },
      { name: "pdf_file", maxCount: 1 }
    ]),
    async (req, res) => {
      const db = getDb();
      const title = (req.body.name || req.body.title || "").trim(); // Use name or title
      if (!title) {
        return res.redirect("/admin/products?error=Product+Name+is+required.");
      }

      const type = req.body.type || "course";
      const categoryId = toObjectId(req.body.category_id);
      if (!categoryId && type !== "book") {
        return res.redirect("/admin/products?error=Category+is+required.");
      }
      const imageFile = req.files?.image?.[0];
      const videoFile = req.files?.video?.[0];
      const parsedPrice = req.body.price === "" || req.body.price === undefined ? null : Number(req.body.price);

      await db.collection("products").insertOne({
        name: title,
        title: title, // Keep title for backwards compatibility
        description: req.body.description || "",
        price: Number.isFinite(parsedPrice) ? parsedPrice : null,
        stock: Number(req.body.stock) || 0,
        status: req.body.status || "Active",
        type: type,
        category_id: categoryId,
        image: resolveUploadedFileUrl(imageFile),
        videos: req.files?.video ? req.files.video.map(resolveUploadedFileUrl) : [],
        video: req.files?.video ? resolveUploadedFileUrl(req.files.video[0]) : null,
        created_at: new Date()
      });
      return res.redirect("/admin/products?success=Product+added+successfully");
    }
  );

  router.put(
    "/admin/products/:id",
    ensureAuth,
    ensureAdmin,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "video", maxCount: 1 },
      { name: "pdf_file", maxCount: 1 }
    ]),
    async (req, res) => {
      const db = getDb();
      const productId = toObjectId(req.params.id);
      const title = (req.body.name || req.body.title || "").trim(); // Use name or title
      if (!title) {
        return res.redirect("/admin/products?error=Product+Name+is+required.");
      }

      const type = req.body.type || "course";
      const categoryId = toObjectId(req.body.category_id);
      if (!categoryId && type !== "book") {
        return res.redirect("/admin/products?error=Category+is+required.");
      }
      if (!productId) {
        return res.redirect("/admin/products");
      }

      const existing = await db.collection("products").findOne({ _id: productId });
      if (!existing) {
        return res.redirect("/admin/products");
      }

      const imageFile = req.files?.image?.[0];
      const videoFile = req.files?.video?.[0];
      const parsedPrice = req.body.price === "" || req.body.price === undefined ? null : Number(req.body.price);

      await db.collection("products").updateOne(
        { _id: productId },
        {
          $set: {
            name: title,
            title: title, // maintain compatibility
            description: req.body.description || "",
            price: Number.isFinite(parsedPrice) ? parsedPrice : null,
            stock: Number(req.body.stock) || 0,
            status: req.body.status || "Active",
            category_id: categoryId,
            image: resolveUploadedFileUrl(imageFile) || existing.image,
            videos: req.files?.video ? [...(existing.videos || []), ...req.files.video.map(resolveUploadedFileUrl)] : (existing.videos || []),
            video: req.files?.video ? resolveUploadedFileUrl(req.files.video[0]) : existing.video
          }
        }
      );
      return res.redirect("/admin/products?success=Product+updated+successfully");
    }
  );

  router.delete("/admin/products/:id", ensureAuth, ensureAdmin, async (req, res) => {
    const db = getDb();
    const productId = toObjectId(req.params.id);
    if (productId) {
      await db.collection("products").deleteOne({ _id: productId });
    }
    return res.redirect("/admin/products?success=Product+deleted+successfully");
  });

  router.get("/admin/orders", ensureAuth, ensureAdmin, async (_req, res) => {
    const db = getDb();
    const [orders, users, products, categories] = await Promise.all([
      db.collection("orders").find({}).sort({ created_at: -1 }).toArray(),
      db.collection("users").find({}, { projection: { password: 0 } }).toArray(),
      db.collection("products").find({}).toArray(),
      db.collection("categories").find({}).toArray()
    ]);

    const userMap = new Map(users.map((item) => [item._id.toString(), normalizeId(item)]));
    const productMap = new Map(products.map((item) => [item._id.toString(), normalizeId(item)]));
    const categoryMap = new Map(categories.map((item) => [item._id.toString(), normalizeId(item)]));

    const resolvedOrders = orders.map((item) =>
      normalizeId({
        ...item,
        user: item.user_id ? userMap.get(item.user_id.toString()) : null,
        product: item.product_id ? productMap.get(item.product_id.toString()) : null,
        category: item.category_id ? categoryMap.get(item.category_id.toString()) : null
      })
    );

    return res.render("admin/orders", {
      title: "Manage Orders",
      orders: resolvedOrders
    });
  });

  // ── Admin Orders JSON API (for real-time polling) ─────────────────────────
  router.get("/admin/api/orders", ensureAuth, ensureAdmin, async (_req, res) => {
    const db = getDb();
    const [orders, users, products, categories] = await Promise.all([
      db.collection("orders").find({}).sort({ created_at: -1 }).toArray(),
      db.collection("users").find({}, { projection: { password: 0 } }).toArray(),
      db.collection("products").find({}).toArray(),
      db.collection("categories").find({}).toArray()
    ]);
    const userMap = new Map(users.map((u) => [u._id.toString(), normalizeId(u)]));
    const productMap = new Map(products.map((p) => [p._id.toString(), normalizeId(p)]));
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), normalizeId(c)]));

    const resolvedOrders = orders.map((item) =>
      normalizeId({
        ...item,
        user: item.user_id ? userMap.get(item.user_id.toString()) : null,
        product: item.product_id ? productMap.get(item.product_id.toString()) : null,
        category: item.category_id ? categoryMap.get(item.category_id.toString()) : null
      })
    );
    return res.json({ ok: true, orders: resolvedOrders });
  });

  router.post("/admin/orders/:id/status", ensureAuth, ensureAdmin, async (req, res) => {
    const db = getDb();
    const orderId = toObjectId(req.params.id);
    const allowedStatuses = ["pending", "paid", "cancelled"];
    const nextStatus = allowedStatuses.includes(req.body.status) ? req.body.status : "pending";

    if (orderId) {
      await db.collection("orders").updateOne(
        { _id: orderId },
        {
          $set: {
            status: nextStatus,
            payment_status: nextStatus,
            paid_at: nextStatus === "paid" ? new Date() : null,
            updated_at: new Date()
          }
        }
      );
    }
    return res.redirect("/admin/orders");
  });

  router.get("/admin/users", ensureAuth, ensureAdmin, async (_req, res) => {
    try {
      const db = getDb();
      const users = await db.collection("users").find({}).sort({ created_at: -1 }).toArray();
      return res.render("admin/users", {
        title: "Manage Users",
        users: users.map(normalizeId)
      });
    } catch (error) {
      console.error("Admin Users Error:", error);
      return res.redirect("/admin");
    }
  });

  router.post("/admin/users/:id/role", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const db = getDb();
      const userId = toObjectId(req.params.id);
      const newRole = req.body.role === "admin" ? "admin" : "user";

      if (userId) {
        await db.collection("users").updateOne(
          { _id: userId },
          { $set: { role: newRole, updated_at: new Date() } }
        );
      }
      return res.redirect("/admin/users?success=Role+updated");
    } catch (error) {
      return res.redirect("/admin/users?error=Update+failed");
    }
  });

  router.delete("/admin/users/:id", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const db = getDb();
      const userId = toObjectId(req.params.id);
      if (userId) {
        // Prevent deleting yourself
        if (userId.toString() === _req.session.user.id) {
          return res.redirect("/admin/users?error=Cannot+delete+yourself");
        }
        await db.collection("users").deleteOne({ _id: userId });
      }
      return res.redirect("/admin/users?success=User+deleted");
    } catch (error) {
      return res.redirect("/admin/users?error=Delete+failed");
    }
  });

  return router;
};
