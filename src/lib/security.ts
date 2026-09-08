import { createHash, randomBytes, timingSafeEqual } from "crypto";

const tokenByteLength = 32;

export function createOpaqueToken() {
  return randomBytes(tokenByteLength).toString("base64url");
}

export function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function isSecretHashMatch(secret: string, storedHash: string) {
  const incomingHash = hashSecret(secret);
  const incomingBuffer = Buffer.from(incomingHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  return (
    incomingBuffer.length === storedBuffer.length &&
    timingSafeEqual(incomingBuffer, storedBuffer)
  );
}
