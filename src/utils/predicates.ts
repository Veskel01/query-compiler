export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isObject(val: unknown): val is Record<number | string | symbol, unknown> {
  return !isNil(val) && typeof val === 'object';
}

export function isEmptyObject(value: object): boolean {
  return isObject(value) && Object.keys(value).length === 0;
}
