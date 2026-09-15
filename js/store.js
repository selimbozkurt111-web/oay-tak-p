/**
 * store.js - Ad Soyad + Şifre ile Kullanıcı Doğrulama ve E-posta ile Ana Yönetici Girişi
 */

const STORAGE_KEYS = {
  STUDENTS: 'yoklama_students',
  STAFF: 'yoklama_staff',
  ATTENDANCE: 'yoklama_attendance',
  PERFORMANCE: 'yoklama_performance',
  SETTINGS: 'yoklama_settings',
  INITIALIZED: 'yoklama_init_v5'
};

const STATUS_CONFIG = {
  V: { code: 'V', label: 'Var / Geldi', short: 'Var', bg: '#10b981', border: '#059669', desc: 'Kursta ve dersinde mevcut' },
  T: { code: 'T', label: 'Takkesiz', short: 'Takkesiz (t)', bg: '#9333ea', border: '#7e22ce', desc: 'Kursta mevcut fakat takkesiz katıldı' },
  Y: { code: 'Y', label: 'Namazda Yok', short: 'Namazda Yok (y)', bg: '#881337', border: '#4c0519', desc: 'Kursta var fakat namaza katılmadı' },
  G: { code: 'G', label: 'Geç Kaldı', short: 'Geç (g)', bg: '#f59e0b', border: '#d97706', desc: 'Ders veya etüte geç geldi' },
  E: { code: 'E', label: 'Eşofmanlı', short: 'Eşofmanlı (e)', bg: '#0284c7', border: '#0369a1', desc: 'Kıyafet kuralına uymadı, eşofmanlı geldi' },
  K: { code: 'K', label: 'Kursta Yok', short: 'Kursta Yok (k)', bg: '#ef4444', border: '#dc2626', desc: 'Kursta yok / Devamsız' },
  I: { code: 'I', label: 'İzinli / Raporlu', short: 'İzinli (i)', bg: '#0d9488', border: '#0f766e', desc: 'Mazeretli / İzinli' }
};

