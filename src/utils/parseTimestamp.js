/**
 * Parses a raw timestamp string from the CBM API into a valid Date object.
 * Returns the current date as fallback when the input is missing or invalid.
 */
function parseTimestamp(rawTs) {
  if (rawTs && typeof rawTs === 'string' && rawTs.trim()) {
    const parsed = new Date(rawTs.replace(' ', 'T') + '-03:00');
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

module.exports = { parseTimestamp };
