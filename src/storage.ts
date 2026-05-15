import AsyncStorage from '@react-native-async-storage/async-storage'
import { v4 as uuidv4 } from 'uuid'
import { USER_ID_KEY } from './constants'

export async function getUserId(): Promise<string> {
  let id = await AsyncStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = uuidv4()
    await AsyncStorage.setItem(USER_ID_KEY, id)
  }
  return id
}
