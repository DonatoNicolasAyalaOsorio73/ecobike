import React, {
  useState,
  useEffect
} from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  getAuth
} from 'firebase/auth';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

export default function UserScreen() {
	const authInstance = getAuth();
	const userUid = authInstance.currentUser.uid;
	const [userData, setUserData] = useState(null);
	const [editedData, setEditedData] = useState({});
	const [selectedImage, setSelectedImage] = useState(null);
	const [isEditing, setIsEditing] = useState(false);
	const [isEditingImage, setIsEditingImage] = useState(false);
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
	}, []);

	const handleEdit = () => {
		setIsEditing(true);
		setIsEditingImage(false); // Reset image editing state
	};

	const handleImageSelect = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.All
			, allowsEditing: true
			, aspect: [4, 4]
			, quality: 1
		, });
		if (!result.canceled) {
			setSelectedImage(result.assets[0].uri); // Access selected image's URI through "assets" array
		}
	};
  
	const handleSave = async () => {
		const db = getFirestore();
		const userDocRef = doc(db, 'usuarios', userUid);
		try {
			if (selectedImage) {
				const storage = getStorage();
				const storageRef = ref(storage, `profileImages/${userUid}`);
				await uploadBytes(storageRef, selectedImage);
				const downloadURL = await getDownloadURL(storageRef);
				// Update both editedData and selectedImage state
				setEditedData({
					...editedData
					, profileImageUrl: downloadURL
				, });
				setSelectedImage(downloadURL);
			}
			// Update user data immediately for a better user experience
			setUserData(editedData);
			// Update the document in Firestore with editedData
			await updateDoc(userDocRef, editedData);
			setIsEditing(false);
			setSelectedImage(null); // Reset selected image
			console.log('Data and image updated successfully');
		} catch (error) {
			console.log('Error updating data:', error);
			if (error.code === 'storage/unknown') {
				console.log('Unknown storage error:', error.serverResponse);
				if (error.serverResponse && error.serverResponse.body) {
					console.log('Error body:', error.serverResponse.body);
				}
			}
		}
	};
  
	const handleInputChange = (field, value) => {
		setEditedData({
			...editedData
			, [field]: value
		});
	};
	return (<ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
          {(selectedImage || userData.profileImageUrl) ? (
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
  </ScrollView>);
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
    width: '100%',
    marginTop: 40,
  },
  scrollContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    width: '100%',
  },
  imageContainer: {
    width: 210,
    height: 210,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'black',
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
    borderRadius: 60,
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
    width: '100%',
  },
  buttonText: {
    color: 'white',
  },
});