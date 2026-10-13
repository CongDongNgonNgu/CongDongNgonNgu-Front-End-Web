export function parseMessageSequence(value: unknown): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(value))
    throw new Error("Invalid communication sequence");
  const sequence = BigInt(value);
  if (sequence > 9223372036854775807n)
    throw new Error("Invalid communication sequence");
  return sequence;
}
