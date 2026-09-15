/**
 * store.js - Veri Katmanı ve Kalıcı Hafıza (LocalStorage + Firebase Bulut Entegrasyonu)
 */

const STORAGE_KEYS = {
  STUDENTS: 'yoklama_students',
  ATTENDANCE: 'yoklama_attendance',
  PERFORMANCE: 'yoklama_performance',
  SETTINGS: 'yoklama_settings',
  INITIALIZED: 'yoklama_init_v2'
};

// Özel Yoklama Kodları ve Tanımları
const STATUS_CONFIG = {
  V: { code: 'V', label: 'Var / Geldi', short: 'Var', bg: '#10b981', border: '#059669', badgeClass: 'badge-status-V', desc: 'Kursta ve dersinde mevcut' },
  T: { code: 'T', label: 'Takkesiz', short: 'Takkesiz (t)', bg: '#9333ea', border: '#7e22ce', badgeClass: 'badge-status-T', desc: 'Kursta mevcut fakat takkesi yok' },
  Y: { code: 'Y', label: 'Namazda Yok', short: 'Namazda Yok (y)', bg: '#881337', border: '#4c0519', badgeClass: 'badge-status-Y', desc: 'Kursta var fakat namaza katılmadı' },
  G: { code: 'G', label: 'Geç Kaldı', short: 'Geç (g)', bg: '#f59e0b', border: '#d97706', badgeClass: 'badge-status-G', desc: 'Ders veya etüte geç geldi' },
  E: { code: 'E', label: 'Eşofmanlı', short: 'Eşofmanlı (e)', bg: '#0284c7', border: '#0369a1', badgeClass: 'badge-status-E', desc: 'Kıyafet kuralına uymadı, eşofmanlı geldi' },
  K: { code: 'K', label: 'Kursta Yok', short: 'Kursta Yok (k)', bg: '#ef4444', border: '#dc2626', badgeClass: 'badge-status-K', desc: 'Kursta yok / Tamamen devamsız' },
  I: { code: 'I', label: 'İzinli / Raporlu', short: 'İzinli (i)', bg: '#0d9488', border: '#0f766e', badgeClass: 'badge-status-I', desc: 'Mazeretli / İzinli' }
};

const DEFAULT_SETTINGS = {
  institutionName: 'Kurs & Etüt Öğrenci Takip Sistemi',
  personnelPin: '1234',
  academicYear: '2026-2027'
};

const SEED_STUDENTS = [
  { id: 'std_101', studentNo: '101', firstName: 'Ahmet', lastName: 'Yılmaz', className: '8-A', familyCode: 'YILMAZ2026', fatherName: 'Mehmet Yılmaz', motherName: 'Fatma Yılmaz', parentPhone: '0555 111 22 33', notes: 'Kardeşi Ali ile aynı aile koduna sahip' },
  { id: 'std_102', studentNo: '102', firstName: 'Ali', lastName: 'Yılmaz', className: '5-B', familyCode: 'YILMAZ2026', fatherName: 'Mehmet Yılmaz', motherName: 'Fatma Yılmaz', parentPhone: '0555 111 22 33', notes: 'Kardeşi Ahmet ile aynı aile koduna sahip' },
  { id: 'std_103', studentNo: '103', firstName: 'Bilal', lastName: 'Demir', className: '7-A', familyCode: 'DEMIR2026', fatherName: 'Hasan Demir', motherName: 'Zeynep Demir', parentPhone: '0544 222 33 44', notes: 'Kardeşi Ömer Faruk ile aynı kod' },
  { id: 'std_104', studentNo: '104', firstName: 'Ömer Faruk', lastName: 'Demir', className: '6-A', familyCode: 'DEMIR2026', fatherName: 'Hasan Demir', motherName: 'Zeynep Demir', parentPhone: '0544 222 33 44', notes: 'Kardeşi Bilal ile aynı kod' },
  { id: 'std_105', studentNo: '105', firstName: 'Yusuf Can', lastName: 'Kaya', className: '8-A', familyCode: 'CAN2026', fatherName: 'İbrahim Kaya', motherName: 'Ayşe Kaya', parentPhone: '0533 333 44 55', notes: 'Tek çocuk' },
  { id: 'std_106', studentNo: '106', firstName: 'Hamza', lastName: 'Yıldız', className: '5-B', familyCode: 'YILDIZ2026', fatherName: 'Mustafa Yıldız', motherName: 'Emine Yıldız', parentPhone: '0505 444 55 66', notes: 'Tek çocuk' },
  { id: 'std_107', studentNo: '107', firstName: 'Mustafa', lastName: 'Şahin', className: '7-A', familyCode: 'SAHIN2026', fatherName: 'Osman Şahin', motherName: 'Hatice Şahin', parentPhone: '0532 777 88 99', notes: 'Tek çocuk' }
];

