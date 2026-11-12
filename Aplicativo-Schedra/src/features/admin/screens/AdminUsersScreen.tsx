import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { ApiError } from "../../../shared/api/client";
import { AppHeader } from "../../../shared/components/AppHeader";
import { Screen } from "../../../shared/components/Screen";
import { IconButton } from "../../../shared/components/ui/IconButton";
import { FeedbackState, InlineError } from "../../../shared/components/ui/FeedbackState";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts } from "../../../theme/tokens";
import { useAuth } from "../../auth/AuthProvider";
import type { UserRole } from "../../auth/types";
import { adminUsersApi, type ManagedUser } from "../api/admin-users-api";

export function AdminUsersScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useAppTheme();
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [changingId, setChangingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (query: string) => {
    setLoading(true); setError("");
    try { setUsers((await adminUsersApi.list(token, query)).data); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Nao foi possivel carregar os usuarios."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { const timeout = setTimeout(() => void load(search), 350); return () => clearTimeout(timeout); }, [load, search]);
  const metrics = useMemo(() => ({ admins: users.filter((user) => user.role === "admin").length, active: users.filter((user) => user.active).length }), [users]);
  const replaceUser = (updated: ManagedUser) => setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));

  const updateRole = async (managedUser: ManagedUser, role: UserRole) => {
    if (managedUser.role === role || managedUser.id === currentUser.id) return;
    setChangingId(managedUser.id); setError("");
    try { replaceUser((await adminUsersApi.changeRole(token, managedUser.id, role)).user); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel alterar o papel."); }
    finally { setChangingId(null); }
  };

  const updateStatus = async (managedUser: ManagedUser, active: boolean) => {
    if (managedUser.id === currentUser.id) return;
    setChangingId(managedUser.id); setError("");
    try { replaceUser((await adminUsersApi.changeStatus(token, managedUser.id, active)).user); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel alterar o status."); }
    finally { setChangingId(null); }
  };

  const removeUser = (managedUser: ManagedUser) => {
    if (managedUser.id === currentUser.id) return;
    const execute = async () => {
      setChangingId(managedUser.id); setError("");
      try { await adminUsersApi.remove(token, managedUser.id); setUsers((current) => current.filter((user) => user.id !== managedUser.id)); }
      catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel excluir o usuario."); }
      finally { setChangingId(null); }
    };
    const message = `${managedUser.name} e os dados vinculados serao removidos.`;
    if (Platform.OS === "web") { if (window.confirm(`Excluir usuario?\n\n${message}`)) void execute(); return; }
    Alert.alert("Excluir usuario?", message, [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => void execute() }]);
  };

  return <Screen header={<AppHeader eyebrow="CONTROLE DE ACESSO" onBack={onBack} title="Administração" />}>
    <View><Text style={[styles.kicker, { color: colors.accent }]}>USUARIOS E PERMISSOES</Text><Text style={[styles.title, { color: colors.text }]}>Quem pode fazer o que</Text><Text style={[styles.description, { color: colors.textMuted }]}>Gerencie o acesso sem compartilhar credenciais ou alterar dados operacionais.</Text></View>
    <View style={styles.metrics}><Metric label="USUARIOS" value={users.length} color={colors.accent} /><Metric label="ADMINISTRADORES" value={metrics.admins} color={colors.amber} /><Metric label="ATIVOS" value={metrics.active} color={colors.success} /></View>
    <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="search" size={19} color={colors.textMuted} /><TextInput accessibilityLabel="Buscar usuarios" onChangeText={setSearch} placeholder="Nome, e-mail ou CPF" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} value={search} />{search ? <IconButton accessibilityLabel="Limpar busca" icon="close-circle" variant="ghost" onPress={() => setSearch("")} /> : null}</View>
    {error ? <InlineError message={error} /> : null}
    <View style={styles.listHeader}><Text style={[styles.listCount, { color: colors.textMuted }]}>{users.length} {users.length === 1 ? "resultado" : "resultados"}</Text><IconButton accessibilityLabel="Recarregar usuarios" icon="refresh" variant="ghost" loading={loading} onPress={() => void load(search)} /></View>
    {loading ? <FeedbackState kind="loading" title="Carregando usuarios" /> : users.length === 0 ? <FeedbackState kind={error ? "error" : "empty"} title={error ? "Falha ao carregar" : "Nenhum usuario encontrado"} detail={error ? undefined : "Revise o termo informado na busca."} action={error ? { label: "Tentar novamente", onPress: () => void load(search) } : undefined} /> : <View style={styles.userList}>{users.map((managedUser) => {
      const ownAccount = managedUser.id === currentUser.id;
      const changing = changingId === managedUser.id;
      return <View key={managedUser.id} style={[styles.userRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: changing ? 0.6 : 1 }]}><View style={[styles.avatar, { backgroundColor: managedUser.active ? colors.accentSoft : colors.surfaceRaised }]}><Text style={[styles.avatarText, { color: managedUser.active ? colors.accent : colors.textMuted }]}>{initials(managedUser.name)}</Text></View><View style={styles.userMain}><View style={styles.nameLine}><Text numberOfLines={1} style={[styles.userName, { color: colors.text }]}>{managedUser.name}</Text>{ownAccount ? <Text style={[styles.youBadge, { color: colors.accent }]}>VOCE</Text> : null}</View><Text numberOfLines={1} style={[styles.userEmail, { color: colors.textMuted }]}>{managedUser.email}</Text><View style={[styles.controls, { borderTopColor: colors.border }]}><View style={[styles.roleControl, { backgroundColor: colors.surfaceRaised }]}>{(["user", "admin"] as UserRole[]).map((role) => <Pressable key={role} disabled={ownAccount || changing} onPress={() => void updateRole(managedUser, role)} style={[styles.roleButton, managedUser.role === role && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}><Text style={[styles.roleText, { color: managedUser.role === role ? colors.accent : colors.textMuted }]}>{role === "admin" ? "Admin" : "Usuario"}</Text></Pressable>)}</View><View style={styles.statusControl}><Text style={[styles.statusText, { color: managedUser.active ? colors.success : colors.danger }]}>{managedUser.active ? "Ativo" : "Bloqueado"}</Text><Switch accessibilityLabel={`${managedUser.active ? "Bloquear" : "Ativar"} ${managedUser.name}`} disabled={ownAccount || changing} onValueChange={(active) => void updateStatus(managedUser, active)} trackColor={{ false: colors.border, true: colors.accentSoft }} thumbColor={managedUser.active ? colors.success : colors.textMuted} value={managedUser.active} />{!ownAccount ? <IconButton accessibilityLabel={`Excluir ${managedUser.name}`} icon="trash-outline" variant="destructive" disabled={changing} onPress={() => removeUser(managedUser)} /> : null}</View></View></View></View>;
    })}</View>}
  </Screen>;

  function Metric({ label, value, color }: { label: string; value: number; color: string }) { return <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border, borderTopColor: color }]}><Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text><Text numberOfLines={2} style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text></View>; }
}

