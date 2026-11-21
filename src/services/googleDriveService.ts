import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { File } from "expo-file-system";
import Constants from "expo-constants";

/**
 * Servicio de integración con Google Drive para Android (y multiplataforma).
 *
 * Utiliza el scope `drive.appdata` para almacenar la base de datos cifrada (`cajita.db`)
 * de forma invisible y segura en el Google Drive personal del usuario, sin riesgo de
 * que sea eliminada accidentalmente desde la interfaz estándar de Drive.
 */

const STORAGE_KEY_TOKEN = "cajita_gdrive_token_v1";
const STORAGE_KEY_EMAIL = "cajita_gdrive_email_v1";
const STORAGE_KEY_EXPIRES = "cajita_gdrive_expires_v1";
const STORAGE_KEY_CLIENT_ID = "cajita_gdrive_client_id_v1";

// Client ID configurado mediante variables de entorno (EXPO_PUBLIC_*) o configuración de Expo
export const DEFAULT_GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  (Constants.expoConfig?.extra?.googleClientId as string | undefined) ||
  "";

// Redirect URI configurado para la app web puente (GitHub Pages o dominio propio)
export const DEFAULT_GOOGLE_REDIRECT_URI =
  process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI ||
  "https://theofyisu.github.io/Cajita/oauth/google/";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const GOOGLE_DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const SCOPES = [
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export interface GoogleDriveAccount {
  email: string | null;
  connected: boolean;
}

let cachedToken: string | null = null;
let cachedEmail: string | null = null;

export async function getGoogleDriveAccount(): Promise<GoogleDriveAccount> {
  if (Platform.OS === "web") return { email: null, connected: false };
  try {
    const token = await getValidToken();
    const email = cachedEmail ?? (await SecureStore.getItemAsync(STORAGE_KEY_EMAIL));
    return {
      email,
      connected: Boolean(token),
    };
  } catch {
    return { email: null, connected: false };
  }
}

export async function isGoogleDriveConnected(): Promise<boolean> {
  const token = await getValidToken();
  return Boolean(token);
}

export async function setGoogleClientId(clientId: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY_CLIENT_ID, clientId.trim());
}

export async function getGoogleClientId(): Promise<string | null> {
  const custom = await SecureStore.getItemAsync(STORAGE_KEY_CLIENT_ID);
  return custom || DEFAULT_GOOGLE_CLIENT_ID || null;
}

/**
 * Inicia el flujo OAuth con Google usando WebBrowser.
 * Si no se proporciona un clientId propio, permite configurar uno personalizado
 * o usar el guardado en almacenamiento seguro.
 */
export async function connectGoogleDrive(customClientId?: string): Promise<{ ok: boolean; email?: string; reason?: string }> {
  try {
    const clientId = customClientId ?? (await getGoogleClientId());
    if (!clientId) {
      return {
        ok: false,
        reason: "missing-client-id",
      };
    }

    const redirectUri = DEFAULT_GOOGLE_REDIRECT_URI;
    const returnUrl = "cajita://oauth/google";
    const authUrl = `${GOOGLE_AUTH_ENDPOINT}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&prompt=select_account`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
    if (result.type !== "success" || !result.url) {
      return { ok: false, reason: "cancelled" };
    }

    // Parsea los parámetros del hash o query (#access_token=...&expires_in=...)
    const hash = result.url.split("#")[1] || result.url.split("?")[1] || "";
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const expiresIn = params.get("expires_in");

    if (!accessToken) {
      return { ok: false, reason: "no-token-received" };
    }

    const expiresAt = Date.now() + (parseInt(expiresIn || "3600", 10) * 1000);
    cachedToken = accessToken;
    await SecureStore.setItemAsync(STORAGE_KEY_TOKEN, accessToken);
    await SecureStore.setItemAsync(STORAGE_KEY_EXPIRES, String(expiresAt));
    if (customClientId) {
      await setGoogleClientId(customClientId);
    }

    // Obtener correo del usuario
    let email: string | null = null;
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userData = (await userRes.json()) as { email?: string };
        email = userData.email ?? null;
        if (email) {
          cachedEmail = email;
          await SecureStore.setItemAsync(STORAGE_KEY_EMAIL, email);
        }
      }
    } catch {
      /* ignora */
    }

    return { ok: true, email: email ?? undefined };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Conexión rápida o manual con token de acceso (útil para pruebas o integraciones directas).
 */
