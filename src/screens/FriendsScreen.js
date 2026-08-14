import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
} from "@firebase/firestore";
import { getAuth } from "@firebase/auth";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme";

function ecoLevel(points) {
  if (points >= 1000) return "EcoLeyenda";
  if (points >= 500) return "EcoPro";
  if (points >= 150) return "EcoRider";
  return "EcoNovato";
}

export default function FriendsScreen() {
  const [followedUsers, setFollowedUsers] = useState([]);
  const [newFollowUsername, setNewFollowUsername] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const auth = getAuth();
  const userUid = auth.currentUser?.uid;
  const db = getFirestore();

  useEffect(() => {
    loadFollowedUsers();
  }, [userUid]);

  const loadFollowedUsers = async () => {
    if (!userUid) return;
    const userDocRef = doc(db, "usuarios", userUid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        setFollowedUsers(snap.data().following || []);
      }
    } catch (e) {
      handleFirebaseError("Error al cargar amigos:", e);
    }
  };

  const handleFirebaseError = (message, error) => {
    Alert.alert("Error", `${message} ${error.message}`);
  };

  const fetchUserByUsername = async (username) => {
    const q = query(collection(db, "usuarios"), where("username", "==", username));
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0].data();
  };

  const validateAndSearchUser = async () => {
    const name = newFollowUsername.trim();
    if (!name) {
      Alert.alert("Error", "Ingresa un nombre de usuario válido.");
      return;
    }
    try {
      const data = await fetchUserByUsername(name);
      if (data) {
        setSelectedUser(data);
        setModalVisible(true);
      } else {
        Alert.alert("Usuario no encontrado", "Verifica el nombre e intenta de nuevo.");
      }
    } catch (e) {
      handleFirebaseError("Error al buscar:", e);
    }
  };

  const followUser = async () => {
    if (!selectedUser) return;
    const updated = [...followedUsers, selectedUser.username];
    const ref = doc(db, "usuarios", userUid);
    try {
      await setDoc(ref, { following: updated }, { merge: true });
      setFollowedUsers(updated);
      setNewFollowUsername("");
      setModalVisible(false);
    } catch (e) {
      handleFirebaseError("Error al seguir:", e);
    }
  };

  const unfollowUser = async (username) => {
    const updated = followedUsers.filter((u) => u !== username);
    const ref = doc(db, "usuarios", userUid);
    try {
      await updateDoc(ref, { following: updated });
      setFollowedUsers(updated);
      setModalVisible(false);
    } catch (e) {
      handleFirebaseError("Error al dejar de seguir:", e);
    }
  };

  const openUserModal = async (username) => {
    setSelectedUser({ username });
    setModalVisible(true);
    setLoadingProfile(true);
    try {
      const data = await fetchUserByUsername(username);
      if (data) setSelectedUser(data);
    } catch (e) {
      // keep the basic username card if fetch fails
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Amigos</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{followedUsers.length}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Buscar por nombre de usuario..."
          placeholderTextColor="#a0a8a0"
          value={newFollowUsername}
          onChangeText={setNewFollowUsername}
          onSubmitEditing={validateAndSearchUser}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={validateAndSearchUser}>
          <Feather name="search" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Friends list */}
      <FlatList
        data={followedUsers}
        keyExtractor={(item, idx) => `${item}-${idx}`}
        style={styles.list}
        contentContainerStyle={followedUsers.length === 0 && styles.emptyContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.friendItem}
            onPress={() => openUserModal(item)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{item}</Text>
              <Text style={styles.friendSub}>Amigo en EcoBike</Text>
            </View>
            <View style={styles.followingBadge}>
              <Text style={styles.followingText}>Siguiendo</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color="#c8d4c0" />
            <Text style={styles.emptyTitle}>Sin amigos aún</Text>
            <Text style={styles.emptyBody}>
              Busca por nombre de usuario para agregar amigos y ver sus rutas
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Follow / Unfollow modal */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalAvatar}>
              <Text style={styles.modalAvatarText}>
                {selectedUser?.username?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <Text style={styles.modalUsername}>
              {[selectedUser?.nombres, selectedUser?.apellidos].filter(Boolean).join(" ") ||
                selectedUser?.username}
            </Text>
            <Text style={styles.modalSub}>@{selectedUser?.username}</Text>

            {/* Real stats from Firestore */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>
                  {loadingProfile ? "…" : selectedUser?.puntosAcumulados ?? 0}
                </Text>
                <Text style={styles.statLbl}>Puntos</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>
                  {loadingProfile ? "…" : (selectedUser?.following || []).length}
                </Text>
                <Text style={styles.statLbl}>Amigos</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { fontSize: 13 }]}>
                  {loadingProfile ? "…" : ecoLevel(selectedUser?.puntosAcumulados ?? 0)}
                </Text>
                <Text style={styles.statLbl}>Nivel</Text>
              </View>
            </View>

            {selectedUser && !followedUsers.includes(selectedUser.username) ? (
              <TouchableOpacity style={styles.followButton} onPress={followUser}>
                <Feather name="user-plus" size={16} color={colors.accent} />
                <Text style={styles.followButtonText}>Seguir</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.unfollowButton}
                onPress={() => unfollowUser(selectedUser?.username)}
              >
                <Feather name="user-minus" size={16} color="#fff" />
                <Text style={styles.unfollowButtonText}>Dejar de seguir</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textDark,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
  },
  searchContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: colors.textDark,
    borderRadius: 16,
  },
  searchButton: {
    padding: 14,
    borderRadius: 16,
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.accent,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textDark,
  },
  friendSub: {
    fontSize: 12,
    color: colors.textMuted3,
    marginTop: 2,
  },
  followingBadge: {
    backgroundColor: "#e8f5dc",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  followingText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4a5e40",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textMuted3,
    textAlign: "center",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    alignItems: "center",
    paddingBottom: 40,
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.accent,
  },
  modalUsername: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textDark,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: colors.textMuted3,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 22,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.screenBg,
    borderRadius: 14,
    paddingVertical: 12,
  },
  statNum: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textDark,
  },
  statLbl: {
    fontSize: 11,
    color: colors.textMuted3,
    marginTop: 2,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    gap: 8,
    width: "100%",
    justifyContent: "center",
    marginBottom: 10,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent,
  },
  unfollowButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    gap: 8,
    width: "100%",
    justifyContent: "center",
    marginBottom: 10,
  },
  unfollowButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  cancelButton: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    color: colors.textMuted3,
    fontWeight: "500",
  },
});
