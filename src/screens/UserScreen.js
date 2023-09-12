import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableHighlight,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

export default function UserScreen({ navigation }) {
  const authInstance = getAuth();
  const userUid = authInstance.currentUser?.uid;
  const [userData, setUserData] = useState(null);
  const [editedData, setEditedData] = useState({
    nombres: '',
    apellidos: '',
    identificacion: '',
    fechaNacimiento: new Date(),
    sexo: '',
    email: '',
    contraseña: '',
    confirmarContraseña: '',
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const db = getFirestore();
      const userDocRef = doc(db, 'usuarios', userUid);
      try {
        const userDocSnapshot = await getDoc(userDocRef);
        if (userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();
          setUserData(userData);
          setEditedData(userData);
        } else {
          console.log('User document not found');
        }
      } catch (error) {
        console.log('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, [userUid]);

  const handleLogout = async () => {
    setShowLogoutConfirmation(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut(authInstance);
      navigation.navigate('SignIn');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setShowLogoutConfirmation(false);
    }
  };

  const handleEdit = () => {
    setShowEditConfirmation(true);
  };

  const confirmEdit = () => {
    setIsEditing(true);
    setShowEditConfirmation(false);
  };

  // ...

  const handleImageSelect = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
  
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setEditedData({
        ...editedData,
        profileImageUrl: result.assets[0].uri,
      });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
  
    const db = getFirestore();
    const userDocRef = doc(db, 'usuarios', userUid);
  
    try {
      if (selectedImage !== userData.profileImageUrl) {
        const storage = getStorage();
        const storageRef = ref(storage, `profileImages/${userUid}`);
  
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
  
        const downloadURL = await getDownloadURL(storageRef);
  
        await updateDoc(userDocRef, {
          ...editedData,
          profileImageUrl: downloadURL,
        });
      } else {
        await updateDoc(userDocRef, editedData);
      }
  
      setIsEditing(false);
      setSelectedImage(null);
  
      console.log('Data and image updated successfully');
    } catch (error) {
      console.log('Error updating data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedData({
      ...editedData,
      [field]: value,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Salir</Text>
        </TouchableOpacity>
      </View>
      {userData ? (
        <View style={styles.scrollContainer}>
          <TouchableOpacity
            style={[styles.imageContainer, isEditing && styles.editableImageContainer]}
            onPress={() => {
              if (isEditing) {
                handleImageSelect();
              }
            }}
          >
            {selectedImage || userData.profileImageUrl ? (
              <Image
                source={{ uri: selectedImage || userData.profileImageUrl }}
                style={styles.image}
              />
            ) : (
              <Text>Select Image</Text>
            )}
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity style={styles.imageButton} onPress={handleImageSelect}>
              <Text>{selectedImage ? 'Cambiar Imagen' : 'Seleccionar Imagen'}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.title}>Nombres:</Text>
          {isEditing ? (
            <TextInput style={styles.input} value={editedData.nombres} onChangeText={(value) => handleInputChange('nombres', value)} />
          ) : (
            <Text style={styles.body}>{userData.nombres}</Text>
          )}

          <Text style={styles.title}>Apellidos:</Text>
          {isEditing ? (
            <TextInput style={styles.input} value={editedData.apellidos} onChangeText={(value) => handleInputChange('apellidos', value)} />
          ) : (
            <Text style={styles.body}>{userData.apellidos}</Text>
          )}

          <Text style={styles.title}>Edad:</Text>
          {isEditing ? (
            <TextInput style={styles.input} value={editedData.edad} onChangeText={(value) => handleInputChange('edad', value)} />
          ) : (
            <Text style={styles.body}>{userData.edad} years</Text>
          )}

          <Text style={styles.title}>Identificación:</Text>
          {isEditing ? (
            <TextInput style={styles.input} value={editedData.identificacion} onChangeText={(value) => handleInputChange('identificacion', value)} />
          ) : (
            <Text style={styles.body}>{userData.identificacion}</Text>
          )}

          <TouchableOpacity style={styles.button} onPress={isEditing ? handleSave : handleEdit}>
            <Text style={styles.buttonText}>{isEditing ? 'Guardar Cambios' : 'Editar'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text>Loading data...</Text>
      )}

      <Modal visible={showLogoutConfirmation} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>¿Seguro que deseas cerrar sesión?</Text>
            <TouchableHighlight style={styles.modalButton} onPress={confirmLogout}>
              <Text style={styles.buttonText}>Sí</Text>
            </TouchableHighlight>
            <TouchableHighlight
              style={styles.modalButton}
              onPress={() => setShowLogoutConfirmation(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditConfirmation} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>¿Seguro que deseas editar tus datos?</Text>
            <TouchableHighlight style={styles.modalButton} onPress={confirmEdit}>
              <Text style={styles.buttonText}>Sí</Text>
            </TouchableHighlight>
            <TouchableHighlight
              style={styles.modalButton}
              onPress={() => setShowEditConfirmation(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
    width: '90%',
    marginTop: 30,
    marginHorizontal: 20,
  },
  scrollContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    width: '100%',
  },
  imageContainer: {
    width: 210,
    height: 210,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: '#54CD64',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  editableImageContainer: {
    borderWidth: 3,
    borderColor: 'gray',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 110,
  },
  imageButton: {
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#353147',
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  body: {
    backgroundColor: '#F7F7F7',
    padding: 18,
    borderRadius: 26,
    marginBottom: 10,
    width: '100%',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    marginBottom: 10,
    width: '100%',
  },
  button: {
    backgroundColor: '#000000',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
    width: '60%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  logoutButton: {
    backgroundColor: '#54CD64',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    left: 140,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10.32,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
});
