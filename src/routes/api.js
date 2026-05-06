const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { apiAuth, apiAdmin } = require("../middleware/auth");
const { getDb, toObjectId } = require("../config/mongodb");
const bakongService = require("../services/BakongService");


const router = express.Router();

function errorsToResponse(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return null;
  }
  return res.status(400).json({ errors: errors.array() });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeId(doc) {
  if (!doc) return null;
  return {
    ...doc,
    id: doc._id.toString()
  };
}

function toApiErrorResponse(error) {
  return {
    status: "error",
    paid: false,
    message: error.message || "Unexpected error"
  };
}



router.post(
  "/auth/register",
  [
    body("name").isLength({ min: 2 }),
    body("email").isEmail(),
    body("password").isLength({ min: 6 })
  ],
  async (req, res) => {
    const db = getDb();
    const validationResponse = errorsToResponse(req, res);
    if (validationResponse) return validationResponse;

    const email = req.body.email.toLowerCase();
    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const result = await db.collection("users").insertOne({
      name: req.body.name,
      email,
      password: passwordHash,
      role: "user",
      created_at: new Date()
    });

    return res.status(201).json({ id: result.insertedId.toString(), name: req.body.name, email, role: "user" });
  }
);

router.post(
  "/auth/login",
  [body("email").isEmail(), body("password").notEmpty()],
  async (req, res) => {
    const db = getDb();
    const validationResponse = errorsToResponse(req, res);
    if (validationResponse) return validationResponse;

    const email = req.body.email.toLowerCase();
    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "2h" }
    );

    return res.json({ token });
  }
);

router.post("/auth/logout", (_req, res) => res.json({ message: "Logged out" }));



