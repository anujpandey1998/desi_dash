export function firebaseMessage(error: unknown): string {
  const code = String((error as {code?: string})?.code || '').split('/').pop()||'';
  const messages: Record<string,string> = {
    'invalid-email': 'Email sahi format mein daalo.',
    'invalid-credential': 'Email ya password sahi nahi hai.',
    'wrong-password': 'Email ya password sahi nahi hai.',
    'user-not-found': 'Email ya password sahi nahi hai.',
    'email-already-in-use': 'Is email ka account already hai. Login karo.',
    'weak-password': 'Password kam se kam 8 characters ka rakho.',
    'network-request-failed': 'Network nahi mil raha. Connection check karke retry karo.',
    'unavailable': 'Server abhi unavailable hai. Thodi der mein retry karo.',
    'too-many-requests': 'Bahut attempts ho gaye. Thodi der baad try karo.',
    'permission-denied': 'Access nahi mila. Login aur App Check setup check karo.',
    'unauthenticated': 'Pehle login karo.',
    'cancelled': 'Sign-in cancel hua. Aap dobara try kar sakte hain.',
  };
  return messages[code] || (error instanceof Error ? error.message : 'Kuch galat hua. Please retry.');
}
