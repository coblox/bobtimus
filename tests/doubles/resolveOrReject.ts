export default function returnOrThrow<T extends object>(
  instance: T,
  field: keyof T
): Promise<any> {
  const candidate = instance[field];

  if (candidate) {
    return Promise.resolve(candidate);
  } else {
    return Promise.reject(
      `Mock ${instance.constructor.name} was not configured to return ${field}`
    );
  }
}
