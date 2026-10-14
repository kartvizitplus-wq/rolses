import React from 'react';
import { Text } from 'react-native';
import { Card, Screen, SectionTitle } from '../src/components/ui';
import { font, space } from '../src/theme';
import { AUTO_APPROVE_HOURS, MAX_REVISIONS, MIN_ROLE_BUDGET } from '../src/lib/pricing';

// NOT: Bu metin bir taslaktır. Yayından önce bir avukata kontrol ettirilmelidir.
const sections: { title: string; body: string[] }[] = [
  {
    title: 'Nasıl çalışır',
    body: [
      'Görev veren, videosundaki karakterleri ve replikleri rol olarak yayınlar ve her role bütçe koyar.',
      'Seslendirmenler ve oyuncular kısa bir deneme kaydıyla başvurur. Görev veren birini seçince o rolün ücreti güvenli ödemeye alınır.',
      `Seçilen kişi kaydı teslim eder. Görev veren onaylayınca ücret aktarılır. ${AUTO_APPROVE_HOURS} saat içinde yanıt verilmezse teslim otomatik onaylanır. En fazla ${MAX_REVISIONS} revizyon istenebilir.`,
    ],
  },
  {
    title: 'Ücretler',
    body: [
      `Bir rolün en düşük bütçesi ${MIN_ROLE_BUDGET} TL’dir.`,
      'Görev verenden rol bütçesinin %5’i kadar güvenli ödeme hizmet bedeli alınır.',
      'Seslendirmenin ödemesinden %15 platform komisyonu kesilir.',
      'Ödemeler lisanslı ödeme kuruluşu aracılığıyla alınır; kart bilgileriniz RolSes’te saklanmaz.',
    ],
  },
  {
    title: 'Kullanım hakları',
    body: [
      'Onaylanan teslimle birlikte görev veren, kaydı görevde belirtilen video ve sosyal medya yayınlarında süresiz kullanma hakkı kazanır.',
      'Teslim edilen sesler yapay zekâ eğitimi, ses klonlama ya da sentetik ses üretimi için kullanılamaz.',
      'Senaryo görevlerinde senaryonun hakları senaryo sahibine aittir; başvuranlar senaryoyu başka amaçla kullanamaz.',
    ],
  },
  {
    title: 'Yasaklar',
    body: [
      'Telefon, e-posta, IBAN gibi iletişim ve ödeme bilgisi paylaşmak; platform dışında ödeme teklif etmek.',
      'Nefret söylemi, taciz, yasa dışı içerik, başkasının sesini izinsiz taklit etme.',
      '18 yaşından küçükler ödeme alamaz; çocuk sesi gereken roller veli hesabıyla yapılır.',
    ],
  },
  {
    title: 'KVKK aydınlatma (özet)',
    body: [
      'Hesap bilgileriniz (ad, e-posta), profiliniz ve yüklediğiniz ses/video kayıtları hizmetin sunulması amacıyla işlenir.',
      'Ses kayıtları yalnızca ilgili görev veren ve sizin tarafınızdan erişilebilir; demo sesiniz profilinizde herkese açıktır.',
      'Hesabınızı ve verilerinizi silmek için destek ekibine yazabilirsiniz. Ödeme bilgileri ödeme kuruluşunda tutulur.',
    ],
  },
];

export default function Legal() {
  return (
    <Screen>
      <Text style={[font.small, { marginBottom: space(2) }]}>
        Bu sayfa kuralların sade bir özetidir. Tam kullanım koşulları ve KVKK metni yayından önce eklenecektir.
      </Text>
      {sections.map((s) => (
        <React.Fragment key={s.title}>
          <SectionTitle>{s.title}</SectionTitle>
          <Card>
            {s.body.map((b, i) => (
              <Text key={i} style={[font.body, { marginBottom: i < s.body.length - 1 ? space(2) : 0 }]}>
                • {b}
              </Text>
            ))}
          </Card>
        </React.Fragment>
      ))}
    </Screen>
  );
}
