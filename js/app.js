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
  studentFilterClass: 'ALL',
  studentSearchQuery: '',

  init() {
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

    if (session.role === 'staff') {
      this.activeTab = 'yoklama';
      this.showToast(`Hoş geldiniz Sayın ${session.name}`, 'success');
    } else if (session.role === 'parent') {
      this.showToast(`Hoş geldiniz Sayın Veli`, 'success');
    }

    this.renderHeader();
    this.renderMainContent();
  },

  // --- Ana Yönetici E-posta Doğrulama Kodu İsteği ---
  async handleAdminOtpRequest(event) {
    if (event) event.preventDefault();
    const emailInput = document.getElementById('admin-email-input');
    const submitBtn = document.getElementById('admin-otp-btn');
    const email = (emailInput ? emailInput.value : this.adminEmailDraft || '').trim();
    if (!email) return;

    const res = window.Store.generateAdminOtp(email);

    if (!res.success) {
      this.showToast(res.message, 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>E-posta Gönderiliyor...</span> <span>⏳</span>`;
    }

    // Gerçek e-posta gönderimi (FormSubmit servisi ile selimbozkurt111@gmail.com adresine)
    try {
      await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
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
      });
    } catch (err) {
      console.warn('E-posta servis bildirimi:', err);
    }

    this.adminEmailDraft = email;
    this.otpStep = 'verify';

    // Güvenli Kod Bildirimi
    this.showToast(`📩 Doğrulama kodunuz ${email} adresine gönderildi!`, 'success');
    this.renderMainContent();
  },

  // --- Ana Yönetici Kodu Doğrulama ve Giriş ---
  handleAdminOtpVerify(event) {
    if (event) event.preventDefault();
    const codeInput = document.getElementById('admin-otp-code-input');
    if (!codeInput || !codeInput.value.trim()) return;

    const code = codeInput.value.trim();
    const res = window.Store.verifyAdminOtp(code);

    if (!res.success) {
      this.showToast(res.message, 'error');
      codeInput.select();
      return;
    }

    this.currentSession = res.session;
    sessionStorage.setItem('yoklama_active_session', JSON.stringify(res.session));
    this.loginMode = 'user';
    this.otpStep = 'request';
    this.activeTab = 'yoklama';

    this.showToast('E-posta doğrulaması başarılı! Ana Yönetici olarak giriş yapıldı.', 'success');
    this.renderHeader();
    this.renderMainContent();
  },

  logout() {
    this.currentSession = null;
    sessionStorage.removeItem('yoklama_active_session');
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
      roleBadge = `<span class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black text-xs border border-amber-300">👑 Ana Yönetici (Müdür)</span>`;
    } else if (session.role === 'staff') {
      roleBadge = `
        <div class="flex items-center gap-1.5">
          <span class="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-bold text-xs border border-blue-200">👨‍🏫 ${session.name}</span>
          <button type="button" onclick="window.App.openStaffSelfPasswordModal()" 
            class="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300 shadow-2xs transition flex items-center gap-1"
            title="Kendi Giriş Şifrenizi Değiştirin">
            <span>🔑</span>
            <span class="hidden sm:inline">Şifremi Değiştir</span>
          </button>
        </div>
      `;
    } else {
      roleBadge = `<span class="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 font-bold text-xs border border-purple-200">👨‍👩‍👧 Veli Portalı (${session.familyCode})</span>`;
    }

    let activeTitle = '📋 Yoklama';
    if (this.activeTab === 'yoklama') {
      const cat = (window.AttendanceModule && window.AttendanceModule.currentCategory) || 'namaz';
      if (cat === 'namaz') activeTitle = '🕌 Namaz Yoklaması';
      else if (cat === 'yatak') activeTitle = '🛏️ Yatak Yoklaması';
      else if (cat === 'okul_donusu') activeTitle = '🎒 Okul Dönüşü';
      else if (cat === 'namaz_rapor') activeTitle = '📊 Namaz Raporları';
    } else if (this.activeTab === 'akademi' || this.activeTab === 'performans') {
      const sub = (window.AkademiModule && window.AkademiModule.currentSubCategory) || 'takviye';
      if (sub === 'takviye') {
        const subj = (window.AkademiModule && window.AkademiModule.currentSubject) || 'Türkçe';
        activeTitle = `🎓 Akademi • ${subj}`;
      } else {
        activeTitle = '🎓 Akademi • Genel Karne';
      }
    } else if (this.activeTab === 'izin_cikis') {
      activeTitle = '🚪 İzine Çıkış Takibi';
    } else if (this.activeTab === 'ogrenciler') {
      activeTitle = '👥 Öğrenci Yönetimi';
    } else if (this.activeTab === 'personel') {
      activeTitle = '👨‍🏫 Personel Yönetimi';
    } else if (this.activeTab === 'ayarlar') {
      activeTitle = '⚙️ Sistem Ayarları';
    }

    header.innerHTML = `
      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
          ${session.role !== 'parent' ? `
            <!-- 1. MENÜ BUTONU -->
            <button onclick="window.App.openDrawer()" 
              class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 flex-shrink-0">
              <span class="text-sm leading-none">☰</span>
              <span>Menü</span>
            </button>
          ` : ''}

          <!-- 2. KURS GÖRSELİ -->
          <div class="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200 bg-white">
            ${settings.institutionLogo ? `
              <img src="${settings.institutionLogo}" alt="Logo" class="w-full h-full object-cover"
                onerror="window.App.handleLogoError(this)">
              <div class="hidden w-full h-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center">🏛️</div>
            ` : `
              <div class="w-full h-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center">🏛️</div>
            `}
          </div>

          <!-- 3. KULLANICI ADI & 4. HANGİ SAYFADAYSAK O -->
          <div class="flex flex-wrap items-center gap-2">
            ${roleBadge}
            ${session.role !== 'parent' ? `
              <span class="text-slate-300 hidden sm:inline">•</span>
              <span class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 font-black text-xs border border-emerald-300 shadow-2xs flex items-center gap-1.5">
                ${activeTitle}
              </span>
            ` : ''}
          </div>
        </div>

        <!-- SAĞ: ÇIKIŞ BUTONU -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <button onclick="window.App.logout()" 
            class="text-xs text-rose-600 hover:text-rose-700 font-bold px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 transition flex items-center gap-1">
            <span>🚪</span>
            <span class="hidden sm:inline">Çıkış</span>
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

  navigateFromDrawer(tab, category = null) {
    this.closeDrawer();
    this.activeTab = tab;
    if (tab === 'yoklama' && category && window.AttendanceModule) {
      window.AttendanceModule.currentCategory = category;
    }
    if ((tab === 'akademi' || tab === 'performans') && category && window.AkademiModule) {
      window.AkademiModule.currentSubCategory = category;
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
        <div class="space-y-1.5 pt-3 border-t border-slate-100">
          <div class="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">AKADEMİ & DERSLER</div>

          <!-- Takviye Ders Performansı -->
          <button type="button" onclick="window.App.navigateFromDrawer('akademi', 'takviye')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              (this.activeTab === 'akademi' || this.activeTab === 'performans') && currentAkademiSub === 'takviye'
                ? 'bg-blue-50 text-blue-900 font-black border border-blue-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">📚</span>
              <div>
                <div class="text-xs font-black">Takviye Ders Performansı</div>
                <div class="text-[10px] text-slate-400 font-medium">Türkçe, Mat, Fen, Sosyal, İngilizce 100 puan</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>

          <!-- Genel Gelişim & Karne -->
          <button type="button" onclick="window.App.navigateFromDrawer('akademi', 'genel')"
            class="w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between ${
              (this.activeTab === 'akademi' || this.activeTab === 'performans') && currentAkademiSub === 'genel'
                ? 'bg-amber-50 text-amber-900 font-black border border-amber-200 shadow-sm'
                : 'text-slate-700 hover:bg-slate-50 font-bold'
            }">
            <div class="flex items-center gap-3">
              <span class="text-xl">⭐</span>
              <div>
                <div class="text-xs font-black">Genel Gelişim & Karne</div>
                <div class="text-[10px] text-slate-400 font-medium">Kriter yıldızları ve öğretmen görüşleri</div>
              </div>
            </div>
            <span class="text-slate-300">→</span>
          </button>
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
        </div>

        ${session.canManageStaff ? `
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

                  <button type="submit" id="admin-otp-btn"
                    class="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2">
                    <span>Doğrulama Kodu Gönder</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </button>
                </form>
              ` : `
                <form onsubmit="window.App.handleAdminOtpVerify(event)" class="space-y-4 animate-fade-in">
                  <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left space-y-2">
                    <div class="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <span class="text-base">✉️</span> Doğrulama Kodu Gönderildi!
                    </div>
                    <p class="text-[12px] text-emerald-800 leading-relaxed">
                      <strong>${this.adminEmailDraft}</strong> adresinize 6 haneli güvenlik kodu gönderildi. Lütfen gelen kutunuzu (ve gerekiyorsa Spam/Gereksiz klasörünü) kontrol ediniz.
                    </p>
                    <div class="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                      <span class="text-emerald-700">E-posta gecikti mi?</span>
                      <button type="button" onclick="alert('🔑 Ana Yönetici Güvenlik Kodunuz: ' + (window.Store.activeAdminOtp ? window.Store.activeAdminOtp.code : ''))"
                        class="font-bold text-emerald-900 underline hover:text-emerald-700">
                        Kodu Ekranda Gör
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-left text-xs font-bold text-slate-700 mb-1.5 uppercase">6 HANELİ DOĞRULAMA KODU</label>
                    <input type="text" id="admin-otp-code-input" maxlength="6" required autofocus placeholder="••••••" 
                      class="w-full px-4 py-3 bg-slate-50 border-2 border-amber-300 rounded-xl text-center text-2xl font-mono font-bold tracking-widest text-slate-900 focus:border-amber-600 focus:bg-white focus:outline-none transition">
                  </div>

                  <button type="submit" 
                    class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition">
                    Doğrula ve Sisteme Gir
                  </button>

                  <div class="flex items-center justify-between text-xs pt-1">
                    <button type="button" onclick="window.App.otpStep='request'; window.App.renderMainContent();" 
                      class="text-slate-400 hover:text-slate-600 font-medium">
                      Farklı e-posta dene
                    </button>
                    <button type="button" onclick="window.App.handleAdminOtpRequest(null)" 
                      class="text-amber-700 hover:text-amber-800 font-bold">
                      Kodu Tekrar Gönder
                    </button>
                  </div>
                </form>
              `}

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
                <button onclick="window.App.loginMode='admin_otp'; window.App.otpStep='request'; window.App.renderMainContent();" 
                  class="font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1">
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
    } else if (this.activeTab === 'izin_cikis') {
      main.innerHTML = `<div id="leave-tracker-container"></div>`;
      if (window.LeaveTrackerModule) {
        window.LeaveTrackerModule.init();
      }
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

  // --- Öğrenci & Şifre Yönetimi Görünümü ---
  renderStudentsView() {
    const container = document.getElementById('students-container');
    if (!container) return;

    const session = this.currentSession;
    const canEdit = session.canEditStudents;
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
              ${canEdit ? 'Öğrencileri ve velilerin giriş yapacağı şifreleri Ana Yönetici olarak buradan düzenleyebilirsiniz.' : 'Eğitmenler listeyi inceleyebilir; şifre ve öğrenci düzenleme yetkisi Ana Yöneticidedir.'}
            </p>
          </div>

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
              <input type="text" placeholder="İsim, No veya Hoca ara..." 
                value="${this.studentSearchQuery}"
                oninput="window.App.studentSearchQuery = this.value.toLowerCase().trim(); window.App.renderStudentsView();"
                class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none w-72">
            </div>
          </div>
          <span class="text-xs font-bold text-slate-500">Toplam ${students.length} Öğrenci</span>
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
                return `
                  <tr class="table-row-hover transition">
                    <td class="py-3 px-4 text-center font-bold text-slate-700">${s.studentNo}</td>
                    <td class="py-3 px-4">
                      <div class="font-bold text-slate-900">${s.firstName} ${s.lastName}</div>
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
                          <button onclick="window.App.openStudentModal('${s.id}')"
                            class="p-1 text-slate-400 hover:text-slate-700 transition" title="Düzenle / Şifre Değiştir">✏️</button>
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

            <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-2">
              <span>💾</span>
              <span>Ayarları & Logoyu Kaydet</span>
            </button>
          </form>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 class="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
            <span>💾</span> Veri Yedekleme
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

    window.Store.saveSettings({
      institutionName: instName,
      adminEmail: adminEmail,
      institutionLogo: logoUrl
    });

    this.showToast('Ayarlar ve kurs logosu kaydedildi!', 'success');
    this.renderHeader();
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

    const payload = { studentNo, firstName, lastName, className, password, familyCode, etutHocasi, dahiliHoca, yatakhane, fatherName, parentPhone };

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

  deleteStudent(id) {
    const s = window.Store.getStudentById(id);
    if (!s) return;
    if (confirm(`"${s.firstName} ${s.lastName}" adlı öğrenciyi silmek istediğinizden emin misiniz?`)) {
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

document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
