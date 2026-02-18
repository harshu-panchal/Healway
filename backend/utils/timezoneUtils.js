/**
 * Timezone utility functions
 * All doctor session time operations use IST (Indian Standard Time, UTC+5:30)
 */

/**
 * Get current date and time components in IST (Indian Standard Time, UTC+5:30)
 * Uses Intl.DateTimeFormat to get accurate IST time components
 * @returns {Object} Object with IST time components
 */
const getISTComponents = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const components = {};
  parts.forEach(part => {
    components[part.type] = part.value;
  });
  
  return {
    year: parseInt(components.year),
    month: parseInt(components.month) - 1, // JavaScript months are 0-indexed
    day: parseInt(components.day),
    hour: parseInt(components.hour),
    minute: parseInt(components.minute),
    second: parseInt(components.second),
  };
};

/**
 * Get current date and time in IST (Indian Standard Time, UTC+5:30)
 * Returns a Date object created from IST components
 * @returns {Date} Current date/time in IST
 */
const getISTTime = () => {
  const components = getISTComponents();
  // Create Date object from IST components
  // Note: This creates a Date in local timezone, but with IST values
  // For comparisons, we'll use the components directly
  return new Date(
    components.year,
    components.month,
    components.day,
    components.hour,
    components.minute,
    components.second
  );
};

/**
 * Get current date in IST (start of day, 00:00:00)
 * @returns {Date} Current date in IST with time set to 00:00:00
 */
const getISTDate = () => {
  const components = getISTComponents();
  return new Date(components.year, components.month, components.day, 0, 0, 0, 0);
};

/**
 * Get IST date components for comparison (year, month, day)
 * Returns plain numbers without creating Date objects to avoid timezone issues
 * @returns {Object} Object with year, month (0-11), day properties
 */
const getISTDateComponents = () => {
  const components = getISTComponents();
  return {
    year: components.year,
    month: components.month,
    day: components.day,
  };
};

/**
 * Get current hour and minute in IST
 * @returns {Object} Object with hour and minute properties
 */
const getISTHourMinute = () => {
  const components = getISTComponents();
  return {
    hour: components.hour,
    minute: components.minute,
  };
};

/**
 * Get current time in minutes (from midnight) in IST
 * @returns {Number} Current time in minutes from midnight (IST)
 */
const getISTTimeInMinutes = () => {
  const components = getISTComponents();
  return components.hour * 60 + components.minute;
};

/**
 * Get current time formatted as string in IST (12-hour format with AM/PM)
 * @returns {string} Current time in IST formatted as "HH:MM AM/PM"
 */
const getISTTimeString = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return formatter.format(now);
};

/**
 * Parse date and return IST date components for comparison
 * @param {string|Date} date - Date string (YYYY-MM-DD) or Date object
 * @returns {Object} Object with year, month (0-11), day properties
 */
const parseDateInISTComponents = (date) => {
  if (!date) {
    return getISTDateComponents();
  }

  if (date instanceof Date) {
    // Convert Date to IST components
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(date);
    const components = {};
    parts.forEach(part => {
      components[part.type] = part.value;
    });
    
    return {
      year: parseInt(components.year),
      month: parseInt(components.month) - 1,
      day: parseInt(components.day),
    };
  }

  if (typeof date === 'string') {
    // Handle YYYY-MM-DD format
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split('-').map(Number);
      return {
        year,
        month: month - 1,
        day,
      };
    } else {
      // For other formats, parse normally and convert to IST
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date format: ${date}`);
      }
      return parseDateInISTComponents(parsedDate); // Recursive call with Date object
    }
  }

  throw new Error(`Invalid date type: ${typeof date}`);
};

/**
 * Parse a date string in IST timezone
 * Handles YYYY-MM-DD format and creates a Date object representing that date in IST
 * @param {string|Date} date - Date string (YYYY-MM-DD) or Date object
 * @returns {Date} Date object representing the date in IST (time set to 00:00:00)
 */
const parseDateInIST = (date) => {
  if (!date) {
    return getISTDate(); // Return current IST date if no date provided
  }

  if (date instanceof Date) {
    // If it's already a Date object, convert it to IST representation
    // Get the date components in IST timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(date);
    const components = {};
    parts.forEach(part => {
      components[part.type] = part.value;
    });
    
    return new Date(
      parseInt(components.year),
      parseInt(components.month) - 1,
      parseInt(components.day),
      0, 0, 0, 0
    );
  }

  if (typeof date === 'string') {
    // Handle YYYY-MM-DD format - parse directly as IST date
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split('-').map(Number);
      // Create date representing YYYY-MM-DD at 00:00:00 in IST
      // We create a UTC date and then interpret it in IST context
      // To get accurate IST representation, we use a date in IST timezone
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      // For other formats, parse normally and convert to IST
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date format: ${date}`);
      }
      // Convert to IST representation
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      
      const parts = formatter.formatToParts(parsedDate);
      const components = {};
      parts.forEach(part => {
        components[part.type] = part.value;
      });
      
      return new Date(
        parseInt(components.year),
        parseInt(components.month) - 1,
        parseInt(components.day),
        0, 0, 0, 0
      );
    }
  }

  throw new Error(`Invalid date type: ${typeof date}`);
};

module.exports = {
  getISTTime,
  getISTDate,
  getISTDateComponents,
  getISTHourMinute,
  getISTTimeInMinutes,
  getISTTimeString,
  parseDateInIST,
  parseDateInISTComponents,
};

