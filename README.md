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
