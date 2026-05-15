import admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

export async function sendZonesUpdatedPush(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return
  await admin.messaging().sendEachForMulticast({
    tokens,
    data: { type: 'zones_updated' },
    android: { priority: 'high' },
    apns: {
      headers: { 'apns-priority': '5' },
      payload: { aps: { contentAvailable: true } },
    },
  })
}
