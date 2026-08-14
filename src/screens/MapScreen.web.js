import React, { useState, useEffect, useRef } from 'react';
import {
  Text, View, TouchableHighlight, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';

// ponytail: load Leaflet from CDN — avoids npm install and peer-dep hell
function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
};

const BOGOTA = [4.6097, -74.0817];

export default function MapScreenWeb() {
  const [location, setLocation] = useState(null);
  const [path, setPath] = useState([]);
  const [points, setPoints] = useState(0);
  const [recording, setRecording] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [localPoints, setLocalPoints] = useState(0);
  const [shouldDrawPath, setShouldDrawPath] = useState(false);
  const [showLossText, setShowLossText] = useState(false);

  // EcoRuta planning
  const [planning, setPlanning] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null); // { km, min }

  const mapDivRef = useRef(null);
  const leafletRef = useRef(null);      // L instance
  const mapRef = useRef(null);          // Leaflet map
  const userMarkerRef = useRef(null);
  const pathPolylineRef = useRef(null);
  const prevLocationRef = useRef(null);
  const pathRef = useRef([]);           // mirror of path for use inside callbacks
  const locationRef = useRef(null);     // latest location for map-click closure
  const planningRef = useRef(false);    // latest planning flag for map-click closure
  const destMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  const authInstance = getAuth();
  const userUid = authInstance.currentUser?.uid;
  const db = getFirestore();

  useEffect(() => { locationRef.current = location; }, [location]);
  useEffect(() => { planningRef.current = planning; }, [planning]);

  // Init map (+ click handler for EcoRuta destination picking)
  useEffect(() => {
    loadLeaflet().then((L) => {
      if (!L || !mapDivRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapDivRef.current).setView(BOGOTA, 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.on('click', (e) => {
        if (!planningRef.current) return;
        planRoute(e.latlng.lat, e.latlng.lng);
      });
      mapRef.current = map;
    });
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load saved points
  useEffect(() => {
    AsyncStorage.getItem('puntosAcumulados').then((v) => {
      if (v !== null) setPoints(parseInt(v, 10));
    });
  }, []);

  // Get initial location
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({}).then((loc) => {
        setLocation(loc);
        if (mapRef.current) mapRef.current.setView([loc.coords.latitude, loc.coords.longitude], 16);
      }).catch(() => {});
    });
  }, []);

  // Update user marker when location changes
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !location?.coords) return;
    const { latitude, longitude } = location.coords;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([latitude, longitude]);
    } else {
      userMarkerRef.current = L.circleMarker([latitude, longitude], {
        radius: 10, fillColor: '#4285F4', color: 'white', weight: 3, fillOpacity: 1,
      }).addTo(map);
    }
  }, [location]);

  // Update drawn path polyline
  useEffect(() => {
    pathRef.current = path;
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (pathPolylineRef.current) { pathPolylineRef.current.remove(); pathPolylineRef.current = null; }
    if (shouldDrawPath && path.length > 1) {
      pathPolylineRef.current = L.polyline(
        path.map((p) => [p.latitude, p.longitude]),
        { color: 'green', weight: 4 }
      ).addTo(map);
    }
  }, [path, shouldDrawPath]);

  // Watch location while recording
  useEffect(() => {
    if (!recording) return;
    let sub;
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 10, timeInterval: 500 },
        (newLoc) => {
          const { latitude, longitude } = newLoc.coords;
          setPath((prev) => [...prev, { latitude, longitude }]);
          setLocation(newLoc);
          if (mapRef.current) mapRef.current.panTo([latitude, longitude]);
          if (prevLocationRef.current) {
            const dist = calculateDistance(
              prevLocationRef.current.coords.latitude,
              prevLocationRef.current.coords.longitude,
              latitude, longitude
            );
            const dt = newLoc.timestamp - prevLocationRef.current.timestamp;
            if (dt > 0 && dist / dt < 3 && dist >= 10) {
              setLocalPoints((p) => p + Math.floor(dist / 10));
            }
          }
          prevLocationRef.current = newLoc;
        }
      ).then((s) => { sub = s; });
    });
    return () => sub?.remove();
  }, [recording]);

  const startRecording = async () => {
    setShowStartModal(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ubicación necesaria', 'Permite el acceso a tu ubicación para iniciar un recorrido.');
      return;
    }
    clearRoute();
    setPlanning(false);
    setRecording(true);
    setLocalPoints(0);
    setShouldDrawPath(true);
    setShowLossText(false);
    prevLocationRef.current = null;
    setPath([]);
  };

  const stopRecording = () => {
    const newPoints = points + localPoints;
    setRecording(false);
    setPoints(newPoints);
    setShowStopModal(true);
    setShouldDrawPath(false);
    setShowLossText(true);
    if (userUid) {
      updateDoc(doc(db, 'usuarios', userUid), { puntosAcumulados: newPoints }).catch(console.error);
      AsyncStorage.setItem('puntosAcumulados', newPoints.toString());
    }
  };

  // ── EcoRuta ──────────────────────────────────────────────────────────
  const togglePlanning = () => {
    if (routeInfo || routeLineRef.current) { clearRoute(); return; }
    if (!locationRef.current?.coords) {
      Alert.alert('Ubicación necesaria', 'Activa tu ubicación para planear una EcoRuta.');
      return;
    }
    setPlanning((p) => !p);
  };

  const clearRoute = () => {
    setPlanning(false);
    setRouteInfo(null);
    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }
    if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
  };

  const planRoute = async (destLat, destLng) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const from = locationRef.current?.coords;
    if (!L || !map || !from) return;

    setPlanning(false);
    setRouteLoading(true);
    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }
    if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }

    destMarkerRef.current = L.circleMarker([destLat, destLng], {
      radius: 8, fillColor: '#2a5209', color: 'white', weight: 2, fillOpacity: 1,
    }).addTo(map);

    try {
      const url =
        `https://router.project-osrm.org/route/v1/cycling/` +
        `${from.longitude},${from.latitude};${destLng},${destLat}` +
        `?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.length) {
        Alert.alert('Sin ruta', 'No se pudo trazar una ruta hasta ese punto. Intenta otro destino.');
        return;
      }
      const route = data.routes[0];
      const latlngs = route.geometry.coordinates.map((c) => [c[1], c[0]]);
      routeLineRef.current = L.polyline(latlngs, {
        color: '#2a5209', weight: 7, opacity: 0.85,
      }).addTo(map);
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [40, 40] });
      setRouteInfo({
        km: (route.distance / 1000).toFixed(1),
        min: Math.max(1, Math.round(route.duration / 60)),
      });
    } catch {
      Alert.alert('Sin conexión', 'No pudimos contactar el servicio de rutas. Intenta de nuevo.');
    } finally {
      setRouteLoading(false);
    }
  };

  const PHONE_H = 852; // ponytail: fixed iPhone 15 Pro frame height — avoids browser window.innerHeight
  const mapHeight = PHONE_H - 220;

  return (
    <View style={styles.container}>
      {showLossText && (
        <View style={styles.redContainer}>
          <Text style={styles.localPointsText2}>Podrías estar acumulando</Text>
        </View>
      )}

      <View style={styles.rectangle}>
        <Text style={styles.localPointsText}>Puntos obtenidos: {localPoints}</Text>
      </View>

      {/* EcoRuta status banners */}
      {planning && (
        <View style={styles.hintPill}>
          <Text style={styles.hintText}>Toca el mapa para elegir tu destino</Text>
        </View>
      )}
      {routeInfo && !planning && (
        <View style={styles.routePill}>
          <Text style={styles.routeText}>🚲 {routeInfo.km} km · ~{routeInfo.min} min</Text>
        </View>
      )}

      {/* Leaflet map container — raw div, valid in Expo web */}
      <div ref={mapDivRef} style={{ width: '100%', height: mapHeight }} />

      {routeLoading && (
        <View style={styles.routeLoadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}

      <Modal visible={showStartModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>¿Iniciar recorrido en bicicleta?</Text>
            <TouchableHighlight style={styles.modalButton2} onPress={startRecording}>
              <Text style={styles.buttonText2}>Sí</Text>
            </TouchableHighlight>
            <TouchableHighlight style={styles.modalButton} onPress={() => setShowStartModal(false)}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>

      <Modal visible={showStopModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Recorrido finalizado</Text>
            <Text style={{ fontSize: 15, color: '#5a7050', marginBottom: 8 }}>Puntos en este recorrido: {localPoints}</Text>
            <TouchableHighlight style={styles.modalButton2} onPress={() => setShowStopModal(false)}>
              <Text style={styles.buttonText2}>Aceptar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>

      {/* Bottom control stack — centered, spaced, no overlap */}
      <View style={styles.bottomControls}>
        <TouchableHighlight
          style={[styles.planButton, (planning || routeInfo) && styles.planButtonActive]}
          underlayColor="rgba(255,255,255,0.9)"
          onPress={togglePlanning}
        >
          <Text style={styles.buttonText2}>
            {routeLoading ? 'Trazando…' : routeInfo ? 'Borrar EcoRuta' : planning ? 'Cancelar' : 'Planear EcoRuta'}
          </Text>
        </TouchableHighlight>

        {recording ? (
          <TouchableHighlight style={styles.button} onPress={stopRecording}>
            <Text style={styles.buttonText2}>Finalizar recorrido</Text>
          </TouchableHighlight>
        ) : (
          <TouchableHighlight style={styles.button} onPress={() => setShowStartModal(true)}>
            <Text style={styles.buttonText2}>Iniciar recorrido</Text>
          </TouchableHighlight>
        )}
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  localPointsText: { fontSize: 16, fontWeight: '700', color: '#1a2e10' },
  localPointsText2: { fontSize: 12, color: '#c05050', fontStyle: 'italic', textAlign: 'center' },
  rectangle: {
    width: 250, height: 58,
    backgroundColor: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    justifyContent: 'center', alignItems: 'center',
    position: 'absolute', top: 72, left: '50%',
    transform: [{ translateX: -125 }],
    zIndex: 2, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 16,
  },
  hintPill: {
    position: 'absolute', top: 140, left: '50%', transform: [{ translateX: -130 }],
    width: 260, zIndex: 3, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(173,241,75,0.9)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12,
  },
  hintText: { fontSize: 13, fontWeight: '700', color: '#1a2e10' },
  routePill: {
    position: 'absolute', top: 140, left: '50%', transform: [{ translateX: -110 }],
    width: 220, zIndex: 3, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 14,
  },
  routeText: { fontSize: 14, fontWeight: '700', color: '#2a5209' },
  bottomControls: {
    position: 'absolute', bottom: 94, left: 0, right: 0,
    alignItems: 'center', zIndex: 3,
  },
  planButton: {
    minWidth: 210,
    backgroundColor: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(16px) saturate(160%)',
    WebkitBackdropFilter: 'blur(16px) saturate(160%)',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)',
    paddingVertical: 12, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 10,
  },
  planButtonActive: {
    backgroundColor: 'rgba(173,241,75,0.85)',
    borderColor: 'rgba(255,255,255,0.7)',
  },
  routeLoadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', zIndex: 4,
  },
  button: {
    minWidth: 210,
    borderRadius: 20, backgroundColor: '#ADF14B',
    paddingVertical: 16, paddingHorizontal: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#2a5209', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 14,
  },
  buttonText2: { color: '#1a2e10', fontSize: 15, fontWeight: '700' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  redContainer: {
    position: 'absolute', top: 136, left: '50%',
    transform: [{ translateX: -125 }],
    width: 250, alignItems: 'center', zIndex: 2,
  },
  modalContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  modalContent: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(28px) saturate(160%)',
    WebkitBackdropFilter: 'blur(28px) saturate(160%)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.68)',
    padding: 24, borderRadius: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 24, width: '85%',
  },
  modalText: { fontSize: 17, fontWeight: '700', marginBottom: 14, textAlign: 'center', color: '#1a2e10' },
  modalButton: {
    backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 18,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 13, paddingHorizontal: 28,
    alignItems: 'center', justifyContent: 'center', marginVertical: 6,
    width: '100%',
  },
  modalButton2: {
    backgroundColor: '#ADF14B', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    paddingVertical: 13, paddingHorizontal: 28,
    alignItems: 'center', justifyContent: 'center', marginVertical: 6,
    width: '100%',
  },
});
