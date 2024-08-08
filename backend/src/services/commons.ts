export function bigIntToHex(n: string | bigint | number): string {
  return `0x${BigInt(n).toString(16)}`;
}
