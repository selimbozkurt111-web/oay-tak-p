/**
 * app.js - Ana Uygulama Yöneticisi, Rol Ayrımı, Modal ve Bulut Ayarları
 */

window.App = {
  currentRole: 'parent',
  isPersonnelAuthenticated: false,
  activePersonnelTab: 'yoklama',
  studentFilterClass: 'ALL',
  studentSearchQuery: '',

  async init() {
    // CloudSync başlat
    if (window.CloudSync) {
      window.CloudSync.init();
      if (window.CloudSync.isCloudActive) {
        await window.CloudSync.pullAllFromCloud();
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const requestedRole = urlParams.get('role');

    if (sessionStorage.getItem('yoklama_personel_auth') === 'true') {
      this.isPersonnelAuthenticated = true;
      if (requestedRole !== 'parent') {
        this.currentRole = 'personel';
      }
    }

    this.renderHeader();
    this.renderMainContent();
  },

  setRole(role) {
    if (role === 'personel') {
      if (this.isPersonnelAuthenticated) {
        this.currentRole = 'personel';
        this.renderHeader();
        this.renderMainContent();
      } else {
        this.openPinModal();
      }
    } else {
      this.currentRole = 'parent';
      this.renderHeader();
      this.renderMainContent();
    }
  },

  openPinModal() {
    const modal = document.getElementById('pin-modal');
    if (modal) {
      modal.classList.remove('hidden');
      const pinInput = document.getElementById('pin-input');
      if (pinInput) {
        pinInput.value = '';
        setTimeout(() => pinInput.focus(), 100);
      }
    }
  },

  closePinModal() {
    const modal = document.getElementById('pin-modal');
    if (modal) modal.classList.add('hidden');
  },

  verifyAndLoginPersonnel(event) {
    if (event) event.preventDefault();
    const pinInput = document.getElementById('pin-input');
    const pin = pinInput ? pinInput.value.trim() : '';

    if (window.Store.verifyPin(pin)) {
      this.isPersonnelAuthenticated = true;
      sessionStorage.setItem('yoklama_personel_auth', 'true');
      this.closePinModal();
      this.currentRole = 'personel';
      this.showToast('Personel girişi başarılı! Hoş geldiniz.', 'success');
      this.renderHeader();
      this.renderMainContent();
    } else {
      this.showToast('Hatalı PIN kodu girdiniz. (Varsayılan: 1234)', 'error');
      if (pinInput) pinInput.select();
    }
  },

  logoutPersonnel() {
    this.isPersonnelAuthenticated = false;
    sessionStorage.removeItem('yoklama_personel_auth');
    this.currentRole = 'parent';
    this.showToast('Personel oturumu kapatıldı. Veli moduna geçildi.', 'info');
    this.renderHeader();
    this.renderMainContent();
  },

  setPersonnelTab(tab) {
    this.activePersonnelTab = tab;
    this.renderHeader();
    this.renderMainContent();
  },

  renderHeader() {
    const header = document.getElementById('header-nav');
    if (!header) return;

    const settings = window.Store.getSettings();
    const isCloud = window.CloudSync && window.CloudSync.isCloudActive;

    header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md">
            ÖT
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-black text-slate-900 tracking-tight leading-none">${settings.institutionName}</h1>
              ${isCloud ? `
                <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300" title="Bulut Canlı Senkronizasyon Aktif">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Bulut Aktif
                </span>
              ` : `
                <span class="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200" title="Veriler sadece bu cihazda saklanıyor">
                  Yerel Mod
                </span>
              `}
            </div>
            <p class="text-[11px] text-slate-500 font-semibold mt-0.5">Yoklama, Devam & Performans Takip Sistemi</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 border border-slate-300/60">
            <button onclick="window.App.setRole('parent')"
              class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                this.currentRole === 'parent' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }">
              👨‍👩‍👧 Veli Portalı
            </button>
            <button onclick="window.App.setRole('personel')"
              class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                this.currentRole === 'personel' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }">
              🔒 Personel / Yönetici
            </button>
          </div>

          ${this.currentRole === 'personel' && this.isPersonnelAuthenticated ? `
            <button onclick="window.App.logoutPersonnel()" 
              class="text-xs text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition">
              Çıkış
            </button>
          ` : ''}
        </div>
      </div>

      ${this.currentRole === 'personel' && this.isPersonnelAuthenticated ? `
        <div class="border-t border-slate-200 bg-white shadow-xs">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto py-2">
            <button onclick="window.App.setPersonnelTab('yoklama')"
              class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                this.activePersonnelTab === 'yoklama'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }">
              📋 Yoklama Al & İncele
            </button>
            <button onclick="window.App.setPersonnelTab('performans')"
              class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                this.activePersonnelTab === 'performans'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }">
              ★ Performans & Notlar
            </button>
            <button onclick="window.App.setPersonnelTab('ogrenciler')"
              class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                this.activePersonnelTab === 'ogrenciler'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }">
              👥 Öğrenci & Aile Yönetimi
            </button>
            <button onclick="window.App.setPersonnelTab('ayarlar')"
              class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                this.activePersonnelTab === 'ayarlar'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }">
              ⚙️ Ayarlar & Bulut Yedekleme
            </button>
          </div>
        </div>
      ` : ''}
    `;
  },

  renderMainContent() {
    const main = document.getElementById('main-content');
    if (!main) return;

    if (this.currentRole === 'parent') {
      main.innerHTML = `<div id="parent-portal-container"></div>`;
      window.ParentPortal.init();
    } else {
      if (!this.isPersonnelAuthenticated) {
        this.openPinModal();
        return;
      }

      if (this.activePersonnelTab === 'yoklama') {
        main.innerHTML = `<div id="attendance-container"></div>`;
        window.AttendanceModule.init();
      } else if (this.activePersonnelTab === 'performans') {
        main.innerHTML = `<div id="performance-container"></div>`;
        window.PerformanceModule.init();
      } else if (this.activePersonnelTab === 'ogrenciler') {
        main.innerHTML = `<div id="students-container"></div>`;
        this.renderStudentsView();
      } else if (this.activePersonnelTab === 'ayarlar') {
        main.innerHTML = `<div id="settings-container"></div>`;
        this.renderSettingsView();
      }
    }
  },

  renderStudentsView() {
    const container = document.getElementById('students-container');
    if (!container) return;

    const classes = window.Store.getClasses();
    let students = window.Store.getStudents();

    if (this.studentFilterClass !== 'ALL') {
      students = students.filter(s => s.className === this.studentFilterClass);
    }
    if (this.studentSearchQuery) {
      students = students.filter(s =>
        s.firstName.toLowerCase().includes(this.studentSearchQuery) ||
        s.lastName.toLowerCase().includes(this.studentSearchQuery) ||
        s.studentNo.toString().includes(this.studentSearchQuery) ||
        (s.familyCode && s.familyCode.toLowerCase().includes(this.studentSearchQuery)) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(this.studentSearchQuery))
      );
    }

    container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-800 text-lg">Öğrenci ve Aile / Veli Kayıtları</h3>
            <p class="text-xs text-slate-500">Kardeşler aynı Aile / Veli Kodu altında tanımlanır</p>
          </div>

          <div class="flex items-center gap-3">
            <button onclick="window.App.openStudentModal()" 
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5">
              <span>+ Yeni Öğrenci Ekle</span>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div class="flex items-center gap-3">
            <div>
              <select onchange="window.App.studentFilterClass = this.value; window.App.renderStudentsView();"
                class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none">
                <option value="ALL">Tüm Sınıflar</option>
                ${classes.map(c => `<option value="${c}" ${this.studentFilterClass === c ? 'selected' : ''}>${c} Sınıfı</option>`).join('')}
              </select>
            </div>
            <div>
              <input type="text" placeholder="İsim, No, Veli veya Aile Kodu..." 
                value="${this.studentSearchQuery}"
                oninput="window.App.studentSearchQuery = this.value.toLowerCase().trim(); window.App.renderStudentsView();"
                class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none w-64">
            </div>
          </div>
          <span class="text-xs font-bold text-slate-500">Toplam ${students.length} Kayıt</span>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th class="py-3 px-4 text-center w-16">No</th>
                <th class="py-3 px-4">Öğrenci Adı</th>
                <th class="py-3 px-4">Sınıf</th>
                <th class="py-3 px-4">Ortak Aile / Veli Kodu</th>
                <th class="py-3 px-4">Anne & Baba Bilgisi</th>
                <th class="py-3 px-4">Veli İletişim</th>
                <th class="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm">
              ${students.length === 0 ? `
                <tr><td colspan="7" class="py-12 text-center text-slate-400">Kayıtlı öğrenci bulunamadı.</td></tr>
              ` : students.map(s => {
                const siblings = window.Store.getStudentsByFamilyCode(s.familyCode);
                const hasSiblings = siblings.length > 1;

                return `
                  <tr class="table-row-hover transition">
                    <td class="py-3 px-4 text-center font-bold text-slate-700">${s.studentNo}</td>
                    <td class="py-3 px-4">
                      <div class="font-bold text-slate-900">${s.firstName} ${s.lastName}</div>
                      ${hasSiblings ? `
                        <div class="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                          👨‍👦 ${siblings.length} Kardeş (${siblings.map(sib => sib.firstName).join(', ')})
                        </div>
                      ` : ''}
                    </td>
                    <td class="py-3 px-4">
                      <span class="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-bold text-xs">
                        ${s.className}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <span class="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        ${s.familyCode || '-'}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-600">
                      <div>Baba: <strong class="text-slate-800">${s.fatherName || '-'}</strong></div>
                      <div>Anne: <strong class="text-slate-800">${s.motherName || '-'}</strong></div>
                    </td>
                    <td class="py-3 px-4 text-xs font-medium text-slate-700">${s.parentPhone || '-'}</td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button onclick="window.App.openAddSiblingModal('${s.id}')"
                          title="Bu öğrenciye kardeş ekle (Aynı aile koduyla)"
                          class="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition">
                          + Kardeş
                        </button>
                        <button onclick="window.App.openStudentModal('${s.id}')"
                          class="p-1 text-slate-400 hover:text-slate-700 transition" title="Düzenle">✏️</button>
                        <button onclick="window.App.deleteStudent('${s.id}')"
                          class="p-1 text-slate-400 hover:text-rose-600 transition" title="Sil">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openStudentModal(studentId = null) {
    const modal = document.getElementById('student-modal');
    const title = document.getElementById('student-modal-title');
    const form = document.getElementById('student-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('modal-student-id').value = '';

    if (studentId) {
      const student = window.Store.getStudentById(studentId);
      if (student) {
        title.innerText = 'Öğrenci Bilgilerini Düzenle';
        document.getElementById('modal-student-id').value = student.id;
        document.getElementById('modal-student-no').value = student.studentNo;
        document.getElementById('modal-student-fn').value = student.firstName;
        document.getElementById('modal-student-ln').value = student.lastName;
        document.getElementById('modal-student-class').value = student.className;
        document.getElementById('modal-student-family').value = student.familyCode || '';
        document.getElementById('modal-student-father').value = student.fatherName || '';
        document.getElementById('modal-student-mother').value = student.motherName || '';
        document.getElementById('modal-student-phone').value = student.parentPhone || '';
        document.getElementById('modal-student-notes').value = student.notes || '';
      }
    } else {
      title.innerText = 'Yeni Öğrenci Ekle';
      const students = window.Store.getStudents();
      const maxNo = students.reduce((max, s) => Math.max(max, parseInt(s.studentNo) || 0), 100);
      document.getElementById('modal-student-no').value = maxNo + 1;
    }

    modal.classList.remove('hidden');
  },

  openAddSiblingModal(originalStudentId) {
    const orig = window.Store.getStudentById(originalStudentId);
    if (!orig) return;

    this.openStudentModal();
    const title = document.getElementById('student-modal-title');
    title.innerText = `${orig.firstName} İçin Kardeş Öğrenci Ekle`;

    document.getElementById('modal-student-ln').value = orig.lastName;
    document.getElementById('modal-student-family').value = orig.familyCode || (orig.lastName.toUpperCase() + '2026');
    document.getElementById('modal-student-father').value = orig.fatherName || '';
    document.getElementById('modal-student-mother').value = orig.motherName || '';
    document.getElementById('modal-student-phone').value = orig.parentPhone || '';
  },

  closeStudentModal() {
    const modal = document.getElementById('student-modal');
    if (modal) modal.classList.add('hidden');
  },

  saveStudentFromModal(event) {
    event.preventDefault();
    const id = document.getElementById('modal-student-id').value;
    const studentNo = document.getElementById('modal-student-no').value.trim();
    const firstName = document.getElementById('modal-student-fn').value.trim();
    const lastName = document.getElementById('modal-student-ln').value.trim();
    const className = document.getElementById('modal-student-class').value.trim();
    let familyCode = document.getElementById('modal-student-family').value.trim();
    const fatherName = document.getElementById('modal-student-father').value.trim();
    const motherName = document.getElementById('modal-student-mother').value.trim();
    const parentPhone = document.getElementById('modal-student-phone').value.trim();
    const notes = document.getElementById('modal-student-notes').value.trim();

    if (!familyCode) {
      familyCode = (lastName + '2026').toUpperCase();
    }

    const payload = { studentNo, firstName, lastName, className, familyCode, fatherName, motherName, parentPhone, notes };

    if (id) {
      window.Store.updateStudent(id, payload);
      this.showToast('Öğrenci bilgileri güncellendi.', 'success');
    } else {
      window.Store.addStudent(payload);
      this.showToast('Yeni öğrenci başarıyla kaydedildi!', 'success');
    }

    this.closeStudentModal();
    this.renderStudentsView();
  },

  deleteStudent(id) {
    const s = window.Store.getStudentById(id);
    if (!s) return;
    if (confirm(`"${s.firstName} ${s.lastName}" adlı öğrenciyi silmek istediğinizden emin misiniz?`)) {
      window.Store.deleteStudent(id);
      this.showToast('Öğrenci kaydı silindi.', 'info');
      this.renderStudentsView();
    }
  },

  // --- Ayarlar, Bulut ve Yedekleme Görünümü ---
  renderSettingsView() {
    const container = document.getElementById('settings-container');
    if (!container) return;

    const settings = window.Store.getSettings();
    const isCloud = window.CloudSync && window.CloudSync.isCloudActive;
    const existingFirebaseConfig = localStorage.getItem('yoklama_firebase_config') || '';

    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- 1. BULUT VERİTABANI (FIREBASE) AYARLARI -->
        <div class="bg-white rounded-2xl shadow-sm border-2 ${isCloud ? 'border-emerald-300' : 'border-indigo-200'} p-6">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">☁️</span>
              <div>
                <h3 class="font-bold text-slate-900 text-base">Google Firebase Bulut Veritabanı</h3>
                <p class="text-xs text-slate-500">Personel ve velilerin dünyanın her yerinden canlı veriye erişmesi için</p>
              </div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold ${isCloud ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
              ${isCloud ? '✓ Bulut Bağlantısı Aktif' : '○ Bağlantı Yapılmadı (Yerel Mod)'}
            </span>
          </div>

          <p class="text-xs text-slate-600 mb-4 leading-relaxed">
            Google Firebase'den aldığınız ücretsiz proje yapılandırmasını (config JSON) aşağıdaki kutuya yapıştırıp kaydediniz.
          </p>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Firebase Config (JSON veya Obje)</label>
              <textarea id="firebase-config-input" rows="4" placeholder='{"apiKey": "AIza...", "projectId": "kurs-yoklama-...", "authDomain": "..."}'
                class="w-full px-3 py-2 bg-slate-50 font-mono text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-none">${existingFirebaseConfig}</textarea>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button onclick="window.App.saveFirebaseConfig()" 
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow transition">
                Bağlantıyı Kaydet ve Aktif Et
              </button>
              ${isCloud ? `
                <button onclick="window.App.pushLocalToCloud()" 
                  class="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs transition">
                  ↑ Mevcut Öğrencileri Buluta Yükle
                </button>
                <button onclick="window.App.disconnectFirebase()" 
                  class="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition">
                  Bağlantıyı Kes
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- 2. Genel Kurum Ayarları -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 class="font-bold text-slate-800 text-base mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <span>⚙️</span> Kurum Bilgileri & Personel PIN Kodu
          </h3>

          <form onsubmit="window.App.saveSettingsSubmit(event)" class="space-y-4 max-w-lg">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">KURUM / KURS ADI</label>
              <input type="text" id="set-inst-name" value="${settings.institutionName}" required
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">PERSONEL GİRİŞ PIN KODU</label>
              <input type="text" id="set-pin" value="${settings.personnelPin}" maxlength="8" required
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-800 focus:outline-none">
            </div>

            <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition">
              Ayarları Kaydet
            </button>
          </form>
        </div>

        <!-- 3. Yedekleme & Geri Yükleme -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 class="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
            <span>💾</span> Manuel JSON Yedekleme
          </h3>
          <p class="text-xs text-slate-500 mb-5 leading-relaxed">
            Tüm kayıtları istediğiniz an bilgisayarınıza JSON dosyası olarak indirip saklayabilirsiniz.
          </p>

          <div class="flex flex-wrap items-center gap-4">
            <button onclick="window.App.downloadBackup()"
              class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2 transition">
              Yedek Dosyası İndir (JSON)
            </button>

            <label class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2 transition">
              Yedekten Geri Yükle
              <input type="file" id="backup-file-input" accept=".json" class="hidden" onchange="window.App.handleFileRestore(event)">
            </label>

            <button onclick="window.App.restoreDemoData()"
              class="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition">
              🔄 Örnek Demo Verileri Yeniden Yükle
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async saveFirebaseConfig() {
    const input = document.getElementById('firebase-config-input');
    if (!input || !input.value.trim()) {
      this.showToast('Lütfen geçerli bir Firebase config giriniz.', 'warning');
      return;
    }

    try {
      let raw = input.value.trim();
      // Eğer const firebaseConfig = { ... } şeklinde yapıştırıldıysa ayıkla
      if (raw.includes('{') && raw.includes('}')) {
        raw = raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      }
      const parsed = JSON.parse(raw);
      window.CloudSync.saveConfig(parsed);
      this.showToast('Bulut bağlantısı kaydedildi ve aktifleştirildi!', 'success');
      this.renderHeader();
      this.renderSettingsView();
    } catch (e) {
      this.showToast('Geçersiz JSON formatı. Lütfen Firebase Console kodunu doğru kopyalayınız.', 'error');
    }
  },

  async pushLocalToCloud() {
    if (!window.CloudSync.isCloudActive) return;
    this.showToast('Öğrenciler ve yoklama kayıtları buluta yükleniyor...', 'info');
    const ok = await window.CloudSync.pushAllToCloud();
    if (ok) {
      this.showToast('Tüm mevcut veriler Google Firebase bulutuna başarıyla yüklendi!', 'success');
    } else {
      this.showToast('Buluta yüklenirken bir hata oluştu.', 'error');
    }
  },

  disconnectFirebase() {
    if (confirm('Bulut bağlantısını kesmek istediğinizden emin misiniz?')) {
      window.CloudSync.clearConfig();
      this.showToast('Bulut bağlantısı kesildi. Yerel moda geçildi.', 'info');
      this.renderHeader();
      this.renderSettingsView();
    }
  },

  saveSettingsSubmit(event) {
    event.preventDefault();
    const instName = document.getElementById('set-inst-name').value.trim();
    const pin = document.getElementById('set-pin').value.trim();

    window.Store.saveSettings({ institutionName: instName, personnelPin: pin });
    this.showToast('Ayarlar başarıyla kaydedildi.', 'success');
    this.renderHeader();
  },

  downloadBackup() {
    const dataStr = window.Store.exportBackup();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yoklama_yedek_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Yedekleme dosyası indirildi.', 'success');
  },

  handleFileRestore(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = window.Store.importBackup(e.target.result);
      if (res.success) {
        this.showToast('Yedek başarıyla geri yüklendi!', 'success');
        this.renderHeader();
        this.renderMainContent();
      } else {
        this.showToast('Yedek yüklenirken hata: ' + res.error, 'error');
      }
    };
    reader.readAsText(file);
  },

  restoreDemoData() {
    if (confirm('Tüm mevcut veriler sıfırlanıp hazır örnek veriler yüklenecek. Onaylıyor musunuz?')) {
      window.Store.resetToDefaults();
      this.showToast('Örnek veriler yüklendi!', 'success');
      this.renderHeader();
      this.renderMainContent();
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast animate-fade-in text-white';

    if (type === 'success') {
      toast.style.backgroundColor = '#059669';
      toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
    } else if (type === 'error') {
      toast.style.backgroundColor = '#dc2626';
      toast.innerHTML = `<span>⚠️</span> <span>${message}</span>`;
    } else if (type === 'warning') {
      toast.style.backgroundColor = '#d97706';
      toast.innerHTML = `<span>⚡</span> <span>${message}</span>`;
    } else {
      toast.style.backgroundColor = '#4f46e5';
      toast.innerHTML = `<span>ℹ️</span> <span>${message}</span>`;
    }

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
