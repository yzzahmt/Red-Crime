/* =========================================================================
 *  RED CRIME - Gizlilik Politikası ve KVKK Aydınlatma Metni
 *  Tek kaynak: oyun içi onay ekranı (js/scenes/privacy.js) ve web sayfası
 *  (privacy.html, Google Play'e verilen bağlantı) bu metni kullanır.
 *  Metin değişirse VERSION'ı güncelle: oyuncuya yeniden onaya sunulur.
 *  Paragraf "• " ile başlıyorsa madde işaretli satırdır.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const CONTACT = {
    name: 'Ahmet Yaz',
    brand: 'Yazify',
    email: 'yzz_software@hotmail.com',
    app: 'Red Crime',
    pkg: 'com.yazify.redcrime',
  };

  const TR = {
    title: 'Gizlilik Politikası ve KVKK Aydınlatma Metni',
    updated: 'Son güncelleme: 29 Eylül 2026',
    intro: `Bu metin, ${CONTACT.app} oyununu (paket adı: ${CONTACT.pkg}) kullanırken hangi verilerin, hangi amaçla ve hangi hukuki sebeple işlendiğini 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında açıklar. Oyunu oynamaya başlamadan önce lütfen okuyun.`,
    sections: [
      {
        h: '1. Veri Sorumlusu',
        p: [`Veri sorumlusu: ${CONTACT.name} (${CONTACT.brand})`, `E-posta: ${CONTACT.email}`, 'Kişisel verilerinizle ilgili her türlü soru ve talebiniz için bu adrese yazabilirsiniz.'],
      },
      {
        h: '2. Kısaca',
        p: [
          '• Oyunda hesap açma yoktur. Adınızı, e-postanızı, telefon numaranızı, rehberinizi, fotoğraflarınızı, mikrofonunuzu veya GPS konumunuzu İSTEMEYİZ ve TOPLAMAYIZ.',
          '• Oyunun kendine ait bir sunucusu yoktur. İlerlemeniz yalnızca kendi cihazınızda saklanır, bize gönderilmez.',
          '• Reklamlar Google AdMob, satın almalar Google Play / Apple App Store üzerinden yapılır. Bu şirketler kendi politikalarına göre bazı cihaz verilerini işler (aşağıda ayrıntılı).',
          '• Verilerinizi hiç kimseye satmayız.',
        ],
      },
      {
        h: '3. Cihazınızda Saklanan Veriler',
        p: [
          'Aşağıdaki bilgiler yalnızca cihazınızın uygulama depolama alanında tutulur; bize veya üçüncü kişilere iletilmez:',
          '• Ayarlar: ses seviyeleri, dil, zorluk, grafik kalitesi, kontrol tercihleri.',
          '• Oyun ilerlemesi: açılan bölümler, yıldızlar, rekorlar, oyun içi para, satın alınan ekipman ve geliştirmeler, istatistikler.',
          '• Satın alma kayıtları: premium durumu ve satın alınan paketlerin mağaza işlem kimlikleri (aynı satın almanın iki kez teslim edilmemesi için).',
          '• Bu metni kabul ettiğiniz sürüm bilgisi.',
          'Amaç: oyunun çalışması ve ilerlemenizin kaybolmaması. Uygulamayı silerseniz bu verilerin tümü silinir. Ayarlar > İlerlemeyi Sıfırla ise oyun ilerlemesini siler; satın aldığınız premium ve satın alma kayıtları korunur.',
        ],
      },
      {
        h: '4. Reklamlar (Google AdMob)',
        p: [
          'Ücretsiz sürümde menülerde banner, bazı soygunlardan sonra tam ekran reklam ve isteğe bağlı ödüllü video reklam gösterilir. Reklamlar Google LLC / Google Ireland Ltd. tarafından sunulur. Google, reklam göstermek için şu verileri işleyebilir:',
          '• Reklam kimliği (Android Reklam Kimliği; iOS\'ta yalnızca izin verirseniz IDFA)',
          '• IP adresi ve buradan çıkarılan yaklaşık konum (ülke / şehir düzeyi)',
          '• Cihaz modeli, işletim sistemi sürümü, dil, ekran boyutu, uygulama sürümü',
          '• Reklam etkileşimleri (gösterim, tıklama, izleme süresi) ve teknik tanılama bilgileri',
          'Amaç: reklam göstermek, reklam performansını ölçmek, sahte tıklama ve dolandırıcılığı önlemek ve yalnızca izin verdiyseniz ilgi alanlarınıza göre kişiselleştirilmiş reklam göstermek.',
          'Avrupa Ekonomik Alanı ve Birleşik Krallık\'ta Google\'ın rıza formu, iOS\'ta ise Apple\'ın "İzleme" izni ayrıca sorulur. İzin vermezseniz kişiselleştirilmemiş reklam gösterilir.',
          'Premium satın alırsanız hiçbir reklam gösterilmez ve AdMob başlatılmaz.',
          'Google Gizlilik Politikası: https://policies.google.com/privacy',
          'Google\'ın iş ortağı uygulamalardaki veri kullanımı: https://policies.google.com/technologies/partner-sites',
        ],
      },
      {
        h: '5. Uygulama İçi Satın Almalar',
        p: [
          'Oyun parası paketleri ve premium, Google Play Faturalandırma (Android) veya Apple App Store (iOS) üzerinden satın alınır. Ödeme ve kart bilgileriniz doğrudan Google veya Apple tarafından işlenir; bu bilgiler bize HİÇBİR ŞEKİLDE ulaşmaz.',
          'Mağazadan yalnızca satın alınan ürünün kimliği ve işlem kimliği / satın alma belirteci cihazınıza gelir. Amaç: satın aldığınız ürünü teslim etmek, aynı satın almanın iki kez teslim edilmesini önlemek ve "Geri Yükle" ile premium\'u geri yüklemek.',
          'Google Play Gizlilik: https://policies.google.com/privacy · Apple Gizlilik: https://www.apple.com/legal/privacy/',
        ],
      },
      {
        h: '6. Hukuki Sebepler (KVKK md. 5)',
        p: [
          '• Sözleşmenin kurulması ve ifası: oyunun çalışması, ilerlemenin saklanması, satın alınan ürünlerin teslimi.',
          '• Meşru menfaat: reklam dolandırıcılığının önlenmesi, uygulamanın güvenliği ve hataların giderilmesi.',
          '• Açık rıza: reklam kimliğinin kullanılması, kişiselleştirilmiş reklam ve verilerin yurt dışına aktarılması. Bu metnin sonundaki "Kabul Ediyorum" düğmesi bu açık rızanızı ifade eder.',
        ],
      },
      {
        h: '7. Verilerin Aktarılması',
        p: [
          'Yukarıda sayılan veriler yalnızca reklam ve satın alma hizmeti sağlayan Google LLC, Google Ireland Ltd. ve Apple Inc. ile, bu hizmetlerin çalışması için gerekli olduğu ölçüde paylaşılır. Bu şirketlerin sunucuları Türkiye dışında (başta ABD ve Avrupa Birliği) bulunduğundan, veriler KVKK md. 9 kapsamında yurt dışına aktarılmış olur.',
          'Yasal zorunluluk hâlinde yetkili kamu kurumlarına bilgi verilmesi dışında verileriniz başka hiçbir üçüncü kişiyle paylaşılmaz ve satılmaz.',
        ],
      },
      {
        h: '8. Saklama Süresi',
        p: [
          'Cihazınızdaki oyun verileri, uygulamayı silene veya ilerlemeyi sıfırlayana kadar saklanır. Google ve Apple\'ın işlediği veriler bu şirketlerin kendi saklama politikalarına tabidir.',
        ],
      },
      {
        h: '9. Çocukların Gizliliği',
        p: [
          'Red Crime soygun temalı bir oyundur ve 13 yaşın altındaki çocuklara yönelik değildir. 13 yaşından küçük çocuklardan bilerek veri toplamayız. Böyle bir durumu fark ederseniz lütfen bize yazın. 18 yaşından küçük kullanıcıların satın alma yapmadan önce ebeveyn veya vasisinin iznini alması gerekir.',
        ],
      },
      {
        h: '10. KVKK Kapsamındaki Haklarınız (md. 11)',
        p: [
          'Veri sorumlusuna başvurarak şu haklarınızı kullanabilirsiniz:',
          '• Kişisel verilerinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme',
          '• İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme',
          '• Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme',
          '• Eksik veya yanlış işlenmişse düzeltilmesini isteme',
          '• KVKK md. 7 şartları çerçevesinde silinmesini veya yok edilmesini isteme',
          '• Düzeltme ve silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme',
          '• Otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonuç çıkmasına itiraz etme',
          '• Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme',
          `Başvurularınızı ${CONTACT.email} adresine e-posta ile iletebilirsiniz. Talebiniz en geç 30 gün içinde ücretsiz olarak yanıtlanır. Yanıttan memnun kalmazsanız Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsiniz.`,
        ],
      },
      {
        h: '11. Rızanızı Geri Çekme ve Tercihleriniz',
        p: [
          '• Oyun içinde: Ayarlar > GİZLİLİK / KVKK > RIZAMI GERİ ÇEK. Rızanızı geri çektiğinizde reklamlar durur; oyunu tekrar oynamak için metni yeniden kabul etmeniz gerekir.',
          '• Android: Ayarlar > Google > Reklamlar bölümünden reklam kimliğinizi silebilir veya sıfırlayabilirsiniz.',
          '• iOS: Ayarlar > Gizlilik ve Güvenlik > İzleme bölümünden izni kapatabilirsiniz.',
          '• Uygulamayı silmek, cihazınızdaki tüm oyun verilerini siler.',
        ],
      },
      {
        h: '12. Güvenlik',
        p: [
          'Oyun sizden kişisel bilgi istemez ve kendi sunucusuna veri göndermez. Reklam ve satın alma bağlantıları Google ve Apple\'ın şifreli (HTTPS) altyapısı üzerinden yapılır.',
        ],
      },
      {
        h: '13. Değişiklikler',
        p: [
          'Bu metin güncellenebilir. Önemli bir değişiklik olduğunda güncel metin oyun açılışında size yeniden gösterilir ve oynamaya devam etmek için yeniden onayınız istenir.',
        ],
      },
      {
        h: '14. İletişim',
        p: [`${CONTACT.name} (${CONTACT.brand})`, `E-posta: ${CONTACT.email}`],
      },
    ],
    accept: 'Okudum, anladım. Gizlilik Politikası ve KVKK Aydınlatma Metni\'ni kabul ediyor, yukarıda belirtilen işlemler için açık rıza veriyorum.',
  };

  const EN = {
    title: 'Privacy Policy',
    updated: 'Last updated: September 29, 2026',
    intro: `This policy explains what data is processed, why, and on what legal basis when you use ${CONTACT.app} (package name: ${CONTACT.pkg}), including under Turkish Personal Data Protection Law No. 6698 ("KVKK"). Please read it before you start playing.`,
    sections: [
      {
        h: '1. Data Controller',
        p: [`Data controller: ${CONTACT.name} (${CONTACT.brand})`, `Email: ${CONTACT.email}`, 'Write to this address for any question or request about your personal data.'],
      },
      {
        h: '2. In Short',
        p: [
          '• There are no accounts. We do NOT ask for or collect your name, email, phone number, contacts, photos, microphone or GPS location.',
          '• The game has no server of its own. Your progress is stored only on your device and is never sent to us.',
          '• Ads are served by Google AdMob; purchases go through Google Play / Apple App Store. These companies process some device data under their own policies (details below).',
          '• We never sell your data.',
        ],
      },
      {
        h: '3. Data Stored on Your Device',
        p: [
          'The following is kept only in the app\'s storage on your device and is not sent to us or anyone else:',
          '• Settings: volume, language, difficulty, graphics quality, control preferences.',
          '• Game progress: unlocked levels, stars, records, in-game money, gear and upgrades bought, statistics.',
          '• Purchase records: premium status and store transaction IDs of purchased packs (so a purchase is never delivered twice).',
          '• The version of this policy you accepted.',
          'Purpose: to run the game and keep your progress. Uninstalling the app deletes all of this data. Settings > Reset Progress deletes your game progress but keeps premium and purchase records.',
        ],
      },
      {
        h: '4. Advertising (Google AdMob)',
        p: [
          'The free version shows a banner in menus, a full-screen ad after some heists and optional rewarded video ads. Ads are provided by Google LLC / Google Ireland Ltd. To serve ads, Google may process:',
          '• Advertising ID (Android Advertising ID; on iOS the IDFA only if you allow tracking)',
          '• IP address and approximate location derived from it (country / city level)',
          '• Device model, OS version, language, screen size, app version',
          '• Ad interactions (impressions, clicks, watch time) and technical diagnostics',
          'Purpose: showing ads, measuring ad performance, preventing invalid traffic and fraud, and — only if you consent — showing personalized ads.',
          'In the EEA and the UK, Google\'s consent form is shown; on iOS, Apple\'s "Allow Tracking" prompt is shown. If you decline, non-personalized ads are shown.',
          'If you buy premium, no ads are shown and AdMob is not started.',
          'Google Privacy Policy: https://policies.google.com/privacy',
          'How Google uses data from partner apps: https://policies.google.com/technologies/partner-sites',
        ],
      },
      {
        h: '5. In-App Purchases',
        p: [
          'Money packs and premium are bought through Google Play Billing (Android) or the Apple App Store (iOS). Payment and card details are processed directly by Google or Apple and NEVER reach us.',
          'Only the purchased product ID and the transaction ID / purchase token reach your device. Purpose: delivering what you bought, preventing double delivery, and restoring premium with "Restore".',
          'Google Privacy: https://policies.google.com/privacy · Apple Privacy: https://www.apple.com/legal/privacy/',
        ],
      },
      {
        h: '6. Legal Bases (KVKK Art. 5)',
        p: [
          '• Performance of a contract: running the game, saving progress, delivering purchases.',
          '• Legitimate interest: preventing ad fraud, app security and fixing errors.',
          '• Explicit consent: use of the advertising ID, personalized ads and transfer of data abroad. The "I Accept" button at the end of this policy records your consent.',
        ],
      },
      {
        h: '7. Data Transfers',
        p: [
          'The data above is shared only with Google LLC, Google Ireland Ltd. and Apple Inc., as far as needed to provide ads and purchases. Their servers are outside Turkey (mainly in the USA and the EU), so data is transferred abroad under KVKK Art. 9.',
          'Except where required by law to competent authorities, your data is not shared with or sold to any other third party.',
        ],
      },
      {
        h: '8. Retention',
        p: ['Game data on your device is kept until you uninstall the app or reset your progress. Data processed by Google and Apple is subject to their own retention policies.'],
      },
      {
        h: '9. Children\'s Privacy',
        p: [
          'Red Crime is a heist-themed game and is not directed at children under 13. We do not knowingly collect data from children under 13; if you believe this has happened, please contact us. Users under 18 must get a parent\'s or guardian\'s permission before making purchases.',
        ],
      },
      {
        h: '10. Your Rights (KVKK Art. 11)',
        p: [
          'You can contact the data controller to:',
          '• learn whether your personal data is processed and request information about it',
          '• learn the purpose of processing and whether it is used accordingly',
          '• know the third parties it is transferred to, in Turkey or abroad',
          '• request correction of incomplete or inaccurate data',
          '• request deletion or destruction under KVKK Art. 7',
          '• request that corrections and deletions be notified to those third parties',
          '• object to a result against you arising from automated analysis',
          '• claim compensation for damage caused by unlawful processing',
          `Send requests to ${CONTACT.email}. We answer free of charge within 30 days at the latest. If you are not satisfied, you may complain to the Turkish Personal Data Protection Board. If you are in the EU/UK, you also have your GDPR rights (access, rectification, erasure, restriction, portability, objection).`,
        ],
      },
      {
        h: '11. Withdrawing Consent and Your Choices',
        p: [
          '• In the game: Settings > PRIVACY > WITHDRAW CONSENT. Ads stop, and you must accept the policy again to keep playing.',
          '• Android: Settings > Google > Ads lets you delete or reset your advertising ID.',
          '• iOS: Settings > Privacy & Security > Tracking lets you turn tracking off.',
          '• Uninstalling the app deletes all game data on your device.',
        ],
      },
      {
        h: '12. Security',
        p: ['The game does not ask for personal information and sends no data to a server of its own. Ad and purchase connections use Google\'s and Apple\'s encrypted (HTTPS) infrastructure.'],
      },
      {
        h: '13. Changes',
        p: ['This policy may be updated. After a significant change, the new version is shown when you open the game and your consent is asked again before you can keep playing.'],
      },
      {
        h: '14. Contact',
        p: [`${CONTACT.name} (${CONTACT.brand})`, `Email: ${CONTACT.email}`],
      },
    ],
    accept: 'I have read and understood the Privacy Policy and give my explicit consent to the processing described above.',
  };

  RC.Privacy = {
    VERSION: '2026-09-29',
    CONTACT,
    TR,
    EN,
    /** Seçili dile göre metin */
    get text() {
      return RC.I18N && RC.I18N.lang === 'en' ? EN : TR;
    },
    get accepted() {
      return RC.Save.settings.privacyAccepted === this.VERSION;
    },
  };
})(window.RC);