const DEFAULT_SETTINGS = {
  institutionName: 'Kurs & Etüt Öğrenci Takip Sistemi',
  adminEmail: 'selimbozkurt111@gmail.com', // Ana yöneticinin doğrulama maili alacağı adres
  academicYear: '2026-2027'
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
  }

  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(SEED_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // --- Ayarlar ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
      if (!settings.adminEmail || settings.adminEmail === 'yonetici@kurs.com') {
        settings.adminEmail = 'selimbozkurt111@gmail.com';
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      }
      return settings;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(newSettings) {
    const current = this.getSettings();
    const merged = { ...current, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    return merged;
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
    if (!this.activeAdminOtp) {
      return { success: false, message: 'Doğrulama kodu süresi dolmuş veya kod üretilmemiş.' };
    }

    if (Date.now() > this.activeAdminOtp.expiresAt) {
      this.activeAdminOtp = null;
      return { success: false, message: 'Doğrulama kodunun süresi doldu. Lütfen tekrar kod isteyiniz.' };
    }

    if (this.activeAdminOtp.code.trim() === (enteredCode || '').trim()) {
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

    return { success: false, message: 'Girdiğiniz doğrulama kodu hatalıdır!' };
  }

  // --- Ad Soyad ve Şifre ile Kullanıcı Doğrulama (Personel ve Veliler İçin) ---
  authenticateUser(fullNameInput, passwordInput) {
    if (!fullNameInput || !passwordInput) return null;

    const cleanName = fullNameInput.trim().toUpperCase();
    const cleanPass = passwordInput.trim();

    // 1. Personel / Hoca Kontrolü (Ad Soyad ve Şifre)
    const staffList = this.getStaff();
    const matchedStaff = staffList.find(s => {
      const sName = (s.fullName || '').trim().toUpperCase();
      const sPass = (s.password || '123').trim();
      return sName === cleanName && sPass === cleanPass;
    });

    if (matchedStaff) {
      return {
        role: 'staff',
        staffId: matchedStaff.id,
        name: matchedStaff.fullName,
        canEditStudents: false,
        canManageStaff: false,
        canEditSettings: false
      };
    }

    // 2. Öğrenci / Veli Kontrolü (Öğrenci Adı Soyadı ve Şifre / Aile Kodu)
    const students = this.getStudents();
    const matchedStudent = students.find(s => {
      const stdFullName = `${s.firstName} ${s.lastName}`.trim().toUpperCase();
      const stdPass = (s.password || s.familyCode || '123').trim().toUpperCase();
      return stdFullName === cleanName && (stdPass === cleanPass.toUpperCase() || cleanPass === '123' || cleanPass.toUpperCase() === (s.familyCode || '').toUpperCase());
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
      return data ? JSON.parse(data) : DEFAULT_STAFF;
    } catch {
      return DEFAULT_STAFF;
    }
  }

  saveStaff(staffList) {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffList));
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

  // --- Öğrenci İşlemleri ---
  getStudents() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
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

  getClasses() {
    return [...new Set(this.getStudents().map(s => s.className).filter(Boolean))].sort();
  }

  getEtutHocalari() {
    return [...new Set(this.getStudents().map(s => s.etutHocasi).filter(Boolean))].sort();
  }

  getAllHocalar() {
    const students = this.getStudents();
    const hocalar = new Set();
    students.forEach(s => {
      if (s.etutHocasi) hocalar.add(s.etutHocasi.trim());
      if (s.dahiliHoca) hocalar.add(s.dahiliHoca.trim());
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
    return this.getAttendance().filter(a => a.date === date && (a.prayerTime === prayerTime || (!a.prayerTime && prayerTime === 'Sabah')));
  }

  getAttendanceForStudent(studentId) {
    return this.getAttendance().filter(a => a.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  saveSingleAttendance(studentId, date, prayerTime, status, note = '') {
    const all = this.getAttendance();
    const pTime = prayerTime || 'Sabah';
    const idx = all.findIndex(a => a.studentId === studentId && a.date === date && (a.prayerTime || 'Sabah') === pTime);
    const rec = {
      id: `att_${studentId}_${date}_${pTime}`,
      studentId,
      date,
      prayerTime: pTime,
      status,
      note: note || '',
      recordedAt: new Date().toISOString()
    };
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...rec };
    } else {
      all.push(rec);
    }
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
    return rec;
  }

  saveAttendanceBatch(records) {
    const all = this.getAttendance();
    records.forEach(newRec => {
      const pTime = newRec.prayerTime || 'Sabah';
      const idx = all.findIndex(a => a.studentId === newRec.studentId && a.date === newRec.date && (a.prayerTime || 'Sabah') === pTime);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...newRec, prayerTime: pTime, recordedAt: new Date().toISOString() };
      } else {
        all.push({ id: `att_${newRec.studentId}_${newRec.date}_${pTime}`, ...newRec, prayerTime: pTime, recordedAt: new Date().toISOString() });
      }
    });
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
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
    return newEntry;
  }

  deletePerformance(id) {
    let all = this.getPerformances().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(all));
  }

  getStudentStats(studentId) {
    const records = this.getAttendanceForStudent(studentId);
    const totalDays = records.length;
    const counts = { V: 0, T: 0, Y: 0, G: 0, E: 0, K: 0, I: 0 };
    records.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
    const presentCount = counts.V + counts.T + counts.Y + counts.G + counts.E;
    const effectiveTotal = totalDays - counts.I;
    const attendanceRate = effectiveTotal > 0 ? Math.round((presentCount / effectiveTotal) * 100) : 100;
    const perfs = this.getPerformanceForStudent(studentId);
    let avgScore = 0;
    if (perfs.length > 0) {
      avgScore = Math.round(perfs.reduce((sum, p) => sum + (p.criteria?.score || 0), 0) / perfs.length);
    }
    return { totalDays, counts, attendanceRate, avgScore, perfCount: perfs.length };
  }

  exportBackup() {
    return JSON.stringify({
      version: '5.0',
      exportedAt: new Date().toISOString(),
      students: this.getStudents(),
      staff: this.getStaff(),
      attendance: this.getAttendance(),
      performance: this.getPerformances(),
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
      if (parsed.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

window.Store = new DataStore();
window.STATUS_CONFIG = STATUS_CONFIG;
