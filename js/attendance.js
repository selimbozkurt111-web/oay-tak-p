/**
 * attendance.js - Yoklama Alma ve Takip Mantığı (Personel Paneli)
 */

window.AttendanceModule = {
  currentDate: new Date().toISOString().split('T')[0],
  currentClass: 'ALL',
  searchQuery: '',
  draftAttendance: {}, // studentId -> { status, note }

  init() {
    this.renderView();
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

  setSearchQuery(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.renderStudentRows();
  },

  loadDailyDraft() {
    this.draftAttendance = {};
    const existing = window.Store.getAttendanceByDate(this.currentDate);
    existing.forEach(rec => {
      this.draftAttendance[rec.studentId] = {
        status: rec.status,
        note: rec.note || ''
      };
    });
  },

  setStatus(studentId, statusCode) {
    if (!this.draftAttendance[studentId]) {
      this.draftAttendance[studentId] = { status: 'V', note: '' };
    }
    this.draftAttendance[studentId].status = statusCode;
    this.renderStudentRows();
    this.renderSummary();
  },

  setNote(studentId, note) {
    if (!this.draftAttendance[studentId]) {
      this.draftAttendance[studentId] = { status: 'V', note: '' };
    }
    this.draftAttendance[studentId].note = note;
  },

  setAllStatus(statusCode) {
    const students = this.getFilteredStudents();
    students.forEach(s => {
      if (!this.draftAttendance[s.id]) {
        this.draftAttendance[s.id] = { status: statusCode, note: '' };
      } else {
        this.draftAttendance[s.id].status = statusCode;
      }
    });
    this.renderStudentRows();
    this.renderSummary();
    window.App.showToast(`Tüm listelenen öğrenciler "${window.STATUS_CONFIG[statusCode].label}" olarak işaretlendi.`, 'info');
  },

  saveAttendance() {
    const records = [];
    const students = window.Store.getStudents();

    students.forEach(s => {
      const draft = this.draftAttendance[s.id];
      if (draft) {
        records.push({
          studentId: s.id,
          date: this.currentDate,
          status: draft.status,
          note: draft.note || ''
        });
      }
    });

    if (records.length === 0) {
      window.App.showToast('Kaydedilecek yoklama bilgisi girilmedi.', 'warning');
      return;
    }

    window.Store.saveAttendanceBatch(records);
    window.App.showToast(`${this.currentDate} tarihli yoklama başarıyla kaydedildi!`, 'success');
    this.renderView();
  },

  getFilteredStudents() {
    let students = window.Store.getStudents();
    if (this.currentClass !== 'ALL') {
      students = students.filter(s => s.className === this.currentClass);
    }
    if (this.searchQuery) {
      students = students.filter(s => 
        s.firstName.toLowerCase().includes(this.searchQuery) ||
        s.lastName.toLowerCase().includes(this.searchQuery) ||
        s.studentNo.toString().includes(this.searchQuery) ||
        (s.familyCode && s.familyCode.toLowerCase().includes(this.searchQuery))
      );
    }
    return students;
  },

  renderView() {
    const container = document.getElementById('attendance-container');
    if (!container) return;

    const classes = window.Store.getClasses();
    const students = this.getFilteredStudents();
    this.loadDailyDraft();

    container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
        <!-- Üst Filtre ve Kontrol Barı -->
        <div class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div class="flex flex-wrap items-center gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">YOKLAMA TARİHİ</label>
              <input type="date" id="att-date-picker" value="${this.currentDate}" 
                class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                onchange="window.AttendanceModule.setDate(this.value)">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">SINIF / ŞUBE</label>
              <select id="att-class-picker" 
                class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                onchange="window.AttendanceModule.setClassFilter(this.value)">
                <option value="ALL" ${this.currentClass === 'ALL' ? 'selected' : ''}>Tüm Sınıflar</option>
                ${classes.map(c => `<option value="${c}" ${this.currentClass === c ? 'selected' : ''}>${c} Sınıfı</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">ÖĞRENCİ ARA</label>
              <div class="relative">
                <input type="text" placeholder="İsim, No veya Aile Kodu..." 
                  class="pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none w-56"
                  oninput="window.AttendanceModule.setSearchQuery(this.value)">
                <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- Aksiyon Butonları -->
          <div class="flex items-center gap-2">
            <button onclick="window.AttendanceModule.setAllStatus('V')" 
              class="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Tümünü Var (V) Yap
            </button>
            <button onclick="window.AttendanceModule.saveAttendance()" 
              class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Yoklamayı Kaydet
            </button>
          </div>
        </div>

        <!-- Günlük Özet İstatistik Çubuğu -->
        <div id="attendance-summary-bar" class="mt-4">
          <!-- renderSummary ile doldurulacak -->
        </div>
      </div>

      <!-- Yoklama Tablosu -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-4 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-800 text-base">Öğrenci Listesi & Durum Seçimi</h3>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold" id="student-count-badge">${students.length} Öğrenci</span>
          </div>
          <div class="text-xs text-slate-500 font-medium">
            Öğrenci durumunu belirlemek için harf butonlarına tıklayınız.
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th class="py-3 px-4 w-16 text-center">No</th>
                <th class="py-3 px-4">Öğrenci Adı & Sınıf</th>
                <th class="py-3 px-4">Aile / Veli Kodu</th>
                <th class="py-3 px-4 text-center">Yoklama Durumu (V, T, Y, G, E, K, İ)</th>
                <th class="py-3 px-4 w-64">Öğretmen / Mazeret Notu</th>
              </tr>
            </thead>
            <tbody id="attendance-students-tbody" class="divide-y divide-slate-100 text-sm">
              <!-- renderStudentRows ile doldurulacak -->
            </tbody>
          </table>
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
    const counts = { V: 0, T: 0, Y: 0, G: 0, E: 0, K: 0, I: 0, unset: 0 };

    students.forEach(s => {
      const draft = this.draftAttendance[s.id];
      if (draft && draft.status && counts[draft.status] !== undefined) {
        counts[draft.status]++;
      } else {
        counts.unset++;
      }
    });

    summaryContainer.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-1">
        ${Object.keys(window.STATUS_CONFIG).map(code => {
          const cfg = window.STATUS_CONFIG[code];
          return `
            <div class="px-3 py-2 rounded-xl border flex items-center justify-between" 
              style="background-color: ${cfg.bg}10; border-color: ${cfg.border}40;">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg text-white font-black text-xs flex items-center justify-center" 
                  style="background-color: ${cfg.bg};">
                  ${cfg.code}
                </span>
                <span class="text-xs font-semibold text-slate-700">${cfg.short}</span>
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

    const students = this.getFilteredStudents();
    const badge = document.getElementById('student-count-badge');
    if (badge) badge.innerText = `${students.length} Öğrenci`;

    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-12 text-center text-slate-400 font-medium">
            Aranan kriterlere uygun öğrenci bulunamadı.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = students.map(s => {
      const draft = this.draftAttendance[s.id] || { status: 'V', note: '' };
      const currentStatus = draft.status || 'V';
      const siblings = window.Store.getStudentsByFamilyCode(s.familyCode);
      const isSibling = siblings.length > 1;

      return `
        <tr class="table-row-hover transition-colors">
          <!-- No -->
          <td class="py-3 px-4 text-center font-bold text-slate-700">
            ${s.studentNo}
          </td>

          <!-- Ad Soyad & Sınıf -->
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                ${s.firstName[0]}${s.lastName[0]}
              </div>
              <div>
                <div class="font-semibold text-slate-900 flex items-center gap-1.5">
                  ${s.firstName} ${s.lastName}
                  ${isSibling ? `<span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium" title="Ailede ${siblings.length} kardeş kayıtlı">Kardeş (${siblings.length})</span>` : ''}
                </div>
                <div class="text-xs text-slate-500 font-medium">Sınıf: <span class="text-slate-700 font-semibold">${s.className}</span></div>
              </div>
            </div>
          </td>

          <!-- Aile Kodu -->
          <td class="py-3 px-4">
            <span class="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              ${s.familyCode || '-'}
            </span>
          </td>

          <!-- Durum Butonları (V, T, Y, G, E, K, İ) -->
          <td class="py-3 px-4">
            <div class="flex items-center justify-center gap-1.5">
              ${Object.keys(window.STATUS_CONFIG).map(code => {
                const cfg = window.STATUS_CONFIG[code];
                const isSelected = currentStatus === code;
                return `
                  <button type="button" 
                    title="${cfg.label} - ${cfg.desc}"
                    onclick="window.AttendanceModule.setStatus('${s.id}', '${code}')"
                    class="w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
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

          <!-- Not Girişi -->
          <td class="py-3 px-4">
            <input type="text" 
              placeholder="Açıklama / Mazeret..." 
              value="${draft.note ? draft.note.replace(/"/g, '&quot;') : ''}"
              class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
              onchange="window.AttendanceModule.setNote('${s.id}', this.value)">
          </td>
        </tr>
      `;
    }).join('');
  }
};
