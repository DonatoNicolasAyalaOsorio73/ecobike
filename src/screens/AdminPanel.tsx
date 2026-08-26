import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { TextInput, Button, FlatList, View, Text } from 'react-native';

// ponytail: email allowlist — replace with Custom Claims isAdmin check when admin roles are defined
const ADMIN_EMAILS = (import.meta as any).env.VITE_ADMIN_EMAILS?.split(',') ?? [];

const AdminPanel = () => {
  const currentUser = getAuth().currentUser;
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [updatedName, setUpdatedName] = useState('');
  const [updatedLogo, setUpdatedLogo] = useState('');
  const [updatedPointsRequired, setUpdatedPointsRequired] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(currentUser.email)) return;

    const fetchStoresData = async () => {
      const db = getFirestore();
      const storesCollection = collection(db, "tiendas");
      try {
        const querySnapshot = await getDocs(storesCollection);
        const storesData = [];
        querySnapshot.forEach((doc) => {
          storesData.push({ id: doc.id, ...doc.data() });
        });
        setStores(storesData);
      } catch (error) {
        console.error("Error fetching stores data:", error);
      }
    };

    fetchStoresData();
  }, [currentUser?.uid]);

  if (!currentUser) {
    return <View><Text>Acceso denegado. Debes iniciar sesión.</Text></View>;
  }

  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(currentUser.email)) {
    return <View><Text>Acceso denegado. No tienes permisos de administrador.</Text></View>;
  }

  const handleUpdateStore = async () => {
    if (!selectedStore) return;
    const db = getFirestore();
    const storeDocRef = doc(db, "tiendas", selectedStore.id);
    try {
      await updateDoc(storeDocRef, {
        name: updatedName || selectedStore.name,
        logo: updatedLogo || selectedStore.logo,
        pointsRequired: updatedPointsRequired ? Number(updatedPointsRequired) : selectedStore.pointsRequired,
      });
      setStores(stores.map((store) =>
        store.id === selectedStore.id
          ? { ...store, name: updatedName, logo: updatedLogo, pointsRequired: Number(updatedPointsRequired) }
          : store
      ));
      setSelectedStore(null);
      setUpdatedName('');
      setUpdatedLogo('');
      setUpdatedPointsRequired('');
    } catch (error) {
      console.error("Error updating store:", error);
    }
  };

  return (
    <View>
      <Text>Seleccione una tienda para editar:</Text>
      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <Text onPress={() => setSelectedStore(item)}>{item.name}</Text>
          </View>
        )}
      />
      {selectedStore && (
        <View>
          <Text>Editar tienda: {selectedStore.name}</Text>
          <TextInput
            placeholder="Nuevo nombre"
            value={updatedName}
            onChangeText={(text) => setUpdatedName(text)}
          />
          <TextInput
            placeholder="Nuevo logo"
            value={updatedLogo}
            onChangeText={(text) => setUpdatedLogo(text)}
          />
          <TextInput
            placeholder="Nuevos puntos requeridos"
            value={updatedPointsRequired}
            keyboardType="numeric"
            onChangeText={(text) => setUpdatedPointsRequired(text)}
          />
          <Button title="Actualizar Tienda" onPress={handleUpdateStore} />
        </View>
      )}
    </View>
  );
};

export default AdminPanel;