export async function setGoogleAccessToken(token: string, email?: string): Promise<{ ok: boolean; email?: string; reason?: string }> {
  try {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { ok: false, reason: "Token vacío" };
    }

    let resolvedEmail = email ?? null;
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${cleanToken}` },
      });
      if (userRes.ok) {
        const userData = (await userRes.json()) as { email?: string };
        resolvedEmail = userData.email ?? null;
      } else {
        return { ok: false, reason: "El token no es válido o ha expirado." };
      }
    } catch {
      return { ok: false, reason: "Error de red al validar el token con Google." };
    }

    cachedToken = cleanToken;
    cachedEmail = resolvedEmail;
    await SecureStore.setItemAsync(STORAGE_KEY_TOKEN, cleanToken);
    if (resolvedEmail) {
      await SecureStore.setItemAsync(STORAGE_KEY_EMAIL, resolvedEmail);
    }
    const expiresAt = Date.now() + 3600 * 1000;
    await SecureStore.setItemAsync(STORAGE_KEY_EXPIRES, String(expiresAt));

    return { ok: true, email: resolvedEmail ?? undefined };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

export async function disconnectGoogleDrive(): Promise<void> {
  cachedToken = null;
  cachedEmail = null;
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEY_EMAIL);
    await SecureStore.deleteItemAsync(STORAGE_KEY_EXPIRES);
  } catch {
    /* ignora */
  }
}

async function getValidToken(): Promise<string | null> {
  try {
    const token = cachedToken ?? (await SecureStore.getItemAsync(STORAGE_KEY_TOKEN));
    if (!token) return null;
    const expiresStr = await SecureStore.getItemAsync(STORAGE_KEY_EXPIRES);
    if (expiresStr) {
      const expiresAt = parseInt(expiresStr, 10);
      if (Date.now() > expiresAt) {
        cachedToken = null;
        return null;
      }
    }
    cachedToken = token;
    return token;
  } catch {
    return null;
  }
}

/**
 * Busca si existe un archivo con `remoteName` en la carpeta `appDataFolder` de Google Drive.
 */
export async function findGoogleDriveFile(remoteName: string): Promise<string | null> {
  const token = await getValidToken();
  if (!token) return null;

  try {
    const q = encodeURIComponent(`name = '${remoteName}' and 'appDataFolder' in parents and trashed = false`);
    const res = await fetch(`${GOOGLE_DRIVE_API_BASE}/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { files?: { id: string; name: string }[] };
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  } catch {
    return null;
  }
}

export async function googleDriveFileExists(remoteName: string): Promise<boolean> {
  const id = await findGoogleDriveFile(remoteName);
  return Boolean(id);
}

/**
 * Sube el archivo binario local (snapshot cifrado de SQLite) a `appDataFolder` en Google Drive.
 */
export async function uploadToGoogleDrive(localFile: File, remoteName: string): Promise<{ ok: boolean; reason: string }> {
  const token = await getValidToken();
  if (!token) return { ok: false, reason: "not-authenticated" };

  try {
    if (!localFile.exists) return { ok: false, reason: "local-file-missing" };

    const bytes = await localFile.bytes();
    const existingFileId = await findGoogleDriveFile(remoteName);

    if (existingFileId) {
      // Actualiza el archivo existente con PATCH
      const res = await fetch(`${GOOGLE_DRIVE_UPLOAD_BASE}/files/${existingFileId}?uploadType=media`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
        },
        body: bytes,
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, reason: `upload-failed: ${res.status} ${text}` };
      }
      return { ok: true, reason: "ok" };
    } else {
      // Sube un archivo nuevo con multipart
      const boundary = "-------cajita-boundary-" + Date.now();
      const metadata = JSON.stringify({
        name: remoteName,
        parents: ["appDataFolder"],
      });

      // Crear payload multipart
      const metaHeader = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
      const fileHeader = `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`;
      const footer = `\r\n--${boundary}--`;

      const encoder = new TextEncoder();
      const metaBytes = encoder.encode(metaHeader);
      const fileHeaderBytes = encoder.encode(fileHeader);
      const footerBytes = encoder.encode(footer);

      const totalLength = metaBytes.length + fileHeaderBytes.length + bytes.length + footerBytes.length;
      const combined = new Uint8Array(totalLength);
      let offset = 0;

      combined.set(metaBytes, offset);
      offset += metaBytes.length;
      combined.set(fileHeaderBytes, offset);
      offset += fileHeaderBytes.length;
      combined.set(bytes, offset);
      offset += bytes.length;
      combined.set(footerBytes, offset);

      const res = await fetch(`${GOOGLE_DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: combined,
      });

      if (!res.ok) {
        const text = await res.text();
        return { ok: false, reason: `create-failed: ${res.status} ${text}` };
      }
      return { ok: true, reason: "ok" };
    }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Descarga el archivo de backup desde `appDataFolder` de Google Drive a la ruta local destino.
 */
export async function downloadFromGoogleDrive(remoteName: string, targetFile: File): Promise<{ ok: boolean; reason: string }> {
  const token = await getValidToken();
  if (!token) return { ok: false, reason: "not-authenticated" };

  try {
    const fileId = await findGoogleDriveFile(remoteName);
    if (!fileId) return { ok: false, reason: "remote-file-not-found" };

    const res = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return { ok: false, reason: `download-failed: ${res.status}` };
    }

    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    targetFile.write(bytes);

    return { ok: true, reason: "ok" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
