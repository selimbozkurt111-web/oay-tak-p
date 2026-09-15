/**
 * performance.js - Akademi & Performans Takip Modülü
 * - Alt Başlık 1: Takviye Ders Performansı (Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler, İngilizce - 100 üzerinden değerlendirme)
 * - Alt Başlık 2: Genel Gelişim & Karne (Kriter yıldızları, rozetler ve öğretmen görüşleri)
 */

window.AkademiModule = {
  currentSubCategory: 'takviye', // 'takviye' | 'genel'
  currentSubject: 'Türkçe',      // 'Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'
  currentDate: new Date().toISOString().split('T')[0],
  selectedClasses: [],           // Boş ise Tüm Sınıflar
  searchQuery: '',
  saveTimers: {},
  selectedBadges: new Set(),

  subCategories: [
    { id: 'takviye', label: 'Takviye Ders Performansı', icon: '📚', short: 'Takviye Dersler' },
    { id: 'genel', label: 'Genel Gelişim & Karne', icon: '⭐', short: 'Genel Karne' }
  ],

  // Namaz yoklamasındaki 5 vakit gibi 5 Takviye Dersi Butonu
  subjects: [
    { name: 'Türkçe', icon: '🇹🇷', label: 'Türkçe Dersi' },
    { name: 'Matematik', icon: '📐', label: 'Matematik Dersi' },
    { name: 'Fen Bilimleri', icon: '🔬', label: 'Fen Bilimleri' },
    { name: 'Sosyal Bilgiler', icon: '🌍', label: 'Sosyal Bilgiler' },
    { name: 'İngilizce', icon: '🇬🇧', label: 'İngilizce Dersi' }
  ],

  AVAILABLE_BADGES: [
    { name: 'Haftanın Yıldızı', icon: '⭐', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { name: 'Ezberini Tam Verdi', icon: '📖', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { name: 'Namazlarını Eksiksiz Kıldı', icon: '🕌', color: 'bg-teal-100 text-teal-800 border-teal-300' },
    { name: 'Kılık Kıyafete Özen Gösterdi', icon: '✨', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { name: 'Derste Çok Aktif', icon: '🎯', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { name: 'Ödevini Yaptı', icon: '📝', color: 'bg-sky-100 text-sky-800 border-sky-300' },
    { name: 'Gelişim Gösteriyor', icon: '📈', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { name: 'Daha Fazla Gayret Etmeli', icon: '⚠️', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { name: 'Tekrar Yapmalı', icon: '🔄', color: 'bg-orange-100 text-orange-800 border-orange-300' }
  ],

  init() {
    this.renderView();
  },

  setSubCategory(sub) {
    this.currentSubCategory = sub;
    this.renderView();
  },

  setSubject(subject) {
    this.currentSubject = subject;
    this.renderView();
    if (window.App && window.App.showToast) {
      window.App.showToast(`${this.currentSubject} takviye dersi seçildi.`, 'info');
    }
  },

  setDate(date) {
    this.currentDate = date;
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

  // Çoklu Sınıf Seçimi
  toggleClass(className) {
    if (this.selectedClasses.includes(className)) {
      this.selectedClasses = this.selectedClasses.filter(c => c !== className);
    } else {
      this.selectedClasses.push(className);
    }
    this.renderStudentRows();
  },

  toggleAllClasses() {
    this.selectedClasses = [];
    this.renderStudentRows();
  },

  setSearchQuery(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.renderStudentRows();
  },

  getScoreBadge(score) {
    if (score === null || score === undefined || score === '' || isNaN(score)) {
      return `<span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-bold border border-slate-200">- Girilmedi</span>`;
    }
    const val = Number(score);
    if (val >= 85) {
      return `<span class="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black border border-emerald-300">Pekiyi 🌟</span>`;
    } else if (val >= 70) {
      return `<span class="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black border border-blue-300">İyi 👍</span>`;
    } else if (val >= 55) {
      return `<span class="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black border border-amber-300">Orta ⚡</span>`;
    } else {
      return `<span class="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black border border-rose-300">Gelişmeli ⚠️</span>`;
    }
  },

  // 100 Üzerinden Puan Girişi & ANINDA OTOMATİK KAYIT
  handleScoreInput(studentId, value) {
    const cleanVal = value.trim();
    const num = cleanVal === '' ? null : Math.min(100, Math.max(0, parseInt(cleanVal, 10)));
    
    // Rozeti hemen güncelle
    const badgeEl = document.getElementById(`score-badge-${studentId}`);
    if (badgeEl) {
      badgeEl.innerHTML = this.getScoreBadge(num);
    }

    // Durum uyarısı
    const statusEl = document.getElementById(`save-status-${studentId}`);
    if (statusEl) {
      statusEl.innerHTML = `<span class="text-amber-500 font-bold text-[11px] animate-pulse">Kaydediliyor...</span>`;
    }

    if (this.saveTimers[studentId]) clearTimeout(this.saveTimers[studentId]);

    this.saveTimers[studentId] = setTimeout(() => {
      window.Store.saveSingleAcademicScore(
        studentId,
        this.currentDate,
        this.currentSubject,
        num
      );
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-emerald-600 font-black text-[11px]">✓ Kaydedildi</span>`;
        setTimeout(() => {
          if (statusEl) statusEl.innerHTML = '';
        }, 1500);
      }
    }, 350);
  },

  saveScoreImmediate(studentId, value) {
    const cleanVal = value.trim();
    const num = cleanVal === '' ? null : Math.min(100, Math.max(0, parseInt(cleanVal, 10)));
    window.Store.saveSingleAcademicScore(
      studentId,
      this.currentDate,
      this.currentSubject,
      num
    );
    const statusEl = document.getElementById(`save-status-${studentId}`);
    if (statusEl) {
      statusEl.innerHTML = `<span class="text-emerald-600 font-black text-[11px]">✓ Kaydedildi</span>`;
      setTimeout(() => {
        if (statusEl) statusEl.innerHTML = '';
      }, 1500);
    }
  },

  getFilteredStudents() {
    let students = window.Store.getStudents();

    if (this.selectedClasses && this.selectedClasses.length > 0) {
      students = students.filter(s => this.selectedClasses.includes(s.className));
    }

    if (this.searchQuery) {
      students = students.filter(s => 
        s.firstName.toLowerCase().includes(this.searchQuery) ||
        s.lastName.toLowerCase().includes(this.searchQuery) ||
        (s.className && s.className.toLowerCase().includes(this.searchQuery))
      );
    }

    return students;
  },

  renderView() {
    const container = document.getElementById('performance-container') || document.getElementById('akademi-container');
    if (!container) return;

    // 1. Durum: Takviye Ders Performansı (5 Ders Butonu & 100 Üzerinden Puanlama)
    if (this.currentSubCategory === 'takviye') {
      this.renderTakviyeView(container);
    } else {
      // 2. Durum: Genel Gelişim & Karne (Yıldızlar, Rozetler, Görüş Notları)
      this.renderGenelKarneView(container);
    }
  },

  // --- 1. TAKVİYE DERS PERFORMANSI GÖRÜNÜMÜ ---
  renderTakviyeView(container) {
    const classes = window.Store.getClasses();
    const dayName = this.getDayName(this.currentDate);

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in max-w-4xl mx-auto">
        <!-- 1. AKADEMİ ALT BAŞLIKLARI (Hap Butonlar) -->
        <div class="flex items-center gap-2 p-1.5 bg-slate-200/90 rounded-2xl max-w-md mx-auto shadow-inner">
          ${this.subCategories.map(sub => {
            const isActive = this.currentSubCategory === sub.id;
            return `
              <button type="button" onclick="window.AkademiModule.setSubCategory('${sub.id}')"
                class="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  isActive 
                    ? 'bg-white text-slate-900 shadow-md scale-102 ring-2 ring-emerald-500/30' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }">
                <span>${sub.icon}</span>
                <span>${sub.label}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- 2. Kontrol Kartı: Tarih, Gün Adı ve 5 TAKVİYE DERS BUTONU -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <!-- Tarih ve Gün Adı -->
          <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-slate-800 uppercase tracking-wide">
                  DEĞERLENDİRME TARİHİ & TAKVİYE DERSİ:
                </span>
                <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-200">
                  ${this.currentSubject}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <!-- Tarih Seçici -->
                <input type="date" value="${this.currentDate}" 
                  class="px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition shadow-2xs"
                  onchange="window.AkademiModule.setDate(this.value)">

                <!-- Gün Adı Rozeti -->
                <div class="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs">
                  <span>📅</span>
                  <span>${dayName}</span>
                </div>
              </div>
            </div>

            <!-- Bilgilendirme Rozeti -->
            <div class="text-right">
              <div class="text-xs font-black text-slate-700">100 Üzerinden Puanlama</div>
              <div class="text-[11px] text-slate-400">Yazdığınız anda anında kaydedilir</div>
            </div>
          </div>

          <!-- NAMAZ YOKLAMASI GİBİ 5 TAKVİYE DERSİ BUTONLARI -->
          <div>
            <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              DERS SEÇİNİZ (Puan girişi yapılacak takviye ders):
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
              ${this.subjects.map(subj => {
                const isSelected = this.currentSubject === subj.name;
                return `
                  <button type="button" onclick="window.AkademiModule.setSubject('${subj.name}')"
                    class="py-3 px-3 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 border ${
                      isSelected 
                        ? 'bg-gradient-to-b from-blue-600 to-indigo-700 text-white border-blue-700 shadow-md scale-102 ring-2 ring-blue-400' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }">
                    <span class="text-lg">${subj.icon}</span>
                    <span class="leading-tight text-center">${subj.name}</span>
                    ${isSelected ? '<span class="w-1.5 h-1.5 rounded-full bg-white mt-0.5"></span>' : ''}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Çoklu Sınıf Filtresi & Öğrenci Arama -->
          <div class="pt-3 border-t border-slate-100 space-y-3">
            <div>
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>SINIF FİLTRESİ (1'den Fazla Seçebilirsiniz):</span>
                ${this.selectedClasses.length > 0 ? `
                  <span class="text-blue-600 font-semibold cursor-pointer hover:underline" onclick="window.AkademiModule.toggleAllClasses()">
                    Filtreyi Temizle
                  </span>
                ` : ''}
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="window.AkademiModule.toggleAllClasses()"
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
                    <button type="button" onclick="window.AkademiModule.toggleClass('${c}')"
                      class="px-3 py-1.5 rounded-xl text-xs font-black transition border flex items-center gap-1.5 ${
                        isChecked 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }">
                      <span>${isChecked ? '✓' : '+'}</span>
                      <span>${c}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Öğrenci Arama -->
            <div>
              <div class="relative">
                <input type="text" placeholder="İsme göre öğrenci ara..." 
                  class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  oninput="window.AkademiModule.setSearchQuery(this.value)">
                <span class="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Öğrenci Listesi & 100 Üzerinden Not Giriş Alanları -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black text-slate-800">
                ${this.currentSubject} Dersi Performans Listesi
              </span>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black">
                100 Üzerinden
              </span>
            </div>
            <div class="text-[11px] text-slate-500 font-medium">
              Notu yazıp başka bir yere tıklamanız veya yazmanız yeterlidir.
            </div>
          </div>

          <div id="takviye-student-list" class="divide-y divide-slate-100">
            <!-- renderStudentRows ile doldurulacaktır -->
          </div>
        </div>
      </div>
    `;

    this.renderStudentRows();
  },

  renderStudentRows() {
    const listEl = document.getElementById('takviye-student-list');
    if (!listEl) return;

    const students = this.getFilteredStudents();
    const scores = window.Store.getAcademicScoresByDateAndSubject(this.currentDate, this.currentSubject);
    const scoreMap = {};
    scores.forEach(s => {
      scoreMap[s.studentId] = s.score;
    });

    if (students.length === 0) {
      listEl.innerHTML = `
        <div class="p-10 text-center text-slate-400 text-xs">
          Seçilen kriterlere uygun öğrenci bulunamadı.
        </div>
      `;
      return;
    }

    listEl.innerHTML = students.map((student, idx) => {
      const currentScore = scoreMap[student.id] !== undefined ? scoreMap[student.id] : '';
      return `
        <div class="p-3.5 sm:p-4 hover:bg-slate-50/60 transition flex items-center justify-between gap-3">
          <!-- Öğrenci Bilgisi -->
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
              ${idx + 1}
            </div>
            <div class="truncate">
              <div class="font-black text-slate-900 text-xs sm:text-sm truncate">
                ${student.firstName} ${student.lastName}
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[11px] text-slate-500 font-medium">${student.className || '-'}</span>
                <span class="text-slate-300">•</span>
                <span class="text-[10px] text-slate-400 font-mono">No: ${student.studentNo}</span>
              </div>
            </div>
          </div>

          <!-- 100 Üzerinden Değerlendirme Giriş Alanı & Rozet -->
          <div class="flex items-center gap-2.5 shrink-0">
            <!-- Otomatik Kayıt Durum İndikatörü -->
            <div id="save-status-${student.id}" class="w-20 text-right"></div>

            <!-- Puan Seviye Rozeti (Pekiyi, İyi, vb.) -->
            <div id="score-badge-${student.id}">
              ${this.getScoreBadge(currentScore)}
            </div>

            <!-- 100 Üzerinden Not Giriş Kutusu -->
            <div class="relative flex items-center">
              <input type="number" min="0" max="100" placeholder="Not (0-100)"
                value="${currentScore}"
                class="w-24 px-3 py-2 text-center text-sm font-black bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-2xs"
                oninput="window.AkademiModule.handleScoreInput('${student.id}', this.value)"
                onblur="window.AkademiModule.saveScoreImmediate('${student.id}', this.value)">
              <span class="absolute right-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">/100</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // --- 2. GENEL GELİŞİM & KARNE GÖRÜNÜMÜ ---
  renderGenelKarneView(container) {
    const students = window.Store.getStudents();
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in max-w-5xl mx-auto">
        <!-- 1. AKADEMİ ALT BAŞLIKLARI (Hap Butonlar) -->
        <div class="flex items-center gap-2 p-1.5 bg-slate-200/90 rounded-2xl max-w-md mx-auto shadow-inner">
          ${this.subCategories.map(sub => {
            const isActive = this.currentSubCategory === sub.id;
            return `
              <button type="button" onclick="window.AkademiModule.setSubCategory('${sub.id}')"
                class="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  isActive 
                    ? 'bg-white text-slate-900 shadow-md scale-102 ring-2 ring-emerald-500/30' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }">
                <span>${sub.icon}</span>
                <span>${sub.label}</span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Sol Panel: Yeni Performans Girişi Formu -->
          <div class="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6">
            <div class="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-lg">
                ⭐
              </div>
              <div>
                <h3 class="font-black text-slate-900 text-sm sm:text-base">Genel Gelişim & Karne Girişi</h3>
                <p class="text-[11px] text-slate-400">Yıldız kriterleri, rozetler ve öğretmen görüşleri</p>
              </div>
            </div>

            <form id="perf-form" onsubmit="window.AkademiModule.savePerformanceEntry(event)" class="space-y-4">
              <div>
                <label class="block text-[11px] font-black text-slate-600 mb-1">ÖĞRENCİ SEÇİNİZ *</label>
                <select id="perf-student-id" required
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                  <option value="">-- Öğrenci Seçin --</option>
                  ${students.map(s => `<option value="${s.id}">${s.studentNo} - ${s.firstName} ${s.lastName} (${s.className})</option>`).join('')}
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-black text-slate-600 mb-1">DERS / ALAN *</label>
                  <select id="perf-subject" required
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    <option value="Kuran-ı Kerim & Ezber">Kuran-ı Kerim & Ezber</option>
                    <option value="Tecvid & Mahreç">Tecvid & Mahreç</option>
                    <option value="Ahlak & İlmihal">Ahlak & İlmihal</option>
                    <option value="Siyer-i Nebi">Siyer-i Nebi</option>
                    <option value="Ders & Etüt Takibi">Ders & Etüt Takibi</option>
                    <option value="Genel Düzen & Ahlak">Genel Düzen & Ahlak</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-black text-slate-600 mb-1">TARİH</label>
                  <input type="date" id="perf-date" value="${today}"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                </div>
              </div>

              <!-- Kriterler -->
              <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div class="text-[11px] font-black text-slate-700 uppercase tracking-wide">Kriter Puanlaması (1 - 5)</div>
                
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-600 font-bold">Ders Katılımı:</span>
                  <select id="perf-part" class="px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 text-xs">
                    <option value="5">⭐⭐⭐⭐⭐ (5 - Pekiyi)</option>
                    <option value="4">⭐⭐⭐⭐ (4 - İyi)</option>
                    <option value="3">⭐⭐⭐ (3 - Orta)</option>
                    <option value="2">⭐⭐ (2 - Geçer)</option>
                    <option value="1">⭐ (1 - Zayıf)</option>
                  </select>
                </div>

                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-600 font-bold">Ödev & Ezber:</span>
                  <select id="perf-hw" class="px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 text-xs">
                    <option value="5">⭐⭐⭐⭐⭐ (5 - Tam)</option>
                    <option value="4">⭐⭐⭐⭐ (4 - İyi)</option>
                    <option value="3">⭐⭐⭐ (3 - Kısmi)</option>
                    <option value="2">⭐⭐ (2 - Eksik)</option>
                    <option value="1">⭐ (1 - Yapılmadı)</option>
                  </select>
                </div>

                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-600 font-bold">Namaz & Uyum:</span>
                  <select id="perf-beh" class="px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 text-xs">
                    <option value="5">⭐⭐⭐⭐⭐ (5 - Mükemmel)</option>
                    <option value="4">⭐⭐⭐⭐ (4 - İyi)</option>
                    <option value="3">⭐⭐⭐ (3 - Uyarılı)</option>
                    <option value="2">⭐⭐ (2 - Gelişmeli)</option>
                    <option value="1">⭐ (1 - Kurallara Uymadı)</option>
                  </select>
                </div>

                <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                  <span class="text-slate-800 font-black">Genel Kanaat Puanı (100):</span>
                  <input type="number" id="perf-score" min="0" max="100" value="95" 
                    class="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg font-black text-center text-slate-800 text-xs">
                </div>
              </div>

              <!-- Rozetler -->
              <div>
                <label class="block text-[11px] font-black text-slate-600 mb-1.5">ÖĞRENCİYE BAŞARI ROZETİ EKLE</label>
                <div id="perf-badges-container" class="flex flex-wrap gap-1.5">
                  <!-- renderBadgesPicker ile doldurulacak -->
                </div>
              </div>

              <!-- Öğretmen Notu -->
              <div>
                <label class="block text-[11px] font-black text-slate-600 mb-1">ÖĞRETMEN GÖRÜŞÜ (Velinin Göreceği Not)</label>
                <textarea id="perf-note" rows="2" placeholder="Öğrencinin haftalık/aylık gayreti, tebrik veya tavsiyeler..." 
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"></textarea>
              </div>

              <!-- Değerlendiren Hoca -->
              <div>
                <label class="block text-[11px] font-black text-slate-600 mb-1">DEĞERLENDİREN EĞİTMEN</label>
                <input type="text" id="perf-teacher" placeholder="Örn: Ders Hocası" 
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
              </div>

              <button type="submit" 
                class="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow transition flex items-center justify-center gap-2">
                <span>✓ Değerlendirmeyi Kaydet</span>
              </button>
            </form>
          </div>

          <!-- Sağ Panel: Kayıtlı Değerlendirmeler -->
          <div class="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 class="font-black text-slate-900 text-sm sm:text-base">Kayıtlı Gelişim Değerlendirmeleri</h3>
                <p class="text-[11px] text-slate-400">Velilerin görüntüleyebildiği karne notları</p>
              </div>
              <div>
                <input type="text" placeholder="Öğrenci veya ders ara..." 
                  class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 focus:ring-1 focus:ring-amber-500 focus:outline-none w-44"
                  oninput="window.AkademiModule.searchQuery = this.value.toLowerCase().trim(); window.AkademiModule.renderHistory();">
              </div>
            </div>

            <div id="perf-history-list" class="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              <!-- renderHistory ile doldurulacak -->
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderBadgesPicker();
    this.renderHistory();
  },

  toggleBadge(badgeName) {
    if (this.selectedBadges.has(badgeName)) {
      this.selectedBadges.delete(badgeName);
    } else {
      this.selectedBadges.add(badgeName);
    }
    this.renderBadgesPicker();
  },

  renderBadgesPicker() {
    const container = document.getElementById('perf-badges-container');
    if (!container) return;

    container.innerHTML = this.AVAILABLE_BADGES.map(b => {
      const isSelected = this.selectedBadges.has(b.name);
      return `
        <button type="button" 
          onclick="window.AkademiModule.toggleBadge('${b.name}')"
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition-all ${
            isSelected 
              ? `${b.color} ring-2 ring-amber-500 scale-105 shadow-sm` 
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }">
          <span>${b.icon}</span>
          <span>${b.name}</span>
          ${isSelected ? '<span class="text-amber-700 font-black">✓</span>' : ''}
        </button>
      `;
    }).join('');
  },

  savePerformanceEntry(event) {
    if (event) event.preventDefault();

    const studentSelect = document.getElementById('perf-student-id');
    const subjectInput = document.getElementById('perf-subject');
    const dateInput = document.getElementById('perf-date');
    const scoreInput = document.getElementById('perf-score');
    const participation = document.getElementById('perf-part').value;
    const homework = document.getElementById('perf-hw').value;
    const behavior = document.getElementById('perf-beh').value;
    const note = document.getElementById('perf-note').value;
    const teacherName = document.getElementById('perf-teacher').value || 'Ders Öğretmeni';

    if (!studentSelect || !studentSelect.value) {
      window.App.showToast('Lütfen değerlendirilecek bir öğrenci seçiniz.', 'warning');
      return;
    }

    const newRecord = {
      studentId: studentSelect.value,
      date: dateInput.value || new Date().toISOString().split('T')[0],
      subject: subjectInput.value.trim() || 'Genel Değerlendirme',
      criteria: {
        participation: parseInt(participation) || 5,
        homework: parseInt(homework) || 5,
        behavior: parseInt(behavior) || 5,
        score: parseInt(scoreInput.value) || 100
      },
      badges: Array.from(this.selectedBadges),
      teacherNote: note.trim(),
      teacherName: teacherName.trim()
    };

    window.Store.addPerformance(newRecord);
    window.App.showToast('Öğrenci performans değerlendirmesi kaydedildi!', 'success');

    this.selectedBadges.clear();
    document.getElementById('perf-form').reset();
    document.getElementById('perf-date').value = new Date().toISOString().split('T')[0];
    this.renderBadgesPicker();
    this.renderHistory();
  },

  deleteEntry(id) {
    if (confirm('Bu değerlendirme kaydını silmek istediğinizden emin misiniz?')) {
      window.Store.deletePerformance(id);
      window.App.showToast('Değerlendirme kaydı silindi.', 'info');
      this.renderHistory();
    }
  },

  renderHistory() {
    const container = document.getElementById('perf-history-list');
    if (!container) return;

    let perfs = window.Store.getPerformances();

    if (this.searchQuery) {
      perfs = perfs.filter(p => {
        const student = window.Store.getStudentById(p.studentId);
        const name = student ? `${student.firstName} ${student.lastName}`.toLowerCase() : '';
        return name.includes(this.searchQuery) || (p.subject && p.subject.toLowerCase().includes(this.searchQuery));
      });
    }

    if (perfs.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 text-xs">
          Henüz kayıtlı genel karne değerlendirmesi bulunmuyor.
        </div>
      `;
      return;
    }

    container.innerHTML = perfs.map(p => {
      const student = window.Store.getStudentById(p.studentId);
      const studentName = student ? `${student.firstName} ${student.lastName}` : 'Silinmiş Öğrenci';
      const studentClass = student ? student.className : '-';
      const studentNo = student ? student.studentNo : '-';

      return `
        <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition shadow-2xs">
          <div class="flex items-start justify-between gap-3 mb-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-black text-slate-900 text-xs sm:text-sm">${studentName}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">No: ${studentNo} (${studentClass})</span>
              </div>
              <div class="text-xs text-amber-800 font-bold mt-0.5">${p.subject}</div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-black text-xs border border-amber-200">
                ${p.criteria?.score || 0} Puan
              </span>
              <button onclick="window.AkademiModule.deleteEntry('${p.id}')" 
                class="text-slate-400 hover:text-rose-600 p-1 transition" title="Sil">
                ✕
              </button>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 text-[10px] bg-white p-2 rounded-xl border border-slate-100 text-slate-600 mb-2">
            <div>Katılım: <span class="font-bold text-amber-500">${'★'.repeat(p.criteria?.participation || 5)}</span></div>
            <div>Ödev/Ezber: <span class="font-bold text-amber-500">${'★'.repeat(p.criteria?.homework || 5)}</span></div>
            <div>Uyum/Namaz: <span class="font-bold text-amber-500">${'★'.repeat(p.criteria?.behavior || 5)}</span></div>
          </div>

          ${p.badges && p.badges.length > 0 ? `
            <div class="flex flex-wrap gap-1 mb-2">
              ${p.badges.map(b => `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">${b}</span>`).join('')}
            </div>
          ` : ''}

          ${p.teacherNote ? `
            <div class="text-xs text-slate-700 bg-amber-50/60 border-l-2 border-amber-500 p-2 rounded-r mb-2">
              <span class="font-bold text-amber-950">Öğretmen Görüşü:</span> ${p.teacherNote}
            </div>
          ` : ''}

          <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            <span>Tarih: ${p.date}</span>
            <span>Eğitmen: <strong class="text-slate-600">${p.teacherName || 'Öğretmen'}</strong></span>
          </div>
        </div>
      `;
    }).join('');
  }
};

// Geriye dönük tam uyumluluk referansı
window.PerformanceModule = window.AkademiModule;
