# RED CRIME

2B yandan görünümlü, web tabanlı gizlilik/hırsızlık oyunu. Sokakta yalnızca "Red Crime" diye bilinen hırsızla
hedefi uyandırmadan, süre dolmadan en değerli ganimeti kamyona yükle.

## Çalıştırma

Tarayıcı güvenliği nedeniyle yerel bir sunucu üzerinden aç:

```bash
cd RedCrime
python3 -m http.server 8765
# tarayıcıda: http://localhost:8765
```

Geliştirici kısayolu: `http://localhost:8765/?scene=heist&level=2` doğrudan 3. bölüme atlar
(`scene`: splash, intro, menu, settings, howto, levelselect, shop, briefing, truckride, heist, results, busted).

## Kontroller

| Tuş | Eylem |
| --- | --- |
| A / D | Yürü |
| W | Zıpla (el merdiveninde tırman) |
| S | Çömel (sessiz yürüme, saklanma) |
| S + W | Platformdan aşağı in |
| SHIFT | Koş |
| SPACE | Tut / çuvala at / bırak / kamyona yükle |
| S + SPACE | Eşyayı sessizce yere koy |
| Q | Fırlat (dikkat dağıt) |
| E | Kasayı aç / kamyonla kaç |
| F | El feneri (fareyle nişan) |
| M | Harita |
| ESC | Duraklat |

## Yapı

```
js/core      utils, config (bölümler, senaryo), input, audio (sentez ses + müzik), save
js/render    particles, camera, draw (karakterler, ikonlar), backgrounds, truck, worldrender, lighting
js/world     itemdefs (100+ eşya), furniture (40+ mobilya), physics, levelgen (prosedürel evler)
js/entities  item, player, resident (ev sahibi yapay zekâsı), dog
js/ui        widgets (menü bileşenleri), hud (arayüz + mini harita)
js/scenes    intro, menu/ayarlar/nasıl oynanır, bölüm seçimi + dükkân, köprü brifingi,
             kamyon yolculuğu, soygun, sonuç + yakalanma
```

## Dokunmatik kontroller (telefon / tablet)

Joystick yok; ekranın herhangi bir yerinde Limbo tarzı hareketler:

| Hareket | Eylem |
| --- | --- |
| Sağa / sola kaydır ve tut | Yürü (aynı yöne uzun kaydır: koş) |
| Yukarı fırlat | Zıpla (merdivende tut: tırman) |
| Aşağı kaydır ve tut | Çömel · aşağı sonra yukarı: platformdan in |
| Dokun | Bağlama göre al / çuvala at / bırak / yükle / aç / kaç |
| Basılı tut | Eşya elindeyse fırlat, değilse el feneri |
| İkinci parmakla dokun | Hareket ederken eylem (çömelip dokun: sessizce koy) |
| Mini haritaya basılı tut · sağ üst ⏸ | Büyük harita · duraklat |

Kod: `js/core/touch.js`. Sahneler `touchGestures / touchTap / touchLongPress / touchButtons` ile bağlanır.

## Masaüstü (Steam: Windows · macOS · Linux)

```bash
npm install
npm run desktop       # pencerede dene
npm run dist:win      # dist/desktop/win-unpacked   → Steam deposu, çalıştırılabilir: "Red Crime.exe"
npm run dist:mac      # dist/desktop/mac-universal  → "Red Crime.app" (Intel + Apple Silicon)
npm run dist:linux    # dist/desktop/linux-unpacked → "red-crime" (+ AppImage, tar.gz; Ubuntu, Arch, SteamOS...)
```

Steam'e her platformun `*-unpacked` / `mac-universal` klasörünü ayrı depot olarak yükle.
macOS'ta Gatekeeper uyarısı olmaması için Apple Developer sertifikasıyla imzalayıp noter onayı (notarize) al
(`package.json` → `build.mac.identity`). F11 / Alt+Enter: tam ekran, `--windowed`: pencere modu.

## Mobil (Google Play · App Store)

```bash
npm run android          # web dosyalarını kopyalar, Android Studio'yu açar
npm run android:bundle   # Play Store için imzalı .aab → android/app/build/outputs/bundle/release
npm run ios              # Xcode'u açar (Mac + Xcode + Apple Developer hesabı gerekir)
```

- Uygulama kimliği `com.yazify.redcrime` (mağazaya ilk yüklemeden sonra değiştirilemez; istersen önce
  `capacitor.config.json`, `package.json`, `android/app/build.gradle` ve Xcode'da değiştir).
- Play imzası: `keytool -genkey -v -keystore android/red-crime-release.jks -alias redcrime -keyalg RSA -keysize 2048 -validity 10000`
  ve `android/keystore.properties` dosyası (örnek `android/app/build.gradle` başında). Anahtarı ve şifreyi yedekle!
- Gradle 8.14 için JDK 17 ya da 21 gerekir (Android Studio → Settings → Gradle JDK).
- Her yeni sürümde `versionCode` / `versionName` (Android) ve Xcode'da Version / Build numarasını artır.

## Reklam ve mağaza (yalnızca Android / iOS)

Kod: `js/core/monetize.js` (`RC.Ads`, `RC.IAP`, `RC.Premium`), ekran: `js/scenes/store.js`, ayarlar: `Config.MONETIZATION`.

- **Reklamlar (AdMob):** menülerde alt banner · sonuç ekranında "2X PARA" ödüllü video · her 3 soygunda bir tam ekran reklam. Premium'da hiçbiri yok.
- **Ürünler** (Play Console ve App Store Connect'te bu kimliklerle aç):
  | Kimlik | Tür | Fiyat | Verdiği |
  | --- | --- | --- | --- |
  | `redcrime_cash_500k` | tüketilebilir | 5 TL | $500.000 |
  | `redcrime_cash_1m` | tüketilebilir | 10 TL | $1.000.000 |
  | `redcrime_cash_2m` | tüketilebilir | 20 TL | $2.000.000 |
  | `redcrime_premium` | tüketilemez (tek sefer) | 49,99 TL | reklamsız, +60 sn, +10 çuval yuvası, günlük $50.000 |
- **Yayından önce** test kimliklerini değiştir: `Config.MONETIZATION.admob` (reklam birimleri, `testing: false`),
  `android/app/src/main/AndroidManifest.xml` ve `ios/App/App/Info.plist` (AdMob uygulama kimliği). Sonra `npm run mobile:sync`.
- Tarayıcıda denemek için `?iaptest=1`: satın almalar ve ödüllü reklam taklit edilir.
