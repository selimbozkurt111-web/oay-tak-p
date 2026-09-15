/**
 * attendance.js - 5 Vakit Namaz Yoklaması & 5 Durum (Var, Yok, Geç, Takkesiz, İzinli)
 * (Kelimeli Butonlar, Hızlı Filtresiz ve Mazeret Kutusuz Sade Arayüz)
 */

window.AttendanceModule = {
  currentDate: new Date().toISOString().split('T')[0],
  currentPrayer: 'Sabah',
  currentClass: 'ALL',
  currentHoca: 'ALL',
  searchQuery: '',
  draftAttendance: {},
  _saveTimeout: null,

  prayerTimes: [
    { name: 'Sabah', icon: '🌅', label: 'Sabah Namazı' },
    { name: 'Öğle', icon: '☀️', label: 'Öğle Namazı' },
    { name: 'İkindi', icon: '🌤️', label: 'İkindi Namazı' },
    { name: 'Akşam', icon: '🌇', label: 'Akşam Namazı' },
    { name: 'Yatsı', icon: '🌙', label: 'Yatsı Namazı' }
  ],

  // 5 Temel Yoklama Durumu
  statuses: [
    { code: 'VAR', label: 'Var', bg: '#10b981', border: '#059669', activeClass: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300' },
    { code: 'YOK', label: 'Yok', bg: '#ef4444', border: '#dc2626', activeClass: 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300' },
    { code: 'GEC', label: 'Geç', bg: '#f59e0b', border: '#d97706', activeClass: 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300' },
    { code: 'TAKKESIZ', label: 'Takkesiz', bg: '#9333ea', border: '#7e22ce', activeClass: 'bg-purple-700 text-white shadow-md ring-2 ring-purple-300' },
    { code: 'IZINLI', label: 'İzinli', bg: '#0d9488', border: '#0f766e', activeClass: 'bg-teal-600 text-white shadow-md ring-2 ring-teal-300' }
  ],

  init() {
    // Saate göre en uygun vakti varsayılan seç
    const hour = new Date().getHours();
    if (hour < 11) this.currentPrayer = 'Sabah';
    else if (hour < 15) this.currentPrayer = 'Öğle';
    else if (hour < 18) this.currentPrayer = 'İkindi';
    else if (hour < 21) this.currentPrayer = 'Akşam';
    else this.currentPrayer = 'Yatsı';

    this.renderView();
  },

  setPrayer(prayerName) {
    this.currentPrayer = prayerName;
    this.loadDailyDraft();
    this.renderView();
    window.App.showToast(`${this.currentPrayer} Namazı yoklaması seçildi.`, 'info');
  },

  setDate(date) {
    this.currentDate = date;
    this.loadDailyDraft();
    this.renderView();
  },

  setClassFilter(className) {
    this.currentClass = className;
    this.renderView();
  },

  setHocaFilter(hocaName) {
    this.currentHoca = hocaName;
    this.renderStudentRows();
    this.renderSummary();
  },

  setSearchQuery(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.renderStudentRows();
    this.renderSummary();
  },

  loadDailyDraft() {
    this.draftAttendance = {};
    const existing = window.Store.getAttendanceByDateAndPrayer(this.currentDate, this.currentPrayer);
    existing.forEach(rec => {
      const normalized = window.Store.normalizeStatusCode ? window.Store.normalizeStatusCode(rec.status) : (rec.status || 'VAR');
      this.draftAttendance[rec.studentId] = {
        status: normalized
      };
    });
  },

  // Butona dokunulduğunda ANINDA OTOMATİK KAYIT
  setStatus(studentId, statusCode) {
    if (!this.draftAttendance[studentId]) {
      this.draftAttendance[studentId] = { status: 'VAR' };
    }
    this.draftAttendance[studentId].status = statusCode;

    // Otomatik Kayıt
    window.Store.saveSingleAttendance(
      studentId,
      this.currentDate,
      this.currentPrayer,
      statusCode,
      ''
    );

    this.showAutoSaveIndicator();
    this.renderStudentRows();
    this.renderSummary();
  },

  // Tüm Listeyi Tek Tıkla Var Yap ve Kaydet
  setAllStatus(statusCode = 'VAR') {
    const students = this.getFilteredStudents();
    const records = [];

    students.forEach(s => {
      this.draftAttendance[s.id] = { status: statusCode };
      records.push({
        studentId: s.id,
        date: this.currentDate,
        prayerTime: this.currentPrayer,
        status: statusCode,
        note: ''
      });
    });

    window.Store.saveAttendanceBatch(records);
    this.showAutoSaveIndicator();
    this.renderStudentRows();
    this.renderSummary();
    window.App.showToast(`${students.length} öğrenci "Var" olarak otomatik kaydedildi.`, 'success');
  },

  showAutoSaveIndicator() {
    const badge = document.getElementById('auto-save-badge');
    const text = document.getElementById('auto-save-text');
    if (badge && text) {
      badge.classList.remove('bg-slate-50', 'text-slate-600', 'border-slate-200');
      badge.classList.add('bg-emerald-100', 'text-emerald-800', 'border-emerald-300');
      text.innerHTML = '✓ Kaydedildi';

      clearTimeout(this._saveTimeout);
      this._saveTimeout = setTimeout(() => {
        if (badge && text) {
          badge.classList.remove('bg-emerald-100', 'text-emerald-800', 'border-emerald-300');
          badge.classList.add('bg-slate-50', 'text-slate-600', 'border-slate-200');
          text.innerHTML = 'Otomatik Kayıt';
        }
      }, 1300);
    }
  },

  getFilteredStudents() {
    let students = window.Store.getStudents();

    if (this.currentClass !== 'ALL') {
      students = students.filter(s => s.className === this.currentClass);
    }
    if (this.currentHoca !== 'ALL') {
      students = students.filter(s => s.etutHocasi === this.currentHoca || s.dahiliHoca === this.currentHoca);
    }
    if (this.searchQuery) {
      students = students.filter(s => 
        s.firstName.toLowerCase().includes(this.searchQuery) ||
        s.lastName.toLowerCase().includes(this.searchQuery) ||
        (s.className && s.className.toLowerCase().includes(this.searchQuery))
      );
    }

    return students;
  },

  renderView() {
    const container = document.getElementById('attendance-container');
    if (!container) return;

    const classes = window.Store.getClasses();
    const allHocalar = window.Store.getAllHocalar ? window.Store.getAllHocalar() : window.Store.getEtutHocalari();
    this.loadDailyDraft();

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in max-w-4xl mx-auto">
        <!-- 1. Üst Filtre & Namaz Vakti Paneli -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <!-- Üst Satır: Tarih & 5 Vakit Namaz Butonları -->
          <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-slate-800 uppercase tracking-wide">YOKLAMA TARİHİ & NAMAZ VAKTİ:</span>
                <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  ${this.currentPrayer} Namazı
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <input type="date" id="att-date-picker" value="${this.currentDate}" 
                  class="px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition shadow-2xs"
                  onchange="window.AttendanceModule.setDate(this.value)">

                <!-- 5 VAKİT NAMAZ BUTONLARI -->
                <div class="inline-flex flex-wrap p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1 shadow-inner">
                  ${this.prayerTimes.map(p => {
                    const isSelected = this.currentPrayer === p.name;
                    return `
                      <button type="button" onclick="window.AttendanceModule.setPrayer('${p.name}')"
                        class="px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                          isSelected 
                            ? 'bg-emerald-600 text-white shadow-md scale-105' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                        }">
                        <span>${p.icon}</span>
                        <span>${p.name}</span>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>

            <!-- Sağ Taraf: Tümünü Var Yap & Otomatik Kayıt Rozeti -->
            <div class="flex items-center gap-2">
              <button onclick="window.AttendanceModule.setAllStatus('VAR')" 
                title="Tüm listeyi Var olarak kaydeder"
                class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Tümünü Var Yap</span>
              </button>

              <div id="auto-save-badge" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition-all shadow-2xs">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span id="auto-save-text">Otomatik Kayıt</span>
              </div>
            </div>
          </div>

          <!-- Alt Satır: Sınıf Filtresi, Hoca Filtresi ve Arama -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">SINIF</label>
                <select id="att-class-picker" 
                  class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-2xs"
                  onchange="window.AttendanceModule.setClassFilter(this.value)">
                  <option value="ALL" ${this.currentClass === 'ALL' ? 'selected' : ''}>Tüm Sınıflar</option>
                  ${classes.map(c => `<option value="${c}" ${this.currentClass === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">HOCA / GRUP</label>
                <select id="att-hoca-picker" 
                  class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-2xs"
                  onchange="window.AttendanceModule.setHocaFilter(this.value)">
                  <option value="ALL">Tüm Hocalar</option>
                  ${allHocalar.map(h => `<option value="${h}" ${this.currentHoca === h ? 'selected' : ''}>${h}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ÖĞRENCİ ARA</label>
                <input type="text" placeholder="Öğrenci adı ara..." 
                  value="${this.searchQuery}"
                  class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:outline-none w-36 sm:w-44 shadow-2xs"
                  oninput="window.AttendanceModule.setSearchQuery(this.value)">
              </div>
            </div>

            <div class="text-xs text-slate-400">
              💡 <em>Butonlara dokunduğunuz an anında kaydedilir.</em>
            </div>
          </div>

          <!-- İstatistik Sayım Çubuğu (5 Durum) -->
          <div id="attendance-summary-bar" class="pt-2 border-t border-slate-100"></div>
        </div>

        <!-- 2. Öğrenci Yoklama Listesi (Hızlı Filtre ve Mazeret Kutusu Kaldırıldı) -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <!-- Başlık Satırı -->
          <div class="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span class="text-xs font-black text-slate-700 uppercase tracking-wider">Öğrenci Adı Soyadı</span>
            <span class="text-xs font-black text-slate-700 uppercase tracking-wider">Yoklama Durumu</span>
          </div>

          <!-- Öğrenci Listesi (Kelimeli Butonlar: Var, Yok, Geç, Takkesiz, İzinli) -->
          <div id="attendance-students-container" class="divide-y divide-slate-100 text-sm"></div>
        </div>
      </div>
    `;

    this.renderSummary();
    this.renderStudentRows();
  },

  renderSummary() {
    const summaryContainer = document.getElementById('attendance-summary-bar');
    if (!summaryContainer) return;

    const students = this.getFilteredStudents();
    const counts = { VAR: 0, YOK: 0, GEC: 0, TAKKESIZ: 0, IZINLI: 0 };

    students.forEach(s => {
      const draft = this.draftAttendance[s.id];
      const status = draft ? draft.status : 'VAR';
      if (counts[status] !== undefined) {
        counts[status]++;
      } else {
        counts.VAR++;
      }
    });

    summaryContainer.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        ${this.statuses.map(st => {
          return `
            <div class="px-3 py-2 rounded-xl border flex items-center justify-between transition-all" 
              style="background-color: ${st.bg}12; border-color: ${st.border}40;">
              <span class="text-xs font-black" style="color: ${st.border};">${st.label}</span>
              <span class="text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                ${counts[st.code] || 0}
              </span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderStudentRows() {
    const container = document.getElementById('attendance-students-container');
    if (!container) return;

    const students = this.getFilteredStudents();

    if (students.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 text-sm font-semibold">
          Filtreye uygun öğrenci bulunamadı.
        </div>
      `;
      return;
    }

    container.innerHTML = students.map(s => {
      const draft = this.draftAttendance[s.id] || { status: 'VAR' };
      const currentStatus = draft.status || 'VAR';

      return `
        <div class="p-3 sm:px-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <!-- 1. Öğrenci Bilgisi (Sadece İsim ve Sınıfı - No, hoca, aile kodu, oda no YOKTUR) -->
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">
              ${s.firstName} ${s.lastName}
            </span>
            <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] shrink-0">
              ${s.className}
            </span>
          </div>

          <!-- 2. Kelimeli Yoklama Butonları: Var, Yok, Geç, Takkesiz, İzinli -->
          <div class="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
            ${this.statuses.map(st => {
              const isSelected = currentStatus === st.code;
              return `
                <button type="button" 
                  onclick="window.AttendanceModule.setStatus('${s.id}', '${st.code}')"
                  class="flex-1 sm:flex-none py-2 px-2.5 sm:px-3 rounded-xl text-xs font-black transition-all ${
                    isSelected 
                      ? st.activeClass + ' scale-105' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                  }">
                  ${st.label}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }
};
