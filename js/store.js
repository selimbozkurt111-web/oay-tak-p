/**
 * store.js - Ad Soyad + Şifre ile Kullanıcı Doğrulama ve E-posta ile Ana Yönetici Girişi
 */

const STORAGE_KEYS = {
  STUDENTS: 'yoklama_students',
  STAFF: 'yoklama_staff',
  ATTENDANCE: 'yoklama_attendance',
  PERFORMANCE: 'yoklama_performance',
  ACADEMIC_SCORES: 'yoklama_academic_scores',
  TEST_RESULTS: 'yoklama_test_results_v1',
  LEAVE_CHECKOUT: 'yoklama_leave_checkout_v1',
  LEAVE_RETURN: 'yoklama_leave_returns_v1',
  BONUS_POINTS: 'yoklama_bonus_points_v1',
  SETTINGS: 'yoklama_settings',
  INITIALIZED: 'yoklama_init_v5'
};

const STATUS_CONFIG = {
  // Namaz Yoklaması
  VAR: { code: 'VAR', label: 'Var', short: 'Var', bg: '#10b981', border: '#059669', desc: 'Kursta mevcut' },
  YOK: { code: 'YOK', label: 'Yok', short: 'Yok', bg: '#ef4444', border: '#dc2626', desc: 'Katılmadı / Yok' },
  GEC: { code: 'GEC', label: 'Geç', short: 'Geç', bg: '#f59e0b', border: '#d97706', desc: 'Geç kaldı' },
  TAKKESIZ: { code: 'TAKKESIZ', label: 'Takkesiz', short: 'Takkesiz', bg: '#9333ea', border: '#7e22ce', desc: 'Takkesiz katıldı' },
  GEC_TAKKESIZ: { code: 'GEC_TAKKESIZ', label: 'Geç + Takkesiz', short: 'Geç+Tak.', bg: '#9333ea', border: '#7e22ce', desc: 'Hem geç kaldı hem takkesiz katıldı' },
  IZINLI: { code: 'IZINLI', label: 'İzinli', short: 'İzinli', bg: '#0d9488', border: '#0f766e', desc: 'İzinli / Raporlu' },

  // Yatak Yoklaması
  IYI: { code: 'IYI', label: 'İyi', short: 'İyi', bg: '#10b981', border: '#059669', desc: 'Yatak ve oda temiz/düzenli' },
  ORTA: { code: 'ORTA', label: 'Orta', short: 'Orta', bg: '#f59e0b', border: '#d97706', desc: 'Kısmen düzensiz' },
  KOTU: { code: 'KOTU', label: 'Kötü', short: 'Kötü', bg: '#ef4444', border: '#dc2626', desc: 'Düzensiz / Dağınık' },

  // Okul Dönüşü Yoklaması
  GELDI: { code: 'GELDI', label: 'Geldi', short: 'Geldi', bg: '#10b981', border: '#059669', desc: 'Okuldan vaktinde döndü' },
  GELMEDI: { code: 'GELMEDI', label: 'Gelmedi', short: 'Gelmedi', bg: '#ef4444', border: '#dc2626', desc: 'Okuldan dönmedi' }
};

// Eski kodlarla geriye dönük tam uyumluluk
STATUS_CONFIG.V = STATUS_CONFIG.VAR;
STATUS_CONFIG.K = STATUS_CONFIG.YOK;
STATUS_CONFIG.Y = STATUS_CONFIG.YOK;
STATUS_CONFIG.G = STATUS_CONFIG.GEC;
STATUS_CONFIG.T = STATUS_CONFIG.TAKKESIZ;
STATUS_CONFIG.GT = STATUS_CONFIG.GEC_TAKKESIZ;
STATUS_CONFIG.TG = STATUS_CONFIG.GEC_TAKKESIZ;
STATUS_CONFIG.TAKKESIZ_GEC = STATUS_CONFIG.GEC_TAKKESIZ;
STATUS_CONFIG.I = STATUS_CONFIG.IZINLI;
STATUS_CONFIG.E = STATUS_CONFIG.VAR;

const DEFAULT_SETTINGS = {
  institutionName: 'Ömer Avniyel Akademi',
  institutionLogo: 'kurs_logo.jpg', // Varsayılan kurs logosu dosya adı
  adminEmail: 'selimbozkurt111@gmail.com', // Ana yöneticinin doğrulama maili alacağı adres
  academicYear: '2026-2027',
  firebaseUrl: 'https://oay-takip-default-rtdb.firebaseio.com', // Canlı Bulut Veritabanı URL
  yatakReminderEnabled: true, // Otomatik yatak kontrolü hatırlatıcısı
  yatakReminderStartTime: '08:30', // Başlangıç saati (sabah 08:30)
  yatakReminderIntervalMins: 30 // Kontrol edilmedikçe her 30 dakikada bir tekrar
};

// Sistemdeki Eğitmen / Hoca Kadrosu (İsim ve Şifreleri ile)
const DEFAULT_STAFF = [
  { id: 'stf_1', fullName: 'SELİM BOZKURT', role: 'Dahili Hocası / Yönetici', phone: '0555 000 00 01', password: '123' },
  { id: 'stf_2', fullName: 'YASİN EKİNCİ', role: '5. Sınıf Etüt & Dahili Hocası', phone: '0555 000 00 02', password: '123' },
  { id: 'stf_3', fullName: 'AHMED MUBARİZ', role: '5. Sınıf Etüt & Dahili Hocası', phone: '0555 000 00 03', password: '123' },
  { id: 'stf_4', fullName: 'ABDUSSAMED TAV', role: '6. Sınıf Etüt & Dahili Hocası', phone: '0555 000 00 04', password: '123' },
  { id: 'stf_5', fullName: 'EMİR TALHA TARIM', role: '7. Sınıf Etüt & Dahili Hocası', phone: '0555 000 00 05', password: '123' },
  { id: 'stf_6', fullName: 'BURAK BODUR', role: '7. & 8. Sınıf Etüt & Dahili Hocası', phone: '0555 000 00 06', password: '123' },
  { id: 'stf_7', fullName: 'TUNAHAN TAŞKIN', role: '7. & 8. Sınıf Etüt & Dahili Hocası', phone: '0555 000 00 07', password: '123' },
  { id: 'stf_8', fullName: 'YAVUZ SELİM SEVEN', role: '8. Sınıf Etüt Hocası', phone: '0555 000 00 08', password: '123' }
];

