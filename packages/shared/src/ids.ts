import { nanoid } from 'nanoid';

/**
 * Generate a new entity id. Clients treat `_id` as an opaque string, so new
 * rows use nanoid (URL-safe, Web-Crypto-backed); rows migrated from MongoDB
 * keep their original 24-hex ObjectId values.
 */
export const newId = (): string => nanoid();