function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, marginBottom: 6 },
  title: { fontFamily: fonts.displayBold, fontSize: 34 },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 8 },
  metrics: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, minWidth: 0, minHeight: 82, borderWidth: 1, borderTopWidth: 3, borderRadius: 8, padding: 11 },
  metricValue: { fontFamily: fonts.displayBold, fontSize: 25 },
  metricLabel: { fontFamily: fonts.bodyBold, fontSize: 8, lineHeight: 11, marginTop: 3 },
  searchBox: { minHeight: 52, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listCount: { fontFamily: fonts.bodyBold, fontSize: 12 },
  userList: { gap: 9 },
  userRow: { borderWidth: 1, borderRadius: 10, padding: 13, flexDirection: "row", alignItems: "flex-start", gap: 11 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  userMain: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  userName: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 14 },
  youBadge: { fontFamily: fonts.bodyBold, fontSize: 8 },
  userEmail: { fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  controls: { flexWrap: "wrap", borderTopWidth: 1, marginTop: 10, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  roleControl: { flexDirection: "row", borderRadius: 7, padding: 2 },
  roleButton: { minHeight: 31, borderWidth: 1, borderColor: "transparent", borderRadius: 5, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  roleText: { fontFamily: fonts.bodyBold, fontSize: 9 },
  statusControl: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 9 },
});
