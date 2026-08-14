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
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, signOut } from 'firebase/auth';
import { TextInputMask } from 'react-native-masked-text';

export default function UserScreen({ navigation }) {
  const authInstance = getAuth();
  const userUid = authInstance.currentUser?.uid;
  const [userData, setUserData] = useState(null);
  const [editedData, setEditedData] = useState({
    nombres: '',
    apellidos: '',
    identificacion: '',
    fechaNacimiento: '',
    sexo: '',
    email: '',
    contraseña: '',
    confirmarContraseña: '',
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);
  const [imageChanged, setImageChanged] = useState(false);
  const [dataUpdated, setDataUpdated] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenderChanged, setIsGenderChanged] = useState(false);
  const [isUserDataChanged, setIsUserDataChanged] = useState(false);

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
          setDataUpdated(false);
        } else {
          console.log('User document not found');
        }
      } catch (error) {
        console.log('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, [userUid, dataUpdated]);

  const handleSave = async () => {
    setIsLoading(true);
    if (!validateDate(editedData.fechaNacimiento)) {
      Alert.alert('Error', 'La fecha de nacimiento no es válida.');
      setIsLoading(false);
      return;
    }
    const db = getFirestore();
    const userDocRef = doc(db, 'usuarios', userUid);
    try {
      if (imageChanged) {
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
          await updateDoc(userDocRef, {
            ...editedData,
          });
        }
      } else {
        await updateDoc(userDocRef, {
          ...editedData,
        });
      }
      if (isGenderChanged) {
        await updateDoc(userDocRef, {
          sexo: editedData.sexo,
        });
      }
      setIsEditing(false);
      setSelectedImage(null);
      setImageChanged(false);
      setIsGenderChanged(false);
      setDataUpdated(true);
      console.log('Data and image updated successfully');
    } catch (error) {
      console.log('Error updating data:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      setImageChanged(true); // Indicar que la imagen ha cambiado
    }
  };

  const handleGenderSelect = (gender) => {
    setEditedData({
      ...editedData,
      sexo: gender,
    });
    setIsGenderChanged(true); // Marca que el género ha cambiado
    setShowGenderModal(false);
  };
  
  const handleInputChange = (field, value) => {
  setEditedData({
    ...editedData,
    [field]: value,
  });
  setIsUserDataChanged(true); // Marca que los datos del usuario han cambiado
};

const validateDate = (date) => {
  const parts = date.split('/');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  return (
    day >= 1 && day <= 31 &&
    month >= 1 && month <= 12 &&
    year >= 1900 && year <= new Date().getFullYear()
  );
};

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}></View>
      {userData ? (
        <View style={styles.scrollContainer}>
          <View style={[styles.imageContainer, isEditing && styles.editableImageContainer]}>
            <TouchableOpacity
              style={[
                styles.image,
                isEditing && styles.editableImageContainer,
                {
                  backgroundColor: 'white', 
                  overflow: 'hidden',
                  borderWidth: 3,
                  backgroundColor: '#ADF14B',
                  width: 220,
                  height: 220,
                  borderRadius: 110,
                  
                  
                },
              ]}
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
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="camera" size={44} color="#2a5209" />
                </View>
              )}
            </TouchableOpacity>
          </View>
  
          {isEditing && (
            <TouchableOpacity style={styles.imageButton} onPress={handleImageSelect}>
            </TouchableOpacity>
          )}
  
          <Text style={styles.title}>Usuario</Text>
          {isEditing ? (
            <TextInput style={styles.input} editable={true} value={editedData.username || ''} onChangeText={(value) => handleInputChange('username', value)} />
          ) : (
            <TextInput style={styles.body} editable={false} value={userData.username || ''} />
          )}

          <Text style={styles.title}>Género</Text>
          {isEditing ? (
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowGenderModal(true)}
            >
              <Text>{editedData.sexo || 'Seleccionar Género'}</Text>
            </TouchableOpacity>
          ) : (
            <TextInput style={styles.body} editable={false} value={userData.sexo || ''} />
          )}

          <Text style={styles.title}>Fecha de nacimiento</Text>
          {isEditing ? (
            Platform.OS === 'web' ? (
              <TextInput
                style={styles.input}
                placeholder="dd/mm/yyyy"
                placeholderTextColor="#BFBFC1"
                onChangeText={(text) => handleInputChange('fechaNacimiento', text)}
                value={editedData.fechaNacimiento || ''}
              />
            ) : (
              <TextInputMask
                type={'datetime'}
                options={{ format: 'DD/MM/YYYY' }}
                style={styles.input}
                placeholder="dd/mm/yyyy"
                placeholderTextColor="#BFBFC1"
                autoCorrect={false}
                onChangeText={(text) => handleInputChange('fechaNacimiento', text)}
                value={editedData.fechaNacimiento || ''}
              />
            )
          ) : (
            <TextInput style={styles.body} editable={false} value={userData.fechaNacimiento || ''} />
          )}

          <Text style={styles.title}>Correo</Text>
          <TextInput style={styles.body} editable={false} value={userData.email || ''} />
  
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={isEditing ? handleSave : handleEdit}>
              <Text style={styles.buttonText}>{isEditing ? 'Guardar' : 'Editar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
          <ActivityIndicator size="large" color="#ADF14B" />
          <Text style={{ marginTop: 12, fontSize: 15, color: '#5a7050' }}>Cargando perfil...</Text>
        </View>
      )}
  
      <Modal visible={showLogoutConfirmation} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>¿Seguro que deseas cerrar sesión?</Text>
            <TouchableHighlight style={styles.modalButton2} onPress={confirmLogout}>
              <Text style={styles.buttonText}>Sí</Text>
            </TouchableHighlight>
            <TouchableHighlight
              style={styles.modalButton}
              onPress={() => setShowLogoutConfirmation(false)}
            >
              <Text style={styles.logoutButtonText}>Cancelar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>
  
      <Modal visible={showEditConfirmation} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>¿Seguro que deseas editar tus datos?</Text>
            <TouchableHighlight style={styles.modalButton2} onPress={confirmEdit}>
              <Text style={styles.buttonText}>Sí</Text>
            </TouchableHighlight>
            <TouchableHighlight
              style={styles.modalButton}
              onPress={() => setShowEditConfirmation(false)}
            >
              <Text style={styles.logoutButtonText}>Cancelar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>
  
      <Modal
        visible={showGenderModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Selecciona tu Género</Text>
            <TouchableOpacity
              style={styles.modalButton2}
              onPress={() => handleGenderSelect('Masculino')}
            >
              <Text style={styles.buttonText}>Masculino</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton2}
              onPress={() => handleGenderSelect('Femenino')}
            >
              <Text style={styles.buttonText}>Femenino</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton2}
              onPress={() => handleGenderSelect('Otro')}
            >
              <Text style={styles.buttonText}>Otro</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingBottom: 100,
    marginTop: 25,
  },
  scrollContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  imageContainer: {
    width: 200, // Ancho igual al radio del círculo
    height: 200, // Alto igual al radio del círculo
    borderRadius: 100, // Para hacer un círculo perfecto
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 20,
    shadowColor: '#ADF14B',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 10,
    shadowRadius: 30,
    backgroundColor: 'white',
  },
  editableImageContainer: {
    width: 200, // Ancho igual al radio del círculo
    height: 200, // Alto igual al radio del círculo
    borderRadius: 100, // Para hacer un círculo perfecto
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 20,
    borderColor: '#888888',
    shadowColor: 'black',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  image: {
    width: '100%', // Ancho y alto del 100% para ocupar todo el contenedor
    height: '100%',
    borderRadius: 100, // Para hacer un círculo perfecto
    borderColor: '#ADF14B',
    resizeMode: 'cover', // Ajustar la imagen para cubrir todo el contenedor
  },
  imageButton: {
    marginBottom: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#353147',
    alignSelf: 'flex-start',
    marginBottom: 5,
    marginTop: 14,
  
  },
  body: {
    backgroundColor: '#F8FAF6',
    padding: 15,
    borderRadius: 16,
    width: '100%',
    color: '#3a4e30',
    fontSize: 15,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 16,
    width: '100%',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 1.5,
  },
  button: {
    backgroundColor: '#ADF14B',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'left',
    width: '45%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 2.32,
  
  },
  buttonText: {
    color: '#3e3742',
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
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    paddingTop: 40,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalText: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
    color: '#1a2e10',
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
  modalButton2: {
    backgroundColor: '#ADF14B',
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
    backgroundColor: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.68)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
});
