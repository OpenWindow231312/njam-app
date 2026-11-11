/**
 * Where Supabase keeps the sign-in session on the phone.
 *
 * The session holds the access token and the refresh token. Anyone who copies
 * the refresh token can stay signed in as you, so it should not sit in plain
 * AsyncStorage, which is an unencrypted file. expo-secure-store puts it in the
 * iOS Keychain or the Android Keystore instead, which the system encrypts and
 * keeps away from other apps.
 *
 * Two details make this longer than a one-line swap:
 *
 * 1. SecureStore is meant for small values. Above 2048 bytes it warns, and
 *    some phones refuse to save it. A Supabase session is often bigger than
 *    that, so it is cut into chunks, each saved under its own key:
 *      sb-xxx-auth-token.count = "3"
 *      sb-xxx-auth-token.0     = first chunk
 *      sb-xxx-auth-token.1     = ...
 *
 * 2. SecureStore does not exist in a web browser. The Expo web preview keeps
 *    using AsyncStorage, which on the web is the browser's localStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Characters per chunk. Most of a session is plain ASCII, one byte per
 * character, but a name like "Zoë" takes more, so this leaves room under the
 * 2048-byte limit.
 */
const CHUNK_SIZE = 1000;

const countKey = (key: string) => `${key}.count`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

/** How many chunks are saved under this key now. 0 if none. */
async function readCount(key: string): Promise<number> {
  const count = await SecureStore.getItemAsync(countKey(key));
  return count ? Number(count) : 0;
}

/** Deletes chunks from `from` up to (not including) `to`. */
async function deleteChunks(key: string, from: number, to: number): Promise<void> {
  for (let index = from; index < to; index++) {
    await SecureStore.deleteItemAsync(chunkKey(key, index));
  }
}

async function getItem(key: string): Promise<string | null> {
  const count = await readCount(key);
  if (count === 0) return null;

  const chunks: string[] = [];
  for (let index = 0; index < count; index++) {
    const chunk = await SecureStore.getItemAsync(chunkKey(key, index));
    // A chunk is missing: the save was interrupted. Treat it as signed out
    // rather than hand Supabase half a session.
    if (chunk === null) return null;
    chunks.push(chunk);
  }
  return chunks.join('');
}

async function setItem(key: string, value: string): Promise<void> {
  const oldCount = await readCount(key);

  const chunks: string[] = [];
  for (let start = 0; start < value.length; start += CHUNK_SIZE) {
    chunks.push(value.slice(start, start + CHUNK_SIZE));
  }

  for (let index = 0; index < chunks.length; index++) {
    await SecureStore.setItemAsync(chunkKey(key, index), chunks[index]);
  }
  await SecureStore.setItemAsync(countKey(key), String(chunks.length));

  // A shorter session than last time: remove the chunks it no longer uses.
  await deleteChunks(key, chunks.length, oldCount);

  // Before this file, the session was saved in AsyncStorage under the same
  // key. Remove that old, unencrypted copy so it does not stay on the phone.
  await AsyncStorage.removeItem(key);
}

async function removeItem(key: string): Promise<void> {
  const count = await readCount(key);
  await deleteChunks(key, 0, count);
  await SecureStore.deleteItemAsync(countKey(key));
}

/** The storage Supabase is given in src/lib/supabase.ts. */
export const secureSessionStorage =
  Platform.OS === 'web' ? AsyncStorage : { getItem, setItem, removeItem };
