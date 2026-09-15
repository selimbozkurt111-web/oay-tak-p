/**
 * attendance.js - Yoklama Alma ve Takip Mantığı (Genişletilmiş Hoca ve Sınıf Filtreli)
 */

window.AttendanceModule = {
  currentDate: new Date().toISOString().split('T')[0],
  currentClass: 'ALL',
  currentHoca: 'ALL',
  searchQuery: '',
  draftAttendance: {},

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

  setHocaFilter(hocaName) {
    this.currentHoca = hocaName;
    this.renderStudentRows();
    this.renderSummary();
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
    window.App.showToast(`Listelenen ${students.length} öğrenci "${window.STATUS_CONFIG[statusCode].label}" olarak işaretlendi.`, 'info');
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
    return students;
  },

  renderView() {
    const container = document.getElementById('attendance-container');
    if (!container) return;

    const classes = window.Store.getClasses();
    const etutHocalari = window.Store.getEtutHocalari();
    const students = this.getFilteredStudents();
    this.loadDailyDraft();

    container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
        <!-- Filtre ve Kontrol Barı -->
        <div class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div class="flex flex-wrap items-center gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">YOKLAMA TARİHİ</label>
              <input type="date" id="att-date-picker" value="${this.currentDate}" 
                class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                onchange="window.AttendanceModule.setDate(this.value)">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">SINIF FİLTRESİ</label>
              <select id="att-class-picker" 
                class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                onchange="window.AttendanceModule.setClassFilter(this.value)">
                <option value="ALL" ${this.currentClass === 'ALL' ? 'selected' : ''}>Tüm Sınıflar (66 Öğrenci)</option>
                ${classes.map(c => `<option value="${c}" ${this.currentClass === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">HOCA / GRUP FİLTRESİ</label>
              <select id="att-hoca-picker" 
                class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                onchange="window.AttendanceModule.setHocaFilter(this.value)">
                <option value="ALL">Tüm Hocalar</option>
                ${etutHocalari.map(h => `<option value="${h}">${h}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">ÖĞRENCİ ARA</label>
              <input type="text" placeholder="İsim, No veya Oda..." 
                class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none w-48"
                oninput="window.AttendanceModule.setSearchQuery(this.value)">
            </div>
          </div>

          <!-- Hızlı Butonlar -->
          <div class="flex items-center gap-2">
            <button onclick="window.AttendanceModule.setAllStatus('V')" 
              class="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Tümünü Var (V) Yap
            </button>
            <button onclick="window.AttendanceModule.saveAttendance()" 
              class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition">
              <span>✓ Yoklamayı Kaydet</span>
            </button>
          </div>
        </div>

        <!-- İstatistik Çubuğu -->
        <div id="attendance-summary-bar" class="mt-4"></div>
      </div>

      <!-- Yoklama Tablosu -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-800 text-base">Öğrenci Yoklama Tablosu</h3>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold" id="student-count-badge">${students.length} Öğrenci</span>
          </div>
          <div class="text-xs text-slate-500 font-medium">
            Özel Kodlar: <strong>V</strong>: Var | <strong>T</strong>: Takkesiz | <strong>Y</strong>: Namazda Yok | <strong>G</strong>: Geç | <strong>E</strong>: Eşofmanlı | <strong>K</strong>: Kursta Yok | <strong>İ</strong>: İzinli
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th class="py-3 px-4 w-16 text-center">No</th>
                <th class="py-3 px-4">Öğrenci Adı</th>
                <th class="py-3 px-4">Sınıf & Hocası</th>
                <th class="py-3 px-4">Yatakhane</th>
                <th class="py-3 px-4 text-center">Yoklama Durumu (V, T, Y, G, E, K, İ)</th>
                <th class="py-3 px-4 w-56">Öğretmen Notu</th>
              </tr>
            </thead>
            <tbody id="attendance-students-tbody" class="divide-y divide-slate-100 text-sm"></tbody>
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
    const counts = { V: 0, T: 0, Y: 0, G: 0, E: 0, K: 0, I: 0 };

    students.forEach(s => {
      const draft = this.draftAttendance[s.id];
      if (draft && draft.status && counts[draft.status] !== undefined) {
        counts[draft.status]++;
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
      tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-slate-400">Filtreye uygun öğrenci bulunamadı.</td></tr>`;
      return;
    }

    tbody.innerHTML = students.map(s => {
      const draft = this.draftAttendance[s.id] || { status: 'V', note: '' };
      const currentStatus = draft.status || 'V';

      return `
        <tr class="table-row-hover transition-colors">
          <td class="py-3 px-4 text-center font-bold text-slate-700">${s.studentNo}</td>
          <td class="py-3 px-4">
            <div class="font-bold text-slate-900">${s.firstName} ${s.lastName}</div>
            <div class="text-[10px] text-slate-400">Aile Kodu: <strong class="font-mono text-slate-600">${s.familyCode}</strong></div>
          </td>
          <td class="py-3 px-4">
            <div class="text-xs font-bold text-slate-800">${s.className}</div>
            <div class="text-[11px] text-slate-500">Hoca: ${s.etutHocasi || s.dahiliHoca || '-'}</div>
          </td>
          <td class="py-3 px-4 text-xs font-medium text-indigo-800">${s.yatakhane || '-'}</td>
          <td class="py-3 px-4">
            <div class="flex items-center justify-center gap-1.5">
              ${Object.keys(window.STATUS_CONFIG).map(code => {
                const cfg = window.STATUS_CONFIG[code];
                const isSelected = currentStatus === code;
                return `
                  <button type="button" 
                    title="${cfg.label} - ${cfg.desc}"
                    onclick="window.AttendanceModule.setStatus('${s.id}', '${code}')"
                    class="w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
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
          <td class="py-3 px-4">
            <input type="text" 
              placeholder="Açıklama / Mazeret..." 
              value="${draft.note ? draft.note.replace(/"/g, '&quot;') : ''}"
              class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none"
              onchange="window.AttendanceModule.setNote('${s.id}', this.value)">
          </td>
        </tr>
      `;
    }).join('');
  }
};
