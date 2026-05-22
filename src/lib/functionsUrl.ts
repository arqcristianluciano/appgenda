import { httpsCallable, type HttpsCallable } from 'firebase/functions'
import { functions } from './firebase'

export function getCallable<TReq, TRes>(name: string): HttpsCallable<TReq, TRes> {
  if (!functions) throw new Error('Firebase Functions no inicializado')
  return httpsCallable<TReq, TRes>(functions, name)
}
