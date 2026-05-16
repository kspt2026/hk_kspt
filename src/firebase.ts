import admin from 'firebase-admin'

function parsePrivateKey(raw: string | undefined): string {
  if (!raw) return ''
  return raw
    .replace(/^["']|["']$/g, '')  // strip accidental surrounding quotes
    .replace(/\\n/g, '\n')         // literal \n → real newline
}

let messagingReady = false

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
  })
  messagingReady = true
} catch (err) {
  console.error('[firebase] init failed — push notifications disabled:', (err as Error).message)
}

export async function sendZonesUpdatedPush(tokens: string[]): Promise<void> {
  if (!messagingReady || tokens.length === 0) return
  try {
    await admin.messaging().sendEachForMulticast({
      tokens,
      data: { type: 'zones_updated' },
      notification: {
        title: 'Danger zone update',
        body: 'Zone status has changed.',
      },
      android: { priority: 'high' },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { contentAvailable: true } },
      },
    })
  } catch (err) {
    console.error('[firebase] sendEachForMulticast failed:', (err as Error).message)
  }
}
