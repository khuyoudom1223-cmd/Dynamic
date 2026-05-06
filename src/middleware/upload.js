const path = require("path");
const multer = require("multer");

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
  "video/mpeg",
  "video/ogg",
  "application/pdf"
];

const ALLOWED_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg",
  ".mp4", ".webm", ".mov", ".mkv", ".avi", ".mpeg", ".mpg", ".ogg",
  ".pdf"
];

function buildLocalStorage() {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(process.cwd(), "public", "uploads"));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "-");
      cb(null, `${Date.now()}-${safeName}${ext}`);
    }
  });
}

function buildCloudinaryStorage() {
  const { v2: cloudinary } = require("cloudinary");
  const { CloudinaryStorage } = require("multer-storage-cloudinary");

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  return new CloudinaryStorage({
    cloudinary,
    params: (_req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "-");
      const isVideo = file.mimetype.startsWith("video/") || [".mp4", ".webm", ".mov", ".mkv"].includes(ext);

      return {
        folder: process.env.CLOUDINARY_FOLDER || "dynamics-node/uploads",
        resource_type: "auto",
        public_id: `${Date.now()}-${safeName}`,
        overwrite: false,
        format: isVideo ? undefined : "webp"
      };
    }
  });
}

function hasCloudinaryCredentials() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function resolveStorageRuntimeInfo() {
  const requestedCloudinary = process.env.FILE_STORAGE === "cloudinary";
  const hasCredentials = hasCloudinaryCredentials();

  if (requestedCloudinary && hasCredentials) {
    return {
      storage: buildCloudinaryStorage(),
      requestedMode: "Cloudinary",
      activeMode: "Cloudinary",
      isFallback: false,
      warning: ""
    };
  }

  if (requestedCloudinary && !hasCredentials) {
    return {
      storage: buildLocalStorage(),
      requestedMode: "Cloudinary",
      activeMode: "Local",
      isFallback: true,
      warning: "Cloudinary mode requested, but credentials are missing. Falling back to Local storage."
    };
  }

  return {
    storage: buildLocalStorage(),
    requestedMode: "Local",
    activeMode: "Local",
    isFallback: false,
    warning: ""
  };
}

const runtimeInfo = resolveStorageRuntimeInfo();

if (runtimeInfo.warning) {
  console.warn(`[upload] ${runtimeInfo.warning}`);
}

const upload = multer({
  storage: runtimeInfo.storage,
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mimetype = file.mimetype.toLowerCase();
    const extension = path.extname(file.originalname).toLowerCase();

    if (ALLOWED_MIME_TYPES.includes(mimetype) || ALLOWED_EXTENSIONS.includes(extension)) {
      return cb(null, true);
    }

    return cb(new Error("Unsupported file type. Please upload image, video, or PDF files only."));
  }
});

upload.getStorageInfo = () => ({
  requestedMode: runtimeInfo.requestedMode,
  activeMode: runtimeInfo.activeMode,
  isFallback: runtimeInfo.isFallback,
  warning: runtimeInfo.warning
});

module.exports = upload;
