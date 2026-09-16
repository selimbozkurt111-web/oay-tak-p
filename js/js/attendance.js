/**
 * attendance.js - Yoklama & Namaz Raporlama Modülü
 * 1. Namaz Yoklaması (5 Vakit: Sabah, Öğle, İkindi, Akşam, Yatsı / Butonlar: Var, Yok, Geç, Takkesiz, İzinli)
 * 2. Namaz Raporları (Haftalık & Aylık Vakit İstatistikleri, Tüm Talebelerin Devam Çizelgesi ve Günlük Detay)
 * 3. Yatak Yoklaması (İyi, Orta, Kötü)
 * 4. Okul Dönüşü Yoklaması (Geldi, Geç, Gelmedi)
 */

window.AttendanceModule = {
  currentCategory: 'namaz', // 'namaz', 'namaz_rapor', 'yatak', 'okul_donusu'
  currentDate: new Date().toISOString().split('T')[0],
  currentPrayer: 'Sabah',
  selectedClasses: [], // Boş ise 'Tüm Sınıflar'
  currentHoca: 'ALL',
  searchQuery: '',
  draftAttendance: {},

  // Rapor Parametreleri
  reportPeriod: 'haftalik', // 'haftalik' | 'aylik'
  reportDate: new Date().toISOString().split('T')[0],
  reportModalStudentId: null,

  categories: [
    { id: 'namaz', label: 'Namaz Yoklaması', icon: '🕌', short: 'Namaz' },
    { id: 'namaz_rapor', label: 'Namaz Raporları', icon: '📊', short: 'Raporlar' },
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

  setCategory(category) {
    this.currentCategory = category;
    if (category !== 'namaz_rapor') {
      this.loadDailyDraft();
    }
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
    if (window.App && window.App.showToast) {
      window.App.showToast(`${this.currentPrayer} Namazı yoklaması seçildi.`, 'info');
    }
  },

  setDate(date) {
    this.currentDate = date;
    this.loadDailyDraft();
    this.renderView();
  },

  setReportPeriod(period) {
    this.reportPeriod = period;
    this.renderView();
  },

  setReportDate(date) {
    this.reportDate = date;
    this.renderView();
  },

  openStudentDetailModal(studentId) {
    this.reportModalStudentId = studentId;
    this.renderView();
  },

  closeStudentDetailModal() {
    this.reportModalStudentId = null;
    this.renderView();
  },

  getReportRange() {
    if (this.reportPeriod === 'haftalik') {
      return window.Store.getWeekRange(this.reportDate);
    } else {
      const ym = this.reportDate.substring(0, 7);
      return window.Store.getMonthRange(ym);
    }
  },

  getRateColor(rate) {
    if (rate >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (rate >= 75) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
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
    if (this.currentCategory === 'namaz_rapor') {
      this.renderView();
    } else {
      this.renderStudentRows();
      this.renderSummary();
    }
  },

  setSearchQuery(query) {
    this.searchQuery = query.toLowerCase().trim();
    if (this.currentCategory === 'namaz_rapor') {
      this.renderView();
    } else {
      this.renderStudentRows();
      this.renderSummary();
    }
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

    // 1. Durum: Namaz Raporları Ekranı (Haftalık & Aylık)
    if (this.currentCategory === 'namaz_rapor') {
      this.renderReportView(container);
      return;
    }

    // 2. Durum: Günlük Yoklama Alma Ekranı (Namaz, Yatak, Okul Dönüşü)
    this.renderDailyYoklamaView(container);
  },

  // --- 1. HAFTALIK & AYLIK NAMAZ RAPORLARI GÖRÜNÜMÜ (HOCALAR & YÖNETİCİ) ---
  renderReportView(container) {
    const range = this.getReportRange();
    const students = this.getFilteredStudents();
    const classes = window.Store.getClasses();
    const batch = window.Store.getPrayerReportBatch(students, range.dates);
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];

    // Toplam kılınan, takkesiz, yok sayıları
    let totalAttended = 0;
    let totalTakkesiz = 0;
    let totalYok = 0;
    let totalIzinli = 0;
    let totalSlots = 0;

    batch.reports.forEach(r => {
      totalAttended += r.attendedCount;
      totalTakkesiz += r.overallCounts.TAKKESIZ;
      totalYok += r.overallCounts.YOK;
      totalIzinli += r.overallCounts.IZINLI;
      totalSlots += r.totalSlots;
    });

    const isWeekly = this.reportPeriod === 'haftalik';
    const periodLabel = isWeekly 
      ? `Haftalık Rapor (${range.startDate} – ${range.endDate} • 7 Gün)` 
      : `Aylık Rapor (${range.startDate} – ${range.endDate} • ${range.dates.length} Gün)`;

    container.innerHTML = `
      <div class="space-y-5 animate-fade-in max-w-7xl mx-auto">
        <!-- 2. FİLTRE & PERİYOT KONTROL PANELİ -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <!-- Periyot Seçimi: Haftalık / Aylık & Tarih -->
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="text-xs font-black text-slate-800 uppercase tracking-wide">RAPOR PERİYODU:</span>
              
              <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1 shadow-inner">
                <button type="button" onclick="window.AttendanceModule.setReportPeriod('haftalik')"
                  class="py-1 px-3 rounded-lg text-xs font-black transition ${
                    isWeekly 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }">
                  📅 Haftalık Rapor
                </button>
                <button type="button" onclick="window.AttendanceModule.setReportPeriod('aylik')"
                  class="py-1 px-3 rounded-lg text-xs font-black transition ${
                    !isWeekly 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }">
                  🗓️ Aylık Rapor
                </button>
              </div>

              <!-- Tarih Seçici -->
              <div class="flex items-center gap-1.5">
                <input type="date" value="${this.reportDate}"
                  class="px-3 py-1.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition shadow-2xs"
                  onchange="window.AttendanceModule.setReportDate(this.value)">
                <span class="px-2.5 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200">
                  ${periodLabel}
                </span>
              </div>
            </div>

            <!-- Yazdır Butonu -->
            <div class="flex items-center gap-2">
              <button onclick="window.print()"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm">
                <span>🖨️ Raporu Yazdır / PDF</span>
              </button>
            </div>
          </div>

          <!-- Sınıf ve Arama Filtresi -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[11px] font-black text-slate-500 uppercase mr-1">SINIF FİLTRESİ:</span>
              <button type="button" onclick="window.AttendanceModule.toggleAllClasses()"
                class="px-3 py-1 rounded-xl text-xs font-black transition ${
                  this.selectedClasses.length === 0 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }">
                Tüm Sınıflar (${students.length})
              </button>
              ${classes.map(c => {
                const isChecked = this.selectedClasses.includes(c);
                return `
                  <button type="button" onclick="window.AttendanceModule.toggleClass('${c}')"
                    class="px-2.5 py-1 rounded-xl text-xs font-black transition border flex items-center gap-1 ${
                      isChecked 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }">
                    <span>${isChecked ? '✓' : '+'}</span>
                    <span>${c}</span>
                  </button>
                `;
              }).join('')}
            </div>

            <div class="w-full sm:w-56 relative">
              <input type="text" placeholder="Talebe ara..." 
                class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                oninput="window.AttendanceModule.setSearchQuery(this.value)">
              <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            </div>
          </div>
        </div>

        <!-- 3. ÖZET İSTATİSTİK KARTLARI (KPI & VAKİT DAĞILIMI) -->
        <div class="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          <!-- Genel Başarı Oranı -->
          <div class="col-span-2 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-md flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-emerald-100 uppercase tracking-wider">GENEL NAMAZ DEVAMI</span>
              <div class="text-3xl sm:text-4xl font-black mt-1">
                %${batch.classAverageRate}
              </div>
              <div class="text-[11px] text-emerald-100 mt-1">
                ${students.length} talebenin ${periodLabel.toLowerCase()}
              </div>
            </div>
            <div class="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-2xl font-black shadow-inner">
              🕌
            </div>
          </div>

          <!-- 5 Vakit Katılım Oranları -->
          <div class="col-span-2 lg:col-span-4 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div class="text-xs font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center justify-between">
              <span>Vakit Vakit Katılım Oranları</span>
              <span class="text-[10px] text-slate-400 font-normal">Kılınan / Toplam Vakitler</span>
            </div>
            <div class="grid grid-cols-5 gap-2 text-center">
              ${prayers.map(p => {
                const rate = batch.prayerRates[p] || 100;
                const icon = p === 'Sabah' ? '🌅' : (p === 'Öğle' ? '☀️' : (p === 'İkindi' ? '🌤️' : (p === 'Akşam' ? '🌇' : '🌙')));
                return `
                  <div class="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition">
                    <div class="text-base">${icon}</div>
                    <div class="text-[11px] font-black text-slate-700 mt-0.5">${p}</div>
                    <div class="text-xs sm:text-sm font-black text-emerald-700 mt-1">%${rate}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Sayaç Şeridi (Takkesiz, Yok, İzinli) -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-black text-slate-700 uppercase">Toplu Durum Sayaçları:</span>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 font-black">
              ✓ Kılınan: ${totalAttended} Vakit
            </span>
            <span class="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 border border-purple-300 font-black">
              🟣 Takkesiz: ${totalTakkesiz}
            </span>
            <span class="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 border border-rose-300 font-black">
              🔴 Namazda Yok: ${totalYok}
            </span>
            <span class="px-2.5 py-1 rounded-xl bg-teal-100 text-teal-800 border border-teal-300 font-bold">
              İzinli: ${totalIzinli}
            </span>
          </div>
        </div>

        <!-- 4. TÜM TALEBELERİN RAPOR TABLOSU -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div class="font-black text-xs sm:text-sm text-slate-800 flex items-center gap-2">
              <span>📋</span>
              <span>Tüm Talebelerin Namaz Devam Çizelgesi (${students.length} Talebe)</span>
            </div>
            <div class="text-xs text-slate-500 font-medium hidden sm:block">
              Detaylı gün gün durum için talebenin yanındaki <strong>"👁️ Detay"</strong> butonuna tıklayınız.
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr class="bg-slate-900 text-white text-xs border-b border-slate-800">
                  <th class="p-3.5 font-black w-48 sm:w-56 sticky left-0 bg-slate-900 z-10 shadow-r">
                    TALEBE BİLGİSİ
                  </th>
                  ${prayers.map(p => `
                    <th class="p-3 text-center font-black w-24 border-l border-slate-800">
                      ${p}
                    </th>
                  `).join('')}
                  <th class="p-3 text-center font-black w-36 border-l border-slate-800">
                    DURUM DAĞILIMI
                  </th>
                  <th class="p-3 text-center font-black w-28 border-l border-slate-800 bg-slate-950 text-emerald-400">
                    DEVAM %
                  </th>
                  <th class="p-3 text-center font-black w-28 border-l border-slate-800">
                    GÜNLÜK DETAY
                  </th>
                </tr>
              </thead>

              <tbody class="divide-y divide-slate-100 text-xs">
                ${students.length === 0 ? `
                  <tr>
                    <td colspan="9" class="p-10 text-center text-slate-400">
                      Seçilen kriterlere uygun talebe bulunamadı.
                    </td>
                  </tr>
                ` : students.map((st, idx) => {
                  const rep = window.Store.getPrayerReportForStudent(st.id, range.dates);
                  const rateColor = this.getRateColor(rep.attendanceRate);

                  return `
                    <tr class="hover:bg-slate-50/80 transition">
                      <!-- Talebe -->
                      <td class="p-3 sm:p-3.5 sticky left-0 bg-white hover:bg-slate-50 z-10 shadow-r">
                        <div class="flex items-center gap-2.5">
                          <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-[10px] flex items-center justify-center shrink-0">
                            ${idx + 1}
                          </span>
                          <div class="truncate">
                            <div class="font-black text-slate-900 text-xs sm:text-sm truncate">
                              ${st.firstName} ${st.lastName}
                            </div>
                            <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span class="font-bold text-slate-500">${st.className || '-'}</span>
                              <span>•</span>
                              <span class="font-mono">No: ${st.studentNo}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- 5 Vakit Sayıları (Katılım / Toplam) -->
                      ${prayers.map(p => {
                        const pData = rep.prayerStats[p];
                        const attended = pData.VAR + pData.TAKKESIZ + pData.GEC;
                        const totalDay = range.dates.length - pData.IZINLI;
                        const pRate = totalDay > 0 ? Math.round((attended / totalDay) * 100) : 100;
                        const col = pRate >= 90 ? 'text-emerald-700' : (pRate >= 75 ? 'text-amber-700' : 'text-rose-700');

                        return `
                          <td class="p-2.5 text-center border-l border-slate-100">
                            <div class="font-black ${col}">${attended} / ${totalDay}</div>
                            <div class="text-[10px] text-slate-400 font-bold">%${pRate}</div>
                          </td>
                        `;
                      }).join('')}

                      <!-- Durum Dağılımı -->
                      <td class="p-2.5 text-center border-l border-slate-100">
                        <div class="flex items-center justify-center gap-1 text-[11px]">
                          <span class="text-emerald-700 font-black" title="Var">${rep.overallCounts.VAR}V</span>
                          <span class="text-purple-700 font-black" title="Takkesiz">${rep.overallCounts.TAKKESIZ}T</span>
                          <span class="text-amber-600 font-black" title="Geç">${rep.overallCounts.GEC}G</span>
                          <span class="text-rose-600 font-black" title="Yok">${rep.overallCounts.YOK}Y</span>
                        </div>
                      </td>

                      <!-- Devam Yüzdesi -->
                      <td class="p-2.5 text-center border-l border-slate-100 bg-slate-50/50">
                        <span class="px-2.5 py-1 rounded-xl font-black text-xs border ${rateColor} shadow-2xs">
                          %${rep.attendanceRate}
                        </span>
                      </td>

                      <!-- Günlük Detay Butonu -->
                      <td class="p-2.5 text-center border-l border-slate-100">
                        <button type="button" onclick="window.AttendanceModule.openStudentDetailModal('${st.id}')"
                          class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] rounded-xl transition shadow-2xs">
                          👁️ Detay
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 5. ÖĞRENCİ GÜNLÜK 5 VAKİT DETAY MODALI -->
      ${this.renderStudentDetailModal(range)}
    `;
  },

  // Modal: Seçilen Öğrencinin Gün Gün 5 Vakit Namaz Durumu
  renderStudentDetailModal(range) {
    if (!this.reportModalStudentId) return '';

    const st = window.Store.getStudentById(this.reportModalStudentId);
    if (!st) return '';

    const rep = window.Store.getPrayerReportForStudent(st.id, range.dates);
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];

    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          <!-- Modal Başlığı -->
          <div class="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
                🕌
              </div>
              <div>
                <h3 class="font-black text-base text-white leading-tight">
                  ${st.firstName} ${st.lastName}
                </h3>
                <p class="text-xs text-slate-300 mt-0.5">
                  ${st.className} • No: ${st.studentNo} • ${this.reportPeriod === 'haftalik' ? 'Haftalık 5 Vakit Detayı' : 'Aylık 5 Vakit Detayı'}
                </p>
              </div>
            </div>
            <button onclick="window.AttendanceModule.closeStudentDetailModal()" 
              class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-base font-bold transition">
              ✕
            </button>
          </div>

          <!-- Modal İstatistik Özeti -->
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-600">Devam Başarısı:</span>
              <span class="px-2.5 py-0.5 rounded-lg font-black text-xs border ${this.getRateColor(rep.attendanceRate)}">
                %${rep.attendanceRate}
              </span>
            </div>
            <div class="flex items-center gap-2 text-[11px]">
              <span class="text-emerald-700 font-bold">${rep.overallCounts.VAR} Var</span> •
              <span class="text-purple-700 font-bold">${rep.overallCounts.TAKKESIZ} Takkesiz</span> •
              <span class="text-amber-600 font-bold">${rep.overallCounts.GEC} Geç</span> •
              <span class="text-rose-600 font-bold">${rep.overallCounts.YOK} Yok</span>
            </div>
          </div>

          <!-- Gün Gün 5 Vakit Tablosu -->
          <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                    <th class="p-2.5">TARİH & GÜN</th>
                    ${prayers.map(p => `<th class="p-2.5 text-center">${p}</th>`).join('')}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${range.dates.map(dStr => {
                    const dayName = this.getDayName(dStr);
                    return `
                      <tr class="hover:bg-slate-50">
                        <td class="p-2.5 font-bold text-slate-800">
                          <div>${dStr}</div>
                          <div class="text-[10px] text-slate-400">${dayName}</div>
                        </td>
                        ${prayers.map(p => {
                          const stCode = rep.grid[dStr] ? rep.grid[dStr][p] : 'VAR';
                          const cfg = window.STATUS_CONFIG[stCode] || window.STATUS_CONFIG['VAR'];
                          return `
                            <td class="p-2 text-center">
                              <span class="px-2 py-1 rounded-lg text-white font-black text-[10px] inline-block shadow-2xs"
                                style="background-color: ${cfg.bg};">
                                ${cfg.label}
                              </span>
                            </td>
                          `;
                        }).join('')}
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Modal Alt Kapat Butonu -->
          <div class="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button onclick="window.AttendanceModule.closeStudentDetailModal()" 
              class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition">
              Kapat
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // --- 2. GÜNLÜK YOKLAMA ALMA GÖRÜNÜMÜ ---
  renderDailyYoklamaView(container) {
    const classes = window.Store.getClasses();
    const dayName = this.getDayName(this.currentDate);
    this.loadDailyDraft();

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in max-w-4xl mx-auto">
        <!-- 2. Filtre & Kontrol Kartı -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <!-- Üst Satır: Tarih & Gün Adı & 5 Vakit Namaz Butonları -->
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
                <input type="date" id="att-date-picker" value="${this.currentDate}" 
                  class="px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition shadow-2xs"
                  onchange="window.AttendanceModule.setDate(this.value)">

                <div class="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs">
                  <span>📅</span>
                  <span>${dayName}</span>
                </div>

                ${this.currentCategory === 'namaz' ? `
                  <div class="inline-flex flex-wrap p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1 shadow-inner">
                    ${this.prayerTimes.map(p => {
                      const isSelected = this.currentPrayer === p.name;
                      return `
                        <button type="button" onclick="window.AttendanceModule.setPrayer('${p.name}')"
                          class="py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                            isSelected 
                              ? 'bg-emerald-600 text-white shadow-md scale-102 ring-2 ring-emerald-400' 
                              : 'bg-white text-slate-700 hover:bg-slate-200'
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

          <!-- Alt Satır: Çoklu Sınıf Filtresi & Arama -->
          <div class="space-y-3 pt-1">
            <div>
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>SINIF FİLTRESİ (1'den Fazla Seçebilirsiniz):</span>
                ${this.selectedClasses.length > 0 ? `
                  <span class="text-emerald-600 font-semibold cursor-pointer hover:underline" onclick="window.AttendanceModule.toggleAllClasses()">
                    Filtreyi Temizle
                  </span>
                ` : ''}
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="window.AttendanceModule.toggleAllClasses()"
                  class="px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    this.selectedClasses.length === 0 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }">
                  Tüm Sınıflar
                </button>
                ${classes.map(c => {
                  const isChecked = this.selectedClasses.includes(c);
                  return `
                    <button type="button" onclick="window.AttendanceModule.toggleClass('${c}')"
                      class="px-3 py-1.5 rounded-xl text-xs font-black transition border flex items-center gap-1.5 ${
                        isChecked 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }">
                      <span>${isChecked ? '✓' : '+'}</span>
                      <span>${c}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ÖĞRENCİ ARA</label>
                <input type="text" placeholder="${this.currentCategory === 'yatak' ? 'İsim veya Oda ara...' : 'Öğrenci adı ara...'}" 
                  value="${this.searchQuery}"
                  class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:outline-none w-48 sm:w-64 shadow-2xs"
                  oninput="window.AttendanceModule.setSearchQuery(this.value)">
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
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="font-black text-slate-600 mr-1 uppercase text-[11px]">Durum Özeti:</span>
        ${currentStatuses.map(st => `
          <div class="px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 border shadow-2xs"
            style="background-color: ${st.bg}15; color: ${st.bg}; border-color: ${st.border}30;">
            <span>${st.label}:</span>
            <span class="font-black">${counts[st.code] || 0}</span>
          </div>
        `).join('')}
        <span class="text-slate-400 font-bold ml-auto text-[11px]">Toplam: ${students.length} Öğrenci</span>
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
          <!-- 1. Öğrenci Bilgisi -->
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
