const listeners = new Set<() => void>();
export function avatarChanged() { for (const listener of listeners) listener(); }
export function subscribeAvatar(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
