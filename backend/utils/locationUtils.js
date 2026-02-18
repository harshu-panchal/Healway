const LOCATION_SOURCES = ['manual', 'gps'];

const normalizeLocationSource = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return normalized;
};

const parseGeoPoint = ({
  location,
  coordinates,
  lat,
  lng,
  latitude,
  longitude,
} = {}) => {
  const hasLocationValue = location !== undefined;
  const hasCoordinatesValue = coordinates !== undefined;
  const hasLatLngValue =
    lat !== undefined ||
    lng !== undefined ||
    latitude !== undefined ||
    longitude !== undefined;

  const provided =
    hasLocationValue || hasCoordinatesValue || hasLatLngValue;

  if (location === null || coordinates === null) {
    return { point: null, provided: true };
  }

  let candidateCoordinates;

  const extractCoordinatesFromObject = (value) => {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    if (
      typeof value.type === 'string' &&
      value.type.toLowerCase() === 'point' &&
      Array.isArray(value.coordinates)
    ) {
      return value.coordinates;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (Array.isArray(value.location)) {
      return value.location;
    }

    return undefined;
  };

  candidateCoordinates = extractCoordinatesFromObject(location);

  if (!candidateCoordinates && Array.isArray(location)) {
    candidateCoordinates = location;
  }

  if (!candidateCoordinates && Array.isArray(coordinates)) {
    candidateCoordinates = coordinates;
  }

  const normalizedLat = lat ?? latitude;
  const normalizedLng = lng ?? longitude;

  if (
    !candidateCoordinates &&
    normalizedLat !== undefined &&
    normalizedLng !== undefined
  ) {
    candidateCoordinates = [normalizedLng, normalizedLat];
  }

  if (!candidateCoordinates) {
    if (provided) {
      if (
        (normalizedLat !== undefined && normalizedLng === undefined) ||
        (normalizedLng !== undefined && normalizedLat === undefined)
      ) {
        return {
          point: null,
          provided: true,
          error: 'Both latitude and longitude are required for location.',
        };
      }

      return {
        point: null,
        provided: true,
        error: 'Location coordinates must be provided as [lng, lat].',
      };
    }

    return { point: null, provided: false };
  }

  if (!Array.isArray(candidateCoordinates) || candidateCoordinates.length !== 2) {
    return {
      point: null,
      provided: true,
      error: 'Location coordinates must contain exactly two values: [lng, lat].',
    };
  }

  const numericLng = Number(candidateCoordinates[0]);
  const numericLat = Number(candidateCoordinates[1]);

  if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) {
    return {
      point: null,
      provided: true,
      error: 'Location latitude and longitude must be numeric values.',
    };
  }

  if (numericLat < -90 || numericLat > 90) {
    return {
      point: null,
      provided: true,
      error: 'Location latitude must be between -90 and 90 degrees.',
    };
  }

  if (numericLng < -180 || numericLng > 180) {
    return {
      point: null,
      provided: true,
      error: 'Location longitude must be between -180 and 180 degrees.',
    };
  }

  return {
    point: {
      type: 'Point',
      coordinates: [numericLng, numericLat],
    },
    provided: true,
  };
};

const extractAddressLocation = (rawAddress) => {
  if (rawAddress === undefined) {
    return {
      address: undefined,
      addressProvided: false,
      location: undefined,
      locationProvided: false,
      locationSource: undefined,
      locationSourceProvided: false,
    };
  }

  if (rawAddress === null) {
    return {
      address: undefined,
      addressProvided: true,
      location: null,
      locationProvided: true,
      locationSource: undefined,
      locationSourceProvided: false,
    };
  }

  let addressObject;

  if (typeof rawAddress === 'string') {
    addressObject = { line1: rawAddress };
  } else if (typeof rawAddress === 'object') {
    addressObject = { ...rawAddress };
  } else {
    return {
      address: undefined,
      addressProvided: true,
      location: undefined,
      locationProvided: false,
      locationSource: undefined,
      locationSourceProvided: false,
    };
  }

  const rawLocationSource =
    addressObject.locationSource ?? addressObject.location_source;
  const normalizedLocationSource = normalizeLocationSource(rawLocationSource);

  const { point, provided: locationProvided, error } = parseGeoPoint({
    location: addressObject.location,
    coordinates:
      addressObject.coordinates ?? addressObject.locationCoordinates,
    lat: addressObject.lat ?? addressObject.latitude,
    lng: addressObject.lng ?? addressObject.longitude,
    latitude: addressObject.latitude,
    longitude: addressObject.longitude,
  });

  delete addressObject.location;
  delete addressObject.coordinates;
  delete addressObject.locationCoordinates;
  delete addressObject.lat;
  delete addressObject.lng;
  delete addressObject.latitude;
  delete addressObject.longitude;
  delete addressObject.locationSource;
  delete addressObject.location_source;

  const sanitizedAddress =
    Object.keys(addressObject).length > 0 ? addressObject : undefined;

  return {
    address: sanitizedAddress,
    addressProvided: true,
    location: point,
    locationProvided,
    locationSource: normalizedLocationSource,
    locationSourceProvided: rawLocationSource !== undefined,
    error,
  };
};

module.exports = {
  LOCATION_SOURCES,
  normalizeLocationSource,
  parseGeoPoint,
  extractAddressLocation,
};


