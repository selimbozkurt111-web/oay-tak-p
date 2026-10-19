/**
 * app.js - Ad Soyad + Şifre Girişi ve E-postalı Ana Yönetici Doğrulama Sistemi
 */

window.App = {
  currentSession: null,
  activeTab: 'yoklama',
  loginMode: 'user', // 'user' (Ad Soyad + Şifre) veya 'admin_otp' (Önce Şifre + E-posta 2FA)
  loginTab: 'parent', // 'parent' (Veli) veya 'staff' (Eğitmen)
  otpStep: 'password', // 'password' (1. Aşama: Şifre Doğrulama) veya 'verify' (2. Aşama: E-posta Kodu)
  adminEmailDraft: '',
  showAdminOtpOnScreen: true, // Kodu ekranda gösterme tercihi
  lastGeneratedAdminOtp: '',
  studentFilterClass: 'ALL',
  studentSearchQuery: '',
  studentSortField: 'studentNo',
  studentSortOrder: 'asc',
  studentTableEditMode: false,
  studentDrafts: {},
  studentNewDrafts: [],
  studentDeletedDrafts: new Set(),

  init() {
    // Sürüm kontrolü ve önbellek temizliği doğrudan index.html tarafından merkezi olarak yönetilir.
    const saved = sessionStorage.getItem('yoklama_active_session') || localStorage.getItem('yoklama_active_session');
    if (saved) {
      try {
        sessionStorage.setItem('yoklama_active_session', saved);
        this.currentSession = JSON.parse(saved);
        if (this.currentSession && (this.currentSession.role === 'superadmin' || this.currentSession.staffId === 'admin_root')) {
          this.currentSession.role = 'superadmin';
          this.currentSession.canEditStudents = true;
          this.currentSession.canManageStaff = true;
          this.currentSession.canEditSettings = true;
          if (this.activeTab === 'yoklama' || this.activeTab === 'ogrenciler_excel' || this.activeTab === 'excel') {
            this.activeTab = 'ogrenciler';
          }
        }
      } catch {
        this.currentSession = null;
      }
    }
    if (this.activeTab === 'ogrenciler_excel' || this.activeTab === 'excel') {
      this.activeTab = 'ogrenciler';
    }

    // Sayfadan ayrılma uyarısı (Kaydedilmemiş öğrenci taslakları varsa)
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedStudentChanges && this.hasUnsavedStudentChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    this.renderHeader();
    this.renderMainContent();
    this.setupDragAndDropImport();

    // Bulut senkronizasyonu tamamlandığında ekranı sessizce ve kesintisiz tazele
    window.addEventListener('cloud-sync-done', () => {
      this.renderHeader();
      if (this.currentSession) {
        // 1. KULLANICI ŞU ANDA HERHANGİ BİR KUTUYA NOT/YAZI GİRİYORSA EKRANI ASLA YENİDEN ÇİZME!
        const isInputFocused = document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || 
           document.activeElement.tagName === 'TEXTAREA' || 
           document.activeElement.tagName === 'SELECT');
        if (isInputFocused) {
          return; // Klavyenin kapanmasını ve ekranın başa zıplamasını %100 engeller
        }

        // 2. Takviye Notları, Test Neticeleri, Canlı Excel, Kur'an Takip, Öğrenci Toplu Düzenleme, Görevler ve Ayarlar kendi durumunu yönetir;
        // Arka plan senkronizasyonu bu ekranların DOM'unu ve odağını ASLA ezmemelidir!
        if (
          this.activeTab === 'performans' || 
          this.activeTab === 'akademi' || 
          this.activeTab === 'test_results' || 
          this.activeTab === 'testler' || 
          this.activeTab === 'test_sonuclari' || 
          this.activeTab === 'denemeler' || 
          this.activeTab === 'deneme_sinavlari' || 
          this.activeTab === 'ogrenciler_excel' || 
          this.activeTab === 'kuran_takip' || 
          this.activeTab === 'hatim' || 
          (this.activeTab === 'gorevler' && (isInputFocused || (typeof this.hasUnsavedDutyChanges === 'function' && this.hasUnsavedDutyChanges()))) ||
          (this.activeTab === 'ogrenciler' && (this.studentTableEditMode || (typeof this.hasUnsavedStudentChanges === 'function' && this.hasUnsavedStudentChanges()))) ||
          this.activeTab === 'ayarlar'
        ) {
          return;
        }

        if (this.activeTab === 'izin_donusu' && window.LeaveReturnModule) {
          const lrm = window.LeaveReturnModule;
          // Modal açıksa veya kullanıcı bir giriş alanındaysa arayüzü zıplatma
          if (lrm.activeExcuseStudentId || lrm.monthlyModalStudentId) return;
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) return;
          // Son 3 saniye içinde yerel işlem yapıldıysa tekrar tetikleme
          if (lrm._lastActionTime && (Date.now() - lrm._lastActionTime < 3000)) return;

          if (typeof lrm.refreshSettings === 'function') {
            lrm.refreshSettings();
          }
          lrm.renderView(true);
        } else if (this.activeTab === 'izin_cikis' && window.LeaveTrackerModule) {
          window.LeaveTrackerModule.renderView();
        } else if (this.activeTab === 'yoklama' && window.AttendanceModule) {
          window.AttendanceModule.renderView();
        } else if (this.activeTab === 'leaderboard' && window.LeaderboardModule) {
          window.LeaderboardModule.renderView();
        } else if (this.activeTab === 'gorevler') {
          if (isInputFocused || (typeof this.hasUnsavedDutyChanges === 'function' && this.hasUnsavedDutyChanges())) {
            return;
          }
          const targetDate = this.selectedDutyDate || new Date().toISOString().split('T')[0];
          const freshDuties = (window.Store && typeof window.Store.getDailyDuties === 'function')
            ? window.Store.getDailyDuties(targetDate, false)
            : { yemekciler: [], muezzin: '', note: '' };
          this.draftDutyYemekciler = Array.isArray(freshDuties.yemekciler) ? [...freshDuties.yemekciler] : [];
          this.draftDutyMuezzin = freshDuties.muezzin || '';
          this.draftDutyNote = freshDuties.note || '';
          this.renderDailyDutiesView();
        } else if (this.activeTab === 'ogrenciler') {
          this.renderStudentsView();
        } else if (this.activeTab === 'personel') {
          this.renderStaffView();
        } else {
          this.renderMainContent();
        }
      }
    });

    // Görevliler başka cihazda güncellendiğinde anında yenile (kullanıcı yazmıyorsa ve taslak yoksa)
    window.addEventListener('daily-duties-updated', () => {
      if (this.currentSession && this.activeTab === 'gorevler') {
        const isInputFocused = document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || 
           document.activeElement.tagName === 'TEXTAREA' || 
           document.activeElement.tagName === 'SELECT');
        if (isInputFocused || (typeof this.hasUnsavedDutyChanges === 'function' && this.hasUnsavedDutyChanges())) {
          return;
        }
        const targetDate = this.selectedDutyDate || new Date().toISOString().split('T')[0];
        const freshDuties = (window.Store && typeof window.Store.getDailyDuties === 'function')
          ? window.Store.getDailyDuties(targetDate, false)
          : { yemekciler: [], muezzin: '', note: '' };
        this.draftDutyYemekciler = Array.isArray(freshDuties.yemekciler) ? [...freshDuties.yemekciler] : [];
        this.draftDutyMuezzin = freshDuties.muezzin || '';
        this.draftDutyNote = freshDuties.note || '';
        this.renderDailyDutiesView();
      }
    });

    // Öğrenci listesi buluttan veya yerelden güncellendiğinde ekranı sessizce tazele
    window.addEventListener('students-updated', () => {
      this.renderHeader();
      if (this.currentSession) {
        if (this.activeTab === 'yoklama' && window.AttendanceModule) {
          window.AttendanceModule.renderView();
        } else if (this.activeTab === 'ogrenciler' && !this.studentTableEditMode) {
          this.renderStudentsView();
        }
      }
    });
    window.addEventListener('students-cloud-updated', () => {
      this.renderHeader();
      if (this.currentSession) {
        if (this.activeTab === 'yoklama' && window.AttendanceModule) {
          window.AttendanceModule.renderView();
        } else if (this.activeTab === 'ogrenciler' && !this.studentTableEditMode) {
          this.renderStudentsView();
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

    // Yeni sürümde ogrenciler.csv dosyasını arka planda otomatik çek ve eşitle (Sıfır soru, sıfır sürükle-bırak!)
    const currentBuildVer = '20261015_v10.39_MASTER_EXCEL_STRICT';
    if (localStorage.getItem('oay_auto_csv_synced_build') !== currentBuildVer) {
      if (window.Store && typeof window.Store.syncFromManualDataFile === 'function') {
        setTimeout(() => {
          window.Store.syncFromManualDataFile().then(() => {
            try { localStorage.setItem('oay_auto_csv_synced_build', currentBuildVer); } catch(e){}
          }).catch(() => {});
        }, 500);
      }
    }
  },

  // Tarayıcı ve PWA önbelleğini tek tıkla tamamen temizleyip en güncel kodları zorla yükleme
  async hardRefreshApp() {
    if (typeof window.forcePurgeAppCache === 'function') {
      window.forcePurgeAppCache();
      return;
    }
    this.showToast('Önbellek temizleniyor ve sayfa yenileniyor...', 'info');
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.warn('Cache purge:', e);
    }
    setTimeout(() => {
      window.location.href = window.location.pathname + '?reload=' + Date.now();
    }, 250);
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

    // Ana Yönetici (Müdür) Girişi İse: Önce Şifre Doğrulandı, Şimdi 2. Aşama (E-postaya Kod Gönderimi)
    if (session.requiresAdminOtp) {
      const settings = window.Store.getSettings();
      const adminEmail = session.email || settings.adminEmail || 'selimbozkurt111@gmail.com';
      const res = window.Store.generateAdminOtp(adminEmail);
      if (res && res.success) {
        this.sendAdminOtpEmail(adminEmail, res.code);
        this.adminEmailDraft = adminEmail;
        this.lastGeneratedAdminOtp = res.code;
        this.showAdminOtpOnScreen = true;
        this.loginMode = 'admin_otp';
        this.otpStep = 'verify';
        this.showToast(`✓ Şifreniz onaylandı! 2. Güvenlik Aşaması: ${adminEmail} adresinize 6 haneli kod gönderildi.`, 'success');
        this.renderMainContent();
        return;
      }
    }

    this.currentSession = session;
    sessionStorage.setItem('yoklama_active_session', JSON.stringify(session));
    localStorage.setItem('yoklama_active_session', JSON.stringify(session));

    if (session.role === 'superadmin' || session.staffId === 'admin_root') {
      this.activeTab = 'ogrenciler';
      this.showToast(`👑 Hoş geldiniz Sayın ${session.name}! Öğrenci Yönetim Paneli açıldı.`, 'success');
    } else if (session.role === 'staff') {
      this.activeTab = 'yoklama';
      this.showToast(`Hoş geldiniz Sayın ${session.name}`, 'success');
    } else if (session.role === 'parent') {
      this.showToast(`Hoş geldiniz Sayın Veli`, 'success');
    }

    this.renderHeader();
    this.renderMainContent();
  },

  // E-posta Gönderme Servis Çağrısı (formsubmit.co)
  sendAdminOtpEmail(email, code) {
    try {
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `🔑 [GİRİŞ ONAY KODU: ${code}] - Ömer Avniyel Akademi`,
          "Yetkili": "Kurum Yöneticisi / Müdürlük",
          "Alıcı E-Posta": email,
          "Giriş Güvenlik Kodu": code,
          "Açıklama": `Sayın Kurum Yöneticisi,\n\nÖmer Avniyel Akademi Ana Yönetici paneline giriş için 1. aşama şifreniz başarıyla doğrulanmıştır.\n\nSisteme girişinizi tamamlamak için 2. Aşama Güvenlik Kodunuz:\n\n👉  ${code}  👈\n\nBu kod 10 dakika süreyle geçerlidir.`,
          _captcha: "false",
          _template: "table"
        })
      }).catch(err => console.warn('E-posta servis bildirimi:', err));
    } catch (err) {
      console.warn('E-posta gönderim hatası:', err);
    }
  },

  // --- 1. AŞAMA: Ana Yönetici Şifresini Doğrulama ve E-postaya Kod Gönderme ---
  handleAdminPasswordSubmit(event) {
    if (event) event.preventDefault();
    const passInput = document.getElementById('admin-login-pass');
    const password = passInput ? passInput.value.trim() : '';

    if (!password) {
      this.showToast('Lütfen yönetici giriş şifrenizi giriniz.', 'warning');
      if (passInput) passInput.focus();
      return;
    }

    const isValid = window.Store.verifyAdminPassword(password);
    if (!isValid) {
      this.showToast('❌ Hatalı yönetici şifresi! Lütfen tekrar deneyiniz.', 'error');
      if (passInput) passInput.select();
      return;
    }

    // Şifre geçerli! 2. AŞAMA: E-postaya kod gönder
    const settings = window.Store.getSettings();
    const email = settings.adminEmail || 'selimbozkurt111@gmail.com';
    const res = window.Store.generateAdminOtp(email);

    if (!res.success) {
      this.showToast(res.message, 'error');
      return;
    }

    this.sendAdminOtpEmail(email, res.code);

    this.adminEmailDraft = email;
    this.lastGeneratedAdminOtp = res.code;
    this.showAdminOtpOnScreen = true;
    this.otpStep = 'verify';

    this.showToast(`✓ Şifre onaylandı! Onay kodu ${email} adresinize gönderildi.`, 'success');
    this.renderMainContent();
  },

  // E-posta Kodunu Yeniden Gönderme
  handleAdminOtpResend() {
    const settings = window.Store.getSettings();
    const email = this.adminEmailDraft || settings.adminEmail || 'selimbozkurt111@gmail.com';
    const res = window.Store.generateAdminOtp(email);

    if (!res.success) {
      this.showToast(res.message, 'error');
      return;
    }

    this.sendAdminOtpEmail(email, res.code);
    this.lastGeneratedAdminOtp = res.code;
    this.showToast(`Yeni onay kodu ${email} adresinize gönderildi.`, 'info');
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

  // --- 2. AŞAMA: E-posta Kodunu Doğrulama ve Sisteme Girme ---
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
    this.otpStep = 'password';
    this.lastGeneratedAdminOtp = '';
    this.activeTab = 'ogrenciler';

    this.showToast('👑 Şifre ve E-posta doğrulaması başarılı! Ana Yönetici olarak giriş yapıldı.', 'success');
    this.renderHeader();
    this.renderMainContent();
  },

  logout() {
    this.currentSession = null;
    sessionStorage.removeItem('yoklama_active_session');
    localStorage.removeItem('yoklama_active_session');
    localStorage.removeItem('pano_admin_authorized');
    this.loginMode = 'user';
    this.otpStep = 'password';
    this.showToast('Güvenli çıkış yapıldı.', 'info');
    this.renderHeader();
    this.renderMainContent();
  },

  setTab(tab) {
    if (this.activeTab === 'ogrenciler' && tab !== 'ogrenciler' && typeof this.hasUnsavedStudentChanges === 'function' && this.hasUnsavedStudentChanges()) {
      if (!confirm('Kaydedilmemiş öğrenci değişiklikleriniz var!\n\nKaydetmeden başka bir sekmeye geçerseniz yaptığınız düzenlemeler silinecektir. Çıkmak istediğinizden emin misiniz?')) {
        return;
      }
      this.discardStudentDrafts(false);
    }
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
      roleBadge = `<span class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black text-xs border border-amber-300 whitespace-nowrap">👑 Kurum Yöneticisi</span>`;
    } else if (session.role === 'staff') {
      roleBadge = `<span class="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-bold text-xs border border-blue-200 whitespace-nowrap">👨‍🏫 ${session.name} ${session.staffRole ? `(${session.staffRole})` : ''}</span>`;
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
    } else if (this.activeTab === 'denemeler' || this.activeTab === 'deneme_sinavlari') {
      let filterLabel = 'Tümü';
      if (window.MockExamModule) {
        if (window.MockExamModule.selectedGrade && window.MockExamModule.selectedGrade !== 'ALL') {
          filterLabel = `${window.MockExamModule.selectedGrade}. Sınıf`;
        }
      }
      activeTitle = `🎯 Deneme Sınavları & Kazanım (${filterLabel})`;
    } else if (this.activeTab === 'leaderboard') {
      activeTitle = '🏆 Haftanın & Ayın Talebesi';
    } else if (this.activeTab === 'kuran_takip' || this.activeTab === 'hatim') {
      activeTitle = '📖 Kur\'an-ı Kerim & Hatim';
    } else if (this.activeTab === 'izin_cikis') {
      activeTitle = '🚪 İzine Çıkış Takibi';
    } else if (this.activeTab === 'izin_donusu') {
      activeTitle = '🧳 İzin Dönüşü Takibi';
    } else if (this.activeTab === 'ogrenciler') {
      activeTitle = '👥 Öğrenci Yönetimi';
    } else if (this.activeTab === 'personel') {
      activeTitle = '👨‍🏫 Personel Yönetimi';
    } else if (this.activeTab === 'gorevler') {
      activeTitle = '🎯 Günün Görevlileri';
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

        <!-- SAĞ: SİSTEMİ & ÖNBELLEĞİ YENİLE BUTONU -->
        <div class="flex-shrink-0 ml-auto">
          <button type="button" onclick="window.App.hardRefreshApp()" 
            class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-amber-500 active:scale-95"
            title="Sistemi ve önbelleği sıfırlayıp en güncel sürümü yükler">
            <span>🔄</span>
            <span class="inline">Önbelleği Yenile</span>
          </button>
        </div>
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
    if (this.activeTab === 'ogrenciler' && tab !== 'ogrenciler' && typeof this.hasUnsavedStudentChanges === 'function' && this.hasUnsavedStudentChanges()) {
      if (!confirm('Kaydedilmemiş öğrenci değişiklikleriniz var!\n\nKaydetmeden başka bir ekrana geçerseniz bu değişiklikler kaybolacaktır. Çıkmak istediğinizden emin misiniz?')) {
        return;
      }
      this.discardStudentDrafts(false);
    }
    if ((this.activeTab === 'kuran_takip' || this.activeTab === 'hatim') && tab !== 'kuran_takip' && tab !== 'hatim' && window.QuranTrackerModule && typeof window.QuranTrackerModule.hasPendingChanges === 'function' && window.QuranTrackerModule.hasPendingChanges()) {
      if (!confirm('Kaydedilmemiş Kur\'an takip değişiklikleriniz var!\n\nKaydetmeden başka bir ekrana geçerseniz girdiğiniz sayfalar kaybolacaktır. Çıkmak istediğinizden emin misiniz?')) {
        return;
      }
      window.QuranTrackerModule.pendingChanges = {};
    }
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
    if (tab === 'denemeler' || tab === 'deneme_sinavlari') {
      if (window.MockExamModule) {
        if (targetClass && targetClass.startsWith('GRADE_')) {
          window.MockExamModule.selectedGrade = targetClass.replace('GRADE_', '');
        }
      }
    }
    if ((tab === 'kuran_takip' || tab === 'hatim') && category && window.QuranTrackerModule) {
      window.QuranTrackerModule.selectedGroup = category;
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

          <!-- Günün Görevlileri (Yemekçi & Müezzin) -->
          <button type="button" onclick="window.App.navigateFromDrawer('gorevler')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              this.activeTab === 'gorevler'
                ? 'bg-amber-100 text-amber-950 font-black border border-amber-300 shadow-sm'
                : 'text-slate-700 hover:bg-amber-50/50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">🎯</span>
              <div>
                <div class="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <span>Günün Görevlileri</span>
                  <span class="text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Pano & TV</span>
                </div>
                <div class="text-[10px] text-slate-500 font-medium">Yemekhane nöbetçileri ve vakit müezzini atama</div>
              </div>
            </div>
            <span class="text-amber-600 font-bold">→</span>
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

          <!-- Deneme Sınavı Oluştur & Yönet (YENİ - 500 Puan & MEB Kazanımları) -->
          <button type="button" onclick="window.App.navigateFromDrawer('denemeler')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              (this.activeTab === 'denemeler' || this.activeTab === 'deneme_sinavlari')
                ? 'bg-purple-50 text-purple-900 font-black border border-purple-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">🎯</span>
              <div>
                <div class="text-xs font-black flex items-center gap-1.5">
                  <span>Deneme Sınavı Oluştur & Yönet</span>
                  <span class="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase">LGS 500P</span>
                </div>
                <div class="text-[10px] text-slate-400 font-medium">Soru sayısı, ders katsayıları, MEB kazanımları & karne</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>

          <!-- Kur'an-ı Kerim & Hatim Takibi (YENİ!) -->
          <button type="button" onclick="window.App.navigateFromDrawer('kuran_takip')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              this.activeTab === 'kuran_takip'
                ? 'bg-emerald-50 text-emerald-900 font-black border border-emerald-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">📖</span>
              <div>
                <div class="text-xs font-black flex items-center gap-1.5">
                  <span>Kur'an-ı Kerim & Hatim</span>
                  <span class="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Yeni</span>
                </div>
                <div class="text-[10px] text-slate-400 font-medium">Dini ders grupları, sayfa takibi ve cüz hesabı</div>
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

          <!-- Eksi Kusur Puanı Girişi -->
          <button type="button" onclick="window.App.closeDrawer(); window.App.openDemeritModal();"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between text-slate-700 hover:bg-rose-50/80 font-bold border border-rose-200/80 bg-rose-50/40">
            <div class="flex items-center gap-3">
              <span class="text-xl">⚠️</span>
              <div>
                <div class="text-xs font-black text-rose-950 flex items-center gap-1.5">
                  <span>Eksi Kusur Puanı Girişi</span>
                  <span class="text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Ceza / İntizam</span>
                </div>
                <div class="text-[10px] text-slate-500 font-medium">İntizamsızlık, gecikme ve kusur puanı düşüşü</div>
              </div>
            </div>
            <span class="text-rose-600 font-bold text-xs">Ekle +</span>
          </button>


          <!-- Canlı TV / Koridor Panosu (Sadece Kurum Yöneticisine Özel) -->
          ${(session && (session.role === 'superadmin' || session.canManageStaff)) ? `
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
                <div class="text-[10px] text-slate-400 font-medium">Saatli varış kaydı ve 3 katı izne ek telafi süresi</div>
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
                <div class="text-[10px] text-slate-400 font-medium">Tüm sınıf listesi ve veli şifreleri</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>
        </div>

        ${(session.canManageStaff || session.role === 'superadmin' || session.canEditSettings) ? `
          <!-- 3. YÖNETİCİ İŞLEMLERİ (Sadece Ana Yönetici) -->
          <div class="space-y-1.5 pt-3 border-t border-slate-100">
            <div class="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">YÖNETİCİ İŞLEMLERİ</div>

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

            <!-- Günün Görevlileri Yönetimi -->
            <button type="button" onclick="window.App.navigateFromDrawer('gorevler')"
              class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
                this.activeTab === 'gorevler'
                  ? 'bg-amber-100 text-amber-950 font-black border border-amber-300 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50 font-bold'
              }">
              <div class="flex items-center gap-3">
                <span class="text-xl">🎯</span>
                <div>
                  <div class="text-xs font-black">Günün Görevlileri Yönetimi</div>
                  <div class="text-[10px] text-slate-400 font-medium">Yemekhane nöbetçileri ve müezzin atama</div>
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
                  <div class="text-[10px] text-slate-400 font-medium">Yönetici maili ve sistem yapılandırması</div>
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

      <!-- Drawer Alt Bar: Güvenli Çıkış ve Önbellek Yenileme -->
      <div class="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
        <button type="button" onclick="window.App.hardRefreshApp();"
          class="w-full py-2.5 px-4 rounded-xl text-slate-700 hover:bg-slate-200/70 border border-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          title="Yeni özellikleri göremiyorsanız önbelleği temizleyip sayfayı yeniler">
          <span>🔄</span>
          <span>Sistemi & Önbelleği Yenile</span>
        </button>
        <button type="button" onclick="window.App.closeDrawer(); window.App.logout();"
          class="w-full py-2.5 px-4 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer">
          <span>🚪</span>
          <span>Güvenli Çıkış Yap</span>
        </button>
      </div>
    `;
  },

  // --- Eksi Kusur / Ceza Puanı Girişi Modalı (Sol Kayar Menü & Liderlik Kısayolu) ---
  openDemeritModal(studentId = null) {
    this.closeDrawer();
    let container = document.getElementById('demerit-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'demerit-modal-container';
      document.body.appendChild(container);
    }
    container.innerHTML = this.renderDemeritModalHtml(studentId);

    if (studentId) {
      setTimeout(() => {
        const select = document.getElementById('demerit-student-select');
        if (select) {
          select.value = studentId;
          const opt = select.querySelector(`option[value="${studentId}"]`);
          if (opt) {
            const optClass = opt.getAttribute('data-class');
            const classFilter = document.getElementById('demerit-class-filter');
            if (classFilter && optClass) {
              classFilter.value = optClass;
              this.filterDemeritStudents();
              select.value = studentId;
            }
          }
        }
      }, 50);
    }
  },

  closeDemeritModal() {
    const container = document.getElementById('demerit-modal-container');
    if (container) {
      container.innerHTML = '';
    }
  },

  renderDemeritModalHtml(preselectedStudentId = null) {
    const allStudents = (window.Store && typeof window.Store.getStudents === 'function') ? window.Store.getStudents() : [];
    const activeStudents = allStudents.filter(s => {
      if (!s || !s.id) return false;
      if (window.Store.isStudentPassive && window.Store.isStudentPassive(s.id)) return false;
      if (window.Store.isStudentDeleted && window.Store.isStudentDeleted(s.id)) return false;
      return true;
    });

    activeStudents.sort((a, b) => {
      const cComp = (a.className || '').localeCompare(b.className || '', 'tr', { numeric: true });
      if (cComp !== 0) return cComp;
      return (a.firstName || '').localeCompare(b.firstName || '', 'tr');
    });

    const classes = (window.Store && typeof window.Store.getClasses === 'function') ? window.Store.getClasses() : [];
    const today = new Date().toISOString().split('T')[0];
    const hocaName = this.currentSession?.name || this.currentSession?.user?.fullName || 'Nöbetçi Hoca';
    
    const allBonus = (window.Store && typeof window.Store.getAllBonusPoints === 'function') ? window.Store.getAllBonusPoints() : [];
    const recentDemerits = allBonus.filter(b => Number(b.points) < 0).slice(-6).reverse();
    const preStudent = preselectedStudentId ? activeStudents.find(s => s.id === preselectedStudentId) : null;

    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 animate-fade-in no-print overflow-y-auto">
        <div class="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-lg w-full p-4 sm:p-6 space-y-4 my-auto relative max-h-[95vh] flex flex-col">
          
          <!-- Modal Başlık -->
          <div class="flex items-center justify-between pb-3 border-b border-rose-100 flex-shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-rose-100 border border-rose-200 text-rose-700 text-xl font-black flex items-center justify-center shadow-xs flex-shrink-0">
                ⚠️
              </div>
              <div>
                <h3 class="font-black text-base text-slate-900 flex items-center gap-2">
                  <span>Eksi Kusur Puanı Girişi</span>
                  <span class="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">İntizam</span>
                </h3>
                <p class="text-xs text-slate-500 font-medium">Talebeye nizam veya kural ihlali sebebiyle eksi puan düş</p>
              </div>
            </div>
            <button type="button" onclick="window.App.closeDemeritModal()" 
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Kaydırılabilir İçerik -->
          <div class="overflow-y-auto space-y-4 flex-1 pr-1">
            <form id="demerit-form" onsubmit="window.App.saveDemeritSubmit(event)" class="space-y-4">
              
              <!-- 1. Talebe Seçimi -->
              <div>
                <label class="block text-xs font-black text-slate-800 mb-1.5 uppercase flex items-center justify-between">
                  <span>TALEBE SEÇİMİ *</span>
                  <span class="text-[10px] text-slate-400 font-normal">Toplam ${activeStudents.length} Talebe</span>
                </label>
                
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  <!-- Sınıf Filtresi -->
                  <select id="demerit-class-filter" onchange="window.App.filterDemeritStudents()" 
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-rose-400 cursor-pointer">
                    <option value="ALL">Tüm Sınıflar</option>
                    ${classes.map(c => `<option value="${c}" ${preStudent && preStudent.className === c ? 'selected' : ''}>${c}</option>`).join('')}
                  </select>
                  
                  <!-- Hızlı Arama -->
                  <input type="text" id="demerit-search-input" placeholder="Talebe ara..." oninput="window.App.filterDemeritStudents()"
                    class="sm:col-span-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-rose-400">
                </div>

                <!-- Talebe Dropdown Listesi -->
                <select id="demerit-student-select" required
                  class="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500 cursor-pointer shadow-2xs">
                  <option value="">-- Lütfen Bir Talebe Seçiniz --</option>
                  ${activeStudents.map(s => `
                    <option value="${s.id}" data-class="${s.className || ''}" data-name="${(s.firstName + ' ' + s.lastName).toLowerCase()}" data-no="${s.studentNo || ''}" ${preselectedStudentId === s.id ? 'selected' : ''}>
                      ${s.studentNo ? s.studentNo + ' - ' : ''}${s.firstName} ${s.lastName} (${s.className || 'Sınıfsız'})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- 2. Tarih ve Yetkili Hoca -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-black text-slate-700 mb-1 uppercase">TARİH *</label>
                  <input type="date" id="demerit-date-input" value="${today}" max="${today}" required
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-rose-400">
                </div>
                <div>
                  <label class="block text-xs font-black text-slate-700 mb-1 uppercase">EĞİTMEN *</label>
                  <input type="text" id="demerit-hoca-input" value="${hocaName}" required placeholder="Hoca Adı"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-rose-400">
                </div>
              </div>

              <!-- 3. Düşülecek Eksi Kusur Puanı Miktarı -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="block text-xs font-black text-rose-950 uppercase">DÜŞÜLECEK KUSUR PUANI *</label>
                  <span class="text-[11px] font-black text-rose-600 font-mono" id="demerit-pts-badge">-10 Puan</span>
                </div>

                <!-- Hızlı Seçim Butonları -->
                <div class="grid grid-cols-5 gap-1.5 mb-2">
                  <button type="button" onclick="window.App.setDemeritPoints(-5)"
                    class="demerit-preset-btn py-2 px-1 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-[11px] font-black text-rose-800 transition text-center cursor-pointer">
                    -5
                  </button>
                  <button type="button" onclick="window.App.setDemeritPoints(-10)"
                    class="demerit-preset-btn py-2 px-1 rounded-xl border-2 border-rose-500 bg-rose-100 text-[11px] font-black text-rose-900 transition text-center cursor-pointer shadow-xs">
                    -10
                  </button>
                  <button type="button" onclick="window.App.setDemeritPoints(-15)"
                    class="demerit-preset-btn py-2 px-1 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-[11px] font-black text-rose-800 transition text-center cursor-pointer">
                    -15
                  </button>
                  <button type="button" onclick="window.App.setDemeritPoints(-20)"
                    class="demerit-preset-btn py-2 px-1 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-[11px] font-black text-rose-800 transition text-center cursor-pointer">
                    -20
                  </button>
                  <button type="button" onclick="window.App.setDemeritPoints(-30)"
                    class="demerit-preset-btn py-2 px-1 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-[11px] font-black text-rose-800 transition text-center cursor-pointer">
                    -30
                  </button>
                </div>

                <!-- Manuel Sayısal Giriş -->
                <div class="relative">
                  <input type="number" id="demerit-pts-input" value="-10" max="-1" min="-100" required
                    oninput="window.App.handleDemeritPointsInput(this.value)"
                    class="w-full px-3.5 py-2.5 bg-rose-50/30 border border-rose-300 rounded-xl text-sm font-black text-rose-700 font-mono focus:bg-white focus:outline-none focus:border-rose-500">
                  <span class="absolute right-3 top-2.5 text-xs text-rose-400 font-bold">Puan Düşülecek</span>
                </div>
              </div>

              <!-- 4. Kusur Sebebi / Açıklama -->
              <div>
                <label class="block text-xs font-black text-slate-800 mb-1.5 uppercase">KUSUR SEBEBİ / İHLAL *</label>

                <!-- Hazır Sebep Çipleri -->
                <div class="grid grid-cols-2 gap-1.5 mb-2">
                  <button type="button" onclick="window.App.setDemeritReason('Oda / Yatak İntizamsızlığı')"
                    class="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 text-[11px] font-bold text-slate-700 text-left transition cursor-pointer">
                    🛏️ Oda / Yatak İntizamsızlığı
                  </button>
                  <button type="button" onclick="window.App.setDemeritReason('Etüt / Derse Geç Kalma')"
                    class="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 text-[11px] font-bold text-slate-700 text-left transition cursor-pointer">
                    ⏰ Etüt / Derse Geç Kalma
                  </button>
                  <button type="button" onclick="window.App.setDemeritReason('Nizamsız Davranış / Gürültü')"
                    class="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 text-[11px] font-bold text-slate-700 text-left transition cursor-pointer">
                    📢 Nizamsız Davranış / Gürültü
                  </button>
                  <button type="button" onclick="window.App.setDemeritReason('Ödev / Görev İhmali')"
                    class="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 text-[11px] font-bold text-slate-700 text-left transition cursor-pointer">
                    📚 Ödev / Görev İhmali
                  </button>
                  <button type="button" onclick="window.App.setDemeritReason('Mescit / Cemaate Geç Kalma')"
                    class="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 text-[11px] font-bold text-slate-700 text-left transition cursor-pointer">
                    🕌 Mescit / Cemaate Geç Kalma
                  </button>
                  <button type="button" onclick="window.App.setDemeritReason('İzinsiz Cihaz / Telefon')"
                    class="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 text-[11px] font-bold text-slate-700 text-left transition cursor-pointer">
                    📱 İzinsiz Cihaz / Telefon
                  </button>
                </div>

                <input type="text" id="demerit-reason-input" value="Oda / Yatak İntizamsızlığı" required placeholder="Kusur sebebi veya detay..."
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500">
              </div>

              <!-- İşlem Butonları -->
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onclick="window.App.closeDemeritModal()"
                  class="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer">
                  Vazgeç
                </button>
                <button type="submit" 
                  class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95">
                  <span>⚠️</span>
                  <span>Eksi Kusur Puanını Kaydet</span>
                </button>
              </div>

            </form>

            <!-- 5. Son İşlenen Kusur Kayıtları Bölümü -->
            <div class="pt-3 border-t border-slate-100">
              <div class="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                <span>📋 SON İŞLENEN KUSUR KAYITLARI</span>
                <span class="text-[10px] text-slate-400 font-normal">Son ${recentDemerits.length} Kayıt</span>
              </div>
              ${recentDemerits.length === 0 ? `
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center text-slate-400 text-xs">
                  Henüz işlenmiş bir kusur puanı kaydı bulunmuyor.
                </div>
              ` : `
                <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  ${recentDemerits.map(d => {
                    const st = activeStudents.find(s => s.id === d.studentId) || (window.Store && typeof window.Store.getStudentById === 'function' ? window.Store.getStudentById(d.studentId) : null);
                    const stName = st ? `${st.firstName} ${st.lastName} (${st.className || ''})` : 'Talebe';
                    return `
                      <div class="p-2 bg-rose-50/30 rounded-xl border border-rose-100 flex items-center justify-between text-xs">
                        <div class="truncate mr-2">
                          <div class="font-bold text-slate-900 truncate">${stName}</div>
                          <div class="text-[10px] text-slate-500 truncate">${d.reason} • <span class="font-medium text-slate-400">${d.date} (${d.hocaName})</span></div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                          <span class="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 border border-rose-200 font-black text-xs font-mono">
                            ${d.points} Puan
                          </span>
                          <button type="button" onclick="window.App.deleteDemeritRecord('${d.id}')"
                            class="w-6 h-6 rounded-lg bg-white hover:bg-rose-100 text-rose-600 font-black text-xs flex items-center justify-center transition border border-rose-200 cursor-pointer"
                            title="Bu kusur kaydını sil">
                            ✕
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>

          </div>
        </div>
      </div>
    `;
  },

  filterDemeritStudents() {
    const classFilter = document.getElementById('demerit-class-filter')?.value || 'ALL';
    const searchVal = (document.getElementById('demerit-search-input')?.value || '').trim();
    const select = document.getElementById('demerit-student-select');
    if (!select) return;

    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      if (!opt.value) continue;
      const optClass = opt.getAttribute('data-class') || '';
      const optName = opt.getAttribute('data-name') || '';
      const optNo = opt.getAttribute('data-no') || '';

      const matchClass = (classFilter === 'ALL' || optClass === classFilter);
      const matchSearch = (!searchVal || (window.Store && typeof window.Store.matchesSearch === 'function'
        ? (window.Store.matchesSearch(optName, searchVal) || window.Store.matchesSearch(optNo, searchVal))
        : (optName.toLowerCase().includes(searchVal.toLowerCase()) || optNo.includes(searchVal))));

      if (matchClass && matchSearch) {
        opt.hidden = false;
        opt.disabled = false;
      } else {
        opt.hidden = true;
        opt.disabled = true;
        if (select.value === opt.value) {
          select.value = '';
        }
      }
    }
  },

  setDemeritPoints(pts) {
    const input = document.getElementById('demerit-pts-input');
    const badge = document.getElementById('demerit-pts-badge');
    const num = -Math.abs(Number(pts) || 10);
    if (input) input.value = num;
    if (badge) badge.textContent = `${num} Puan`;

    document.querySelectorAll('.demerit-preset-btn').forEach(btn => {
      const btnPts = parseInt(btn.textContent.trim(), 10);
      if (btnPts === num) {
        btn.classList.add('border-2', 'border-rose-500', 'bg-rose-100', 'text-rose-900', 'shadow-xs');
        btn.classList.remove('border-rose-200', 'bg-rose-50/50', 'text-rose-800');
      } else {
        btn.classList.remove('border-2', 'border-rose-500', 'bg-rose-100', 'text-rose-900', 'shadow-xs');
        btn.classList.add('border-rose-200', 'bg-rose-50/50', 'text-rose-800');
      }
    });
  },

  handleDemeritPointsInput(val) {
    const badge = document.getElementById('demerit-pts-badge');
    let num = parseInt(val, 10);
    if (isNaN(num)) num = -10;
    if (num > 0) num = -num;
    if (badge) badge.textContent = `${num} Puan`;
  },

  setDemeritReason(reason) {
    const input = document.getElementById('demerit-reason-input');
    if (input) {
      input.value = reason;
      input.focus();
    }
  },

  saveDemeritSubmit(event) {
    if (event) event.preventDefault();
    const select = document.getElementById('demerit-student-select');
    if (!select || !select.value) {
      this.showToast('Lütfen listeden bir talebe seçiniz.', 'warning');
      return;
    }
    const studentId = select.value;
    let pts = parseInt(document.getElementById('demerit-pts-input').value, 10);
    if (isNaN(pts) || pts === 0) pts = -10;
    if (pts > 0) pts = -Math.abs(pts);

    const reason = (document.getElementById('demerit-reason-input')?.value || '').trim() || 'Kusur & İntizamsızlık';
    const hoca = (document.getElementById('demerit-hoca-input')?.value || '').trim() || (this.currentSession?.name || 'Eğitmen');
    const date = document.getElementById('demerit-date-input')?.value || new Date().toISOString().split('T')[0];

    const student = window.Store.getStudentById(studentId);
    if (!student) {
      this.showToast('Talebe kaydı bulunamadı.', 'warning');
      return;
    }

    const saved = window.Store.addBonusPoint(studentId, pts, reason, hoca, date);
    if (saved) {
      this.showToast(`⚠️ ${student.firstName} ${student.lastName} için ${pts} kusur puanı başarıyla işlendi!`, 'warning');
      this.closeDemeritModal();

      if (this.activeTab === 'leaderboard' && window.LeaderboardModule && typeof window.LeaderboardModule.renderView === 'function') {
        window.LeaderboardModule.renderView();
      }
    } else {
      this.showToast('Kusur puanı kaydedilirken bir hata oluştu.', 'error');
    }
  },

  deleteDemeritRecord(id) {
    if (!confirm('Bu kusur puanı kaydını silmek istediğinize emin misiniz?')) return;
    const ok = window.Store.deleteBonusPoint(id);
    if (ok) {
      this.showToast('Kusur puanı kaydı silindi.', 'info');
      const select = document.getElementById('demerit-student-select');
      const currentSelected = select ? select.value : null;
      this.openDemeritModal(currentSelected);

      if (this.activeTab === 'leaderboard' && window.LeaderboardModule && typeof window.LeaderboardModule.renderView === 'function') {
        window.LeaderboardModule.renderView();
      }
    }
  },

  renderMainContent() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const settings = window.Store.getSettings();

    // 1. Durum: Oturum Açılmamışsa GİRİŞ EKRANI (Giriş kılavuzu KALDIRILMIŞTIR)
    if (!this.currentSession) {
      if (this.loginMode === 'admin_otp') {
        // --- ANA YÖNETİCİ 2 AŞAMALI GİRİŞ EKRANI (ÖNCE ŞİFRE, ARDINDAN E-POSTA KODU) ---
        main.innerHTML = `
          <div class="max-w-md mx-auto py-12 px-4 animate-fade-in">
            <div class="bg-white rounded-3xl shadow-xl border-2 ${this.otpStep === 'verify' ? 'border-emerald-400' : 'border-amber-300'} p-6 sm:p-8 text-center relative overflow-hidden">
              
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

                ${this.otpStep === 'password' ? `
                  <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black uppercase tracking-wider mb-2">
                    <span>🔐</span> <span>1. AŞAMA: ŞİFRE DOĞRULAMA</span>
                  </div>
                  <h2 class="text-xl font-black text-slate-900 mb-1">Kurum Yöneticisi Girişi</h2>
                  <p class="text-xs text-slate-500 mb-4 leading-relaxed">
                    Bu panel tam yetkili Kurum Yönetimi içindir. Personel ve hocalar (Selim Bozkurt vb.) normal giriş ekranından kendi şifreleriyle doğrudan giriş yapabilir.
                  </p>
                ` : `
                  <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black uppercase tracking-wider mb-2">
                    <span>📧</span> <span>2. AŞAMA: E-POSTA ONAY KODU</span>
                  </div>
                  <h2 class="text-xl font-black text-slate-900 mb-1">Güvenlik Kodunu Giriniz</h2>
                  <p class="text-xs text-emerald-700 font-bold mb-3">
                    ✓ 1. Aşama Şifreniz Doğrulandı! Kod e-postanıza gönderildi.
                  </p>
                `}
              </div>

              ${this.otpStep === 'password' ? `
                <!-- 1. ADIM FORMU: ŞİFRE GİRİŞİ -->
                <form onsubmit="window.App.handleAdminPasswordSubmit(event)" class="space-y-4 text-left">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">YÖNETİCİ HESABI</label>
                    <div class="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-800 flex items-center justify-between">
                      <span class="flex items-center gap-2"><span>👑</span> <span>KURUM YÖNETİCİSİ</span></span>
                      <span class="text-[11px] text-amber-800 font-bold bg-amber-100/70 px-2 py-0.5 rounded-lg border border-amber-300">Ana Yönetim</span>
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">YÖNETİCİ GİRİŞ ŞİFRESİ</label>
                    <input type="password" id="admin-login-pass" required autofocus placeholder="Yönetici şifrenizi giriniz" 
                      class="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none transition">
                  </div>

                  <div class="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-left flex items-start gap-2.5">
                    <span class="text-base">🛡️</span>
                    <div class="text-[11px] text-amber-900 leading-snug">
                      Şifreniz doğru girildiğinde <strong>${settings.adminEmail || 'selimbozkurt111@gmail.com'}</strong> adresinize tek kullanımlık 6 haneli giriş kodu iletilecektir.
                    </div>
                  </div>

                  <button type="submit" id="admin-pass-btn"
                    class="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                    <span>Şifreyi Doğrula & E-postaya Kod Gönder</span>
                    <span>➔</span>
                  </button>
                </form>
              ` : (() => {
                const currentCode = this.lastGeneratedAdminOtp || (window.Store && window.Store.getActiveAdminOtpCode()) || '';
                return `
                <!-- 2. ADIM FORMU: E-POSTA KODU GİRİŞİ -->
                <form onsubmit="window.App.handleAdminOtpVerify(event)" class="space-y-4 animate-fade-in text-left">
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
                        ✓ Kod ayrıca <strong>${this.adminEmailDraft || settings.adminEmail || 'selimbozkurt111@gmail.com'}</strong> adresinize de gönderildi.
                      </p>
                    ` : `
                      <p class="text-[11px] text-amber-800 leading-relaxed">
                        <strong>${this.adminEmailDraft || settings.adminEmail || 'selimbozkurt111@gmail.com'}</strong> adresinize 6 haneli doğrulama kodu gönderildi.
                        ${currentCode ? `
                          <br><button type="button" onclick="window.App.toggleShowAdminOtp()" class="font-bold underline text-amber-950 mt-1 cursor-pointer">
                            👉 Kodu beklemeden ekranda görmek için tıklayınız.
                          </button>
                        ` : ''}
                      </p>
                    `}
                  </div>

                  <div>
                    <label class="block text-left text-xs font-bold text-slate-700 mb-1.5 uppercase">6 HANELİ GÜVENLİK KODU</label>
                    <input type="text" id="admin-otp-code-input" maxlength="6" required autofocus placeholder="••••••" 
                      value="${this.showAdminOtpOnScreen && currentCode ? currentCode : ''}"
                      class="w-full px-4 py-3 bg-slate-50 border-2 border-emerald-300 rounded-xl text-center text-2xl font-mono font-bold tracking-widest text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition">
                  </div>

                  <button type="submit" 
                    class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2">
                    <span>🛡️ Doğrula ve Sisteme Gir</span>
                    <span>➔</span>
                  </button>

                  <div class="flex items-center justify-between text-xs pt-1">
                    <button type="button" onclick="window.App.otpStep='password'; window.App.renderMainContent();" 
                      class="text-slate-500 hover:text-slate-700 font-bold cursor-pointer">
                      ← Şifre Ekranına Dön
                    </button>
                    <button type="button" onclick="window.App.handleAdminOtpResend()" 
                      class="text-amber-800 hover:text-amber-900 font-bold cursor-pointer">
                      🔄 Kodu Tekrar Gönder
                    </button>
                  </div>
                </form>
                `;
              })()}

              <div class="mt-6 pt-5 border-t border-slate-100 text-center">
                <button onclick="window.App.loginMode='user'; window.App.renderMainContent();" 
                  class="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer">
                  ← Normal Öğretmen & Veli Girişine Dön
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
                <button type="button" onclick="window.App.loginMode='admin_otp'; window.App.otpStep='password'; window.App.renderMainContent();" 
                  class="font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer">
                  <span>👑 Kurum Yöneticisi Girişi</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            <!-- Sayfa & Önbellek Yenileme Butonu -->
            <div class="mt-4 text-center">
              <button type="button" onclick="window.App.hardRefreshApp();"
                class="w-full py-2.5 px-4 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-black border-2 border-amber-300 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                title="Yeni özellikleri göremiyorsanız önbelleği temizleyip sayfayı yeniler">
                <span class="text-sm">🔄</span>
                <span>Sistemi & Önbelleği Sıfırla (v10.45)</span>
              </button>
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
    } else if (this.activeTab === 'denemeler' || this.activeTab === 'deneme_sinavlari') {
      main.innerHTML = `<div id="mock-exam-container"></div>`;
      if (window.MockExamModule) {
        window.MockExamModule.init();
      }
    } else if (this.activeTab === 'leaderboard') {
      main.innerHTML = `<div id="leaderboard-container"></div>`;
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
    } else if (this.activeTab === 'kuran_takip' || this.activeTab === 'hatim') {
      main.innerHTML = `<div id="quran-tracker-container"></div>`;
      if (window.QuranTrackerModule) {
        window.QuranTrackerModule.init();
      }
    } else if (this.activeTab === 'ogrenciler') {
      main.innerHTML = `<div id="students-container"></div>`;
      this.renderStudentsView();
    } else if (this.activeTab === 'excel' || this.activeTab === 'ogrenciler_excel') {
      this.activeTab = 'ogrenciler';
      main.innerHTML = `<div id="students-container"></div>`;
      this.renderStudentsView();
    } else if (this.activeTab === 'personel') {
      main.innerHTML = `<div id="staff-container"></div>`;
      this.renderStaffView();
    } else if (this.activeTab === 'gorevler') {
      main.innerHTML = `<div id="duties-container"></div>`;
      this.renderDailyDutiesView();
    } else if (this.activeTab === 'ayarlar') {
      main.innerHTML = `<div id="settings-container"></div>`;
      this.renderSettingsView();
    }
  },

  // Kurum Yöneticisi / Müdür Yetki Kontrolü (Talebe Ekleme, Silme, Pasife/Aktife Alma)
  canManageStudents() {
    const session = this.currentSession;
    if (!session) return false;
    if (session.role === 'superadmin' || session.canEditStudents === true || session.canManageStaff === true) {
      return true;
    }
    const name = (session.name || '').toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i');
    if (
      name.includes('yonetici') ||
      name.includes('mudur') ||
      name.includes('admin')
    ) {
      return true;
    }
    // Personel / hoca girişinde de öğrenci ve sütun yönetimini serbest bırak (veli hariç)
    if (session.role === 'staff') {
      return true;
    }
    return false;
  },

  // --- Öğrenci Sıralama ve Toplu Düzenleme (Excel Modu) Yardımcı Metodları ---
  getEffectiveStudentData(s) {
    if (!s) return s;
    const draft = (this.studentDrafts && this.studentDrafts[s.id]) || {};
    return {
      ...s,
      ...draft
    };
  },

  hasUnsavedStudentChanges() {
    const editCount = this.studentDrafts ? Object.keys(this.studentDrafts).length : 0;
    const newCount = this.studentNewDrafts ? this.studentNewDrafts.length : 0;
    const delCount = (this.studentDeletedDrafts && this.studentDeletedDrafts.size) ? this.studentDeletedDrafts.size : 0;
    return (editCount + newCount + delCount) > 0;
  },

  getStudentChangesCount() {
    const editCount = this.studentDrafts ? Object.keys(this.studentDrafts).length : 0;
    const newCount = this.studentNewDrafts ? this.studentNewDrafts.length : 0;
    const delCount = (this.studentDeletedDrafts && this.studentDeletedDrafts.size) ? this.studentDeletedDrafts.size : 0;
    return editCount + newCount + delCount;
  },

  toggleStudentSort(field) {
    if (this.studentSortField === field) {
      this.studentSortOrder = this.studentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.studentSortField = field;
      this.studentSortOrder = 'asc';
    }
    this.renderStudentsView();
  },

  handleSortDropdownChange(val) {
    if (!val) return;
    const parts = val.split('_');
    if (parts.length === 2) {
      this.studentSortField = parts[0];
      this.studentSortOrder = parts[1];
      this.renderStudentsView();
    }
  },

  getSortIndicator(field) {
    if (this.studentSortField !== field) {
      return '<span class="text-slate-400 font-mono text-[10px] ml-1">↕</span>';
    }
    return this.studentSortOrder === 'asc'
      ? '<span class="text-emerald-700 font-black text-xs ml-1">▲</span>'
      : '<span class="text-emerald-700 font-black text-xs ml-1">▼</span>';
  },

  sortStudentsList(students) {
    const field = this.studentSortField || 'studentNo';
    const order = this.studentSortOrder === 'desc' ? -1 : 1;

    return [...students].sort((aRaw, bRaw) => {
      const a = this.getEffectiveStudentData(aRaw);
      const b = this.getEffectiveStudentData(bRaw);

      if (field === 'studentNo') {
        const noA = parseInt(a.studentNo, 10) || 0;
        const noB = parseInt(b.studentNo, 10) || 0;
        if (noA !== noB) return (noA - noB) * order;
        return (a.id || '').localeCompare(b.id || '') * order;
      }

      if (field === 'name') {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
        return nameA.localeCompare(nameB, 'tr', { sensitivity: 'base' }) * order;
      }

      if (field === 'firstName') {
        const valA = (a.firstName || '').trim();
        const valB = (b.firstName || '').trim();
        return valA.localeCompare(valB, 'tr', { sensitivity: 'base' }) * order;
      }

      if (field === 'lastName') {
        const valA = (a.lastName || '').trim();
        const valB = (b.lastName || '').trim();
        return valA.localeCompare(valB, 'tr', { sensitivity: 'base' }) * order;
      }

      if (field === 'className') {
        const valA = (a.className || '').trim();
        const valB = (b.className || '').trim();
        return valA.localeCompare(valB, 'tr', { numeric: true, sensitivity: 'base' }) * order;
      }

      if (field === 'etutHocasi') {
        const valA = (a.etutHocasi || '').trim();
        const valB = (b.etutHocasi || '').trim();
        return valA.localeCompare(valB, 'tr', { sensitivity: 'base' }) * order;
      }

      if (field === 'dahiliHoca') {
        const valA = (a.dahiliHoca || '').trim();
        const valB = (b.dahiliHoca || '').trim();
        return valA.localeCompare(valB, 'tr', { sensitivity: 'base' }) * order;
      }

      if (field === 'yatakhane') {
        const valA = (a.yatakhane || '').trim();
        const valB = (b.yatakhane || '').trim();
        return valA.localeCompare(valB, 'tr', { numeric: true, sensitivity: 'base' }) * order;
      }

      if (field === 'password') {
        const valA = (a.password || '').trim();
        const valB = (b.password || '').trim();
        return valA.localeCompare(valB, 'tr', { numeric: true, sensitivity: 'base' }) * order;
      }

      if (field === 'familyCode') {
        const valA = (a.familyCode || '').trim();
        const valB = (b.familyCode || '').trim();
        return valA.localeCompare(valB, 'tr', { sensitivity: 'base' }) * order;
      }

      if (field === 'phone') {
        const valA = (a.parentPhone || a.fatherPhone || '').trim();
        const valB = (b.parentPhone || b.fatherPhone || '').trim();
        return valA.localeCompare(valB, 'tr', { sensitivity: 'base' }) * order;
      }

      const valA = (a[field] || '').toString();
      const valB = (b[field] || '').toString();
      return valA.localeCompare(valB, 'tr', { sensitivity: 'base' }) * order;
    });
  },

  toggleStudentTableEditMode(force) {
    const newMode = (typeof force === 'boolean') ? force : !this.studentTableEditMode;
    if (!newMode && this.hasUnsavedStudentChanges()) {
      if (!confirm('Kaydedilmemiş öğrenci değişiklikleriniz var!\n\nDüzenleme modundan çıkarsanız bu değişiklikler iptal edilecektir. Çıkmak istediğinizden emin misiniz?')) {
        return;
      }
      this.discardStudentDrafts(false);
    }
    this.studentTableEditMode = newMode;
    this.renderStudentsView();
  },

  handleStudentCellChange(studentId, field, value) {
    if (!this.studentDrafts) this.studentDrafts = {};
    if (!this.studentDrafts[studentId]) {
      this.studentDrafts[studentId] = {};
    }
    this.studentDrafts[studentId][field] = value;

    if (field === 'lastName') {
      const cleanLast = value.trim();
      if (!this.studentDrafts[studentId].familyCodeExplicit) {
        const asciiLast = (window.Store && typeof window.Store.toAsciiUpper === 'function')
          ? window.Store.toAsciiUpper(cleanLast)
          : cleanLast.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const autoFam = (asciiLast ? asciiLast + '2026' : 'AILE2026');
        this.studentDrafts[studentId].familyCode = autoFam;
        const famInput = document.querySelector(`[data-st-id="${studentId}"][data-st-field="familyCode"]`);
        if (famInput) famInput.value = autoFam;
      }
    } else if (field === 'familyCode') {
      this.studentDrafts[studentId].familyCodeExplicit = true;
    }

    const inputEl = document.querySelector(`[data-st-id="${studentId}"][data-st-field="${field}"]`);
    if (inputEl) {
      inputEl.classList.add('bg-amber-100/60', 'border-amber-400', 'font-bold');
    }
    const rowEl = document.getElementById(`student-row-${studentId}`);
    if (rowEl) {
      rowEl.classList.add('bg-amber-50/50');
    }

    this.updateStudentDraftActionBar();
  },

  handleNewStudentCellChange(tempIndex, field, value) {
    if (!this.studentNewDrafts || !this.studentNewDrafts[tempIndex]) return;
    this.studentNewDrafts[tempIndex][field] = value;

    if (field === 'lastName' && !this.studentNewDrafts[tempIndex].familyCodeExplicit) {
      const cleanLast = value.trim();
      const asciiLast = (window.Store && typeof window.Store.toAsciiUpper === 'function')
        ? window.Store.toAsciiUpper(cleanLast)
        : cleanLast.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const autoFam = (asciiLast ? asciiLast + '2026' : 'AILE2026');
      this.studentNewDrafts[tempIndex].familyCode = autoFam;
      const famInput = document.querySelector(`[data-new-index="${tempIndex}"][data-st-field="familyCode"]`);
      if (famInput) famInput.value = autoFam;
    } else if (field === 'familyCode') {
      this.studentNewDrafts[tempIndex].familyCodeExplicit = true;
    }

    this.updateStudentDraftActionBar();
  },

  handleExcelKeyDown(event, studentId, field, isNew = false, newIndex = null) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const currentInput = event.target;
      const currentTr = currentInput ? currentInput.closest('tr') : null;
      if (!currentTr) return;
      const nextTr = currentTr.nextElementSibling;
      if (nextTr) {
        const nextInput = nextTr.querySelector(`[data-st-field="${field}"]`);
        if (nextInput) {
          nextInput.focus();
          if (nextInput.select) nextInput.select();
        }
      } else if (isNew || (currentTr.parentElement && currentTr.parentElement.lastElementChild === currentTr)) {
        this.addNewStudentRowDraft();
      }
    }
  },

  updateStudentDraftActionBar() {
    const bar = document.getElementById('student-draft-action-bar');
    const badge = document.getElementById('student-draft-count-badge');
    const saveBtn = document.getElementById('student-draft-save-btn');
    const count = this.getStudentChangesCount();

    if (bar) {
      if (count > 0 || this.studentTableEditMode) {
        bar.classList.remove('hidden');
        if (badge) {
          badge.innerText = count > 0 ? `${count} Değişiklik Bekliyor` : 'Değişiklik bekleniyor';
        }
        if (saveBtn) {
          saveBtn.innerHTML = `<span>💾</span><span>Değişiklikleri Kaydet (${count})</span>`;
          if (count === 0) {
            saveBtn.classList.add('opacity-50', 'pointer-events-none');
          } else {
            saveBtn.classList.remove('opacity-50', 'pointer-events-none');
          }
        }
      } else {
        bar.classList.add('hidden');
      }
    }
  },

  addNewStudentRowDraft() {
    if (!this.studentTableEditMode) {
      this.studentTableEditMode = true;
    }
    const all = window.Store.getAllStudents ? window.Store.getAllStudents() : window.Store.getStudents(true);
    const maxNo = all.reduce((max, s) => Math.max(max, parseInt(s.studentNo, 10) || 0), 100);
    const nextNo = (maxNo + 1 + (this.studentNewDrafts ? this.studentNewDrafts.length : 0)).toString();

    if (!this.studentNewDrafts) this.studentNewDrafts = [];
    this.studentNewDrafts.push({
      studentNo: nextNo,
      firstName: '',
      lastName: '',
      className: (this.studentFilterClass && this.studentFilterClass !== 'ALL') ? this.studentFilterClass : '5-A',
      etutHocasi: '',
      dahiliHoca: '',
      yatakhane: '',
      password: '123',
      familyCode: 'AILE2026',
      parentPhone: ''
    });

    this.renderStudentsView();
    setTimeout(() => {
      const idx = this.studentNewDrafts.length - 1;
      const fnInput = document.querySelector(`[data-new-index="${idx}"][data-st-field="firstName"]`);
      if (fnInput) {
        fnInput.focus();
        fnInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  },

  removeNewStudentRowDraft(tempIndex) {
    if (this.studentNewDrafts && this.studentNewDrafts[tempIndex]) {
      this.studentNewDrafts.splice(tempIndex, 1);
      this.renderStudentsView();
    }
  },

  markStudentDraftForDeletion(studentId) {
    if (!this.studentDeletedDrafts) this.studentDeletedDrafts = new Set();
    if (this.studentDeletedDrafts.has(studentId)) {
      this.studentDeletedDrafts.delete(studentId);
    } else {
      this.studentDeletedDrafts.add(studentId);
    }
    this.renderStudentsView();
  },

  saveAllStudentDrafts() {
    if (!this.canManageStudents()) {
      this.showToast('Öğrenci kaydetme yetkiniz bulunmamaktadır.', 'error');
      return;
    }

    if (!this.hasUnsavedStudentChanges()) {
      this.showToast('Kaydedilecek herhangi bir değişiklik bulunmuyor.', 'info');
      return;
    }

    // 1. Yeni eklenen taslakların validasyonu
    if (this.studentNewDrafts && this.studentNewDrafts.length > 0) {
      for (let i = 0; i < this.studentNewDrafts.length; i++) {
        const item = this.studentNewDrafts[i];
        if (!item.firstName || !item.firstName.trim()) {
          this.showToast(`Yeni eklenen #${item.studentNo} nolu öğrencinin Adı boş bırakılamaz!`, 'warning');
          const fnInput = document.querySelector(`[data-new-index="${i}"][data-st-field="firstName"]`);
          if (fnInput) fnInput.focus();
          return;
        }
        if (!item.lastName || !item.lastName.trim()) {
          this.showToast(`Yeni eklenen #${item.studentNo} nolu öğrencinin Soyadı boş bırakılamaz!`, 'warning');
          const lnInput = document.querySelector(`[data-new-index="${i}"][data-st-field="lastName"]`);
          if (lnInput) lnInput.focus();
          return;
        }
      }
    }

    // 2. Mevcut öğrencilerin taslak validasyonu (No, Adı, Soyadı boş bırakılmamalı)
    if (this.studentDrafts) {
      for (const [stId, patch] of Object.entries(this.studentDrafts)) {
        if (this.studentDeletedDrafts && this.studentDeletedDrafts.has(stId)) continue;
        if (patch.studentNo !== undefined && !patch.studentNo.toString().trim()) {
          this.showToast('Öğrenci numarası boş bırakılamaz!', 'warning');
          return;
        }
        if (patch.firstName !== undefined && !patch.firstName.trim()) {
          this.showToast('Öğrenci adı boş bırakılamaz!', 'warning');
          return;
        }
        if (patch.lastName !== undefined && !patch.lastName.trim()) {
          this.showToast('Öğrenci soyadı boş bırakılamaz!', 'warning');
          return;
        }
      }
    }

    // 3. Değişiklikleri birleştir
    let allStudents = window.Store.getAllStudents ? window.Store.getAllStudents() : window.Store.getStudents(true);
    let updatedList = [...allStudents];

    // Silinenleri çıkar
    if (this.studentDeletedDrafts && this.studentDeletedDrafts.size > 0) {
      this.studentDeletedDrafts.forEach(delId => {
        window.Store.deleteStudent(delId);
      });
      updatedList = window.Store.getAllStudents ? window.Store.getAllStudents() : window.Store.getStudents(true);
    }

    const nowIso = new Date().toISOString();

    // Mevcut öğrencileri güncelle
    if (this.studentDrafts && Object.keys(this.studentDrafts).length > 0) {
      updatedList = updatedList.map(st => {
        if (this.studentDrafts[st.id]) {
          const patch = this.studentDrafts[st.id];
          const merged = { ...st };
          if (patch.studentNo !== undefined) {
            merged.studentNo = patch.studentNo.toString().trim();
            if (window.Store && typeof window.Store.setCustomStudentNo === 'function') {
              window.Store.setCustomStudentNo(st.id, merged.studentNo);
            }
          }
          if (patch.firstName !== undefined) merged.firstName = patch.firstName.trim().toUpperCase();
          if (patch.lastName !== undefined) merged.lastName = patch.lastName.trim().toUpperCase();
          if (patch.className !== undefined) merged.className = patch.className.trim();
          if (patch.etutHocasi !== undefined) {
            merged.etutHocasi = patch.etutHocasi.trim();
          } else if (patch.className !== undefined) {
            const CLASS_TEACHER_DEFAULTS = {
              '5-A': 'YASİN EKİNCİ',
              '5-B': 'AHMED MUBARİZ',
              '6-A': 'ABDUSSAMED TAV',
              '6-B': 'ABDUSSAMED TAV',
              '7-A': 'EMİR TALHA TARIM',
              '7-B': 'BURAK BODUR',
              '8-A': 'YAVUZ SELİM SEVEN',
              '8-B': 'TUNAHAN TAŞKIN'
            };
            const newClass = (patch.className || '').trim().toUpperCase();
            const oldClass = (st.className || '').trim().toUpperCase();
            if (newClass && CLASS_TEACHER_DEFAULTS[newClass]) {
              const oldExpected = CLASS_TEACHER_DEFAULTS[oldClass];
              const curEtut = (st.etutHocasi || '').trim().toUpperCase();
              if (!curEtut || (oldExpected && curEtut.includes(oldExpected.split(' ')[0]))) {
                merged.etutHocasi = CLASS_TEACHER_DEFAULTS[newClass];
              }
            }
          }
          if (patch.dahiliHoca !== undefined) merged.dahiliHoca = patch.dahiliHoca.trim();
          if (patch.yatakhane !== undefined) merged.yatakhane = patch.yatakhane.trim();
          if (patch.password !== undefined) merged.password = patch.password.trim() || '123';
          if (patch.familyCode !== undefined) merged.familyCode = patch.familyCode.trim().toUpperCase();
          if (patch.parentPhone !== undefined) {
            merged.parentPhone = patch.parentPhone.trim();
            merged.fatherPhone = patch.parentPhone.trim();
          }
          merged.updatedAt = nowIso;
          merged.isPassive = false;
          merged.status = 'active';

          if (window.Store && typeof window.Store.markStudentLocallyEdited === 'function') {
            window.Store.markStudentLocallyEdited(st.id, Object.keys(patch));
          }
          return merged;
        }
        return st;
      });
    }

    // Yeni eklenenleri ekle
    if (this.studentNewDrafts && this.studentNewDrafts.length > 0) {
      this.studentNewDrafts.forEach(newDraft => {
        const generatedId = 'std_' + (newDraft.studentNo || Date.now()) + '_' + Math.random().toString(36).substr(2, 4);
        const newStudent = {
          id: generatedId,
          studentNo: (newDraft.studentNo || '').toString().trim(),
          firstName: (newDraft.firstName || '').trim().toUpperCase(),
          lastName: (newDraft.lastName || '').trim().toUpperCase(),
          className: (newDraft.className || '5-A').trim(),
          school: '-',
          seviye: 'Seviye 1',
          etutHocasi: (newDraft.etutHocasi || '').trim(),
          dahiliHoca: (newDraft.dahiliHoca || '').trim(),
          yatakhane: (newDraft.yatakhane || '').trim(),
          password: (newDraft.password || '123').trim(),
          familyCode: (newDraft.familyCode || (newDraft.lastName ? newDraft.lastName.trim() + '2026' : 'AILE2026')).toUpperCase(),
          fatherName: '',
          fatherPhone: (newDraft.parentPhone || '').trim(),
          parentPhone: (newDraft.parentPhone || '').trim(),
          motherName: '',
          motherPhone: '',
          isPassive: false,
          status: 'active',
          updatedAt: nowIso
        };
        if (newStudent.studentNo && window.Store && typeof window.Store.setCustomStudentNo === 'function') {
          window.Store.setCustomStudentNo(generatedId, newStudent.studentNo);
        }
        updatedList.push(newStudent);
        if (window.Store && typeof window.Store.markStudentLocallyEdited === 'function') {
          window.Store.markStudentLocallyEdited(generatedId, ['all']);
        }
      });
    }

    const changeCount = this.getStudentChangesCount();

    // 4. Store ve Buluta Kaydet (Canlı değil, sadece butona basınca tek seferde kaydeder)
    window.Store.saveStudents(updatedList);

    // 5. Taslakları Sıfırla
    this.studentDrafts = {};
    this.studentNewDrafts = [];
    this.studentDeletedDrafts = new Set();

    this.showToast(`✓ Harika! ${changeCount} adet değişiklik ve öğrenci kaydı başarıyla kaydedildi!`, 'success');
    this.renderStudentsView();
  },

  discardStudentDrafts(shouldConfirm = true) {
    if (shouldConfirm && this.hasUnsavedStudentChanges()) {
      if (!confirm('Yapılan tüm değişiklikler ve yeni satırlar iptal edilecek, orijinal veriler korunacak.\n\nEmin misiniz?')) {
        return;
      }
    }

    this.studentDrafts = {};
    this.studentNewDrafts = [];
    this.studentDeletedDrafts = new Set();

    this.showToast('Değişiklikler iptal edildi. Orijinal veriler korundu.', 'info');
    this.renderStudentsView();
  },

  // --- Öğrenci Veritabanı Yedekten Kurtarma ve JSON Yükleme ---
  restoreStudentBackupPrompt() {
    if (!this.canManageStudents()) {
      this.showToast('Bu işlem için Kurum Yöneticisi yetkisi gereklidir.', 'error');
      return;
    }
    const summary = window.Store ? window.Store.getStudentBackupSummary() : { hasBackup: false };
    if (!summary.hasBackup) {
      this.showToast('Sistemde kurtarılacak bir öğrenci yedeği bulunamadı.', 'info');
      return;
    }
    const confirmMsg = `🛡️ ÖĞRENCİ VERİLERİNİ KURTARMA\n\n` +
      `Bulunan Otomatik Yedek: ${summary.count} Öğrenci (${summary.phoneCount} veli telefonu kayıtlı)\n` +
      `Yedek Zamanı: ${summary.timestamp}\n\n` +
      `Bu yedekteki veli telefonları, yatakhane/oda bilgileri ve özel şifreler geri yüklensin ve bulutla eşitlensin mi?`;

    if (confirm(confirmMsg)) {
      const res = window.Store.restoreStudentsFromBackup();
      if (res && res.success) {
        this.showToast('✓ ' + res.message, 'success');
        this.renderStudentsView();
      } else {
        this.showToast('Geri yükleme: ' + (res ? res.message : 'Hata oluştu'), 'error');
      }
    }
  },

  handleStudentsJsonUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const res = window.Store.importStudentsJSON(content);
        if (res && res.success) {
          this.showToast('✓ ' + res.message, 'success');
          this.renderStudentsView();
        } else {
          this.showToast(res ? res.message : 'Yükleme başarısız', 'error');
        }
      } catch (err) {
        this.showToast('JSON dosyası okunamadı: ' + err.message, 'error');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  },

  // --- Sistemde Kayıtlı Olan Tüm Talebeleri ogrenciler.csv Olarak İndirme (UTF-8 BOM ile %100 Türkçe Uyumlu) ---
  exportStudentsToCsv() {
    try {
      const students = (window.Store && typeof window.Store.getAllStudents === 'function')
        ? window.Store.getAllStudents()
        : [];
      if (!students || students.length === 0) {
        this.showToast('Sistemde indirilecek öğrenci kaydı bulunamadı.', 'warning');
        return;
      }

      // Sıralı liste (5-A -> 8-B)
      const sorted = (window.Store && typeof window.Store.sortStudentsByClassAndNo === 'function')
        ? window.Store.sortStudentsByClassAndNo(students)
        : students;

      const header = 'Okul No;Adı;Soyadı;Sınıfı;Okulu;Seviye;Etüt Hocası;Dahili Hocası;Yatakhane;Veli Telefon;Veli Şifresi;Aile Kodu';
      const rows = sorted.map(s => {
        const eff = this.getEffectiveStudentData ? this.getEffectiveStudentData(s) : s;
        const no = (eff.studentNo || '').toString().trim();
        const fn = (eff.firstName || '').toString().trim();
        const ln = (eff.lastName || '').toString().trim();
        const cls = (eff.className || '').toString().trim();
        const school = (eff.school || '-').toString().trim();
        const seviye = (eff.seviye || 'Seviye 1').toString().trim();
        const etut = (eff.etutHocasi || '').toString().trim();
        const dahili = (eff.dahiliHoca || '').toString().trim();
        const yatak = (eff.yatakhane || '').toString().trim();
        const phone = (eff.parentPhone || eff.fatherPhone || '').toString().trim();
        const pass = (eff.password || '123').toString().trim();
        const fam = (eff.familyCode || (ln ? ln + '2026' : 'AILE2026')).toString().trim().toUpperCase();

        return [no, fn, ln, cls, school, seviye, etut, dahili, yatak, phone, pass, fam].join(';');
      });

      // UTF-8 BOM (\uFEFF) ile birleştir ki Excel ve metin editörlerinde Türkçe harfler asla bozulmasın
      const csvContent = '\uFEFF' + [header, ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ogrenciler.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast(`✓ Sistemdeki ${sorted.length} talebenin güncel bilgileri ogrenciler.csv olarak indirildi!`, 'success');
    } catch (err) {
      console.error('CSV Export Error:', err);
      this.showToast('CSV indirme hatası: ' + err.message, 'error');
    }
  },

  // --- Manuel Dosyadan (ogrenciler.csv, ogrenciler.json veya js/ogrenciler-data.js) Güncel Bilgileri Çekme ---
  handleFetchManualDataFile() {
    this.openSyncSourceModal();
  },

  openSyncSourceModal() {
    let modal = document.getElementById('sync-source-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sync-source-modal';
      document.body.appendChild(modal);
    }
    const isLocalFile = window.location.protocol === 'file:';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in no-print';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative overflow-hidden">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center text-xl font-bold shadow-inner">
              📥
            </div>
            <div>
              <h3 class="text-base font-black text-slate-900">Güncel Bilgileri Çek & Yükle</h3>
              <p class="text-xs text-slate-500 font-bold">Talebe listenizi nereden güncellemek istersiniz?</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('sync-source-modal').remove()" class="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer">×</button>
        </div>

        <div class="space-y-3">
          <!-- Seçenek 1: ⚡ Resmi 53 Talebeyi Buluta Kilitle & Anında Dağıt (Dosya Seçme / Yükleme GEREKTİRMEZ!) -->
          <button type="button" onclick="document.getElementById('sync-source-modal').remove(); window.App.pushMaster53ToCloudDirectly();"
            class="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-left transition flex items-center justify-between group cursor-pointer active:scale-98 shadow-md">
            <div class="flex items-start gap-3">
              <span class="text-2xl mt-0.5">🚀</span>
              <div>
                <div class="text-sm font-black flex items-center gap-2">
                  <span>Resmi 53 Talebeyi Buluta Kilitle & Dağıt</span>
                  <span class="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase">Sıfır Dosya</span>
                </div>
                <div class="text-xs text-emerald-100 mt-1 leading-snug">
                  Dosya seçmenize veya GitHub'a yükleme yapmanıza gerek yoktur. Doğrulanmış 53 talebe doğrudan Firebase bulutuna yazılır ve tüm telefon/TV cihazlarına anında yayılır.
                </div>
              </div>
            </div>
            <span class="text-white text-lg font-bold group-hover:translate-x-1 transition-transform">➔</span>
          </button>

          <!-- Seçenek 2: Bilgisayarımdan Dosya Seç (Cihazdaki Excel/CSV) -->
          <button type="button" onclick="document.getElementById('sync-source-modal').remove(); document.getElementById('manual-file-input-direct')?.click();"
            class="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-2 border-emerald-400 text-left transition flex items-center justify-between group cursor-pointer active:scale-98 shadow-xs">
            <div class="flex items-start gap-3">
              <span class="text-2xl mt-0.5">📂</span>
              <div>
                <div class="text-sm font-black text-emerald-950 flex items-center gap-2">
                  <span>Bilgisayarımdan / Telefonumdan Seç</span>
                  <span class="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">Önerilen</span>
                </div>
                <div class="text-xs text-emerald-800 mt-1 leading-snug">
                  Bilgisayarınızda veya Excel'de düzenlediğiniz <strong>ogrenciler.csv</strong> dosyasını cihazınızdan seçip anında sisteme ve buluta aktarır.
                </div>
              </div>
            </div>
            <span class="text-emerald-700 text-lg font-bold group-hover:translate-x-1 transition-transform">➔</span>
          </button>

          <!-- Sürükle Bırak Alanı -->
          <div id="modal-drag-drop-zone"
            onclick="document.getElementById('manual-file-input-direct')?.click();"
            ondragover="event.preventDefault(); this.classList.add('border-emerald-500', 'bg-emerald-100/60');"
            ondragleave="this.classList.remove('border-emerald-500', 'bg-emerald-100/60');"
            ondrop="event.preventDefault(); this.classList.remove('border-emerald-500', 'bg-emerald-100/60'); document.getElementById('sync-source-modal')?.remove(); window.App.handleFileDrop(event);"
            class="border-2 border-dashed border-emerald-300 rounded-2xl p-3 text-center bg-emerald-50/40 hover:bg-emerald-50/80 transition cursor-pointer flex items-center justify-center gap-3">
            <span class="text-2xl">🖱️</span>
            <div class="text-left">
              <div class="text-xs font-black text-emerald-950">Veya ogrenciler.csv dosyasını buraya sürükleyip bırakın</div>
              <div class="text-[10px] text-emerald-700">Tıklayarak veya dosyayı sürükleyerek anında yükleyebilirsiniz</div>
            </div>
          </div>

          <!-- Seçenek 2: Sunucudaki / GitHub'daki Dosyadan Çek -->
          <button type="button" onclick="document.getElementById('sync-source-modal').remove(); window.App.executeServerDataSync();"
            class="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-left transition flex items-center justify-between group cursor-pointer active:scale-98">
            <div class="flex items-start gap-3">
              <span class="text-2xl mt-0.5">🌐</span>
              <div>
                <div class="text-sm font-black text-slate-900">
                  Sunucudaki (GitHub) ogrenciler.csv'den Çek
                </div>
                <div class="text-xs text-slate-600 mt-1 leading-snug">
                  Web sunucusundaki veya GitHub Pages üzerindeki hazır <strong>ogrenciler.csv</strong> dosyasını doğrudan indirip sisteme eşitler.
                </div>
              </div>
            </div>
            <span class="text-slate-400 text-lg font-bold group-hover:translate-x-1 transition-transform">➔</span>
          </button>
        </div>

        ${isLocalFile ? `
          <div class="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
            <span>💡</span>
            <span>Sayfayı yerel dosya olarak açtığınız için lütfen yukarıdaki <strong>"Bilgisayarımdan Seç"</strong> butonunu veya sürükle-bırak alanını kullanınız.</span>
          </div>
        ` : ''}

        <input type="file" id="manual-file-input-direct" accept=".csv,.json" class="hidden" onchange="window.App.handleManualDataFileUpload(event)">

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <button type="button" onclick="window.App.exportStudentsToCsv()" class="text-xs text-indigo-700 font-bold hover:underline flex items-center gap-1 cursor-pointer">
            <span>📤</span> <span>Mevcut Listeyi İndir (CSV)</span>
          </button>
          <button type="button" onclick="document.getElementById('sync-source-modal').remove()" 
            class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer">
            Vazgeç
          </button>
        </div>
      </div>
    `;
  },

  async executeServerDataSync() {
    this.showToast('Sunucudan ogrenciler.csv okunuyor...', 'info');
    try {
      this.studentDrafts = {};
      this.studentNewDrafts = [];
      if (this.studentDeletedDrafts && typeof this.studentDeletedDrafts.clear === 'function') {
        this.studentDeletedDrafts.clear();
      }
      this.studentSearchQuery = '';
      this.studentFilterClass = 'ALL';

      const res = await window.Store.syncFromManualDataFile();
      if (res && res.success) {
        this.showToast(`✓ ${res.message}`, 'success');
      } else {
        this.showToast('Talebe bilgileri başarıyla güncellendi.', 'success');
      }
      this.renderHeader();
      this.renderMainContent();
      if (window.StudentExcelModule && typeof window.StudentExcelModule.render === 'function') {
        window.StudentExcelModule.render();
      }
    } catch (err) {
      this.showToast('Sunucudan veri çekme hatası: ' + err.message, 'error');
      this.renderHeader();
      this.renderMainContent();
    }
  },

  // --- Resmi 53 Talebeyi Doğrudan Firebase Bulutuna Kilitleme ve Dağıtma Motoru ---
  async pushMaster53ToCloudDirectly() {
    this.showToast('Resmi 53 talebe yerel hafızaya alınıyor ve Firebase bulutuna aktarılıyor...', 'info');
    try {
      this.studentDrafts = {};
      this.studentNewDrafts = [];
      if (this.studentDeletedDrafts && typeof this.studentDeletedDrafts.clear === 'function') {
        this.studentDeletedDrafts.clear();
      }

      if (window.Store && typeof window.Store.autoEnsureMaster53Roster === 'function') {
        const res = window.Store.autoEnsureMaster53Roster(true);
        if (res && res.success) {
          this.showToast(`🎉 Tebrikler! ${res.count} talebe başarıyla yerel hafızaya ve buluta kilitlendi!`, 'success');
        } else {
          this.showToast('Talebe bilgileri güncellendi.', 'success');
        }
      }

      this.renderHeader();
      this.renderMainContent();
      if (window.StudentExcelModule && typeof window.StudentExcelModule.render === 'function') {
        window.StudentExcelModule.render();
      }
    } catch (err) {
      this.showToast(`Buluta aktarma hatası: ${err.message}`, 'error');
    }
  },

  async pushMaster54ToCloudDirectly() {
    return this.pushMaster53ToCloudDirectly();
  },

  // --- Cihazdan Manuel CSV veya JSON Dosyası Yükleme ---
  handleManualDataFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      this.showToast('Seçtiğiniz dosya sisteme aktarılıyor...', 'info');
      try {
        this.studentDrafts = {};
        this.studentNewDrafts = [];
        if (this.studentDeletedDrafts && typeof this.studentDeletedDrafts.clear === 'function') {
          this.studentDeletedDrafts.clear();
        }
        this.studentSearchQuery = '';
        this.studentFilterClass = 'ALL';
        const res = await window.Store.syncFromManualDataFile(content);
        this.showToast(res.message || 'Talebe bilgileri dosyadan aktarıldı!', 'success');
        this.renderHeader();
        this.renderMainContent();
        if (window.StudentExcelModule && typeof window.StudentExcelModule.render === 'function') {
          window.StudentExcelModule.render();
        }
      } catch (err) {
        this.showToast('Dosya aktarılırken hata: ' + err.message, 'error');
      }
      event.target.value = '';
    };
    reader.onerror = () => {
      this.showToast('Dosya okunamadı.', 'error');
      event.target.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  },

  // --- Sürükle Bırak Dosya Yakalama Motoru ---
  handleFileDrop(event) {
    const files = event.dataTransfer && event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv') || file.name.endsWith('.json') || file.type.includes('text')) {
        const fakeEvent = { target: { files: [file], value: '' } };
        this.handleManualDataFileUpload(fakeEvent);
      } else {
        this.showToast('Lütfen .csv veya .json uzantılı talebe dosyasını bırakınız.', 'warning');
      }
    }
  },

  setupDragAndDropImport() {
    window.addEventListener('dragover', (e) => {
      if (this.activeTab === 'ogrenciler' && this.canManageStudents()) {
        e.preventDefault();
        e.stopPropagation();
        let overlay = document.getElementById('drag-drop-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'drag-drop-overlay';
          overlay.className = 'fixed inset-0 z-50 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in pointer-events-none';
          overlay.innerHTML = `
            <div class="p-8 rounded-3xl bg-white/10 border-3 border-dashed border-emerald-400 max-w-lg w-full flex flex-col items-center gap-4">
              <span class="text-6xl animate-bounce">📥</span>
              <h2 class="text-2xl font-black">Dosyayı Buraya Bırakın</h2>
              <p class="text-sm text-emerald-200">Düzenlediğiniz <strong>ogrenciler.csv</strong> veya Excel dosyasını bırakarak talebeleri anında güncelleyin.</p>
            </div>
          `;
          document.body.appendChild(overlay);
        }
      }
    });

    window.addEventListener('dragleave', (e) => {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        const overlay = document.getElementById('drag-drop-overlay');
        if (overlay) overlay.remove();
      }
    });

    window.addEventListener('drop', (e) => {
      const overlay = document.getElementById('drag-drop-overlay');
      if (overlay) overlay.remove();

      if (this.activeTab === 'ogrenciler' && this.canManageStudents()) {
        e.preventDefault();
        e.stopPropagation();
        this.handleFileDrop(e);
      }
    });
  },

  // --- Öğrenci & Şifre Yönetimi Görünümü (Sıralamalı & Excel Modlu) ---
  renderStudentsView() {
    const container = document.getElementById('students-container');
    if (!container) return;

    const session = this.currentSession;
    const canEdit = this.canManageStudents();
    const classes = window.Store.getClasses(true);
    let allStudentsList = window.Store.getAllStudents ? window.Store.getAllStudents() : window.Store.getStudents(true);

    // Datalistleri (Hocalar ve Yatakhaneler) dinamik oluştur
    const staffList = (window.Store && typeof window.Store.getStaff === 'function') ? window.Store.getStaff() : [];
    const teacherSet = new Set();
    staffList.forEach(stf => { if (stf.fullName) teacherSet.add(stf.fullName.trim().toUpperCase()); });
    allStudentsList.forEach(s => {
      if (s.etutHocasi && s.etutHocasi !== '-') teacherSet.add(s.etutHocasi.trim().toUpperCase());
      if (s.dahiliHoca && s.dahiliHoca !== '-') teacherSet.add(s.dahiliHoca.trim().toUpperCase());
    });
    const teacherList = Array.from(teacherSet).filter(Boolean).sort((a,b) => a.localeCompare(b, 'tr'));

    const dormSet = new Set(['Oda 101', 'Oda 102', 'Oda 201', 'Oda 202', 'Oda 301', 'Oda 302', 'Oda 401', 'Oda 402', 'Oda 403', 'Oda 404', 'Oda 405']);
    allStudentsList.forEach(s => { if (s.yatakhane && s.yatakhane !== '-') dormSet.add(s.yatakhane.trim()); });
    const dormList = Array.from(dormSet).filter(Boolean).sort((a,b) => a.localeCompare(b, 'tr', { numeric: true }));

    // Filtreleme
    let filteredStudents = [...allStudentsList];
    if (this.studentFilterClass !== 'ALL') {
      filteredStudents = filteredStudents.filter(s => {
        const eff = this.getEffectiveStudentData(s);
        return eff.className === this.studentFilterClass;
      });
    }
    if (this.studentSearchQuery) {
      const q = this.studentSearchQuery;
      filteredStudents = filteredStudents.filter(s => {
        const eff = this.getEffectiveStudentData(s);
        const matches = (txt) => (window.Store && typeof window.Store.matchesSearch === 'function')
          ? window.Store.matchesSearch(txt, q)
          : (txt || '').toString().toLowerCase().includes(q.toLowerCase());
        return (
          matches(eff.firstName) ||
          matches(eff.lastName) ||
          matches(`${eff.firstName} ${eff.lastName}`) ||
          matches(eff.studentNo) ||
          matches(eff.familyCode) ||
          matches(eff.etutHocasi) ||
          matches(eff.dahiliHoca) ||
          matches(eff.yatakhane) ||
          matches(eff.password) ||
          matches(eff.parentPhone) ||
          matches(eff.fatherPhone)
        );
      });
    }

    // Sıralama
    filteredStudents = this.sortStudentsList(filteredStudents);

    // Yeni taslak satırları
    let newDraftsList = (this.studentNewDrafts || []).map((d, idx) => ({ ...d, tempIndex: idx }));
    if (this.studentFilterClass !== 'ALL') {
      newDraftsList = newDraftsList.filter(d => d.className === this.studentFilterClass);
    }
    if (this.studentSearchQuery) {
      const q = this.studentSearchQuery;
      newDraftsList = newDraftsList.filter(d =>
        (window.Store && typeof window.Store.matchesSearch === 'function')
          ? (window.Store.matchesSearch(d.firstName, q) || window.Store.matchesSearch(d.lastName, q) || window.Store.matchesSearch(`${d.firstName} ${d.lastName}`, q) || window.Store.matchesSearch(d.studentNo, q))
          : ((d.firstName && d.firstName.toLowerCase().includes(q.toLowerCase())) || (d.lastName && d.lastName.toLowerCase().includes(q.toLowerCase())) || (d.studentNo && d.studentNo.toString().includes(q.toLowerCase())))
      );
    }

    const changeCount = this.getStudentChangesCount();
    const isEditMode = this.studentTableEditMode && canEdit;

    container.innerHTML = `
      <!-- Otomatik Tamamlama Datalistleri -->
      <datalist id="etut-hocasi-list">
        ${teacherList.map(t => `<option value="${t}">`).join('')}
      </datalist>
      <datalist id="dahili-hoca-list">
        ${teacherList.map(t => `<option value="${t}">`).join('')}
      </datalist>
      <datalist id="yatakhane-list">
        ${dormList.map(d => `<option value="${d}">`).join('')}
      </datalist>

      <!-- Üst Kontrol Paneli -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-3.5 sm:p-4 mb-4 animate-fade-in">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 class="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <span>👥 Öğrenci Yönetimi & Veli Şifreleri</span>
              ${!canEdit ? '<span class="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">(Salt Okunur)</span>' : ''}
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              ${canEdit ? 'Talebe kayıtlarını, sınıfları, hocaları, odaları ve şifreleri doğrudan tablodan veya tek tek düzenleyebilirsiniz.' : 'Eğitmenler listeyi inceleyebilir; düzenleme yetkisi Ana Yöneticidedir.'}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            ${canEdit ? `
              ${isEditMode ? `
                <button type="button" onclick="window.App.toggleStudentTableEditMode(false)" 
                  class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-slate-600">
                  <span>✕</span>
                  <span>Düzenleme Modunu Kapat</span>
                </button>
              ` : `
                <button type="button" onclick="window.App.toggleStudentTableEditMode(true)" 
                  class="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-amber-400">
                  <span>✏️</span>
                  <span>Tabloda Düzenle (Hızlı Düzenleme Modu)</span>
                </button>
              `}
              <button type="button" onclick="window.App.openStudentModal()" 
                class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95">
                <span>➕</span>
                <span>Yeni Öğrenci</span>
              </button>
              <button type="button" onclick="window.App.pushMaster53ToCloudDirectly()" 
                class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-500"
                title="Doğrulanmış 53 talebeyi yerel hafızaya ve doğrudan Firebase bulutuna kilitler">
                <span class="text-sm">⚡</span>
                <span>53 Talebeyi Buluta Kilitle & Dağıt</span>
              </button>
              <button type="button" onclick="window.App.exportStudentsToCsv()" 
                class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1 cursor-pointer active:scale-95 border border-slate-300"
                title="Sistemdeki talebe listesini Excel / CSV olarak bilgisayarınıza indirir">
                <span>📤</span>
                <span>İndir (Excel)</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Filtreler ve Sıralama Çubuğu -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-3">
          <div class="flex flex-wrap items-center gap-2.5">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-500">Sınıf:</span>
              <select onchange="window.App.studentFilterClass = this.value; window.App.renderStudentsView();"
                class="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none cursor-pointer">
                <option value="ALL">Tüm Sınıflar</option>
                ${classes.map(c => `<option value="${c}" ${this.studentFilterClass === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>

            <div class="flex items-center gap-1.5">
              <input type="text" id="students-search-input" placeholder="İsim, No, Hoca veya Oda ara..." 
                value="${this.studentSearchQuery}"
                oninput="window.App.handleStudentSearchInput(this.value)"
                class="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none w-44 sm:w-56">
            </div>

            <!-- Mobil ve Hızlı Sıralama Seçici -->
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-500">Sırala:</span>
              <select onchange="window.App.handleSortDropdownChange(this.value)"
                class="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none cursor-pointer">
                <option value="studentNo_asc" ${this.studentSortField === 'studentNo' && this.studentSortOrder === 'asc' ? 'selected' : ''}>No (Küçükten Büyüğe ▲)</option>
                <option value="studentNo_desc" ${this.studentSortField === 'studentNo' && this.studentSortOrder === 'desc' ? 'selected' : ''}>No (Büyükten Küçüğe ▼)</option>
                <option value="name_asc" ${this.studentSortField === 'name' && this.studentSortOrder === 'asc' ? 'selected' : ''}>Ad Soyad (A - Z ▲)</option>
                <option value="name_desc" ${this.studentSortField === 'name' && this.studentSortOrder === 'desc' ? 'selected' : ''}>Ad Soyad (Z - A ▼)</option>
                <option value="className_asc" ${this.studentSortField === 'className' && this.studentSortOrder === 'asc' ? 'selected' : ''}>Sınıf (5-A -> 8-B ▲)</option>
                <option value="className_desc" ${this.studentSortField === 'className' && this.studentSortOrder === 'desc' ? 'selected' : ''}>Sınıf (8-B -> 5-A ▼)</option>
                <option value="etutHocasi_asc" ${this.studentSortField === 'etutHocasi' && this.studentSortOrder === 'asc' ? 'selected' : ''}>Etüt Hocası (A - Z ▲)</option>
                <option value="dahiliHoca_asc" ${this.studentSortField === 'dahiliHoca' && this.studentSortOrder === 'asc' ? 'selected' : ''}>Dahili Hocası (A - Z ▲)</option>
                <option value="yatakhane_asc" ${this.studentSortField === 'yatakhane' && this.studentSortOrder === 'asc' ? 'selected' : ''}>Yatakhane / Oda (101 -> 405 ▲)</option>
                <option value="password_asc" ${this.studentSortField === 'password' && this.studentSortOrder === 'asc' ? 'selected' : ''}>Veli Şifresi (A - Z ▲)</option>
                <option value="familyCode_asc" ${this.studentSortField === 'familyCode' && this.studentSortOrder === 'asc' ? 'selected' : ''}>Aile Kodu (A - Z ▲)</option>
              </select>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-500">Listelenen: <span id="students-count-badge">${filteredStudents.length + newDraftsList.length}</span> Talebe</span>
          </div>
        </div>
      </div>

      <!-- Öğrenci Tablosu -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs mb-4">
        <div class="overflow-x-auto w-full custom-scrollbar">
          <table class="w-full text-left border-collapse text-xs table-auto min-w-[820px]">
            <thead>
              ${isEditMode ? `
                <tr class="bg-amber-100/90 border-b border-amber-300 text-[11px] font-black text-amber-950 uppercase select-none">
                  <th class="py-2.5 px-2 text-center w-14 shrink-0">No</th>
                  <th class="py-2.5 px-2 min-w-[130px]">Adı</th>
                  <th class="py-2.5 px-2 min-w-[130px]">Soyadı</th>
                  <th class="py-2.5 px-1.5 w-20 text-center">Sınıf</th>
                  <th class="py-2.5 px-2 min-w-[130px]">Etüt Hocası</th>
                  <th class="py-2.5 px-2 min-w-[130px]">Dahili Hoca</th>
                  <th class="py-2.5 px-2 w-24 text-center">Oda</th>
                  <th class="py-2.5 px-2 w-20 text-center">Şifre</th>
                  <th class="py-2.5 px-2 w-24 text-center">Aile Kodu</th>
                  <th class="py-2.5 px-2 w-28 text-center">Veli Tel</th>
                  <th class="py-2.5 px-1 text-center w-14">Sil</th>
                </tr>
              ` : `
                <tr class="bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase select-none">
                  <th class="py-2.5 px-2 text-center w-12 shrink-0">
                    <button type="button" onclick="window.App.toggleStudentSort('studentNo')" class="font-bold flex items-center justify-center gap-0.5 cursor-pointer w-full text-center hover:text-slate-900">
                      <span>No</span>
                      ${this.getSortIndicator('studentNo')}
                    </button>
                  </th>
                  <th class="py-2.5 px-3 min-w-[140px]">
                    <button type="button" onclick="window.App.toggleStudentSort('name')" class="font-bold flex items-center gap-1 cursor-pointer hover:text-slate-900">
                      <span>Giriş Yapılacak İsim</span>
                      ${this.getSortIndicator('name')}
                    </button>
                  </th>
                  <th class="py-2.5 px-1.5 w-14 text-center">
                    <button type="button" onclick="window.App.toggleStudentSort('className')" class="font-bold flex items-center justify-center gap-0.5 cursor-pointer w-full hover:text-slate-900">
                      <span>Sınıf</span>
                      ${this.getSortIndicator('className')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2.5 w-44">
                    <div class="flex items-center gap-1 text-[10px]">
                      <span>Hoca:</span>
                      <button type="button" onclick="window.App.toggleStudentSort('etutHocasi')" class="hover:text-slate-900 underline decoration-slate-300" title="Etüt Hocasına göre sırala">Etüt ${this.getSortIndicator('etutHocasi')}</button>
                      <span class="text-slate-300">/</span>
                      <button type="button" onclick="window.App.toggleStudentSort('dahiliHoca')" class="hover:text-slate-900 underline decoration-slate-300" title="Dahili Hocasına göre sırala">Dahili ${this.getSortIndicator('dahiliHoca')}</button>
                    </div>
                  </th>
                  <th class="py-2.5 px-2 w-20 text-center">
                    <button type="button" onclick="window.App.toggleStudentSort('yatakhane')" class="font-bold flex items-center justify-center gap-0.5 cursor-pointer w-full hover:text-slate-900">
                      <span>Oda</span>
                      ${this.getSortIndicator('yatakhane')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2 w-20 text-center">
                    <button type="button" onclick="window.App.toggleStudentSort('password')" class="font-bold flex items-center justify-center gap-0.5 cursor-pointer w-full hover:text-slate-900">
                      <span>Şifre</span>
                      ${this.getSortIndicator('password')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2 w-24 text-center">
                    <button type="button" onclick="window.App.toggleStudentSort('familyCode')" class="font-bold flex items-center justify-center gap-0.5 cursor-pointer w-full hover:text-slate-900">
                      <span>Aile Kodu</span>
                      ${this.getSortIndicator('familyCode')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2 w-28 text-center">
                    <button type="button" onclick="window.App.toggleStudentSort('phone')" class="font-bold flex items-center justify-center gap-0.5 cursor-pointer w-full hover:text-slate-900">
                      <span>Veli Tel</span>
                      ${this.getSortIndicator('phone')}
                    </button>
                  </th>
                  ${canEdit ? `<th class="py-2.5 px-2 text-right w-20">İşlem</th>` : ''}
                </tr>
              `}
            </thead>
            <tbody id="students-table-body" class="divide-y divide-slate-100 text-xs">
              ${this.renderStudentsTableRowsHtml(filteredStudents, newDraftsList, isEditMode, canEdit)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Düzenleme Modu ve Taslak Kaydetme Çubuğu (Excel Modu) -->
      <div id="student-draft-action-bar" class="${(isEditMode || changeCount > 0) ? '' : 'hidden'} sticky bottom-4 z-30 mt-4 p-4 bg-slate-900/95 text-white rounded-2xl shadow-2xl border-2 border-amber-400 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-fade-in">
        <div class="flex items-center gap-3">
          <span class="text-2xl animate-pulse">✏️</span>
          <div>
            <div class="font-black text-sm text-white flex items-center gap-2">
              <span>Tabloda Düzenleme Modu Açık</span>
              <span id="student-draft-count-badge" class="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase">
                ${changeCount > 0 ? `${changeCount} Değişiklik Bekliyor` : 'Hücrelere tıklayıp düzenleyin'}
              </span>
            </div>
            <p class="text-xs text-slate-300">
              Hücrelere doğrudan tıklayarak düzenleyin. Enter tuşuna basarak bir alt satıra geçebilirsiniz.
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" onclick="window.App.addNewStudentRowDraft()" 
            class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95">
            <span>➕</span> <span>Yeni Satır Ekle</span>
          </button>
          <button type="button" id="student-draft-save-btn" onclick="window.App.saveAllStudentDrafts()" 
            class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${changeCount === 0 ? 'opacity-50 pointer-events-none' : ''}">
            <span>💾</span> <span>Değişiklikleri Kaydet & Buluta Gönder (${changeCount})</span>
          </button>
          <button type="button" onclick="window.App.toggleStudentTableEditMode(false)" 
            class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 border border-slate-700">
            <span>✕</span> <span>Düzenlemeyi Kapat</span>
          </button>
        </div>
      </div>
    `;
  },

  // --- Talebe Arama Sırasında Sayfa Zıplamasını ve Klavye Kapanmasını Önleyici Canlı Filtreleme ---
  handleStudentSearchInput(query) {
    this.studentSearchQuery = (query || '').toLowerCase().trim();
    const tbody = document.getElementById('students-table-body');
    if (!tbody) {
      this.renderStudentsView();
      return;
    }
    const canEdit = this.canManageStudents();
    const isEditMode = this.studentTableEditMode && canEdit;
    let allStudentsList = window.Store.getAllStudents ? window.Store.getAllStudents() : window.Store.getStudents(true);

    let filteredStudents = [...allStudentsList];
    if (this.studentFilterClass !== 'ALL') {
      filteredStudents = filteredStudents.filter(s => {
        const eff = this.getEffectiveStudentData(s);
        return eff.className === this.studentFilterClass;
      });
    }
    if (this.studentSearchQuery) {
      const q = this.studentSearchQuery.toLowerCase();
      filteredStudents = filteredStudents.filter(s => {
        const eff = this.getEffectiveStudentData(s);
        return (
          (eff.firstName && eff.firstName.toLowerCase().includes(q)) ||
          (eff.lastName && eff.lastName.toLowerCase().includes(q)) ||
          (eff.studentNo && eff.studentNo.toString().includes(q)) ||
          (eff.familyCode && eff.familyCode.toLowerCase().includes(q)) ||
          (eff.etutHocasi && eff.etutHocasi.toLowerCase().includes(q)) ||
          (eff.dahiliHoca && eff.dahiliHoca.toLowerCase().includes(q)) ||
          (eff.yatakhane && eff.yatakhane.toLowerCase().includes(q)) ||
          (eff.password && eff.password.toLowerCase().includes(q))
        );
      });
    }
    filteredStudents = this.sortStudentsList(filteredStudents);

    let newDraftsList = (this.studentNewDrafts || []).map((d, idx) => ({ ...d, tempIndex: idx }));
    if (this.studentFilterClass !== 'ALL') {
      newDraftsList = newDraftsList.filter(d => d.className === this.studentFilterClass);
    }
    if (this.studentSearchQuery) {
      const q = this.studentSearchQuery.toLowerCase();
      newDraftsList = newDraftsList.filter(d =>
        (d.firstName && d.firstName.toLowerCase().includes(q)) ||
        (d.lastName && d.lastName.toLowerCase().includes(q)) ||
        (d.studentNo && d.studentNo.toString().includes(q))
      );
    }

    tbody.innerHTML = this.renderStudentsTableRowsHtml(filteredStudents, newDraftsList, isEditMode, canEdit);
    const badge = document.getElementById('students-count-badge');
    if (badge) {
      badge.textContent = filteredStudents.length + newDraftsList.length;
    }
  },

  // --- Öğrenci Tablosu Satır HTML Üretici ---
  renderStudentsTableRowsHtml(filteredStudents, newDraftsList, isEditMode, canEdit) {
    if (filteredStudents.length === 0 && (!newDraftsList || newDraftsList.length === 0)) {
      return `<tr><td colspan="${canEdit ? (isEditMode ? 11 : 9) : (isEditMode ? 10 : 8)}" class="py-12 text-center text-slate-400">Öğrenci bulunamadı.</td></tr>`;
    }

    let html = filteredStudents.map(s => {
      const eff = this.getEffectiveStudentData(s);
      const isDeleted = this.studentDeletedDrafts && this.studentDeletedDrafts.has(s.id);
      const hasDraft = this.studentDrafts && !!this.studentDrafts[s.id];

      if (isEditMode) {
        return `
          <tr id="student-row-${s.id}" class="transition ${isDeleted ? 'bg-rose-50/70 opacity-60 line-through' : (hasDraft ? 'bg-amber-50/50' : 'hover:bg-slate-50/50')}">
            <!-- No -->
            <td class="py-1.5 px-1 text-center">
              <input type="number" 
                data-st-id="${s.id}" data-st-field="studentNo" 
                value="${eff.studentNo || ''}"
                oninput="window.App.handleStudentCellChange('${s.id}', 'studentNo', this.value)"
                onkeydown="window.App.handleExcelKeyDown(event, '${s.id}', 'studentNo')"
                class="w-12 px-1 py-1 text-center font-bold text-xs bg-white border border-slate-300 rounded focus:border-amber-500 focus:bg-amber-50/20 focus:outline-none transition ${hasDraft && this.studentDrafts[s.id].studentNo !== undefined ? 'bg-amber-100/60 border-amber-400 font-bold' : ''}"
                ${isDeleted ? 'disabled' : ''}>
            </td>

            <!-- Adı -->
            <td class="py-1.5 px-1.5">
              <input type="text" 
                data-st-id="${s.id}" data-st-field="firstName" 
                value="${eff.firstName || ''}"
                oninput="window.App.handleStudentCellChange('${s.id}', 'firstName', this.value)"
                onkeydown="window.App.handleExcelKeyDown(event, '${s.id}', 'firstName')"
                class="w-full px-1.5 py-1 font-bold text-xs text-slate-900 bg-white border border-slate-300 rounded focus:border-amber-500 focus:bg-amber-50/20 focus:outline-none transition ${hasDraft && this.studentDrafts[s.id].firstName !== undefined ? 'bg-amber-100/60 border-amber-400' : ''}"
                ${isDeleted ? 'disabled' : ''}>
            </td>

            <!-- Soyadı -->
            <td class="py-1.5 px-1.5">
              <input type="text" 
                data-st-id="${s.id}" data-st-field="lastName" 
                value="${eff.lastName || ''}"
                oninput="window.App.handleStudentCellChange('${s.id}', 'lastName', this.value)"
                onkeydown="window.App.handleExcelKeyDown(event, '${s.id}', 'lastName')"
                class="w-full px-1.5 py-1 font-bold text-xs text-slate-900 bg-white border border-slate-300 rounded focus:border-amber-500 focus:bg-amber-50/20 focus:outline-none transition ${hasDraft && this.studentDrafts[s.id].lastName !== undefined ? 'bg-amber-100/60 border-amber-400' : ''}"
                ${isDeleted ? 'disabled' : ''}>
            </td>

            <!-- Sınıfı -->
            <td class="py-1.5 px-1">
              <select 
                data-st-id="${s.id}" data-st-field="className" 
                onchange="window.App.handleStudentCellChange('${s.id}', 'className', this.value)"
                class="w-full px-1 py-1 font-bold text-xs text-slate-800 bg-white border border-slate-300 rounded focus:border-amber-500 focus:outline-none cursor-pointer ${hasDraft && this.studentDrafts[s.id].className !== undefined ? 'bg-amber-100/60 border-amber-400' : ''}"
                ${isDeleted ? 'disabled' : ''}>
                ${['5-A', '5-B', '6-A', '6-B', '7-A', '7-B', '8-A', '8-B'].map(c => `
                  <option value="${c}" ${eff.className === c ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            </td>

            <!-- Etüt Hocası -->
            <td class="py-1.5 px-1.5">
              <input type="text" list="etut-hocasi-list"
                data-st-id="${s.id}" data-st-field="etutHocasi" 
                value="${eff.etutHocasi || ''}"
                placeholder="Etüt..."
                oninput="window.App.handleStudentCellChange('${s.id}', 'etutHocasi', this.value)"
                onkeydown="window.App.handleExcelKeyDown(event, '${s.id}', 'etutHocasi')"
                class="w-full px-1.5 py-1 text-xs text-slate-800 bg-white border border-slate-300 rounded focus:border-amber-500 focus:bg-amber-50/20 focus:outline-none transition ${hasDraft && this.studentDrafts[s.id].etutHocasi !== undefined ? 'bg-amber-100/60 border-amber-400 font-bold' : ''}"
                ${isDeleted ? 'disabled' : ''}>
            </td>

            <!-- Dahili Hocası -->
            <td class="py-1.5 px-1.5">
              <input type="text" list="dahili-hoca-list"
                data-st-id="${s.id}" data-st-field="dahiliHoca" 
                value="${eff.dahiliHoca || ''}"
                placeholder="Dahili..."
                oninput="window.App.handleStudentCellChange('${s.id}', 'dahiliHoca', this.value)"
                onkeydown="window.App.handleExcelKeyDown(event, '${s.id}', 'dahiliHoca')"
                class="w-full px-1.5 py-1 text-xs text-slate-800 bg-white border border-slate-300 rounded focus:border-amber-500 focus:bg-amber-50/20 focus:outline-none transition ${hasDraft && this.studentDrafts[s.id].dahiliHoca !== undefined ? 'bg-amber-100/60 border-amber-400 font-bold' : ''}"
                ${isDeleted ? 'disabled' : ''}>
            </td>

            <!-- Yatakhane -->
            <td class="py-1.5 px-1.5">
              <input type="text" list="yatakhane-list"
                data-st-id="${s.id}" data-st-field="yatakhane" 
                value="${eff.yatakhane || ''}"
                placeholder="Oda..."
                oninput="window.App.handleStudentCellChange('${s.id}', 'yatakhane', this.value)"
                onkeydown="window.App.handleExcelKeyDown(event, '${s.id}', 'yatakhane')"
                class="w-full px-1.5 py-1 text-xs font-medium text-indigo-900 bg-white border border-slate-300 rounded focus:border-amber-500 focus:bg-amber-50/20 focus:outline-none transition ${hasDraft && this.studentDrafts[s.id].yatakhane !== undefined ? 'bg-amber-100/60 border-amber-400 font-bold' : ''}"
                ${isDeleted ? 'disabled' : ''}>
            </td>

            <!-- Veli Şifresi -->
            <td class="py-1.5 px-1.5">
              <input type="text" 
                data-st-id="${s.id}" data-st-field="password" 
                value="${eff.password || '123'}"
                oninput="window.App.handleStudentCellChange('${s.id}', 'password', this.value)"
                onkeydown="window.App.handleExcelKeyDown(event, '${s.id}', 'password')"
                class="w-full px-1.5 py-1 text-xs font-mono font-bold text-center text-amber-900 bg-white border border-slate-300 rounded focus:border-amber-500 focus:bg-amber-50/20 focus:outline-none transition ${hasDraft && this.studentDrafts[s.id].password !== undefined ? 'bg-amber-100/60 border-amber-400' : ''}"
                ${isDeleted ? 'disabled' : ''}>
            </td>

            <!-- Aile Kodu -->
            <td class="py-1.5 px-1.5">
              <input type="text" 
                data-st-id="${s.id}" data-st-field="familyCode" 
                value="${eff.familyCode || ''}"
                oninput="window.App.handleStudentCellChange('${s.id}', 'familyCode', this.value)"
                onkeydown="window.App.handleExcelKeyDown(event, '${s.id}', 'familyCode')"
                class="w-full px-1.5 py-1 text-xs font-mono font-bold uppercase text-center text-slate-700 bg-white border border-slate-300 rounded focus:border-amber-500 focus:bg-amber-50/20 focus:outline-none transition ${hasDraft && this.studentDrafts[s.id].familyCode !== undefined ? 'bg-amber-100/60 border-amber-400' : ''}"
                ${isDeleted ? 'disabled' : ''}>
            </td>

            <!-- Veli Telefon -->
            <td class="py-1.5 px-1.5">
              <input type="tel" 
                data-st-id="${s.id}" data-st-field="parentPhone" 
                value="${eff.parentPhone || eff.fatherPhone || ''}"
                placeholder="05xx..."
                oninput="window.App.handleStudentCellChange('${s.id}', 'parentPhone', this.value)"
                onkeydown="window.App.handleExcelKeyDown(event, '${s.id}', 'parentPhone')"
                class="w-full px-1.5 py-1 text-xs font-mono text-center text-slate-800 bg-white border border-slate-300 rounded focus:border-amber-500 focus:bg-amber-50/20 focus:outline-none transition ${hasDraft && this.studentDrafts[s.id].parentPhone !== undefined ? 'bg-amber-100/60 border-amber-400' : ''}"
                ${isDeleted ? 'disabled' : ''}>
            </td>

            <!-- İşlem -->
            <td class="py-1.5 px-1 text-center whitespace-nowrap">
              ${isDeleted ? `
                <button type="button" onclick="window.App.markStudentDraftForDeletion('${s.id}')"
                  class="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded text-[11px] transition cursor-pointer"
                  title="Silmeyi Geri Al">
                  ↩️
                </button>
              ` : `
                <button type="button" onclick="window.App.markStudentDraftForDeletion('${s.id}')"
                  class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition text-xs cursor-pointer"
                  title="Silmek İçin İşaretle">
                  🗑️
                </button>
              `}
            </td>
          </tr>
        `;
      } else {
        // --- NORMAL GÖRÜNÜM MODU ---
        return `
          <tr class="table-row-hover transition ${hasDraft ? 'bg-amber-50/40' : ''}">
            <td class="py-2.5 px-2 text-center font-bold text-slate-700">
              ${eff.studentNo}
            </td>
            <td class="py-2.5 px-3">
              <div class="font-bold text-slate-900 flex items-center gap-1.5">
                <span>${eff.firstName} ${eff.lastName}</span>
                ${hasDraft ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-black uppercase">Taslak</span>' : ''}
              </div>
            </td>
            <td class="py-2.5 px-1.5 text-center text-xs font-bold text-slate-800">${eff.className}</td>
            <td class="py-2.5 px-2.5 text-xs">
              <div class="font-semibold text-slate-800 truncate" title="Etüt Hocası: ${eff.etutHocasi || '-'}">📚 ${eff.etutHocasi || '-'}</div>
              <div class="text-[11px] text-slate-500 truncate" title="Dahili Hoca: ${eff.dahiliHoca || '-'}">🏠 ${eff.dahiliHoca || '-'}</div>
            </td>
            <td class="py-2.5 px-2 text-center text-xs font-bold text-indigo-800">${eff.yatakhane || '-'}</td>
            <td class="py-2.5 px-2 text-center">
              ${eff.password && eff.password.trim() !== '123' ? `
                <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-mono font-black text-xs border border-amber-300">
                  <span title="Şifre güncellendi">🔑</span>
                  <span>${eff.password}</span>
                </div>
              ` : `
                <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-200" title="Varsayılan Şifre: 123">
                  ${eff.password || '123'}
                </span>
              `}
            </td>
            <td class="py-2.5 px-2 text-center">
              <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-600">
                ${eff.familyCode || '-'}
              </span>
            </td>
            <td class="py-2.5 px-2 text-center text-xs font-mono text-slate-600">
              ${eff.parentPhone || eff.fatherPhone || '-'}
            </td>
            ${canEdit ? `
              <td class="py-2.5 px-2 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button onclick="window.App.openStudentModal('${s.id}')"
                    class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-xs transition flex items-center gap-1 cursor-pointer" title="Düzenle / Şifre Değiştir">
                    <span>✏️</span>
                  </button>
                  <button onclick="window.App.deleteStudent('${s.id}')"
                    class="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition text-xs cursor-pointer" title="Kalıcı Olarak Sil">🗑️</button>
                </div>
              </td>
            ` : ''}
          </tr>
        `;
      }
    }).join('');

    if (isEditMode && newDraftsList && newDraftsList.length > 0) {
      html += newDraftsList.map(item => `
        <!-- Yeni Eklenen Taslak Satırı -->
        <tr class="bg-emerald-50/70 border-2 border-emerald-300 transition">
          <!-- No -->
          <td class="py-1.5 px-1 text-center">
            <div class="flex flex-col items-center gap-0.5">
              <span class="text-[8px] px-1 bg-emerald-600 text-white font-black rounded uppercase">Yeni</span>
              <input type="number" 
                data-new-index="${item.tempIndex}" data-st-field="studentNo" 
                value="${item.studentNo || ''}"
                oninput="window.App.handleNewStudentCellChange(${item.tempIndex}, 'studentNo', this.value)"
                onkeydown="window.App.handleExcelKeyDown(event, null, 'studentNo', true, ${item.tempIndex})"
                class="w-12 px-1 py-1 text-center font-bold text-xs bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none">
            </div>
          </td>

          <!-- Adı -->
          <td class="py-1.5 px-1.5">
            <input type="text" 
              data-new-index="${item.tempIndex}" data-st-field="firstName" 
              value="${item.firstName || ''}"
              placeholder="Adı *"
              oninput="window.App.handleNewStudentCellChange(${item.tempIndex}, 'firstName', this.value)"
              onkeydown="window.App.handleExcelKeyDown(event, null, 'firstName', true, ${item.tempIndex})"
              class="w-full px-1.5 py-1 font-bold text-xs bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none">
          </td>

          <!-- Soyadı -->
          <td class="py-1.5 px-1.5">
            <input type="text" 
              data-new-index="${item.tempIndex}" data-st-field="lastName" 
              value="${item.lastName || ''}"
              placeholder="Soyadı *"
              oninput="window.App.handleNewStudentCellChange(${item.tempIndex}, 'lastName', this.value)"
              onkeydown="window.App.handleExcelKeyDown(event, null, 'lastName', true, ${item.tempIndex})"
              class="w-full px-1.5 py-1 font-bold text-xs bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none">
          </td>

          <!-- Sınıfı -->
          <td class="py-1.5 px-1">
            <select 
              data-new-index="${item.tempIndex}" data-st-field="className" 
              onchange="window.App.handleNewStudentCellChange(${item.tempIndex}, 'className', this.value)"
              class="w-full px-1 py-1 font-bold text-xs bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer">
              ${['5-A', '5-B', '6-A', '6-B', '7-A', '7-B', '8-A', '8-B'].map(c => `
                <option value="${c}" ${item.className === c ? 'selected' : ''}>${c}</option>
              `).join('')}
            </select>
          </td>

          <!-- Etüt Hocası -->
          <td class="py-1.5 px-1.5">
            <input type="text" list="etut-hocasi-list"
              data-new-index="${item.tempIndex}" data-st-field="etutHocasi" 
              value="${item.etutHocasi || ''}"
              placeholder="Etüt..."
              oninput="window.App.handleNewStudentCellChange(${item.tempIndex}, 'etutHocasi', this.value)"
              onkeydown="window.App.handleExcelKeyDown(event, null, 'etutHocasi', true, ${item.tempIndex})"
              class="w-full px-1.5 py-1 text-xs bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none">
          </td>

          <!-- Dahili Hocası -->
          <td class="py-1.5 px-1.5">
            <input type="text" list="dahili-hoca-list"
              data-new-index="${item.tempIndex}" data-st-field="dahiliHoca" 
              value="${item.dahiliHoca || ''}"
              placeholder="Dahili..."
              oninput="window.App.handleNewStudentCellChange(${item.tempIndex}, 'dahiliHoca', this.value)"
              onkeydown="window.App.handleExcelKeyDown(event, null, 'dahiliHoca', true, ${item.tempIndex})"
              class="w-full px-1.5 py-1 text-xs bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none">
          </td>

          <!-- Yatakhane -->
          <td class="py-1.5 px-1.5">
            <input type="text" list="yatakhane-list"
              data-new-index="${item.tempIndex}" data-st-field="yatakhane" 
              value="${item.yatakhane || ''}"
              placeholder="Oda..."
              oninput="window.App.handleNewStudentCellChange(${item.tempIndex}, 'yatakhane', this.value)"
              onkeydown="window.App.handleExcelKeyDown(event, null, 'yatakhane', true, ${item.tempIndex})"
              class="w-full px-1.5 py-1 text-xs font-medium text-indigo-900 bg-white border border-slate-300 rounded focus:border-amber-500 focus:bg-amber-50/20 focus:outline-none transition ${hasDraft && this.studentDrafts[s.id].yatakhane !== undefined ? 'bg-amber-100/60 border-amber-400 font-bold' : ''}"
              ${isDeleted ? 'disabled' : ''}>
          </td>

          <!-- Veli Şifresi -->
          <td class="py-1.5 px-1.5">
            <input type="text" 
              data-new-index="${item.tempIndex}" data-st-field="password" 
              value="${item.password || '123'}"
              oninput="window.App.handleNewStudentCellChange(${item.tempIndex}, 'password', this.value)"
              onkeydown="window.App.handleExcelKeyDown(event, null, 'password', true, ${item.tempIndex})"
              class="w-full px-1.5 py-1 text-xs font-mono font-bold text-center bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none">
          </td>

          <!-- Aile Kodu -->
          <td class="py-1.5 px-1.5">
            <input type="text" 
              data-new-index="${item.tempIndex}" data-st-field="familyCode" 
              value="${item.familyCode || 'AILE2026'}"
              oninput="window.App.handleNewStudentCellChange(${item.tempIndex}, 'familyCode', this.value)"
              onkeydown="window.App.handleExcelKeyDown(event, null, 'familyCode', true, ${item.tempIndex})"
              class="w-full px-1.5 py-1 text-xs font-mono font-bold uppercase text-center bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none">
          </td>

          <!-- Veli Telefon -->
          <td class="py-1.5 px-1.5">
            <input type="tel" 
              data-new-index="${item.tempIndex}" data-st-field="parentPhone" 
              value="${item.parentPhone || ''}"
              placeholder="05xx..."
              oninput="window.App.handleNewStudentCellChange(${item.tempIndex}, 'parentPhone', this.value)"
              onkeydown="window.App.handleExcelKeyDown(event, null, 'parentPhone', true, ${item.tempIndex})"
              class="w-full px-1.5 py-1 text-xs font-mono text-center bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none">
          </td>

          <!-- İşlem -->
          <td class="py-1.5 px-1 text-center">
            <button type="button" onclick="window.App.removeNewStudentRowDraft(${item.tempIndex})"
              class="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded text-[11px] transition cursor-pointer"
              title="Yeni Satırı Kaldır">
              ✕
            </button>
          </td>
        </tr>
      `).join('');
    }

    return html;
  },

  // --- Excel (CSV) Formatında İndirme (Türkçe Karakter ve Excel Uyumlu) ---
  exportStudentsToCsv() {
    let students = window.Store.getAllStudents ? window.Store.getAllStudents() : window.Store.getStudents(true);
    if (!Array.isArray(students) || students.length === 0) {
      this.showToast('İndirilecek öğrenci verisi bulunamadı.', 'warning');
      return;
    }

    const headers = [
      'Okul No', 'Adı', 'Soyadı', 'Sınıfı', 'Okulu', 'Seviye',
      'Etüt Hocası', 'Dahili Hocası', 'Yatakhane', 'Veli Telefon',
      'Veli Şifresi', 'Aile Kodu'
    ];

    const escapeCsv = (val) => {
      const s = (val || '').toString().trim().replace(/"/g, '""');
      return `"${s}"`;
    };

    let csvContent = '\uFEFF'; // Excel'in Türkçe karakterleri düzgün açması için UTF-8 BOM
    csvContent += headers.map(escapeCsv).join(';') + '\r\n';

    students.forEach(st => {
      const row = [
        st.studentNo || '',
        (st.firstName || '').toUpperCase(),
        (st.lastName || '').toUpperCase(),
        st.className || '',
        st.school || '-',
        st.seviye || 'Seviye 1',
        st.etutHocasi || '',
        st.dahiliHoca || '',
        st.yatakhane || '',
        st.parentPhone || st.fatherPhone || '',
        st.password || '123',
        st.familyCode || ''
      ];
      csvContent += row.map(escapeCsv).join(';') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ogrenciler.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    this.showToast('ogrenciler.csv başarıyla indirildi!', 'success');
    this.openExportCsvModal(csvContent);
  },

  openExportCsvModal(csvContent) {
    let modal = document.getElementById('export-csv-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'export-csv-modal';
      modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in';
      document.body.appendChild(modal);
    }

    const rawTextWithoutBom = csvContent.replace(/^\uFEFF/, '');

    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div class="p-5 bg-gradient-to-r from-indigo-700 to-indigo-900 text-white flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">📤</span>
            <div>
              <h3 class="font-black text-base sm:text-lg">Talebe Listesi (ogrenciler.csv) Hazırlandı</h3>
              <p class="text-xs text-indigo-200">Sistemde düzelttiğiniz tüm oda ve talebe bilgileri hazır</p>
            </div>
          </div>
          <button type="button" onclick="window.App.closeExportCsvModal()" 
            class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition">✕</button>
        </div>

        <div class="p-5 space-y-4 overflow-y-auto">
          <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 font-medium">
            <span class="text-emerald-600 text-base">✅</span>
            <div>
              <strong>ogrenciler.csv</strong> dosyanız tarayıcınızın <em>İndirilenler (Downloads)</em> klasörüne indirildi.
              Türkçe karakterler ve sistemde güncellediğiniz yatakhane / oda numaraları eksiksiz işlenmiştir.
            </div>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-700">Oluşturulan CSV Metni (Önizleme):</label>
              <button type="button" onclick="window.App.copyCsvToClipboard()" 
                id="btn-copy-csv-text"
                class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-300">
                <span>📋</span>
                <span>Panoya Kopyala</span>
              </button>
            </div>
            <textarea id="export-csv-preview-area" readonly rows="8" 
              class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500">${rawTextWithoutBom}</textarea>
          </div>

          <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <a href="https://github.com/selimbozkurt111-web/oay-tak-p/upload/main" target="_blank" rel="noopener noreferrer"
              class="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm">
              <span>🐱</span>
              <span>GitHub Yükleme Sayfasına Git ➔</span>
            </a>
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.App.exportStudentsToCsv()"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                <span>📥</span>
                <span>Tekrar İndir</span>
              </button>
              <button type="button" onclick="window.App.closeExportCsvModal()"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">
                Kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  },

  closeExportCsvModal() {
    const modal = document.getElementById('export-csv-modal');
    if (modal) modal.remove();
  },

  copyCsvToClipboard() {
    const area = document.getElementById('export-csv-preview-area');
    if (!area) return;
    area.select();
    navigator.clipboard.writeText(area.value).then(() => {
      this.showToast('CSV metni panoya kopyalandı!', 'success');
      const btn = document.getElementById('btn-copy-csv-text');
      if (btn) btn.innerHTML = '<span>✅</span> <span>Kopyalandı!</span>';
      setTimeout(() => {
        if (btn) btn.innerHTML = '<span>📋</span> <span>Panoya Kopyala</span>';
      }, 2000);
    }).catch(() => {
      document.execCommand('copy');
      this.showToast('CSV metni panoya kopyalandı!', 'success');
    });
  },

  renderStudentExcelView() {
    this.activeTab = 'ogrenciler';
    this.renderStudentsView();
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

            <div class="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-black text-amber-900 mb-1 uppercase">👑 KURUM YÖNETİCİSİ E-POSTA ADRESİ</label>
                <input type="email" id="set-admin-email" value="${settings.adminEmail || ''}" required
                  class="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm font-bold text-amber-900 focus:outline-none focus:bg-white">
                <span class="text-[10px] text-slate-400">Giriş yaparken 2. Aşama onay kodu bu adrese gider.</span>
              </div>
              <div>
                <label class="block text-xs font-black text-amber-900 mb-1 uppercase">🔑 KURUM YÖNETİCİSİ GİRİŞ ŞİFRESİ</label>
                <input type="text" id="set-admin-password" value="${settings.adminPassword || '123'}" required
                  class="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm font-bold text-amber-900 focus:outline-none focus:bg-white">
                <span class="text-[10px] text-slate-400">Yönetim paneline girişte 1. Aşamada sorulan şifre.</span>
              </div>
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

        <!-- Hadis-i Şerif Veritabanı ve TV Panosu Hadis Yönetimi -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 text-lg flex items-center justify-center shadow-inner">
                📖
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-base leading-tight">Hadis-i Şerif Veritabanı (TV Panosu)</h3>
                <p class="text-xs text-slate-500">Masaüstünüzdeki HADİS.docx dosyasından veya kendi listenizden metinleri yapıştırabilirsiniz</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <label class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95" title="Masaüstündeki HADİS.docx dosyasını seçerek otomatik aktarabilirsiniz">
                <span>📂</span>
                <span>HADİS.docx Dosyası Seç</span>
                <input type="file" id="settings-hadis-file" accept=".docx,.doc,.txt" class="hidden" onchange="window.App.handleHadisDocUpload(event)">
              </label>
              <span class="px-2.5 py-1 bg-amber-100 text-amber-900 font-black text-xs rounded-xl border border-amber-300">
                Canlı Pano v4.2
              </span>
            </div>
          </div>

          <div class="space-y-3">
            <p class="text-xs text-slate-600 leading-relaxed">
              Masaüstündeki <strong>HADİS.docx</strong> dosyanızın içindeki tüm metni kopyalayıp aşağıdaki kutucuğa doğrudan yapıştırabilir (Ctrl+V) veya yukarıdaki <strong>"HADİS.docx Dosyası Seç"</strong> butonuyla tek tıkla yükleyebilirsiniz. Numaralandırmalar (1., 2.), tırnak işaretleri ve kaynaklar otomatik düzenlenir; siz pencereyi değiştirseniz dahi yazdıklarınız asla kaybolmaz.
            </p>

            <div class="relative">
              <textarea id="settings-custom-hadisler" rows="8"
                placeholder="Her satıra bir Hadis-i Şerif gelecek şekilde yapıştırınız veya dosya seçiniz...&#10;Örnek:&#10;1. İki günü birbirine eşit olan ziyandadır. (Beyhaki)&#10;2. Namaz dinin direğidir. (Tirmizi)"
                class="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"></textarea>
              <div id="hadis-draft-notice" class="hidden absolute top-2.5 right-2.5 px-2 py-0.5 bg-amber-500 text-white font-bold text-[10px] rounded-md shadow-xs animate-pulse">
                Taslak Hafızada Korunuyor
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div class="flex items-center gap-2">
                <button type="button" onclick="window.App.saveCustomHadislerSubmit()"
                  class="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-2 cursor-pointer active:scale-95">
                  <span>💾</span>
                  <span>Hadis Listesini Kaydet ve TV'ye Gönder</span>
                </button>

                <button type="button" onclick="window.App.restoreDefaultHadisler()"
                  class="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
                  Varsayılanları Yükle
                </button>
              </div>

              <span id="hadis-count-badge" class="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
                0 Hadis-i Şerif
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Ayarlar ekranı açıldığında özel hadisleri textarea'ya otomatik yükle & taslak koruma
    try {
      const textarea = document.getElementById('settings-custom-hadisler');
      const badge = document.getElementById('hadis-count-badge');
      const notice = document.getElementById('hadis-draft-notice');

      if (textarea) {
        // 1. Önce kaydedilmemiş taslak (draft) var mı kontrol et
        const savedDraft = localStorage.getItem('oay_hadis_draft');
        if (savedDraft && savedDraft.trim()) {
          textarea.value = savedDraft;
          if (notice) notice.classList.remove('hidden');
          const parsed = this.parseHadisText(savedDraft);
          if (badge) {
            badge.textContent = `⚠️ ${parsed.length} Hadis (Kaydedilmemiş Taslak)`;
            badge.className = 'text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1.5 rounded-xl border border-amber-300';
          }
        } else {
          // Taslak yoksa kayıtlı güncel hadisleri getir
          const hadisList = (window.Store && typeof window.Store.getCustomHadisler === 'function') 
            ? window.Store.getCustomHadisler() 
            : [];
          if (hadisList.length > 0) {
            textarea.value = hadisList.map(h => `${h.text} — ${h.author || 'Hadis-i Şerif'}`).join('\n');
            if (badge) {
              badge.textContent = `✓ ${hadisList.length} Hadis-i Şerif (Kayıtlı)`;
              badge.className = 'text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-300';
            }
          }
        }

        // 2. Kullanıcı her yazdığında veya yapıştırdığında anlık taslak olarak kaydet
        textarea.addEventListener('input', () => {
          const val = textarea.value;
          localStorage.setItem('oay_hadis_draft', val);
          const parsed = this.parseHadisText(val);
          if (notice) notice.classList.remove('hidden');
          if (badge) {
            badge.textContent = `✏️ ${parsed.length} Hadis Algılandı (Kaydet Butonuna Basınız)`;
            badge.className = 'text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1.5 rounded-xl border border-amber-300';
          }
        });
      }
    } catch(e) {
      console.warn('Hadis UI setup hatası:', e);
    }
  },

  // Metin içinden hadisleri ve kaynaklarını akıllıca çıkaran evrensel ayrıştırıcı
  parseHadisText(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];
    
    // Satır sonlarını normalize et
    const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Paragraf veya satır bazında ayır
    const paragraphs = normalized.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    let chunks = [];
    if (paragraphs.length > 1 && paragraphs.some(p => p.length > 25)) {
      chunks = paragraphs;
    } else {
      chunks = normalized.split('\n').map(l => l.trim()).filter(Boolean);
    }

    const results = [];
    
    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i].trim();
      if (!chunk) continue;

      // Eğer satır sadece bir kaynak/ravi ise (örn: "(Buhari)", "Kaynak: Tirmizi", "— Müslim") bir önceki hadise ekle
      const isJustCitation = /^(\(|\[|—|--|-|Kaynak:|Ravi:)/i.test(chunk) && chunk.length < 70;
      if (isJustCitation && results.length > 0) {
        let cleanCitation = chunk.replace(/^[\(\[\—\-\s]+|[\)\]\s]+$/g, '').trim();
        if (cleanCitation) {
          results[results.length - 1].author = cleanCitation;
          continue;
        }
      }

      // Başındaki 1., 2., 1-, [1], (1), •, * veya "Hadis 1:" gibi numaralandırmaları temizle
      chunk = chunk.replace(/^(\d+[\.\-\)]|\(\d+\)|\[\d+\]|•|\*|-|Hadis\s*\d+[:\.\-]?)\s*/i, '').trim();

      let text = chunk;
      let author = 'Hadis-i Şerif';

      // Tire, uzun tire veya iki tire ile ayrılmış kaynakları ayıkla
      const emDashIdx = chunk.lastIndexOf('—');
      const doubleDashIdx = chunk.lastIndexOf('--');
      const spacedHyphenIdx = chunk.lastIndexOf(' - ');

      if (emDashIdx !== -1 && emDashIdx > 10) {
        text = chunk.substring(0, emDashIdx).trim();
        author = chunk.substring(emDashIdx + 1).trim() || 'Hadis-i Şerif';
      } else if (doubleDashIdx !== -1 && doubleDashIdx > 10) {
        text = chunk.substring(0, doubleDashIdx).trim();
        author = chunk.substring(doubleDashIdx + 2).trim() || 'Hadis-i Şerif';
      } else if (spacedHyphenIdx !== -1 && spacedHyphenIdx > 10) {
        text = chunk.substring(0, spacedHyphenIdx).trim();
        author = chunk.substring(spacedHyphenIdx + 3).trim() || 'Hadis-i Şerif';
      } else {
        // Cümle sonundaki parantez içi kaynakları ayıkla: örn: (Buhari) veya (Hadis-i Şerif - Tirmizi)
        const parenMatch = chunk.match(/\((Hadis-i\s*Şerif[^\)]*|[A-ZÇĞİÖŞÜ][a-zA-ZçğıöşüÇĞİÖŞÜ\s,\.:;0-9\/]+)\)\s*$/);
        if (parenMatch && parenMatch.index > 10) {
          text = chunk.substring(0, parenMatch.index).trim();
          author = parenMatch[1].trim();
        }
      }

      // Tırnak işaretlerini ve baş/son boşlukları temizle
      text = text.replace(/^["“'«\s]+|["”'»\s]+$/g, '').trim();
      author = author.replace(/^[\(\[\—\-\s]+|[\)\]\s]+$/g, '').trim() || 'Hadis-i Şerif';

      if (text.length >= 5) {
        results.push({ text, author });
      }
    }

    return results;
  },

  // .docx dosyasını pure vanilla JS ile okuma (ZIP içindeki word/document.xml metnini ayıklar)
  async extractTextFromDocx(file) {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let offset = 0;
      while (offset < bytes.length - 30) {
        if (bytes[offset] === 0x50 && bytes[offset+1] === 0x4b && bytes[offset+2] === 0x03 && bytes[offset+3] === 0x04) {
          const compMethod = bytes[offset + 8] | (bytes[offset + 9] << 8);
          const compSize = bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
          const fnLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
          const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8);
          const fnBytes = bytes.slice(offset + 30, offset + 30 + fnLen);
          const filename = new TextDecoder().decode(fnBytes);
          const dataStart = offset + 30 + fnLen + extraLen;
          
          if (filename === 'word/document.xml') {
            let xmlText = '';
            if (compMethod === 0) {
              xmlText = new TextDecoder('utf-8').decode(bytes.slice(dataStart, dataStart + compSize));
            } else if (compMethod === 8 && typeof DecompressionStream !== 'undefined') {
              const compressedSlice = bytes.slice(dataStart, dataStart + compSize);
              const ds = new DecompressionStream('deflate-raw');
              const writer = ds.writable.getWriter();
              writer.write(compressedSlice);
              writer.close();
              const response = new Response(ds.readable);
              xmlText = await response.text();
            }
            if (xmlText) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(xmlText, 'application/xml');
              const paragraphs = doc.getElementsByTagName('w:p');
              const lines = [];
              for (let p of paragraphs) {
                const texts = p.getElementsByTagName('w:t');
                let pText = '';
                for (let t of texts) {
                  pText += t.textContent;
                }
                if (pText.trim()) lines.push(pText.trim());
              }
              return lines.join('\n');
            }
          }
          offset = dataStart + (compSize > 0 ? compSize : 1);
        } else {
          offset++;
        }
      }
      return null;
    } catch (err) {
      console.warn('Docx extract error:', err);
      return null;
    }
  },

  // Kullanıcı masaüstünden HADİS.docx dosyasını seçtiğinde
  async handleHadisDocUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const textarea = document.getElementById('settings-custom-hadisler');
    const badge = document.getElementById('hadis-count-badge');
    const notice = document.getElementById('hadis-draft-notice');

    try {
      this.showToast('Dosya inceleniyor ve metinler aktarılıyor...', 'info');
      let text = '';
      if (file.name.toLowerCase().endsWith('.docx')) {
        text = await this.extractTextFromDocx(file);
      }
      if (!text) {
        text = await file.text();
      }

      if (text && text.trim()) {
        if (textarea) {
          textarea.value = text.trim();
          localStorage.setItem('oay_hadis_draft', text.trim());
          const parsed = this.parseHadisText(text);
          if (badge) {
            badge.textContent = `📋 ${parsed.length} Hadis Algılandı (Kaydetmek için butona basınız)`;
            badge.className = 'text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1.5 rounded-xl border border-amber-300';
          }
          if (notice) notice.classList.remove('hidden');
          this.showToast(`✓ ${file.name} dosyasından ${parsed.length} hadis başarıyla aktarıldı. Lütfen "Hadis Listesini Kaydet" butonuna basarak onaylayınız.`, 'success');
        }
      } else {
        this.showToast('Dosya içeriği okunamadı. Lütfen Word içinden kopyalayıp kutucuğa doğrudan yapıştırınız.', 'warning');
      }
    } catch (e) {
      console.error('Hadis dosya okuma hatası:', e);
      this.showToast('Dosya açılırken bir hata oluştu. Lütfen Word içinden kopyalayıp yapıştırınız.', 'danger');
    } finally {
      event.target.value = '';
    }
  },

  saveCustomHadislerSubmit() {
    const textarea = document.getElementById('settings-custom-hadisler');
    if (!textarea) return;
    const rawVal = textarea.value.trim();
    if (!rawVal) {
      this.showToast('Lütfen en az bir Hadis-i Şerif giriniz.', 'warning');
      return;
    }

    const hadisList = this.parseHadisText(rawVal);
    if (hadisList.length === 0) {
      this.showToast('Geçerli bir Hadis-i Şerif metni bulunamadı. Lütfen kontrol ediniz.', 'warning');
      return;
    }

    if (window.Store && typeof window.Store.saveCustomHadisler === 'function') {
      window.Store.saveCustomHadisler(hadisList);
      localStorage.removeItem('oay_hadis_draft');

      // Kutucuğu da tertemiz formatlanmış haliyle güncelle
      textarea.value = hadisList.map(h => `${h.text} — ${h.author || 'Hadis-i Şerif'}`).join('\n');

      const badge = document.getElementById('hadis-count-badge');
      if (badge) {
        badge.textContent = `✓ ${hadisList.length} Hadis-i Şerif (Kayıtlı & Canlı TV'de)`;
        badge.className = 'text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-300';
      }
      const notice = document.getElementById('hadis-draft-notice');
      if (notice) notice.classList.add('hidden');

      this.showToast(`✓ ${hadisList.length} adet Hadis-i Şerif başarıyla kaydedildi ve TV panosuna bağlandı!`, 'success');
    }
  },

  restoreDefaultHadisler() {
    const defaults = (window.HADIS_LISTESI && Array.isArray(window.HADIS_LISTESI))
      ? window.HADIS_LISTESI
      : [];
    if (defaults.length > 0 && window.Store) {
      window.Store.saveCustomHadisler(defaults);
      localStorage.removeItem('oay_hadis_draft');
      const textarea = document.getElementById('settings-custom-hadisler');
      if (textarea) {
        textarea.value = defaults.map(h => `${h.text} — ${h.author || 'Hadis-i Şerif'}`).join('\n');
      }
      const badge = document.getElementById('hadis-count-badge');
      if (badge) {
        badge.textContent = `✓ ${defaults.length} Hadis-i Şerif (Varsayılanlar)`;
        badge.className = 'text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-300';
      }
      const notice = document.getElementById('hadis-draft-notice');
      if (notice) notice.classList.add('hidden');
      this.showToast('Varsayılan Hadis-i Şerifler yüklendi.', 'info');
    }
  },

  saveSettingsSubmit(event) {
    event.preventDefault();
    const instName = document.getElementById('set-inst-name').value.trim();
    const adminEmail = document.getElementById('set-admin-email').value.trim();
    const adminPassInput = document.getElementById('set-admin-password');
    const adminPassword = adminPassInput ? adminPassInput.value.trim() : '';
    const logoUrl = document.getElementById('set-inst-logo-url') ? document.getElementById('set-inst-logo-url').value.trim() : '';
    const firebaseUrl = document.getElementById('set-firebase-url') ? document.getElementById('set-firebase-url').value.trim() : '';

    const payload = {
      institutionName: instName,
      adminEmail: adminEmail,
      institutionLogo: logoUrl,
      firebaseUrl: firebaseUrl
    };
    if (adminPassword) {
      payload.adminPassword = adminPassword;
    }

    window.Store.saveSettings(payload);

    // Eğer hadis kutusunda taslak veya değiştirilmiş veri varsa onu da otomatik kaydet
    const hadisTextarea = document.getElementById('settings-custom-hadisler');
    if (hadisTextarea && hadisTextarea.value.trim()) {
      const parsed = this.parseHadisText(hadisTextarea.value.trim());
      if (parsed.length > 0 && window.Store && typeof window.Store.saveCustomHadisler === 'function') {
        window.Store.saveCustomHadisler(parsed);
        localStorage.removeItem('oay_hadis_draft');
      }
    }

    this.showToast('Tüm ayarlar, Hadis-i Şerifler ve TV bağlantısı kaydedildi!', 'success');
    this.renderHeader();
    this.renderSettingsView();
  },

  // ========================================================
  // --- GÜNÜN GÖREVLİLERİ YÖNETİMİ (YEMEKÇİLER & MÜEZZİN) ---
  // ========================================================
  selectedDutyDate: '',
  draftDutyYemekciler: null,
  draftDutyMuezzin: null,
  draftDutyNote: null,
  _dutyNoteSaveTimer: null,

  isAuthorizedForDuties() {
    if (!this.currentSession) return true;
    if (this.currentSession.role === 'parent') return false;
    return true;
  },

  hasUnsavedDutyChanges() {
    if (this.activeTab !== 'gorevler') return false;
    const targetDate = this.selectedDutyDate || new Date().toISOString().split('T')[0];
    const saved = (window.Store && typeof window.Store.getDailyDuties === 'function')
      ? window.Store.getDailyDuties(targetDate, false)
      : { yemekciler: [], muezzin: '', note: '' };

    const savedYm = Array.isArray(saved.yemekciler) ? saved.yemekciler : [];
    const curYm = Array.isArray(this.draftDutyYemekciler) ? this.draftDutyYemekciler : [];
    if (savedYm.length !== curYm.length) return true;
    for (let i = 0; i < savedYm.length; i++) {
      if (savedYm[i] !== curYm[i]) return true;
    }
    if ((this.draftDutyMuezzin || '').trim() !== (saved.muezzin || '').trim()) return true;
    if ((this.draftDutyNote || '').trim() !== (saved.note || '').trim()) return true;
    return false;
  },

  autoSaveDailyDuties() {
    if (!this.isAuthorizedForDuties()) return;
    const targetDate = this.selectedDutyDate || new Date().toISOString().split('T')[0];
    const payload = {
      date: targetDate,
      yemekciler: Array.isArray(this.draftDutyYemekciler) ? [...this.draftDutyYemekciler] : [],
      muezzin: (this.draftDutyMuezzin || '').trim(),
      note: (this.draftDutyNote || '').trim()
    };
    if (window.Store && typeof window.Store.saveDailyDuties === 'function') {
      window.Store.saveDailyDuties(payload);
    }
  },

  renderDailyDutiesView() {
    const container = document.getElementById('duties-container');
    if (!container) return;

    const isAuthorized = this.isAuthorizedForDuties();
    const isSuperAdmin = this.currentSession && (this.currentSession.role === 'superadmin' || this.currentSession.staffId === 'admin_root');

    const realToday = new Date().toISOString().split('T')[0];
    if (!this.selectedDutyDate) {
      this.selectedDutyDate = realToday;
    }
    const targetDate = this.selectedDutyDate;
    const isTargetToday = (targetDate === realToday);

    const storeDuties = (window.Store && typeof window.Store.getDailyDuties === 'function')
      ? window.Store.getDailyDuties(targetDate, false)
      : { yemekciler: [], muezzin: '', note: '' };

    if (this.draftDutyYemekciler === null) {
      this.draftDutyYemekciler = Array.isArray(storeDuties.yemekciler) ? [...storeDuties.yemekciler] : [];
    }
    if (this.draftDutyMuezzin === null) {
      this.draftDutyMuezzin = storeDuties.muezzin || '';
    }
    if (this.draftDutyNote === null) {
      this.draftDutyNote = storeDuties.note || '';
    }

    const students = (window.Store && typeof window.Store.getStudents === 'function')
      ? window.Store.getStudents(false)
      : [];

    const upcomingDays = (window.Store && typeof window.Store.getUpcomingDailyDuties === 'function')
      ? window.Store.getUpcomingDailyDuties(7)
      : [];

    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' };
    const dateFormatted = new Date(targetDate + 'T00:00:00').toLocaleDateString('tr-TR', dateOptions);

    const currentYemekciler = this.draftDutyYemekciler || [];
    const currentMuezzin = this.draftDutyMuezzin || '';
    const currentNote = this.draftDutyNote || '';

    container.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6 animate-fade-in">
        
        <!-- 1. Üst Başlık ve Tarih Seçici -->
        <div class="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl shadow-lg shrink-0">
              🎯
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-black text-white text-lg sm:text-xl">
                  ${isAuthorized ? 'Günün Görevlileri & Haftalık Nöbet Planlama' : 'Günün Görevlileri & Nöbet Çizelgesi'}
                </h3>
                <span class="px-2 py-0.5 rounded-lg ${isAuthorized ? 'bg-amber-500 text-slate-950' : 'bg-blue-500 text-white'} font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <span>${isSuperAdmin ? '👑 YÖNETİCİ PLANLAMA PANELİ' : (isAuthorized ? '📋 GÖREVLİ PLANLAMA PANELİ' : '👁️ GÖREVLİ LİSTESİ')}</span>
                </span>
              </div>
              <p class="text-xs text-amber-200/80 mt-0.5">
                ${isAuthorized 
                  ? `Seçili Gün: <strong>${dateFormatted}</strong> ${isTargetToday ? '• (Bugün)' : '• (İleri Tarih)'} — Nöbetçileri gün gün belirleyiniz; anında veritabanına ve TV panosuna yansır.`
                  : `Seçili Gün: <strong>${dateFormatted}</strong> ${isTargetToday ? '• (Bugün)' : ''} — Kurumumuz tarafından belirlenen görevli talebelerimiz.`}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input type="date" value="${targetDate}" 
              onchange="window.App.changeDutyDate(this.value)"
              class="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300 focus:border-amber-400 focus:outline-none cursor-pointer">
            <button type="button" onclick="window.App.changeDutyDate('${realToday}')"
              class="px-3 py-2 ${isTargetToday ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'} text-xs font-black rounded-xl shadow transition cursor-pointer">
              Bugün
            </button>
            <a href="pano.html" target="_blank"
              class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/40 transition flex items-center gap-1.5 cursor-pointer">
              <span>📺</span>
              <span class="hidden sm:inline">Panoda Gör ↗</span>
            </a>
          </div>
        </div>

        <!-- 2. ⭐ 7 GÜNLÜK HIZLI GÜN SEÇİCİ ŞERİDİ -->
        <div class="bg-slate-900 rounded-3xl p-4 sm:p-5 border border-amber-500/30 shadow-xl space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span class="font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>📅</span> <span>HIZLI GÜN SEÇİMİ (ÖNÜMÜZDEKİ 7 GÜN)</span>
            </span>
            <span class="text-slate-400 text-[11px]">
              Tıklayarak o günün görevlilerini belirleyin; anında kaydedilir ve günü gelince TV panosuna kendiliğinden yansır.
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            ${upcomingDays.map(day => {
              const isSelected = day.date === targetDate;
              return `
                <button type="button" onclick="window.App.changeDutyDate('${day.date}')"
                  class="p-2.5 sm:p-3 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between group ${
                    isSelected 
                      ? 'bg-gradient-to-b from-amber-500/25 to-amber-950/40 border-amber-400 shadow-lg text-white ring-2 ring-amber-400/60 scale-[1.02]' 
                      : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40 text-slate-300 hover:bg-slate-800/60'
                  }">
                  <div>
                    <div class="flex items-center justify-between gap-1 mb-1">
                      <span class="font-black text-xs ${isSelected ? 'text-amber-300' : 'text-slate-200 group-hover:text-amber-200'}">
                        ${day.dayLabel}
                      </span>
                      ${day.isToday ? `<span class="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">Bugün</span>` : ''}
                    </div>
                    <div class="text-[11px] font-mono ${isSelected ? 'text-amber-100' : 'text-slate-400'}">
                      ${day.dateDisplay}
                    </div>
                  </div>

                  <div class="pt-2 mt-2 border-t ${isSelected ? 'border-amber-500/30' : 'border-slate-800/80'}">
                    ${day.hasAssignment ? `
                      <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        <span>✓</span> <span>${day.yemekciCount} Yemekçi${day.hasMuezzin ? ' • Müezzin' : ''}</span>
                      </div>
                    ` : `
                      <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-[10px] group-hover:text-amber-300 group-hover:border group-hover:border-amber-500/30">
                        <span>+</span> <span>Görev Belirle</span>
                      </div>
                    `}
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 3. Bilgilendirme ve Hızlı Kopyalama Kartı -->
        ${isAuthorized ? `
          <div class="p-4 bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 border border-amber-200 rounded-3xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
            <div class="flex items-center gap-3">
              <span class="text-2xl shrink-0">💡</span>
              <div class="leading-relaxed">
                <strong>İleri Tarihli Çoklu Gün Planlama:</strong> Yukarıdaki gün butonlarından dilediğiniz günü seçip nöbetçileri şimdiden kaydedebilirsiniz. Eklediğiniz her nöbetçi otomatik olarak kaydedilir; günü geldiğinde TV panosunda kendiliğinden devreye girer.
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.App.copyDutiesFromPreviousDay()"
                class="px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-black text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                <span>📋</span>
                <span>Bir Önceki Günden Kopyala</span>
              </button>
            </div>
          </div>
        ` : `
          <div class="p-3.5 bg-blue-50/90 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-900 shadow-2xs">
            <span class="text-xl shrink-0">ℹ️</span>
            <div class="leading-relaxed">
              <strong>Bilgilendirme:</strong> Günün görevlileri (yemekhane nöbetçileri ve vakit müezzini) kurum yetkilileri tarafından belirlenmektedir. Bu ekranda haftalık nöbet planını canlı olarak takip edebilirsiniz.
            </div>
          </div>
        `}

        <!-- 4. Seçili Gün Başlık Şeridi -->
        <div class="flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
          <div class="flex items-center gap-2">
            <span class="text-xl">📅</span>
            <span class="font-black text-slate-800 text-sm sm:text-base">
              ${dateFormatted} Nöbet Dağılımı
            </span>
            <span class="px-2.5 py-0.5 rounded-lg ${isTargetToday ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'} font-black text-[11px]">
              ${isTargetToday ? '🟢 Bugünün Nöbeti' : '🗓️ İleri Tarihli Plan'}
            </span>
          </div>
          ${isAuthorized && (currentYemekciler.length > 0 || currentMuezzin || currentNote) ? `
            <button type="button" onclick="window.App.deleteDutyForDate('${targetDate}')"
              class="text-xs text-rose-600 hover:text-rose-800 hover:underline font-bold cursor-pointer">
              🗑️ Bu Günün Nöbetini Temizle
            </button>
          ` : ''}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <!-- 🍽️ 1. GÜNÜN YEMEKÇİLERİ KARTI -->
          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 text-xl flex items-center justify-center shadow-inner">
                    🍽️
                  </div>
                  <div>
                    <h4 class="font-bold text-slate-900 text-base">Günün Yemekçileri</h4>
                    <p class="text-xs text-slate-500">Mutfak ve sofra görevlileri (${currentYemekciler.length} ${isAuthorized ? 'seçildi' : 'görevli'})</p>
                  </div>
                </div>
              </div>

              ${isAuthorized ? `
                <!-- Hızlı Talebe Ekleme Formu -->
                <div class="space-y-3 mb-4">
                  <label class="block text-[11px] font-bold text-slate-600 uppercase">
                    TALEBE SEÇİP EKLEYİNİZ
                  </label>
                  <div class="flex items-center gap-2">
                    <select id="duty-yemekci-select" 
                      class="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500">
                      <option value="">-- Talebe Seçiniz --</option>
                      ${students.map(s => `
                        <option value="${s.firstName} ${s.lastName} (${s.className})">
                          ${s.firstName} ${s.lastName} (${s.className} • No: ${s.studentNo})
                        </option>
                      `).join('')}
                    </select>
                    <button type="button" onclick="window.App.addYemekciFromSelect()"
                      class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow transition cursor-pointer">
                      + Ekle
                    </button>
                  </div>

                  <!-- Manuel İsim Girişi Alternatifi -->
                  <div class="flex items-center gap-2 pt-1">
                    <input type="text" id="duty-yemekci-custom-text" placeholder="Veya manuel isim yazınız..."
                      onkeydown="if(event.key === 'Enter') { event.preventDefault(); window.App.addYemekciFromCustomText(); }"
                      class="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white">
                    <button type="button" onclick="window.App.addYemekciFromCustomText()"
                      class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer">
                      Ekle
                    </button>
                  </div>
                </div>
              ` : ''}

              <!-- Yemekçiler Listesi -->
              <div class="space-y-2">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  NÖBETÇİ LİSTESİ (${currentYemekciler.length})
                </div>
                ${currentYemekciler.length === 0 ? `
                  <div class="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 space-y-1">
                    <div class="text-2xl mb-1">🍽️</div>
                    <div class="font-bold text-slate-700">Bu gün için yemekhane nöbetçisi atanmadı.</div>
                    <div class="text-[11px] text-slate-400">
                      ${isAuthorized ? 'Yukarıdan talebe seçip "+ Ekle" butonuna basınız.' : 'Kurum yetkilileri tarafından görev atandığında burada listelenecektir.'}
                    </div>
                  </div>
                ` : `
                  <div class="space-y-1.5">
                    ${currentYemekciler.map((name, idx) => `
                      <div class="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <span class="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">
                            ${idx + 1}
                          </span>
                          <span class="font-bold text-xs text-amber-950">${name}</span>
                        </div>
                        ${isAuthorized ? `
                          <button type="button" onclick="window.App.removeYemekciAtIndex(${idx})"
                            class="w-6 h-6 rounded-lg bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center justify-center cursor-pointer"
                            title="Listeden Çıkar">
                            ✕
                          </button>
                        ` : `
                          <span class="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                            🍽️ Görevli
                          </span>
                        `}
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>TV Panosunda "Günün Yemekçileri" slaytında otomatik döner</span>
              ${(isAuthorized && currentYemekciler.length > 0) ? `
                <button type="button" onclick="window.App.clearAllYemekciler()" class="text-rose-500 hover:underline cursor-pointer">
                  Tümünü Temizle
                </button>
              ` : ''}
            </div>
          </div>

          <!-- 📢 2. GÜNÜN MÜEZZİNİ KARTI -->
          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 text-xl flex items-center justify-center shadow-inner">
                    📢
                  </div>
                  <div>
                    <h4 class="font-bold text-slate-900 text-base">Günün Müezzini</h4>
                    <p class="text-xs text-slate-500">5 Vakit namaz ezan ve cemaat nöbetçisi</p>
                  </div>
                </div>
              </div>

              ${isAuthorized ? `
                <!-- Müezzin Seçici -->
                <div class="space-y-3 mb-6">
                  <label class="block text-[11px] font-bold text-slate-600 uppercase">
                    MÜEZZİN TALEBEYİ SEÇİNİZ
                  </label>
                  <select id="duty-muezzin-select" 
                    onchange="window.App.changeDutyMuezzin(this.value)"
                    class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500">
                    <option value="">-- Müezzin Talebeyi Seçiniz --</option>
                    ${students.map(s => {
                      const fullName = `${s.firstName} ${s.lastName} (${s.className})`;
                      const isSelected = currentMuezzin.startsWith(`${s.firstName} ${s.lastName}`);
                      return `
                        <option value="${fullName}" ${isSelected ? 'selected' : ''}>
                          ${s.firstName} ${s.lastName} (${s.className} • No: ${s.studentNo})
                        </option>
                      `;
                    }).join('')}
                  </select>

                  <!-- Manuel Müezzin Girişi Alternatifi -->
                  <div class="flex items-center gap-2 pt-1">
                    <input type="text" id="duty-muezzin-custom-text" placeholder="Veya manuel müezzin ismi yazınız..."
                      value="${currentMuezzin && !students.some(s => currentMuezzin.startsWith(`${s.firstName} ${s.lastName}`)) ? currentMuezzin : ''}"
                      oninput="window.App.handleMuezzinCustomInput(this.value)"
                      onkeydown="if(event.key === 'Enter') { event.preventDefault(); window.App.changeDutyMuezzin(this.value); }"
                      class="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white">
                    <button type="button" onclick="window.App.changeDutyMuezzin(document.getElementById('duty-muezzin-custom-text').value)"
                      class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer">
                      Ata
                    </button>
                  </div>
                </div>
              ` : ''}

              <!-- Müezzin Durum Rozeti -->
              <div class="p-5 bg-gradient-to-tr from-indigo-50 via-purple-50 to-slate-50 rounded-2xl border-2 border-indigo-200 text-center">
                <div class="text-3xl mb-1">🕌</div>
                <div class="text-[10px] font-black uppercase text-indigo-700 tracking-wider">GÜNÜN MÜEZZİNİ</div>
                ${currentMuezzin ? `
                  <h4 class="text-lg font-black text-slate-900 mt-1">
                    ${currentMuezzin}
                  </h4>
                  <div class="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    <span>🟢</span> <span>5 Vakit Ezan & Cemaat Görevi Atandı</span>
                  </div>
                  ${isAuthorized ? `
                    <div class="mt-3">
                      <button type="button" onclick="window.App.changeDutyMuezzin('')"
                        class="text-xs text-rose-600 hover:underline font-bold cursor-pointer">
                        Görevi Kaldır
                      </button>
                    </div>
                  ` : ''}
                ` : `
                  <div class="text-xs text-slate-500 font-bold mt-1">
                    Henüz atanmadı
                  </div>
                  <div class="text-[10px] text-slate-400 mt-0.5">
                    ${isAuthorized ? 'Yukarıdan müezzin seçimi yapınız' : 'Yetkili tarafından atandığında burada görüntülenecektir'}
                  </div>
                `}
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              TV Panosunda "Günün Müezzini" slaytında ve alt haber bandında görünür.
            </div>
          </div>

        </div>

        <!-- 5. 📌 GÜNÜN ÖZEL DUYURUSU / NOTU -->
        ${isAuthorized ? `
          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-3">
            <label class="block text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <span>📌</span> <span>${dateFormatted} DUYURUSU VEYA ÖZEL NOTU (İSTEĞE BAĞLI)</span>
            </label>
            <input type="text" id="duty-note-input"
              value="${currentNote}"
              oninput="window.App.handleDutyNoteInput(this.value);"
              placeholder="Örn: Bugün öğle yemeği 12:45'te başlayacaktır. Akşam ikramı yemekhanededir."
              class="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500">
            <p class="text-[11px] text-slate-400">
              Bu not TV Panosunda Görevliler slaytının altında özel kutucuk olarak yayınlanır. Yazdığınız anda otomatik kaydedilir.
            </p>
          </div>
        ` : (currentNote ? `
          <div class="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 sm:p-6 space-y-2">
            <div class="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
              <span>📌</span> <span>GÜNÜN DUYURUSU & NOTU</span>
            </div>
            <div class="p-4 bg-white rounded-2xl border border-amber-200 text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed shadow-2xs">
              ${currentNote}
            </div>
          </div>
        ` : `
          <div class="bg-white rounded-3xl border border-slate-200 p-4 text-center text-xs text-slate-400">
            <span>📌 Bu gün için iletilen özel bir görevli duyurusu bulunmamaktadır.</span>
          </div>
        `)}

        <!-- 6. ALT KAYDET VE TV SENKRONİZASYON BUTONU -->
        ${isAuthorized ? `
          <div class="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-3xl shadow-xl">
            <div class="text-xs">
              <span class="font-black text-amber-400">Hedef Tarih:</span>
              <span class="text-white font-bold ml-1">${dateFormatted}</span>
              <span class="text-slate-300 block text-[11px] mt-0.5">Tüm değişiklikler anında kaydedilir; "Kaydet" butonu ile de onaylayıp TV panosuna anında gönderebilirsiniz.</span>
            </div>

            <button type="button" onclick="window.App.saveDailyDutiesSubmit()"
              class="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer text-sm">
              <span>💾</span>
              <span>${dateFormatted} Görevlilerini Kaydet</span>
            </button>
          </div>
        ` : `
          <div class="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-xl">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">📺</span>
              <div class="text-xs">
                <div class="font-black text-amber-400">Canlı Koridor Panosu Senkronizasyonu</div>
                <div class="text-slate-300 text-[11px]">Görevli talebeler koridordaki TV ekranında ve panoda otomatik yayınlanmaktadır.</div>
              </div>
            </div>
            <a href="pano.html" target="_blank"
              class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs border border-amber-500/40 shadow transition flex items-center gap-1.5 cursor-pointer">
              <span>📺 Canlı TV Panosunda Gör ↗</span>
            </a>
          </div>
        `}

        <!-- 7. ⭐ ÖNÜMÜZDEKİ 7 GÜNÜN HAFTALIK NÖBET ÇİZELGESİ (TOPLU TABLO) -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 text-xl flex items-center justify-center shadow-inner">
                📋
              </div>
              <div>
                <h4 class="font-black text-slate-900 text-base">Haftalık Nöbet Çizelgesi (Önümüzdeki 7 Gün)</h4>
                <p class="text-xs text-slate-500">Planlanan tüm görevlileri toplu inceleyin; günü geldiğinde TV panosu kendiliğinden devreye alır.</p>
              </div>
            </div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              <span>🔄</span> <span>Otomatik Günlük Döngü</span>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <th class="py-3 px-3.5 rounded-l-xl">Tarih & Gün</th>
                  <th class="py-3 px-3.5">Yemekhane Nöbetçileri</th>
                  <th class="py-3 px-3.5">Vakit Müezzini</th>
                  <th class="py-3 px-3.5">Özel Not / Duyuru</th>
                  <th class="py-3 px-3.5 text-right rounded-r-xl">İşlem</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                ${upcomingDays.map(day => {
                  const isCurSelected = day.date === targetDate;
                  const ymList = Array.isArray(day.duties.yemekciler) ? day.duties.yemekciler : [];
                  const mz = day.duties.muezzin || '';
                  const nt = day.duties.note || '';

                  return `
                    <tr class="transition hover:bg-slate-50/80 ${isCurSelected ? 'bg-amber-50/70 font-semibold' : ''}">
                      <!-- 1. Tarih -->
                      <td class="py-3.5 px-3.5 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                          <span class="w-2.5 h-2.5 rounded-full shrink-0 ${day.isToday ? 'bg-emerald-500' : (day.hasAssignment ? 'bg-amber-500' : 'bg-slate-300')}"></span>
                          <div>
                            <div class="font-black text-slate-900 text-xs flex items-center gap-1">
                              <span>${day.dayLabel}</span>
                              ${day.isToday ? `<span class="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">Bugün</span>` : ''}
                            </div>
                            <div class="text-[11px] font-mono text-slate-500">
                              ${day.dateDisplay}
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- 2. Yemekçiler -->
                      <td class="py-3.5 px-3.5">
                        ${ymList.length > 0 ? `
                          <div class="flex flex-wrap gap-1.5 max-w-md">
                            ${ymList.map(name => `
                              <span class="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-950 border border-amber-200 text-[11px] font-bold inline-flex items-center gap-1">
                                <span>🍽️</span> <span>${name}</span>
                              </span>
                            `).join('')}
                          </div>
                        ` : `
                          <span class="text-slate-400 italic text-[11px]">— Henüz atanmadı</span>
                        `}
                      </td>

                      <!-- 3. Müezzin -->
                      <td class="py-3.5 px-3.5 whitespace-nowrap">
                        ${mz ? `
                          <span class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-950 border border-indigo-200 text-[11px] font-bold inline-flex items-center gap-1.5 shadow-2xs">
                            <span>🕌</span> <span>${mz}</span>
                          </span>
                        ` : `
                          <span class="text-slate-400 italic text-[11px]">— Atanmadı</span>
                        `}
                      </td>

                      <!-- 4. Duyuru / Not -->
                      <td class="py-3.5 px-3.5 max-w-xs">
                        ${nt ? `
                          <span class="text-slate-700 text-[11px] leading-tight line-clamp-2">
                            📌 ${nt}
                          </span>
                        ` : `
                          <span class="text-slate-300">—</span>
                        `}
                      </td>

                      <!-- 5. İşlemler -->
                      <td class="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                          <button type="button" onclick="window.App.changeDutyDate('${day.date}'); window.scrollTo({ top: 380, behavior: 'smooth' });"
                            class="px-3 py-1.5 rounded-xl ${isCurSelected ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold'} text-xs transition cursor-pointer">
                            ${isCurSelected ? '✏️ Seçili' : 'Düzenle'}
                          </button>
                          ${isAuthorized && day.hasAssignment ? `
                            <button type="button" onclick="window.App.deleteDutyForDate('${day.date}')"
                              class="w-7 h-7 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition flex items-center justify-center cursor-pointer"
                              title="Bu günün nöbetini temizle">
                              ✕
                            </button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  },

  changeDutyDate(newDate) {
    if (!newDate) return;
    this.selectedDutyDate = newDate;
    this.draftDutyYemekciler = null;
    this.draftDutyMuezzin = null;
    this.draftDutyNote = null;
    this.renderDailyDutiesView();
  },

  changeDutyMuezzin(val) {
    if (!this.isAuthorizedForDuties()) {
      this.showToast('Günün görevlilerini atama yetkisi veli hesabında bulunmamaktadır.', 'warning');
      return;
    }
    this.draftDutyMuezzin = (val || '').trim();
    this.autoSaveDailyDuties();
    this.renderDailyDutiesView();
  },

  handleMuezzinCustomInput(val) {
    this.draftDutyMuezzin = (val || '').trim();
  },

  handleDutyNoteInput(val) {
    this.draftDutyNote = val;
    if (this._dutyNoteSaveTimer) clearTimeout(this._dutyNoteSaveTimer);
    this._dutyNoteSaveTimer = setTimeout(() => {
      this.autoSaveDailyDuties();
    }, 800);
  },

  copyDutiesFromPreviousDay() {
    if (!this.isAuthorizedForDuties()) {
      this.showToast('Günün görevlilerini kopyalama yetkisi veli hesabında bulunmamaktadır.', 'warning');
      return;
    }
    const curDate = this.selectedDutyDate || new Date().toISOString().split('T')[0];
    const prevDateObj = new Date(curDate + 'T00:00:00');
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevIso = prevDateObj.toISOString().split('T')[0];

    const prevDuties = (window.Store && typeof window.Store.getDailyDuties === 'function')
      ? window.Store.getDailyDuties(prevIso, false)
      : { yemekciler: [], muezzin: '', note: '' };

    if ((!prevDuties.yemekciler || prevDuties.yemekciler.length === 0) && !prevDuties.muezzin) {
      this.showToast(`Bir önceki günde (${prevIso}) kayıtlı görevli bulunamadı.`, 'warning');
      return;
    }

    this.draftDutyYemekciler = Array.isArray(prevDuties.yemekciler) ? [...prevDuties.yemekciler] : [];
    this.draftDutyMuezzin = prevDuties.muezzin || '';
    this.draftDutyNote = prevDuties.note || '';
    this.autoSaveDailyDuties();
    this.showToast(`✓ ${prevIso} gününün görevlileri aktarıldı ve kaydedildi.`, 'success');
    this.renderDailyDutiesView();
  },

  deleteDutyForDate(targetDate) {
    if (!this.isAuthorizedForDuties()) {
      this.showToast('Günün görevlilerini silme yetkisi veli hesabında bulunmamaktadır.', 'warning');
      return;
    }

    const dateToDel = targetDate || this.selectedDutyDate || new Date().toISOString().split('T')[0];
    if (!confirm(`${dateToDel} tarihli nöbetçi kayıtlarını temizlemek istediğinize emin misiniz?`)) {
      return;
    }

    if (window.Store && typeof window.Store.deleteDailyDuties === 'function') {
      window.Store.deleteDailyDuties(dateToDel);
      if (this.selectedDutyDate === dateToDel) {
        this.draftDutyYemekciler = [];
        this.draftDutyMuezzin = '';
        this.draftDutyNote = '';
      }
      this.showToast(`✓ ${dateToDel} tarihli nöbet kaydı temizlendi.`, 'info');
      this.renderDailyDutiesView();
    }
  },

  addYemekciFromSelect() {
    if (!this.isAuthorizedForDuties()) {
      this.showToast('Günün görevlilerini atama ve değiştirme yetkisi veli hesabında bulunmamaktadır.', 'warning');
      return;
    }

    const sel = document.getElementById('duty-yemekci-select');
    if (!sel || !sel.value) {
      this.showToast('Lütfen listeden bir talebe seçiniz.', 'warning');
      return;
    }
    const val = sel.value.trim();
    if (!Array.isArray(this.draftDutyYemekciler)) {
      this.draftDutyYemekciler = [];
    }
    if (this.draftDutyYemekciler.includes(val)) {
      this.showToast('Bu talebe zaten yemekçi listesinde ekli.', 'warning');
      return;
    }
    this.draftDutyYemekciler.push(val);
    sel.value = '';
    this.autoSaveDailyDuties();
    this.renderDailyDutiesView();
  },

  addYemekciFromCustomText() {
    if (!this.isAuthorizedForDuties()) {
      this.showToast('Günün görevlilerini atama ve değiştirme yetkisi veli hesabında bulunmamaktadır.', 'warning');
      return;
    }

    const input = document.getElementById('duty-yemekci-custom-text');
    if (!input || !input.value.trim()) return;
    const val = input.value.trim();
    if (!Array.isArray(this.draftDutyYemekciler)) {
      this.draftDutyYemekciler = [];
    }
    if (this.draftDutyYemekciler.includes(val)) {
      this.showToast('Bu isim zaten listede ekli.', 'warning');
      return;
    }
    this.draftDutyYemekciler.push(val);
    input.value = '';
    this.autoSaveDailyDuties();
    this.renderDailyDutiesView();
  },

  removeYemekciAtIndex(idx) {
    if (!this.isAuthorizedForDuties()) {
      this.showToast('Günün görevlilerini atama ve değiştirme yetkisi veli hesabında bulunmamaktadır.', 'warning');
      return;
    }

    if (Array.isArray(this.draftDutyYemekciler)) {
      this.draftDutyYemekciler.splice(idx, 1);
      this.autoSaveDailyDuties();
      this.renderDailyDutiesView();
    }
  },

  clearAllYemekciler() {
    if (!this.isAuthorizedForDuties()) {
      this.showToast('Günün görevlilerini atama ve değiştirme yetkisi veli hesabında bulunmamaktadır.', 'warning');
      return;
    }

    this.draftDutyYemekciler = [];
    this.autoSaveDailyDuties();
    this.renderDailyDutiesView();
  },

  saveDailyDutiesSubmit() {
    if (!this.isAuthorizedForDuties()) {
      this.showToast('Günün görevlilerini atama ve kaydetme yetkisi veli hesabında bulunmamaktadır.', 'warning');
      return;
    }

    const noteInput = document.getElementById('duty-note-input');
    const note = noteInput ? noteInput.value.trim() : (this.draftDutyNote || '');
    this.draftDutyNote = note;
    const date = this.selectedDutyDate || new Date().toISOString().split('T')[0];

    const payload = {
      date,
      yemekciler: this.draftDutyYemekciler || [],
      muezzin: this.draftDutyMuezzin || '',
      note
    };

    if (window.Store && typeof window.Store.saveDailyDuties === 'function') {
      const res = window.Store.saveDailyDuties(payload);
      this.draftDutyYemekciler = [...payload.yemekciler];
      this.draftDutyMuezzin = payload.muezzin;
      this.draftDutyNote = payload.note;
      if (res && res.success) {
        this.showToast(`✓ ${date} tarihli görevliler başarıyla kaydedildi ve TV panosuna iletildi!`, 'success');
      } else {
        this.showToast((res && res.message) ? res.message : 'Görevliler kaydedildi.', 'success');
      }
    }
    this.renderDailyDutiesView();
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

    // Hem noktalı virgül (CSV) hem de sekme (Excel kopyala-yapıştır) satırlarını işle
    const parsedStudents = (window.Store && typeof window.Store.parseCsvToStudents === 'function')
      ? window.Store.parseCsvToStudents(text)
      : [];

    let incoming = parsedStudents;
    if (!incoming || incoming.length === 0) {
      const lines = text.split(/\r?\n/).filter(Boolean);
      incoming = [];
      lines.forEach(line => {
        const delim = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
        const parts = line.split(delim).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2 && (parts[0] || parts[1])) {
          let no = parts[0];
          let fn = '';
          let ln = '';
          if (parts.length >= 3) {
            fn = parts[1];
            ln = parts[2];
          } else {
            const np = parts[1].split(' ');
            ln = np.pop() || '';
            fn = np.join(' ') || parts[1];
          }
          incoming.push({
            studentNo: no,
            firstName: fn.toUpperCase(),
            lastName: ln.toUpperCase(),
            className: parts[3] || '5-A',
            school: parts[4] || '-',
            seviye: parts[5] || 'Seviye 1',
            etutHocasi: parts[6] || '',
            dahiliHoca: parts[7] || '',
            yatakhane: parts[8] || '',
            parentPhone: parts[9] || '',
            password: parts[10] || '123',
            familyCode: parts[11] || (ln ? ln + '2026' : 'AILE2026')
          });
        }
      });
    }

    if (incoming.length === 0) {
      this.showToast('Yapıştırılan metinde talebe satırı bulunamadı.', 'error');
      return;
    }

    // Mevcut talebelerle akıllı birleştirme:
    // 1. Öğrenci numarasına göre eşleşen varsa güncelle
    // 2. Ad ve Soyadına göre eşleşen varsa numarayı ve bilgileri güncelle
    // 3. Eşleşmeyen varsa yeni talebe olarak ekle
    const currentStudents = window.Store.getAllStudents ? window.Store.getAllStudents() : window.Store.getStudents(true);
    const updatedList = [...currentStudents];
    let updatedCount = 0;
    let addedCount = 0;

    incoming.forEach(inc => {
      const incNo = (inc.studentNo || '').toString().trim();
      const incFn = (inc.firstName || '').toString().trim().toUpperCase();
      const incLn = (inc.lastName || '').toString().trim().toUpperCase();
      const incFullName = `${incFn} ${incLn}`.trim();

      let existingIdx = -1;
      if (incNo) {
        existingIdx = updatedList.findIndex(s => (s.studentNo || '').toString().trim() === incNo);
      }
      if (existingIdx === -1 && incFullName) {
        existingIdx = updatedList.findIndex(s => {
          const sFn = (s.firstName || '').toString().trim().toUpperCase();
          const sLn = (s.lastName || '').toString().trim().toUpperCase();
          return `${sFn} ${sLn}`.trim() === incFullName;
        });
      }

      if (existingIdx !== -1) {
        const target = updatedList[existingIdx];
        if (incNo) target.studentNo = incNo;
        if (incFn) target.firstName = incFn;
        if (incLn) target.lastName = incLn;
        if (inc.className) target.className = inc.className;
        if (inc.school && inc.school !== '-') target.school = inc.school;
        if (inc.seviye) target.seviye = inc.seviye;
        if (inc.etutHocasi) target.etutHocasi = inc.etutHocasi;
        if (inc.dahiliHoca) target.dahiliHoca = inc.dahiliHoca;
        if (inc.yatakhane) target.yatakhane = inc.yatakhane;
        if (inc.parentPhone) {
          target.parentPhone = inc.parentPhone;
          target.fatherPhone = inc.parentPhone;
        }
        if (inc.password && inc.password !== '123') target.password = inc.password;
        if (inc.familyCode) target.familyCode = inc.familyCode.toUpperCase();
        target.updatedAt = new Date().toISOString();

        if (window.Store && typeof window.Store.setCustomStudentNo === 'function' && incNo) {
          window.Store.setCustomStudentNo(target.id, incNo);
        }
        updatedCount++;
      } else {
        const newId = 'std_' + (incNo || Date.now()) + '_' + Math.random().toString(36).substr(2, 4);
        const newSt = {
          id: newId,
          studentNo: incNo,
          firstName: incFn,
          lastName: incLn,
          className: inc.className || '5-A',
          school: inc.school || '-',
          seviye: inc.seviye || 'Seviye 1',
          etutHocasi: inc.etutHocasi || '',
          dahiliHoca: inc.dahiliHoca || '',
          yatakhane: inc.yatakhane || '',
          parentPhone: inc.parentPhone || '',
          fatherPhone: inc.parentPhone || '',
          password: inc.password || '123',
          familyCode: inc.familyCode || (incLn ? incLn + '2026' : 'AILE2026'),
          isPassive: false,
          status: 'active',
          updatedAt: new Date().toISOString()
        };
        if (window.Store && typeof window.Store.setCustomStudentNo === 'function' && incNo) {
          window.Store.setCustomStudentNo(newId, incNo);
        }
        updatedList.push(newSt);
        addedCount++;
      }
    });

    window.Store.saveStudents(updatedList);
    this.showToast(`✓ Excel verileri işlendi: ${updatedCount} talebe güncellendi, ${addedCount} yeni eklendi.`, 'success');
    this.closeBulkImportModal();
    this.renderStudentsView();
    if (window.StudentExcelModule && typeof window.StudentExcelModule.render === 'function') {
      window.StudentExcelModule.render();
    }
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
      }
    } else {
      title.innerText = 'Yeni Öğrenci Ekle';
      const students = window.Store.getStudents();
      const maxNo = students.reduce((max, s) => Math.max(max, parseInt(s.studentNo) || 0), 100);
      document.getElementById('modal-student-no').value = maxNo + 1;
      document.getElementById('modal-student-pass').value = '123';
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
      isPassive: false,
      status: 'active'
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
  },

  // Talebeyi Pasife veya Aktife Al (Kaldırıldı)
  toggleStudentPassive(id) {
    this.showToast('Talebeleri pasife alma özelliği kaldırılmıştır. Tüm öğrenciler daima aktiftir.', 'info');
  },

  // Tüm Talebeleri Tek Tıkla Aktife Alma (66 Öğrenciyi Kesin Aktif Yapar)
  activateAllStudents() {
    if (!this.canManageStudents()) {
      this.showToast('Bu yetki yalnızca Ana Yöneticidedir.', 'warning');
      return;
    }
    const res = window.Store.activateAllStudents();
    if (res && res.success) {
      this.showToast(`⚡ Tüm öğrenciler (${res.count} talebe) başarıyla aktife alındı!`, 'success');
      this.renderStudentsView();
      if (window.StudentExcelModule && typeof window.StudentExcelModule.render === 'function') {
        window.StudentExcelModule.render();
      }
    } else {
      this.showToast('İşlem sırasında bir hata oluştu.', 'error');
    }
  },

  deleteStudent(id) {
    if (!this.canManageStudents()) {
      this.showToast('Talebe silme yetkisi yalnızca Ana Yöneticidedir.', 'error');
      return;
    }
    const s = window.Store.getStudentById(id);
    if (!s) return;
    if (confirm(`"${s.firstName} ${s.lastName}" adlı öğrenciyi sistemden TAMAMEN SİLMEK istediğinizden emin misiniz?\n\n⚠️ Bu işlem geri alınamaz!`)) {
      window.Store.deleteStudent(id);
      this.showToast('Öğrenci kaydı kalıcı olarak silindi ve bulutla eşitlendi.', 'info');
      this.renderStudentsView();
      if (window.StudentExcelModule && typeof window.StudentExcelModule.render === 'function') {
        window.StudentExcelModule.render();
      }
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
  },

  hardRefreshApp() {
    if (typeof window.forcePurgeAppCache === 'function') {
      window.forcePurgeAppCache();
      return;
    }
    try {
      if ('caches' in window) {
        caches.keys().then(names => { names.forEach(n => caches.delete(n)); });
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => { regs.forEach(r => r.unregister()); });
      }
    } catch (e) {}
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }
};

// ========================================================
// --- ÖĞRENCİ YÖNLENDİRME MODÜLÜ (GÜVENLİ DELEGASYON) ---
// ========================================================
window.StudentExcelModule = {
  init() {
    if (window.App) {
      window.App.activeTab = 'ogrenciler';
      window.App.renderStudentsView();
    }
  },
  render() {
    if (window.App) {
      window.App.activeTab = 'ogrenciler';
      window.App.renderStudentsView();
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
  });
} else {
  window.App.init();
}
