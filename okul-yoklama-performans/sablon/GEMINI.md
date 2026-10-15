# Antigravity Proje Kılavuzu: Kurumsal Öğrenci Takip Sistemi

Bu dosya, Google Antigravity yapay zeka asistanının bu projeyi eksiksiz tanıması ve kurum sahibine profesyonelce destek vermesi için oluşturulmuştur.

---

## 1. Proje Mimarisi
- **Teknoloji:** Saf Vanilla JavaScript (ES6+), Tailwind CSS, PWA Service Worker.
- **Derleme:** Webpack/Vite/npm gerektirmez; dosyalar doğrudan tarayıcıda çalışır.
- **Veri Depolama:** `localStorage` (yerel öncelikli) + opsiyonel Firebase Realtime Database.

## 2. Ana Dosyalar
- `index.html`: Ana yönetim paneli (Talebe, Yoklama, İzin, Kur'an Takibi, Ayarlar).
- `pano.html`: Canlı TV dijital pano ekranı.
- `sw.js`: PWA Service Worker (önbellek ve çevrimdışı çalışma).
- `js/store.js`: Merkezi veri yönetimi (`localStorage` + Firebase senkronizasyonu).
- `js/attendance.js`: Namaz ve etüt yoklama modülü.
- `js/quran-tracker.js`: v10.9 Kur'an-ı Kerim sayfa takibi ve hatim kutlaması.
- `js/leave-tracker.js` & `js/leave-return.js`: Hafta sonu izin ve QR kapı çıkış/dönüş sistemi.
- `js/performance.js` & `js/leaderboard.js`: Puanlama ve şampiyonlar tablosu.

## 3. Katı Kurallar (Agent Guidelines)
1. **Yasaklı Kelimeler:** Kodda, yorumlarda veya kullanıcıya yanıtlarda "kütük" ve "sınır" kelimeleri ASLA kullanılmaz.
2. **Kayıt Özgürlüğü:** Talebeler sınıflara ve etütlere serbestçe, herhangi bir adet engeli olmadan kaydedilebilir.
3. **Veri Koruması:** Yeni özellikler eklerken kullanıcının mevcut talebe ve yoklama kayıtları asla silinmemeli veya ezilmemelidir.
4. **Sürüm Takibi:** `index.html`, `pano.html` ve `sw.js` dosyalarında sürüm (`v10.x`) düzenli olarak güncellenmelidir.
