import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { db, isFirebaseConfigured } from "../services/firebaseService";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
} from "firebase/firestore";

/**
 * Hook híbrido: LocalStorage + Firebase Firestore
 * - Si Firebase NO está configurado: usa solo LocalStorage (modo demo/offline)
 * - Si Firebase SÍ está configurado: sincroniza en tiempo real con la nube
 *
 * Uso: const [pacientes, setPacientes, isSynced] = useHybridCollection("pacientes", "silvia_pacientes", initialData);
 */
export function useHybridCollection<T extends { id: string }>(
  collectionName: string,
  localStorageKey: string,
  initialData: T[]
): [T[], Dispatch<SetStateAction<T[]>>, boolean] {
  const [data, setData] = useState<T[]>(() => {
    const saved = localStorage.getItem(localStorageKey);
    return saved ? JSON.parse(saved) : initialData;
  });
  const [isSynced, setIsSynced] = useState(false);
  const isLocalUpdate = useRef(false);

  // Guardar en LocalStorage siempre (backup offline)
  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(data));
  }, [data, localStorageKey]);

  // Suscripción en tiempo real a Firebase (si está configurado)
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    const q = query(collection(db, collectionName));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (isLocalUpdate.current) {
          isLocalUpdate.current = false;
          return;
        }
        const firebaseData = snapshot.docs.map((d) => ({ ...d.data(), id: d.id })) as T[];
        if (firebaseData.length > 0) {
          setData(firebaseData);
          setIsSynced(true);
        }
      },
      (error) => {
        console.warn(`Firebase sync error (${collectionName}):`, error);
        setIsSynced(false);
      }
    );

    return () => unsub();
  }, [collectionName]);

  // Wrapper de setData que también escribe a Firebase
  const setHybridData: Dispatch<SetStateAction<T[]>> = (updater) => {
    isLocalUpdate.current = true;
    setData((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;

      // Escribir a Firebase si está configurado
      if (isFirebaseConfigured && db) {
        // Sync diferencial: detectar added/changed/deleted
        next.forEach(async (item: T) => {
          const existing = prev.find((p) => p.id === item.id);
          if (!existing) {
            // Nuevo item
            try {
              const { id, ...dataWithoutId } = item as any;
              await addDoc(collection(db, collectionName), dataWithoutId);
            } catch (e) {
              console.warn("Firebase add error:", e);
            }
          } else if (JSON.stringify(existing) !== JSON.stringify(item)) {
            // Item modificado
            try {
              const ref = doc(db, collectionName, item.id);
              const { id, ...dataWithoutId } = item as any;
              await updateDoc(ref, dataWithoutId);
            } catch (e) {
              console.warn("Firebase update error:", e);
            }
          }
        });

        // Items eliminados
        prev.forEach(async (item: T) => {
          if (!next.find((n) => n.id === item.id)) {
            try {
              await deleteDoc(doc(db, collectionName, item.id));
            } catch (e) {
              console.warn("Firebase delete error:", e);
            }
          }
        });
      }

      return next;
    });
  };

  return [data, setHybridData, isSynced];
}
