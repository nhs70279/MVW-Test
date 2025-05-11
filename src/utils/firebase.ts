// src/utils/firebase.ts
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyD5oMJaomdn9LISiUAj_FXGbYHtUx4mq0A",
  authDomain: "nextstation-e1b77.firebaseapp.com",
  projectId: "nextstation-e1b77",
  storageBucket: "nextstation-e1b77.appspot.com",
  messagingSenderId: "262822596811",
  appId: "1:262822596811:web:22a763800dbd210b4e",
  measurementId: "G-82SXY940D5"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ドキュメントIDは適宜ユーザーIDなどに置き換えてください
const FP_DOC = doc(db, 'fingerprints', 'global')

// これまでの単数取得→配列取得に変更
export async function getFingerprints(): Promise<string[]> {
  const snap = await getDoc(FP_DOC)
  if (!snap.exists()) return []
  const data = snap.data()
  return Array.isArray(data.fps) ? data.fps : []
}

// 上書きではなく、arrayUnion で追加
export async function addFingerprint(fp: string): Promise<void> {
  // 初回はドキュメント自体がない場合があるので
  const snap = await getDoc(FP_DOC)
  if (!snap.exists()) {
    await setDoc(FP_DOC, { fps: [fp] })
  } else {
    await updateDoc(FP_DOC, { fps: arrayUnion(fp) })
  }
}
