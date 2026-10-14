# RolSes

Videodaki her karakter için gerçek bir ses bulma platformu. İçerik üreticileri replikleri ve bütçeyi girer, seslendirmenler telefondan sesli başvurur, seçilen kişinin ücreti teslim onaylanana kadar güvenli ödemede bekler.

Tek kod tabanı: **iOS, Android ve web** (React Native + Expo).

## Ne çalışıyor

- Senaryo yapıştırınca rolleri otomatik çıkarma (`Ahmet: replik (kızgın) (50 TL)`)
- Seslendirme ve senaryo-çekim görevleri, arama ve filtreler
- Uygulama içinden ses kaydıyla başvuru (ya da dosya yükleme)
- Başvuruları dinleme, kısa liste, seçme
- Güvenli ödeme akışı: ödeme → teslim → revizyon (en fazla 2) → onay → puanlama
- İş bazlı mesajlaşma; telefon, e-posta, IBAN paylaşımı engellenir
- Google ile giriş ve e-posta ile giriş
- Komisyon: yetenekten %15, görev verenden %5
- Demo modu: Supabase anahtarı girilmeden her şey cihazda çalışır

## Klasörler

| Klasör | İçerik |
| --- | --- |
| `app/` | Ekranlar (Expo Router) |
| `src/data/` | Veri katmanı: `live.ts` (Supabase), `demo.ts` (cihazda) |
| `src/components/` | Arayüz parçaları, ses kaydedici ve oynatıcı |
| `supabase/migrations/` | Veritabanı, güvenlik kuralları, iş akışı fonksiyonları |
| `supabase/functions/payments/` | iyzico pazaryeri ödeme fonksiyonu |
| `.github/workflows/` | Web yayını ve Android APK derlemesi |

## Kurulum

Adım adım rehber: [docs/KURULUM.md](docs/KURULUM.md)

Bilgisayarda çalıştırmak için:

```bash
npm install
npx expo start
```
