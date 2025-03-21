export function isEnumValue<T extends Record<string, unknown>>(
  value: unknown,
  enumObject: T
): value is T[keyof T] {
  return Object.values(enumObject).includes(value);
}
