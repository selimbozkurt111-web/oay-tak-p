/**
 * attendance.js - 5 Vakit Namaz Yoklaması, Otomatik Kayıt & Hızlı Durum Filtreleri
 */

window.AttendanceModule = {
  currentDate: new Date().toISOString().split('T')[0],
  currentPrayer: 'Sabah',
  currentClass: 'ALL',
  currentHoca: 'ALL',
  statusFilter: 'ALL', // 'ALL', 'T', 'Y', 'V', 'G', 'E', 'K', 'I'
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
    window.App.showToast(`${this.currentPrayer} Namazı yoklaması yüklendi.`, 'info');
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
    this.renderStatusFilterBar();
    this.renderStudentRows();
    this.renderSummary();
  },

  setStatusFilter(statusCode) {
    if (this.statusFilter === statusCode && statusCode !== 'ALL') {
      this.statusFilter = 'ALL';
    } else {
      this.statusFilter = statusCode;
    }
    this.renderStatusFilterBar();
    this.renderStudentRows();
    this.renderSummary();
  },

  setSearchQuery(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.renderStatusFilterBar();
    this.renderStudentRows();
    this.renderSummary();
  },

  loadDailyDraft() {
    this.draftAttendance = {};
    const existing = window.Store.getAttendanceByDateAndPrayer(this.currentDate, this.currentPrayer);
    existing.forEach(rec => {
      this.draftAttendance[rec.studentId] = {
        status: rec.status,
        note: rec.note || ''
      };
    });
  },

  // Tekil Öğrenci Durumu Değiştirildiğinde ANINDA OTOMATİK KAYIT
  setStatus(studentId, statusCode) {
    if (!this.draftAttendance[studentId]) {
      this.draftAttendance[studentId] = { status: 'V', note: '' };
    }
    this.draftAttendance[studentId].status = statusCode;

    // Otomatik Anında Kayıt
    window.Store.saveSingleAttendance(
      studentId,
      this.currentDate,
      this.currentPrayer,
      statusCode,
      this.draftAttendance[studentId].note || ''
    );

    this.showAutoSaveIndicator();
    this.renderStudentRows();
    this.renderSummary();
    this.renderStatusFilterBar();
  },

  // Not Girildiğinde ANINDA OTOMATİK KAYIT
  setNote(studentId, note) {
    if (!this.draftAttendance[studentId]) {
      this.draftAttendance[studentId] = { status: 'V', note: '' };
    }
    this.draftAttendance[studentId].note = note;

    window.Store.saveSingleAttendance(
      studentId,
      this.currentDate,
      this.currentPrayer,
      this.draftAttendance[studentId].status || 'V',
      note
    );

    this.showAutoSaveIndicator();
  },

  // Tüm Listeyi Tek Tıkla Var Yap ve Anında Kaydet
  setAllStatus(statusCode) {
    const students = this.getFilteredStudents(false);
    const records = [];

    students.forEach(s => {
      const existingNote = this.draftAttendance[s.id] ? this.draftAttendance[s.id].note : '';
      this.draftAttendance[s.id] = { status: statusCode, note: existingNote };
      records.push({
        studentId: s.id,
        date: this.currentDate,
        prayerTime: this.currentPrayer,
        status: statusCode,
        note: existingNote
      });
    });

    window.Store.saveAttendanceBatch(records);
    this.showAutoSaveIndicator();
    this.renderStudentRows();
    this.renderSummary();
    this.renderStatusFilterBar();
    window.App.showToast(`${students.length} öğrenci "${window.STATUS_CONFIG[statusCode].label}" olarak otomatik kaydedildi.`, 'success');
  },

  showAutoSaveIndicator() {
    const badge = document.getElementById('auto-save-badge');
    const text = document.getElementById('auto-save-text');
    if (badge && text) {
      badge.classList.remove('bg-slate-50', 'text-slate-600', 'border-slate-200');
      badge.classList.add('bg-emerald-100', 'text-emerald-800', 'border-emerald-300');
      text.innerHTML = '✓ Otomatik Kaydedildi';

      clearTimeout(this._saveTimeout);
      this._saveTimeout = setTimeout(() => {
        if (badge && text) {
          badge.classList.remove('bg-emerald-100', 'text-emerald-800', 'border-emerald-300');
          badge.classList.add('bg-slate-50', 'text-slate-600', 'border-slate-200');
          text.innerHTML = 'Otomatik Kayıt Aktif';
        }
      }, 1400);
    }
  },

  getFilteredStudents(applyStatusFilter = true) {
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
        s.studentNo.toString().includes(this.searchQuery) ||
        (s.familyCode && s.familyCode.toLowerCase().includes(this.searchQuery)) ||
        (s.yatakhane && s.yatakhane.toLowerCase().includes(this.searchQuery))
      );
    }

    if (applyStatusFilter && this.statusFilter !== 'ALL') {
      students = students.filter(s => {
        const draft = this.draftAttendance[s.id];
        const status = draft ? draft.status : 'V';
        return status === this.statusFilter;
      });
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
      <div class="space-y-5 animate-fade-in">
        <!-- 1. Üst Filtre Paneli: Tarih, 5 Vakit Namaz, Sınıf ve Hoca Filtresi -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-5">
          <!-- Üst Satır: Tarih & 5 Vakit Namaz Butonları -->
          <div class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-slate-800 uppercase tracking-wide">YOKLAMA TARİHİ & NAMAZ VAKTİ</span>
                <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  ${this.currentPrayer} Namazı
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <input type="date" id="att-date-picker" value="${this.currentDate}" 
                  class="px-3.5 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition shadow-2xs"
                  onchange="window.AttendanceModule.setDate(this.value)">

                <!-- 5 VAKİT NAMAZ BUTONLARI -->
                <div class="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1 shadow-inner">
                  ${this.prayerTimes.map(p => {
                    const isSelected = this.currentPrayer === p.name;
                    return `
                      <button type="button" onclick="window.AttendanceModule.setPrayer('${p.name}')"
                        class="px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
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

            <!-- Sağ Taraf: Hızlı İşlem ve Otomatik Kayıt Durum Göstergesi (Kaydet Butonu KALDIRILDI) -->
            <div class="flex items-center gap-3">
              <button onclick="window.AttendanceModule.setAllStatus('V')" 
                title="Listelenen tüm öğrencileri Var olarak işaretler ve kaydeder"
                class="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-2xs">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Tümünü Var (V) Yap</span>
              </button>

              <!-- Otomatik Kayıt Bildirim Rozeti -->
              <div id="auto-save-badge" class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2 transition-all shadow-2xs">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span id="auto-save-text">Otomatik Kayıt Aktif</span>
              </div>
            </div>
          </div>

          <!-- Alt Satır: Sınıf Filtresi, Hoca Filtresi ve Arama -->
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex flex-wrap items-center gap-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1 uppercase">SINIF FİLTRESİ</label>
                <select id="att-class-picker" 
                  class="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-2xs"
                  onchange="window.AttendanceModule.setClassFilter(this.value)">
                  <option value="ALL" ${this.currentClass === 'ALL' ? 'selected' : ''}>Tüm Sınıflar (66 Öğrenci)</option>
                  ${classes.map(c => `<option value="${c}" ${this.currentClass === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1 uppercase">HOCA / GRUP FİLTRESİ</label>
                <select id="att-hoca-picker" 
                  class="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-2xs"
                  onchange="window.AttendanceModule.setHocaFilter(this.value)">
                  <option value="ALL">Tüm Hocalar</option>
                  ${allHocalar.map(h => `<option value="${h}" ${this.currentHoca === h ? 'selected' : ''}>${h}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1 uppercase">ÖĞRENCİ ARA</label>
                <input type="text" placeholder="İsim, No veya Oda..." 
                  value="${this.searchQuery}"
                  class="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:outline-none w-48 shadow-2xs"
                  oninput="window.AttendanceModule.setSearchQuery(this.value)">
              </div>
            </div>

            <div class="text-right text-[11px] text-slate-400">
              💡 <em>Herhangi bir butona bastığınızda yoklama anında hafızaya kaydedilir.</em>
            </div>
          </div>

          <!-- İstatistik Çubuğu (Tıklanarak da Filtrelenebilir) -->
          <div id="attendance-summary-bar" class="pt-2 border-t border-slate-100"></div>
        </div>

        <!-- 2. Hızlı Durum Filtreleme Barı ("Tümü", "Takkesiz", "Namazda Yok") & Öğrenci Tablosu -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <!-- Durum Filtre Butonları Barı -->
          <div id="status-filter-container" class="bg-slate-50 border-b border-slate-200 p-4"></div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  <th class="py-3 px-4 w-16 text-center">No</th>
                  <th class="py-3 px-4">Öğrenci Adı</th>
                  <th class="py-3 px-4">Sınıf & Hocası</th>
                  <th class="py-3 px-4">Yatakhane</th>
                  <th class="py-3 px-4 text-center">Yoklama Durumu (V, T, Y, G, E, K, İ)</th>
                  <th class="py-3 px-4 w-60">Öğretmen Notu</th>
                </tr>
              </thead>
              <tbody id="attendance-students-tbody" class="divide-y divide-slate-100 text-sm"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.renderSummary();
    this.renderStatusFilterBar();
    this.renderStudentRows();
  },

  // Hızlı Durum Filtre Butonları ("Tümü", "Takkesiz (T)", "Namazda Yok (Y)")
  renderStatusFilterBar() {
    const container = document.getElementById('status-filter-container');
    if (!container) return;

    const baseStudents = this.getFilteredStudents(false); // Sınıf, hoca ve arama filtreli öğrenciler
    const displayedStudents = this.getFilteredStudents(true); // Durum filtresi uygulanmış öğrenciler

    let takkesizCount = 0;
    let namazdaYokCount = 0;

    baseStudents.forEach(s => {
      const draft = this.draftAttendance[s.id];
      const st = draft ? draft.status : 'V';
      if (st === 'T') takkesizCount++;
      if (st === 'Y') namazdaYokCount++;
    });

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-black text-slate-700 uppercase tracking-wide mr-1">HIZLI FİLTRE:</span>

          <!-- TÜMÜ BUTONU -->
          <button type="button" onclick="window.AttendanceModule.setStatusFilter('ALL')"
            class="px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              this.statusFilter === 'ALL' 
                ? 'bg-slate-900 text-white shadow-md scale-105 ring-2 ring-slate-400 ring-offset-1' 
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }">
            <span>👥 Tümü</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] ${this.statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}">${baseStudents.length}</span>
          </button>

          <!-- TAKKESİZ BUTONU -->
          <button type="button" onclick="window.AttendanceModule.setStatusFilter('T')"
            class="px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              this.statusFilter === 'T' 
                ? 'bg-purple-700 text-white shadow-md scale-105 ring-2 ring-purple-400 ring-offset-1' 
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }">
            <span class="w-2.5 h-2.5 rounded-full ${this.statusFilter === 'T' ? 'bg-white' : 'bg-purple-600'}"></span>
            <span>Takkesiz (T)</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] ${this.statusFilter === 'T' ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-900'}">${takkesizCount}</span>
          </button>

          <!-- NAMAZDA YOK BUTONU -->
          <button type="button" onclick="window.AttendanceModule.setStatusFilter('Y')"
            class="px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              this.statusFilter === 'Y' 
                ? 'bg-rose-900 text-white shadow-md scale-105 ring-2 ring-rose-400 ring-offset-1' 
                : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200'
            }">
            <span class="w-2.5 h-2.5 rounded-full ${this.statusFilter === 'Y' ? 'bg-white' : 'bg-rose-700'}"></span>
            <span>Namazda Yok (Y)</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] ${this.statusFilter === 'Y' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-900'}">${namazdaYokCount}</span>
          </button>
        </div>

        <!-- Aktif Filtre Durumu ve Temizle Butonu -->
        ${this.statusFilter !== 'ALL' ? `
          <div class="flex items-center gap-2 animate-fade-in">
            <span class="text-xs font-bold text-amber-900 bg-amber-100/90 px-3 py-1.5 rounded-xl border border-amber-300 flex items-center gap-1.5">
              <span>⚠️ Filtre Aktif: <strong>"${window.STATUS_CONFIG[this.statusFilter].label}"</strong> olanlar (${displayedStudents.length} öğrenci)</span>
            </span>
            <button type="button" onclick="window.AttendanceModule.setStatusFilter('ALL')" 
              class="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 transition shadow-2xs">
              ✕ Filtreden Çık (Tümü)
            </button>
          </div>
        ` : `
          <div class="text-xs font-bold text-slate-500">
            Toplam <strong>${displayedStudents.length}</strong> öğrenci listeleniyor
          </div>
        `}
      </div>
    `;
  },

  renderSummary() {
    const summaryContainer = document.getElementById('attendance-summary-bar');
    if (!summaryContainer) return;

    const students = this.getFilteredStudents(false);
    const counts = { V: 0, T: 0, Y: 0, G: 0, E: 0, K: 0, I: 0 };

    students.forEach(s => {
      const draft = this.draftAttendance[s.id];
      const status = draft ? draft.status : 'V';
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    summaryContainer.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-1">
        ${Object.keys(window.STATUS_CONFIG).map(code => {
          const cfg = window.STATUS_CONFIG[code];
          const isCurrentActive = this.statusFilter === code;
          return `
            <div onclick="window.AttendanceModule.setStatusFilter('${code}')"
              class="px-3 py-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:scale-102 ${
                isCurrentActive ? 'ring-2 ring-slate-800 shadow-md scale-102' : ''
              }" 
              style="background-color: ${cfg.bg}12; border-color: ${cfg.border}40;">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg text-white font-black text-xs flex items-center justify-center" 
                  style="background-color: ${cfg.bg};">
                  ${cfg.code}
                </span>
                <span class="text-xs font-bold text-slate-700">${cfg.short}</span>
              </div>
              <span class="text-sm font-black text-slate-900">${counts[code]}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderStudentRows() {
    const tbody = document.getElementById('attendance-students-tbody');
    if (!tbody) return;

    const students = this.getFilteredStudents(true);

    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-12 text-center text-slate-400 text-sm">
            ${this.statusFilter !== 'ALL' 
              ? `"${window.STATUS_CONFIG[this.statusFilter].label}" durumunda öğrenci bulunamadı. <button onclick="window.AttendanceModule.setStatusFilter('ALL')" class="text-emerald-700 font-bold underline ml-1">Tümünü Göster</button>` 
              : 'Filtreye uygun öğrenci bulunamadı.'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = students.map(s => {
      const draft = this.draftAttendance[s.id] || { status: 'V', note: '' };
      const currentStatus = draft.status || 'V';

      return `
        <tr class="table-row-hover transition-colors">
          <td class="py-3.5 px-4 text-center font-bold text-slate-700">${s.studentNo}</td>
          <td class="py-3.5 px-4">
            <div class="font-bold text-slate-900">${s.firstName} ${s.lastName}</div>
            <div class="text-[10px] text-slate-400">Aile Kodu: <strong class="font-mono text-slate-600">${s.familyCode}</strong></div>
          </td>
          <td class="py-3.5 px-4">
            <div class="text-xs font-bold text-slate-800">${s.className}</div>
            <div class="text-[11px] text-slate-500">Hoca: ${s.etutHocasi || s.dahiliHoca || '-'}</div>
          </td>
          <td class="py-3.5 px-4 text-xs font-semibold text-indigo-800">${s.yatakhane || '-'}</td>
          <td class="py-3.5 px-4">
            <div class="flex items-center justify-center gap-1.5">
              ${Object.keys(window.STATUS_CONFIG).map(code => {
                const cfg = window.STATUS_CONFIG[code];
                const isSelected = currentStatus === code;
                return `
                  <button type="button" 
                    title="${cfg.label} - ${cfg.desc}"
                    onclick="window.AttendanceModule.setStatus('${s.id}', '${code}')"
                    class="w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'text-white scale-110 shadow-md ring-2 ring-offset-1 ring-slate-400' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 opacity-60 hover:opacity-100'
                    }"
                    style="${isSelected ? `background-color: ${cfg.bg}; border-color: ${cfg.border};` : ''}">
                    ${code}
                  </button>
                `;
              }).join('')}
            </div>
          </td>
          <td class="py-3.5 px-4">
            <input type="text" 
              placeholder="Açıklama / Mazeret (yazınca otomatik kaydeder)..." 
              value="${draft.note ? draft.note.replace(/"/g, '&quot;') : ''}"
              class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none"
              onchange="window.AttendanceModule.setNote('${s.id}', this.value)">
          </td>
        </tr>
      `;
    }).join('');
  }
};
