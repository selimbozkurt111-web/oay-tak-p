# Antigravity Proje Kılavuzu: Öğrenci Takip, Yoklama ve Performans Sistemi

Bu dosya, Google Antigravity yapay zeka asistanının bu projeyi eksiksiz tanıması, kurallara tam uyum sağlaması ve geliştiricisine en doğru şekilde yardımcı olması için hazırlanmış ana mimari kılavuzdur.

---

## 1. Proje Özeti ve Amacı
Bu yazılım; yatılı ve gündüzlü eğitim kurumları, kurslar, medreseler ve okullar için geliştirilmiş **kapsamlı bir öğrenci takip, yoklama, performans ve dijital pano sistemidir**.

- **Altyapı:** Saf Vanilla JavaScript (ES6+), HTML5, Tailwind CSS (CDN), PWA (Service Worker).
- **Çalışma Prensibi:** Sıfır derleme aracı (Node.js/npm bağımlılığı gerektirmez). Doğrudan herhangi bir web sunucusunda (GitHub Pages, Vercel, Netlify) veya yerel tarayıcıda doğrudan çalışır.
- **Veri Depolama:** `localStorage` (çevrimdışı ve yerel tam bağımsızlık) + Firebase Realtime Database (isteğe bağlı çoklu cihaz bulut senkronizasyonu).

---

## 2. Temel Modüller ve Dosya Mimarisi

| Dosya | Görevi ve Sorumluluğu |
| :--- | :--- |
| `index.html` | Ana yönetim paneli (Öğrenci Yönetimi, Yoklama, İzinler, Kur'an Takibi, Puanlar, Ayarlar). |
| `pano.html` | Koridor ve salon TV'leri için donmayan, ultra akıcı, canlı döngüsel dijital pano. |
| `sw.js` | Service Worker (PWA çevrimdışı desteği, otomatik önbellek güncelleme motoru). |
| `js/store.js` | Merkezi veri ambarı, hesaplamalar, şube/etüt filtreleri ve Firebase bulut senkronizasyonu. |
| `js/attendance.js` | 5 Vakit Namaz ve Etüt yoklama modülü (Hızlı toplu yoklama, yoklama matrisi). |
| `js/quran-tracker.js` | Kur'an-ı Kerim sayfa takibi, cüz hesaplaması, hatim kutlaması ve liderlik tablosu. |
| `js/leave-tracker.js` | Hafta sonu evci ve çarşı izin takip sistemi, kapı çıkış fişleri ve QR kodları. |
| `js/leave-return.js` | İzin dönüşü hızlı QR kod okutma ve geç kalma ceza hesaplayıcı. |
| `js/performance.js` | Yurt nizamı, oda düzeni, kitap okuma ve ahlaki davranış puanlama sistemi. |
| `js/leaderboard.js` | Şampiyonlar podyumu, haftalık ve dönemlik puan sıralaması. |
| `js/omr-scanner.js` | Kamera ile test optik form okuma motoru. |
| `js/hadisler.js` | Günün hadis-i şerifleri ve dini vecizeler veritabanı. |

---

## 3. Katı Kurallar ve Geliştirme Standartları (Critical Rules)

1. **Yasaklı Kelimeler:**
   - Kod tabanında, arayüz metinlerinde, yorum satırlarında veya kullanıcı mesajlarında **"kütük"** ve **"sınır"** kelimeleri KESİNLİKLE KULLANILMAZ.
   - Talebe kayıtlarında ve etüt dağılımlarında herhangi bir adet engeli yoktur; bir sınıfa veya etüte dilediği kadar talebe kaydedilebilir.

2. **Veri Güvenliği ve Kayıp Önleme:**
   - Yeni bir özellik eklerken mevcut talebe kayıtları veya yoklama verileri asla sıfırlanmamalı, daima `localStorage` uyumluluğu gözetilmelidir.
   - Kur'an takip sayfa girişlerinde taslak koruması (`pendingChanges`) esastır; kullanıcı sayfayı silerken arayüz eski sayıyı zorla geri getirmemelidir.

3. **Önbellek (Cache) Sürüm Yönetimi:**
   - `index.html`, `pano.html` veya `sw.js` dosyalarında yapılan güncellemelerde sürüm numarası (`v10.x`) artırılmalı ve script parametrelerine (`?v=10.x`) yansıtılmalıdır.

---

## 4. Yeni Kurum İçin Yapılandırma ve Özelleştirme

Yeni bir kuruma uyarlarken şu adımlar izlenir:
1. **Kurum İsmi:** `index.html` ve `pano.html` başlıkları ile `store.js` içerisindeki varsayılan kurum adı güncellenir.
2. **Öğretmenler (Staff):** `store.js` içerisindeki `DEFAULT_STAFF` dizisine kurumun hocaları eklenir veya panelden girilir.
3. **Talebeler (Students):** `SEED_STUDENTS` dizisi boş `[]` bırakılır; talebeler Excel'den aktarılır veya panelden kaydedilir.
4. **Bulut Bağlantısı:** İsteğe bağlı olarak Firebase Realtime Database URL'si Ayarlar sekmesinden girilir.
