const { parseTimestamp } = require('./parseTimestamp');

describe('parseTimestamp', () => {
  it('parses a valid CBM API timestamp with space separator', () => {
    const result = parseTimestamp('2026-03-16 14:30:00');
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
    // Should interpret as -03:00 (BRT)
    expect(result.toISOString()).toBe('2026-03-16T17:30:00.000Z');
  });

  it('parses a valid timestamp already in ISO format', () => {
    const result = parseTimestamp('2026-03-16T14:30:00');
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });

  it('returns current date for null input', () => {
    const before = Date.now();
    const result = parseTimestamp(null);
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns current date for undefined input', () => {
    const before = Date.now();
    const result = parseTimestamp(undefined);
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns current date for empty string', () => {
    const before = Date.now();
    const result = parseTimestamp('');
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns current date for whitespace-only string', () => {
    const before = Date.now();
    const result = parseTimestamp('   ');
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns current date for a non-string value (number)', () => {
    const before = Date.now();
    const result = parseTimestamp(12345);
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns current date for a completely invalid string', () => {
    const before = Date.now();
    const result = parseTimestamp('not-a-date');
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });

  it('never returns an Invalid Date (NaN)', () => {
    const inputs = [null, undefined, '', '   ', 0, false, 'garbage', {}, [], 'NaN'];
    for (const input of inputs) {
      const result = parseTimestamp(input);
      expect(isNaN(result.getTime())).toBe(false);
    }
  });
});
