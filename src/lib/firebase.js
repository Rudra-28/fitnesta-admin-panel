import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

function getFirebaseAuth() {
  // Initialize lazily so missing env vars don't crash the app at startup
  if (getApps().length === 0) {
    initializeApp({
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    });
  }
  return getAuth(getApps()[0]);
}

/**
 * Sends an OTP to the given Indian mobile number via Firebase Phone Auth.
 * Requires a <div id="recaptcha-container"> to exist in the DOM.
 */
export async function sendOTP(mobile) {
  const auth = getFirebaseAuth();

  // Tear down any stale verifier (e.g. after hot-reload or resend)
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch (_) {}
    window.recaptchaVerifier = null;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
  });

  const phoneNumber = mobile.startsWith('+91') ? mobile : `+91${mobile}`;
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
  window.confirmationResult = confirmationResult;
  return confirmationResult;
}

/**
 * Confirms the 6-digit OTP and returns a Firebase ID Token.
 * Pass this token to your backend's POST /auth/login endpoint.
 */
export async function verifyOTP(otp) {
  if (!window.confirmationResult) {
    throw new Error('No OTP session found. Please request a new OTP.');
  }
  const result = await window.confirmationResult.confirm(otp);
  return await result.user.getIdToken();
}
