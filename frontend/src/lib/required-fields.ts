type Shape = Record<string, { safeParse: (value: unknown) => { success: boolean } }>

/** Which fields of an object schema's shape are required: those it rejects when missing (a default or optional passes). */
export const requiredFields = <T extends Shape>(shape: T) =>
  Object.fromEntries(Object.entries(shape).map(([name, field]) => [name, !field.safeParse(undefined).success])) as Record<
    keyof T,
    boolean
  >
