// Shared validation for the isolated optional Copilot SDK bridge.
export const MAX_BODY_BYTES = 80000;
export const MAX_MESSAGE_CHARS = 30000;
export const MAX_OUTPUT_CHARS = 50000;
export function validCopilotRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  if (typeof body.token !== 'string' || !/^gh[ou]_[A-Za-z0-9_]+$/.test(body.token) || body.token.length > 1000) return false;
  if (!Array.isArray(body.messages) || body.messages.length !== 2) return false;
  if (body.messages[0]?.role !== 'system' || body.messages[1]?.role !== 'user') return false;
  if (!body.messages.every(m => m && typeof m.content === 'string' && m.content.length > 0 && m.content.length <= MAX_MESSAGE_CHARS)) return false;
  return true;
}
export function validCopilotOutput(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_OUTPUT_CHARS;
}

// Railpack/container may start before administrators finish secret provisioning; only liveness is public.
export function validCopilotServiceSecret(secret) {
  return typeof secret === 'string' && secret.length >= 32 && secret.length <= 256 && !/\s/.test(secret);
}
