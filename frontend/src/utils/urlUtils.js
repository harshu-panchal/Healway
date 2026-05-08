const DEFAULT_API_BASE_URL = "http://localhost:5000/api";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const collapseDuplicateProtocols = (value) => {
  const protocolPrefixMatch = value.match(/^(https?:\/\/)+/i);
  if (!protocolPrefixMatch) {
    return value;
  }

  const protocolPrefix = protocolPrefixMatch[0].toLowerCase();
  const preferredProtocol = protocolPrefix.includes("https://")
    ? "https://"
    : "http://";
  return preferredProtocol + value.slice(protocolPrefixMatch[0].length);
};

const ensureProtocol = (value) => {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const hostname = value.split("/")[0].toLowerCase();
  const protocol = LOCAL_HOSTS.has(hostname) ? "http://" : "https://";
  return `${protocol}${value}`;
};

const stripApiSuffix = (pathname) => {
  const trimmedPath = pathname.replace(/\/+$/, "");
  return trimmedPath.endsWith("/api")
    ? trimmedPath.slice(0, -4)
    : trimmedPath;
};

export const getSocketBaseUrl = (rawApiBaseUrl) => {
  const sourceValue = (rawApiBaseUrl || DEFAULT_API_BASE_URL).trim();
  const withSingleProtocol = collapseDuplicateProtocols(sourceValue);
  const withProtocol = ensureProtocol(withSingleProtocol);

  try {
    const parsedUrl = new URL(withProtocol);
    const socketPath = stripApiSuffix(parsedUrl.pathname);
    return `${parsedUrl.origin}${socketPath}`.replace(/\/+$/, "");
  } catch (error) {
    console.warn(
      "[socket-url] Invalid VITE_API_BASE_URL, falling back to localhost:",
      sourceValue,
      error
    );
    return "http://localhost:5000";
  }
};

export default {
  getSocketBaseUrl,
};