function generateSeedAttendance() {
  const records = [];
  const today = new Date();
  const studentIds = SEED_STUDENTS.map(s => s.id);
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (d.getDay() === 0) continue;

    studentIds.forEach((sid) => {
      let status = 'V';
      let note = '';

      if (sid === 'std_101' && i === 2) { status = 'T'; note = 'Takkesini evde unutmuş'; }
      else if (sid === 'std_102' && i === 3) { status = 'Y'; note = 'İkindi namazına gelmedi'; }
      else if (sid === 'std_103' && i === 1) { status = 'G'; note = '15 dk geç geldi'; }
      else if (sid === 'std_104' && i === 4) { status = 'E'; note = 'Sivil/eşofmanla geldi'; }
      else if (sid === 'std_105' && i === 5) { status = 'K'; note = 'Haber vermeden gelmedi'; }
      else if (sid === 'std_106' && i === 1) { status = 'I'; note = 'Diş randevusu sebebiyle izinli'; }

      records.push({
        id: `att_${sid}_${dateStr}`,
        studentId: sid,
        date: dateStr,
        status: status,
        note: note,
        recordedAt: new Date().toISOString()
      });
    });
  }
  return records;
}

const SEED_PERFORMANCE = [
  { id: 'perf_1', studentId: 'std_101', date: new Date().toISOString().split('T')[0], subject: 'Kuran-ı Kerim & Ezber', criteria: { participation: 5, homework: 5, behavior: 5, score: 95 }, badges: ['Ezberini Tam Verdi', 'Namazlarını Eksiksiz Kıldı', 'Haftanın Yıldızı'], teacherNote: 'Ahmet bugün 2 sayfa ezberini tek seferde pürüzsüz verdi. Maşallah gayreti takdire şayan.', teacherName: 'Hasan Hoca' },
  { id: 'perf_2', studentId: 'std_102', date: new Date().toISOString().split('T')[0], subject: 'Ahlak & İlmihal', criteria: { participation: 4, homework: 4, behavior: 4, score: 85 }, badges: ['Derste Çok Aktif', 'Ödevini Yaptı'], teacherNote: 'Ali ders içi sorularda çok hevesliydi. Namaz vakitlerinde daha dikkatli olması tavsiye edildi.', teacherName: 'Hüseyin Hoca' },
  { id: 'perf_3', studentId: 'std_103', date: new Date().toISOString().split('T')[0], subject: 'Kuran-ı Kerim Tecvid', criteria: { participation: 5, homework: 5, behavior: 5, score: 98 }, badges: ['Kılık Kıyafete Özen Gösterdi', 'Haftanın Yıldızı'], teacherNote: 'Bilal efendiliği ve intizamıyla örnek bir öğrencimiz.', teacherName: 'Hasan Hoca' },
  { id: 'perf_4', studentId: 'std_104', date: new Date().toISOString().split('T')[0], subject: 'Siyer-i Nebi', criteria: { participation: 4, homework: 3, behavior: 4, score: 80 }, badges: ['Gelişim Gösteriyor'], teacherNote: 'Ömer Faruk dersi iyi dinledi, haftaya ödevini tamamlamasını bekliyoruz.', teacherName: 'Ahmet Hoca' }
];