router.get("/products", async (req, res) => {
  const db = getDb();
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
  const offset = (page - 1) * limit;

  const q = (req.query.q || "").trim();
  const categoryId = req.query.category || "";

  const filter = {};
  if (q) {
    const safeQuery = escapeRegex(q);
    filter.$or = [{ title: { $regex: safeQuery, $options: "i" } }, { description: { $regex: safeQuery, $options: "i" } }];
  }

  const categoryObjectId = toObjectId(categoryId);
  if (categoryId && categoryObjectId) {
    filter.category_id = categoryObjectId;
  }

  const [items, total] = await Promise.all([
    db.collection("products").find(filter).sort({ created_at: -1 }).skip(offset).limit(limit).toArray(),
    db.collection("products").countDocuments(filter)
  ]);

  const categories = await db.collection("categories").find({}).toArray();
  const categoryMap = new Map(categories.map((item) => [item._id.toString(), item]));

  const data = items.map((item) =>
    normalizeId({
      ...item,
      category: item.category_id ? normalizeId(categoryMap.get(item.category_id.toString())) : null
    })
  );

  return res.json({
    data,
    meta: {
      total,
      page,
      pageCount: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

router.get("/products/:id", async (req, res) => {
  const db = getDb();
  const productId = toObjectId(req.params.id);
  if (!productId) {
    return res.status(404).json({ message: "Product not found" });
  }

  const product = await db.collection("products").findOne({ _id: productId });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const category = product.category_id
    ? await db.collection("categories").findOne({ _id: product.category_id })
    : null;

  return res.json(normalizeId({ ...product, category: normalizeId(category) }));
});

router.post(
  "/products",
  apiAuth,
  apiAdmin,
  [body("title").notEmpty(), body("description").notEmpty(), body("price").isNumeric()],
  async (req, res) => {
    const db = getDb();
    const validationResponse = errorsToResponse(req, res);
    if (validationResponse) return validationResponse;

    const result = await db.collection("products").insertOne({
      title: req.body.title,
      description: req.body.description,
      price: Number(req.body.price),
      image: req.body.image || null,
      category_id: toObjectId(req.body.category_id),
      created_at: new Date()
    });

    const product = await db.collection("products").findOne({ _id: result.insertedId });
    return res.status(201).json(normalizeId(product));
  }
);

router.put("/products/:id", apiAuth, apiAdmin, async (req, res) => {
  const db = getDb();
  const productId = toObjectId(req.params.id);
  if (!productId) {
    return res.status(404).json({ message: "Product not found" });
  }

  const product = await db.collection("products").findOne({ _id: productId });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  await db.collection("products").updateOne(
    { _id: productId },
    {
      $set: {
        title: req.body.title ?? product.title,
        description: req.body.description ?? product.description,
        price: req.body.price !== undefined ? Number(req.body.price) : product.price,
        image: req.body.image ?? product.image,
        category_id: req.body.category_id ? toObjectId(req.body.category_id) : product.category_id
      }
    }
  );

  const updated = await db.collection("products").findOne({ _id: productId });
  return res.json(normalizeId(updated));
});

router.delete("/products/:id", apiAuth, apiAdmin, async (req, res) => {
  const db = getDb();
  const productId = toObjectId(req.params.id);
  if (!productId) {
    return res.status(404).json({ message: "Product not found" });
  }

  const deleted = await db.collection("products").deleteOne({ _id: productId });
  if (!deleted.deletedCount) {
    return res.status(404).json({ message: "Product not found" });
  }
  return res.status(204).send();
});

router.get("/categories", async (_req, res) => {
  const db = getDb();
  const categories = await db.collection("categories").find({}).sort({ name: 1 }).toArray();
  return res.json(categories.map((item) => normalizeId(item)));
});

router.post("/categories", apiAuth, apiAdmin, [body("name").notEmpty()], async (req, res) => {
  const db = getDb();
  const validationResponse = errorsToResponse(req, res);
  if (validationResponse) return validationResponse;

  const result = await db.collection("categories").insertOne({
    name: req.body.name,
    created_at: new Date()
  });
  const category = await db.collection("categories").findOne({ _id: result.insertedId });
  return res.status(201).json(normalizeId(category));
});

router.put("/categories/:id", apiAuth, apiAdmin, async (req, res) => {
  const db = getDb();
  const categoryId = toObjectId(req.params.id);
  if (!categoryId) {
    return res.status(404).json({ message: "Category not found" });
  }

  const category = await db.collection("categories").findOne({ _id: categoryId });
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  await db.collection("categories").updateOne({ _id: categoryId }, { $set: { name: req.body.name ?? category.name } });
  const updated = await db.collection("categories").findOne({ _id: categoryId });
  return res.json(normalizeId(updated));
});

router.delete("/categories/:id", apiAuth, apiAdmin, async (req, res) => {
  const db = getDb();
  const categoryId = toObjectId(req.params.id);
  if (!categoryId) {
    return res.status(404).json({ message: "Category not found" });
  }

  const deleted = await db.collection("categories").deleteOne({ _id: categoryId });
  if (!deleted.deletedCount) {
    return res.status(404).json({ message: "Category not found" });
  }
  return res.status(204).send();
});

router.get("/users", apiAuth, apiAdmin, async (_req, res) => {
  const db = getDb();
  const users = await db.collection("users").find({}, { projection: { password: 0 } }).sort({ created_at: -1 }).toArray();
  return res.json(users.map((item) => normalizeId(item)));
});

router.get("/orders", apiAuth, async (req, res) => {
  const db = getDb();
  const filter = req.apiUser.role === "admin" ? {} : { user_id: toObjectId(req.apiUser.id) };
  const orders = await db.collection("orders").find(filter).sort({ created_at: -1 }).toArray();
  return res.json(orders.map((item) => normalizeId(item)));
});

router.post(
  "/orders",
  apiAuth,
  [body("total_price").isNumeric().custom((value) => Number(value) > 0)],
  async (req, res) => {
    const db = getDb();
    const validationResponse = errorsToResponse(req, res);
    if (validationResponse) return validationResponse;

    const result = await db.collection("orders").insertOne({
      user_id: toObjectId(req.apiUser.id),
      total_price: Number(req.body.total_price),
      status: "pending",
      created_at: new Date()
    });

    const order = await db.collection("orders").findOne({ _id: result.insertedId });
    return res.status(201).json(normalizeId(order));
  }
);

router.put("/orders/:id/status", apiAuth, apiAdmin, async (req, res) => {
  const db = getDb();
  const orderId = toObjectId(req.params.id);
  if (!orderId) {
    return res.status(404).json({ message: "Order not found" });
  }

  const order = await db.collection("orders").findOne({ _id: orderId });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const allowedStatuses = ["pending", "paid", "cancelled"];
  const nextStatus = allowedStatuses.includes(req.body.status) ? req.body.status : null;
  if (!nextStatus) {
    return res.status(400).json({ message: "Invalid status" });
  }

  await db.collection("orders").updateOne({ _id: orderId }, { $set: { status: nextStatus } });
  const updated = await db.collection("orders").findOne({ _id: orderId });
  return res.json(normalizeId(updated));
});




router.post("/generate-khqr", async (req, res) => {
  try {
    const { product_id, amount } = req.body;
    if (!product_id || !amount) {
      return res.status(400).json({ status: "error", message: "Product ID and amount are required" });
    }

    // Get the item (could be product or category)
    const db = getDb();
    let product_id_obj = toObjectId(product_id);
    let category_id_obj = null;
    
    // First try finding as product
    const product = await db.collection("products").findOne({ _id: product_id_obj });
    if (product) {
      category_id_obj = product.category_id;
    } else {
      // If not product, try finding as category
      const category = await db.collection("categories").findOne({ _id: product_id_obj });
      if (category) {
        category_id_obj = category._id;
        product_id_obj = null; // Clear product_id if it's a category purchase
      }
    }

    // 1. Create the Order with 'pending' status first
    const orderData = {
      product_id: product_id_obj,
      category_id: category_id_obj,
      total_price: parseFloat(amount),
      status: "pending",
      created_at: new Date()
    };

    if (req.session && req.session.user) {
      orderData.user_id = toObjectId(req.session.user.id);
    }

    const orderResult = await db.collection("orders").insertOne(orderData);
    const order_id = orderResult.insertedId;

    // 2. Generate KHQR (passing the new order ID's string representation as billNumber)
    const result = await bakongService.generateKHQR(amount, "USD", order_id.toString());
    if (!result.success) {
      // If QR generation fails, we might want to delete the pending order or just leave it
      return res.status(500).json({ status: "error", message: result.message });
    }

    // 3. Save the pending transaction log
    await db.collection("payment_logs").insertOne({
      order_id: order_id,
      product_id: product_id_obj,
      category_id: category_id_obj,
      amount: parseFloat(amount),
      transaction_id: result.md5,
      status: "PENDING",
      created_at: new Date()
    });

    return res.json({
      status: "success",
      transaction_id: result.md5,
      qr_code: result.qr
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/check-payment", async (req, res) => {
  try {
    const { transaction_id } = req.query; // This is the MD5
    if (!transaction_id) {
      return res.status(400).json({ status: "error", message: "Transaction ID (md5) is required" });
    }

    const result = await bakongService.checkPayment(transaction_id);

    if (result.paid) {
      const db = getDb();
      // Update payment log
      const log = await db.collection("payment_logs").findOneAndUpdate(
        { transaction_id: transaction_id, status: "PENDING" },
        { $set: { status: "SUCCESS", paid_at: new Date(), raw_data: result.raw } },
        { returnDocument: "after" }
      );

      if (log) {
        // Update the existing pending order to 'paid'
        await db.collection("orders").updateOne(
          { _id: toObjectId(log.order_id) },
          { 
            $set: { 
              status: "paid", 
              transaction_id: transaction_id,
              paid_at: new Date() 
            } 
          }
        );
      }
      
      return res.json({
        status: "SUCCESS",
        message: "Payment successful",
        data: result
      });
    }

    return res.json({
      status: "PENDING",
      message: "Payment pending",
      data: result
    });
  } catch (error) {
    console.error("Error in /check-payment:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
