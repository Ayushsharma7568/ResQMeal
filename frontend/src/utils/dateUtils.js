/**
 * Date and Timezone Utilities for MORSL
 * Provides accurate UTC-to-local and local-to-UTC date serialization and display formatting.
 */

/**
 * Format a Date into a string suitable for HTML <input type="datetime-local" /> ("YYYY-MM-DDTHH:mm")
 * in the client's local timezone.
 */
export const toLocalDatetimeInputString = (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Serialize an HTML <input type="datetime-local" /> value (e.g. "2026-11-14T14:30")
 * to a standard ISO 8601 UTC string (e.g. "2026-11-14T09:00:00.000Z") that accurately preserves
 * the client's local timezone offset when stored in MongoDB/Node.js.
 *
 * If the input string already contains timezone information (e.g. ending in 'Z' or '+05:30'),
 * it parses and returns the corresponding UTC ISO string without altering the intended instant.
 */
export const serializeLocalDatetimeToISO = (inputVal) => {
  if (!inputVal) return inputVal;
  try {
    const trimmed = String(inputVal).trim();
    // If it already contains an explicit timezone designator (Z or +/-offset), preserve it
    if (/Z|[+-]\d{2}(?::?\d{2})?$/i.test(trimmed)) {
      const d = new Date(trimmed);
      return !isNaN(d.getTime()) ? d.toISOString() : trimmed;
    }

    // For local datetime string without offset: "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
    const [datePart, timePart = '00:00'] = trimmed.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);

    // Create local Date instance using local constructor
    const localDate = new Date(year, month - 1, day, hour, minute, second);
    return !isNaN(localDate.getTime()) ? localDate.toISOString() : trimmed;
  } catch (err) {
    console.error('Error serializing local datetime to ISO:', err);
    return inputVal;
  }
};

/**
 * Format a stored date/deadline to the client's local readable string.
 * Consistently converts stored UTC ISO timestamps (ending in Z or offset) to local browser time.
 * If a date was stored as a local wall-clock string without offset,
 * parses it directly as local wall-clock time so it does not double-shift by +05:30.
 */
export const formatDisplayDate = (dateVal, options = { dateStyle: 'short', timeStyle: 'short' }) => {
  if (!dateVal) return '—';
  try {
    let d;
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      const hasTimezone = /Z|[+-]\d{2}(?::?\d{2})?$/i.test(trimmed);
      if (!hasTimezone) {
        // Wall-clock string without offset (e.g. "2026-11-14T14:30:00" or "2026-11-14 14:30")
        const isoLike = trimmed.replace(' ', 'T');
        const [datePart, timePart = '00:00:00'] = isoLike.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
        d = new Date(year, month - 1, day, hour, minute, second);
      } else {
        d = new Date(trimmed);
      }
    } else {
      d = new Date(dateVal);
    }

    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString([], options);
  } catch (err) {
    console.error('Date formatting error:', err);
    return '—';
  }
};

/**
 * Format a stored date/deadline to the client's local readable time string (e.g. "02:30 PM").
 */
export const formatDisplayTime = (dateVal, options = { hour: '2-digit', minute: '2-digit' }) => {
  if (!dateVal) return '—';
  try {
    let d;
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      const hasTimezone = /Z|[+-]\d{2}(?::?\d{2})?$/i.test(trimmed);
      if (!hasTimezone) {
        const isoLike = trimmed.replace(' ', 'T');
        const [datePart, timePart = '00:00:00'] = isoLike.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
        d = new Date(year, month - 1, day, hour, minute, second);
      } else {
        d = new Date(trimmed);
      }
    } else {
      d = new Date(dateVal);
    }

    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], options);
  } catch (err) {
    console.error('Time formatting error:', err);
    return '—';
  }
};

