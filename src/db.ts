import { MongoClient, Db } from 'mongodb'

let db: Db

export async function connectDB(): Promise<void> {
  const client = new MongoClient(process.env.MONGODB_URI!)
  await client.connect()
  db = client.db()
  await db.collection('location_pings').createIndex({ user_id: 1, received_at: -1 })
  await db.collection('users').createIndex({ last_seen: 1 })
}

export function getDB(): Db {
  return db
}
