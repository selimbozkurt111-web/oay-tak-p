/**
 * attendance.js - 3 Alt Başlıklı Yoklama Sistemi:
 * 1. Namaz Yoklaması (5 Vakit: Sabah, Öğle, İkindi, Akşam, Yatsı / Butonlar: Var, Yok, Geç, Takkesiz, İzinli)
 * 2. Yatak Yoklaması (Butonlar: İyi, Orta, Kötü)
 * 3. Okul Dönüşü Yoklaması (Butonlar: Geldi, Geç, Gelmedi)
 * (Gün Adı Gösterimi, Çoklu Sınıf Seçimi, Anında Otomatik Kayıt)
 */

window.AttendanceModule = {
  currentCategory: 'namaz', // 'namaz', 'yatak', 'okul_donusu'
  currentDate: new Date().toISOString().split('T')[0],
  currentPrayer: 'Sabah',
  selectedClasses: [], // Boş ise 'Tüm Sınıflar', 1 veya birden fazla sınıf içerebilir
  currentHoca: 'ALL',
  searchQuery: '',
  draftAttendance: {},

  categories: [
    { id: 'namaz', label: 'Namaz Yoklaması', icon: '🕌', short: 'Namaz' },
    { id: 'yatak', label: 'Yatak Yoklaması', icon: '🛏️', short: 'Yatak' },
    { id: 'okul_donusu', label: 'Okul Dönüşü', icon: '🎒', short: 'Okul Dönüşü' }
  ],

  prayerTimes: [
    { name: 'Sabah', icon: '🌅', label: 'Sabah Namazı' },
    { name: 'Öğle', icon: '☀️', label: 'Öğle Namazı' },
    { name: 'İkindi', icon: '🌤️', label: 'İkindi Namazı' },
    { name: 'Akşam', icon: '🌇', label: 'Akşam Namazı' },
    { name: 'Yatsı', icon: '🌙', label: 'Yatsı Namazı' }
  ],

  // Kategoriye Göre Yoklama Durum Kodları ve Renkleri
  statusConfigs: {
    namaz: [
      { code: 'VAR', label: 'Var', bg: '#10b981', border: '#059669', activeClass: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300' },
      { code: 'YOK', label: 'Yok', bg: '#ef4444', border: '#dc2626', activeClass: 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300' },
      { code: 'GEC', label: 'Geç', bg: '#f59e0b', border: '#d97706', activeClass: 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300' },
      { code: 'TAKKESIZ', label: 'Takkesiz', bg: '#9333ea', border: '#7e22ce', activeClass: 'bg-purple-700 text-white shadow-md ring-2 ring-purple-300' },
      { code: 'IZINLI', label: 'İzinli', bg: '#0d9488', border: '#0f766e', activeClass: 'bg-teal-600 text-white shadow-md ring-2 ring-teal-300' }
    ],
    yatak: [
      { code: 'IYI', label: 'İyi', bg: '#10b981', border: '#059669', activeClass: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300' },
      { code: 'ORTA', label: 'Orta', bg: '#f59e0b', border: '#d97706', activeClass: 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300' },
      { code: 'KOTU', label: 'Kötü', bg: '#ef4444', border: '#dc2626', activeClass: 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300' }
    ],
    okul_donusu: [
      { code: 'GELDI', label: 'Geldi', bg: '#10b981', border: '#059669', activeClass: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300' },
      { code: 'GEC', label: 'Geç', bg: '#f59e0b', border: '#d97706', activeClass: 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300' },
      { code: 'GELMEDI', label: 'Gelmedi', bg: '#ef4444', border: '#dc2626', activeClass: 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300' }
    ]
  },

  init() {
    const hour = new Date().getHours();
    if (hour < 11) this.currentPrayer = 'Sabah';
    else if (hour < 15) this.currentPrayer = 'Öğle';
    else if (hour < 18) this.currentPrayer = 'İkindi';
    else if (hour < 21) this.currentPrayer = 'Akşam';
    else this.currentPrayer = 'Yatsı';

    this.renderView();
  },

  // Yoklama Başlığı Değiştirme (Namaz, Yatak, Okul Dönüşü)
  setCategory(category) {
    this.currentCategory = category;
    this.loadDailyDraft();
    this.renderView();
  },

  getDayName(dateStr) {
    if (!dateStr) return '';
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return '';
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return days[d.getDay()] || '';
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

  // Çoklu Sınıf Seçimi
  toggleClass(className) {
    if (this.selectedClasses.includes(className)) {
      this.selectedClasses = this.selectedClasses.filter(c => c !== className);
    } else {
      this.selectedClasses.push(className);
    }
    this.renderView();
  },

  toggleAllClasses() {
    this.selectedClasses = [];
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

  getDefaultStatus() {
    if (this.currentCategory === 'namaz') return 'VAR';
    if (this.currentCategory === 'yatak') return 'IYI';
    if (this.currentCategory === 'okul_donusu') return 'GELDI';
    return 'VAR';
  },

  loadDailyDraft() {
    this.draftAttendance = {};
    const subKey = this.currentCategory === 'namaz' ? this.currentPrayer : this.currentCategory;
    const existing = window.Store.getAttendanceByCategory 
      ? window.Store.getAttendanceByCategory(this.currentDate, this.currentCategory, subKey)
      : window.Store.getAttendanceByDateAndPrayer(this.currentDate, this.currentPrayer);

    existing.forEach(rec => {
      const normalized = window.Store.normalizeStatusCode ? window.Store.normalizeStatusCode(rec.status) : rec.status;
      this.draftAttendance[rec.studentId] = {
        status: normalized
      };
    });
  },

  // Butona dokunulduğunda ANINDA OTOMATİK KAYIT
  setStatus(studentId, statusCode) {
    if (!this.draftAttendance[studentId]) {
      this.draftAttendance[studentId] = { status: this.getDefaultStatus() };
    }
    this.draftAttendance[studentId].status = statusCode;

    const subKey = this.currentCategory === 'namaz' ? this.currentPrayer : this.currentCategory;

    // Anında Otomatik Kayıt
    window.Store.saveSingleAttendance(
      studentId,
      this.currentDate,
      subKey,
      statusCode,
      this.currentCategory
    );

    this.renderStudentRows();
    this.renderSummary();
  },

  getFilteredStudents() {
    let students = window.Store.getStudents();

    if (this.selectedClasses && this.selectedClasses.length > 0) {
      students = students.filter(s => this.selectedClasses.includes(s.className));
    }

    if (this.currentHoca !== 'ALL') {
      students = students.filter(s => s.etutHocasi === this.currentHoca || s.dahiliHoca === this.currentHoca);
    }

    if (this.searchQuery) {
      students = students.filter(s => 
        s.firstName.toLowerCase().includes(this.searchQuery) ||
        s.lastName.toLowerCase().includes(this.searchQuery) ||
        (s.className && s.className.toLowerCase().includes(this.searchQuery)) ||
        (s.yatakhane && s.yatakhane.toLowerCase().includes(this.searchQuery))
      );
    }

    return students;
  },

  renderView() {
    const container = document.getElementById('attendance-container');
    if (!container) return;

    const classes = window.Store.getClasses();
    const allHocalar = window.Store.getAllHocalar ? window.Store.getAllHocalar() : window.Store.getEtutHocalari();
    const dayName = this.getDayName(this.currentDate);
    this.loadDailyDraft();

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in max-w-4xl mx-auto">
        <!-- 1. ÜÇ ANA YOKLAMA ALT BAŞLIĞI (Namaz, Yatak, Okul Dönüşü) -->
        <div class="flex items-center gap-2 p-1.5 bg-slate-200/90 rounded-2xl max-w-lg mx-auto shadow-inner">
          ${this.categories.map(cat => {
            const isActive = this.currentCategory === cat.id;
            return `
              <button type="button" onclick="window.AttendanceModule.setCategory('${cat.id}')"
                class="flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  isActive 
                    ? 'bg-white text-slate-900 shadow-md scale-102 ring-2 ring-emerald-500/30' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }">
                <span>${cat.icon}</span>
                <span>${cat.label}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- 2. Filtre & Kontrol Kartı -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <!-- Üst Satır: Tarih & Gün Adı & (Varsa) 5 Vakit Namaz Butonları -->
          <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-slate-800 uppercase tracking-wide">
                  ${this.currentCategory === 'namaz' ? 'YOKLAMA TARİHİ & NAMAZ VAKTİ:' : (this.currentCategory === 'yatak' ? 'YATAK YOKLAMA TARİHİ:' : 'OKUL DÖNÜŞÜ TARİHİ:')}
                </span>
                ${this.currentCategory === 'namaz' ? `
                  <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    ${this.currentPrayer} Namazı
                  </span>
                ` : ''}
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <!-- Tarih Seçici -->
                <input type="date" id="att-date-picker" value="${this.currentDate}" 
                  class="px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition shadow-2xs"
                  onchange="window.AttendanceModule.setDate(this.value)">

                <!-- Gün Adı Rozeti -->
                <div class="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs">
                  <span>📅</span>
                  <span>${dayName}</span>
                </div>

                <!-- Sadece Namaz Yoklamasında: 5 VAKİT NAMAZ BUTONLARI -->
                ${this.currentCategory === 'namaz' ? `
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
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Alt Satır: ÇOKLU SINIF SEÇİMİ, Hoca Filtresi ve Arama -->
          <div class="space-y-3">
            <!-- ÇOKLU SINIF SEÇİM BUTONLARI -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-wide">
                  SINIF SEÇİMİ (Birden Fazla Seçebilirsiniz):
                </label>
                ${this.selectedClasses.length > 0 ? `
                  <span class="text-[11px] font-bold text-emerald-700">
                    Seçili: ${this.selectedClasses.join(', ')}
                  </span>
                ` : ''}
              </div>

              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="window.AttendanceModule.toggleAllClasses()"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    this.selectedClasses.length === 0 
                      ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-400' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }">
                  Tüm Sınıflar
                </button>

                ${classes.map(c => {
                  const isSelected = this.selectedClasses.includes(c);
                  return `
                    <button type="button" onclick="window.AttendanceModule.toggleClass('${c}')"
                      class="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                        isSelected 
                          ? 'bg-emerald-600 text-white shadow-sm scale-105 ring-2 ring-emerald-300' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }">
                      <span>${isSelected ? '✓ ' : ''}${c}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Hoca Filtresi & Öğrenci Arama -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div class="flex flex-wrap items-center gap-2.5">
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
                  <input type="text" placeholder="${this.currentCategory === 'yatak' ? 'İsim veya Oda ara...' : 'Öğrenci adı ara...'}" 
                    value="${this.searchQuery}"
                    class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:outline-none w-36 sm:w-44 shadow-2xs"
                    oninput="window.AttendanceModule.setSearchQuery(this.value)">
                </div>
              </div>

              <div class="text-xs text-slate-400">
                💡 <em>Dokunduğunuz an yoklama anında kaydedilir.</em>
              </div>
            </div>
          </div>

          <!-- Aktif Kategori İstatistik Özeti -->
          <div id="attendance-summary-bar" class="pt-2 border-t border-slate-100"></div>
        </div>

        <!-- 3. Öğrenci Yoklama Listesi -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span class="text-xs font-black text-slate-700 uppercase tracking-wider">
              ${this.currentCategory === 'yatak' ? 'Öğrenci & Oda Bilgisi' : 'Öğrenci Adı Soyadı'}
            </span>
            <span class="text-xs font-black text-slate-700 uppercase tracking-wider">
              ${this.currentCategory === 'namaz' ? 'Namaz Durumu' : (this.currentCategory === 'yatak' ? 'Yatak Durumu' : 'Dönüş Durumu')}
            </span>
          </div>

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
    const currentStatuses = this.statusConfigs[this.currentCategory] || this.statusConfigs.namaz;
    const counts = {};
    currentStatuses.forEach(st => { counts[st.code] = 0; });

    const defaultStatus = this.getDefaultStatus();

    students.forEach(s => {
      const draft = this.draftAttendance[s.id];
      const status = draft ? draft.status : defaultStatus;
      if (counts[status] !== undefined) {
        counts[status]++;
      } else {
        counts[defaultStatus] = (counts[defaultStatus] || 0) + 1;
      }
    });

    summaryContainer.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-${currentStatuses.length} gap-2 pt-1">
        ${currentStatuses.map(st => {
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
    const currentStatuses = this.statusConfigs[this.currentCategory] || this.statusConfigs.namaz;
    const defaultStatus = this.getDefaultStatus();

    if (students.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 text-sm font-semibold">
          Filtreye uygun öğrenci bulunamadı.
        </div>
      `;
      return;
    }

    container.innerHTML = students.map(s => {
      const draft = this.draftAttendance[s.id] || { status: defaultStatus };
      const currentStatus = draft.status || defaultStatus;

      return `
        <div class="p-3 sm:px-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <!-- 1. Öğrenci Bilgisi (Yatak yoklamasında oda no görünür, diğerlerinde sade) -->
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">
                ${s.firstName} ${s.lastName}
              </span>
              <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] shrink-0">
                ${s.className}
              </span>
            </div>
            ${this.currentCategory === 'yatak' && s.yatakhane ? `
              <div class="text-[11px] text-indigo-700 font-bold mt-0.5">
                🛏️ ${s.yatakhane}
              </div>
            ` : ''}
          </div>

          <!-- 2. Kategoriye Özel Kelimeli Butonlar -->
          <div class="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
            ${currentStatuses.map(st => {
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
