
import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc, updateDoc } from "@firebase/firestore";
import { TextInput, Button, FlatList, View, Text } from 'react-native';

const AdminPanel = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [updatedName, setUpdatedName] = useState('');
  const [updatedLogo, setUpdatedLogo] = useState('');
  const [updatedPointsRequired, setUpdatedPointsRequired] = useState('');

  useEffect(() => {
    // Fetch stores data
    const fetchStoresData = async () => {
      const db = getFirestore();
      const storesCollection = collection(db, "tiendas");

      try {
        const querySnapshot = await getDocs(storesCollection);
        const storesData = [];

        querySnapshot.forEach((doc) => {
          storesData.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        setStores(storesData);
      } catch (error) {
        console.error("Error fetching stores data:", error);
      }
    };

    // Call the fetchStoresData function
    fetchStoresData();
  }, []); // Empty dependency array ensures that it runs only once

  const handleUpdateStore = async () => {
    if (selectedStore) {
      const db = getFirestore();
      const storeDocRef = doc(db, "tiendas", selectedStore.id);

      try {
        await updateDoc(storeDocRef, {
          name: updatedName || selectedStore.name,
          logo: updatedLogo || selectedStore.logo,
          pointsRequired: updatedPointsRequired || selectedStore.pointsRequired,
        });

        // Refresh the stores data after updating
        const updatedStores = stores.map((store) =>
          store.id === selectedStore.id
            ? { ...store, name: updatedName, logo: updatedLogo, pointsRequired: updatedPointsRequired }
            : store
        );

        setStores(updatedStores);
        setSelectedStore(null);
        setUpdatedName('');
        setUpdatedLogo('');
        setUpdatedPointsRequired('');
      } catch (error) {
        console.error("Error updating store:", error);
      }
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
            onChangeText={(text) => setUpdatedPointsRequired(text)}
          />
          <Button title="Actualizar Tienda" onPress={handleUpdateStore} />
        </View>
      )}
    </View>
  );
};

export default AdminPanel;
