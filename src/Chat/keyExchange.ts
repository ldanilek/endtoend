import { useMutation, useQuery } from 'convex/react';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../convex/_generated/api';

const DB_NAME = 'CryptoKeyStore';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export function useKeyPair() {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [publicKeyBase64, setPublicKeyBase64] = useState<string | null>(null);
  const user = useQuery(api.users.viewer);
  const storeKeyForUser = useMutation(api.users.storeKey);
  const currentKey = useQuery(api.users.getPublicKey, user ? { userId: user._id } : "skip");

  const openDatabase = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.createObjectStore(STORE_NAME);
      };
    });
  }, []);

  const getKey = useCallback((store: IDBObjectStore, keyName: string): Promise<CryptoKey | null> => {
    return new Promise((resolve, reject) => {
      const request = store.get(keyName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, []);

  const storeKey = useCallback((store: IDBObjectStore, keyName: string, key: CryptoKey): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = store.put(key, keyName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }, []);

  const generateKeyPair = useCallback(async () => {
    try {
      const generatedKeyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        true,
        ['deriveKey', 'deriveBits']
      ) as KeyPair;

      const db = await openDatabase();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await Promise.all([
        storeKey(store, 'publicKey', generatedKeyPair.publicKey),
        storeKey(store, 'privateKey', generatedKeyPair.privateKey)
      ]);

      setKeyPair(generatedKeyPair);

      const publicKeyRaw = await window.crypto.subtle.exportKey('raw', generatedKeyPair.publicKey);
      const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)));
      setPublicKeyBase64(publicKeyBase64);

    } catch (error) {
      console.error('Error generating key pair:', error);
    }
  }, [openDatabase, storeKey]);

  useEffect(() => {
    if (publicKeyBase64 && currentKey === null) {
      void storeKeyForUser({ key: publicKeyBase64 });
    }
  }, [publicKeyBase64, currentKey, storeKeyForUser]);

  const loadOrGenerateKeyPair = useCallback(async () => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const publicKey = await getKey(store, 'publicKey');
      const privateKey = await getKey(store, 'privateKey');

      if (publicKey && privateKey) {
        const loadedKeyPair = { publicKey, privateKey };
        setKeyPair(loadedKeyPair);
        const publicKeyRaw = await window.crypto.subtle.exportKey('raw', publicKey);
        const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)));
        setPublicKeyBase64(publicKeyBase64);
      } else {
        await generateKeyPair();
      }
    } catch (error) {
      console.error('Error loading key pair:', error);
      await generateKeyPair();
    }
  }, [openDatabase, getKey, generateKeyPair]);

  const deriveSharedSecret = useCallback(async (otherPublicKeyBase64: string) => {
    if (!keyPair) {
      return null;
    }

    try {
      // Import the other party's public key
      const otherPublicKeyBuffer = Uint8Array.from(atob(otherPublicKeyBase64), c => c.charCodeAt(0));
      const otherPublicKey = await window.crypto.subtle.importKey(
        'raw',
        otherPublicKeyBuffer,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        []
      );

      // Perform the key exchange
      const sharedSecret = await window.crypto.subtle.deriveBits(
        { name: 'ECDH', public: otherPublicKey },
        keyPair.privateKey,
        256
      );

      // Derive an AES key from the shared secret
      const aesKey = await window.crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new Uint8Array(0) },
        await window.crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveKey']),
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      return aesKey;
    } catch (error) {
      console.error('Error deriving shared secret:', error);
      throw error;
    }
  }, [keyPair]);

  useEffect(() => {
    if (user) {
      void loadOrGenerateKeyPair();
    }
  }, [loadOrGenerateKeyPair, user]);

  return { keyPair, publicKeyBase64, deriveSharedSecret };
}