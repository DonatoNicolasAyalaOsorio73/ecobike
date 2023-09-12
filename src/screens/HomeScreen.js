import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Button,
  StyleSheet,
} from "react-native";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, arrayRemove } from "@firebase/firestore";
import { getAuth } from "@firebase/auth";

export default function FollowUsers() {
  const [users, setUsers] = useState([]);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [newFollowUsername, setNewFollowUsername] = useState("");
  const auth = getAuth();
  const userUid = auth.currentUser?.uid;

  // Obtener la colección de usuarios de Firebase Firestore
  const db = getFirestore();
  const usersCollection = collection(db, "usuarios");

  useEffect(() => {
    // Cargar la lista de usuarios
    const loadUsers = async () => {
      const querySnapshot = await getDocs(usersCollection);
      const usersData = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        usersData.push(userData);
      });
      setUsers(usersData);
    };

    // Cargar la lista de usuarios seguidos por el usuario actual
    const loadFollowedUsers = async () => {
      if (userUid) {
        const userDocRef = doc(db, "usuarios", userUid);
        const userDocSnapshot = await getDoc(userDocRef);
        if (userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();
          setFollowedUsers(userData.following || []);
        }
      }
    };

    loadUsers();
    loadFollowedUsers();
  }, [userUid]);

  // Función para seguir a un usuario
  const followUser = async (usernameToFollow) => {
    const userToFollow = users.find((user) => user.username === usernameToFollow);
    if (!userToFollow) {
      console.log("Usuario no encontrado");
      return;
    }

    const updatedFollowedUsers = [...followedUsers, userToFollow.username];

    const userDocRef = doc(db, "usuarios", userUid);
    await setDoc(userDocRef, { following: updatedFollowedUsers }, { merge: true });

    setFollowedUsers(updatedFollowedUsers);
    setNewFollowUsername("");
  };

  // Función para dejar de seguir a un usuario
  const unfollowUser = async (usernameToUnfollow) => {
    const updatedFollowedUsers = followedUsers.filter((username) => username !== usernameToUnfollow);

    const userDocRef = doc(db, "usuarios", userUid);
    await updateDoc(userDocRef, { following: arrayRemove(usernameToUnfollow) });

    setFollowedUsers(updatedFollowedUsers);
  };

  return (
    <View style={styles.container}>
      <Text>Usuarios:</Text>
      <FlatList
        data={users}
        keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
        renderItem={({ item }) => (
          <View>
            <Text>{item.username}</Text>
            {userUid !== item.id && !followedUsers.includes(item.username) && (
              <TouchableOpacity onPress={() => followUser(item.username)}>
                <Text>Seguir</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      <Text>Usuarios Seguidos:</Text>
      <FlatList
        data={followedUsers}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.followedUserItem}>
            <Text>{item}</Text>
            <TouchableOpacity onPress={() => unfollowUser(item)}>
              <Text>Dejar de seguir</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <TextInput
        placeholder="Nombre de usuario a seguir"
        value={newFollowUsername}
        onChangeText={(text) => setNewFollowUsername(text)}
      />
      <Button title="Seguir Usuario" onPress={() => followUser(newFollowUsername)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {

    alignItems: "center",
    justifyContent: "center",
    top: "50%",
  },
  followedUserItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
