export const normalizeJsonPayload = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => item === undefined ? null : normalizeJsonPayload(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, normalizeJsonPayload(item)]),
    );
  }
  return value;
};
