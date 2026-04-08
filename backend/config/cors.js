const DEFAULT_ALLOWED_ORIGINS = [
  "https://healwayx.vercel.app",
  "https://www.healwayx.vercel.app",
  "https://healway.com",
  "https://www.healway.com",
  "https://healwayy.com",
  "https://www.healwayy.com",
  "https://*.healway.com",
  "https://*.healwayy.com",
  "http://localhost:3000",
  "http://localhost:*",
  "https://localhost:*",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:*",
  "https://127.0.0.1:*",
  "http://172.26.201.42:3000",
  "http://172.26.201.42:*",
  "https://zjbmtdgq-3000.inc1.devtunnels.ms",
  "capacitor://localhost",
  "ionic://localhost",
];

const trimOrigin = (origin) => {
  if (typeof origin !== "string") {
    return origin;
  }

  return origin.trim().replace(/\/$/, "");
};

const splitOriginList = (value) => {
  if (!value || typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map(trimOrigin)
    .filter(Boolean);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matchesWildcardOrigin = (origin, allowedOrigin) => {
  if (allowedOrigin === origin) {
    return true;
  }

  if (!allowedOrigin.includes("*")) {
    return false;
  }

  const pattern = `^${escapeRegex(allowedOrigin).replace(/\\\*/g, ".*")}$`;
  return new RegExp(pattern, "i").test(origin);
};

const buildAllowedOrigins = () => {
  const envOrigins = [
    ...splitOriginList(process.env.CORS_ORIGINS),
    ...splitOriginList(process.env.FRONTEND_URL),
    ...splitOriginList(process.env.SOCKET_IO_CORS_ORIGIN),
  ];

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins].map(trimOrigin).filter(Boolean))];
};

const isAllowedOrigin = (origin, allowedOrigins = buildAllowedOrigins()) => {
  const normalizedOrigin = trimOrigin(origin);

  if (!normalizedOrigin) {
    return true;
  }

  if (normalizedOrigin === "null") {
    return process.env.CORS_ALLOW_NULL_ORIGIN === "true";
  }

  if (allowedOrigins.some((allowedOrigin) => matchesWildcardOrigin(normalizedOrigin, allowedOrigin))) {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    const isLocalhostOrigin =
      /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin) ||
      normalizedOrigin.includes("localhost") ||
      normalizedOrigin.includes("127.0.0.1");

    if (isLocalhostOrigin) {
      return true;
    }
  }

  return false;
};

const createCorsOriginChecker = ({ label = "CORS" } = {}) => {
  const allowedOrigins = buildAllowedOrigins();

  return (origin, callback) => {
    if (isAllowedOrigin(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }

    console.warn(`[${label}] Blocked origin: ${origin || "<no-origin>"}`);
    console.warn(`[${label}] Allowed origins: ${allowedOrigins.join(", ")}`);
    callback(null, false);
  };
};

module.exports = {
  buildAllowedOrigins,
  createCorsOriginChecker,
  isAllowedOrigin,
  splitOriginList,
  trimOrigin,
};
