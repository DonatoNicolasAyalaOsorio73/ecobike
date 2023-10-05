import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  arrayRemove,
  query,
  where,
} from "@firebase/firestore";
import { getAuth } from "@firebase/auth";

export default function FollowUsers() {
  const [users, setUsers] = useState([]);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [newFollowUsername, setNewFollowUsername] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const auth = getAuth();
  const userUid = auth.currentUser?.uid;

  const db = getFirestore();
  const usersCollection = collection(db, "usuarios");

  useEffect(() => {
    loadFollowedUsers();
  }, [userUid]);

  const loadFollowedUsers = async () => {
    if (!userUid) return;

    const userDocRef = doc(db, "usuarios", userUid);
    try {
      const userDocSnapshot = await getDoc(userDocRef);
      if (userDocSnapshot.exists()) {
        const userData = userDocSnapshot.data();
        setFollowedUsers(userData.following || []);
      }
    } catch (error) {
      handleFirebaseError("Error al cargar usuarios seguidos:", error);
    }
  };

  const handleFirebaseError = (message, error) => {
    Alert.alert("Error", `${message} ${error.message}`);
  };

  const validateAndSearchUser = async () => {
    if (newFollowUsername.trim() === "") {
      Alert.alert("Error", "Por favor, ingrese un nombre de usuario válido.");
      return;
    }

    try {
      const querySnapshot = await getDocs(
        query(collection(db, "usuarios"), where("username", "==", newFollowUsername))
      );

      if (!querySnapshot.empty) {
        setSelectedUser(querySnapshot.docs[0].data());
        setModalVisible(true);
      } else {
        setSelectedUser(null);
        setModalVisible(false);
        Alert.alert("Error", "Usuario no encontrado.");
      }
    } catch (error) {
      handleFirebaseError("Error al buscar usuario:", error);
    }
  };

  const followUser = async () => {
    if (selectedUser) {
      const updatedFollowedUsers = [...followedUsers, selectedUser.username];
      const userDocRef = doc(db, "usuarios", userUid);

      try {
        await setDoc(userDocRef, { following: updatedFollowedUsers }, { merge: true });
        setFollowedUsers(updatedFollowedUsers);
        setNewFollowUsername("");
        setModalVisible(false);
      } catch (error) {
        handleFirebaseError("Error al seguir al usuario:", error);
      }
    }
  };

  const unfollowUser = async (usernameToUnfollow) => {
    if (usernameToUnfollow) {
      const updatedFollowedUsers = followedUsers.filter(
        (username) => username !== usernameToUnfollow
      );
      const userDocRef = doc(db, "usuarios", userUid);

      try {
        await updateDoc(userDocRef, { following: updatedFollowedUsers });
        setFollowedUsers(updatedFollowedUsers);
        setModalVisible(false);
      } catch (error) {
        handleFirebaseError("Error al dejar de seguir al usuario:", error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agregar Amigos:</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre de usuario a seguir"
        value={newFollowUsername}
        onChangeText={(text) => {
          setNewFollowUsername(text);
        }}
      />
      <TouchableOpacity style={styles.button} onPress={validateAndSearchUser}>
        <Text style={styles.buttonText}>Buscar Usuario</Text>
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              {selectedUser ? selectedUser.username : ""}
            </Text>
            {selectedUser && !followedUsers.includes(selectedUser.username) ? (
              <TouchableOpacity style={styles.modalButton} onPress={followUser}>
                <Text style={styles.modalButtonText}>Seguir</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => unfollowUser(selectedUser.username)}
              >
                <Text style={styles.logoutButtonText}>Dejar de seguir</Text>
              </TouchableOpacity>
            )}
            <Button
              title="Cerrar"
              onPress={() => {
                setModalVisible(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#F5F5F5", // Color de fondo del contenedor principal
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#353147",
    marginBottom: 5,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 16,
    width: "100%",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 1.5,
    marginBottom: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#000000",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10.32,
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "red",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10.32,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: "#000000",
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "45%",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});