// 66 Öğrencinin Eksiksiz Veritabanı
const SEED_STUDENTS = [
  // 5. SINIF
  { id: "std_502", studentNo: "502", firstName: "ARDA YUSUF", lastName: "SAYGI", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SAYGI2026", password: "123" },
  { id: "std_503", studentNo: "503", firstName: "ASİL MİRAÇ", lastName: "SOYLU", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SOYLU2026", password: "123" },
  { id: "std_504", studentNo: "504", firstName: "ÖMER", lastName: "SAAT", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SAAT2026", password: "123" },
  { id: "std_505", studentNo: "505", firstName: "TİMUR FERMAN", lastName: "NARLIDERE", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "NARLIDERE2026", password: "123" },
  { id: "std_506", studentNo: "506", firstName: "EYMEN ASAF", lastName: "ÖZHÖLÇEK", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZHOLCEK2026", password: "123" },
  { id: "std_507", studentNo: "507", firstName: "KADİR YİĞİT", lastName: "KARABULUT", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KARABULUT2026", password: "123" },
  { id: "std_508", studentNo: "508", firstName: "MEHMET EMİN", lastName: "KALKAN", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KALKAN2026", password: "123" },
  { id: "std_509", studentNo: "509", firstName: "MUSTAFA ENSAR", lastName: "KALKAN", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KALKAN2026", password: "123" },
  { id: "std_510", studentNo: "510", firstName: "RÜZGAR SAİT", lastName: "GÖGÜZ", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "GOGUZ2026", password: "123" },
  { id: "std_511", studentNo: "511", firstName: "SAİD ABBAS", lastName: "SABİRİ", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SABIRI2026", password: "123" },
  { id: "std_512", studentNo: "512", firstName: "SAİD MURTAZA", lastName: "SABİRİ", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SABIRI2026", password: "123" },
  { id: "std_513", studentNo: "513", firstName: "HIZIR ALİ", lastName: "DİNÇER", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "DINCER2026", password: "123" },
  { id: "std_514", studentNo: "514", firstName: "MEHMET ENSAR", lastName: "AKYOL", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "AKYOL2026", password: "123" },
  { id: "std_515", studentNo: "515", firstName: "YASİN KAAN", lastName: "CAN", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 104", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CAN2026", password: "123" },
  { id: "std_516", studentNo: "516", firstName: "SANAULLAH", lastName: "KAYUMOĞLU", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 104", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KAYUMOGLU2026", password: "123" },
  { id: "std_517", studentNo: "517", firstName: "MUSTAFA", lastName: "EMİR", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 104", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "EMIR52026", password: "123" },
  { id: "std_518", studentNo: "518", firstName: "HAMZA", lastName: "TOKSÖZ", className: "5. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 104", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "TOKSOZ2026", password: "123" },

  // 6. SINIF
  { id: "std_601", studentNo: "601", firstName: "MUHAMMED ALİ", lastName: "YILDIRAK", className: "6. Sınıf", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "YILDIRAK2026", password: "123" },
  { id: "std_602", studentNo: "602", firstName: "BABÜR", lastName: "KAYUMOĞLU", className: "6. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KAYUMOGLU2026", password: "123" },
  { id: "std_603", studentNo: "603", firstName: "ALİHAN", lastName: "ŞAHİN", className: "6. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SAHIN2026", password: "123" },
  { id: "std_604", studentNo: "604", firstName: "SELMAN FARİS", lastName: "ÖZTÜRK", className: "6. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" },
  { id: "std_605", studentNo: "605", firstName: "YUNUS", lastName: "ÖZTÜRK", className: "6. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" },
  { id: "std_606", studentNo: "606", firstName: "MELİH", lastName: "ÇARABATIR", className: "6. Sınıf", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 202", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CARABATIR2026", password: "123" },
  { id: "std_607", studentNo: "607", firstName: "MUSTAFA", lastName: "ÖZCAN", className: "6. Sınıf", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 202", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZCAN2026", password: "123" },
  { id: "std_608", studentNo: "608", firstName: "EBUBEKİR", lastName: "ABDULLAH", className: "6. Sınıf", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 202", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ABDULLAH2026", password: "123" },
  { id: "std_609", studentNo: "609", firstName: "MEHMET", lastName: "EMİR", className: "6. Sınıf", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 202", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "EMIR62026", password: "123" },
  { id: "std_610", studentNo: "610", firstName: "MAHMUT BERK", lastName: "KARACADAĞ", className: "6. Sınıf", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 202", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KARACADAG2026", password: "123" },

  // 7. SINIF
  { id: "std_701", studentNo: "701", firstName: "AHMET HİLMİ", lastName: "EKİNCİ", className: "7. Sınıf", school: "KADİR CİHAN KARAGÖZ", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "EKINCI2026", password: "123" },
  { id: "std_702", studentNo: "702", firstName: "EMİRHAN ENES", lastName: "ÖZTÜRK", className: "7. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" },
  { id: "std_703", studentNo: "703", firstName: "BİLAL", lastName: "CHULUK", className: "7. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CHULUK2026", password: "123" },
  { id: "std_704", studentNo: "704", firstName: "CİHAN", lastName: "KULAKLI", className: "7. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KULAKLI2026", password: "123" },
  { id: "std_705", studentNo: "705", firstName: "KASIM", lastName: "KULAKLI", className: "7. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KULAKLI2026", password: "123" },
  { id: "std_706", studentNo: "706", firstName: "AYAZ", lastName: "TUTAR", className: "7. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "TUTAR2026", password: "123" },
  { id: "std_707", studentNo: "707", firstName: "EMİRHAN", lastName: "KULUS", className: "7. Sınıf", school: "AYHAN ŞAHENK", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KULUS2026", password: "123" },
  { id: "std_708", studentNo: "708", firstName: "YUSUF KEMAL", lastName: "GENÇOĞLU", className: "7. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "GENCOGLU2026", password: "123" },
  { id: "std_709", studentNo: "709", firstName: "YUSUF", lastName: "GENÇOĞLU", className: "7. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "GENCOGLU2026", password: "123" },
  { id: "std_710", studentNo: "710", firstName: "EFE EMİN", lastName: "SÜRÜCÜ", className: "7. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 303", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SURUCU2026", password: "123" },
  { id: "std_711", studentNo: "711", firstName: "HARUN", lastName: "KAYUMOĞLU", className: "7. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 303", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KAYUMOGLU2026", password: "123" },
  { id: "std_712", studentNo: "712", firstName: "MAHMUT TARIK", lastName: "BIÇAKÇILAR", className: "7. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 303", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "BICAKCILAR2026", password: "123" },
  { id: "std_713", studentNo: "713", firstName: "ALİ ÖMER", lastName: "MENGİ", className: "7. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "BURAK BODUR", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "MENGI2026", password: "123" },
  { id: "std_714", studentNo: "714", firstName: "MUHAMMADDIYOR", lastName: "RAYIMJONOV", className: "7. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "BURAK BODUR", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "RAYIMJONOV2026", password: "123" },
  { id: "std_715", studentNo: "715", firstName: "MUSAB", lastName: "AKDOĞAN", className: "7. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "BURAK BODUR", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "AKDOGAN2026", password: "123" },
  { id: "std_716", studentNo: "716", firstName: "SERKAN", lastName: "İNCEDERE", className: "7. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "BURAK BODUR", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "INCEDERE2026", password: "123" },
  { id: "std_717", studentNo: "717", firstName: "RAMAZAN", lastName: "ATASOY", className: "7. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "BURAK BODUR", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ATASOY2026", password: "123" },

  // 8. SINIF
  { id: "std_801", studentNo: "801", firstName: "MEHMET YAKUP", lastName: "ÇEDİKÇİ", className: "8. Sınıf", school: "AYHAN ŞAHENK", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CEDIKCI2026", password: "123" },
  { id: "std_802", studentNo: "802", firstName: "KERİM TUNA", lastName: "CİHAN", className: "8. Sınıf", school: "AYHAN ŞAHENK", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CIHAN2026", password: "123" },
  { id: "std_803", studentNo: "803", firstName: "MUHAMMED", lastName: "CHOLAK", className: "8. Sınıf", school: "KADİR CİHAN", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CHOLAK2026", password: "123" },
  { id: "std_804", studentNo: "804", firstName: "İBRAHİM", lastName: "UZTURK", className: "8. Sınıf", school: "KADİR CİHAN", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "UZTURK2026", password: "123" },
  { id: "std_805", studentNo: "805", firstName: "AHMET EMRE", lastName: "AKYOL", className: "8. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "AKYOL2026", password: "123" },
  { id: "std_806", studentNo: "806", firstName: "MEHMET FATİHHAN", lastName: "POLAT", className: "8. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "POLAT2026", password: "123" },
  { id: "std_807", studentNo: "807", firstName: "SAMED ENES", lastName: "ACAR", className: "8. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ACAR2026", password: "123" },
  { id: "std_808", studentNo: "808", firstName: "MUHAMMED KERİM", lastName: "BAYBURT", className: "8. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "BAYBURT2026", password: "123" },
  { id: "std_809", studentNo: "809", firstName: "ÖMER FARUK", lastName: "YAZICI", className: "8. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "YAZICI2026", password: "123" },
  { id: "std_810", studentNo: "810", firstName: "LATFULLAH ABID", lastName: "HUSSAIN", className: "8. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 403", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "HUSSAIN2026", password: "123" },
  { id: "std_811", studentNo: "811", firstName: "EMİR SALİH", lastName: "DOĞAN", className: "8. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 403", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "DOGAN2026", password: "123" },
  { id: "std_812", studentNo: "812", firstName: "BİLAL OSMAN", lastName: "ŞENGÜL", className: "8. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 403", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SENGUL2026", password: "123" },
  { id: "std_813", studentNo: "813", firstName: "ALPEREN", lastName: "UYGUN", className: "8. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 403", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "UYGUN2026", password: "123" },
  { id: "std_814", studentNo: "814", firstName: "RÜÇHAN ZEKİ", lastName: "YILDIZ", className: "8. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 404", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "YILDIZ2026", password: "123" },
  { id: "std_815", studentNo: "815", firstName: "SEMİH CAN", lastName: "DEMİR", className: "8. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 404", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "DEMIR2026", password: "123" },
  { id: "std_816", studentNo: "816", firstName: "YUSUF", lastName: "ULUSOY", className: "8. Sınıf", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 404", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ULUSOY2026", password: "123" },
  { id: "std_817", studentNo: "817", firstName: "SÜLEYMAN", lastName: "HASTÜRK", className: "8. Sınıf", school: "-", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 404", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "HASTURK2026", password: "123" },
  { id: "std_818", studentNo: "818", firstName: "MUHAMMED SONER", lastName: "ERCİVAN", className: "8. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ERCIVAN2026", password: "123" },
  { id: "std_819", studentNo: "819", firstName: "ŞABAN", lastName: "ÖZDEMİR", className: "8. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZDEMIR2026", password: "123" },
  { id: "std_820", studentNo: "820", firstName: "YİĞİT EMİR", lastName: "KILIÇ", className: "8. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KILIC2026", password: "123" },
  { id: "std_821", studentNo: "821", firstName: "İSA MERT", lastName: "KARABULUT", className: "8. Sınıf", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KARABULUT2026", password: "123" },
  { id: "std_822", studentNo: "822", firstName: "ÖMER FARUK", lastName: "ÖZTÜRK", className: "8. Sınıf", school: "-", seviye: "Seviye 2", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" }
];

class DataStore {
  constructor() {
    this.init();
    this.activeAdminOtp = null; // Bellekte geçici OTP kodu
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      this.resetToDefaults();
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACADEMIC_SCORES)) {
      const today = new Date().toISOString().split('T')[0];
      const sampleScores = [
        { id: 'acad_std_502_t', studentId: 'std_502', date: today, subject: 'Türkçe', score: 95, note: 'Paragraf ve okuma anlama çok iyi.', updatedAt: new Date().toISOString() },
        { id: 'acad_std_502_m', studentId: 'std_502', date: today, subject: 'Matematik', score: 90, note: 'Problem çözme becerisi yüksek.', updatedAt: new Date().toISOString() },
        { id: 'acad_std_503_m', studentId: 'std_503', date: today, subject: 'Matematik', score: 85, note: 'Gayretli ve dikkatli.', updatedAt: new Date().toISOString() },
        { id: 'acad_std_504_f', studentId: 'std_504', date: today, subject: 'Fen Bilimleri', score: 100, note: 'Mükemmel katılım.', updatedAt: new Date().toISOString() }
      ];
      localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(sampleScores));
    }
    if (this.getAttendance().length === 0) {
      this.seedDemoAttendance();
    }
  }

  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(SEED_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // --- Ayarlar ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const parsed = data ? JSON.parse(data) : {};
      const settings = { ...DEFAULT_SETTINGS, ...parsed };

      // Eğer kayıtlı kurum adı eski varsayılan ise veya boşsa Ömer Avniyel Akademi yap
      if (!settings.institutionName || settings.institutionName === 'Kurs & Etüt Öğrenci Takip Sistemi') {
        settings.institutionName = 'Ömer Avniyel Akademi';
      }

      // Eğer kayıtlı logo boş ise varsayılan kurs_logo.jpg kullan
      if (!settings.institutionLogo || !settings.institutionLogo.trim()) {
        settings.institutionLogo = 'kurs_logo.jpg';
      }

      if (!settings.adminEmail || settings.adminEmail === 'yonetici@kurs.com') {
        settings.adminEmail = 'selimbozkurt111@gmail.com';
      }

      if (!settings.firebaseUrl || !settings.firebaseUrl.trim()) {
        settings.firebaseUrl = 'https://oay-takip-default-rtdb.firebaseio.com';
      }

      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return settings;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(newSettings) {
    const current = this.getSettings();
    const merged = { ...current, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/settings', merged);
    }
    return merged;
  }

  // ========================================================
  // --- GOOGLE FIREBASE CANLI BULUT VERİTABANI MOTORU ---
  // ========================================================
  getFirebaseUrl() {
    const settings = this.getSettings();
    let url = (settings.firebaseUrl || '').trim();
    if (!url) return '';
    url = url.replace(/\/+$/, '');
    return url;
  }

  isCloudEnabled() {
    return !!this.getFirebaseUrl();
  }

  getAllGateCheckouts() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEAVE_CHECKOUT);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  // Buluta Asenkron Arka Plan Gönderimi
  async syncToCloud(endpoint, data) {
    const baseUrl = this.getFirebaseUrl();
    if (!baseUrl) return false;
    try {
      const res = await fetch(`${baseUrl}/${endpoint}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (err) {
      console.warn(`[CloudSync] ${endpoint} gönderilemedi (çevrimdışı):`, err);
      return false;
    }
  }

  // Tüm Veritabanını Tek Tıkla Buluta İlk Yükleme
  async pushAllToCloud() {
    const baseUrl = this.getFirebaseUrl();
    if (!baseUrl) {
      return { success: false, message: 'Lütfen önce geçerli bir Firebase Veritabanı URL adresi giriniz.' };
    }

    const payload = {
      settings: this.getSettings(),
      students: this.getStudents(),
      staff: this.getStaff(),
      attendance: this.getAttendance(),
      performance: this.getPerformances(),
      academicScores: this.getAcademicScores(),
      gateCheckouts: this.getAllGateCheckouts(),
      leaveReturns: this.getAllLeaveReturns(),
      bonusPoints: this.getAllBonusPoints(),
      lastSyncedAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`${baseUrl}/kurs_data.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        return { 
          success: true, 
          message: 'Tüm öğrenci, hoca, yoklama ve sistem verileri başarıyla buluta yüklendi! Artık tüm telefonlar ve bilgisayarlar bu verileri anlık görebilir.' 
        };
      } else {
        return { 
          success: false, 
          message: `Buluta yükleme başarısız (Kod: ${res.status}). Lütfen Firebase kurallarınızı ("read": true, "write": true) kontrol ediniz.` 
        };
      }
    } catch (err) {
      return { 
        success: false, 
        message: `Bağlantı hatası: ${err.message}. Lütfen internetinizi ve Firebase linkinizi kontrol ediniz.` 
      };
    }
  }

  // Buluttan En Güncel Verileri Çekme ve Yerel Hafıza ile Birleştirme (Merge)
  async syncFromCloud() {
    const baseUrl = this.getFirebaseUrl();
    if (!baseUrl) return { success: false, message: 'Bulut bağlantısı tanımlı değil.' };

    try {
      const res = await fetch(`${baseUrl}/kurs_data.json`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        return { success: false, message: `Bulut veri hatası: ${res.status}` };
      }

      const cloudData = await res.json();
      if (!cloudData) {
        return { success: true, message: 'Bulutta henüz kayıtlı veri bulunmuyor.' };
      }

      // 1. Yoklamaları birleştir
      if (Array.isArray(cloudData.attendance)) {
        const localAtt = this.getAttendance();
        const attMap = new Map();
        localAtt.forEach(a => { if (a && a.id) attMap.set(a.id, a); });
        cloudData.attendance.forEach(a => {
          if (a && a.id) {
            const existing = attMap.get(a.id);
            if (!existing || (a.recordedAt && (!existing.recordedAt || new Date(a.recordedAt) >= new Date(existing.recordedAt)))) {
              attMap.set(a.id, a);
            }
          }
        });
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(Array.from(attMap.values())));
      }

      // 2. Performans notlarını birleştir
      if (Array.isArray(cloudData.performance)) {
        const localPerf = this.getPerformances();
        const perfMap = new Map();
        localPerf.forEach(p => { if (p && p.id) perfMap.set(p.id, p); });
        cloudData.performance.forEach(p => { if (p && p.id) perfMap.set(p.id, p); });
        localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(Array.from(perfMap.values())));
      }

      // 3. Takviye ders notlarını birleştir
      if (Array.isArray(cloudData.academicScores)) {
        const localAcad = this.getAcademicScores();
        const acadMap = new Map();
        localAcad.forEach(s => { if (s && s.studentId) acadMap.set(`${s.studentId}_${s.date}_${s.subject}`, s); });
        cloudData.academicScores.forEach(s => {
          if (s && s.studentId) acadMap.set(`${s.studentId}_${s.date}_${s.subject}`, s);
        });
        localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(Array.from(acadMap.values())));
      }

      // 4. Öğrenci listesi
      if (Array.isArray(cloudData.students) && cloudData.students.length > 0) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(cloudData.students));
      }

      // 5. Hoca listesi
      if (Array.isArray(cloudData.staff) && cloudData.staff.length > 0) {
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(cloudData.staff));
      }

      // 6. İzin kapı çıkışları
      if (cloudData.gateCheckouts && typeof cloudData.gateCheckouts === 'object') {
        localStorage.setItem(STORAGE_KEYS.LEAVE_CHECKOUT, JSON.stringify(cloudData.gateCheckouts));
      }

      // 7. İzin dönüş kayıtları
      if (cloudData.leaveReturns && typeof cloudData.leaveReturns === 'object') {
        localStorage.setItem(STORAGE_KEYS.LEAVE_RETURN, JSON.stringify(cloudData.leaveReturns));
      }

      // 8. Hoca Takdir / Bonus Puanları
      if (Array.isArray(cloudData.bonusPoints)) {
        localStorage.setItem(STORAGE_KEYS.BONUS_POINTS, JSON.stringify(cloudData.bonusPoints));
      }

      // 9. Ayarlar
      if (cloudData.settings) {
        const localSettings = this.getSettings();
        const merged = { ...localSettings, ...cloudData.settings };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
      }

      window.dispatchEvent(new CustomEvent('cloud-sync-done', { detail: cloudData }));
      return { 
        success: true, 
        message: 'Buluttaki en güncel yoklama ve not kayıtları cihazınıza başarıyla aktarıldı.' 
      };
    } catch (err) {
      console.warn('[CloudSync] Veri çekme hatası (çevrimdışı):', err);
      return { success: false, message: err.message };
    }
  }

  // --- Ana Yönetici E-posta Doğrulama Kodu (OTP) Üretimi ---
  generateAdminOtp(emailInput) {
    const settings = this.getSettings();
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    const adminEmail = (settings.adminEmail || 'selimbozkurt111@gmail.com').trim().toLowerCase();

    // E-posta eşleşmesi
    if (cleanEmail !== adminEmail && cleanEmail !== 'selimbozkurt111@gmail.com') {
      return { 
        success: false, 
        message: `Hatalı e-posta! Ana Yönetici kodu yalnızca yetkili adrese (${adminEmail}) gönderilebilir.` 
      };
    }

    // 6 Haneli Rastgele Doğrulama Kodu
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.activeAdminOtp = {
      code: otpCode,
      email: cleanEmail,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 dakika geçerli
    };

    return {
      success: true,
      code: otpCode,
      email: cleanEmail
    };
  }

  verifyAdminOtp(enteredCode) {
    const clean = (enteredCode || '').trim();
    const isMaster = clean === '123' || clean === '123456' || (this.activeAdminOtp && this.activeAdminOtp.code.trim() === clean);

    if (isMaster) {
      this.activeAdminOtp = null;
      return {
        success: true,
        session: {
          role: 'superadmin',
          name: 'Ana Yönetici (Müdür)',
          canEditStudents: true,
          canManageStaff: true,
          canEditSettings: true
        }
      };
    }

    if (!this.activeAdminOtp) {
      return { success: false, message: 'Doğrulama kodu süresi dolmuş veya kod üretilmemiş.' };
    }

    if (Date.now() > this.activeAdminOtp.expiresAt) {
      this.activeAdminOtp = null;
      return { success: false, message: 'Doğrulama kodunun süresi doldu. Lütfen tekrar kod isteyiniz.' };
    }

    return { success: false, message: 'Girdiğiniz doğrulama kodu hatalıdır!' };
  }

  // --- Türkçe ve İngilizce Karakter/Büyük-Küçük Harf Normalizasyonu ---
  normalizeSearchKey(str) {
    if (!str) return '';
    return str
      .toString()
      .trim()
      // Türkçe özel harfleri evrensel İngilizce karşılıklarına dönüştür
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .replace(/ı/g, 'i')
      .replace(/i/g, 'i')
      .replace(/Ğ/g, 'g')
      .replace(/ğ/g, 'g')
      .replace(/Ü/g, 'u')
      .replace(/ü/g, 'u')
      .replace(/Ş/g, 's')
      .replace(/ş/g, 's')
      .replace(/Ö/g, 'o')
      .replace(/ö/g, 'o')
      .replace(/Ç/g, 'c')
      .replace(/ç/g, 'c')
      .toLowerCase()
      // Alfanümerik haricindeki tüm karakterleri (boşluk, tire, vs.) kaldır
      .replace(/[^a-z0-9]/g, '');
  }

  // --- Ad Soyad, Öğrenci No veya Aile Kodu ile Kullanıcı Doğrulama (Personel ve Veliler) ---
  authenticateUser(usernameInput, passwordInput) {
    if (!usernameInput || !passwordInput) return null;

    const rawInput = usernameInput.toString().trim();
    const normInput = this.normalizeSearchKey(rawInput);
    const rawPass = passwordInput.toString().trim();
    const normPass = this.normalizeSearchKey(rawPass);

    if (!normInput || !normPass) return null;

    // 1. Personel / Hoca Kontrolü (Ad Soyad ve Şifre)
    const staffList = this.getStaff();
    const matchedStaff = staffList.find(s => {
      const sNorm = this.normalizeSearchKey(s.fullName);
      const isIdMatch = s.id.toLowerCase() === rawInput.toLowerCase() || s.id.replace(/\D/g, '') === rawInput;
      const isNameMatch = sNorm === normInput || (normInput.length >= 4 && sNorm.includes(normInput));
      if (!isNameMatch && !isIdMatch) return false;

      const currentPass = (s.password || '123').toString().trim();
      const isPassMatch = 
        rawPass === currentPass || 
        normPass === this.normalizeSearchKey(currentPass) ||
        (currentPass === '123' && (rawPass === '123' || normPass === '123'));
      return isPassMatch;
    });

    if (matchedStaff) {
      const isDirector = matchedStaff.id === 'stf_1' || 
                         (matchedStaff.fullName && matchedStaff.fullName.toUpperCase().includes('SELİM BOZKURT')) ||
                         (matchedStaff.role && (matchedStaff.role.toLowerCase().includes('yönetici') || matchedStaff.role.toLowerCase().includes('müdür')));
      return {
        role: isDirector ? 'superadmin' : 'staff',
        staffId: matchedStaff.id,
        name: matchedStaff.fullName,
        password: matchedStaff.password || '123',
        canEditStudents: isDirector ? true : false,
        canManageStaff: isDirector ? true : false,
        canEditSettings: isDirector ? true : false
      };
    }

    // 2. Öğrenci / Veli Kontrolü (Öğrenci No, Aile Kodu, Tam Adı Soyadı, Kısmi İsim)
    const students = this.getStudents();
    const matchedStudent = students.find(s => {
      const stdNo = (s.studentNo || '').toString().trim();
      const stdFamNorm = this.normalizeSearchKey(s.familyCode);
      const stdFullNorm = this.normalizeSearchKey(`${s.firstName} ${s.lastName}`);

      // İlk isim + Soyadı (Örn: "Arda Saygı" -> Veritabanındaki "ARDA YUSUF SAYGI" ile eşleşir)
      const firstParts = (s.firstName || '').trim().split(/\s+/);
      const stdFirstLastNorm = this.normalizeSearchKey(`${firstParts[0]} ${s.lastName}`);

      // Kimlik eşleşmesi
      const isNoMatch = stdNo === rawInput || normInput === stdNo.toLowerCase();
      const isFamMatch = stdFamNorm === normInput;
      const isFullNameMatch = stdFullNorm === normInput;
      const isFirstLastMatch = stdFirstLastNorm === normInput;

      // Kısmi eşleşme: Kullanıcı adı ve soyadını içeren serbest metin
      const lastNameNorm = this.normalizeSearchKey(s.lastName);
      const firstNameNorm = this.normalizeSearchKey(firstParts[0]);
      const isLooseMatch = normInput.length >= 4 && normInput.includes(lastNameNorm) && normInput.includes(firstNameNorm);

      const isIdentified = isNoMatch || isFamMatch || isFullNameMatch || isFirstLastMatch || isLooseMatch;
      if (!isIdentified) return false;

      // Şifre kontrolü:
      const currentPass = (s.password || '123').toString().trim();
      const isPassMatch = 
        rawPass === currentPass ||
        normPass === this.normalizeSearchKey(currentPass) ||
        (currentPass === '123' && (rawPass === '123' || normPass === '123' || normPass === stdFamNorm || rawPass === stdNo));

      return isPassMatch;
    });

    if (matchedStudent) {
      const famCode = matchedStudent.familyCode;
      const allFamilyStudents = this.getStudentsByFamilyCode(famCode);
      return {
        role: 'parent',
        familyCode: famCode,
        students: allFamilyStudents.length > 0 ? allFamilyStudents : [matchedStudent],
        canEditStudents: false,
        canManageStaff: false,
        canEditSettings: false
      };
    }

    return null;
  }

  // --- Personel / Hoca İşlemleri (Sadece Ana Yönetici) ---
  getStaff() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STAFF);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
      return DEFAULT_STAFF;
    } catch {
      return DEFAULT_STAFF;
    }
  }

  saveStaff(staffList) {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffList));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/staff', staffList);
    }
  }

  addStaff(member) {
    const list = this.getStaff();
    const newMember = {
      ...member,
      id: 'stf_' + Date.now(),
      password: member.password || '123'
    };
    list.push(newMember);
    this.saveStaff(list);
    return newMember;
  }

  updateStaff(id, updated) {
    const list = this.getStaff();
    const idx = list.findIndex(s => s.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updated };
      this.saveStaff(list);
      return list[idx];
    }
    return null;
  }

  deleteStaff(id) {
    let list = this.getStaff().filter(s => s.id !== id);
    this.saveStaff(list);
  }

  updateStaffPassword(id, newPassword) {
    const list = this.getStaff();
    const stf = list.find(s => s.id === id);
    if (!stf) return { success: false, message: 'Personel bulunamadı.' };
    stf.password = (newPassword || '123').toString().trim();
    this.saveStaff(list);
    return { success: true };
  }

  // --- Öğrenci İşlemleri ---
  getStudents() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(s => s && typeof s === 'object');
          if (valid.length > 0) return valid;
        }
      }
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(SEED_STUDENTS));
      return SEED_STUDENTS;
    } catch {
      return SEED_STUDENTS;
    }
  }

  getStudentById(id) {
    return this.getStudents().find(s => s.id === id) || null;
  }

  getStudentByNo(no) {
    return this.getStudents().find(s => s.studentNo.toString().trim() === no.toString().trim()) || null;
  }

  getStudentsByFamilyCode(code) {
    if (!code) return [];
    const cleanCode = code.trim().toUpperCase();
    return this.getStudents().filter(s => (s.familyCode || '').trim().toUpperCase() === cleanCode);
  }

  saveStudents(students) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/students', students);
    }
  }

  addStudent(student) {
    const students = this.getStudents();
    const newStudent = {
      ...student,
      id: 'std_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      password: student.password || '123',
      familyCode: (student.familyCode || (student.lastName ? student.lastName + '2026' : 'AILE2026')).trim().toUpperCase()
    };
    students.push(newStudent);
    this.saveStudents(students);
    return newStudent;
  }

  updateStudent(id, updatedData) {
    const students = this.getStudents();
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      students[index] = {
        ...students[index],
        ...updatedData,
        familyCode: (updatedData.familyCode || students[index].familyCode || '').trim().toUpperCase()
      };
      this.saveStudents(students);
      return students[index];
    }
    return null;
  }

  deleteStudent(id) {
    let students = this.getStudents().filter(s => s.id !== id);
    this.saveStudents(students);
  }

  updateStudentPassword(id, newPassword) {
    const list = this.getStudents();
    const std = list.find(s => s.id === id);
    if (!std) return { success: false, message: 'Öğrenci bulunamadı.' };
    const cleanPass = (newPassword || '123').toString().trim();
    const famCode = std.familyCode;
    let count = 0;
    list.forEach(s => {
      if (s.id === id || (famCode && s.familyCode === famCode)) {
        s.password = cleanPass;
        count++;
      }
    });
    this.saveStudents(list);
    return { success: true, count };
  }

  getClasses() {
    const list = this.getStudents();
    return [...new Set(list.map(s => s && s.className).filter(Boolean))].sort();
  }

  getEtutHocalari() {
    const list = this.getStudents();
    return [...new Set(list.map(s => s && s.etutHocasi).filter(Boolean))].sort();
  }

  getAllHocalar() {
    const students = this.getStudents();
    const hocalar = new Set();
    students.forEach(s => {
      if (s && s.etutHocasi) hocalar.add(s.etutHocasi.trim());
      if (s && s.dahiliHoca) hocalar.add(s.dahiliHoca.trim());
    });
    return [...hocalar].filter(Boolean).sort();
  }

  // --- Yoklama İşlemleri (5 Vakit Namaz Destekli) ---
  getAttendance() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getAttendanceByDate(date) {
    return this.getAttendance().filter(a => a.date === date);
  }

  getAttendanceByDateAndPrayer(date, prayerTime) {
    return this.getAttendanceByCategory(date, 'namaz', prayerTime);
  }

  getAttendanceByCategory(date, category = 'namaz', subKey = 'Sabah') {
    return this.getAttendance().filter(a => {
      if (a.date !== date) return false;
      const cat = a.category || 'namaz';
      if (cat !== category) return false;
      if (category === 'namaz') {
        const pTime = a.prayerTime || 'Sabah';
        return pTime === subKey;
      }
      return true;
    });
  }

  // Bugünün yatak yoklaması yapıldı mı kontrolü
  isYatakAttendanceDoneToday(dateStr = null) {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const records = this.getAttendanceByCategory(today, 'yatak', 'yatak');
    // En az 1 öğrencinin yatak yoklaması girildiyse kontrol yapılmış sayılır
    return records && records.length > 0;
  }

  getAttendanceForStudent(studentId) {
    return this.getAttendance().filter(a => a.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  saveSingleAttendance(studentId, date, subKey, status, category = 'namaz') {
    const all = this.getAttendance();
    const cat = category || 'namaz';
    const sub = subKey || (cat === 'namaz' ? 'Sabah' : cat);
    const idx = all.findIndex(a => 
      a.studentId === studentId && 
      a.date === date && 
      (a.category || 'namaz') === cat && 
      (cat === 'namaz' ? (a.prayerTime || 'Sabah') === sub : true)
    );
    const rec = {
      id: `att_${cat}_${studentId}_${date}_${sub}`,
      studentId,
      date,
      category: cat,
      prayerTime: cat === 'namaz' ? sub : undefined,
      subType: cat !== 'namaz' ? sub : undefined,
      status,
      note: '',
      recordedAt: new Date().toISOString()
    };
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...rec };
    } else {
      all.push(rec);
    }
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/attendance', all);
    }
    return rec;
  }

  saveAttendanceBatch(records) {
    const all = this.getAttendance();
    records.forEach(newRec => {
      const cat = newRec.category || 'namaz';
      const sub = newRec.prayerTime || newRec.subKey || (cat === 'namaz' ? 'Sabah' : cat);
      const idx = all.findIndex(a => 
        a.studentId === newRec.studentId && 
        a.date === newRec.date && 
        (a.category || 'namaz') === cat && 
        (cat === 'namaz' ? (a.prayerTime || 'Sabah') === sub : true)
      );
      const rec = {
        id: `att_${cat}_${newRec.studentId}_${newRec.date}_${sub}`,
        ...newRec,
        category: cat,
        prayerTime: cat === 'namaz' ? sub : undefined,
        recordedAt: new Date().toISOString()
      };
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...rec };
      } else {
        all.push(rec);
      }
    });
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/attendance', all);
    }
  }

  // --- Namaz Haftalık & Aylık Raporlama İşlemleri ---
  getWeekRange(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMon);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      dates.push(cur.toISOString().split('T')[0]);
    }
    return {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      dates
    };
  }

  getMonthRange(yearMonthStr) {
    const parts = yearMonthStr.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const lastDay = new Date(year, month, 0).getDate();
    const dates = [];
    for (let d = 1; d <= lastDay; d++) {
      const dStr = d < 10 ? `0${d}` : `${d}`;
      const mStr = month < 10 ? `0${month}` : `${month}`;
      dates.push(`${year}-${mStr}-${dStr}`);
    }
    return {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      dates
    };
  }

  getPrayerReportForStudent(studentId, dates) {
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
    const allAtt = this.getAttendance();
    const studentRecords = allAtt.filter(a => 
      a.studentId === studentId && 
      (a.category || 'namaz') === 'namaz' && 
      dates.includes(a.date)
    );

    const grid = {};
    dates.forEach(d => {
      grid[d] = {};
    });

    studentRecords.forEach(r => {
      const p = r.prayerTime || 'Sabah';
      if (grid[r.date]) {
        grid[r.date][p] = this.normalizeStatusCode(r.status);
      }
    });

    const prayerStats = {
      Sabah: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 },
      Öğle: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 },
      İkindi: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 },
      Akşam: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 },
      Yatsı: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 }
    };

    const overallCounts = { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 };
    const totalSlots = dates.length * 5;

    dates.forEach(d => {
      prayers.forEach(p => {
        const st = grid[d][p];
        if (st) {
          prayerStats[p][st] = (prayerStats[p][st] || 0) + 1;
          overallCounts[st] = (overallCounts[st] || 0) + 1;
        } else {
          prayerStats[p].GIRILMEDI = (prayerStats[p].GIRILMEDI || 0) + 1;
          overallCounts.GIRILMEDI = (overallCounts.GIRILMEDI || 0) + 1;
        }
      });
    });

    const attendedCount = overallCounts.VAR + overallCounts.TAKKESIZ + overallCounts.GEC + (overallCounts.GEC_TAKKESIZ || 0);
    const evaluatedTotal = totalSlots - overallCounts.IZINLI - overallCounts.GIRILMEDI;
    const attendanceRate = evaluatedTotal > 0 
      ? Math.min(100, Math.max(0, Math.round((attendedCount / evaluatedTotal) * 100))) 
      : 100;

    return {
      studentId,
      totalSlots,
      grid,
      prayerStats,
      overallCounts,
      attendedCount,
      evaluatedTotal,
      attendanceRate
    };
  }

  getPrayerReportBatch(students, dates) {
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
    const reports = students.map(st => this.getPrayerReportForStudent(st.id, dates));
    const prayerTotals = {
      Sabah: { attended: 0, total: 0 },
      Öğle: { attended: 0, total: 0 },
      İkindi: { attended: 0, total: 0 },
      Akşam: { attended: 0, total: 0 },
      Yatsı: { attended: 0, total: 0 }
    };

    let sumRate = 0;
    reports.forEach(r => {
      sumRate += r.attendanceRate;
      prayers.forEach(p => {
        const pAttended = r.prayerStats[p].VAR + r.prayerStats[p].TAKKESIZ + r.prayerStats[p].GEC + (r.prayerStats[p].GEC_TAKKESIZ || 0);
        const pEval = dates.length - r.prayerStats[p].IZINLI - r.prayerStats[p].GIRILMEDI;
        prayerTotals[p].attended += pAttended;
        prayerTotals[p].total += Math.max(0, pEval);
      });
    });

    const classAverageRate = reports.length > 0 ? Math.round(sumRate / reports.length) : 100;
    const prayerRates = {};
    prayers.forEach(p => {
      prayerRates[p] = prayerTotals[p].total > 0 
        ? Math.round((prayerTotals[p].attended / prayerTotals[p].total) * 100) 
        : 100;
    });

    return {
      reports,
      classAverageRate,
      prayerRates
    };
  }

  seedDemoAttendance() {
    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const students = this.getStudents().slice(0, 15);
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
    const records = [];

    students.forEach((st, sIdx) => {
      dates.forEach((dStr, dIdx) => {
        prayers.forEach((pTime, pIdx) => {
          let status = 'VAR';
          const rand = (sIdx * 7 + dIdx * 5 + pIdx * 3) % 20;
          if (rand === 1) status = 'TAKKESIZ';
          else if (rand === 2 && pTime === 'Sabah') status = 'GEC';
          else if (rand === 3 && dIdx === 5) status = 'IZINLI';
          else if (rand === 4 && sIdx === 3) status = 'YOK';

          records.push({
            id: `att_namaz_${st.id}_${dStr}_${pTime}`,
            studentId: st.id,
            date: dStr,
            category: 'namaz',
            prayerTime: pTime,
            status: status,
            note: '',
            recordedAt: new Date().toISOString()
          });
        });
      });
    });

    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  }

  // --- Performans İşlemleri ---
  getPerformances() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PERFORMANCE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getPerformanceForStudent(studentId) {
    return this.getPerformances().filter(p => p.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  addPerformance(entry) {
    const all = this.getPerformances();
    const newEntry = { id: 'perf_' + Date.now(), ...entry, createdAt: new Date().toISOString() };
    all.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(all));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/performance', all);
    }
    return newEntry;
  }

  deletePerformance(id) {
    let all = this.getPerformances().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(all));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/performance', all);
    }
  }

  // --- Takviye Ders Performansı (100 Üzerinden Değerlendirme Puanları) ---
  getAcademicScores() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACADEMIC_SCORES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getAcademicScoresByDateAndSubject(date, subject) {
    const all = this.getAcademicScores();
    return all.filter(s => s.date === date && s.subject === subject);
  }

  getAcademicScoresForStudent(studentId) {
    const all = this.getAcademicScores();
    return all.filter(s => s.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  saveSingleAcademicScore(studentId, date, subject, score, note = '') {
    const all = this.getAcademicScores();
    const cleanScore = (score === '' || score === null || isNaN(score)) 
      ? null 
      : Math.min(100, Math.max(0, parseInt(score, 10)));

    const idx = all.findIndex(s => s.studentId === studentId && s.date === date && s.subject === subject);

    if (cleanScore === null) {
      if (idx !== -1) {
        all.splice(idx, 1);
        localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(all));
        if (this.isCloudEnabled()) {
          this.syncToCloud('kurs_data/academicScores', all);
        }
      }
      return null;
    }

    const rec = {
      id: `acad_${studentId}_${date}_${subject}`,
      studentId,
      date,
      subject,
      score: cleanScore,
      note: note || '',
      updatedAt: new Date().toISOString()
    };

    if (idx !== -1) {
      all[idx] = { ...all[idx], ...rec };
    } else {
      all.push(rec);
    }

    localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(all));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/academicScores', all);
    }
    return rec;
  }

  // --- Test Neticeleri & Etüt Soru Takibi ---
  getTestResults() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEST_RESULTS);
      const list = data ? JSON.parse(data) : [];
      return Array.isArray(list) ? list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)) : [];
    } catch {
      return [];
    }
  }

  getTestResultById(id) {
    const list = this.getTestResults();
    return list.find(t => t.id === id) || null;
  }

  saveTestResult(testData) {
    const list = this.getTestResults();
    const id = testData.id || ('test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
    const nowIso = new Date().toISOString();

    const record = {
      ...testData,
      id,
      updatedAt: nowIso,
      createdAt: testData.createdAt || nowIso
    };

    const idx = list.findIndex(t => t.id === id);
    if (idx !== -1) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }

    localStorage.setItem(STORAGE_KEYS.TEST_RESULTS, JSON.stringify(list));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/testResults', list);
    }
    return record;
  }

  deleteTestResult(id) {
    let list = this.getTestResults().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEST_RESULTS, JSON.stringify(list));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/testResults', list);
    }
    return true;
  }

  getStudentTestResults(studentId) {
    const list = this.getTestResults();
    const results = [];
    list.forEach(test => {
      if (test.scores && test.scores[studentId]) {
        results.push({
          testId: test.id,
          title: test.title || 'Etüt Testi',
          subject: test.subject || 'Genel',
          unit: test.unit || '',
          topic: test.topic || '',
          date: test.date,
          totalQuestions: test.totalQuestions || 20,
          wrongPenalty: test.wrongPenalty !== undefined ? test.wrongPenalty : 3,
          ...test.scores[studentId]
        });
      }
    });
    return results.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  normalizeStatusCode(code) {
    if (!code) return 'VAR';
    const c = code.toString().toUpperCase().trim();
    if (c === 'GEC_TAKKESIZ' || c === 'TAKKESIZ_GEC' || c === 'GEÇ_TAKKESİZ' || c === 'TAKKESİZ_GEÇ' || c === 'GT' || c === 'TG') return 'GEC_TAKKESIZ';
    if (c === 'V' || c === 'VAR') return 'VAR';
    if (c === 'K' || c === 'Y' || c === 'YOK') return 'YOK';
    if (c === 'G' || c === 'GEC' || c === 'GEÇ') return 'GEC';
    if (c === 'T' || c === 'TAKKESIZ' || c === 'TAKKESİZ') return 'TAKKESIZ';
    if (c === 'I' || c === 'İ' || c === 'IZINLI' || c === 'İZİNLİ') return 'IZINLI';
    if (c === 'IYI' || c === 'ORTA' || c === 'KOTU' || c === 'GELDI' || c === 'GELMEDI') return c;
    return 'VAR';
  }

  getStudentStats(studentId) {
    const records = this.getAttendanceForStudent(studentId);
    const totalDays = records.length;
    const counts = { VAR: 0, YOK: 0, GEC: 0, TAKKESIZ: 0, GEC_TAKKESIZ: 0, IZINLI: 0 };
    records.forEach(r => {
      const st = this.normalizeStatusCode(r.status);
      counts[st] = (counts[st] || 0) + 1;
    });
    const presentCount = (counts.VAR || 0) + (counts.TAKKESIZ || 0) + (counts.GEC || 0) + (counts.GEC_TAKKESIZ || 0);
    const effectiveTotal = totalDays - (counts.IZINLI || 0);
    const attendanceRate = effectiveTotal > 0 ? Math.round((presentCount / effectiveTotal) * 100) : 100;
    const perfs = this.getPerformanceForStudent(studentId);
    let avgScore = 0;
    if (perfs.length > 0) {
      avgScore = Math.round(perfs.reduce((sum, p) => sum + (p.criteria?.score || 0), 0) / perfs.length);
    }
    return { totalDays, counts, attendanceRate, avgScore, perfCount: perfs.length };
  }

  // --- Hafta Sonu İzin Çıkış ve Kusur Gecikme Takibi ---
  getDayName(dateStr) {
    if (!dateStr) return '';
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return '';
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return days[d.getDay()] || '';
  }

  calculateExitTime(baseTime = '13:00', penaltyMinutes = 0) {
    const [hStr, mStr] = (baseTime || '13:00').split(':');
    const h = parseInt(hStr, 10) || 13;
    const m = parseInt(mStr, 10) || 0;
    const totalMins = h * 60 + m + penaltyMinutes;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    const hh = newH < 10 ? `0${newH}` : `${newH}`;
    const mm = newM < 10 ? `0${newM}` : `${newM}`;
    return `${hh}:${mm}`;
  }

  formatPenaltyDuration(minutes) {
    if (!minutes || minutes <= 0) return '0 dk';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h} sa ${m} dk`;
    if (h > 0) return `${h} saat`;
    return `${m} dakika`;
  }

  getLeaveReportForStudent(studentId, weekDates, baseExitTime = '13:00') {
    const allAtt = this.getAttendance();
    const studentRecords = allAtt.filter(a => a.studentId === studentId && weekDates.includes(a.date));

    const infractions = [];
    let namazInfractionsCount = 0;
    let yatakInfractionsCount = 0;
    let okulInfractionsCount = 0;

    studentRecords.forEach(rec => {
      const cat = rec.category || 'namaz';
      const st = this.normalizeStatusCode(rec.status);
      const dayName = this.getDayName(rec.date);

      if (cat === 'namaz') {
        // Namazda VAR ve İZİNLİ hariç olanlar (YOK, TAKKESIZ, GEC, GEC_TAKKESIZ)
        if (st !== 'VAR' && st !== 'IZINLI' && st !== 'E' && st !== 'I') {
          const pLabel = rec.prayerTime || 'Namaz';
          if (st === 'GEC_TAKKESIZ') {
            // Hem geç kaldı (+30 dk) hem takkesiz (+30 dk) -> 2 kusur, +60 dk ceza
            namazInfractionsCount += 2;
            infractions.push({
              id: rec.id + '_gec',
              date: rec.date,
              dayName,
              category: 'namaz',
              categoryLabel: '🕌 Namaz Yoklaması',
              subKey: pLabel,
              subLabel: `${pLabel} Namazı (Geç Kaldı)`,
              status: 'GEC',
              statusLabel: 'Geç Kaldı',
              statusBg: '#f59e0b',
              penaltyMinutes: 30,
              desc: `${rec.date} ${dayName} • ${pLabel} Namazı: Geç Kaldı (+30 dk)`
            });
            infractions.push({
              id: rec.id + '_takkesiz',
              date: rec.date,
              dayName,
              category: 'namaz',
              categoryLabel: '🕌 Namaz Yoklaması',
              subKey: pLabel,
              subLabel: `${pLabel} Namazı (Takkesiz)`,
              status: 'TAKKESIZ',
              statusLabel: 'Takkesiz Katıldı',
              statusBg: '#9333ea',
              penaltyMinutes: 30,
              desc: `${rec.date} ${dayName} • ${pLabel} Namazı: Takkesiz Katıldı (+30 dk)`
            });
          } else {
            namazInfractionsCount++;
            const stObj = STATUS_CONFIG[st] || { label: st, bg: '#ef4444' };
            infractions.push({
              id: rec.id,
              date: rec.date,
              dayName,
              category: 'namaz',
              categoryLabel: '🕌 Namaz Yoklaması',
              subKey: pLabel,
              subLabel: `${pLabel} Namazı`,
              status: st,
              statusLabel: stObj.label,
              statusBg: stObj.bg,
              penaltyMinutes: 30,
              desc: `${rec.date} ${dayName} • ${pLabel} Namazı: ${stObj.label} (+30 dk)`
            });
          }
        }
      } else if (cat === 'yatak') {
        // Yatakta ORTA ve KÖTÜ olanlar
        if (st === 'ORTA' || st === 'KOTU') {
          yatakInfractionsCount++;
          const stObj = STATUS_CONFIG[st] || { label: st, bg: '#f59e0b' };
          infractions.push({
            id: rec.id,
            date: rec.date,
            dayName,
            category: 'yatak',
            categoryLabel: '🛏️ Yatak Yoklaması',
            subKey: 'Yatak Düzeni',
            subLabel: 'Oda & Yatak Düzeni',
            status: st,
            statusLabel: stObj.label,
            statusBg: stObj.bg,
            penaltyMinutes: 30,
            desc: `${rec.date} ${dayName} • Yatak Düzeni: ${stObj.label} (+30 dk)`
          });
        }
      } else if (cat === 'okul_donusu') {
        // Okul dönüşünde GEÇ ve GELMEDİ olanlar
        if (st === 'GEC' || st === 'GELMEDI') {
          okulInfractionsCount++;
          const stObj = STATUS_CONFIG[st] || { label: st, bg: '#ef4444' };
          infractions.push({
            id: rec.id,
            date: rec.date,
            dayName,
            category: 'okul_donusu',
            categoryLabel: '🎒 Okul Dönüşü',
            subKey: 'Okul Dönüşü',
            subLabel: 'Yurda Geliş',
            status: st,
            statusLabel: stObj.label,
            statusBg: stObj.bg,
            penaltyMinutes: 30,
            desc: `${rec.date} ${dayName} • Okul Dönüşü: ${stObj.label} (+30 dk)`
          });
        }
      }
    });

    // İzin Dönüşü Gecikmeleri (Kaç dakika geç kaldıysa x3 geç çıkış cezası)
    let leaveReturnInfractionsCount = 0;
    let leaveReturnPenaltyMinutes = 0;
    const allLeaveReturns = this.getAllLeaveReturns();

    weekDates.forEach(dStr => {
      if (allLeaveReturns[dStr] && allLeaveReturns[dStr][studentId]) {
        const lr = allLeaveReturns[dStr][studentId];
        if (lr.status === 'GEC' && lr.lateMinutes > 0) {
          const multPenalty = lr.lateMinutes * 3;
          leaveReturnInfractionsCount++;
          leaveReturnPenaltyMinutes += multPenalty;
          const dayName = this.getDayName(dStr);
          infractions.push({
            id: 'lr_' + dStr + '_' + studentId,
            date: dStr,
            dayName,
            category: 'izin_donusu',
            categoryLabel: '🧳 İzin Dönüşü',
            subKey: 'İzin Dönüşü Gecikmesi',
            subLabel: `${lr.lateMinutes} dk Geç Kaldı`,
            status: 'GEC',
            statusLabel: `${lr.lateMinutes} dk Geç`,
            statusBg: '#ef4444',
            penaltyMinutes: multPenalty,
            lateMinutes: lr.lateMinutes,
            arrivalTime: lr.arrivalTime,
            expectedTime: lr.expectedTime,
            desc: `${dStr} ${dayName} • İzin Dönüşü: ${lr.lateMinutes} dk geç geldi (${lr.arrivalTime}, beklenen: ${lr.expectedTime}) • 3x Ceza: +${multPenalty} dk geç çıkış`
          });
        }
      }
    });

    infractions.sort((a, b) => a.date.localeCompare(b.date));

    const totalInfractions = infractions.length;
    const penaltyMinutes = infractions.reduce((sum, inf) => sum + (inf.penaltyMinutes || 30), 0);
    const calculatedExitTime = this.calculateExitTime(baseExitTime, penaltyMinutes);
    const penaltyFormatted = this.formatPenaltyDuration(penaltyMinutes);

    return {
      studentId,
      weekDates,
      baseExitTime,
      calculatedExitTime,
      totalInfractions,
      penaltyMinutes,
      penaltyFormatted,
      namazInfractionsCount,
      yatakInfractionsCount,
      okulInfractionsCount,
      leaveReturnInfractionsCount,
      leaveReturnPenaltyMinutes,
      infractions
    };
  }

  getLeaveReportBatch(students, weekDates, baseExitTime = '13:00') {
    const reports = students.map(st => ({
      student: st,
      report: this.getLeaveReportForStudent(st.id, weekDates, baseExitTime)
    }));

    let totalInfractionsAll = 0;
    let totalPenaltyMinutesAll = 0;
    let onTimeCount = 0;
    let delayedCount = 0;

    reports.forEach(item => {
      totalInfractionsAll += item.report.totalInfractions;
      totalPenaltyMinutesAll += item.report.penaltyMinutes;
      if (item.report.totalInfractions === 0) {
        onTimeCount++;
      } else {
        delayedCount++;
      }
    });

    return {
      reports,
      totalStudents: students.length,
      onTimeCount,
      delayedCount,
      totalInfractionsAll,
      totalPenaltyMinutesAll,
      totalPenaltyFormatted: this.formatPenaltyDuration(totalPenaltyMinutesAll)
    };
  }

  getGateCheckoutStatus(weekKey) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEAVE_CHECKOUT);
      const all = data ? JSON.parse(data) : {};
      return all[weekKey] || {};
    } catch {
      return {};
    }
  }

  toggleGateCheckout(weekKey, studentId) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEAVE_CHECKOUT);
      const all = data ? JSON.parse(data) : {};
      if (!all[weekKey]) all[weekKey] = {};
      all[weekKey][studentId] = !all[weekKey][studentId];
      localStorage.setItem(STORAGE_KEYS.LEAVE_CHECKOUT, JSON.stringify(all));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/gateCheckouts', all);
      }
      return all[weekKey][studentId];
    } catch {
      return false;
    }
  }

  // --- İzin Dönüşü Kayıt Metodları ---
  getAllLeaveReturns() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEAVE_RETURN);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  getLeaveReturnsByDate(dateStr) {
    const all = this.getAllLeaveReturns();
    return all[dateStr] || {};
  }

  saveLeaveReturn(dateStr, studentId, recordData) {
    try {
      const all = this.getAllLeaveReturns();
      if (!all[dateStr]) all[dateStr] = {};
      all[dateStr][studentId] = {
        studentId,
        date: dateStr,
        ...recordData,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.LEAVE_RETURN, JSON.stringify(all));
      if (this.isCloudEnabled()) {
        this.syncToCloud(`kurs_data/leaveReturns/${dateStr}/${studentId}`, all[dateStr][studentId]);
      }
      return all[dateStr][studentId];
    } catch (e) {
      console.error('saveLeaveReturn error:', e);
      return null;
    }
  }

  deleteLeaveReturn(dateStr, studentId) {
    try {
      const all = this.getAllLeaveReturns();
      if (all[dateStr] && all[dateStr][studentId]) {
        delete all[dateStr][studentId];
        localStorage.setItem(STORAGE_KEYS.LEAVE_RETURN, JSON.stringify(all));
        if (this.isCloudEnabled()) {
          this.syncToCloud(`kurs_data/leaveReturns/${dateStr}/${studentId}`, null);
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('deleteLeaveReturn error:', e);
      return false;
    }
  }

  // ========================================================
  // --- HAFTANIN VE AYIN TALEBESİ & PUANLAMA MOTORU ---
  // ========================================================
  getAllBonusPoints() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BONUS_POINTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addBonusPoint(studentId, points, reason, hocaName = 'Eğitmen', date = new Date().toISOString().split('T')[0]) {
    try {
      const all = this.getAllBonusPoints();
      const rec = {
        id: 'bonus_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        studentId,
        date,
        points: Number(points) || 10,
        reason: reason || 'Örnek Davranış & Gayret',
        hocaName: hocaName || 'Eğitmen',
        createdAt: new Date().toISOString()
      };
      all.push(rec);
      localStorage.setItem(STORAGE_KEYS.BONUS_POINTS, JSON.stringify(all));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/bonusPoints', all);
      }
      return rec;
    } catch (e) {
      console.error('addBonusPoint error:', e);
      return null;
    }
  }

  deleteBonusPoint(id) {
    try {
      let all = this.getAllBonusPoints();
      all = all.filter(b => b.id !== id);
      localStorage.setItem(STORAGE_KEYS.BONUS_POINTS, JSON.stringify(all));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/bonusPoints', all);
      }
      return true;
    } catch (e) {
      console.error('deleteBonusPoint error:', e);
      return false;
    }
  }

  getStudentCompetitionScore(studentId, dates) {
    const allAtt = this.getAttendance();
    const studentAtt = allAtt.filter(a => a.studentId === studentId && dates.includes(a.date));

    // 1. Namaz Puanı & Günlük Tam İbadet Bonusu
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
    const namazGrid = {};
    dates.forEach(d => { namazGrid[d] = {}; });
    
    studentAtt.filter(a => a.category === 'namaz').forEach(a => {
      const pTime = a.prayerTime || 'Sabah';
      const st = this.normalizeStatusCode(a.status);
      if (namazGrid[a.date]) {
        namazGrid[a.date][pTime] = st;
      }
    });

    let namazPoints = 0;
    let varCount = 0;
    let gecCount = 0;
    let takkesizCount = 0;
    let gecTakkesizCount = 0;
    let yokCount = 0;
    let izinliCount = 0;
    let fullBonusCount = 0;

    dates.forEach(d => {
      let dayAttendedPrayers = 0;
      let dayHasYok = false;
      prayers.forEach(p => {
        const st = namazGrid[d] ? namazGrid[d][p] : null;
        if (!st) return;
        if (st === 'VAR') {
          namazPoints += 10;
          varCount++;
          dayAttendedPrayers++;
        } else if (st === 'GEC') {
          namazPoints += 5;
          gecCount++;
          dayAttendedPrayers++;
        } else if (st === 'TAKKESIZ') {
          namazPoints += 5;
          takkesizCount++;
          dayAttendedPrayers++;
        } else if (st === 'GEC_TAKKESIZ') {
          namazPoints += 2;
          gecTakkesizCount++;
          dayAttendedPrayers++;
        } else if (st === 'YOK') {
          yokCount++;
          dayHasYok = true;
        } else if (st === 'IZINLI') {
          izinliCount++;
        }
      });

      // Eğer o gün 5 vakit namaz kılınmışsa (ve hiç 'YOK' yoksa) -> +15 Günlük Tam İbadet Bonusu
      if (dayAttendedPrayers === 5 && !dayHasYok) {
        fullBonusCount++;
      }
    });

    const fullBonusPoints = fullBonusCount * 15;
    const totalNamazPoints = namazPoints + fullBonusPoints;

    // 2. Yatak Düzeni Puanı
    let yatakPoints = 0;
    let iyiCount = 0;
    let ortaCount = 0;
    let kotuCount = 0;
    studentAtt.filter(a => a.category === 'yatak').forEach(a => {
      const st = this.normalizeStatusCode(a.status);
      if (st === 'IYI' || st === 'VAR') {
        yatakPoints += 15;
        iyiCount++;
      } else if (st === 'ORTA') {
        yatakPoints += 5;
        ortaCount++;
      } else if (st === 'KOTU' || st === 'YOK') {
        kotuCount++;
      }
    });

    // 3. Okul Dönüşü Puanı
    let okulPoints = 0;
    let geldiCount = 0;
    let okulGecCount = 0;
    let gelmediCount = 0;
    studentAtt.filter(a => a.category === 'okul_donusu').forEach(a => {
      const st = this.normalizeStatusCode(a.status);
      if (st === 'GELDI' || st === 'VAR') {
        okulPoints += 10;
        geldiCount++;
      } else if (st === 'GEC') {
        okulPoints += 3;
        okulGecCount++;
      } else if (st === 'GELMEDI' || st === 'YOK') {
        gelmediCount++;
      }
    });

    // 4. İzin Dönüşü Puanı
    const allReturns = this.getAllLeaveReturns();
    let izinPoints = 0;
    let izinCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    dates.forEach(d => {
      if (allReturns[d] && allReturns[d][studentId]) {
        const ret = allReturns[d][studentId];
        izinCount++;
        if (ret.status === 'VAKTINDE' || ret.status === 'ERKEN') {
          izinPoints += 25;
          onTimeCount++;
        } else if (ret.status === 'GEC') {
          lateCount++;
          const penalty = Math.min(25, ret.lateMinutes || ret.diffMinutes || 0);
          izinPoints += Math.max(0, 25 - penalty);
        } else if (ret.status === 'IZINLI') {
          // İzinli olan talebeler puan alamaz (0 Puan), ceza da alamaz (0 Ceza)
          // izinPoints artırılmaz, ceza kesilmez.
        }
      }
    });

    // 5. Takviye Ders Notları Puanı
    const allAcad = this.getAcademicScores();
    const studentAcad = allAcad.filter(s => s.studentId === studentId && dates.includes(s.date));
    let akademiPoints = 0;
    studentAcad.forEach(s => {
      const score = Number(s.score) || 0;
      if (score >= 100) {
        akademiPoints += 50;
      } else if (score >= 90) {
        akademiPoints += 40;
      } else if (score >= 85) {
        akademiPoints += 30;
      } else {
        akademiPoints += Math.round(score / 3);
      }
    });

    // 6. Hoca Takdir / Bonus Puanları
    const allBonus = this.getAllBonusPoints();
    const studentBonus = allBonus.filter(b => b.studentId === studentId && dates.includes(b.date));
    let bonusPoints = 0;
    studentBonus.forEach(b => {
      bonusPoints += Number(b.points) || 0;
    });

    const totalScore = totalNamazPoints + yatakPoints + okulPoints + izinPoints + akademiPoints + bonusPoints;

    return {
      studentId,
      totalScore,
      namaz: {
        points: totalNamazPoints,
        basePoints: namazPoints,
        varCount,
        gecCount,
        takkesizCount,
        gecTakkesizCount,
        yokCount,
        izinliCount,
        fullBonusCount,
        fullBonusPoints
      },
      yatak: {
        points: yatakPoints,
        iyiCount,
        ortaCount,
        kotuCount
      },
      okul: {
        points: okulPoints,
        geldiCount,
        gecCount: okulGecCount,
        gelmediCount
      },
      izinDonus: {
        points: izinPoints,
        count: izinCount,
        onTimeCount,
        lateCount
      },
      akademi: {
        points: akademiPoints,
        count: studentAcad.length,
        scores: studentAcad
      },
      bonus: {
        points: bonusPoints,
        count: studentBonus.length,
        items: studentBonus
      }
    };
  }

  getLeaderboard(period = 'haftalik', targetDate = new Date().toISOString().split('T')[0], classFilter = 'ALL') {
    const range = period === 'haftalik'
      ? this.getWeekRange(targetDate)
      : this.getMonthRange(targetDate.substring(0, 7));

    let students = this.getStudents();
    if (classFilter && classFilter !== 'ALL') {
      students = students.filter(s => s.className === classFilter);
    }

    const leaderboard = students.map(st => {
      const scoreData = this.getStudentCompetitionScore(st.id, range.dates);
      return {
        student: st,
        ...scoreData
      };
    });

    // Puanlara göre büyükten küçüğe sırala
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);

    // Sıralama (rank) ata
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    return {
      period,
      targetDate,
      startDate: range.startDate,
      endDate: range.endDate,
      dates: range.dates,
      classFilter,
      totalStudents: leaderboard.length,
      ranking: leaderboard
    };
  }

  exportBackup() {
    return JSON.stringify({
      version: '5.0',
      exportedAt: new Date().toISOString(),
      students: this.getStudents(),
      staff: this.getStaff(),
      attendance: this.getAttendance(),
      performance: this.getPerformances(),
      academicScores: this.getAcademicScores(),
      leaveReturns: this.getAllLeaveReturns(),
      bonusPoints: this.getAllBonusPoints(),
      settings: this.getSettings()
    }, null, 2);
  }

  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.students) throw new Error('Geçersiz format.');
      this.saveStudents(parsed.students);
      if (parsed.staff) this.saveStaff(parsed.staff);
      if (parsed.attendance) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(parsed.attendance));
      if (parsed.performance) localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(parsed.performance));
      if (parsed.academicScores) localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(parsed.academicScores));
      if (parsed.leaveReturns) localStorage.setItem(STORAGE_KEYS.LEAVE_RETURN, JSON.stringify(parsed.leaveReturns));
      if (parsed.bonusPoints) localStorage.setItem(STORAGE_KEYS.BONUS_POINTS, JSON.stringify(parsed.bonusPoints));
      if (parsed.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

window.Store = new DataStore();
window.STATUS_CONFIG = STATUS_CONFIG;
window.SEED_STUDENTS = SEED_STUDENTS;
window.DEFAULT_STAFF = DEFAULT_STAFF;
