import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { getAuth } from "@firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc } from "@firebase/firestore";
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';

// Web goes through the secure serverless function (Admin SDK, key stays server-side).
// Native has no serverless origin, so mobile keeps the original client Firestore path.
const IS_WEB = Platform.OS === 'web';

// Calls the admin serverless function with the current user's Firebase ID token.
// The token is verified server-side (see api/stores.js) before any write.
async function adminFetch(path, options = {}) {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Debes iniciar sesión.");
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

const AdminPanel = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [updatedName, setUpdatedName] = useState('');
  const [updatedLogo, setUpdatedLogo] = useState('');
  const [updatedPoints, setUpdatedPoints] = useState('');
  const [updatedDescription, setUpdatedDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    setError(null);
    try {
      if (IS_WEB) {
        const { stores } = await adminFetch("/api/stores");
        setStores(stores);
      } else {
        const db = getFirestore();
        const snap = await getDocs(collection(db, "tiendas"));
        setStores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectStore = (store) => {
    setSelectedStore(store);
    setUpdatedName(store.name || '');
    setUpdatedLogo(store.logo || '');
    setUpdatedPoints(String(store.pointsRequired || ''));
    setUpdatedDescription(store.description || '');
  };

  const handleUpdate = async () => {
    if (!selectedStore) return;
    setSaving(true);
    try {
      if (IS_WEB) {
        const { store } = await adminFetch("/api/stores", {
          method: "PUT",
          body: JSON.stringify({
            id: selectedStore.id,
            name: updatedName,
            logo: updatedLogo,
            pointsRequired: updatedPoints,
            description: updatedDescription,
          }),
        });
        setStores(stores.map(s => (s.id === store.id ? store : s)));
      } else {
        const db = getFirestore();
        const payload = {
          name: updatedName || selectedStore.name,
          logo: updatedLogo || selectedStore.logo,
          pointsRequired: Number(updatedPoints) || selectedStore.pointsRequired,
          description: updatedDescription || selectedStore.description,
        };
        await updateDoc(doc(db, "tiendas", selectedStore.id), payload);
        setStores(stores.map(s => (s.id === selectedStore.id ? { ...s, ...payload } : s)));
      }
      setSelectedStore(null);
      Alert.alert("Éxito", "Tienda actualizada correctamente.");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>Cargando tiendas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Feather name="settings" size={22} color={colors.accent} />
          <Text style={styles.headerTitle}>Panel Admin</Text>
        </View>
        <View style={styles.emptyState}>
          <Feather name="lock" size={40} color="#c8d4c0" />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={[styles.saveButton, { marginTop: 16, paddingHorizontal: 24 }]}
            onPress={fetchStores}
          >
            <Feather name="refresh-ccw" size={16} color={colors.accent} />
            <Text style={styles.saveButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Feather name="settings" size={22} color={colors.accent} />
        <Text style={styles.headerTitle}>Panel Admin</Text>
      </View>

      {selectedStore ? (
        <ScrollView style={styles.editPanel} contentContainerStyle={styles.editContent}>
          <TouchableOpacity style={styles.backRow} onPress={() => setSelectedStore(null)}>
            <Feather name="arrow-left" size={18} color={colors.accent} />
            <Text style={styles.backText}>Tiendas</Text>
          </TouchableOpacity>

          <Text style={styles.editTitle}>Editando: {selectedStore.name}</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={updatedName}
            onChangeText={setUpdatedName}
            placeholder="Nombre de la tienda"
          />

          <Text style={styles.label}>Logo URL</Text>
          <TextInput
            style={styles.input}
            value={updatedLogo}
            onChangeText={setUpdatedLogo}
            placeholder="https://..."
            autoCapitalize="none"
          />

          <Text style={styles.label}>Puntos requeridos</Text>
          <TextInput
            style={styles.input}
            value={updatedPoints}
            onChangeText={setUpdatedPoints}
            placeholder="150"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={updatedDescription}
            onChangeText={setUpdatedDescription}
            placeholder="Descripción de la tienda..."
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.savingButton]}
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Feather name="check" size={16} color={colors.accent} />
                <Text style={styles.saveButtonText}>Guardar cambios</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={item => item.id}
          style={styles.list}
          contentContainerStyle={stores.length === 0 && styles.centered}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.storeItem}
              onPress={() => selectStore(item)}
              activeOpacity={0.7}
            >
              <View style={styles.storeIcon}>
                <Feather name="shopping-bag" size={20} color={colors.accent} />
              </View>
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{item.name}</Text>
                <Text style={styles.storePoints}>{item.pointsRequired} puntos</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#b0c0a8" />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="inbox" size={40} color="#c8d4c0" />
              <Text style={styles.emptyText}>Sin tiendas registradas</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default AdminPanel;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    gap: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textDark,
  },
  list: {
    paddingHorizontal: 20,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  storeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e8f5dc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
  },
  storePoints: {
    fontSize: 13,
    color: '#7a9270',
    marginTop: 2,
  },
  editPanel: {
    flex: 1,
  },
  editContent: {
    padding: 20,
    paddingBottom: 80,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backText: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5a7050',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: colors.textDark,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  savingButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#7a9270',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8a9a80',
  },
});
