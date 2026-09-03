import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';

/** Deja que el usuario elija un archivo CSV/TXT y devuelve su contenido. */
export async function pickCsvText(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  try {
    const file = new File(asset.uri);
    return await file.text();
  } catch {
    // Fallback web / blobs
    const r = await fetch(asset.uri);
    return await r.text();
  }
}

/** Escribe un CSV en cache y abre el diálogo de compartir / guardar. */
export async function shareText(filename: string, contents: string, mime = 'text/csv'): Promise<boolean> {
  if (Platform.OS === 'web') {
    await Clipboard.setStringAsync(contents);
    return false;
  }
  const file = new File(Paths.cache, filename);
  try {
    file.create({ overwrite: true });
  } catch {
    /* ya existe */
  }
  file.write(contents);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: filename });
    return true;
  }
  await Clipboard.setStringAsync(contents);
  return false;
}

export async function copyToClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
