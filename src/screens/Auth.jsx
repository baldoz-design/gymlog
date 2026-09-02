import { signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function Auth({ error }) {
  async function handleSignIn() {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (e) {
      console.error('Sign-in error:', e);
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100dvh',
      background: '#121110', fontFamily: 'sans-serif',
      padding: 32, boxSizing: 'border-box', gap: 20,
      maxWidth: 480, margin: '0 auto', width: '100%',
    }}>
      <div style={{ fontSize: 56 }}>💪</div>

      <h1 style={{
        color: '#D9F24B', fontSize: 28, fontWeight: 900,
        letterSpacing: 3, margin: 0,
      }}>
        GYMLOG
      </h1>

      <p style={{
        color: '#8E877C', fontSize: 14, textAlign: 'center',
        lineHeight: 1.6, margin: 0, maxWidth: 260,
      }}>
        Accedi con Google per sincronizzare i tuoi allenamenti su tutti i dispositivi.
      </p>

      <button
        onClick={handleSignIn}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#D9F24B', color: '#121110',
          border: 'none', borderRadius: 14,
          padding: '14px 28px', fontWeight: 800, fontSize: 15,
          cursor: 'pointer', marginTop: 8,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Accedi con Google
      </button>

      {error && (
        <p style={{ color: '#E0762C', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
          {error}
        </p>
      )}

      <p style={{ color: '#4a4540', fontSize: 11, textAlign: 'center', marginTop: 16 }}>
        I tuoi dati sono privati e visibili solo a te.
      </p>
    </div>
  );
}
