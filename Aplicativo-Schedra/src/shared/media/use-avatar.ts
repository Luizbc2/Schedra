import { useEffect, useState } from "react";
import { resolveApiAsset } from "../api/client";
import { avatarPreview } from "./avatar-service";
import { subscribeAvatar } from "./avatar-events";

export function useAvatar(userId: number, remoteUrl: string | null) {
  const [preview, setPreview] = useState<{ userId: number; uri: string; status: string } | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => {
      void avatarPreview(userId).then((image) => { if (active) setPreview(image ? { userId, ...image } : null); }).catch(() => undefined);
    };
    load();
    const unsubscribe = subscribeAvatar(load);
    return () => { active = false; unsubscribe(); };
  }, [userId, remoteUrl]);
  return preview?.userId === userId ? { uri: preview.uri, pending: preview.status !== "synced" } : { uri: resolveApiAsset(remoteUrl), pending: false };
}
