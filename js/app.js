/**
 * app.js - Ad Soyad + Şifre Girişi ve E-postalı Ana Yönetici Doğrulama Sistemi
 */

window.App = {
  currentSession: null,
  activeTab: 'yoklama',
  loginMode: 'user', // 'user' (Ad Soyad + Şifre) veya 'admin_otp' (E-posta ile Doğrulama)
  loginTab: 'parent', // 'parent' (Veli) veya 'staff' (Eğitmen)
  otpStep: 'request', // 'request' (mail yazma) veya 'verify' (kodu girme)
  adminEmailDraft: '',
  showAdminOtpOnScreen: true, // Kodu ekranda gösterme tercihi
  lastGeneratedAdminOtp: '',
  studentFilterClass: 'ALL',
  studentFilterStatus: 'ALL', // 'ALL' | 'ACTIVE' | 'PASSIVE'
  studentSearchQuery: '',

  init() {
    const saved = sessionStorage.getItem('yoklama_active_session') || localStorage.getItem('yoklama_active_session');
    if (saved) {
      try {
        sessionStorage.setItem('yoklama_active_session', saved);
        this.currentSession = JSON.parse(saved);
        if (this.currentSession && (this.currentSession.role === 'superadmin' || this.currentSession.staffId === 'stf_1' || (this.currentSession.name && this.currentSession.name.toUpperCase().includes('SELİM BOZKURT')))) {
          this.currentSession.role = 'superadmin';
          this.currentSession.canEditStudents = true;
          this.currentSession.canManageStaff = true;
          this.currentSession.canEditSettings = true;
          if (this.activeTab === 'yoklama') {
            this.activeTab = 'ogrenciler_excel';
          }
        }
      } catch {
        this.currentSession = null;
      }
    }

    this.renderHeader();
    this.renderMainContent();

    // Bulut senkronizasyonu tamamlandığında ekranı sessizce ve kesintisiz tazele
    window.addEventListener('cloud-sync-done', () => {
      this.renderHeader();
      if (this.currentSession) {
        if (this.activeTab === 'izin_donusu' && window.LeaveReturnModule) {
          if (typeof window.LeaveReturnModule.refreshSettings === 'function') {
            window.LeaveReturnModule.refreshSettings();
          }
          window.LeaveReturnModule.renderView();
        } else if (this.activeTab === 'izin_cikis' && window.LeaveTrackerModule) {
          window.LeaveTrackerModule.renderView();
        } else if (this.activeTab === 'yoklama' && window.AttendanceModule) {
          window.AttendanceModule.renderView();
        } else if (this.activeTab !== 'ogrenciler_excel') {
          this.renderMainContent();
        }
      }
    });

    // Başka sekmede/pencerede yapılan kayıtları anında algıla
    window.addEventListener('storage', (e) => {
      if (e.key === 'yoklama_leave_returns_v1' || e.key === 'yoklama_settings' || e.key === 'yoklama_attendance') {
        window.dispatchEvent(new CustomEvent('cloud-sync-done'));
      }
    });

    // Eğer Firebase URL tanımlıysa sayfa açıldığında buluttan en güncel veriyi çek ve canlı dinleyiciyi başlat
    if (window.Store && window.Store.isCloudEnabled()) {
      // 1. Canlı Gerçek Zamanlı SSE Dinleyiciyi Başlat (Anında Değişim)
      if (typeof window.Store.initRealtimeListener === 'function') {
        window.Store.initRealtimeListener();
      }

      // 2. İlk açılışta verileri çek
      window.Store.syncFromCloud().then(res => {
        if (res && res.success) {
          console.log('[CloudSync] İlk senkronizasyon başarılı:', res.message);
        }
      });

      // 3. Kullanıcı sayfaya geri döndüğünde (sekme değişimi / ekran kilidi açılışı) hemen eşitle
      window.addEventListener('focus', () => {
        window.Store.syncFromCloud();
        this.checkAndTriggerYatakReminder();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && window.Store.isCloudEnabled()) {
          window.Store.syncFromCloud();
        }
      });

      // 4. Kesintisiz yedek kalp atışı (Her 10 saniyede bir hızlı kontrol)
      setInterval(() => {
        if (window.Store.isCloudEnabled()) {
          window.Store.syncFromCloud();
        }
        this.checkAndTriggerYatakReminder();
      }, 10000);
    }

    // Yatak kontrolü zamanlayıcısını sayfa açılışında da bir kez denetle
    this.checkAndTriggerYatakReminder();
  },

  // --- Kurs Logosu / Fotoğrafı Otomatik Aday Bulma ve Hata Yönetimi ---
  handleLogoError(img, fallbackId) {
    if (!img) return;
    const candidates = [
      'kurs_logo.jpg', 'kurs_logo.png', 'kurs_logo.jpeg',
      'kurs_logo.JPG', 'kurs_logo.PNG',
      'kurs_logo.jpg.jpg', 'kurs_logo.png.png',
      'js/kurs_logo.jpg', 'js/kurs_logo.png',
      'kurs.jpg', 'kurs.png', 'kurs.jpeg',
      'logo.png', 'logo.jpg', 'logo.jpeg',
      'bina.jpg', 'bina.png',
      'media_1789552804483.jpg'
    ];
    const currentSrc = img.getAttribute('src') || '';

    // Eğer base64 veya farklı bir tam URL ise ve yüklenemediyse fallback yap
    if (currentSrc.startsWith('data:') || (currentSrc.startsWith('http') && !candidates.some(c => currentSrc.endsWith(c)))) {
      img.style.display = 'none';
      if (fallbackId) {
        const fb = document.getElementById(fallbackId);
        if (fb) fb.classList.remove('hidden');
      } else if (img.nextElementSibling) {
        img.nextElementSibling.classList.remove('hidden');
      }
      return;
    }

    // Sıradaki dosya adayını bul ve dene
    let currentCandidate = '';
    for (const c of candidates) {
      if (currentSrc.endsWith(c)) {
        currentCandidate = c;
        break;
      }
    }

    const currentIdx = currentCandidate ? candidates.indexOf(currentCandidate) : -1;
    const nextIdx = currentIdx + 1;

    if (nextIdx < candidates.length) {
      img.src = candidates[nextIdx];
    } else {
      img.style.display = 'none';
      if (fallbackId) {
        const fb = document.getElementById(fallbackId);
        if (fb) fb.classList.remove('hidden');
      } else if (img.nextElementSibling) {
        img.nextElementSibling.classList.remove('hidden');
      }
    }
  },

  // --- Ayarlarda Yüklenen/Seçilen Resmi GitHub İçin kurs_logo.jpg Olarak İndirme ---
  downloadCurrentLogo() {
    const settings = window.Store.getSettings();
    const preview = document.getElementById('settings-logo-preview');
    const src = (preview && preview.src && preview.style.display !== 'none') ? preview.src : settings.institutionLogo;
    if (!src || src.includes('undefined')) {
      this.showToast('Önce bilgisayarınızdan veya telefonunuzdan bir fotoğraf seçiniz.', 'warning');
      return;
    }
    const a = document.createElement('a');
    a.href = src;
    a.download = 'kurs_logo.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast('kurs_logo.jpg başarıyla indirildi! GitHub yükleme sayfasından bu dosyayı yükleyiniz.', 'success');
  },

  // --- Kullanıcı Girişi (Veli & Personel / Hoca İçin Tek Ekran) ---
  handleUserLogin(event) {
    if (event) event.preventDefault();
    const nameInput = document.getElementById('login-fullname');
    const passInput = document.getElementById('login-password');

    if (!nameInput) return;
    const name = nameInput.value.trim();
    const pass = passInput ? passInput.value.trim() : '';

    if (!name) {
      this.showToast('Lütfen Ad Soyad, Öğrenci No veya Eğitmen Adınızı giriniz.', 'warning');
      nameInput.focus();
      return;
    }

    if (!pass) {
      this.showToast('Lütfen şifrenizi giriniz.', 'warning');
      if (passInput) passInput.focus();
      return;
    }

    const session = window.Store.authenticateUser(name, pass);

    if (!session) {
      this.showToast('Girdiğiniz bilgiler veya şifre hatalıdır. Lütfen kontrol edip tekrar deneyiniz.', 'error');
      if (passInput) passInput.select();
      return;
    }

    this.currentSession = session;
    sessionStorage.setItem('yoklama_active_session', JSON.stringify(session));
    localStorage.setItem('yoklama_active_session', JSON.stringify(session));

    if (session.role === 'superadmin' || session.staffId === 'stf_1' || (session.name && session.name.toUpperCase().includes('SELİM BOZKURT'))) {
      this.activeTab = 'ogrenciler_excel';
      this.showToast(`👑 Hoş geldiniz Sayın Kurum Müdürü ${session.name}! Canlı Excel Tablosu açıldı.`, 'success');
    } else if (session.role === 'staff') {
      this.activeTab = 'yoklama';
      this.showToast(`Hoş geldiniz Sayın ${session.name}`, 'success');
    } else if (session.role === 'parent') {
      this.showToast(`Hoş geldiniz Sayın Veli`, 'success');
    }

    this.renderHeader();
    this.renderMainContent();
  },


  // --- Ana Yönetici E-posta Doğrulama Kodu İsteği ---
  handleAdminOtpRequest(event) {
    if (event) event.preventDefault();
    const emailInput = document.getElementById('admin-email-input');
    const email = (emailInput ? emailInput.value : this.adminEmailDraft || '').trim();
    if (!email) return;

    const res = window.Store.generateAdminOtp(email);

    if (!res.success) {
      this.showToast(res.message, 'error');
      return;
    }

    // Arka planda gerçek e-posta gönderimini başlat (kullanıcıyı bekletmeden)
    try {
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `🔑 [GİRİŞ KODU: ${res.code}] - Ömer Avniyel Akademi`,
          "Yönetici": "Selim Bozkurt",
          "Alıcı E-Posta": email,
          "Giriş Doğrulama Kodu": res.code,
          "Açıklama": `Sayın Selim Bozkurt,\n\nÖmer Avniyel Akademi Ana Yönetici girişi için tek kullanımlık güvenlik kodunuz:\n\n👉  ${res.code}  👈\n\nBu kod 10 dakika geçerlidir.`,
          _captcha: "false",
          _template: "table"
        })
      }).catch(err => console.warn('E-posta servis bildirimi:', err));
    } catch (err) {
      console.warn('E-posta isteği:', err);
    }

    this.adminEmailDraft = email;
    this.lastGeneratedAdminOtp = res.code;
    this.showAdminOtpOnScreen = true; // Kodu hemen ekranda da göster
    this.otpStep = 'verify';

    this.showToast(`🔑 Giriş Kodunuz: ${res.code} (Ayrıca e-postanıza gönderildi)`, 'success');
    this.renderMainContent();
  },

  // Ekranda Kod Göster / Gizle Açma Kapama Anahtarı
  toggleShowAdminOtp() {
    this.showAdminOtpOnScreen = !this.showAdminOtpOnScreen;
    this.renderMainContent();
  },

  // Tek Tıkla Kodu Doldur ve Sisteme Gir
  fillAdminOtpAndSubmit(code) {
    const activeCode = code || this.lastGeneratedAdminOtp || (window.Store && window.Store.getActiveAdminOtpCode()) || '';
    const codeInput = document.getElementById('admin-otp-code-input');
    if (codeInput && activeCode) {
      codeInput.value = activeCode;
    }
    this.handleAdminOtpVerify();
  },

  // --- Ana Yönetici Kodu Doğrulama ve Giriş ---
  handleAdminOtpVerify(event) {
    if (event) event.preventDefault();
    const codeInput = document.getElementById('admin-otp-code-input');
    let code = (codeInput && codeInput.value ? codeInput.value : '').trim();
    if (!code) {
      code = (this.lastGeneratedAdminOtp || (window.Store && window.Store.getActiveAdminOtpCode()) || '').trim();
    }
    if (!code) {
      this.showToast('Lütfen 6 haneli doğrulama kodunu giriniz.', 'warning');
      if (codeInput) codeInput.focus();
      return;
    }

    const res = window.Store.verifyAdminOtp(code);

    if (!res.success) {
      this.showToast(res.message, 'error');
      if (codeInput) codeInput.select();
      return;
    }

    this.currentSession = res.session;
    sessionStorage.setItem('yoklama_active_session', JSON.stringify(res.session));
    localStorage.setItem('yoklama_active_session', JSON.stringify(res.session));
    this.loginMode = 'user';
    this.otpStep = 'request';
    this.lastGeneratedAdminOtp = '';
    this.activeTab = 'ogrenciler_excel';

    this.showToast('E-posta doğrulaması başarılı! Ana Yönetici olarak giriş yapıldı.', 'success');
    this.renderHeader();
    this.renderMainContent();
  },

  logout() {
    this.currentSession = null;
    sessionStorage.removeItem('yoklama_active_session');
    localStorage.removeItem('yoklama_active_session');
    localStorage.removeItem('pano_admin_authorized');
    this.loginMode = 'user';
    this.otpStep = 'request';
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

    if (!this.currentSession) {
      header.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md">
              ${settings.institutionLogo ? `
                <img src="${settings.institutionLogo}" alt="Logo" class="w-full h-full object-cover bg-white"
                  onerror="window.App.handleLogoError(this)">
                <div class="hidden w-full h-full bg-emerald-600 text-white font-black text-lg flex items-center justify-center">ÖT</div>
              ` : `
                <div class="w-full h-full bg-emerald-600 text-white font-black text-lg flex items-center justify-center">ÖT</div>
              `}
            </div>
            <div>
              <h1 class="text-base font-black text-slate-900 tracking-tight leading-none">${settings.institutionName}</h1>
            </div>
          </div>
          <span class="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
            🔒 Güvenli Portal
          </span>
        </div>
      `;
      return;
    }

    const session = this.currentSession;
    let roleBadge = '';
    if (session.role === 'superadmin') {
      roleBadge = `<span class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black text-xs border border-amber-300 whitespace-nowrap">👑 Ana Yönetici (Müdür)</span>`;
    } else if (session.role === 'staff') {
      roleBadge = `<span class="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-bold text-xs border border-blue-200 whitespace-nowrap">👨‍🏫 ${session.name}</span>`;
    } else {
      roleBadge = `<span class="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 font-bold text-xs border border-purple-200 whitespace-nowrap">👨‍👩‍👧 Veli Portalı (${session.familyCode})</span>`;
    }

    let activeTitle = '📋 Yoklama';
    if (this.activeTab === 'yoklama') {
      const cat = (window.AttendanceModule && window.AttendanceModule.currentCategory) || 'namaz';
      if (cat === 'namaz') activeTitle = '🕌 Namaz Yoklaması';
      else if (cat === 'yatak') activeTitle = '🛏️ Yatak Yoklaması';
      else if (cat === 'okul_donusu') activeTitle = '🎒 Okul Dönüşü';
      else if (cat === 'namaz_rapor') activeTitle = '📊 Namaz Raporları';
    } else if (this.activeTab === 'akademi' || this.activeTab === 'performans') {
      let filterLabel = 'Tümü';
      if (window.AkademiModule) {
        if (window.AkademiModule.selectedEtut && window.AkademiModule.selectedEtut !== 'ALL') {
          const etut = typeof window.AkademiModule.getEtutSubeleri === 'function' ? window.AkademiModule.getEtutSubeleri().find(e => e.id === window.AkademiModule.selectedEtut) : null;
          filterLabel = etut ? etut.label : 'Etüt';
        } else if (window.AkademiModule.selectedGrade && window.AkademiModule.selectedGrade !== 'ALL') {
          filterLabel = `${window.AkademiModule.selectedGrade}. Sınıf`;
        }
      }
      const sub = (window.AkademiModule && window.AkademiModule.currentSubCategory === 'genel') ? 'Genel Karne' : 'Takviye Notları';
      activeTitle = `📚 Akademi • ${sub} (${filterLabel})`;
    } else if (this.activeTab === 'testler' || this.activeTab === 'test_sonuclari') {
      let filterLabel = 'Tümü';
      if (window.TestResultsModule) {
        if (window.TestResultsModule.selectedEtut && window.TestResultsModule.selectedEtut !== 'ALL') {
          const etut = typeof window.TestResultsModule.getEtutSubeleri === 'function' ? window.TestResultsModule.getEtutSubeleri().find(e => e.id === window.TestResultsModule.selectedEtut) : null;
          filterLabel = etut ? etut.label : 'Etüt';
        } else if (window.TestResultsModule.selectedGrade && window.TestResultsModule.selectedGrade !== 'ALL') {
          filterLabel = `${window.TestResultsModule.selectedGrade}. Sınıf`;
        }
      }
      activeTitle = `📝 Test & Etüt (${filterLabel})`;
    } else if (this.activeTab === 'leaderboard') {
      activeTitle = '🏆 Haftanın & Ayın Talebesi';
    } else if (this.activeTab === 'izin_cikis') {
      activeTitle = '🚪 İzine Çıkış Takibi';
    } else if (this.activeTab === 'izin_donusu') {
      activeTitle = '🧳 İzin Dönüşü Takibi';
    } else if (this.activeTab === 'ogrenciler') {
      activeTitle = '👥 Öğrenci Yönetimi';
    } else if (this.activeTab === 'ogrenciler_excel') {
      activeTitle = '📊 Canlı Excel Tablosu';
    } else if (this.activeTab === 'personel') {
      activeTitle = '👨‍🏫 Personel Yönetimi';
    } else if (this.activeTab === 'ayarlar') {
      activeTitle = '⚙️ Sistem Ayarları';
    }

    // SOLDAN SAĞA SIRASIYLA: 1. MENÜ, 2. FOTOĞRAF, 3. AD SOYAD, 4. YOKLAMA VS.
    header.innerHTML = `
      <div class="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
        ${session.role !== 'parent' ? `
          <!-- 1. MENÜ BUTONU -->
          <button onclick="window.App.openDrawer()" 
            class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 flex-shrink-0">
            <span class="text-sm leading-none">☰</span>
            <span>Menü</span>
          </button>
        ` : ''}

        <!-- 2. KURS GÖRSELİ -->
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs border border-slate-200 bg-white">
          ${settings.institutionLogo ? `
            <img src="${settings.institutionLogo}" alt="Logo" class="w-full h-full object-cover"
              onerror="window.App.handleLogoError(this)">
            <div class="hidden w-full h-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">🏛️</div>
          ` : `
            <div class="w-full h-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">🏛️</div>
          `}
        </div>

        <!-- 3. AD SOYAD -->
        <div class="flex-shrink-0">
          ${roleBadge}
        </div>

        <!-- 4. HANGİ SAYFADAYSAK O (YOKLAMA VS.) -->
        ${session.role !== 'parent' ? `
          <div class="flex-shrink-0">
            <span class="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-900 font-black text-xs border border-emerald-300 shadow-2xs whitespace-nowrap flex items-center gap-1">
              ${activeTitle}
            </span>
          </div>
        ` : ''}

        <!-- 5. SADECE YÖNETİCİ: ÜST BARDA DOĞRUDAN CANLI EXCEL TABLOSU BUTONU -->
        ${(session.role === 'superadmin' || session.canEditStudents || session.staffId === 'stf_1' || (session.name && session.name.toUpperCase().includes('SELİM BOZKURT'))) ? `
          <div class="flex-shrink-0 ml-auto">
            <button onclick="window.App.setTab('ogrenciler_excel')" 
              class="px-3.5 py-1.5 rounded-xl ${this.activeTab === 'ogrenciler_excel' ? 'bg-emerald-900 ring-2 ring-emerald-400 text-white font-black' : 'bg-emerald-600 hover:bg-emerald-700 text-white font-black'} text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm">
              <span>📊 Canlı Excel Tablosu</span>
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },

  // --- Soldan Kayar Pencere (Left Off-Canvas Drawer) Kontrolleri ---
  openDrawer() {
    this.renderDrawer();
    const container = document.getElementById('side-drawer-container');
    const backdrop = document.getElementById('side-drawer-backdrop');
    const panel = document.getElementById('side-drawer-panel');
    if (!container || !backdrop || !panel) return;

    container.classList.remove('pointer-events-none');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100', 'pointer-events-auto');
    panel.classList.remove('-translate-x-full');
    panel.classList.add('translate-x-0');
  },

  closeDrawer() {
    const container = document.getElementById('side-drawer-container');
    const backdrop = document.getElementById('side-drawer-backdrop');
    const panel = document.getElementById('side-drawer-panel');
    if (!container || !backdrop || !panel) return;

    panel.classList.remove('translate-x-0');
    panel.classList.add('-translate-x-full');
    backdrop.classList.remove('opacity-100', 'pointer-events-auto');
    backdrop.classList.add('opacity-0', 'pointer-events-none');

    setTimeout(() => {
      container.classList.add('pointer-events-none');
    }, 300);
  },

  navigateFromDrawer(tab, category = null, targetClass = null) {
    this.closeDrawer();
    this.activeTab = tab;
    if (tab === 'yoklama' && category && window.AttendanceModule) {
      window.AttendanceModule.currentCategory = category;
    }
    if (tab === 'akademi' || tab === 'performans') {
      if (category && window.AkademiModule) {
        window.AkademiModule.currentSubCategory = category;
      }
      if (window.AkademiModule) {
        if (targetClass && targetClass.startsWith('GRADE_')) {
          window.AkademiModule.selectedGrade = targetClass.replace('GRADE_', '');
          window.AkademiModule.selectedEtut = 'ALL';
        }
      }
    }
    if (tab === 'testler' || tab === 'test_sonuclari') {
      if (window.TestResultsModule) {
        if (targetClass && targetClass.startsWith('GRADE_')) {
          window.TestResultsModule.selectedGrade = targetClass.replace('GRADE_', '');
          window.TestResultsModule.selectedEtut = 'ALL';
        }
      }
    }
    this.renderHeader();
    this.renderMainContent();
  },

  renderDrawer() {
    const panel = document.getElementById('side-drawer-panel');
    if (!panel) return;

    const session = this.currentSession;
    if (!session) return;
    const settings = window.Store.getSettings();
    const currentCat = (window.AttendanceModule && window.AttendanceModule.currentCategory) || 'namaz';
    const currentAkademiSub = (window.AkademiModule && window.AkademiModule.currentSubCategory) || 'takviye';

    panel.innerHTML = `
      <!-- Drawer Üst Başlık -->
      <div class="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
            ${settings.institutionLogo ? `
              <img src="${settings.institutionLogo}" alt="Logo" class="w-full h-full object-cover bg-white"
                onerror="window.App.handleLogoError(this)">
              <div class="hidden w-full h-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center">ÖT</div>
            ` : `
              <div class="w-full h-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center">ÖT</div>
            `}
          </div>
          <div>
            <h3 class="font-black text-sm leading-tight text-white">${settings.institutionName}</h3>
            <p class="text-[11px] text-slate-300 mt-0.5">${session.name || 'Yetkili Portalı'}</p>
          </div>
        </div>
        <button onclick="window.App.closeDrawer()" 
          class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition">
          ✕
        </button>
      </div>

      <!-- Menü Listesi -->
      <div class="flex-1 overflow-y-auto p-4 space-y-5">
        <!-- 1. YOKLAMA İŞLEMLERİ (3 ALT BAŞLIK) -->
        <div class="space-y-1.5">
          <div class="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">YOKLAMA İŞLEMLERİ</div>
          
          <!-- Namaz Yoklaması -->
          <button type="button" onclick="window.App.navigateFromDrawer('yoklama', 'namaz')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              this.activeTab === 'yoklama' && currentCat === 'namaz'
                ? 'bg-emerald-50 text-emerald-900 font-black border border-emerald-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">🕌</span>
              <div>
                <div class="text-xs font-black">Namaz Yoklaması</div>
                <div class="text-[10px] text-slate-400 font-medium">5 Vakit namaz takibi</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>

          <!-- Yatak Yoklaması -->
          <button type="button" onclick="window.App.navigateFromDrawer('yoklama', 'yatak')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              this.activeTab === 'yoklama' && currentCat === 'yatak'
                ? 'bg-indigo-50 text-indigo-900 font-black border border-indigo-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">🛏️</span>
              <div>
                <div class="text-xs font-black">Yatak Yoklaması</div>
                <div class="text-[10px] text-slate-400 font-medium">Oda ve yatak düzeni kontrolü</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>

          <!-- Okul Dönüşü Yoklaması -->
          <button type="button" onclick="window.App.navigateFromDrawer('yoklama', 'okul_donusu')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              this.activeTab === 'yoklama' && currentCat === 'okul_donusu'
                ? 'bg-amber-50 text-amber-900 font-black border border-amber-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">🎒</span>
              <div>
                <div class="text-xs font-black">Okul Dönüşü Yoklaması</div>
                <div class="text-[10px] text-slate-400 font-medium">Okuldan yurda geliş kontrolü</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>

          <!-- Namaz Raporları (Haftalık & Aylık) -->
          <button type="button" onclick="window.App.navigateFromDrawer('yoklama', 'namaz_rapor')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              this.activeTab === 'yoklama' && currentCat === 'namaz_rapor'
                ? 'bg-purple-50 text-purple-900 font-black border border-purple-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">📊</span>
              <div>
                <div class="text-xs font-black">Namaz Raporları</div>
                <div class="text-[10px] text-slate-400 font-medium">Haftalık ve aylık katılım karnesi</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>
        </div>

        <!-- 2. AKADEMİ (2 ALT BAŞLIK: Takviye Ders Performansı & Genel Gelişim) -->
        <!-- 2. AKADEMİ & DERSLER -->
        <div class="space-y-1.5 pt-3 border-t border-slate-100">
          <div class="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">AKADEMİ & DERSLER</div>

          <!-- Takviye Ders Notları -->
          <button type="button" onclick="window.App.navigateFromDrawer('akademi', 'takviye')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              (this.activeTab === 'akademi' || this.activeTab === 'performans')
                ? 'bg-blue-50 text-blue-900 font-black border border-blue-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">📚</span>
              <div>
                <div class="text-xs font-black">Takviye Ders Notları</div>
                <div class="text-[10px] text-slate-400 font-medium">Türkçe, Mat, Fen, Sosyal, İngilizce 100 puan</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>

          <!-- Test Neticeleri & Etüt Soru Takibi -->
          <button type="button" onclick="window.App.navigateFromDrawer('testler')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              (this.activeTab === 'testler' || this.activeTab === 'test_sonuclari')
                ? 'bg-emerald-50 text-emerald-900 font-black border border-emerald-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">📝</span>
              <div>
                <div class="text-xs font-black flex items-center gap-1.5">
                  <span>Test Neticeleri & Etüt</span>
                  <span class="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Yeni</span>
                </div>
                <div class="text-[10px] text-slate-400 font-medium">Başlık, Ders, Ünite, Doğru, Yanlış, Net & 100 Notu</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>
        </div>

        <!-- YARIŞMA & LİDERLİK TABLOSU -->
        <div class="space-y-1.5 pt-3 border-t border-slate-100">
          <div class="px-3 text-[10px] font-black uppercase tracking-wider text-amber-500">🏆 YARIŞMA & LİDERLİK</div>

          <!-- Haftanın ve Ayın Talebesi -->
          <button type="button" onclick="window.App.navigateFromDrawer('leaderboard')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              this.activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-950 font-black border border-amber-300 shadow-sm'
                : 'text-slate-700 hover:bg-amber-50/50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">🏆</span>
              <div>
                <div class="text-xs font-black text-amber-900">Haftanın & Ayın Talebesi</div>
                <div class="text-[10px] text-slate-500 font-medium">Puanlama ve şampiyonluk podyumu</div>
              </div>
            </div>
            <span class="text-amber-600 font-bold">→</span>
          </button>

          <!-- Canlı TV / Koridor Panosu (Sadece Kurum Yöneticisine Özel) -->
          ${(session && (session.role === 'superadmin' || session.canManageStaff || session.staffId === 'stf_1' || (session.name && session.name.toUpperCase().includes('SELİM BOZKURT')))) ? `
          <a href="pano.html" target="_blank" onclick="localStorage.setItem('pano_admin_authorized', 'true'); window.App.closeDrawer()"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between text-slate-700 hover:bg-purple-50 font-bold border border-purple-200/80 bg-purple-50/40">
            <div class="flex items-center gap-3">
              <span class="text-xl">📺</span>
              <div>
                <div class="text-xs font-black text-purple-900 flex items-center gap-1.5">
                  <span>Canlı TV / Dijital Pano</span>
                  <span class="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Yönetici</span>
                </div>
                <div class="text-[10px] text-slate-500 font-medium">TV ekranı ve projeksiyon kiosk modu</div>
              </div>
            </div>
            <span class="text-purple-600 font-bold text-xs">Aç ↗</span>
          </a>
          ` : ''}
        </div>

        <!-- 3. HAFTA SONU İZİN İŞLEMLERİ (İzine Çıkış Takibi) -->
        <div class="space-y-1.5 pt-3 border-t border-slate-100">
          <div class="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">HAFTA SONU İZİN İŞLEMLERİ</div>

          <!-- İzine Çıkış Butonu -->
          <button type="button" onclick="window.App.navigateFromDrawer('izin_cikis')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              this.activeTab === 'izin_cikis'
                ? 'bg-rose-50 text-rose-900 font-black border border-rose-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">🚪</span>
              <div>
                <div class="text-xs font-black">İzine Çıkış Takibi</div>
                <div class="text-[10px] text-slate-400 font-medium">Kusur başı 30 dk gecikme ve kapı saatleri</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>

          <!-- İzin Dönüşü Butonu (YENİ!) -->
          <button type="button" onclick="window.App.navigateFromDrawer('izin_donusu')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              this.activeTab === 'izin_donusu'
                ? 'bg-indigo-50 text-indigo-900 font-black border border-indigo-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">🧳</span>
              <div>
                <div class="text-xs font-black">İzin Dönüşü Takibi</div>
                <div class="text-[10px] text-slate-400 font-medium">Saatli varış kaydı ve 3 katı geç çıkış cezası</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>
        </div>

        <!-- 4. ÖĞRENCİ YÖNETİMİ -->
        <div class="space-y-1.5 pt-3 border-t border-slate-100">
          <div class="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">ÖĞRENCİ & SINIF</div>

          <!-- Öğrenci Listesi & Şifreler -->
          <button type="button" onclick="window.App.navigateFromDrawer('ogrenciler')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              this.activeTab === 'ogrenciler'
                ? 'bg-emerald-50 text-emerald-900 font-black border border-emerald-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">👥</span>
              <div>
                <div class="text-xs font-black">${session.canEditStudents ? 'Öğrenci & Şifre Yönetimi' : 'Öğrenci Listesi'}</div>
                <div class="text-[10px] text-slate-400 font-medium">Tüm sınıf kütüğü ve veli şifreleri</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>

          <!-- Canlı Excel Tablosu (ÖĞRENCİ & SINIF İçinde) -->
          ${(session.canManageStaff || session.role === 'superadmin' || session.canEditStudents || session.staffId === 'stf_1' || (session.name && session.name.toUpperCase().includes('SELİM BOZKURT'))) ? `
            <button type="button" onclick="window.App.navigateFromDrawer('ogrenciler_excel')"
              class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
                this.activeTab === 'ogrenciler_excel'
                  ? 'bg-emerald-50 text-emerald-900 font-black border border-emerald-200 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50 font-bold'
              }">
              <div class="flex items-center gap-3">
                <span class="text-xl">📊</span>
                <div>
                  <div class="text-xs font-black flex items-center gap-1.5">
                    <span>Canlı Excel Tablosu</span>
                    <span class="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Yönetici</span>
                  </div>
                  <div class="text-[10px] text-slate-400 font-medium">Hücreden talebe bilgisi düzenleme & senkron</div>
                </div>
              </div>
              <span class="text-slate-300">→</span>
            </button>
          ` : ''}
        </div>

        ${(session.canManageStaff || session.role === 'superadmin' || session.canEditStudents || session.staffId === 'stf_1' || (session.name && session.name.toUpperCase().includes('SELİM BOZKURT'))) ? `
          <!-- 3. YÖNETİCİ İŞLEMLERİ (Sadece Ana Yönetici) -->
          <div class="space-y-1.5 pt-3 border-t border-slate-100">
            <div class="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">YÖNETİCİ İŞLEMLERİ</div>

            <!-- Canlı Excel Tablosu (Sadece Yönetici) -->
            <button type="button" onclick="window.App.navigateFromDrawer('ogrenciler_excel')"
              class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
                this.activeTab === 'ogrenciler_excel'
                  ? 'bg-emerald-50 text-emerald-900 font-black border border-emerald-200 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50 font-bold'
              }">
              <div class="flex items-center gap-3">
                <span class="text-xl">📊</span>
                <div>
                  <div class="text-xs font-black flex items-center gap-1.5">
                    <span>Canlı Excel Tablosu</span>
                    <span class="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Yönetici</span>
                  </div>
                  <div class="text-[10px] text-slate-400 font-medium">Hücreden talebe bilgisi düzenleme & senkron</div>
                </div>
              </div>
              <span class="text-slate-300">→</span>
            </button>

            <!-- Personel & Şifre Yönetimi -->
            <button type="button" onclick="window.App.navigateFromDrawer('personel')"
              class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
                this.activeTab === 'personel'
                  ? 'bg-amber-50 text-amber-900 font-black border border-amber-200 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50 font-bold'
              }">
              <div class="flex items-center gap-3">
                <span class="text-xl">👨‍🏫</span>
                <div>
                  <div class="text-xs font-black">Personel & Şifre Yönetimi</div>
                  <div class="text-[10px] text-slate-400 font-medium">Hoca ekleme, silme ve şifreler</div>
                </div>
              </div>
              <span class="text-slate-300">→</span>
            </button>

            <!-- Sistem Ayarları & E-posta -->
            <button type="button" onclick="window.App.navigateFromDrawer('ayarlar')"
              class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
                this.activeTab === 'ayarlar'
                  ? 'bg-emerald-50 text-emerald-900 font-black border border-emerald-200 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50 font-bold'
              }">
              <div class="flex items-center gap-3">
                <span class="text-xl">⚙️</span>
                <div>
                  <div class="text-xs font-black">Sistem Ayarları & E-posta</div>
                  <div class="text-[10px] text-slate-400 font-medium">Yönetici maili ve veri yedekleme</div>
                </div>
              </div>
              <span class="text-slate-300">→</span>
            </button>
          </div>
        ` : ''}

        ${session.role === 'staff' ? `
          <!-- Personel Şifre Değiştirme -->
          <div class="space-y-1.5 pt-3 border-t border-slate-100">
            <div class="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">HESAP GÜVENLİĞİ</div>
            <button type="button" onclick="window.App.closeDrawer(); window.App.openStaffSelfPasswordModal();"
              class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200">
              <div class="flex items-center gap-3">
                <span class="text-xl">🔑</span>
                <div>
                  <div class="text-xs font-black">Giriş Şifremi Değiştir</div>
                  <div class="text-[10px] text-amber-700 font-medium">Kendi hoca giriş şifrenizi güncelleyin</div>
                </div>
              </div>
              <span class="text-amber-500 font-bold">→</span>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Drawer Alt Bar: Güvenli Çıkış -->
      <div class="p-4 border-t border-slate-100 bg-slate-50">
        <button type="button" onclick="window.App.closeDrawer(); window.App.logout();"
          class="w-full py-3 px-4 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-black transition flex items-center justify-center gap-2">
          <span>🚪</span>
          <span>Güvenli Çıkış Yap</span>
        </button>
      </div>
    `;
  },

  renderMainContent() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const settings = window.Store.getSettings();

    // 1. Durum: Oturum Açılmamışsa GİRİŞ EKRANI (Giriş kılavuzu KALDIRILMIŞTIR)
    if (!this.currentSession) {
      if (this.loginMode === 'admin_otp') {
        // --- ANA YÖNETİCİ E-POSTA DOĞRULAMA EKRANI ---
        main.innerHTML = `
          <div class="max-w-md mx-auto py-12 px-4 animate-fade-in">
            <div class="bg-white rounded-3xl shadow-xl border border-amber-200 p-8 text-center relative overflow-hidden">
              
              <!-- Kurum Logosu / Fotoğrafı -->
              <div class="mb-4 flex flex-col items-center">
                ${settings.institutionLogo ? `
                  <div class="w-full relative group mb-3 flex justify-center">
                    <img src="${settings.institutionLogo}" alt="${settings.institutionName}" 
                      class="h-36 sm:h-40 w-full max-w-xs object-cover rounded-2xl shadow-md border border-amber-200"
                      onerror="window.App.handleLogoError(this, 'admin-inst-fallback-badge')">
                    <div id="admin-inst-fallback-badge" class="hidden w-16 h-16 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-inner">
                      👑
                    </div>
                  </div>
                ` : `
                  <div class="w-16 h-16 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl font-bold shadow-inner">
                    👑
                  </div>
                `}
                <h2 class="text-xl font-black text-slate-900 mb-1">Ana Yönetici Girişi</h2>
                <p class="text-xs text-slate-500 mb-6">
                  Yüksek güvenlik için Ana Yönetici girişi sabit şifreyle değil, **e-posta doğrulama koduyla** yapılmaktadır.
                </p>
              </div>

              ${this.otpStep === 'request' ? `
                <form onsubmit="window.App.handleAdminOtpRequest(event)" class="space-y-4">
                  <div>
                    <label class="block text-left text-xs font-bold text-slate-700 mb-1.5 uppercase">YÖNETİCİ E-POSTA ADRESİNİZ</label>
                    <input type="email" id="admin-email-input" required autofocus placeholder="selimbozkurt111@gmail.com" 
                      value="${window.Store.getSettings().adminEmail || 'selimbozkurt111@gmail.com'}"
                      class="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-none transition">
                    <p class="text-[11px] text-slate-400 text-left mt-1">Giriş doğrulama kodunuz bu e-posta adresine gönderilecektir.</p>
                  </div>

                  <div class="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-left flex items-start gap-2.5">
                    <span class="text-base">💡</span>
                    <div class="text-[11px] text-amber-900 leading-snug">
                      <strong>E-postayı beklemenize gerek yok:</strong> Kod üretildiği an hem mailinize gönderilecek hem de <strong>ekranda görünecektir</strong>.
                    </div>
                  </div>

                  <button type="submit" id="admin-otp-btn"
                    class="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                    <span>Doğrulama Kodu Üret & Gönder</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </button>
                </form>
              ` : (() => {
                const currentCode = this.lastGeneratedAdminOtp || (window.Store && window.Store.getActiveAdminOtpCode()) || '';
                return `
                <form onsubmit="window.App.handleAdminOtpVerify(event)" class="space-y-4 animate-fade-in">
                  <!-- Ekranda Kod Kartı -->
                  <div class="p-4 rounded-2xl bg-gradient-to-b from-amber-50 to-amber-100/50 border-2 border-amber-300 text-left space-y-2.5 shadow-xs">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5 text-xs font-black text-amber-950">
                        <span>🔑 GİRİŞ DOĞRULAMA KODU</span>
                      </div>
                      ${currentCode ? `
                        <button type="button" onclick="window.App.toggleShowAdminOtp()" 
                          class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 transition flex items-center gap-1 cursor-pointer shadow-2xs">
                          <span>${this.showAdminOtpOnScreen ? '🙈 Kodu Gizle' : '👁️ Kodu Ekranda Göster'}</span>
                        </button>
                      ` : ''}
                    </div>

                    ${this.showAdminOtpOnScreen && currentCode ? `
                      <div class="bg-white p-3 rounded-xl border border-amber-300 shadow-xs space-y-2 animate-fade-in">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] text-slate-500 font-bold uppercase">Giriş Kodunuz:</span>
                          <span class="text-[10px] text-emerald-800 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">10 Dk Geçerli</span>
                        </div>
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <div class="text-2xl sm:text-3xl font-mono font-black text-amber-950 tracking-widest px-3 py-1 bg-amber-50/70 rounded-xl border border-amber-200 select-all">
                            ${currentCode}
                          </div>
                          <button type="button" onclick="window.App.fillAdminOtpAndSubmit('${currentCode}')"
                            class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                            <span>⚡ Kodu Doldur & Gir</span>
                          </button>
                        </div>
                      </div>
                      <p class="text-[10px] text-amber-800">
                        ✓ Kod ayrıca <strong>${this.adminEmailDraft}</strong> adresinize de gönderildi.
                      </p>
                    ` : `
                      <p class="text-[11px] text-amber-800 leading-relaxed">
                        <strong>${this.adminEmailDraft}</strong> adresinize 6 haneli doğrulama kodu gönderildi.
                        ${currentCode ? `
                          <br><button type="button" onclick="window.App.toggleShowAdminOtp()" class="font-bold underline text-amber-950 mt-1 cursor-pointer">
                            👉 Kodu beklemeden ekranda görmek için tıklayınız.
                          </button>
                        ` : ''}
                      </p>
                    `}
                  </div>

                  <div>
                    <label class="block text-left text-xs font-bold text-slate-700 mb-1.5 uppercase">6 HANELİ DOĞRULAMA KODU</label>
                    <input type="text" id="admin-otp-code-input" maxlength="6" required autofocus placeholder="••••••" 
                      value="${this.showAdminOtpOnScreen && currentCode ? currentCode : ''}"
                      class="w-full px-4 py-3 bg-slate-50 border-2 border-amber-300 rounded-xl text-center text-2xl font-mono font-bold tracking-widest text-slate-900 focus:border-amber-600 focus:bg-white focus:outline-none transition">
                  </div>

                  <button type="submit" 
                    class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer">
                    Doğrula ve Sisteme Gir
                  </button>

                  <div class="flex items-center justify-between text-xs pt-1">
                    <button type="button" onclick="window.App.otpStep='request'; window.App.renderMainContent();" 
                      class="text-slate-400 hover:text-slate-600 font-medium cursor-pointer">
                      Farklı e-posta dene
                    </button>
                    <button type="button" onclick="window.App.handleAdminOtpRequest(null)" 
                      class="text-amber-700 hover:text-amber-800 font-bold cursor-pointer">
                      Kodu Tekrar Gönder
                    </button>
                  </div>
                </form>
                `;
              })()}


              <div class="mt-6 pt-5 border-t border-slate-100 text-center">
                <button onclick="window.App.loginMode='user'; window.App.renderMainContent();" 
                  class="text-xs text-indigo-600 hover:text-indigo-800 font-bold">
                  ← Öğretmen & Veli Girişine Dön
                </button>
              </div>
            </div>
          </div>
        `;
      } else {
        // --- TEK VE BİRLEŞİK KULLANICI GİRİŞ PORTALI (TÜM VELİLER VE EĞİTMENLER İÇİN) ---
        main.innerHTML = `
          <div class="max-w-md mx-auto py-10 px-4 animate-fade-in">
            <div class="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center relative overflow-hidden">
              
              <!-- Kurum Logosu veya Simgesi -->
              <div class="mb-5 flex flex-col items-center">
                ${settings.institutionLogo ? `
                  <div class="w-full relative group flex justify-center">
                    <img src="${settings.institutionLogo}" alt="Kurs Binası" 
                      class="h-44 sm:h-52 w-full max-w-sm object-cover rounded-2xl shadow-md border border-slate-200 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
                      onerror="window.App.handleLogoError(this, 'login-inst-fallback-badge')">
                    <div id="login-inst-fallback-badge" class="hidden w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-2xl flex items-center justify-center text-3xl shadow-md font-bold">
                      🏛️
                    </div>
                  </div>
                ` : `
                  <div class="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-2xl flex items-center justify-center text-3xl shadow-md font-bold mb-1">
                    🏛️
                  </div>
                `}
                <h2 class="text-lg font-black text-slate-900 mt-3 tracking-tight">${settings.institutionName || 'Giriş Portalı'}</h2>
              </div>

              <!-- Tek ve Sade Giriş Formu -->
              <form onsubmit="window.App.handleUserLogin(event)" class="space-y-4 text-left">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    KULLANICI ADI / NO
                  </label>
                  <input type="text" id="login-fullname" required autofocus 
                    placeholder="Ad Soyad, Öğrenci No veya Eğitmen Adı" 
                    class="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none transition">
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    GİRİŞ ŞİFRESİ
                  </label>
                  <input type="password" id="login-password" required 
                    placeholder="Şifrenizi giriniz" 
                    class="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none transition">
                </div>

                <button type="submit" 
                  class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-2">
                  <span>Sisteme Giriş Yap</span>
                  <span>➔</span>
                </button>
              </form>

              <!-- Ana Yönetici Giriş Linki -->
              <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span class="text-slate-400">Kurum Yöneticisi misiniz?</span>
                <button type="button" onclick="window.App.loginMode='admin_otp'; window.App.otpStep='request'; window.App.renderMainContent();" 
                  class="font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer">
                  <span>👑 Ana Yönetici Girişi</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }
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
    } else if (this.activeTab === 'akademi' || this.activeTab === 'performans') {
      main.innerHTML = `<div id="performance-container"></div>`;
      if (window.AkademiModule) {
        window.AkademiModule.init();
      } else if (window.PerformanceModule) {
        window.PerformanceModule.init();
      }
    } else if (this.activeTab === 'testler' || this.activeTab === 'test_sonuclari') {
      main.innerHTML = `<div id="test-results-container"></div>`;
      if (window.TestResultsModule) {
        window.TestResultsModule.init();
      }
    } else if (this.activeTab === 'leaderboard') {
      if (window.LeaderboardModule) {
        window.LeaderboardModule.init();
      }
    } else if (this.activeTab === 'izin_cikis') {
      main.innerHTML = `<div id="leave-tracker-container"></div>`;
      if (window.LeaveTrackerModule) {
        window.LeaveTrackerModule.init();
      }
    } else if (this.activeTab === 'izin_donusu') {
      main.innerHTML = `<div id="leave-return-container"></div>`;
      if (window.LeaveReturnModule) {
        window.LeaveReturnModule.init();
      }
    } else if (this.activeTab === 'ogrenciler') {
      main.innerHTML = `<div id="students-container"></div>`;
      this.renderStudentsView();
    } else if (this.activeTab === 'ogrenciler_excel') {
      main.innerHTML = `<div id="student-excel-container"></div>`;
      this.renderStudentExcelView();
    } else if (this.activeTab === 'personel') {
      main.innerHTML = `<div id="staff-container"></div>`;
      this.renderStaffView();
    } else if (this.activeTab === 'ayarlar') {
      main.innerHTML = `<div id="settings-container"></div>`;
      this.renderSettingsView();
    }
  },

  // Kurum Yöneticisi / Müdür Yetki Kontrolü (Talebe Ekleme, Silme, Pasife/Aktife Alma)
  canManageStudents() {
    const session = this.currentSession;
    return !!(session && (
      session.role === 'superadmin' ||
      session.canEditStudents === true ||
      session.canManageStaff === true ||
      session.staffId === 'stf_1' ||
      (session.name && session.name.toUpperCase().includes('SELİM BOZKURT')) ||
      (session.name && session.name.toUpperCase().includes('YÖNETİCİ')) ||
      (session.name && session.name.toUpperCase().includes('MÜDÜR'))
    ));
  },

  // --- Öğrenci & Şifre Yönetimi Görünümü ---
  renderStudentsView() {
    const container = document.getElementById('students-container');
    if (!container) return;

    const session = this.currentSession;
    const canEdit = this.canManageStudents();
    const classes = window.Store.getClasses(true);
    let allStudentsList = window.Store.getAllStudents ? window.Store.getAllStudents() : window.Store.getStudents(true);
    const allCount = allStudentsList.length;
    const activeCount = allStudentsList.filter(s => !s.isPassive && s.status !== 'passive').length;
    const passiveCount = allStudentsList.filter(s => s.isPassive === true || s.status === 'passive').length;

    let students = [...allStudentsList];

    if (this.studentFilterStatus === 'ACTIVE') {
      students = students.filter(s => !s.isPassive && s.status !== 'passive');
    } else if (this.studentFilterStatus === 'PASSIVE') {
      students = students.filter(s => s.isPassive === true || s.status === 'passive');
    }

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
        (s.dahiliHoca && s.dahiliHoca.toLowerCase().includes(this.studentSearchQuery))
      );
    }

    container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-lg flex items-center gap-2">
              <span>👥 Öğrenci & Veli Giriş Şifreleri</span>
              ${!canEdit ? '<span class="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">(Salt Okunur Liste)</span>' : ''}
            </h3>
            <p class="text-xs text-slate-500">
              ${canEdit ? 'Öğrencileri, aktif/pasif durumlarını ve velilerin giriş yapacağı şifreleri buradan yönetebilirsiniz.' : 'Eğitmenler listeyi inceleyebilir; düzenleme yetkisi Ana Yöneticidedir.'}
            </p>
          </div>

          ${canEdit ? `
            <div class="flex items-center gap-2.5">
              <button onclick="window.App.setTab('ogrenciler_excel')" 
                class="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 cursor-pointer">
                <span>📊 Canlı Excel Tablosu</span>
              </button>
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

        <div class="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div class="flex flex-wrap items-center gap-3">
            <div>
              <select onchange="window.App.studentFilterClass = this.value; window.App.renderStudentsView();"
                class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none">
                <option value="ALL">Tüm Sınıflar</option>
                ${classes.map(c => `<option value="${c}" ${this.studentFilterClass === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>

            <!-- Durum Filtresi (Tümü / Aktif / Pasif) -->
            <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button type="button" onclick="window.App.studentFilterStatus = 'ALL'; window.App.renderStudentsView();"
                class="px-2.5 py-1 rounded-lg text-xs font-black transition ${
                  (this.studentFilterStatus || 'ALL') === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }">
                Tümü (${allCount})
              </button>
              <button type="button" onclick="window.App.studentFilterStatus = 'ACTIVE'; window.App.renderStudentsView();"
                class="px-2.5 py-1 rounded-lg text-xs font-black transition ${
                  this.studentFilterStatus === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }">
                🟢 Aktif (${activeCount})
              </button>
              <button type="button" onclick="window.App.studentFilterStatus = 'PASSIVE'; window.App.renderStudentsView();"
                class="px-2.5 py-1 rounded-lg text-xs font-black transition ${
                  this.studentFilterStatus === 'PASSIVE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:bg-amber-50'
                }">
                ⏸️ Pasif (${passiveCount})
              </button>
            </div>

            <div>
              <input type="text" placeholder="İsim, No veya Hoca ara..." 
                value="${this.studentSearchQuery}"
                oninput="window.App.studentSearchQuery = this.value.toLowerCase().trim(); window.App.renderStudentsView();"
                class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none w-64">
            </div>
          </div>
          <span class="text-xs font-bold text-slate-500">Listelenen: ${students.length} Talebe</span>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th class="py-3 px-4 text-center w-16">No</th>
                <th class="py-3 px-4">Giriş Yapılacak İsim</th>
                <th class="py-3 px-4">Sınıfı</th>
                <th class="py-3 px-4">Etüt & Dahili Hocası</th>
                <th class="py-3 px-4">Yatakhane</th>
                <th class="py-3 px-4">Veli Giriş Şifresi <span class="text-[9px] font-bold text-amber-700 block lowercase">değişenler vurgulu</span></th>
                <th class="py-3 px-4">Ortak Aile Kodu</th>
                ${canEdit ? '<th class="py-3 px-4 text-right">İşlem</th>' : ''}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm">
              ${students.length === 0 ? `
                <tr><td colspan="${canEdit ? 8 : 7}" class="py-12 text-center text-slate-400">Öğrenci bulunamadı.</td></tr>
              ` : students.map(s => {
                const isPassive = s && (s.isPassive === true || s.status === 'passive');
                return `
                  <tr class="transition ${isPassive ? 'bg-amber-50/40 text-slate-500' : 'table-row-hover'}">
                    <td class="py-3 px-4 text-center font-bold text-slate-700">
                      ${s.studentNo}
                    </td>
                    <td class="py-3 px-4">
                      <div class="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>${s.firstName} ${s.lastName}</span>
                        ${isPassive ? `
                          <span class="px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 font-black text-[9px] uppercase tracking-wider">
                            PASİF
                          </span>
                        ` : ''}
                      </div>
                    </td>
                    <td class="py-3 px-4 text-xs font-bold text-slate-800">${s.className}</td>
                    <td class="py-3 px-4 text-xs text-slate-600">${s.etutHocasi || '-'}<br><span class="text-[10px] text-slate-400">${s.dahiliHoca || ''}</span></td>
                    <td class="py-3 px-4 text-xs font-medium text-indigo-800">${s.yatakhane || '-'}</td>
                    <td class="py-3 px-4">
                      ${s.password && s.password.trim() !== '123' ? `
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-mono font-black text-xs border border-amber-300 shadow-2xs">
                          <span title="Şifre güncellendi">🔑</span>
                          <span>${s.password}</span>
                          <span class="text-[9px] font-sans px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 uppercase font-black tracking-tight">Değişti</span>
                        </div>
                      ` : `
                        <span class="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-200" title="Varsayılan Şifre: 123">
                          ${s.password || '123'}
                        </span>
                      `}
                    </td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-600">
                        ${s.familyCode || '-'}
                      </span>
                    </td>
                    ${canEdit ? `
                      <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          ${isPassive ? `
                            <button onclick="window.App.toggleStudentPassive('${s.id}')"
                              class="p-1 text-emerald-600 hover:text-emerald-800 transition text-sm" 
                              title="Talebeyi Tekrar Aktife Al (Yoklamalara dahil et)">▶️</button>
                          ` : `
                            <button onclick="window.App.toggleStudentPassive('${s.id}')"
                              class="p-1 text-amber-500 hover:text-amber-700 transition text-sm" 
                              title="Talebeyi Pasife Al (Yoklamalardan gizle, verileri silinmez)">⏸️</button>
                          `}
                          <button onclick="window.App.openStudentModal('${s.id}')"
                            class="p-1 text-slate-400 hover:text-slate-700 transition" title="Düzenle / Şifre Değiştir">✏️</button>
                          <button onclick="window.App.deleteStudent('${s.id}')"
                            class="p-1 text-slate-400 hover:text-rose-600 transition" title="Kalıcı Olarak Sil">🗑️</button>
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

  // --- Canlı Excel Tablosu Görünümü (Sadece Kurum Yöneticisine Özel) ---
  renderStudentExcelView() {
    const container = document.getElementById('student-excel-container');
    if (!container) return;

    const isManager = this.canManageStudents();

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

    try {
      if (window.StudentExcelModule && typeof window.StudentExcelModule.init === 'function') {
        window.StudentExcelModule.init();
      } else if (window.StudentExcelModule && typeof window.StudentExcelModule.render === 'function') {
        window.StudentExcelModule.render();
      } else {
        container.innerHTML = `
          <div class="p-8 text-center text-slate-500 font-bold space-y-2">
            <div>Canlı Excel Modülü yükleniyor...</div>
            <button onclick="window.App.renderStudentExcelView()" class="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
              Tabloyu Yenile ⟳
            </button>
          </div>
        `;
      }
    } catch (err) {
      console.error('StudentExcelModule initialization error:', err);
      container.innerHTML = `
        <div class="max-w-lg mx-auto py-8 text-center px-4">
          <div class="p-6 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
            <div class="text-2xl">⚠️</div>
            <div class="text-sm font-black text-amber-900">Canlı Excel Tablosu Yüklenirken Bir Hata Oluştu</div>
            <div class="text-xs text-slate-600">${err.message || 'Bilinmeyen hata'}</div>
            <button onclick="window.App.renderStudentExcelView()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition">
              Yeniden Dene ⟳
            </button>
          </div>
        </div>
      `;
    }
  },

  // --- SADECE ANA YÖNETİCİYE ÖZEL: Personel / Hoca ve Şifre Yönetimi ---
  renderStaffView() {
    const container = document.getElementById('staff-container');
    if (!container) return;

    if (!this.currentSession.canManageStaff) {
      container.innerHTML = `<div class="p-8 text-center text-rose-600 font-bold">Yetkisiz erişim.</div>`;
      return;
    }

    const staffList = window.Store.getStaff();

    container.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 class="font-black text-slate-900 text-lg flex items-center gap-2">
                <span>👨‍🏫 Personel İsim ve Şifre Yönetimi</span>
              </h3>
              <p class="text-xs text-slate-500">
                Eğitmenlerin sisteme girerken kullanacağı Ad Soyad ve Şifrelerini buradan yönetebilirsiniz. Personeller kendi şifrelerini değiştirdiğinde burada sarı "🔑 Değişti" rozetiyle güncel olarak görüntülenir.
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
                  <th class="py-3 px-4">Giriş Yapılacak İsim (Ad Soyad)</th>
                  <th class="py-3 px-4">Görevi / Alanı</th>
                  <th class="py-3 px-4">Telefon</th>
                  <th class="py-3 px-4">Giriş Şifresi <span class="text-[9px] font-bold text-amber-700 block lowercase">değişenler vurgulu</span></th>
                  <th class="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-sm">
                ${staffList.map(stf => `
                  <tr class="table-row-hover transition">
                    <td class="py-3 px-4 font-bold text-slate-900">${stf.fullName}</td>
                    <td class="py-3 px-4 text-xs text-slate-600">${stf.role}</td>
                    <td class="py-3 px-4 text-xs font-mono text-slate-700">${stf.phone || '-'}</td>
                    <td class="py-3 px-4">
                      ${stf.password && stf.password.trim() !== '123' ? `
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-mono font-black text-xs border border-amber-300 shadow-2xs">
                          <span title="Şifre güncellendi">🔑</span>
                          <span>${stf.password}</span>
                          <span class="text-[9px] font-sans px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 uppercase font-black tracking-tight">Değişti</span>
                        </div>
                      ` : `
                        <span class="px-2.5 py-1 rounded bg-blue-50 text-blue-800 font-mono font-bold text-xs border border-blue-200" title="Varsayılan Şifre: 123">
                          ${stf.password || '123'}
                        </span>
                      `}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <button onclick="window.App.editStaffPassword('${stf.id}')"
                        class="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 bg-indigo-50 rounded mr-1">
                        Şifre Değiştir
                      </button>
                      <button onclick="window.App.deleteStaff('${stf.id}')" 
                        class="text-xs text-rose-600 hover:text-rose-800 font-bold p-1 transition">
                        Çıkar
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
    const name = prompt('Eğitmenin Adı ve Soyadı:');
    if (!name || !name.trim()) return;
    const role = prompt('Görevi (Örn: 5. Sınıf Etüt Hocası):', 'Etüt & Dahili Hocası');
    const pass = prompt('Sisteme giriş yaparken kullanacağı Şifre:', '123');

    window.Store.addStaff({
      fullName: name.trim().toUpperCase(),
      role: role ? role.trim() : 'Eğitmen',
      password: pass ? pass.trim() : '123'
    });

    this.showToast(`${name} başarıyla eklendi!`, 'success');
    this.renderStaffView();
  },

  editStaffPassword(id) {
    const staffList = window.Store.getStaff();
    const stf = staffList.find(s => s.id === id);
    if (!stf) return;

    const newPass = prompt(`${stf.fullName} için yeni giriş şifresi:`, stf.password || '123');
    if (newPass !== null && newPass.trim()) {
      window.Store.updateStaff(id, { password: newPass.trim() });
      this.showToast('Şifre güncellendi.', 'success');
      this.renderStaffView();
    }
  },

  deleteStaff(id) {
    if (confirm('Bu personeli sistemden çıkarmak istediğinizden emin misiniz?')) {
      window.Store.deleteStaff(id);
      this.showToast('Personel çıkarıldı.', 'info');
      this.renderStaffView();
    }
  },

  // --- SADECE ANA YÖNETİCİ: Sistem Ayarları & E-posta Yapılandırması ---
  renderSettingsView() {
    const container = document.getElementById('settings-container');
    if (!container) return;

    if (!this.currentSession.canEditSettings) {
      container.innerHTML = `<div class="p-8 text-center text-rose-600 font-bold">Yetkisiz erişim.</div>`;
      return;
    }

    const settings = window.Store.getSettings();

    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-6">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 class="font-bold text-slate-800 text-base mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <span>⚙️</span> Kurum Bilgileri ve Yönetici Ayarları
          </h3>

          <form onsubmit="window.App.saveSettingsSubmit(event)" class="space-y-4 max-w-lg">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase">KURUM / KURS ADI</label>
              <input type="text" id="set-inst-name" value="${settings.institutionName}" required
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:bg-white">
            </div>

            <!-- Kurum / Kurs Resmi & Logosu -->
            <div class="pt-3 border-t border-slate-100">
              <label class="block text-xs font-black text-slate-800 mb-1 uppercase">
                📸 KURS RESMİ VEYA LOGOSU
              </label>
              <p class="text-[11px] text-slate-500 mb-3">
                Buraya ekleyeceğiniz fotoğraf veya logo; giriş portalında, veli karnesinde ve üst menü başlığında görüntülenir.
              </p>

              <!-- Logo Önizleme ve Seçme Alanı -->
              <div class="flex items-center gap-4 mb-3">
                <div class="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden p-1 shadow-inner relative">
                  <img id="settings-logo-preview" 
                    src="${settings.institutionLogo || ''}" 
                    alt="Logo Önizleme" 
                    class="${settings.institutionLogo ? '' : 'hidden'} max-w-full max-h-full object-contain rounded-xl"
                    onerror="this.style.display='none'; document.getElementById('settings-logo-placeholder').classList.remove('hidden');">
                  <div id="settings-logo-placeholder" class="${settings.institutionLogo ? 'hidden' : ''} text-center p-2 text-slate-400">
                    <span class="text-2xl block">🏛️</span>
                    <span class="text-[10px] font-bold">Resim Yok</span>
                  </div>
                </div>

                <div class="space-y-2">
                  <input type="file" id="set-inst-logo-file" accept="image/*" class="hidden" onchange="window.App.handleLogoFileUpload(event)">
                  <button type="button" onclick="document.getElementById('set-inst-logo-file').click()"
                    class="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 shadow-2xs transition flex items-center gap-2">
                    <span>📁</span>
                    <span>Bilgisayardan / Telefondan Fotoğraf Seç</span>
                  </button>

                  ${settings.institutionLogo ? `
                    <button type="button" onclick="window.App.removeLogo()"
                      class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-[11px] border border-rose-200 transition flex items-center gap-1.5">
                      <span>🗑️</span>
                      <span>Resmi Kaldır</span>
                    </button>
                  ` : ''}
                </div>
                <div class="mt-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                  <div class="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                    <span>📢</span>
                    <span>Resmin Herkesin Telefonunda Görünmesi İçin:</span>
                  </div>
                  <p class="text-[11px] text-amber-800 leading-relaxed mb-2.5">
                    Telefon veya bilgisayarınızdan seçtiğiniz fotoğraf bu cihazda görünür. <strong>Tüm veli ve hocaların telefonlarında da kalıcı olarak görünmesi için</strong> bu fotoğrafı GitHub'a <strong>kurs_logo.jpg</strong> adıyla yüklemeniz gerekir.
                  </p>
                  <div class="flex flex-wrap items-center gap-2">
                    <button type="button" onclick="window.App.downloadCurrentLogo()" 
                      class="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5">
                      <span>💾</span>
                      <span>Resmi "kurs_logo.jpg" Olarak İndir</span>
                    </button>
                    <a href="https://github.com/selimbozkurt111-web/oay-tak-p/upload" target="_blank"
                      class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5">
                      <span>🚀</span>
                      <span>GitHub Yükleme Sayfasına Git ➔</span>
                    </a>
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                  VEYA İNTERNET RESİM BAĞLANTISI (URL) / DOSYA ADI:
                </label>
                <input type="text" id="set-inst-logo-url" value="${settings.institutionLogo || ''}" 
                  placeholder="Örn: https://site.com/logo.png veya kurs_logo.jpg"
                  oninput="window.App.handleLogoUrlInput(this.value)"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:bg-white transition">
                <p class="text-[10px] text-slate-400 mt-1">
                  💡 İpucu: GitHub ana dizininize <strong>kurs_logo.jpg</strong> adıyla bir fotoğraf yüklerseniz buraya sadece <code>kurs_logo.jpg</code> yazabilirsiniz.
                </p>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-100">
              <label class="block text-xs font-black text-amber-900 mb-1 uppercase">👑 ANA YÖNETİCİ E-POSTA ADRESİ</label>
              <input type="email" id="set-admin-email" value="${settings.adminEmail || ''}" required
                class="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm font-bold text-amber-900 focus:outline-none focus:bg-white">
              <span class="text-[11px] text-slate-400">Giriş yaparken doğrulama kodunuz bu e-postaya gönderilir.</span>
            </div>

            <!-- Canlı Bulut Veritabanı Ayarı -->
            <div class="pt-3 border-t border-slate-100">
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-black text-slate-800 uppercase">
                  ☁️ CANLI BULUT VERİTABANI (TÜM CİHAZLARI ANLIK EŞİTLEME)
                </label>
                ${settings.firebaseUrl ? `
                  <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Aktif</span>
                  </span>
                ` : `
                  <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-300">
                    Yerel Mod
                  </span>
                `}
              </div>
              <p class="text-[11px] text-slate-500 mb-2">
                Hocaların telefonlarından aldıkları yoklamaların ve veli girişlerinin tüm telefonlarda ve bilgisayarınızda anında canlı görünmesini sağlar.
              </p>
              <input type="url" id="set-firebase-url" value="${settings.firebaseUrl || ''}" 
                placeholder="Örn: https://oay-takip-default-rtdb.firebaseio.com"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 transition">
              <span class="text-[10px] text-slate-400 block mt-1">
                Google Firebase Realtime Database URL adresinizi buraya yapıştırıp "Ayarları Kaydet"e basınız.
              </span>
            </div>

            <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-2">
              <span>💾</span>
              <span>Ayarları Kaydet</span>
            </button>
          </form>
        </div>

        <!-- Canlı Bulut Veritabanı Yönetimi & Eşitleme Paneli -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 text-lg flex items-center justify-center shadow-inner">
                ☁️
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-base leading-tight">Canlı Bulut Senkronizasyonu</h3>
                <p class="text-xs text-slate-500">Tüm hocaların telefonlarını ve bilgisayarınızı tek bir canlı merkeze bağlayın</p>
              </div>
            </div>
            <div>
              ${settings.firebaseUrl ? `
                <span class="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Canlı Bağlantı Hazır</span>
                </span>
              ` : `
                <span class="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-300 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>URL Tanımlanmadı</span>
                </span>
              `}
            </div>
          </div>

          <!-- Aksiyon Butonları -->
          <div class="flex flex-wrap items-center gap-3 mb-5">
            <button type="button" onclick="window.App.handlePushAllToCloud()"
              class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center gap-2">
              <span>🚀</span>
              <span>Tüm Verileri Buluta İlk Yükle</span>
            </button>

            <button type="button" onclick="window.App.handleSyncFromCloud(true)"
              class="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow transition flex items-center gap-2">
              <span>🔄</span>
              <span>Buluttan Şimdi Eşitle (Verileri Çek)</span>
            </button>
          </div>

          <!-- 2 Dakikalık Kolay Firebase Kurulum Kılavuzu -->
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2.5">
            <div class="font-bold text-slate-900 flex items-center gap-2">
              <span>📋</span>
              <span>2 Dakikada Tamamen Ücretsiz Canlı Veritabanı Kurulumu:</span>
            </div>
            <ol class="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
              <li>
                <a href="https://console.firebase.google.com" target="_blank" class="text-emerald-700 underline font-bold hover:text-emerald-800">
                  console.firebase.google.com ↗
                </a> 
                adresine Google hesabınızla giriş yapın.
              </li>
              <li><strong>"Proje Ekle"</strong> butonuna basın, proje adını <code>oay-takip</code> yapıp adımları onaylayın.</li>
              <li>Sol menüden <strong>"Build (Derle)" ➔ "Realtime Database"</strong> seçeneğine tıklayın.</li>
              <li><strong>"Veritabanı Oluştur"</strong> deyin, kurallar ekranında <strong>"Test Modunda Başlat"</strong> (read: true, write: true) seçeneğini işaretleyin.</li>
              <li>Sayfanın üstünde beliren veritabanı bağlantı adresini (Örn: <code>https://oay-takip-default-rtdb.firebaseio.com/</code>) kopyalayın.</li>
              <li>Bu adresi yukarıdaki <strong>"Canlı Bulut Veritabanı"</strong> kutucuğuna yapıştırıp <strong>"Ayarları Kaydet"</strong>e ve ardından <strong>"Tüm Verileri Buluta İlk Yükle"</strong> butonuna basın.</li>
            </ol>
            <p class="text-[10px] text-emerald-800 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200 mt-2">
              ✨ Tebrikler! Artık hocalar kendi telefonlarından yoklama aldığında veya veliler sisteme baktığında tüm veriler otomatik olarak canlı eşitlenecektir.
            </p>
          </div>
        </div>

        <!-- Yatak Kontrolü Otomatik Bildirim Yönetimi (Sadece Ana Yönetici) -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 text-xl flex items-center justify-center shadow-inner">
                ⏰
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-base leading-tight">Yatak Kontrolü Otomatik Bildirimleri</h3>
                <p class="text-xs text-slate-500">Sabah 08:30'dan itibaren yoklama girilmedikçe her 30 dakikada bir hocalara otomatik bildirim gönderir</p>
              </div>
            </div>

            <!-- YÖNETİCİ AÇMA / KAPATMA BUTONU -->
            <div>
              <button type="button" onclick="window.App.toggleYatakReminder()"
                class="px-5 py-2.5 rounded-2xl font-black text-xs shadow-sm transition flex items-center gap-2 cursor-pointer ${
                  settings.yatakReminderEnabled !== false 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-100' 
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }">
                <span class="w-2.5 h-2.5 rounded-full ${settings.yatakReminderEnabled !== false ? 'bg-white animate-pulse' : 'bg-slate-400'}"></span>
                <span>${settings.yatakReminderEnabled !== false ? '🟢 Otomatik Bildirimler AÇIK' : '⚪ Otomatik Bildirimler KAPALI'}</span>
              </button>
            </div>
          </div>

          <div class="pt-4 space-y-3">
            <!-- Otomatik Zamanlama Bilgi Kutusu -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-bold text-slate-800">⏰ Hatırlatma Başlama Saati:</span>
                <span class="px-2.5 py-1 bg-white font-mono font-bold text-emerald-800 rounded-lg border border-slate-300">
                  Sabah 08:30
                </span>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-bold text-slate-800">🔁 Tekrar Sıklığı:</span>
                <span class="px-2.5 py-1 bg-white font-mono font-bold text-indigo-800 rounded-lg border border-slate-300">
                  Yoklama Alınmadıkça Her 30 Dakikada Bir
                </span>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200">
                <span class="font-bold text-slate-800">🛑 Durdurma Kuralı:</span>
                <span class="text-[11px] text-emerald-700 font-bold">
                  Hoca yatak kontrolünü sisteme girdiği anda bildirimler o gün için otomatik kesilir.
                </span>
              </div>
            </div>

            <!-- Canlı Durum Bildirimi -->
            <div class="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span class="font-bold text-slate-600">Bugünkü Durum:</span>
              <div>
                ${window.Store.isYatakAttendanceDoneToday() ? `
                  <span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-[11px] border border-emerald-300">
                    ✅ Bugünkü Yoklama Alındı (Bildirimler Durduruldu)
                  </span>
                ` : (settings.yatakReminderEnabled !== false ? `
                  <span class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>⏳ Bugünkü Yoklama Bekleniyor (Her 30 Dk Otomatik Bildirim Devrede)</span>
                  </span>
                ` : `
                  <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px] border border-slate-300">
                    ⚪ Otomatik Bildirimler Yönetici Tarafından Kapatıldı
                  </span>
                `)}
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 class="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
            <span>💾</span> Yerel Dosya Yedekleme
          </h3>
          <p class="text-xs text-slate-500 mb-4">Tüm verilerinizi tek dosya olarak bilgisayarınıza indirebilirsiniz.</p>

          <div class="flex flex-wrap items-center gap-4">
            <button onclick="window.App.downloadBackup()"
              class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition">
              Yedek Dosyası İndir (JSON)
            </button>

            <label class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition">
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
    const adminEmail = document.getElementById('set-admin-email').value.trim();
    const logoUrl = document.getElementById('set-inst-logo-url') ? document.getElementById('set-inst-logo-url').value.trim() : '';
    const firebaseUrl = document.getElementById('set-firebase-url') ? document.getElementById('set-firebase-url').value.trim() : '';

    window.Store.saveSettings({
      institutionName: instName,
      adminEmail: adminEmail,
      institutionLogo: logoUrl,
      firebaseUrl: firebaseUrl
    });

    this.showToast('Ayarlar, kurs logosu ve canlı bulut bağlantısı kaydedildi!', 'success');
    this.renderHeader();
    this.renderSettingsView();
  },

  async handlePushAllToCloud() {
    const url = window.Store.getFirebaseUrl();
    if (!url) {
      this.showToast('Lütfen önce yukarıdaki kutucuğa Firebase Veritabanı URL adresinizi yapıştırıp "Ayarları Kaydet"e basınız.', 'warning');
      const input = document.getElementById('set-firebase-url');
      if (input) input.focus();
      return;
    }

    if (!confirm('Bilgisayarınızdaki tüm öğrenci listesi (66 talebe), hoca kadrosu, yoklamalar ve sistem ayarları canlı bulut veritabanına aktarılacak. Onaylıyor musunuz?')) {
      return;
    }

    this.showToast('Veriler canlı buluta aktarılıyor, lütfen bekleyiniz...', 'info');
    const res = await window.Store.pushAllToCloud();
    if (res.success) {
      this.showToast(res.message, 'success');
      this.renderHeader();
      this.renderSettingsView();
    } else {
      this.showToast(res.message, 'error');
    }
  },

  async handleSyncFromCloud(showToastNotice = true) {
    if (!window.Store.isCloudEnabled()) {
      if (showToastNotice) {
        this.showToast('Canlı bulut bağlantısı henüz tanımlanmamış. Ayarlar ekranından Firebase URL ekleyiniz.', 'warning');
      }
      return;
    }

    if (showToastNotice) {
      this.showToast('Buluttaki en güncel kayıtlar kontrol ediliyor...', 'info');
    }

    const res = await window.Store.syncFromCloud();
    if (res.success) {
      if (showToastNotice) {
        this.showToast(res.message, 'success');
      }
      this.renderHeader();
      if (this.currentSession) {
        this.renderMainContent();
      }
    } else {
      if (showToastNotice) {
        this.showToast(`Eşitleme uyarısı: ${res.message}`, 'error');
      }
    }
  },

  // --- BİLDİRİM YÖNETİMİ & TESTİ (Telefona Ekran Bildirimi Gönderme) ---
  async requestNotificationPermissionAndTest() {
    if (!('Notification' in window)) {
      alert('Bu tarayıcıda veya cihazda bildirim desteği kapalı. Lütfen telefonunuzun Chrome veya Safari ayarlarından bildirimlere izin veriniz.');
      return;
    }

    try {
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        this.showToast('✅ Bildirim izni açık! Telefonunuza test bildirimi gönderiliyor...', 'success');
        this.triggerLocalPushNotification(
          '🛏️ Yatak Kontrolü Hatırlatması',
          'Sayın Hocam, bugünün yatak ve oda kontrolünü sisteme girmeyi unutmayınız! (Ömer Avniyel Akademi)'
        );
      } else if (permission === 'denied') {
        alert('⚠️ Bildirim izni daha önce engellenmiş. Bildirim alabilmek için telefonunuzun Ayarlar > Bildirimler bölümünden tarayıcınıza izin veriniz.');
      } else {
        this.showToast('Bildirim izni onaylanmadı.', 'warning');
      }
    } catch (err) {
      alert('Bildirim izni alınırken bir sorun oluştu: ' + err.message);
    }
  },

  triggerLocalPushNotification(title, body) {
    const options = {
      body: body,
      icon: 'icon.svg',
      badge: 'icon.svg',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'oay-yatak-reminder',
      renotify: true
    };

    // 1. Service Worker ile bildirim (Mobilde ve PWA'da en güçlü yöntem)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        if (reg && reg.showNotification) {
          reg.showNotification(title, options);
        }
      }).catch(() => {
        try { new Notification(title, options); } catch(e) {}
      });
      return;
    }

    // 2. Standart Notification API
    try {
      new Notification(title, options);
    } catch (err) {
      console.warn('Notification API hatası:', err);
    }
  },

  // WhatsApp Hatırlatması Gönder
  sendYatakWhatsAppReminder(hocaPhone = '', hocaName = '') {
    const defaultText = `Selamün aleyküm ${hocaName ? hocaName + ' ' : ''}Hocam, hayırlı sabahlar. Bugünün yatak ve oda kontrolünü sisteme girmeyi unutmayınız.\n\nYoklama Giriş Linki:\nhttps://selimbozkurt111-web.github.io/oay-tak-p/`;
    const cleanPhone = (hocaPhone || '').replace(/\D/g, '');
    const targetUrl = cleanPhone 
      ? `https://wa.me/90${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(defaultText)}`
      : `https://wa.me/?text=${encodeURIComponent(defaultText)}`;

    window.open(targetUrl, '_blank');
  },

  // --- OTOMATİK YATAK KONTROLÜ HATIRLATMA MOTORU ---
  // Sabah 08:30'dan itibaren, kontrol sisteme işlenmedikçe her 30 dakikada bir otomatik bildirim gönderir.
  // Kontrol sisteme işlendiği anda bildirimler otomatik olarak durdurulur!
  checkAndTriggerYatakReminder() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const settings = window.Store.getSettings();
    if (settings.yatakReminderEnabled === false) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMins = currentHours * 60 + currentMinutes;

    // Başlangıç saati: 08:30
    const startTimeStr = settings.yatakReminderStartTime || '08:30';
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const startTimeInMins = (startH !== undefined ? startH : 8) * 60 + (startM !== undefined ? startM : 30);

    // Sabah 08:30'dan önce veya öğlen 13:00'dan sonra bildirim gönderilmez
    if (currentTimeInMins < startTimeInMins || currentTimeInMins > 13 * 60) {
      return;
    }

    // 1. KONTROL EDİLDİ Mİ? (Sisteme işlendiyse BİLDİRİM GÖNDERİLMEZ!)
    const isDone = window.Store.isYatakAttendanceDoneToday(todayStr);
    if (isDone) {
      return;
    }

    // 2. Son bildirimden bu yana 30 dakika geçti mi?
    const intervalMins = parseInt(settings.yatakReminderIntervalMins, 10) || 30;
    const lastSentKey = 'oay_last_yatak_reminder_sent_v1';
    const lastSentTime = parseInt(localStorage.getItem(lastSentKey), 10) || 0;
    const elapsedMinutes = (Date.now() - lastSentTime) / (1000 * 60);

    if (elapsedMinutes >= intervalMins) {
      // 30 dakika doldu ve kontrol henüz girilmedi! Bildirimi gönder:
      localStorage.setItem(lastSentKey, Date.now().toString());

      this.triggerLocalPushNotification(
        '🛏️ Yatak Kontrolü Hatırlatması',
        'Sayın Hocam, bugünün yatak ve oda kontrolü henüz sisteme girilmedi! Lütfen yoklamayı tamamlayınız. (Ömer Avniyel Akademi)'
      );

      console.log(`[YatakReminder] Otomatik hatırlatma gönderildi (${now.toLocaleTimeString()}).`);
    }
  },

  // Ana Yönetici için Yatak Hatırlatma Bildirimlerini Açma / Kapatma Anahtarı
  toggleYatakReminder() {
    const settings = window.Store.getSettings();
    const currentState = settings.yatakReminderEnabled !== false;
    const newState = !currentState;

    window.Store.saveSettings({
      yatakReminderEnabled: newState
    });

    this.showToast(
      newState 
        ? '✅ Yatak kontrolü otomatik bildirimleri AÇILDI. Sabah 08:30\'da yoklama alınmadıkça her 30 dk bildirim gidecek.' 
        : '🛑 Yatak kontrolü otomatik bildirimleri KAPATILDI.',
      newState ? 'success' : 'info'
    );

    this.renderSettingsView();
  },

  handleLogoFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      this.showToast('Lütfen 12 MB\'tan küçük bir resim seçiniz.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 500;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        
        const preview = document.getElementById('settings-logo-preview');
        const placeholder = document.getElementById('settings-logo-placeholder');
        const urlInput = document.getElementById('set-inst-logo-url');
        if (preview) {
          preview.src = compressedDataUrl;
          preview.classList.remove('hidden');
          preview.style.display = 'block';
        }
        if (placeholder) placeholder.classList.add('hidden');
        if (urlInput) urlInput.value = compressedDataUrl;

        this.showToast('Fotoğraf hazırlandı! Kaydet butonuna basarak aktifleştirin.', 'info');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  handleLogoUrlInput(val) {
    const preview = document.getElementById('settings-logo-preview');
    const placeholder = document.getElementById('settings-logo-placeholder');
    if (val && val.trim()) {
      if (preview) {
        preview.src = val.trim();
        preview.classList.remove('hidden');
        preview.style.display = 'block';
      }
      if (placeholder) placeholder.classList.add('hidden');
    } else {
      if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
      }
      if (placeholder) placeholder.classList.remove('hidden');
    }
  },

  removeLogo() {
    window.Store.saveSettings({ institutionLogo: '' });
    this.showToast('Kurs logosu kaldırıldı, varsayılan simgeye dönüldü.', 'info');
    this.renderHeader();
    this.renderSettingsView();
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
        this.showToast('Yedek geri yüklendi!', 'success');
        this.renderHeader();
        this.renderMainContent();
      } else {
        this.showToast('Hata: ' + res.error, 'error');
      }
    };
    reader.readAsText(file);
  },

  // --- Excel'den Toplu İçe Aktarma ---
  openBulkImportModal() {
    if (!this.canManageStudents()) {
      this.showToast('Toplu öğrenci yükleme yetkisi yalnızca Ana Yöneticidedir.', 'warning');
      return;
    }
    const modal = document.getElementById('bulk-import-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeBulkImportModal() {
    const modal = document.getElementById('bulk-import-modal');
    if (modal) modal.classList.add('hidden');
  },

  handleBulkPasteImport() {
    if (!this.canManageStudents()) {
      this.showToast('Yetkisiz işlem!', 'error');
      return;
    }
    const text = document.getElementById('bulk-paste-textarea').value.trim();
    if (!text) {
      this.showToast('Lütfen listeyi yapıştırınız.', 'warning');
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
          password: '123',
          familyCode: (lastName ? lastName + '2026' : 'AILE2026').toUpperCase()
        });
      }
    });

    if (newStudents.length === 0) {
      this.showToast('Öğrenci satırı bulunamadı.', 'error');
      return;
    }

    const current = window.Store.getStudents();
    newStudents.forEach(ns => {
      current.push({ ...ns, id: 'std_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4) });
    });
    window.Store.saveStudents(current);

    this.showToast(`${newStudents.length} öğrenci başarıyla aktarıldı!`, 'success');
    this.closeBulkImportModal();
    this.renderStudentsView();
  },

  // --- Tekil Öğrenci Modal İşlemleri ---
  openStudentModal(studentId = null) {
    if (!this.canManageStudents()) {
      this.showToast('Öğrenci ekleme ve düzenleme yetkisi yalnızca Ana Yöneticidedir.', 'warning');
      return;
    }
    const modal = document.getElementById('student-modal');
    const title = document.getElementById('student-modal-title');
    const form = document.getElementById('student-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('modal-student-id').value = '';

    if (studentId) {
      const student = window.Store.getStudentById(studentId);
      if (student) {
        title.innerText = 'Öğrenci & Şifre Bilgilerini Düzenle';
        document.getElementById('modal-student-id').value = student.id;
        document.getElementById('modal-student-no').value = student.studentNo;
        document.getElementById('modal-student-fn').value = student.firstName;
        document.getElementById('modal-student-ln').value = student.lastName;
        document.getElementById('modal-student-class').value = student.className;
        document.getElementById('modal-student-pass').value = student.password || '123';
        document.getElementById('modal-student-family').value = student.familyCode || '';
        document.getElementById('modal-student-etut').value = student.etutHocasi || '';
        document.getElementById('modal-student-dahili').value = student.dahiliHoca || '';
        document.getElementById('modal-student-yatakhane').value = student.yatakhane || '';
        document.getElementById('modal-student-father').value = student.fatherName || '';
        document.getElementById('modal-student-phone').value = student.parentPhone || '';
        const statusEl = document.getElementById('modal-student-status');
        if (statusEl) {
          const isPassive = student.isPassive === true || student.status === 'passive';
          statusEl.value = isPassive ? 'passive' : 'active';
        }
      }
    } else {
      title.innerText = 'Yeni Öğrenci Ekle';
      const students = window.Store.getStudents();
      const maxNo = students.reduce((max, s) => Math.max(max, parseInt(s.studentNo) || 0), 100);
      document.getElementById('modal-student-no').value = maxNo + 1;
      document.getElementById('modal-student-pass').value = '123';
      const statusEl = document.getElementById('modal-student-status');
      if (statusEl) statusEl.value = 'active';
    }

    modal.classList.remove('hidden');
  },

  closeStudentModal() {
    const modal = document.getElementById('student-modal');
    if (modal) modal.classList.add('hidden');
  },

  saveStudentFromModal(event) {
    event.preventDefault();
    if (!this.canManageStudents()) {
      this.showToast('Bu işlemi gerçekleştirme yetkiniz bulunmamaktadır.', 'error');
      return;
    }
    const id = document.getElementById('modal-student-id').value;
    const studentNo = document.getElementById('modal-student-no').value.trim();
    const firstName = document.getElementById('modal-student-fn').value.trim();
    const lastName = document.getElementById('modal-student-ln').value.trim();
    const className = document.getElementById('modal-student-class').value.trim();
    const password = document.getElementById('modal-student-pass').value.trim() || '123';
    let familyCode = document.getElementById('modal-student-family').value.trim();
    const etutHocasi = document.getElementById('modal-student-etut').value.trim();
    const dahiliHoca = document.getElementById('modal-student-dahili').value.trim();
    const yatakhane = document.getElementById('modal-student-yatakhane').value.trim();
    const fatherName = document.getElementById('modal-student-father').value.trim();
    const parentPhone = document.getElementById('modal-student-phone').value.trim();
    const statusEl = document.getElementById('modal-student-status');
    const isPassive = statusEl ? statusEl.value === 'passive' : false;

    if (!familyCode) {
      familyCode = (lastName + '2026').toUpperCase();
    }

    const payload = { 
      studentNo, 
      firstName, 
      lastName, 
      className, 
      password, 
      familyCode, 
      etutHocasi, 
      dahiliHoca, 
      yatakhane, 
      fatherName, 
      parentPhone,
      isPassive,
      status: isPassive ? 'passive' : 'active'
    };

    if (id) {
      window.Store.updateStudent(id, payload);
      this.showToast('Öğrenci ve şifre güncellendi.', 'success');
    } else {
      window.Store.addStudent(payload);
      this.showToast('Öğrenci kaydedildi!', 'success');
    }

    this.closeStudentModal();
    this.renderStudentsView();
    if (window.StudentExcelModule && typeof window.StudentExcelModule.renderTableBody === 'function') {
      window.StudentExcelModule.renderTableBody();
    }
  },

  // Talebeyi Pasife veya Aktife Al
  toggleStudentPassive(id) {
    if (!this.canManageStudents()) {
      this.showToast('Talebeleri pasife veya aktife alma yetkisi yalnızca Ana Yöneticidedir.', 'warning');
      return;
    }
    const s = window.Store.getStudentById(id);
    if (!s) return;
    const isCurrentlyPassive = s.isPassive === true || s.status === 'passive';
    const fullName = `${s.firstName} ${s.lastName}`.trim();
    const msg = isCurrentlyPassive
      ? `"${fullName}" adlı talebeyi tekrar AKTİFE almak istiyor musunuz?\n\n(Talebe günlük yoklama ve izin listelerine tekrar dahil edilecektir.)`
      : `"${fullName}" adlı talebeyi PASİFE almak istiyor musunuz?\n\n(Talebenin hiçbir geçmiş verisi silinmez; sadece günlük yoklama, izin ve puan listelerinden gizlenir.)`;

    if (confirm(msg)) {
      const res = window.Store.toggleStudentPassive(id);
      if (res && res.success) {
        if (res.isPassive) {
          this.showToast(`⏸️ "${fullName}" pasife alındı. Günlük yoklamalardan gizlendi.`, 'warning');
        } else {
          this.showToast(`▶️ "${fullName}" tekrar aktife alındı. Yoklamalara dahil edildi.`, 'success');
        }
        this.renderStudentsView();
      }
    }
  },

  deleteStudent(id) {
    if (!this.canManageStudents()) {
      this.showToast('Talebe silme yetkisi yalnızca Ana Yöneticidedir.', 'error');
      return;
    }
    const s = window.Store.getStudentById(id);
    if (!s) return;
    if (confirm(`"${s.firstName} ${s.lastName}" adlı öğrenciyi sistemden TAMAMEN SİLMEK istediğinizden emin misiniz?\n\n⚠️ Bu işlem geri alınamaz!\n(Öğrencinin geçmişini kaybetmemek için bunun yerine ⏸️ Pasife Alabilirsiniz.)`)) {
      window.Store.deleteStudent(id);
      this.showToast('Öğrenci kaydı silindi.', 'info');
      this.renderStudentsView();
    }
  },

  // --- Personel / Hoca Kendi Şifresini Değiştirme Modalı ---
  openStaffSelfPasswordModal() {
    const session = this.currentSession;
    if (!session || session.role !== 'staff') {
      this.showToast('Bu özellik sadece oturum açmış personeller içindir.', 'warning');
      return;
    }

    const modal = document.getElementById('staff-self-password-modal');
    if (!modal) return;

    const staffList = window.Store.getStaff();
    const stf = staffList.find(s => (session.staffId && s.id === session.staffId) || s.fullName === session.name);
    const currentPass = stf ? (stf.password || '123') : (session.password || '123');

    const nameEl = document.getElementById('staff-modal-user-name');
    if (nameEl) nameEl.textContent = `${session.name} (Eğitmen)`;

    const passEl = document.getElementById('staff-modal-current-pass');
    if (passEl) passEl.textContent = currentPass;

    const p1 = document.getElementById('staff-self-new-password');
    const p2 = document.getElementById('staff-self-confirm-password');
    if (p1) p1.value = '';
    if (p2) p2.value = '';

    modal.classList.remove('hidden');
    setTimeout(() => { if (p1) p1.focus(); }, 100);
  },

  closeStaffSelfPasswordModal() {
    const modal = document.getElementById('staff-self-password-modal');
    if (modal) modal.classList.add('hidden');
  },

  handleStaffSelfPasswordSubmit(event) {
    if (event) event.preventDefault();
    const session = this.currentSession;
    if (!session || session.role !== 'staff') return;

    const p1Input = document.getElementById('staff-self-new-password');
    const p2Input = document.getElementById('staff-self-confirm-password');
    if (!p1Input || !p2Input) return;

    const p1 = p1Input.value.trim();
    const p2 = p2Input.value.trim();

    if (!p1 || p1.length < 3) {
      this.showToast('Yeni şifre en az 3 karakter olmalıdır.', 'warning');
      p1Input.focus();
      return;
    }

    if (p1 !== p2) {
      this.showToast('Girdiğiniz yeni şifreler birbiriyle uyuşmuyor!', 'error');
      p2Input.select();
      return;
    }

    const staffList = window.Store.getStaff();
    const stf = staffList.find(s => (session.staffId && s.id === session.staffId) || s.fullName === session.name);
    if (!stf) {
      this.showToast('Personel kaydı bulunamadı.', 'error');
      return;
    }

    const res = window.Store.updateStaffPassword(stf.id, p1);
    if (res.success) {
      session.password = p1;
      session.staffId = stf.id;
      sessionStorage.setItem('yoklama_active_session', JSON.stringify(session));
      localStorage.setItem('yoklama_active_session', JSON.stringify(session));
      this.showToast(`Şifreniz başarıyla güncellendi! Yeni şifreniz: ${p1}`, 'success');
      this.closeStaffSelfPasswordModal();
      this.renderHeader();
    } else {
      this.showToast(res.message || 'Şifre güncellenemedi.', 'error');
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

// ========================================================
// --- CANLI EXCEL TABLOSU YÖNETİM MODÜLÜ (GÜVENLİ FALLBACK) ---
// ========================================================
if (!window.StudentExcelModule || typeof window.StudentExcelModule.addNewColumn !== 'function') {
  window.StudentExcelModule = Object.assign(window.StudentExcelModule || {}, {
  selectedClass: 'ALL',
  selectedStatus: 'ALL', // 'ALL' | 'ACTIVE' | 'PASSIVE'
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

    setStatusFilter(s) {
      this.selectedStatus = s || 'ALL';
      this.render();
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
      this.selectedStatus = 'ALL';
      this.searchQuery = '';
      const fallbackList = (window.Store && typeof window.Store.getAllStudents === 'function' && window.Store.getAllStudents()) ||
                           (window.Store && typeof window.Store.getStudents === 'function' && window.Store.getStudents(true)) ||
                           window.SEED_STUDENTS || [];
      if (fallbackList.length > 0 && window.Store && typeof window.Store.saveStudents === 'function') {
        window.Store.saveStudents(fallbackList);
      }
      this.render();
    },

    getFilteredStudents() {
      let students = [];
      try {
        if (window.Store && typeof window.Store.getAllStudents === 'function') {
          students = window.Store.getAllStudents();
        } else if (window.Store && typeof window.Store.getStudents === 'function') {
          students = window.Store.getStudents(true);
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

      // Durum Filtresi (Tümü / Sadece Aktifler / Sadece Pasifler)
      if (this.selectedStatus === 'ACTIVE') {
        students = students.filter(s => !s.isPassive && s.status !== 'passive');
      } else if (this.selectedStatus === 'PASSIVE') {
        students = students.filter(s => s.isPassive === true || s.status === 'passive');
      }

      if (this.selectedClass && this.selectedClass !== 'ALL') {
        students = students.filter(s => (s.className || '').toString().trim() === this.selectedClass.trim());
      }

      if (this.searchQuery) {
        const q = this.searchQuery;
        const customCols = (window.Store && typeof window.Store.getCustomColumns === 'function')
          ? window.Store.getCustomColumns()
          : [];
        students = students.filter(s => {
          const fullArr = [
            s.studentNo, s.firstName, s.lastName, s.className, s.school,
            s.etutHocasi, s.dahiliHoca, s.yatakhane, s.fatherName,
            s.parentPhone, s.fatherPhone, s.familyCode, s.password
          ];
          customCols.forEach(col => {
            if (s[col.key]) fullArr.push(s[col.key]);
          });
          const fullStr = fullArr.filter(Boolean).join(' ').toLowerCase();
          return fullStr.includes(q);
        });
      }

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

    addNewRow() {
      if (window.App && typeof window.App.canManageStudents === 'function' && !window.App.canManageStudents()) {
        window.App.showToast('Yeni öğrenci ekleme yetkisi yalnızca Ana Yöneticidedir.', 'error');
        return;
      }
      const students = window.Store.getStudents() || [];
      const maxNo = students.reduce((max, s) => Math.max(max, parseInt(s?.studentNo, 10) || 0), 100);
      const newNo = (maxNo + 1).toString();
      const defaultClass = (this.selectedClass && this.selectedClass !== 'ALL') ? this.selectedClass : '5. Sınıf';

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

      setTimeout(() => {
        const firstInput = document.querySelector(`input[data-student-id="${newStudent.id}"][data-field="firstName"]`);
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    },

    // Yeni Özel Sütun Ekle (Örn: Kan Grubu, TC Kimlik No, Servis, Memleket, Not)
    addNewColumn() {
      if (window.App && typeof window.App.canManageStudents === 'function' && !window.App.canManageStudents()) {
        window.App.showToast('Yeni sütun ekleme yetkisi yalnızca Ana Yöneticidedir.', 'error');
        return;
      }
      const label = prompt('Eklenecek yeni sütunun başlığını giriniz:\n(Örn: Kan Grubu, TC Kimlik No, Memleket, Servis, Özel Not)');
      if (!label || !label.trim()) return;

      const cleanLabel = label.trim();
      if (cleanLabel.length > 40) {
        window.App.showToast('Sütun başlığı 40 karakterden uzun olamaz!', 'warning');
        return;
      }

      const col = window.Store.addCustomColumn(cleanLabel);
      if (col) {
        window.App.showToast(`"${cleanLabel}" sütunu başarıyla eklendi!`, 'success');
        this.render();
      }
    },

    // Özel Sütunu Kaldır / Sil
    deleteColumn(colKey, colLabel) {
      if (window.App && typeof window.App.canManageStudents === 'function' && !window.App.canManageStudents()) {
        window.App.showToast('Sütun silme yetkisi yalnızca Ana Yöneticidedir.', 'error');
        return;
      }
      if (confirm(`"${colLabel}" sütununu tablodan KALDIRMAK istediğinizden emin misiniz?\n\n(Talebelerdeki bu sütuna ait kayıtlar sistemde korunur ancak tablodan gizlenir.)`)) {
        window.Store.deleteCustomColumn(colKey);
        window.App.showToast(`"${colLabel}" sütunu kaldırıldı.`, 'info');
        this.render();
      }
    },

    // Talebeyi Pasife veya Aktife Al
    togglePassive(id) {
      if (window.App && typeof window.App.canManageStudents === 'function' && !window.App.canManageStudents()) {
        window.App.showToast('Talebeleri pasife veya aktife alma yetkisi yalnızca Ana Yöneticidedir.', 'error');
        return;
      }
      const st = window.Store.getStudentById(id);
      if (!st) return;
      const isCurrentlyPassive = st.isPassive === true || st.status === 'passive';
      const fullName = `${st.firstName || ''} ${st.lastName || ''}`.trim();
      const msg = isCurrentlyPassive
        ? `"${fullName}" adlı talebeyi tekrar AKTİFE almak istiyor musunuz?\n\n(Talebe günlük yoklama ve izin listelerine tekrar dahil edilecektir.)`
        : `"${fullName}" adlı talebeyi PASİFE almak istiyor musunuz?\n\n(Talebenin hiçbir geçmiş verisi silinmez; sadece günlük yoklama, izin ve puan listelerinden gizlenir.)`;

      if (confirm(msg)) {
        const res = window.Store.toggleStudentPassive(id);
        if (res && res.success) {
          if (res.isPassive) {
            window.App.showToast(`⏸️ "${fullName}" pasife alındı. Günlük yoklamalardan gizlendi.`, 'warning');
          } else {
            window.App.showToast(`▶️ "${fullName}" tekrar aktife alındı. Yoklamalara dahil edildi.`, 'success');
          }
          this.render();
        }
      }
    },

    deleteRow(id) {
      if (window.App && typeof window.App.canManageStudents === 'function' && !window.App.canManageStudents()) {
        window.App.showToast('Talebe silme yetkisi yalnızca Ana Yöneticidedir.', 'error');
        return;
      }
      const st = window.Store.getStudentById(id);
      const name = st ? `${st.firstName || ''} ${st.lastName || ''}`.trim() : 'Bu talebeyi';
      if (confirm(`"${name}" kaydını sistemden TAMAMEN SİLMEK istediğinizden emin misiniz?\n\n⚠️ Bu işlem geri alınamaz!\n(Öğrencinin geçmişini kaybetmemek için bunun yerine ⏸️ Pasife Alabilirsiniz.)`)) {
        window.Store.deleteStudent(id);
        window.App.showToast('Öğrenci kaydı silindi.', 'info');
        this.render();
      }
    },

    exportToCsv() {
      const students = this.getFilteredStudents();
      if (!students || students.length === 0) {
        window.App.showToast('İndirilecek öğrenci verisi bulunamadı.', 'warning');
        return;
      }

      const customColumns = (window.Store && typeof window.Store.getCustomColumns === 'function')
        ? window.Store.getCustomColumns()
        : [];

      const headers = [
        'Okul No', 'Adı', 'Soyadı', 'Sınıfı', 'Okulu', 'Seviye',
        'Etüt Hocası', 'Dahili Hocası', 'Yatakhane', 'Veli Adı',
        'Veli Telefon',
        ...customColumns.map(c => c.label),
        'Veli Giriş Şifresi', 'Ortak Aile Kodu'
      ];

      const escapeCsv = (val) => {
        const s = (val || '').toString().replace(/"/g, '""');
        return `"${s}"`;
      };

      let csvContent = '\uFEFF';
      csvContent += headers.map(escapeCsv).join(';') + '\r\n';

      students.forEach(st => {
        const row = [
          st.studentNo || '',
          st.firstName || '',
          st.lastName || '',
          st.className || '',
          st.school || '',
          st.seviye || '',
          st.etutHocasi || '',
          st.dahiliHoca || '',
          st.yatakhane || '',
          st.fatherName || '',
          st.parentPhone || st.fatherPhone || '',
          ...customColumns.map(c => st[c.key] || ''),
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
          const c = window.Store.getClasses(true);
          if (Array.isArray(c) && c.length > 0) classes = c;
        }
      } catch (e) {}
      try {
        if (window.Store && typeof window.Store.getAllHocalar === 'function') {
          const h = window.Store.getAllHocalar();
          if (Array.isArray(h)) allHocalar = h;
        }
      } catch (e) {}

      const allStudentsList = (window.Store && typeof window.Store.getAllStudents === 'function')
        ? window.Store.getAllStudents()
        : ((window.Store && typeof window.Store.getStudents === 'function') ? window.Store.getStudents(true) : []);
      const allCount = allStudentsList.length;
      const activeCount = allStudentsList.filter(s => !s.isPassive && s.status !== 'passive').length;
      const passiveCount = allStudentsList.filter(s => s.isPassive === true || s.status === 'passive').length;

      const customColumns = (window.Store && typeof window.Store.getCustomColumns === 'function')
        ? window.Store.getCustomColumns()
        : [];

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

              <!-- Sağ Butonlar: Canlı Kayıt, Yeni Satır, Yeni Sütun, Excel İndir & Standart Liste -->
              <div class="flex flex-wrap items-center gap-2">
                <div id="excel-save-indicator" class="h-6 flex items-center mr-1"></div>

                <!-- + Yeni Satır Ekle -->
                <button type="button" onclick="window.StudentExcelModule.addNewRow()"
                  class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Tablonun altına hemen yeni bir boş öğrenci satırı ekler">
                  <span>➕</span>
                  <span>Yeni Satır Ekle</span>
                </button>

                <!-- + Yeni Sütun Ekle -->
                <button type="button" onclick="window.StudentExcelModule.addNewColumn()"
                  class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Tabloya yeni bir sütun ekler (Örn: Kan Grubu, TC Kimlik No, Servis, Memleket, Özel Not)">
                  <span>📑</span>
                  <span>Yeni Sütun Ekle</span>
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
              <div class="flex flex-wrap items-center gap-3">
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

                <!-- Durum Filtresi: Tümü, Aktifler, Pasifler -->
                <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button type="button" onclick="window.StudentExcelModule.setStatusFilter('ALL')"
                    class="px-2.5 py-1 rounded-lg text-xs font-black transition ${
                      (this.selectedStatus || 'ALL') === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    Tümü (${allCount})
                  </button>
                  <button type="button" onclick="window.StudentExcelModule.setStatusFilter('ACTIVE')"
                    class="px-2.5 py-1 rounded-lg text-xs font-black transition ${
                      this.selectedStatus === 'ACTIVE'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }">
                    🟢 Aktif (${activeCount})
                  </button>
                  <button type="button" onclick="window.StudentExcelModule.setStatusFilter('PASSIVE')"
                    class="px-2.5 py-1 rounded-lg text-xs font-black transition ${
                      this.selectedStatus === 'PASSIVE'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-800 hover:bg-amber-50'
                    }">
                    ⏸️ Pasif (${passiveCount})
                  </button>
                </div>
              </div>

              <!-- Canlı Arama Kutusu -->
              <div class="w-full sm:w-64 relative">
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
              <table class="w-full text-left border-collapse table-fixed text-xs" style="min-width: ${Math.max(1280, 1280 + customColumns.length * 140)}px;">
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
                    ${customColumns.map(col => `
                      <th class="w-36 px-2 group/col relative bg-indigo-950/70 text-indigo-200 hover:text-white transition">
                        <div class="flex items-center justify-between">
                          <span class="truncate cursor-pointer" onclick="window.StudentExcelModule.toggleSort('${col.key}')" title="${this.escapeHtml(col.label)} (Sıralamak için tıkla)">
                            ${this.escapeHtml(col.label)} ↕
                          </span>
                          <button type="button" onclick="window.StudentExcelModule.deleteColumn('${col.key}', '${this.escapeHtml(col.label)}')" 
                            class="opacity-60 group-hover/col:opacity-100 hover:text-rose-400 p-0.5 ml-1 rounded transition text-xs cursor-pointer" 
                            title="Bu Sütunu Sil">✕</button>
                        </div>
                      </th>
                    `).join('')}
                    <th class="w-24 px-2 text-center bg-amber-950/60 text-amber-300">Giriş Şifresi</th>
                    <th class="w-28 px-2">Ortak Aile Kodu</th>
                    <th class="w-20 text-center bg-slate-950">İşlem</th>
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
                <span class="text-emerald-700 font-bold">✓ Değişiklikler anında canlı sistemdedir</span>
              </div>
            </div>
          </div>

          <!-- Datalist: Sınıf ve Hoca Otomatik Tamamlama -->
          <datalist id="excel-class-list">
            ${classes.map(c => `<option value="${this.escapeHtml(c)}"></option>`).join('')}
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

      const customColumns = (window.Store && typeof window.Store.getCustomColumns === 'function')
        ? window.Store.getCustomColumns()
        : [];

      const counterEl = document.getElementById('excel-total-counter');
      if (counterEl) {
        counterEl.textContent = `Toplam ${students.length} Talebe Listeleniyor`;
      }

      if (!students || students.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="${14 + customColumns.length}" class="p-12 text-center text-slate-400 text-xs font-bold">
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
          const isCustomPass = st && st.password != null && st.password.toString().trim() !== '123';
          const isPassive = st && (st.isPassive === true || st.status === 'passive');

          return `
          <tr class="hover:bg-amber-50/40 transition-colors h-8 divide-x divide-slate-100 group ${isPassive ? 'bg-amber-50/30 opacity-80' : ''}">
            <!-- 0. Sıra No -->
            <td class="text-center font-mono text-[10px] text-slate-400 bg-slate-50/70 select-none font-bold">
              ${rowIdx + 1}
            </td>

            <!-- 1. Okul No -->
            <td class="p-0">
              <div class="flex items-center">
                <input type="text" value="${this.escapeHtml(st.studentNo || '')}" 
                  id="excel-cell-${rowIdx}-1"
                  data-student-id="${st.id}" data-field="studentNo"
                  class="excel-input flex-1 h-8 px-2 bg-transparent text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'studentNo', this.value)"
                  onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'studentNo', this.value)"
                  onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, 1)">
                ${isPassive ? `<span class="mr-1 px-1 py-0.5 rounded bg-amber-200 text-amber-950 font-black text-[9px] uppercase tracking-tighter" title="Bu talebe pasiftir (Yoklamalardan gizlidir)">PASİF</span>` : ''}
              </div>
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

            <!-- Dinamik Özel Sütunlar -->
            ${customColumns.map((col, cIdx) => {
              const cellColIdx = 11 + cIdx;
              const colVal = st[col.key] != null ? st[col.key] : '';
              return `
                <td class="p-0 bg-indigo-50/20">
                  <input type="text" value="${this.escapeHtml(colVal)}"
                    id="excel-cell-${rowIdx}-${cellColIdx}"
                    data-student-id="${st.id}" data-field="${col.key}"
                    placeholder="Yazınız..."
                    class="excel-input w-full h-8 px-2 bg-transparent text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    oninput="window.StudentExcelModule.handleCellInput('${st.id}', '${col.key}', this.value)"
                    onblur="window.StudentExcelModule.handleCellBlur('${st.id}', '${col.key}', this.value)"
                    onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, ${cellColIdx})">
                </td>
              `;
            }).join('')}

            <!-- 11. Veli Giriş Şifresi -->
            <td class="p-0 ${isCustomPass ? 'bg-amber-100/60' : 'bg-slate-50/50'}">
              <input type="text" value="${this.escapeHtml(st.password || '123')}" 
                id="excel-cell-${rowIdx}-${11 + customColumns.length}"
                data-student-id="${st.id}" data-field="password"
                class="excel-input w-full h-8 px-2 text-center font-mono font-black text-xs ${isCustomPass ? 'text-amber-950' : 'text-slate-700'} focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'password', this.value)"
                onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'password', this.value)"
                onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, ${11 + customColumns.length})">
            </td>

            <!-- 12. Ortak Aile Kodu -->
            <td class="p-0">
              <input type="text" value="${this.escapeHtml(st.familyCode || '')}" 
                id="excel-cell-${rowIdx}-${12 + customColumns.length}"
                data-student-id="${st.id}" data-field="familyCode"
                class="excel-input w-full h-8 px-2 bg-transparent text-indigo-950 font-mono font-bold text-xs uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                oninput="window.StudentExcelModule.handleCellInput('${st.id}', 'familyCode', this.value)"
                onblur="window.StudentExcelModule.handleCellBlur('${st.id}', 'familyCode', this.value)"
                onkeydown="window.StudentExcelModule.handleKeyDown(event, ${rowIdx}, ${12 + customColumns.length})">
            </td>

            <!-- 13. İşlem (Pasife/Aktife Al & Sil) -->
            <td class="text-center p-0">
              <div class="flex items-center justify-center gap-1">
                ${isPassive ? `
                  <button type="button" onclick="window.StudentExcelModule.togglePassive('${st.id}')"
                    class="w-7 h-7 inline-flex items-center justify-center text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition text-xs font-bold"
                    title="Talebeyi Tekrar Aktife Al (Yoklamalara dahil et)">
                    ▶️
                  </button>
                ` : `
                  <button type="button" onclick="window.StudentExcelModule.togglePassive('${st.id}')"
                    class="w-7 h-7 inline-flex items-center justify-center text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition text-xs"
                    title="Talebeyi Pasife Al (Yoklamalardan gizle, geçmiş verileri silinmez)">
                    ⏸️
                  </button>
                `}
                <button type="button" onclick="window.StudentExcelModule.deleteRow('${st.id}')"
                  class="w-7 h-7 inline-flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-xs"
                  title="Talebeyi Sistemden Kalıcı Sil">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
        console.error('renderTableBody render error:', err);
        tbody.innerHTML = `
          <tr>
            <td colspan="${14 + customColumns.length}" class="p-8 text-center text-rose-600 text-xs font-bold">
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
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
  });
} else {
  window.App.init();
}
