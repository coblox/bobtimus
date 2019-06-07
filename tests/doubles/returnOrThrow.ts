export default function returnOrThrow<T extends object>(
  instance: T,
  field: keyof T
): any {
  const candidate = instance[field];

  if (candidate) {
    return candidate;
  } else {
    throw new Error(
      `Mock ${instance.constructor.name} was not configured to return ${field}`
    );
  }
}
