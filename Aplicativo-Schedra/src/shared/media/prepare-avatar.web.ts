export async function prepareAvatar(uri: string, _dimensions?: { width: number; height: number }) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = uri;
  await image.decode();
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (side < 1) throw new Error("Nao foi possivel ler esta imagem.");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(512, side);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Nao foi possivel preparar a imagem.");
  context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Nao foi possivel converter a imagem.")), "image/jpeg", 0.82));
  return { content: new Uint8Array(await blob.arrayBuffer()), mimeType: "image/jpeg", width: canvas.width, height: canvas.height };
}
