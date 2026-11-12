export function avatarFile(uri: string, mimeType?: string) {
  const extension = uri.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  const mime = mimeType?.toLowerCase() || (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg");
  const suffix = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[mime];
  if (!suffix) throw new Error("Escolha uma imagem JPG, PNG ou WEBP.");
  return { uri, name: `avatar-${Date.now()}.${suffix}`, type: mime };
}
