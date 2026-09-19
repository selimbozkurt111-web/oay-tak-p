/**
 * test-results.js - Test Neticeleri & Etüt Soru Takip Modülü
 * - Başlık, Ders, Ünite, Konu ve Soru Sayısı bazlı test tanımlama
 * - Doğru (D) ve Yanlış (Y) girildikçe Boş (B), Net ve 100 Üzerinden Notun anında canlı hesaplanması
 * - MEB / LGS formatı (3 Yanlış 1 Doğru) ve serbest seçenekler
 * - Tek tıkla kaydetme, arşivleme, geçmiş testleri inceleme / silme
 * - Veliye tek tıkla resmi WhatsApp test karnesi gönderme
 * - Yazdırma ve A4 çıktı desteği
 */

window.TestResultsModule = {
  activeView: 'editor', // 'editor' | 'history'
  currentTestId: null,
  
  // Test Üst Bilgileri
  testMeta: {
    title: 'Haftalık Etüt Tarama Testi',
    subject: 'Matematik',
    unit: '1. Ünite: Çarpanlar ve Katlar',
    topic: 'EBOB - EKOK',
    date: new Date().toISOString().split('T')[0],
    totalQuestions: 20,
    wrongPenalty: 3 // 3: LGS (3Y 1D), 0: Yanlış götürmez, 4: YKS (4Y 1D)
  },

  // Öğrenci puanları geçici hafıza: { [studentId]: { correct: 0, wrong: 0, empty: 20, net: 0, score: 0, note: '' } }
  scores: {},

  // Filtreler
  selectedClass: 'ALL',
  searchQuery: '',

  SUBJECT_OPTIONS: [
    'Matematik',
    'Türkçe',
    'Fen Bilimleri',
    'Sosyal Bilgiler',
    'İngilizce',
    'Din Kültürü',
    'İnkılap Tarihi',
    'Arapça',
    'Genel Tarama Denemesi'
  ],

  init() {
    this.ensureStudentScores();
    this.render();
  },

  ensureStudentScores() {
    const students = window.Store.getStudents();
    const total = parseInt(this.testMeta.totalQuestions, 10) || 20;
    
    students.forEach(st => {
      if (!this.scores[st.id]) {
        this.scores[st.id] = {
          correct: 0,
          wrong: 0,
          empty: total,
          net: 0,
          score: 0,
          note: ''
        };
      }
    });
  },

  // --- Canlı Hesaplama Motoru ---
  calculateRow(studentId) {
    const row = this.scores[studentId] || { correct: 0, wrong: 0, empty: 0, net: 0, score: 0, note: '' };
    const total = Math.max(1, parseInt(this.testMeta.totalQuestions, 10) || 20);
    const penalty = parseFloat(this.testMeta.wrongPenalty) || 0;

    let c = parseInt(row.correct, 10);
    if (isNaN(c) || c < 0) c = 0;
    if (c > total) c = total;

    let w = parseInt(row.wrong, 10);
    if (isNaN(w) || w < 0) w = 0;
    if (c + w > total) {
      w = total - c;
    }

    const empty = Math.max(0, total - (c + w));

    // Net Hesaplama (LGS Standardı: D - Y / 3)
    let net = 0;
    if (penalty > 0) {
      net = c - (w / penalty);
    } else {
      net = c;
    }
    net = Math.max(0, Math.round(net * 100) / 100);

    // 100 Üzerinden Başarı Notu
    let score = Math.round((net / total) * 100);
    score = Math.max(0, Math.min(100, score));

    row.correct = c;
    row.wrong = w;
    row.empty = empty;
    row.net = net;
    row.score = score;
    this.scores[studentId] = row;

    return row;
  },

  // Input değiştikçe doğrudan DOM'u günceller (klavye odağı kaybolmaz)
  handleInputChange(studentId, field, rawValue) {
    const val = parseInt(rawValue, 10) || 0;
    if (!this.scores[studentId]) {
      this.calculateRow(studentId);
    }
    this.scores[studentId][field] = val;

    const updated = this.calculateRow(studentId);

    // DOM elemanlarını anında güncelle
    const emptyEl = document.getElementById(`empty-badge-${studentId}`);
    if (emptyEl) emptyEl.textContent = updated.empty;

    const netEl = document.getElementById(`net-badge-${studentId}`);
    if (netEl) netEl.textContent = updated.net.toFixed(2);

    const scoreEl = document.getElementById(`score-badge-${studentId}`);
    if (scoreEl) {
      scoreEl.textContent = updated.score;
      scoreEl.className = `px-3 py-1.5 rounded-xl font-black text-sm border shadow-xs transition-all ${this.getScoreBadgeClass(updated.score)}`;
    }

    const gradeEl = document.getElementById(`grade-label-${studentId}`);
    if (gradeEl) {
      gradeEl.textContent = this.getGradeLabel(updated.score);
    }

    // Inputların değerini clamp edilmiş haliyle düzelt (fazla sayı girilmesini engelle)
    const cInput = document.getElementById(`input-c-${studentId}`);
    if (cInput && parseInt(cInput.value, 10) !== updated.correct) {
      cInput.value = updated.correct;
    }
    const wInput = document.getElementById(`input-w-${studentId}`);
    if (wInput && parseInt(wInput.value, 10) !== updated.wrong) {
      wInput.value = updated.wrong;
    }

    this.updateSummaryCounters();
  },

  getScoreBadgeClass(score) {
    if (score >= 85) {
      return 'bg-emerald-600 text-white border-emerald-700';
    } else if (score >= 70) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (score >= 50) {
      return 'bg-amber-100 text-amber-900 border-amber-300';
    } else {
      return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  },

  getGradeLabel(score) {
    if (score >= 85) return 'Pekiyi 🌟';
    if (score >= 70) return 'İyi 👍';
    if (score >= 50) return 'Orta ⚖️';
    return 'Gayret Etmeli ⚠️';
  },

  updateSummaryCounters() {
    let totalNet = 0;
    let totalScore = 0;
    let count = 0;

    Object.keys(this.scores).forEach(stId => {
      const row = this.scores[stId];
      if (row && (row.correct > 0 || row.wrong > 0)) {
        totalNet += row.net;
        totalScore += row.score;
        count++;
      }
    });

    const avgNet = count > 0 ? (totalNet / count).toFixed(2) : '0.00';
    const avgScore = count > 0 ? Math.round(totalScore / count) : 0;

    const avgNetEl = document.getElementById('stat-avg-net');
    if (avgNetEl) avgNetEl.textContent = avgNet;

    const avgScoreEl = document.getElementById('stat-avg-score');
    if (avgScoreEl) avgScoreEl.textContent = avgScore;

    const evalCountEl = document.getElementById('stat-evaluated-count');
    if (evalCountEl) evalCountEl.textContent = count;
  },

  // Tüm öğrencilerin notunu soru sayısı değiştikçe yeniden hesapla
  recalculateAll() {
    Object.keys(this.scores).forEach(stId => {
      this.calculateRow(stId);
    });
    this.render();
  },

  // --- Görünüm Render Fonksiyonu ---
  render() {
    const container = document.getElementById('test-results-container');
    if (!container) return;

    if (this.activeView === 'history') {
      this.renderHistoryView(container);
    } else {
      this.renderEditorView(container);
    }
  },

  // 1. TEST GİRİŞ & DÜZENLEME EKRANI
  renderEditorView(container) {
    const classes = window.Store.getClasses();
    let students = window.Store.getStudents();

    if (this.selectedClass !== 'ALL') {
      students = students.filter(s => s.className === this.selectedClass);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      students = students.filter(s =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.studentNo.toString().includes(q)
      );
    }

    container.innerHTML = `
      <div class="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
        
        <!-- Üst Başlık ve Görünüm Geçiş Sekmeleri -->
        <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-200 no-print">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">📝</span>
              <h2 class="text-xl font-black text-slate-900">
                ${this.currentTestId ? 'Test Sonuçlarını Düzenle' : 'Yeni Test & Etüt Değerlendirme'}
              </h2>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Başlık, ders, ünite ve konu bilgilerini girin; talebelerin doğru ve yanlış sayılarına göre net ve 100 puanı otomatik hesaplansın.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" onclick="window.TestResultsModule.activeView='history'; window.TestResultsModule.render();"
              class="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition">
              <span>📚 Geçmiş Test Arşivi</span>
              <span class="bg-slate-300 text-slate-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                ${window.Store.getTestResults().length}
              </span>
            </button>

            <button type="button" onclick="window.TestResultsModule.resetForm();"
              class="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition">
              <span>🔄 Formu Temizle</span>
            </button>
          </div>
        </div>

        <!-- TEST BİLGİLERİ KARTI (Başlık, Ders, Ünite, Konu, Soru Sayısı) -->
        <div class="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-sm border-2 border-emerald-200/80 p-5 sm:p-6 space-y-4 no-print">
          <div class="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div class="flex items-center gap-2 text-emerald-950 font-black text-sm">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Test ve Etüt Detayları</span>
            </div>
            <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              ⚡ Canlı Hesaplama Aktif
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <!-- 1. Test Başlığı -->
            <div>
              <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                TEST / ETÜT BAŞLIĞI *
              </label>
              <input type="text" id="tm-title" value="${this.escapeHtml(this.testMeta.title)}"
                placeholder="Örn: Haftalık Etüt Testi 1"
                onchange="window.TestResultsModule.testMeta.title = this.value"
                class="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none transition">
            </div>

            <!-- 2. Ders Seçimi -->
            <div>
              <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                DERS ADI *
              </label>
              <div class="relative">
                <input type="text" id="tm-subject" list="subject-list" value="${this.escapeHtml(this.testMeta.subject)}"
                  placeholder="Ders seçin veya yazın"
                  onchange="window.TestResultsModule.testMeta.subject = this.value"
                  class="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none transition">
                <datalist id="subject-list">
                  ${this.SUBJECT_OPTIONS.map(opt => `<option value="${opt}"></option>`).join('')}
                </datalist>
              </div>
            </div>

            <!-- 3. Ünite Adı -->
            <div>
              <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                ÜNİTE ADI / NO
              </label>
              <input type="text" id="tm-unit" value="${this.escapeHtml(this.testMeta.unit)}"
                placeholder="Örn: 1. Ünite / Çarpanlar ve Katlar"
                onchange="window.TestResultsModule.testMeta.unit = this.value"
                class="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none transition">
            </div>

            <!-- 4. Konu Adı -->
            <div>
              <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                KONU BAŞLIĞI
              </label>
              <input type="text" id="tm-topic" value="${this.escapeHtml(this.testMeta.topic)}"
                placeholder="Örn: EBOB - EKOK"
                onchange="window.TestResultsModule.testMeta.topic = this.value"
                class="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none transition">
            </div>

            <!-- 5. Tarih -->
            <div>
              <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                TARİH
              </label>
              <input type="date" id="tm-date" value="${this.testMeta.date}"
                onchange="window.TestResultsModule.testMeta.date = this.value"
                class="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none transition">
            </div>

            <!-- 6. Toplam Soru Sayısı -->
            <div>
              <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                TOPLAM SORU SAYISI *
              </label>
              <input type="number" id="tm-total-questions" min="1" max="200" value="${this.testMeta.totalQuestions}"
                onchange="window.TestResultsModule.testMeta.totalQuestions = parseInt(this.value, 10) || 20; window.TestResultsModule.recalculateAll();"
                class="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none transition">
            </div>

            <!-- 7. Net Hesaplama Kuralı (Ceza Katsayısı) -->
            <div>
              <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                NET HESAPLAMA TÜRÜ
              </label>
              <select id="tm-penalty" 
                onchange="window.TestResultsModule.testMeta.wrongPenalty = parseFloat(this.value); window.TestResultsModule.recalculateAll();"
                class="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none transition">
                <option value="3" ${this.testMeta.wrongPenalty == 3 ? 'selected' : ''}>3 Yanlış 1 Doğruyu Götürür (MEB / LGS)</option>
                <option value="0" ${this.testMeta.wrongPenalty == 0 ? 'selected' : ''}>Yanlış Doğruyu Götürmez (Net = Doğru)</option>
                <option value="4" ${this.testMeta.wrongPenalty == 4 ? 'selected' : ''}>4 Yanlış 1 Doğruyu Götürür (YKS)</option>
              </select>
            </div>

            <!-- 8. Hızlı Kaydet Butonu -->
            <div class="flex items-end">
              <button type="button" onclick="window.TestResultsModule.saveCurrentTest();"
                class="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2">
                <span>💾 Sonuçları Kaydet</span>
              </button>
            </div>
          </div>
        </div>

        <!-- İSTATİSTİK ŞERİDİ (Canlı Sınıf Ortalaması) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold">
              👥
            </div>
            <div>
              <div class="text-[10px] text-slate-400 font-bold uppercase">Değerlendirilen</div>
              <div id="stat-evaluated-count" class="text-lg font-black text-slate-900">0</div>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">
              🎯
            </div>
            <div>
              <div class="text-[10px] text-slate-400 font-bold uppercase">Sınıf Net Ortalaması</div>
              <div id="stat-avg-net" class="text-lg font-black text-emerald-700">0.00</div>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg font-bold">
              ⭐
            </div>
            <div>
              <div class="text-[10px] text-slate-400 font-bold uppercase">Sınıf Puan Ortalaması</div>
              <div id="stat-avg-score" class="text-lg font-black text-purple-700">0 / 100</div>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-bold">
              📋
            </div>
            <div>
              <div class="text-[10px] text-slate-400 font-bold uppercase">Toplam Soru</div>
              <div class="text-lg font-black text-slate-900">${this.testMeta.totalQuestions} Soru</div>
            </div>
          </div>
        </div>

        <!-- ÖĞRENCİ LİSTESİ & PUAN GİRİŞ TABLOSU -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          <!-- Filtre ve Arama Çubuğu -->
          <div class="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-black text-slate-600 uppercase">SINIF:</span>
              <button type="button" onclick="window.TestResultsModule.filterClass('ALL')"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${this.selectedClass === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}">
                Tümü (${window.Store.getStudents().length})
              </button>
              ${classes.map(c => `
                <button type="button" onclick="window.TestResultsModule.filterClass('${c}')"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${this.selectedClass === c ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}">
                  ${c}
                </button>
              `).join('')}
            </div>

            <!-- Öğrenci Arama & Yazdır Butonu -->
            <div class="flex items-center gap-2">
              <input type="text" placeholder="Talebe ara..." value="${this.escapeHtml(this.searchQuery)}"
                oninput="window.TestResultsModule.searchQuery = this.value; window.TestResultsModule.render();"
                class="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500">
              
              <button type="button" onclick="window.print()"
                class="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>🖨️</span> Yazdır
              </button>
            </div>
          </div>

          <!-- Yazdırma Üst Başlığı (Yalnızca Çıktıda Görünür) -->
          <div class="hidden print:block p-6 text-center border-b border-slate-300">
            <h1 class="text-xl font-black text-slate-900">${window.Store.getSettings().institutionName || 'Ömer Avniyel Akademi'}</h1>
            <h2 class="text-base font-bold text-slate-700 mt-1">${this.testMeta.title} - Test Neticeleri</h2>
            <div class="text-xs text-slate-500 mt-1">
              Ders: ${this.testMeta.subject} | Ünite: ${this.testMeta.unit} | Konu: ${this.testMeta.topic} | Tarih: ${this.testMeta.date} | Soru: ${this.testMeta.totalQuestions}
            </div>
          </div>

          <!-- Tablo Alanı -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th class="py-3 px-4 w-12 text-center">No</th>
                  <th class="py-3 px-4">Talebe Adı Soyadı</th>
                  <th class="py-3 px-3 text-center">Sınıf</th>
                  <th class="py-3 px-3 text-center w-24">✅ Doğru (D)</th>
                  <th class="py-3 px-3 text-center w-24">❌ Yanlış (Y)</th>
                  <th class="py-3 px-3 text-center w-20">⚪ Boş (B)</th>
                  <th class="py-3 px-3 text-center w-28">🎯 Net</th>
                  <th class="py-3 px-4 text-center w-36">⭐ 100 Notu</th>
                  <th class="py-3 px-3 text-center w-28 no-print">Veliye Paylaş</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                ${students.length === 0 ? `
                  <tr>
                    <td colspan="9" class="py-12 text-center text-slate-400 font-bold">
                      Filtreye uygun öğrenci bulunamadı.
                    </td>
                  </tr>
                ` : students.map((st, idx) => {
                  const sc = this.scores[st.id] || this.calculateRow(st.id);
                  const badgeCls = this.getScoreBadgeClass(sc.score);
                  const gradeLabel = this.getGradeLabel(sc.score);

                  return `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                        ${st.studentNo || (idx + 1)}
                      </td>
                      <td class="py-3 px-4 font-bold text-slate-900">
                        <div class="flex items-center gap-2">
                          <span>${st.firstName} ${st.lastName}</span>
                        </div>
                      </td>
                      <td class="py-3 px-3 text-center">
                        <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                          ${st.className || '-'}
                        </span>
                      </td>

                      <!-- Doğru Sayısı Girişi -->
                      <td class="py-2.5 px-3 text-center">
                        <input type="number" id="input-c-${st.id}" min="0" max="${this.testMeta.totalQuestions}" 
                          value="${sc.correct}"
                          oninput="window.TestResultsModule.handleInputChange('${st.id}', 'correct', this.value)"
                          class="w-16 px-2 py-1.5 text-center font-black text-emerald-800 bg-emerald-50/50 border border-emerald-300 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600">
                      </td>

                      <!-- Yanlış Sayısı Girişi -->
                      <td class="py-2.5 px-3 text-center">
                        <input type="number" id="input-w-${st.id}" min="0" max="${this.testMeta.totalQuestions}" 
                          value="${sc.wrong}"
                          oninput="window.TestResultsModule.handleInputChange('${st.id}', 'wrong', this.value)"
                          class="w-16 px-2 py-1.5 text-center font-black text-rose-800 bg-rose-50/50 border border-rose-300 rounded-xl focus:bg-white focus:outline-none focus:border-rose-600">
                      </td>

                      <!-- Otomatik Boş -->
                      <td class="py-3 px-3 text-center font-mono font-bold text-slate-500">
                        <span id="empty-badge-${st.id}">${sc.empty}</span>
                      </td>

                      <!-- Otomatik Net -->
                      <td class="py-3 px-3 text-center">
                        <span id="net-badge-${st.id}" class="px-2.5 py-1 rounded-xl bg-slate-100 font-mono font-black text-slate-800 text-xs border border-slate-200">
                          ${sc.net.toFixed(2)}
                        </span>
                      </td>

                      <!-- 100 Üzerinden Canlı Başarı Notu -->
                      <td class="py-3 px-4 text-center">
                        <div class="flex flex-col items-center gap-0.5">
                          <span id="score-badge-${st.id}" class="px-3 py-1.5 rounded-xl font-black text-sm border shadow-xs transition-all ${badgeCls}">
                            ${sc.score}
                          </span>
                          <span id="grade-label-${st.id}" class="text-[10px] font-bold text-slate-400">
                            ${gradeLabel}
                          </span>
                        </div>
                      </td>

                      <!-- Veli WhatsApp Paylaşım Butonu -->
                      <td class="py-3 px-3 text-center no-print">
                        <button type="button" onclick="window.TestResultsModule.shareStudentViaWhatsApp('${st.id}')"
                          title="Veliye WhatsApp Mesajı Gönder"
                          class="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl transition border border-emerald-200 inline-flex items-center gap-1 text-xs font-bold shadow-2xs">
                          <span>📱</span>
                          <span class="text-[10px]">Gönder</span>
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Alt Kaydet Barı -->
          <div class="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 no-print">
            <div class="text-xs text-slate-500">
              💡 <strong>İpucu:</strong> Talebelerin doğru ve yanlış sayılarını girdikçe net ve notlar anında hesaplanır. Bittiğinde <strong>"Sonuçları Kaydet"</strong> butonuna basın.
            </div>

            <div class="flex items-center gap-3">
              <button type="button" onclick="window.TestResultsModule.saveCurrentTest();"
                class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center gap-2">
                <span>💾</span>
                <span>Tüm Sonuçları Sisteme Kaydet</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    `;

    this.updateSummaryCounters();
  },

  // 2. GEÇMİŞ TEST ARŞİVİ EKRANI
  renderHistoryView(container) {
    const list = window.Store.getTestResults();

    container.innerHTML = `
      <div class="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
        
        <!-- Üst Bar -->
        <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">📚</span>
              <h2 class="text-xl font-black text-slate-900">Geçmiş Test ve Etüt Arşivi</h2>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Daha önce yapılmış tüm etüt testlerini inceleyebilir, yeniden düzenleyebilir veya silebilirsiniz.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" onclick="window.TestResultsModule.activeView='editor'; window.TestResultsModule.render();"
              class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow transition flex items-center gap-2">
              <span>➕ Yeni Test Girişi</span>
            </button>
          </div>
        </div>

        <!-- Test Listesi -->
        ${list.length === 0 ? `
          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center space-y-3">
            <div class="text-4xl">📭</div>
            <h3 class="text-base font-black text-slate-700">Henüz Kaydedilmiş Test Bulunmuyor</h3>
            <p class="text-xs text-slate-400 max-w-md mx-auto">
              Yukarıdaki "Yeni Test Girişi" butonuna tıklayarak ilk etüt testinizi oluşturabilir ve talebelerin netlerini kaydedebilirsiniz.
            </p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${list.map(t => {
              const scoreKeys = Object.keys(t.scores || {});
              let sumScore = 0;
              let sumNet = 0;
              let evalCount = 0;

              scoreKeys.forEach(k => {
                const s = t.scores[k];
                if (s && (s.correct > 0 || s.wrong > 0)) {
                  sumScore += (s.score || 0);
                  sumNet += (s.net || 0);
                  evalCount++;
                }
              });

              const avgScore = evalCount > 0 ? Math.round(sumScore / evalCount) : 0;
              const avgNet = evalCount > 0 ? (sumNet / evalCount).toFixed(1) : '0.0';

              return `
                <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-2">
                      <span class="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                        ${t.subject || 'Genel'}
                      </span>
                      <span class="text-xs font-bold text-slate-400 font-mono">
                        📅 ${t.date || '-'}
                      </span>
                    </div>

                    <h4 class="text-base font-black text-slate-900 line-clamp-1 mb-1">
                      ${t.title || 'Etüt Testi'}
                    </h4>

                    ${t.unit || t.topic ? `
                      <div class="text-xs text-slate-600 mb-3 space-y-0.5">
                        ${t.unit ? `<div class="font-bold text-slate-700">📖 ${t.unit}</div>` : ''}
                        ${t.topic ? `<div class="text-[11px] text-slate-500">🎯 ${t.topic}</div>` : ''}
                      </div>
                    ` : ''}

                    <div class="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                      <div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase">Soru</div>
                        <div class="text-xs font-black text-slate-800">${t.totalQuestions || 20}</div>
                      </div>
                      <div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase">Ort. Net</div>
                        <div class="text-xs font-black text-emerald-700">${avgNet}</div>
                      </div>
                      <div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase">Ort. Not</div>
                        <div class="text-xs font-black text-purple-700">${avgScore}</div>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                    <button type="button" onclick="window.TestResultsModule.loadTestForEdit('${t.id}')"
                      class="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-xl font-bold text-xs transition text-center shadow-2xs">
                      ✏️ İncele & Düzenle
                    </button>

                    <button type="button" onclick="window.TestResultsModule.deleteTest('${t.id}')"
                      class="py-2 px-3 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl font-bold text-xs transition shadow-2xs"
                      title="Testi Sil">
                      🗑️
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;
  },

  // --- Filtre ve Arama ---
  filterClass(cls) {
    this.selectedClass = cls;
    this.render();
  },

  // --- Form Temizle / Yeni Test ---
  resetForm() {
    this.currentTestId = null;
    this.testMeta = {
      title: 'Haftalık Etüt Tarama Testi',
      subject: 'Matematik',
      unit: '',
      topic: '',
      date: new Date().toISOString().split('T')[0],
      totalQuestions: 20,
      wrongPenalty: 3
    };
    this.scores = {};
    this.ensureStudentScores();
    this.render();
  },

  // --- Geçmiş Testi Düzenlemek Üzere Yükle ---
  loadTestForEdit(testId) {
    const test = window.Store.getTestResultById(testId);
    if (!test) return;

    this.currentTestId = test.id;
    this.testMeta = {
      title: test.title || 'Etüt Testi',
      subject: test.subject || 'Matematik',
      unit: test.unit || '',
      topic: test.topic || '',
      date: test.date || new Date().toISOString().split('T')[0],
      totalQuestions: test.totalQuestions || 20,
      wrongPenalty: test.wrongPenalty !== undefined ? test.wrongPenalty : 3
    };

    this.scores = {};
    const students = window.Store.getStudents();
    students.forEach(st => {
      if (test.scores && test.scores[st.id]) {
        this.scores[st.id] = { ...test.scores[st.id] };
      } else {
        this.scores[st.id] = {
          correct: 0,
          wrong: 0,
          empty: this.testMeta.totalQuestions,
          net: 0,
          score: 0,
          note: ''
        };
      }
    });

    this.activeView = 'editor';
    this.render();
  },

  // --- Testi Kaydet ---
  saveCurrentTest() {
    const session = window.App.currentSession;
    const author = session ? (session.name || 'Öğretmen') : 'Eğitmen';

    if (!this.testMeta.title || !this.testMeta.title.trim()) {
      alert('⚠️ Lütfen bir test başlığı giriniz.');
      return;
    }

    const testRecord = {
      id: this.currentTestId,
      title: this.testMeta.title.trim(),
      subject: this.testMeta.subject.trim(),
      unit: this.testMeta.unit.trim(),
      topic: this.testMeta.topic.trim(),
      date: this.testMeta.date,
      totalQuestions: parseInt(this.testMeta.totalQuestions, 10) || 20,
      wrongPenalty: parseFloat(this.testMeta.wrongPenalty) || 0,
      scores: this.scores,
      author: author
    };

    const saved = window.Store.saveTestResult(testRecord);
    this.currentTestId = saved.id;

    alert(`✅ "${saved.title}" başlıklı test sonuçları başarıyla kaydedildi!`);
  },

  // --- Test Sil ---
  deleteTest(testId) {
    if (!confirm('Bu test kaydını ve sonuçlarını silmek istediğinize emin misiniz?')) {
      return;
    }
    window.Store.deleteTestResult(testId);
    this.render();
  },

  // --- Veliye WhatsApp ile Gönder ---
  shareStudentViaWhatsApp(studentId) {
    const students = window.Store.getStudents();
    const st = students.find(s => s.id === studentId);
    if (!st) return;

    const sc = this.scores[studentId] || this.calculateRow(studentId);
    const settings = window.Store.getSettings();
    const instName = settings.institutionName || 'Ömer Avniyel Akademi';

    const grade = this.getGradeLabel(sc.score);

    let msg = `*${instName}*\n`;
    msg += `📋 *ETÜT TEST VE SORU TAKİP RAPORU*\n\n`;
    msg += `👤 *Öğrenci:* ${st.firstName} ${st.lastName} (${st.className || ''})\n`;
    msg += `📅 *Tarih:* ${this.testMeta.date}\n`;
    msg += `📝 *Test Başlığı:* ${this.testMeta.title}\n`;
    msg += `📚 *Ders:* ${this.testMeta.subject}\n`;
    if (this.testMeta.unit) msg += `📖 *Ünite:* ${this.testMeta.unit}\n`;
    if (this.testMeta.topic) msg += `🎯 *Konu:* ${this.testMeta.topic}\n`;
    msg += `\n`;
    msg += `📊 *Toplam Soru:* ${this.testMeta.totalQuestions}\n`;
    msg += `✅ *Doğru (D):* ${sc.correct}\n`;
    msg += `❌ *Yanlış (Y):* ${sc.wrong}\n`;
    msg += `⚪ *Boş (B):* ${sc.empty}\n`;
    msg += `🎯 *Net:* ${sc.net.toFixed(2)}\n`;
    msg += `⭐ *100 Üzerinden Not:* ${sc.score} / 100 (${grade})\n\n`;
    msg += `Talebemizi gayretinden dolayı tebrik eder, başarılarının devamını dileriz.`;

    const encoded = encodeURIComponent(msg);
    const phone = (st.parentPhone || '').replace(/\D/g, '');
    let url = `https://api.whatsapp.com/send?text=${encoded}`;
    if (phone && phone.length >= 10) {
      const fullPhone = phone.startsWith('90') ? phone : ('90' + phone.replace(/^0/, ''));
      url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encoded}`;
    }

    window.open(url, '_blank');
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
