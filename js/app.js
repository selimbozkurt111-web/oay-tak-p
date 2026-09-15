/**
 * app.js - Tek Butonlu / Tek Girişli Arayüz ve 3 Seviyeli Rol Yönetimi
 */

window.App = {
  currentSession: null, // { role: 'superadmin'|'staff'|'parent', name, familyCode, students, canEditStudents, canManageStaff, canEditSettings }
  activeTab: 'yoklama', // 'yoklama', 'performans', 'ogrenciler', 'personel', 'ayarlar'
  studentFilterClass: 'ALL',
  studentSearchQuery: '',

  init() {
    // Kayıtlı oturum kontrolü
    const saved = sessionStorage.getItem('yoklama_active_session');
    if (saved) {
      try {
        this.currentSession = JSON.parse(saved);
      } catch {
        this.currentSession = null;
      }
    }

    this.renderHeader();
    this.renderMainContent();
  },

  // --- Tek Giriş Kutusu İşleyicisi ---
  handleUnifiedLogin(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('unified-login-input');
    if (!input || !input.value.trim()) return;

    const code = input.value.trim();
    const session = window.Store.resolveLoginCode(code);

    if (!session) {
      this.showToast('Geçersiz Kod veya Şifre! Lütfen kontrol ediniz.', 'error');
      input.select();
      return;
    }

    this.currentSession = session;
    sessionStorage.setItem('yoklama_active_session', JSON.stringify(session));

    if (session.role === 'superadmin') {
      this.activeTab = 'yoklama';
      this.showToast('Ana Yönetici (Müdür) olarak giriş yapıldı. Tam yetki aktif!', 'success');
    } else if (session.role === 'staff') {
      this.activeTab = 'yoklama';
      this.showToast(`Hoş geldiniz Sayın ${session.name} (Eğitmen Girişi)`, 'success');
    } else if (session.role === 'parent') {
      this.showToast(`Hoş geldiniz Sayın Veli (Aile Kodu: ${session.familyCode})`, 'success');
    }

    this.renderHeader();
    this.renderMainContent();
  },

  logout() {
    this.currentSession = null;
    sessionStorage.removeItem('yoklama_active_session');
    this.showToast('Güvenli çıkış yapıldı.', 'info');
    this.renderHeader();
    this.renderMainContent();
  },

  setTab(tab) {
    this.activeTab = tab;
    this.renderHeader();
    this.renderMainContent();
  },

  renderHeader() {
    const header = document.getElementById('header-nav');
    if (!header) return;

    const settings = window.Store.getSettings();

    // Eğer oturum yoksa sade üst başlık
    if (!this.currentSession) {
      header.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md">
              ÖT
            </div>
            <div>
              <h1 class="text-base font-black text-slate-900 tracking-tight leading-none">${settings.institutionName}</h1>
              <p class="text-[11px] text-slate-500 font-semibold mt-0.5">Yoklama, Devam & Performans Takip Sistemi</p>
            </div>
          </div>
          <span class="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
            🔒 Güvenli Ortak Giriş
          </span>
        </div>
      `;
      return;
    }

    // Oturum Açıksa: Rol rozeti ve rolüne göre sekmeler
    const session = this.currentSession;
    let roleBadge = '';
    if (session.role === 'superadmin') {
      roleBadge = `<span class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black text-xs border border-amber-300">👑 Ana Yönetici</span>`;
    } else if (session.role === 'staff') {
      roleBadge = `<span class="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-bold text-xs border border-blue-200">👨‍🏫 ${session.name}</span>`;
    } else {
      roleBadge = `<span class="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 font-bold text-xs border border-purple-200">👨‍👩‍👧 Veli Portalı (${session.familyCode})</span>`;
    }

    header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center shadow-sm">
            ÖT
          </div>
          <div>
            <h1 class="text-sm font-black text-slate-900 leading-none">${settings.institutionName}</h1>
            <div class="mt-1 flex items-center gap-2">
              ${roleBadge}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button onclick="window.App.logout()" 
            class="text-xs text-rose-600 hover:text-rose-700 font-bold px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 transition flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Çıkış Yap
          </button>
        </div>
      </div>

      <!-- Rolüne Göre Görünmesi Gereken Sekmeler -->
      ${session.role !== 'parent' ? `
        <div class="border-t border-slate-200 bg-white shadow-xs">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto py-2">
            <!-- Yoklama (Hem Ana Yönetici hem Personel görür) -->
            <button onclick="window.App.setTab('yoklama')"
              class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                this.activeTab === 'yoklama'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }">
              📋 Yoklama Al & İncele
            </button>

            <!-- Performans (Hem Ana Yönetici hem Personel görür) -->
            <button onclick="window.App.setTab('performans')"
              class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                this.activeTab === 'performans'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }">
              ★ Performans & Notlar
            </button>

            <!-- Öğrenci Yönetimi / Listesi -->
            <button onclick="window.App.setTab('ogrenciler')"
              class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                this.activeTab === 'ogrenciler'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }">
              👥 ${session.canEditStudents ? 'Öğrenci Yönetimi (Ekle/Çıkar)' : 'Öğrenci Listesi'}
            </button>

            <!-- SADECE ANA YÖNETİCİDE ÇIKAN SEKMELER: Personel ve Ayarlar -->
            ${session.canManageStaff ? `
              <button onclick="window.App.setTab('personel')"
                class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  this.activeTab === 'personel'
                    ? 'bg-amber-50 text-amber-800 border border-amber-300 font-black'
                    : 'text-slate-600 hover:bg-slate-50'
                }">
                👨‍🏫 Personel / Hoca Yönetimi
              </button>
            ` : ''}

            ${session.canEditSettings ? `
              <button onclick="window.App.setTab('ayarlar')"
                class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  this.activeTab === 'ayarlar'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }">
                ⚙️ Sistem Ayarları & Yedekleme
              </button>
            ` : ''}
          </div>
        </div>
      ` : ''}
    `;
  },

  renderMainContent() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // 1. Durum: Henüz giriş yapılmamışsa TEK GİRİŞ EKRANI
    if (!this.currentSession) {
      main.innerHTML = `
        <div class="max-w-md mx-auto py-12 px-4 animate-fade-in">
          <div class="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
            <div class="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl shadow-inner font-bold">
              🔑
            </div>
            <h2 class="text-2xl font-black text-slate-900 mb-2">Sisteme Giriş Yapınız</h2>
            <p class="text-xs text-slate-500 mb-6 leading-relaxed">
              Öğretmen, personel veya veli olarak size verilen <strong>Giriş Şifresini</strong> veya <strong>Aile Kodunu</strong> giriniz.
            </p>

            <!-- TEK KUTULU GİRİŞ FORMU -->
            <form onsubmit="window.App.handleUnifiedLogin(event)" class="space-y-4">
              <div>
                <label class="block text-left text-xs font-bold text-slate-700 mb-1.5 uppercase">ŞİFRE VEYA AİLE KODU</label>
                <input type="password" id="unified-login-input" required autofocus placeholder="Örn: 9999, 1234 veya Aile Kodu" 
                  class="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-center text-lg font-mono font-bold text-slate-800 tracking-wider focus:border-emerald-600 focus:bg-white focus:outline-none transition">
              </div>

              <button type="submit" 
                class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2">
                <span>Giriş Yap</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </button>
            </form>

            <!-- Hızlı Bilgi ve Yardım Kartı -->
            <div class="mt-8 pt-6 border-t border-slate-100 text-left text-xs space-y-2">
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">💡 Giriş Kılavuzu:</div>
              <div class="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 flex items-center justify-between">
                <div>👑 <strong>Ana Yönetici (Müdür):</strong> Şifre: <code class="font-bold">9999</code></div>
                <button onclick="document.getElementById('unified-login-input').value='9999'; window.App.handleUnifiedLogin();" class="text-[11px] text-amber-700 font-bold underline">Dene</button>
              </div>
              <div class="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 flex items-center justify-between">
                <div>👨‍🏫 <strong>Personel / Hoca:</strong> Şifre: <code class="font-bold">1234</code></div>
                <button onclick="document.getElementById('unified-login-input').value='1234'; window.App.handleUnifiedLogin();" class="text-[11px] text-blue-700 font-bold underline">Dene</button>
              </div>
              <div class="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 flex items-center justify-between">
                <div>👨‍👩‍👧 <strong>Veli Portalı:</strong> Aile Kodu (Örn: <code class="font-bold">KAYUMOGLU2026</code>)</div>
                <button onclick="document.getElementById('unified-login-input').value='KAYUMOGLU2026'; window.App.handleUnifiedLogin();" class="text-[11px] text-purple-700 font-bold underline">Dene</button>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // 2. Durum: Veli Girişi Yapılmışsa Veli Portalı
    if (this.currentSession.role === 'parent') {
      main.innerHTML = `<div id="parent-portal-container"></div>`;
      window.ParentPortal.init();
      return;
    }

    // 3. Durum: Yönetici veya Personel Girişi
    if (this.activeTab === 'yoklama') {
      main.innerHTML = `<div id="attendance-container"></div>`;
      window.AttendanceModule.init();
    } else if (this.activeTab === 'performans') {
      main.innerHTML = `<div id="performance-container"></div>`;
      window.PerformanceModule.init();
    } else if (this.activeTab === 'ogrenciler') {
      main.innerHTML = `<div id="students-container"></div>`;
      this.renderStudentsView();
    } else if (this.activeTab === 'personel') {
      main.innerHTML = `<div id="staff-container"></div>`;
      this.renderStaffView();
    } else if (this.activeTab === 'ayarlar') {
      main.innerHTML = `<div id="settings-container"></div>`;
      this.renderSettingsView();
    }
  },

  // --- Öğrenci Yönetimi / Listesi Görünümü ---
  renderStudentsView() {
    const container = document.getElementById('students-container');
    if (!container) return;

    const session = this.currentSession;
    const canEdit = session.canEditStudents; // Sadece Ana Yönetici
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
        (s.etutHocasi && s.etutHocasi.toLowerCase().includes(this.studentSearchQuery)) ||
        (s.dahiliHoca && s.dahiliHoca.toLowerCase().includes(this.studentSearchQuery)) ||
        (s.yatakhane && s.yatakhane.toLowerCase().includes(this.studentSearchQuery))
      );
    }

    container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-lg flex items-center gap-2">
              <span>👥 Öğrenci Kayıtları</span>
              ${!canEdit ? '<span class="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">(Salt Okunur Liste)</span>' : ''}
            </h3>
            <p class="text-xs text-slate-500">
              ${canEdit ? 'Öğrenci ekleme, silme ve düzenleme yetkisi sadece Ana Yöneticidedir.' : 'Eğitmenler öğrenci listesini inceleyebilir; silme/ekleme yetkisi Ana Yöneticidedir.'}
            </p>
          </div>

          <!-- Sadece Ana Yöneticide Çıkan Ekleme Butonları -->
          ${canEdit ? `
            <div class="flex items-center gap-2.5">
              <button onclick="window.App.openBulkImportModal()" 
                class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                <span>📋 Excel'den Toplu Ekle</span>
              </button>
              <button onclick="window.App.openStudentModal()" 
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5">
                <span>+ Yeni Öğrenci Ekle</span>
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Filtreleme Çubuğu -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div class="flex items-center gap-3">
            <div>
              <select onchange="window.App.studentFilterClass = this.value; window.App.renderStudentsView();"
                class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none">
                <option value="ALL">Tüm Sınıflar</option>
                ${classes.map(c => `<option value="${c}" ${this.studentFilterClass === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div>
              <input type="text" placeholder="İsim, No, Hoca veya Yatakhane ara..." 
                value="${this.studentSearchQuery}"
                oninput="window.App.studentSearchQuery = this.value.toLowerCase().trim(); window.App.renderStudentsView();"
                class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none w-72">
            </div>
          </div>
          <span class="text-xs font-bold text-slate-500">Toplam ${students.length} Öğrenci</span>
        </div>
      </div>

      <!-- Öğrenci Tablosu -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th class="py-3 px-4 text-center w-16">No</th>
                <th class="py-3 px-4">Öğrenci Adı Soyadı</th>
                <th class="py-3 px-4">Sınıfı</th>
                <th class="py-3 px-4">Etüt Hocası</th>
                <th class="py-3 px-4">Dahili (Dini) Hocası</th>
                <th class="py-3 px-4">Yatakhane</th>
                <th class="py-3 px-4">Aile / Veli Kodu</th>
                ${canEdit ? '<th class="py-3 px-4 text-right">İşlemler</th>' : ''}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm">
              ${students.length === 0 ? `
                <tr><td colspan="${canEdit ? 8 : 7}" class="py-12 text-center text-slate-400">Kayıtlı öğrenci bulunamadı.</td></tr>
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
                    <td class="py-3 px-4 text-xs font-medium text-slate-700">${s.etutHocasi || '-'}</td>
                    <td class="py-3 px-4 text-xs font-medium text-slate-700">${s.dahiliHoca || '-'}</td>
                    <td class="py-3 px-4 text-xs font-medium text-indigo-800">${s.yatakhane || '-'}</td>
                    <td class="py-3 px-4">
                      <span class="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        ${s.familyCode || '-'}
                      </span>
                    </td>
                    ${canEdit ? `
                      <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <button onclick="window.App.openAddSiblingModal('${s.id}')"
                            title="Bu öğrenciye kardeş ekle"
                            class="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition">
                            + Kardeş
                          </button>
                          <button onclick="window.App.openStudentModal('${s.id}')"
                            class="p-1 text-slate-400 hover:text-slate-700 transition" title="Düzenle">✏️</button>
                          <button onclick="window.App.deleteStudent('${s.id}')"
                            class="p-1 text-slate-400 hover:text-rose-600 transition" title="Sil">🗑️</button>
                        </div>
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // --- SADECE ANA YÖNETİCİYE ÖZEL: Personel / Hoca Yönetimi ---
  renderStaffView() {
    const container = document.getElementById('staff-container');
    if (!container) return;

    if (!this.currentSession.canManageStaff) {
      container.innerHTML = `<div class="p-8 text-center text-rose-600 font-bold">Bu sayfaya erişim yetkiniz bulunmamaktadır.</div>`;
      return;
    }

    const staffList = window.Store.getStaff();

    container.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 class="font-black text-slate-900 text-lg flex items-center gap-2">
                <span>👨‍🏫 Eğitmen & Personel Kadrosu</span>
              </h3>
              <p class="text-xs text-slate-500">
                Sistemde yoklama alabilecek ve not girebilecek hocaları ekleyebilir veya çıkarabilirsiniz.
              </p>
            </div>

            <button onclick="window.App.openStaffModal()" 
              class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5">
              <span>+ Yeni Personel / Hoca Ekle</span>
            </button>
          </div>

          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase">
                  <th class="py-3 px-4">Hoca Adı Soyadı</th>
                  <th class="py-3 px-4">Görevi / Alanı</th>
                  <th class="py-3 px-4">Telefon</th>
                  <th class="py-3 px-4">Giriş PIN Kodu</th>
                  <th class="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-sm">
                ${staffList.map(stf => `
                  <tr class="table-row-hover transition">
                    <td class="py-3 px-4 font-bold text-slate-900">${stf.fullName}</td>
                    <td class="py-3 px-4 text-xs text-slate-600">${stf.role}</td>
                    <td class="py-3 px-4 text-xs font-mono text-slate-700">${stf.phone || '-'}</td>
                    <td class="py-3 px-4 font-mono font-bold text-emerald-700">${stf.pin || '1234'}</td>
                    <td class="py-3 px-4 text-right">
                      <button onclick="window.App.deleteStaff('${stf.id}')" 
                        class="text-xs text-rose-600 hover:text-rose-800 font-bold p-1 transition" title="Personeli Çıkar">
                        Çıkar 🗑️
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  openStaffModal() {
    const name = prompt('Eklemek istediğiniz Eğitmenin Adı ve Soyadı:');
    if (!name || !name.trim()) return;
    const role = prompt('Görevi (Örn: 5. Sınıf Etüt Hocası):', 'Etüt & Dahili Hocası');
    const pin = prompt('Giriş yaparken kullanacağı 4 haneli PIN Kodu:', '1234');

    window.Store.addStaff({
      fullName: name.trim().toUpperCase(),
      role: role ? role.trim() : 'Eğitmen',
      pin: pin ? pin.trim() : '1234'
    });

    this.showToast(`${name} başarıyla personel listesine eklendi!`, 'success');
    this.renderStaffView();
  },

  deleteStaff(id) {
    if (confirm('Bu personeli sistemden çıkarmak istediğinizden emin misiniz?')) {
      window.Store.deleteStaff(id);
      this.showToast('Personel çıkarıldı.', 'info');
      this.renderStaffView();
    }
  },

  // --- SADECE ANA YÖNETİCİYE ÖZEL: Sistem Ayarları & Şifre Değiştirme ---
  renderSettingsView() {
    const container = document.getElementById('settings-container');
    if (!container) return;

    if (!this.currentSession.canEditSettings) {
      container.innerHTML = `<div class="p-8 text-center text-rose-600 font-bold">Bu sayfaya erişim yetkiniz bulunmamaktadır.</div>`;
      return;
    }

    const settings = window.Store.getSettings();

    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-6">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 class="font-bold text-slate-800 text-base mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <span>⚙️</span> Kurum Bilgileri & Sistem Şifreleri (Sadece Ana Yönetici)
          </h3>

          <form onsubmit="window.App.saveSettingsSubmit(event)" class="space-y-4 max-w-lg">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">KURUM / KURS ADI</label>
              <input type="text" id="set-inst-name" value="${settings.institutionName}" required
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-black text-amber-900 mb-1 uppercase">👑 ANA YÖNETİCİ (MÜDÜR) GİRİŞ ŞİFRESİ</label>
              <input type="text" id="set-super-pin" value="${settings.superadminPin}" maxlength="12" required
                class="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm font-mono font-black text-amber-900 focus:outline-none">
              <span class="text-[11px] text-slate-400">Tüm yetkilere sahip tek ana şifre.</span>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">👨‍🏫 GENEL PERSONEL / HOCA GİRİŞ ŞİFRESİ</label>
              <input type="text" id="set-staff-pin" value="${settings.staffPin}" maxlength="12" required
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-800 focus:outline-none">
              <span class="text-[11px] text-slate-400">Hocaların sadece yoklama ve not girmek için kullanacağı şifre.</span>
            </div>

            <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition">
              Şifreleri ve Ayarları Kaydet
            </button>
          </form>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 class="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
            <span>💾</span> Veri Yedekleme ve Kurtarma
          </h3>
          <p class="text-xs text-slate-500 mb-5 leading-relaxed">
            Tüm öğrencileri, yoklamaları ve öğretmen listesini tek dosya olarak bilgisayarınıza indirebilirsiniz.
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
          </div>
        </div>
      </div>
    `;
  },

  saveSettingsSubmit(event) {
    event.preventDefault();
    const instName = document.getElementById('set-inst-name').value.trim();
    const superPin = document.getElementById('set-super-pin').value.trim();
    const staffPin = document.getElementById('set-staff-pin').value.trim();

    window.Store.saveSettings({
      institutionName: instName,
      superadminPin: superPin,
      staffPin: staffPin
    });

    this.showToast('Sistem ayarları ve şifreler başarıyla güncellendi.', 'success');
    this.renderHeader();
  },

  downloadBackup() {
    const dataStr = window.Store.exportBackup();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kurs_yedek_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Yedek dosyası indirildi.', 'success');
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
        this.showToast('Yedek yükleme hatası: ' + res.error, 'error');
      }
    };
    reader.readAsText(file);
  },

  // --- Excel'den Toplu Öğrenci Ekleme Modalı ---
  openBulkImportModal() {
    const modal = document.getElementById('bulk-import-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeBulkImportModal() {
    const modal = document.getElementById('bulk-import-modal');
    if (modal) modal.classList.add('hidden');
  },

  handleBulkPasteImport() {
    const text = document.getElementById('bulk-paste-textarea').value.trim();
    if (!text) {
      this.showToast('Lütfen Excel veya metin listesini yapıştırınız.', 'warning');
      return;
    }

    const lines = text.split('\n');
    const newStudents = [];

    lines.forEach(line => {
      const parts = line.split('\t').map(p => p.trim());
      if (parts.length >= 2 && parts[1]) {
        const no = parts[0] || (Math.floor(Math.random() * 900) + 100).toString();
        const fullName = parts[1];
        const nameParts = fullName.split(' ');
        const lastName = nameParts.pop() || '';
        const firstName = nameParts.join(' ') || fullName;

        newStudents.push({
          studentNo: no,
          firstName: firstName,
          lastName: lastName,
          className: parts[2] || 'Genel Sınıf',
          school: parts[3] || '-',
          seviye: parts[4] || 'Seviye 1',
          etutHocasi: parts[5] || '-',
          dahiliHoca: parts[6] || '-',
          familyCode: (lastName ? lastName + '2026' : 'AILE2026').toUpperCase()
        });
      }
    });

    if (newStudents.length === 0) {
      this.showToast('Uygun öğrenci satırı bulunamadı.', 'error');
      return;
    }

    const current = window.Store.getStudents();
    newStudents.forEach(ns => {
      current.push({ ...ns, id: 'std_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4) });
    });
    window.Store.saveStudents(current);

    this.showToast(`${newStudents.length} öğrenci başarıyla sisteme aktarıldı!`, 'success');
    this.closeBulkImportModal();
    this.renderStudentsView();
  },

  // --- Tekil Öğrenci Modal İşlemleri ---
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
        document.getElementById('modal-student-etut').value = student.etutHocasi || '';
        document.getElementById('modal-student-dahili').value = student.dahiliHoca || '';
        document.getElementById('modal-student-yatakhane').value = student.yatakhane || '';
        document.getElementById('modal-student-father').value = student.fatherName || '';
        document.getElementById('modal-student-phone').value = student.parentPhone || '';
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
    const etutHocasi = document.getElementById('modal-student-etut').value.trim();
    const dahiliHoca = document.getElementById('modal-student-dahili').value.trim();
    const yatakhane = document.getElementById('modal-student-yatakhane').value.trim();
    const fatherName = document.getElementById('modal-student-father').value.trim();
    const parentPhone = document.getElementById('modal-student-phone').value.trim();

    if (!familyCode) {
      familyCode = (lastName + '2026').toUpperCase();
    }

    const payload = { studentNo, firstName, lastName, className, familyCode, etutHocasi, dahiliHoca, yatakhane, fatherName, parentPhone };

    if (id) {
      window.Store.updateStudent(id, payload);
      this.showToast('Öğrenci güncellendi.', 'success');
    } else {
      window.Store.addStudent(payload);
      this.showToast('Öğrenci kaydedildi!', 'success');
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
