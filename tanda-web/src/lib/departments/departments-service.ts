import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { mapDepartmentDoc } from '@/lib/departments/map-department';
import type {
  CreateDepartmentInput,
  Department,
  DepartmentFirestore,
  UpdateDepartmentInput,
} from '@/lib/types/department';

export function subscribeDepartments(
  onData: (departments: Department[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onError?.(new Error('Firestore is not available.'));
    return () => {};
  }

  return onSnapshot(
    query(collection(db, COLLECTIONS.DEPARTMENTS), orderBy('name')),
    (snapshot) => {
      onData(
        snapshot.docs.map((document) =>
          mapDepartmentDoc(document.id, document.data() as DepartmentFirestore),
        ),
      );
    },
    (error) => onError?.(error),
  );
}

export async function createDepartment(
  input: CreateDepartmentInput,
): Promise<string> {
  if (!db) throw new Error('Firestore is not available.');

  const name = input.name.trim();
  if (!name) {
    throw new Error('Department name is required.');
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.DEPARTMENTS), {
    name,
    active: true,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateDepartment(
  departmentId: string,
  input: UpdateDepartmentInput,
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');

  const name = input.name.trim();
  if (!name) {
    throw new Error('Department name is required.');
  }

  await updateDoc(doc(db, COLLECTIONS.DEPARTMENTS, departmentId), { name });
}

export async function setDepartmentActive(
  departmentId: string,
  active: boolean,
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  await updateDoc(doc(db, COLLECTIONS.DEPARTMENTS, departmentId), { active });
}

export async function countEmployeesInDepartment(
  departmentName: string,
): Promise<number> {
  if (!db) throw new Error('Firestore is not available.');

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.EMPLOYEES),
      where('department', '==', departmentName.trim()),
    ),
  );

  return snapshot.size;
}

export async function deleteDepartment(departmentId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');

  const departmentRef = doc(db, COLLECTIONS.DEPARTMENTS, departmentId);
  const snapshot = await getDoc(departmentRef);
  if (!snapshot.exists()) return;

  const name =
    typeof snapshot.data().name === 'string' ? snapshot.data().name.trim() : '';
  if (name) {
    const assignedCount = await countEmployeesInDepartment(name);
    if (assignedCount > 0) {
      throw new Error(
        `Cannot delete this department. ${assignedCount} employee${assignedCount === 1 ? '' : 's'} still assigned. Reassign them first.`,
      );
    }
  }

  await deleteDoc(departmentRef);
}