class DataStore {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      this.resetToDefaults();
    }
  }

  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(SEED_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(generateSeedAttendance()));
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(SEED_PERFORMANCE));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // --- Ayarlar ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
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

  verifyPin(pin) {
    const settings = this.getSettings();
    return settings.personnelPin.trim() === pin.trim();
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
    const students = this.getStudents();
    return students.find(s => s.id === id) || null;
  }

  getStudentByNo(no) {
    const students = this.getStudents();
    return students.find(s => s.studentNo.toString().trim() === no.toString().trim()) || null;
  }

  getStudentsByFamilyCode(code) {
    if (!code) return [];
    const cleanCode = code.trim().toUpperCase();
    const students = this.getStudents();
    return students.filter(s => (s.familyCode || '').trim().toUpperCase() === cleanCode);
  }

  saveStudents(students) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  addStudent(student) {
    const students = this.getStudents();
    const newStudent = {
      ...student,
      id: 'std_' + Date.now(),
      familyCode: (student.familyCode || '').trim().toUpperCase()
    };
    students.push(newStudent);
    this.saveStudents(students);

    if (window.CloudSync && window.CloudSync.isCloudActive) {
      window.CloudSync.syncStudent(newStudent);
    }

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

      if (window.CloudSync && window.CloudSync.isCloudActive) {
        window.CloudSync.syncStudent(students[index]);
      }

      return students[index];
    }
    return null;
  }

  deleteStudent(id) {
    let students = this.getStudents();
    students = students.filter(s => s.id !== id);
    this.saveStudents(students);

    let att = this.getAttendance();
    att = att.filter(a => a.studentId !== id);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(att));

    let perf = this.getPerformances();
    perf = perf.filter(p => p.studentId !== id);
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(perf));

    if (window.CloudSync && window.CloudSync.isCloudActive) {
      window.CloudSync.deleteStudent(id);
    }
  }

  getClasses() {
    const students = this.getStudents();
    const classes = [...new Set(students.map(s => s.className).filter(Boolean))];
    return classes.sort();
  }

  // --- Yoklama İşlemleri ---
  getAttendance() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getAttendanceByDate(date) {
    const all = this.getAttendance();
    return all.filter(a => a.date === date);
  }

  getAttendanceForStudent(studentId) {
    const all = this.getAttendance();
    return all.filter(a => a.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  saveAttendanceBatch(records) {
    const all = this.getAttendance();
    records.forEach(newRec => {
      const idx = all.findIndex(a => a.studentId === newRec.studentId && a.date === newRec.date);
      let recordObj;
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...newRec, recordedAt: new Date().toISOString() };
        recordObj = all[idx];
      } else {
        recordObj = {
          id: `att_${newRec.studentId}_${newRec.date}`,
          ...newRec,
          recordedAt: new Date().toISOString()
        };
        all.push(recordObj);
      }

      if (window.CloudSync && window.CloudSync.isCloudActive) {
        window.CloudSync.syncAttendance(recordObj);
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
    const all = this.getPerformances();
    return all.filter(p => p.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  addPerformance(entry) {
    const all = this.getPerformances();
    const newEntry = {
      id: 'perf_' + Date.now(),
      ...entry,
      createdAt: new Date().toISOString()
    };
    all.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(all));

    if (window.CloudSync && window.CloudSync.isCloudActive) {
      window.CloudSync.syncPerformance(newEntry);
    }

    return newEntry;
  }

  deletePerformance(id) {
    let all = this.getPerformances();
    all = all.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(all));
  }

  // --- İstatistik ve Analiz ---
  getStudentStats(studentId) {
    const records = this.getAttendanceForStudent(studentId);
    const totalDays = records.length;
    
    const counts = { V: 0, T: 0, Y: 0, G: 0, E: 0, K: 0, I: 0 };
    records.forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });

    const presentCount = counts.V + counts.T + counts.Y + counts.G + counts.E;
    const effectiveTotal = totalDays - counts.I;
    const attendanceRate = effectiveTotal > 0 ? Math.round((presentCount / effectiveTotal) * 100) : 100;

    const perfs = this.getPerformanceForStudent(studentId);
    let avgScore = 0;
    if (perfs.length > 0) {
      const totalScore = perfs.reduce((sum, p) => sum + (p.criteria?.score || 0), 0);
      avgScore = Math.round(totalScore / perfs.length);
    }

    return { totalDays, counts, attendanceRate, avgScore, perfCount: perfs.length };
  }

  exportBackup() {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      students: this.getStudents(),
      attendance: this.getAttendance(),
      performance: this.getPerformances(),
      settings: this.getSettings()
    };
    return JSON.stringify(backup, null, 2);
  }

  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.students || !parsed.attendance) throw new Error('Geçersiz format.');
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(parsed.students));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(parsed.attendance));
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
