/**
 * performance.js - Akademi & Performans Takip Modülü
 * - Alt Başlık 1: Takviye Ders Performansı (Çizelge / Matris Görünümü: Solda Öğrenciler, Üstte 5 Ders, Sağda Öğrenci Ortalaması, Altta Sınıf Ders Ortalamaları)
 *   Renk Kuralı: 85 altı kırmızı, 85'ten 100'e doğru yeşile geçiş, 100 tam yeşil.
 * - Alt Başlık 2: Genel Gelişim & Karne (Kriter yıldızları, rozetler ve öğretmen görüşleri)
 */

window.AkademiModule = {
  currentSubCategory: 'takviye', // 'takviye' | 'genel'
  currentDate: new Date().toISOString().split('T')[0],
  selectedClasses: [],           // Boş ise Tüm Sınıflar
  searchQuery: '',
  saveTimers: {},
  selectedBadges: new Set(),

  subCategories: [
    { id: 'takviye', label: 'Takviye Ders Performansı', icon: '📚', short: 'Takviye Çizelgesi' },
    { id: 'genel', label: 'Genel Gelişim & Karne', icon: '⭐', short: 'Genel Karne' }
  ],

  // 5 Ana Takviye Dersi (Tabloda soldan sağa sütunlar)
  subjects: [
    { key: 'Türkçe', name: 'Türkçe', icon: '🇹🇷', short: 'TR' },
    { key: 'Matematik', name: 'Matematik', icon: '📐', short: 'MAT' },
    { key: 'Fen Bilimleri', name: 'Fen Bilimleri', icon: '🔬', short: 'FEN' },
    { key: 'Sosyal Bilgiler', name: 'Sosyal Bilgiler', icon: '🌍', short: 'SOS' },
    { key: 'İngilizce', name: 'İngilizce', icon: '🇬🇧', short: 'İNG' }
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

  toggleClass(className) {
    if (this.selectedClasses.includes(className)) {
      this.selectedClasses = this.selectedClasses.filter(c => c !== className);
    } else {
      this.selectedClasses.push(className);
    }
    this.renderMatrixTableBody();
  },

  toggleAllClasses() {
    this.selectedClasses = [];
    this.renderMatrixTableBody();
  },

  setSearchQuery(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.renderMatrixTableBody();
  },

  // --- ÖZEL RENK KURALI (85 Altı Kırmızı, 85-100 Arası Yeşile Dönüşüm, 100 Tam Yeşil) ---
  getColorStyle(score) {
    if (score === null || score === undefined || score === '' || isNaN(score)) {
      return {
        bg: '#ffffff',
        text: '#94a3b8',
        border: '#cbd5e1',
        badge: 'bg-slate-100 text-slate-400 border-slate-200 font-bold',
        label: '-'
      };
    }
    const val = Number(score);
    if (val < 85) {
      // 85 altı: Kırmızı
      return {
        bg: '#fee2e2',       // açık kırmızı arka plan
        text: '#b91c1c',     // koyu kırmızı yazı
        border: '#f87171',   // kırmızı kenarlık
        badge: 'bg-rose-100 text-rose-800 border-rose-300 font-black',
        label: '85 Altı'
      };
    } else if (val >= 100) {
      // 100 tam: Canlı Yeşil
      return {
        bg: '#10b981',       // zümrüt yeşili
        text: '#ffffff',     // beyaz yazı
        border: '#059669',   // koyu yeşil kenarlık
        badge: 'bg-emerald-600 text-white border-emerald-700 font-black shadow-xs',
        label: '100'
      };
    } else if (val >= 95) {
      // 95-99: Zümrüt Yeşili
      return {
        bg: '#d1fae5',
        text: '#065f46',
        border: '#6ee7b7',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black',
        label: '95+'
      };
    } else if (val >= 90) {
      // 90-94: Fıstık Yeşili
      return {
        bg: '#ecfccb',
        text: '#3f6212',
        border: '#bef264',
        badge: 'bg-lime-100 text-lime-800 border-lime-300 font-black',
        label: '90+'
      };
    } else {
      // 85-89: Sarı/Amberden yeşile geçiş
      return {
        bg: '#fef3c7',
        text: '#92400e',
        border: '#fcd34d',
        badge: 'bg-amber-100 text-amber-800 border-amber-300 font-black',
        label: '85+'
      };
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

    this.renderTakviyeMatrixView(container);
  },

  // --- TAKVİYE DERS PERFORMANSI (ÇİZELGE / MATRİS TABLO GÖRÜNÜMÜ) ---
  renderTakviyeMatrixView(container) {
    const classes = window.Store.getClasses();
    const dayName = this.getDayName(this.currentDate);

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in max-w-7xl mx-auto">
        <!-- Kontrol Kartı: Tarih, Gün Adı, Çoklu Sınıf Filtresi & Renk Kılavuzu -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <!-- Tarih ve Gün Adı -->
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="text-xs font-black text-slate-800 uppercase tracking-wide">
                DEĞERLENDİRME TARİHİ:
              </span>
              <input type="date" value="${this.currentDate}" 
                class="px-3 py-1.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition shadow-2xs"
                onchange="window.AkademiModule.setDate(this.value)">

              <div class="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs">
                <span>📅</span>
                <span>${dayName}</span>
              </div>
            </div>

            <!-- Otomatik Kayıt Durumu & Bilgi -->
            <div class="flex items-center gap-3">
              <div id="matrix-save-indicator" class="h-6 flex items-center"></div>
              <div class="text-right hidden sm:block">
                <div class="text-[11px] font-black text-slate-700">Canlı Not Çizelgesi</div>
                <div class="text-[10px] text-slate-400">Yazdığınız anda anında kaydedilir & ortalamalar güncellenir</div>
              </div>
            </div>
          </div>

          <!-- Renk Skalası Kılavuzu (Legend) -->
          <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <span class="font-black text-slate-700 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
              <span>🎨</span> Renk Kuralı:
            </span>
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-black text-[11px]">
                &lt; 85 : Kırmızı
              </span>
              <span class="text-slate-300 font-bold">→</span>
              <span class="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px]">
                85 - 89 : Sarı/Geçiş
              </span>
              <span class="text-slate-300 font-bold">→</span>
              <span class="px-2 py-0.5 rounded-lg bg-lime-100 text-lime-800 border border-lime-300 font-bold text-[11px]">
                90 - 94 : Fıstık Yeşili
              </span>
              <span class="text-slate-300 font-bold">→</span>
              <span class="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px]">
                95 - 99 : Zümrüt Yeşili
              </span>
              <span class="text-slate-300 font-bold">→</span>
              <span class="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white border border-emerald-700 font-black text-[11px] shadow-2xs">
                100 : Canlı Yeşil
              </span>
            </div>
          </div>

          <!-- Çoklu Sınıf Filtresi & Öğrenci Arama -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[11px] font-black text-slate-500 uppercase mr-1">SINIF:</span>
              <button type="button" onclick="window.AkademiModule.toggleAllClasses()"
                class="px-3 py-1 rounded-xl text-xs font-black transition ${
                  this.selectedClasses.length === 0 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }">
                Tümü
              </button>
              ${classes.map(c => {
                const isChecked = this.selectedClasses.includes(c);
                return `
                  <button type="button" onclick="window.AkademiModule.toggleClass('${c}')"
                    class="px-2.5 py-1 rounded-xl text-xs font-black transition border flex items-center gap-1 ${
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

            <!-- Arama -->
            <div class="w-full sm:w-60 relative">
              <input type="text" placeholder="İsme göre öğrenci ara..." 
                class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                oninput="window.AkademiModule.setSearchQuery(this.value)">
              <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            </div>
          </div>
        </div>

        <!-- 3. MATRİS TABLO: SOLDA ÖĞRENCİLER, ÜSTTE 5 DERS, SAĞDA ÖĞRENCİ ORTALAMASI, ALTTA DERS ORTALAMALARI -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[700px]">
              <!-- Üst Başlıklar (Soldan Sağa: Öğrenci, 5 Ders, Öğrenci Ortalaması) -->
              <thead>
                <tr class="bg-slate-900 text-white text-xs border-b border-slate-800">
                  <th class="p-3.5 sm:p-4 font-black tracking-wide w-48 sm:w-56 sticky left-0 bg-slate-900 z-10 shadow-r">
                    ÖĞRENCİ BİLGİSİ
                  </th>
                  ${this.subjects.map(s => `
                    <th class="p-3 text-center font-black tracking-wide w-24 sm:w-28 border-l border-slate-800">
                      <div class="flex items-center justify-center gap-1">
                        <span>${s.icon}</span>
                        <span>${s.name}</span>
                      </div>
                      <div class="text-[10px] text-slate-400 font-normal">0 - 100</div>
                    </th>
                  `).join('')}
                  <th class="p-3.5 sm:p-4 text-center font-black tracking-wide w-32 border-l border-slate-800 bg-slate-950 text-amber-300">
                    <div>ÖĞRENCİ ORT.</div>
                    <div class="text-[10px] text-slate-400 font-normal">Dersler Ortalaması</div>
                  </th>
                </tr>
              </thead>

              <!-- Tablo Gövdesi: Her Satırda Bir Öğrenci -->
              <tbody id="takviye-matrix-tbody" class="divide-y divide-slate-100 text-xs">
                <!-- renderMatrixTableBody ile doldurulacak -->
              </tbody>

              <!-- En Alt Satır: DERS SINIF ORTALAMALARI VE GENEL ORTALAMA -->
              <tfoot class="bg-slate-100 text-slate-900 font-black text-xs border-t-2 border-slate-300">
                <tr>
                  <td class="p-3.5 sm:p-4 font-black sticky left-0 bg-slate-100 z-10 shadow-r flex items-center gap-2">
                    <span class="text-base">📈</span>
                    <div>
                      <div>DERS SINIF ORTALAMASI</div>
                      <div class="text-[10px] text-slate-500 font-normal">Seçilen sınıfların ders puan ortalamaları</div>
                    </div>
                  </td>
                  ${this.subjects.map(s => `
                    <td class="p-3 text-center border-l border-slate-200">
                      <div id="col-avg-${s.key}">
                        <span class="text-slate-400 font-bold">-</span>
                      </div>
                    </td>
                  `).join('')}
                  <td class="p-3.5 sm:p-4 text-center border-l border-slate-200 bg-amber-50/70 text-slate-900">
                    <div class="text-[10px] text-slate-500 font-bold mb-0.5 uppercase">GENEL ORTALAMA</div>
                    <div id="overall-avg">
                      <span class="text-slate-400 font-bold">-</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;

    this.renderMatrixTableBody();
  },

  renderMatrixTableBody() {
    const tbody = document.getElementById('takviye-matrix-tbody');
    if (!tbody) return;

    const students = this.getFilteredStudents();
    const scores = window.Store.getAcademicScores();
    // Hizli erisim icin map: { `${studentId}_${subject}`: score }
    const scoreMap = {};
    scores.forEach(s => {
      if (s.date === this.currentDate) {
        scoreMap[`${s.studentId}_${s.subject}`] = s.score;
      }
    });

    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${this.subjects.length + 2}" class="p-12 text-center text-slate-400 text-xs">
            Seçilen kriterlere uygun öğrenci bulunamadı.
          </td>
        </tr>
      `;
      // Ortalamaları sıfırla
      this.subjects.forEach(s => {
        const el = document.getElementById(`col-avg-${s.key}`);
        if (el) el.innerHTML = `<span class="text-slate-400 font-bold">-</span>`;
      });
      const overall = document.getElementById('overall-avg');
      if (overall) overall.innerHTML = `<span class="text-slate-400 font-bold">-</span>`;
      return;
    }

    tbody.innerHTML = students.map((st, idx) => {
      // Öğrencinin girilmiş ders notlarının ortalamasını hesapla
      const studentScores = [];
      this.subjects.forEach(subj => {
        const val = scoreMap[`${st.id}_${subj.name}`];
        if (val !== undefined && val !== null && !isNaN(val)) {
          studentScores.push(Number(val));
        }
      });

      const rowAvg = studentScores.length > 0 
        ? Math.round((studentScores.reduce((a, b) => a + b, 0) / studentScores.length) * 10) / 10 
        : null;

      const avgStyle = this.getColorStyle(rowAvg);

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <!-- Soldaki Öğrenci Sütunu (Sticky Left) -->
          <td class="p-3 sm:p-3.5 sticky left-0 bg-white hover:bg-slate-50 z-10 shadow-r">
            <div class="flex items-center gap-2.5">
              <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-[10px] flex items-center justify-center shrink-0">
                ${idx + 1}
              </span>
              <div class="truncate">
                <div class="font-black text-slate-900 text-xs sm:text-sm truncate">
                  ${st.firstName} ${st.lastName}
                </div>
                <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                  <span class="font-bold text-slate-500">${st.className || '-'}</span>
                  <span>•</span>
                  <span class="font-mono">No: ${st.studentNo}</span>
                </div>
              </div>
            </div>
          </td>

          <!-- 5 Takviye Dersi Giriş Hücreleri -->
          ${this.subjects.map(subj => {
            const rawScore = scoreMap[`${st.id}_${subj.name}`];
            const currentScore = (rawScore !== undefined && rawScore !== null) ? rawScore : '';
            const color = this.getColorStyle(currentScore);

            return `
              <td class="p-2 text-center border-l border-slate-100">
                <input type="number" min="0" max="100" 
                  id="cell-${st.id}-${subj.key}"
                  placeholder="-"
                  value="${currentScore}"
                  style="background-color: ${color.bg}; color: ${color.text}; border-color: ${color.border};"
                  class="w-18 sm:w-20 text-center py-2 px-1 text-sm font-black rounded-xl border-2 transition-all shadow-2xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  oninput="window.AkademiModule.handleMatrixInput('${st.id}', '${subj.key}', this.value)"
                  onblur="window.AkademiModule.handleMatrixBlur('${st.id}', '${subj.key}', this.value)">
              </td>
            `;
          }).join('')}

          <!-- En Sağdaki Öğrenci Ortalaması Rozeti -->
          <td class="p-3 text-center border-l border-slate-100 bg-slate-50/50">
            <div id="row-avg-${st.id}">
              ${rowAvg === null ? `
                <span class="text-slate-300 font-bold text-xs">-</span>
              ` : `
                <span class="px-2.5 py-1 rounded-xl text-xs font-black border transition-all inline-block shadow-2xs ${avgStyle.badge}"
                  style="background-color: ${avgStyle.bg}; color: ${avgStyle.text}; border-color: ${avgStyle.border};">
                  ${rowAvg.toFixed(1)}
                </span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Alt satırdaki ders sınıf ortalamalarını ve genel ortalamayı hesapla
    this.recalculateAllColumnAverages(students);
  },

  // --- HÜCREYE NOT YAZILDIĞINDA ANINDA CANLI HESAPLAMA & KAYIT ---
  handleMatrixInput(studentId, subjectKey, value) {
    const cleanVal = value.trim();
    const num = (cleanVal === '' || isNaN(cleanVal)) ? null : Math.min(100, Math.max(0, parseInt(cleanVal, 10)));

    // 1. Hücrenin renk ve stilini anında güncelle (85 altı kırmızı, 85-100 yeşile geçiş, 100 tam yeşil)
    const cell = document.getElementById(`cell-${studentId}-${subjectKey}`);
    const colorStyle = this.getColorStyle(num);
    if (cell) {
      cell.style.backgroundColor = colorStyle.bg;
      cell.style.color = colorStyle.text;
      cell.style.borderColor = colorStyle.border;
    }

    // 2. Öğrencinin satır ortalamasını anında güncelle
    this.updateStudentRowAverage(studentId);

    // 3. İlgili dersin sınıf ortalamasını anında güncelle
    this.updateSubjectColumnAverage(subjectKey);

    // 4. Genel sınıf ortalamasını anında güncelle
    this.updateOverallAverage();

    // 5. Veritabanına Anında Otomatik Kayıt
    const key = `${studentId}_${subjectKey}`;
    if (this.saveTimers[key]) clearTimeout(this.saveTimers[key]);

    const indicator = document.getElementById('matrix-save-indicator');
    if (indicator) {
      indicator.innerHTML = `<span class="text-amber-500 font-bold text-xs animate-pulse">💾 Kaydediliyor...</span>`;
    }

    this.saveTimers[key] = setTimeout(() => {
      window.Store.saveSingleAcademicScore(
        studentId,
        this.currentDate,
        subjectKey,
        num
      );
      if (indicator) {
        indicator.innerHTML = `<span class="text-emerald-600 font-black text-xs">✓ Otomatik Kaydedildi</span>`;
        setTimeout(() => {
          if (indicator) indicator.innerHTML = '';
        }, 1800);
      }
    }, 350);
  },

  handleMatrixBlur(studentId, subjectKey, value) {
    const cleanVal = value.trim();
    const num = (cleanVal === '' || isNaN(cleanVal)) ? null : Math.min(100, Math.max(0, parseInt(cleanVal, 10)));
    window.Store.saveSingleAcademicScore(
      studentId,
      this.currentDate,
      subjectKey,
      num
    );
    const cell = document.getElementById(`cell-${studentId}-${subjectKey}`);
    if (cell && num !== null) {
      cell.value = num;
    }
  },

  // --- CANLI ORTALAMA HESAPLAMA METODLARI ---
  calculateStudentAverage(studentId) {
    const scores = [];
    this.subjects.forEach(subj => {
      const inputEl = document.getElementById(`cell-${studentId}-${subj.key}`);
      if (inputEl && inputEl.value !== '') {
        const v = parseFloat(inputEl.value);
        if (!isNaN(v)) scores.push(v);
      }
    });
    if (scores.length === 0) return null;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  },

  updateStudentRowAverage(studentId) {
    const avg = this.calculateStudentAverage(studentId);
    const container = document.getElementById(`row-avg-${studentId}`);
    if (!container) return;

    if (avg === null) {
      container.innerHTML = `<span class="text-slate-300 font-bold text-xs">-</span>`;
      return;
    }

    const rounded = Math.round(avg * 10) / 10;
    const st = this.getColorStyle(rounded);
    container.innerHTML = `
      <span class="px-2.5 py-1 rounded-xl text-xs font-black border transition-all inline-block shadow-2xs ${st.badge}"
        style="background-color: ${st.bg}; color: ${st.text}; border-color: ${st.border};">
        ${rounded.toFixed(1)}
      </span>
    `;
  },

  calculateSubjectAverage(subjectKey, students) {
    const scores = [];
    students.forEach(st => {
      const inputEl = document.getElementById(`cell-${st.id}-${subjectKey}`);
      if (inputEl && inputEl.value !== '') {
        const v = parseFloat(inputEl.value);
        if (!isNaN(v)) scores.push(v);
      }
    });
    if (scores.length === 0) return null;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  },

  updateSubjectColumnAverage(subjectKey) {
    const students = this.getFilteredStudents();
    const avg = this.calculateSubjectAverage(subjectKey, students);
    const container = document.getElementById(`col-avg-${subjectKey}`);
    if (!container) return;

    if (avg === null) {
      container.innerHTML = `<span class="text-slate-400 font-bold text-xs">-</span>`;
      return;
    }

    const rounded = Math.round(avg * 10) / 10;
    const st = this.getColorStyle(rounded);
    container.innerHTML = `
      <div class="px-2.5 py-1 rounded-xl text-xs font-black border inline-block shadow-2xs ${st.badge}"
        style="background-color: ${st.bg}; color: ${st.text}; border-color: ${st.border};">
        ${rounded.toFixed(1)}
      </div>
    `;
  },

  updateOverallAverage() {
    const students = this.getFilteredStudents();
    const allScores = [];
    students.forEach(st => {
      this.subjects.forEach(subj => {
        const inputEl = document.getElementById(`cell-${st.id}-${subj.key}`);
        if (inputEl && inputEl.value !== '') {
          const v = parseFloat(inputEl.value);
          if (!isNaN(v)) allScores.push(v);
        }
      });
    });

    const container = document.getElementById('overall-avg');
    if (!container) return;

    if (allScores.length === 0) {
      container.innerHTML = `<span class="text-slate-400 font-bold text-xs">-</span>`;
      return;
    }

    const overall = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const rounded = Math.round(overall * 10) / 10;
    const st = this.getColorStyle(rounded);
    container.innerHTML = `
      <div class="px-3 py-1.5 rounded-xl text-sm font-black border inline-block shadow-sm ${st.badge}"
        style="background-color: ${st.bg}; color: ${st.text}; border-color: ${st.border};">
        ${rounded.toFixed(1)}
      </div>
    `;
  },

  recalculateAllColumnAverages(students) {
    this.subjects.forEach(s => {
      this.updateSubjectColumnAverage(s.key);
    });
    this.updateOverallAverage();
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
