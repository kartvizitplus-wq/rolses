import { Redirect } from 'expo-router';

// Google girişinden uygulamaya dönüş adresi (rolses://auth-callback). Oturum live.ts içinde kurulur.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
