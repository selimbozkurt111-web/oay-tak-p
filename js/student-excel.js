/**
 * student-excel.js - Sadece Kurum Yöneticisine Özel Canlı Excel Tablosu (Öğrenci Bilgi Düzenleme Modülü)
 * - Tıpkı Excel ve Google Sheets gibi hücre hücre doğrudan tıklayıp düzenleme
 * - Hücreden çıkıldığı veya yazıldığı an sisteme ve Firebase bulutuna anında otomatik kayıt
 * - Klavyeden Enter tuşu ile bir alt satıra geçiş, Tab ile yana geçiş
 * - Sınıf filtresi, hızlı arama, tek tıkla yeni satır ekleme ve Excel (CSV) indirme
 * - Güvenlik: Yalnızca Kurum Ana Yöneticisine (Müdür) özeldir.
 */

window.StudentExcelModule = {
  selectedClass: 'ALL',
  searchQuery: '',
  saveTimers: {},
  sortField: 'studentNo',
  sortAsc: true,

  init() {
    const session = window.App?.currentSession;
    const isManager = session && (
      session.role === 'superadmin' ||
      session.canEditStudents === true ||
      session.canManageStaff === true ||
      session.staffId === 'stf_1' ||
      (session.name && session.name.toUpperCase().includes('SELİM BOZKURT')) ||
      (session.name && session.name.toUpperCase().includes('YÖNETİCİ')) ||
      (session.name && session.name.toUpperCase().includes('MÜDÜR'))
    );

    const container = document.getElementById('student-excel-container');
    if (!container) return;

    if (!isManager) {
      container.innerHTML = `
        <div class="max-w-md mx-auto py-12 text-center animate-fade-in px-4">
          <div class="p-8 bg-white rounded-3xl shadow-xl border border-rose-200 space-y-4">
            <div class="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-3xl font-black mx-auto shadow-inner">
              🔒
            </div>
            <h3 class="font-black text-slate-900 text-lg">Yetkisiz Erişim</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Bu <strong>Canlı Excel Tablosu</strong> yalnızca Kurum Yöneticisine özel bir yönetim panelidir.
            </p>
            <button onclick="window.App.setTab('yoklama')" 
              class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer">
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      `;
      return;
    }

    this.render();
  },

  escapeHtml(str) {
    if (str == null) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  setFilterClass(c) {
    this.selectedClass = c || 'ALL';
    this.renderTableBody();
  },

  setSearchQuery(q) {
    this.searchQuery = (q || '').toLowerCase().trim();
    this.renderTableBody();
  },

  toggleSort(field) {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
    this.renderTableBody();
  },

  resetFilterAndRestore() {
    this.selectedClass = 'ALL';
    this.searchQuery = '';
    const fallbackList = (window.Store && typeof window.Store.getStudents === 'function' && window.Store.getStudents()) ||
                         window.SEED_STUDENTS || [];
    if (fallbackList.length > 0 && window.Store && typeof window.Store.saveStudents === 'function') {
      window.Store.saveStudents(fallbackList);
    }
    this.render();
  },

  getFilteredStudents() {
    let students = [];
    try {
      if (window.Store && typeof window.Store.getStudents === 'function') {
        students = window.Store.getStudents();
      }
    } catch (e) {
      console.warn('Store.getStudents error:', e);
    }

    if (!Array.isArray(students) || students.length === 0) {
      const fallbackList = window.SEED_STUDENTS || 
                           (typeof SEED_STUDENTS !== 'undefined' ? SEED_STUDENTS : []);
      if (Array.isArray(fallbackList) && fallbackList.length > 0) {
        try {
          if (window.Store && typeof window.Store.saveStudents === 'function') {
            window.Store.saveStudents(fallbackList);
          }
        } catch (e) {}
        students = [...fallbackList];
      } else {
        students = [];
      }
    }

    students = students.filter(s => s && typeof s === 'object');

    if (this.selectedClass && this.selectedClass !== 'ALL') {
      students = students.filter(s => (s.className || '').toString().trim() === this.selectedClass.trim());
    }

    if (this.searchQuery) {
      const q = this.searchQuery;
      students = students.filter(s => {
        const fullStr = [
          s.studentNo, s.firstName, s.lastName, s.className, s.school,
          s.etutHocasi, s.dahiliHoca, s.yatakhane, s.fatherName,
          s.parentPhone, s.fatherPhone, s.familyCode, s.password
        ].filter(Boolean).join(' ').toLowerCase();
        return fullStr.includes(q);
      });
    }

    // Sıralama
    const field = this.sortField || 'studentNo';
    const asc = this.sortAsc !== false;
    students.sort((a, b) => {
      let valA = a && a[field] != null ? a[field] : '';
      let valB = b && b[field] != null ? b[field] : '';

      if (field === 'studentNo') {
        const numA = parseInt(valA, 10) || 0;
        const numB = parseInt(valB, 10) || 0;
        return asc ? numA - numB : numB - numA;
      }

      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();
      return asc ? valA.localeCompare(valB, 'tr') : valB.localeCompare(valA, 'tr');
    });

    return students;
  },

  // Hücre içeriği değiştiğinde anında otomatik kayıt (Debounce 350ms)
  handleCellInput(studentId, field, rawValue) {
    const val = (rawValue != null ? rawValue : '').toString().trim();
    const key = `${studentId}_${field}`;
    if (this.saveTimers[key]) clearTimeout(this.saveTimers[key]);

    const indicator = document.getElementById('excel-save-indicator');
    if (indicator) {
      indicator.innerHTML = `<span class="text-amber-500 font-bold text-xs flex items-center gap-1 animate-pulse">💾 <span>Kaydediliyor...</span></span>`;
    }

    this.saveTimers[key] = setTimeout(() => {
      const updatePayload = { [field]: val };
      // Eğer soyadı değiştiyse ve aile kodu boşsa veya eski soyada bağlıysa otomatik güncelle
      if (field === 'lastName' && val) {
        const currentStudent = window.Store.getStudentById(studentId);
        if (currentStudent && (!currentStudent.familyCode || currentStudent.familyCode.includes('2026'))) {
          updatePayload.familyCode = (val + '2026').toUpperCase();
          const famInput = document.querySelector(`input[data-student-id="${studentId}"][data-field="familyCode"]`);
          if (famInput) famInput.value = updatePayload.familyCode;
        }
      }

      window.Store.updateStudent(studentId, updatePayload);

      if (indicator) {
        indicator.innerHTML = `<span class="text-emerald-600 font-black text-xs flex items-center gap-1">✓ <span>Otomatik Kaydedildi</span></span>`;
        setTimeout(() => {
          if (indicator) indicator.innerHTML = '';
        }, 1500);
      }
    }, 350);
  },

  handleCellBlur(studentId, field, rawValue) {
    const val = (rawValue != null ? rawValue : '').toString().trim();
    window.Store.updateStudent(studentId, { [field]: val });
  },

  // Excel Klavye Deneyimi: Enter'a basınca aynı sütunda bir alt satıra geç
  handleKeyDown(e, rowIdx, colIdx) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.getElementById(`excel-cell-${rowIdx + 1}-${colIdx}`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp' && (e.ctrlKey || e.altKey)) {
      e.preventDefault();
      const prevInput = document.getElementById(`excel-cell-${rowIdx - 1}-${colIdx}`);
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    } else if (e.key === 'ArrowDown' && (e.ctrlKey || e.altKey)) {
      e.preventDefault();
      const nextInput = document.getElementById(`excel-cell-${rowIdx + 1}-${colIdx}`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  },

  // Yeni Öğrenci Satırı Ekle
  addNewRow() {
    const students = window.Store.getStudents();
    const maxNo = students.reduce((max, s) => Math.max(max, parseInt(s.studentNo, 10) || 0), 100);
    const newNo = (maxNo + 1).toString();
    const defaultClass = this.selectedClass !== 'ALL' ? this.selectedClass : '5. Sınıf';

    const newStudent = window.Store.addStudent({
      studentNo: newNo,
      firstName: '',
      lastName: '',
      className: defaultClass,
      school: 'KAZIM ÖZALP',
      seviye: 'Seviye 1',
      etutHocasi: '',
      dahiliHoca: '',
      yatakhane: 'Oda 101',
      fatherName: '',
      parentPhone: '',
      password: '123',
      familyCode: ''
    });

    window.App.showToast(`Yeni öğrenci satırı eklendi (No: ${newNo})! Bilgileri doğrudan hücrelere yazabilirsiniz.`, 'success');
    this.renderTableBody();

    // Yeni satırın ilk isim hücresine odaklan
    setTimeout(() => {
      const firstInput = document.querySelector(`input[data-student-id="${newStudent.id}"][data-field="firstName"]`);
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  },

  // Öğrenci Satırını Sil
  deleteRow(id) {
    const st = window.Store.getStudentById(id);
    const name = st ? `${st.firstName || ''} ${st.lastName || ''}`.trim() : 'Bu öğrenciyi';
    if (confirm(`"${name}" kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      window.Store.deleteStudent(id);
      window.App.showToast('Öğrenci kaydı silindi.', 'info');
      this.renderTableBody();
    }
  },

  // Excel CSV Dışa Aktarımı (Türkçe Karakter ve Excel Uyumlu UTF-8 BOM)
  exportToCsv() {
    const students = this.getFilteredStudents();
    if (students.length === 0) {
      window.App.showToast('İndirilecek öğrenci verisi bulunamadı.', 'warning');
      return;
    }

    const headers = [
      'Okul No', 'Adı', 'Soyadı', 'Sınıfı', 'Okulu', 'Seviye',
      'Etüt Hocası', 'Dahili Hocası', 'Yatakhane', 'Veli Adı',
      'Veli Telefon', 'Veli Giriş Şifresi', 'Ortak Aile Kodu'
    ];

    const escapeCsv = (val) => {
      const s = (val || '').toString().replace(/"/g, '""');
      return `"${s}"`;
    };

    let csvContent = '\uFEFF'; // Excel'in Türkçe karakterleri düzgün açması için UTF-8 BOM
    csvContent += headers.map(escapeCsv).join(';') + '\r\n';

    students.forEach(st => {
      const row = [
        st.studentNo,
        st.firstName,
        st.lastName,
        st.className,
        st.school || '',
        st.seviye || '',
        st.etutHocasi || '',
        st.dahiliHoca || '',
        st.yatakhane || '',
        st.fatherName || '',
        st.parentPhone || st.fatherPhone || '',
        st.password || '123',
        st.familyCode || ''
      ];
      csvContent += row.map(escapeCsv).join(';') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `OAY_Akademi_Ogrenci_Listesi_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    window.App.showToast('Excel uyumlu öğrenci tablosu (CSV) indirildi!', 'success');
  },

  render() {
    const container = document.getElementById('student-excel-container');
    if (!container) return;

    let classes = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf', 'Lise'];
    let allHocalar = [];
    try {
      if (window.Store && typeof window.Store.getClasses === 'function') {
        const c = window.Store.getClasses();
        if (Array.isArray(c) && c.length > 0) classes = c;
      }
    } catch (e) {}
    try {
      if (window.Store && typeof window.Store.getAllHocalar === 'function') {
        const h = window.Store.getAllHocalar();
        if (Array.isArray(h)) allHocalar = h;
      }
    } catch (e) {}

    container.innerHTML = `
      <div class="space-y-4 max-w-[100vw] mx-auto animate-fade-in pb-12 px-1 sm:px-4">
        
        <!-- ÜST KONTROL VE BAŞLIK ÇUBUĞU -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-sm font-bold">
                📊
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Canlı Excel Tablosu (Öğrenci Bilgi Düzenleyici)
                  </h2>
                  <span class="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-black text-[10px] uppercase border border-amber-300">
                    👑 Sadece Yönetici
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                  Tıpkı Excel gibi hücrelere tıklayıp yazınız; değişiklikler sisteme ve buluta anında kaydedilir.
                </p>
              </div>
            </div>

            <!-- Sağ Butonlar: Canlı Kayıt, Yeni Satır, Excel İndir & Standart Liste -->
            <div class="flex flex-wrap items-center gap-2">
              <div id="excel-save-indicator" class="h-6 flex items-center mr-1"></div>

              <!-- + Yeni Satır Ekle -->
              <button type="button" onclick="window.StudentExcelModule.addNewRow()"
                class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Tablonun altına hemen yeni bir boş öğrenci satırı ekler">
                <span>➕</span>
                <span>Yeni Satır Ekle</span>
              </button>

              <!-- Excel (CSV) İndir -->
              <button type="button" onclick="window.StudentExcelModule.exportToCsv()"
                class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Tüm öğrenci tablosunu Excel uyumlu CSV formatında indir">
                <span>📥</span>
                <span>Excel (CSV) İndir</span>
              </button>

              <!-- Standart Listeye Dön -->
              <button type="button" onclick="window.App.setTab('ogrenciler')"
                class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Standart kart/liste görünümüne geri döner">
                <span>📋</span>
                <span class="hidden sm:inline">Standart Liste</span>
              </button>
            </div>
          </div>

          <!-- FİLTRE VE ARAMA BARI -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <!-- Sınıf Hap Butonları -->
            <div class="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span class="text-[11px] font-black text-slate-500 uppercase mr-1">SINIF:</span>
              <button type="button" onclick="window.StudentExcelModule.setFilterClass('ALL')"
                class="px-3 py-1 rounded-xl text-xs font-black transition ${
                  this.selectedClass === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }">
                Tümü
              </button>
              ${classes.map(c => `
                <button type="button" onclick="window.StudentExcelModule.setFilterClass('${c}')"
                  class="px-2.5 py-1 rounded-xl text-xs font-black transition border ${
                    this.selectedClass === c
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }">
                  ${c}
                </button>
              `).join('')}
            </div>

            <!-- Canlı Arama Kutusu -->
            <div class="w-full sm:w-72 relative">
              <input type="text" placeholder="İsim, No, Hoca veya Telefon ara..." 
                value="${this.escapeHtml(this.searchQuery)}"
                class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                oninput="window.StudentExcelModule.setSearchQuery(this.value)">
              <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            </div>
          </div>
        </div>

        <!-- EXCEL GRID TABLOSU -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto max-h-[75vh]">
            <table class="w-full text-left border-collapse table-fixed text-xs min-w-[1280px]">
              <!-- Sütun Başlıkları -->
              <thead class="sticky top-0 z-20 bg-slate-900 text-white shadow-sm">
                <tr class="h-9 text-[11px] font-black uppercase tracking-wider divide-x divide-slate-800">
                  <th class="w-10 text-center bg-slate-950">#</th>
                  <th class="w-20 px-2 cursor-pointer hover:bg-slate-800 transition" onclick="window.StudentExcelModule.toggleSort('studentNo')" title="Numaraya göre sırala">
                    No ↕
                  </th>
                  <th class="w-36 px-2 cursor-pointer hover:bg-slate-800 transition" onclick="window.StudentExcelModule.toggleSort('firstName')" title="Ada göre sırala">
                    Adı ↕
                  </th>
                  <th class="w-32 px-2 cursor-pointer hover:bg-slate-800 transition" onclick="window.StudentExcelModule.toggleSort('lastName')" title="Soyada göre sırala">
                    Soyadı ↕
                  </th>
                  <th class="w-28 px-2 cursor-pointer hover:bg-slate-800 transition" onclick="window.StudentExcelModule.toggleSort('className')" title="Sınıfa göre sırala">
                    Sınıfı ↕
                  </th>
                  <th class="w-36 px-2">Okulu</th>
                  <th class="w-36 px-2">Etüt Hocası</th>
                  <th class="w-36 px-2">Dahili Hocası</th>
                  <th class="w-24 px-2">Yatakhane</th>
                  <th class="w-32 px-2">Veli Adı</th>
                  <th class="w-32 px-2">Veli Telefonu</th>
                  <th class="w-24 px-2 text-center bg-amber-950/60 text-amber-300">Giriş Şifresi</th>
                  <th class="w-28 px-2">Ortak Aile Kodu</th>
                  <th class="w-12 text-center bg-slate-950">İşlem</th>
                </tr>
              </thead>

              <!-- Tablo Gövdesi -->
              <tbody id="student-excel-tbody" class="divide-y divide-slate-200">
                <!-- renderTableBody ile doldurulacak -->
              </tbody>
            </table>
          </div>

          <!-- ALT BİLGİ VE İPUCU BARI -->
          <div class="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-bold">
            <div class="flex items-center gap-3">
              <span id="excel-total-counter">Yükleniyor...</span>
              <span>•</span>
              <span class="text-slate-400 font-normal">
                💡 İpucu: Bir hücreden çıkıldığında veya <kbd class="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] text-slate-700">Enter</kbd> tuşuna basıldığında bir alt hücreye geçer ve otomatik kaydeder.
              </span>
            </div>
            <div>
              <span class="text-emerald-700">✓ Değişiklikler anında canlı sistemdedir</span>
            </div>
          </div>
        </div>

        <!-- Datalist: Sınıf ve Hoca Otomatik Tamamlama -->
        <datalist id="excel-class-list">
          <option value="5. Sınıf"></option>
          <option value="6. Sınıf"></option>
          <option value="7. Sınıf"></option>
          <option value="8. Sınıf"></option>
          <option value="Lise"></option>
        </datalist>

        <datalist id="excel-hocalar-list">
          ${allHocalar.map(h => `<option value="${this.escapeHtml(h)}"></option>`).join('')}
        </datalist>
      </div>
    `;

    this.renderTableBody();
  },

  renderTableBody() {
    const tbody = document.getElementById('student-excel-tbody');
    if (!tbody) return;

    let students = [];
    try {
      students = this.getFilteredStudents();
    } catch (err) {
      console.error('getFilteredStudents error:', err);
    }

    const counterEl = document.getElementById('excel-total-counter');
    if (counterEl) {
      counterEl.textContent = `Toplam ${students.length} Talebe Listeleniyor`;
    }

    if (!students || students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="14" class="p-12 text-center text-slate-400 text-xs font-bold">
            Kriterlere uygun veya kayıtlı talebe bulunamadı.
            <button type="button" onclick="window.StudentExcelModule.resetFilterAndRestore()"
              class="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer">
              🔄 Listeyi Yenile / Sıfırla
            </button>
          </td>
        </tr>
      `;
      return;
    }

    try {
      tbody.innerHTML = students.map((st, rowIdx) => {
        const isCustomPass = st && st.password && st.password.toString().trim() !== '123';

        return `
          <tr class="hover:bg-amber-50/40 transition-colors h-8 divide-x divide-slate-100 group">
            <!-- 0. Sıra No -->
            <td class="text-center font-mono text-[10px] text-slate-400 bg-slate-50/70 select-none font-bold">
              ${rowIdx + 1}
            </td>

            <!-- 1. Okul No -->
            <td class="p-0">
              <input type="text" value="${this.escapeHtml(st.studentNo || '')}" 
                id="excel-cell-${rowIdx}-1"
                data-student-id="${st.id}" data-field="studentNo"
                class="excel-input w-full h-8 px-2 bg-transparent text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'studentNo', this.value)"
                onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'studentNo', this.value)"
                onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 1)">
            </td>

          <!-- 2. Adı -->
          <td class="p-0">
            <input type="text" value="${this.escapeHtml(st.firstName)}" 
              id="excel-cell-${rowIdx}-2"
              data-student-id="${st.id}" data-field="firstName"
              class="excel-input w-full h-8 px-2 bg-transparent text-slate-900 font-bold text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'firstName', this.value)"
              onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'firstName', this.value)"
              onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 2)">
          </td>

          <!-- 3. Soyadı -->
          <td class="p-0">
            <input type="text" value="${this.escapeHtml(st.lastName)}" 
              id="excel-cell-${rowIdx}-3"
              data-student-id="${st.id}" data-field="lastName"
              class="excel-input w-full h-8 px-2 bg-transparent text-slate-900 font-black text-xs uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'lastName', this.value)"
              onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'lastName', this.value)"
              onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 3)">
          </td>

          <!-- 4. Sınıfı -->
          <td class="p-0">
            <input type="text" list="excel-class-list" value="${this.escapeHtml(st.className)}" 
              id="excel-cell-${rowIdx}-4"
              data-student-id="${st.id}" data-field="className"
              class="excel-input w-full h-8 px-2 bg-transparent text-slate-800 font-bold text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'className', this.value)"
              onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'className', this.value)"
              onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 4)">
          </td>

          <!-- 5. Okulu -->
          <td class="p-0">
            <input type="text" value="${this.escapeHtml(st.school || '')}" 
              id="excel-cell-${rowIdx}-5"
              data-student-id="${st.id}" data-field="school"
              class="excel-input w-full h-8 px-2 bg-transparent text-slate-600 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'school', this.value)"
              onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'school', this.value)"
              onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 5)">
          </td>

          <!-- 6. Etüt Hocası -->
          <td class="p-0">
            <input type="text" list="excel-hocalar-list" value="${this.escapeHtml(st.etutHocasi || '')}" 
              id="excel-cell-${rowIdx}-6"
              data-student-id="${st.id}" data-field="etutHocasi"
              class="excel-input w-full h-8 px-2 bg-transparent text-slate-800 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'etutHocasi', this.value)"
              onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'etutHocasi', this.value)"
              onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 6)">
          </td>

          <!-- 7. Dahili Hocası -->
          <td class="p-0">
            <input type="text" list="excel-hocalar-list" value="${this.escapeHtml(st.dahiliHoca || '')}" 
              id="excel-cell-${rowIdx}-7"
              data-student-id="${st.id}" data-field="dahiliHoca"
              class="excel-input w-full h-8 px-2 bg-transparent text-slate-800 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'dahiliHoca', this.value)"
              onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'dahiliHoca', this.value)"
              onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 7)">
          </td>

          <!-- 8. Yatakhane / Oda -->
          <td class="p-0">
            <input type="text" value="${this.escapeHtml(st.yatakhane || '')}" 
              id="excel-cell-${rowIdx}-8"
              data-student-id="${st.id}" data-field="yatakhane"
              class="excel-input w-full h-8 px-2 bg-transparent text-indigo-900 font-bold text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'yatakhane', this.value)"
              onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'yatakhane', this.value)"
              onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 8)">
          </td>

          <!-- 9. Veli Adı -->
          <td class="p-0">
            <input type="text" value="${this.escapeHtml(st.fatherName || '')}" 
              id="excel-cell-${rowIdx}-9"
              data-student-id="${st.id}" data-field="fatherName"
              class="excel-input w-full h-8 px-2 bg-transparent text-slate-700 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'fatherName', this.value)"
              onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'fatherName', this.value)"
              onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 9)">
          </td>

          <!-- 10. Veli Telefonu -->
          <td class="p-0">
            <input type="tel" value="${this.escapeHtml(st.parentPhone || st.fatherPhone || '')}" 
              id="excel-cell-${rowIdx}-10"
              data-student-id="${st.id}" data-field="parentPhone"
              placeholder="0555..."
              class="excel-input w-full h-8 px-2 bg-transparent text-slate-800 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'parentPhone', this.value)"
              onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'parentPhone', this.value)"
              onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 10)">
          </td>

          <!-- 11. Veli Giriş Şifresi -->
          <td class="p-0 ${isCustomPass ? 'bg-amber-100/60' : 'bg-slate-50/50'}">
            <input type="text" value="${this.escapeHtml(st.password || '123')}" 
              id="excel-cell-${rowIdx}-11"
              data-student-id="${st.id}" data-field="password"
              class="excel-input w-full h-8 px-2 text-center font-mono font-black text-xs ${isCustomPass ? 'text-amber-950' : 'text-slate-700'} focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'password', this.value)"
              onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'password', this.value)"
              onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 11)">
          </td>

          <!-- 12. Ortak Aile Kodu -->
          <td class="p-0">
            <input type="text" value="${this.escapeHtml(st.familyCode || '')}" 
              id="excel-cell-${rowIdx}-12"
              data-student-id="${st.id}" data-field="familyCode"
              class="excel-input w-full h-8 px-2 bg-transparent text-indigo-950 font-mono font-bold text-xs uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'familyCode', this.value)"
              onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'familyCode', this.value)"
              onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 12)">
          </td>

          <!-- 13. İşlem (Sil) -->
          <td class="text-center p-0">
            <button type="button" onclick="window.StudentExcelModule.deleteRow('${st.id}')"
              class="w-7 h-7 inline-flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Öğrenciyi Sil">
              🗑️
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('renderTableBody render error:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="14" class="p-8 text-center text-rose-600 text-xs font-bold">
            Tablo yüklenirken bir sorun oluştu.
            <button type="button" onclick="window.StudentExcelModule.resetFilterAndRestore()"
              class="ml-2 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold">
              Yeniden Dene ⟳
            </button>
          </td>
        </tr>
      `;
    }
  }
};
