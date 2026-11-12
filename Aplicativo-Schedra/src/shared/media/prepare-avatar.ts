import { File } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";

export async function prepareAvatar(uri: string, dimensions?: { width: number; height: number }) {
  const size = dimensions ?? await new Promise<{ width: number; height: number }>((resolve, reject) => Image.getSize(uri, (width, height) => resolve({ width, height }), reject));
  const side = Math.min(size.width, size.height);
  if (side < 1) throw new Error("Nao foi possivel ler esta imagem.");
  const result = await manipulateAsync(uri, [
    { crop: { originX: (size.width - side) / 2, originY: (size.height - side) / 2, width: side, height: side } },
    { resize: { width: Math.min(512, side), height: Math.min(512, side) } },
  ], { compress: 0.82, format: SaveFormat.JPEG });
  const file = new File(result.uri);
  try { return { content: await file.bytes(), mimeType: "image/jpeg", width: result.width, height: result.height }; }
  finally { try { if (file.exists) file.delete(); } catch { /* The persisted BLOB does not depend on this conversion file. */ } }
}
