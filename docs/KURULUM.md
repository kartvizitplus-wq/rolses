# RolSes kurulum rehberi

Uygulama anahtarsız da çalışır (demo modu). Gerçek kullanıcılar, Google girişi ve ödemeler için aşağıdaki adımları sırayla yapın.

## 1. Web sitesini aç (5 dakika)

**Seçenek A — GitHub Pages** (depo herkese açıksa ücretsiz):

1. GitHub'da depo → **Settings → Pages → Source: GitHub Actions**.
2. **Actions** sekmesinde "Web sitesi" işini **Run workflow** ile çalıştırın.
3. Adres: `https://kartvizitplus-wq.github.io/rolses/`

Depo gizliyse ücretsiz planda GitHub Pages çalışmaz; B seçeneğini kullanın.

**Seçenek B — Cloudflare Pages** (gizli depoyla da ücretsiz):

1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → `rolses` deposunu seçin.
2. Build command: `npx expo export -p web` · Build output: `dist`
3. Environment variables: aşağıdaki Supabase anahtarları (varsa).
4. İsterseniz kendi alan adınızı bağlayın (ör. `rolses.net`).

## 2. Telefona Android uygulamasını kur

Her yüklemede GitHub otomatik APK üretir (yaklaşık 15–20 dakika).

1. Depo → **Releases → "RolSes — son sürüm (test)"** → `RolSes.apk`.
2. Telefonda dosyayı açın, "bilinmeyen kaynaklara izin ver" deyin.

## 3. Supabase: veritabanı ve giriş (15 dakika)

1. [supabase.com](https://supabase.com) → ücretsiz hesap → **New project** (bölge: Frankfurt).
2. **SQL Editor** → `supabase/migrations/0001_init.sql` dosyasının tamamını yapıştırıp **Run**.
3. **Project Settings → API**: `Project URL` ve `anon public` anahtarını kopyalayın.
4. GitHub depo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
5. Actions'tan iki işi yeniden çalıştırın. Artık uygulama canlı modda çalışır.

## 4. Google ile giriş

1. [console.cloud.google.com](https://console.cloud.google.com) → yeni proje → **APIs & Services → OAuth consent screen** (External, uygulama adı RolSes).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. *Authorized redirect URIs*: `https://<supabase-proje-kodu>.supabase.co/auth/v1/callback`
4. Çıkan **Client ID** ve **Client secret**'ı Supabase → **Authentication → Providers → Google** ekranına girip açın.
5. Supabase → **Authentication → URL Configuration**:
   - Site URL: web adresiniz (ör. `https://kartvizitplus-wq.github.io/rolses/`)
   - Redirect URLs: web adresiniz + `rolses://auth-callback`

## 5. Ödemeler

Ödeme fonksiyonu varsayılan olarak **test modunda** çalışır: para çekilmez, akış uçtan uca denenir.

1. Bilgisayarda: `npx supabase login` → `npx supabase link --project-ref <proje-kodu>` → `npx supabase functions deploy payments`
2. Gerçek ödeme için iyzico'dan **Pazaryeri** hesabı alın, sonra Supabase → **Edge Functions → Secrets**:
   - `PAYMENTS_MODE=iyzico`
   - `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`
   - `IYZICO_BASE_URL` (test: `https://sandbox-api.iyzipay.com`, canlı: `https://api.iyzipay.com`)
   - `CRON_SECRET` (rastgele uzun bir metin)
3. Seslendirmenlerin ödeme alabilmesi için iyzico alt üye işyeri kaydı gerekir; fonksiyondaki `register-payout` işlemi bunu yapar (IBAN bizde saklanmaz).
4. 72 saatlik otomatik onay için Supabase'de saatlik bir zamanlanmış görev kurun ve `payments` fonksiyonuna `{"action":"auto-approve"}` gövdesi ve `x-cron-secret` başlığıyla istek attırın.

> iyzico komisyon oranları, bireysel alt üye işyeri şartları ve sözleşme metinleri canlıya çıkmadan önce iyzico, avukat ve mali müşavirle teyit edilmelidir.

## 6. Mağazalar

- **Google Play**: [expo.dev](https://expo.dev) hesabı → `npx eas build -p android --profile production` → çıkan `.aab` dosyasını Play Console'a yükleyin (geliştirici hesabı tek seferlik 25 USD).
- **App Store**: Apple Developer üyeliği (yıllık 99 USD) → `npx eas build -p ios --profile production` → `npx eas submit -p ios`. Bilgisayar gerekmez, derleme Expo sunucularında yapılır.
