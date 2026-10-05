/**
 * mock-exam.js - Ömer Avniyel Akademi Kurumsal Deneme Sınavları & Kazanım Analiz Sistemi
 * - Soru Sayısı, Dersler, Ders Katsayıları (Puan Ağırlıkları) ve Kazanım Tanımlama
 * - LGS 500 Puanı & Ağırlıklı Katsayılı Canlı Puan Hesaplama
 * - Soru Başına Konu & Kazanım Analizi (Eksik Konu Tespiti & Başarı Karnesi)
 * - Sınıf Derecesi, Genel Derece, Şampiyonlar ve Veli WhatsApp Kazanım Karnesi
 */

window.MockExamModule = {
  activeView: 'list', // 'list' | 'editor' | 'results' | 'kazanim'
  selectedExamId: null,
  selectedClassFilter: 'ALL',
  searchQuery: '',

  // Varsayılan Hazır Şablonlar
  PRESET_TEMPLATES: {
    LGS_STANDARD: {
      name: 'LGS Standart Denemesi (90 Soru • 500 Puan)',
      baseScore: 100,
      maxScore: 500,
      formulaType: 'LGS_500',
      subjects: [
        { id: 'sub_turkce', name: 'Türkçe', questionCount: 20, coefficient: 4.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} },
        { id: 'sub_matematik', name: 'Matematik', questionCount: 20, coefficient: 4.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} },
        { id: 'sub_fen', name: 'Fen Bilimleri', questionCount: 20, coefficient: 4.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} },
        { id: 'sub_inkilap', name: 'T.C. İnkılap Tarihi', questionCount: 10, coefficient: 1.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} },
        { id: 'sub_din', name: 'Din Kültürü', questionCount: 10, coefficient: 1.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} },
        { id: 'sub_ingilizce', name: 'İngilizce', questionCount: 10, coefficient: 1.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} }
      ]
    },
    ARA_SINIF_75: {
      name: 'Ara Sınıf Denemesi (5, 6, 7. Sınıflar • 75 Soru)',
      baseScore: 100,
      maxScore: 500,
      formulaType: 'WEIGHTED_500',
      subjects: [
        { id: 'sub_turkce', name: 'Türkçe', questionCount: 15, coefficient: 4.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} },
        { id: 'sub_matematik', name: 'Matematik', questionCount: 15, coefficient: 4.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} },
        { id: 'sub_fen', name: 'Fen Bilimleri', questionCount: 15, coefficient: 4.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} },
        { id: 'sub_sosyal', name: 'Sosyal Bilgiler', questionCount: 10, coefficient: 2.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} },
        { id: 'sub_din', name: 'Din Kültürü', questionCount: 10, coefficient: 2.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} },
        { id: 'sub_ingilizce', name: 'İngilizce', questionCount: 10, coefficient: 2.00, wrongPenalty: 3, kazanimlar: {}, answerKeyA: {}, answerKeyB: {} }
      ]
    }
  },

  // Hazır MEB LGS Müfredat Kazanım Havuzu (Tek tıkla otomatik doldurma)
  MEB_KAZANIM_PRESETS: {
    'Türkçe': [
      'Sözcükte Anlam (Gerçek, Mecaz, Terim)', 'Cümlede Anlam ve Kavramlar', 'Deyimler ve Atasözleri', 'Paragrafta Ana Fikir & Konu',
      'Paragrafta Yardımcı Düşünceler', 'Metin Türleri & Söz Sanatları', 'Fiilimsiler (Eylemsiler)', 'Cümlenin Ögeleri',
      'Cümle Türleri', 'Yazım Kuralları', 'Noktalama İşaretleri', 'Metin Karşılaştırma & Grafik Yorumlama',
      'Sözel Mantık & Muhakeme', 'Anlatım Bozuklukları', 'Paragraf Tamamlama & Akış', 'Paragrafta Yapı',
      'Görsel Okuma & Tablo Yorumlama', 'Fiilde Çatı', 'Anlatım Biçimleri ve Düşünceyi Geliştirme', 'Metinler Arası Karşılaştırma'
    ],
    'Matematik': [
      'Çarpanlar ve Katlar', 'EBOB - EKOK Problemleri', 'Aralarında Asal Sayılar', 'Üslü İfadeler ve Özellikleri',
      'Çok Büyük ve Çok Küçük Sayılar (Bilimsel Gösterim)', 'Kareköklü İfadeler', 'Kareköklü Sayılarda İşlemler', 'Gerçek Sayılar',
      'Veri Analizi (Daire ve Sütun Grafiği)', 'Basit Olayların Olma Olasılığı', 'Cebirsel İfadeler ve Özdeşlikler', 'Doğrusal Denklemler ve Grafik Çizimi',
      'Eğim Kavramı ve Uygulamaları', 'Birinci Dereceden Bir Bilinmeyenli Eşitsizlikler', 'Üçgenlerde Kenarortay, Açıortay ve Yükseklik',
      'Üçgen Eşitsizliği ve Kenar-Açı İlişkileri', 'Pisagor Teoremi', 'Eşlik ve Benzerlik', 'Dönüşüm Geometrisi (Öteleme, Yansıma)', 'Geometrik Cisimler'
    ],
    'Fen Bilimleri': [
      'Mevsimlerin Oluşumu', 'İklim ve Hava Hareketleri', 'DNA ve Genetik Kod', 'Kalıtım (Çaprazlamalar)',
      'Mutasyon ve Modifikasyon', 'Adaptasyon', 'Biyoteknoloji', 'Katı Basıncı',
      'Sıvı Basıncı ve Gaz Basıncı', 'Periyodik Sistem', 'Fiziksel ve Kimyasal Değişimler', 'Kimyasal Tepkimeler',
      'Asitler ve Bazlar', 'Maddenin Isı ile Etkileşimi', 'Basit Makineler (Kaldıraç, Makaralar)', 'Basit Makineler (Eğik Düzlem, Çıkrık)',
      'Besin Zinciri ve Enerji Akışı', 'Fotosentez ve Solunum', 'Madde Döngüleri', 'Sürdürülebilir Kalkınma'
    ],
    'T.C. İnkılap Tarihi': [
      'Uyanan Avrupa ve Sarsılan Osmanlı', 'Mustafa Kemal’in Çocukluğu ve Öğrenimi', 'Mustafa Kemal’in Askerlik Hayatı', 'Birinci Dünya Savaşı ve Cepheler',
      'Mondros Ateşkesi ve İşgaller', 'Kuvâ-yı Millîye ve Cemiyetler', 'Milli Uyanış ve Genelgeler (Amasya, Erzurum, Sivas)', 'Misakımillî ve TBMM’nin Açılışı',
      'Sevr Antlaşması', 'Doğu, Güney ve Batı Cepheleri (Kurtuluş Savaşı)', 'Mudanya ve Lozan Barış Antlaşması', 'Cumhuriyetin İlanı ve İnkılaplar'
    ],
    'Din Kültürü': [
      'Kader ve Kaza İnancı', 'İnsanın İradesi ve Kader', 'Kaderle İlgili Kavramlar (Tevekkül, Ecel, Rızık)', 'Hz. Musa (a.s.) Hayatı',
      'Ayetel Kürsi ve Anlamı', 'Zekat ve Sadaka İbadeti', 'Zekat ve Sadakanın Bireysel ve Toplumsal Faydaları', 'Hz. Şuayb (a.s.) Hayatı',
      'Maûn Suresi ve Anlamı', 'Din, Birey ve Toplum'
    ],
    'İngilizce': [
      'Friendship (Accepting & Refusing)', 'Teen Life (Daily Routines & Preferences)', 'In The Kitchen (Cooking Process & Recipes)', 'On The Phone (Phone Conversations)',
      'The Internet (Online Safety & Social Media)', 'Adventures (Extreme Sports & Comparison)', 'Tourism (Tourist Attractions & Holidays)', 'Chores (Responsibilities at Home)',
      'Science (Scientific Inventions & Discoveries)', 'Natural Forces (Natural Disasters & Precautions)'
    ]
  },

  // Editördeki aktif sınav taslağı
  draftExam: null,

  init() {
    this.render();
  },

  render() {
    const container = document.getElementById('mock-exam-container');
    if (!container) return;

    if (this.activeView === 'editor') {
      this.renderEditorView(container);
    } else if (this.activeView === 'results') {
      this.renderResultsView(container);
    } else if (this.activeView === 'kazanim') {
      this.renderKazanimAnalyticsView(container);
    } else {
      this.renderListView(container);
    }
  },

  // ========================================================
  // 1. SINAVLAR LİSTESİ GÖRÜNÜMÜ
  // ========================================================
  renderListView(container) {
    const exams = (window.Store && typeof window.Store.getMockExams === 'function')
      ? window.Store.getMockExams()
      : [];

    container.innerHTML = `
      <div class="space-y-4 max-w-7xl mx-auto animate-fade-in pb-8">
        
        <!-- Üst Başlık & Eylem Butonu -->
        <div class="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 text-2xl flex items-center justify-center font-black shadow-inner">
              🎯
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Kurumsal Deneme Sınavları & Kazanım Analizi
              </h2>
              <p class="text-xs text-slate-500 font-medium mt-0.5">
                Ders katsayıları, puan ağırlıkları ve soru bazlı konu/kazanım analizleri
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" onclick="window.MockExamModule.openNewExamModal('LGS_STANDARD')"
              class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow transition flex items-center gap-2 cursor-pointer active:scale-95">
              <span>+</span>
              <span>LGS Deneme Sınavı Oluştur</span>
            </button>
            <button type="button" onclick="window.MockExamModule.openNewExamModal('CUSTOM')"
              class="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow transition flex items-center gap-1.5 cursor-pointer">
              <span>⚙️</span>
              <span>Özel Sınav</span>
            </button>
          </div>
        </div>

        <!-- Sınav Kartları Listesi -->
        ${exams.length === 0 ? `
          <div class="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
            <div class="w-16 h-16 mx-auto rounded-3xl bg-amber-50 text-amber-600 text-3xl flex items-center justify-center shadow-inner">
              🎯
            </div>
            <div class="max-w-md mx-auto space-y-1">
              <h3 class="font-black text-slate-800 text-base">Henüz Deneme Sınavı Oluşturulmadı</h3>
              <p class="text-xs text-slate-500 leading-relaxed">
                Dersleri, soru sayılarını, katsayıları ve MEB kazanımlarını belirleyerek ilk deneme sınavınızı hemen oluşturabilirsiniz.
              </p>
            </div>
            <div class="pt-2 flex justify-center gap-2">
              <button type="button" onclick="window.MockExamModule.openNewExamModal('LGS_STANDARD')"
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition">
                ⚡ LGS Şablonu ile Hızlı Başla (90 Soru • 500 Puan)
              </button>
            </div>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${exams.map(exam => this.renderExamCardHtml(exam)).join('')}
          </div>
        `}

      </div>
    `;
  },

  renderExamCardHtml(exam) {
    const scores = exam.scores || {};
    const studentCount = Object.keys(scores).length;
    const subjects = exam.subjects || [];
    const totalQ = subjects.reduce((sum, s) => sum + (parseInt(s.questionCount, 10) || 0), 0);

    // Ortalama Puan Hesabı
    let avgScore = 0;
    if (studentCount > 0) {
      const sum = Object.values(scores).reduce((acc, sc) => acc + (sc.totalScore || 0), 0);
      avgScore = Math.round(sum / studentCount);
    }

    return `
      <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-3.5 hover:shadow-md transition">
        <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
              ${exam.formulaType === 'LGS_500' ? 'LGS (500 Puan)' : 'Ağırlıklı Puan'}
            </span>
            <h3 class="font-black text-slate-900 text-sm mt-1 leading-snug line-clamp-1">
              ${exam.title}
            </h3>
            <p class="text-[11px] text-slate-400 font-medium">
              📅 ${exam.date} • <strong>${totalQ}</strong> Soru • <strong>${subjects.length}</strong> Ders
            </p>
          </div>
          <div class="text-right">
            <span class="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200">
              Ort: ${avgScore} P
            </span>
          </div>
        </div>

        <!-- Dersler ve Katsayılar Özeti -->
        <div class="grid grid-cols-2 gap-1.5 text-[11px]">
          ${subjects.map(s => `
            <div class="p-1.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <span class="font-bold text-slate-700 truncate">${s.name}:</span>
              <span class="text-[10px] text-slate-500 font-mono">${s.questionCount}S (x${s.coefficient})</span>
            </div>
          `).join('')}
        </div>

        <!-- Alt Aksiyonlar -->
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="window.MockExamModule.openResultsView('${exam.id}')"
              class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs transition flex items-center gap-1">
              <span>📊</span>
              <span>Sonuçlar & Sıralama</span>
            </button>
            <button type="button" onclick="window.MockExamModule.openKazanimAnalyticsView('${exam.id}')"
              title="Kazanım ve Konu Eksik Analizi"
              class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl border border-amber-200 transition">
              🎯 Kazanımlar
            </button>
          </div>

          <div class="flex items-center gap-1">
            <button type="button" onclick="window.MockExamModule.openEditExam('${exam.id}')"
              title="Sınav Ayarlarını Düzenle"
              class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition">
              ✏️
            </button>
            <button type="button" onclick="window.MockExamModule.deleteExam('${exam.id}')"
              title="Sınavı Sil"
              class="p-1.5 text-rose-400 hover:text-rose-700 rounded-lg transition">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ========================================================
  // 2. SINAV OLUŞTURMA & DÜZENLEME SİHİRBAZI
  // ========================================================
  openNewExamModal(templateKey = 'LGS_STANDARD') {
    const tmpl = this.PRESET_TEMPLATES[templateKey] || this.PRESET_TEMPLATES.LGS_STANDARD;
    this.draftExam = {
      id: null,
      title: templateKey === 'LGS_STANDARD' ? '1. Kurumsal LGS Deneme Sınavı' : 'Genel Tarama Denemesi',
      date: new Date().toISOString().split('T')[0],
      formulaType: tmpl.formulaType || 'LGS_500',
      baseScore: tmpl.baseScore || 100,
      maxScore: tmpl.maxScore || 500,
      targetClasses: ['8-A', '8-B'],
      subjects: JSON.parse(JSON.stringify(tmpl.subjects)),
      scores: {}
    };

    this.activeView = 'editor';
    this.render();
  },

  openEditExam(examId) {
    const exam = window.Store.getMockExamById(examId);
    if (!exam) return;
    this.draftExam = JSON.parse(JSON.stringify(exam));
    this.activeView = 'editor';
    this.render();
  },

  renderEditorView(container) {
    const d = this.draftExam;
    if (!d) {
      this.activeView = 'list';
      this.render();
      return;
    }

    const totalQuestions = d.subjects.reduce((sum, s) => sum + (parseInt(s.questionCount, 10) || 0), 0);
    const totalWeightedPoints = d.subjects.reduce((sum, s) => sum + ((parseInt(s.questionCount, 10) || 0) * (parseFloat(s.coefficient) || 1)), 0);

    container.innerHTML = `
      <div class="space-y-4 max-w-5xl mx-auto animate-fade-in pb-12">
        
        <!-- Üst Bar: Geri Dön & Başlık -->
        <div class="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <button type="button" onclick="window.MockExamModule.activeView='list'; window.MockExamModule.render();"
              class="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black transition cursor-pointer">
              ←
            </button>
            <div>
              <h2 class="text-base sm:text-lg font-black text-slate-900 leading-tight">
                ${d.id ? 'Deneme Sınavını Düzenle' : 'Yeni Deneme Sınavı Oluştur'}
              </h2>
              <p class="text-xs text-slate-500 font-medium">
                Dersler, katsayılar ve MEB kazanımlarını tek ekrandan yönetin
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" onclick="window.MockExamModule.saveDraftExam()"
              class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95">
              <span>💾</span>
              <span>Sınavı Kaydet & Devam Et</span>
            </button>
          </div>
        </div>

        <!-- 1. GENEL BİLGİLER FORMU -->
        <div class="bg-white p-5 rounded-3xl shadow-xs border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 class="font-black text-slate-900 text-sm flex items-center gap-2">
              <span>📋</span> Sınav Genel Bilgileri & Puanlama
            </h3>
            <span class="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              Toplam ${totalQuestions} Soru • Katsayılı Ağırlık: ${totalWeightedPoints}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div class="sm:col-span-2">
              <label class="block font-bold text-slate-700 mb-1">SINAV BAŞLIĞI *</label>
              <input type="text" id="mock-edit-title" value="${this.escapeHtml(d.title)}"
                oninput="window.MockExamModule.draftExam.title = this.value"
                placeholder="Örn: 1. Kurumsal LGS Deneme Sınavı"
                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">SINAV TARİHİ *</label>
              <input type="date" id="mock-edit-date" value="${d.date}"
                onchange="window.MockExamModule.draftExam.date = this.value"
                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">PUANLAMA TÜRÜ</label>
              <select onchange="window.MockExamModule.draftExam.formulaType = this.value"
                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800">
                <option value="LGS_500" ${d.formulaType === 'LGS_500' ? 'selected' : ''}>LGS 500 Puan (Taban: 100, Tavan: 500)</option>
                <option value="WEIGHTED_500" ${d.formulaType === 'WEIGHTED_500' ? 'selected' : ''}>Ağırlıklı 500 Puan</option>
                <option value="RAW_WEIGHTED" ${d.formulaType === 'RAW_WEIGHTED' ? 'selected' : ''}>Ham Katsayılı Puan</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 2. DERSLER VE KATSAYILAR (PUAN GETİRİLERİ) -->
        <div class="bg-white p-5 rounded-3xl shadow-xs border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 class="font-black text-slate-900 text-sm flex items-center gap-2">
                <span>📚</span> Dersler, Soru Sayıları ve Katsayılar (Puan Ağırlıkları)
              </h3>
              <p class="text-[11px] text-slate-500">Her dersin soru sayısını ve soru başına getireceği katsayıyı belirleyin</p>
            </div>
            <button type="button" onclick="window.MockExamModule.addNewSubjectToDraft()"
              class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1 cursor-pointer">
              <span>+</span> <span>Ders Ekle</span>
            </button>
          </div>

          <!-- Ders Kartları Grid -->
          <div class="space-y-3">
            ${d.subjects.map((sub, sIdx) => this.renderSubjectEditorRowHtml(sub, sIdx)).join('')}
          </div>
        </div>

      </div>
    `;
  },

  renderSubjectEditorRowHtml(sub, sIdx) {
    const kazanimCount = Object.keys(sub.kazanimlar || {}).length;
    const hasPreset = !!this.MEB_KAZANIM_PRESETS[sub.name];

    return `
      <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 transition hover:border-slate-300">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono font-bold text-xs">
              ${sIdx + 1}
            </span>
            <input type="text" value="${this.escapeHtml(sub.name)}"
              oninput="window.MockExamModule.draftExam.subjects[${sIdx}].name = this.value"
              placeholder="Ders Adı"
              class="p-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 w-44 focus:outline-none focus:ring-1 focus:ring-indigo-500">
          </div>

          <div class="flex flex-wrap items-center gap-2.5 text-xs">
            <!-- Soru Sayısı -->
            <div class="flex items-center gap-1">
              <label class="text-[10px] font-bold text-slate-500">Soru:</label>
              <input type="number" min="1" max="100" value="${sub.questionCount}"
                onchange="window.MockExamModule.updateSubjectQuestionCount(${sIdx}, this.value)"
                class="w-16 p-1.5 bg-white border border-slate-300 rounded-xl font-bold text-center text-xs">
            </div>

            <!-- Katsayı (Puan Ağırlığı) -->
            <div class="flex items-center gap-1">
              <label class="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Katsayı:</label>
              <input type="number" step="0.25" min="0" value="${sub.coefficient}"
                oninput="window.MockExamModule.draftExam.subjects[${sIdx}].coefficient = parseFloat(this.value) || 1"
                class="w-16 p-1.5 bg-white border border-amber-300 rounded-xl font-black text-center text-xs text-amber-900">
            </div>

            <!-- Yanlış Kuralı -->
            <div class="flex items-center gap-1">
              <label class="text-[10px] font-bold text-slate-500">Ceza:</label>
              <select onchange="window.MockExamModule.draftExam.subjects[${sIdx}].wrongPenalty = parseFloat(this.value)"
                class="p-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-700">
                <option value="3" ${sub.wrongPenalty == 3 ? 'selected' : ''}>3Y = 1D (LGS)</option>
                <option value="4" ${sub.wrongPenalty == 4 ? 'selected' : ''}>4Y = 1D (YKS)</option>
                <option value="0" ${sub.wrongPenalty == 0 ? 'selected' : ''}>Cezasız</option>
              </select>
            </div>

            <!-- Kazanım & Konu Girişi Butonu -->
            <button type="button" onclick="window.MockExamModule.openSubjectKazanimModal(${sIdx})"
              class="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer">
              <span>🎯</span>
              <span>Kazanımlar (${kazanimCount}/${sub.questionCount})</span>
            </button>

            <!-- Dersi Sil -->
            <button type="button" onclick="window.MockExamModule.removeSubjectFromDraft(${sIdx})"
              class="p-1.5 text-rose-500 hover:text-rose-700 text-xs font-bold" title="Dersi Çıkar">
              ✕
            </button>
          </div>
        </div>

        <!-- Hızlı Bilgi & Hazır MEB Şablon Butonu -->
        <div class="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
          <span>Soru başına <strong>${sub.coefficient}</strong> katsayı puanı kazandırır.</span>
          ${hasPreset ? `
            <button type="button" onclick="window.MockExamModule.loadMebKazanimPreset(${sIdx})"
              class="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer">
              ⚡ MEB LGS ${sub.name} Standart Kazanımlarını Otomatik Yükle
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },

  addNewSubjectToDraft() {
    this.draftExam.subjects.push({
      id: 'sub_' + Date.now(),
      name: 'Yeni Ders',
      questionCount: 10,
      coefficient: 1.00,
      wrongPenalty: 3,
      kazanimlar: {},
      answerKeyA: {},
      answerKeyB: {}
    });
    this.render();
  },

  removeSubjectFromDraft(sIdx) {
    if (confirm('Bu dersi sınavdan çıkarmak istediğinize emin misiniz?')) {
      this.draftExam.subjects.splice(sIdx, 1);
      this.render();
    }
  },

  updateSubjectQuestionCount(sIdx, newCount) {
    const val = parseInt(newCount, 10) || 1;
    this.draftExam.subjects[sIdx].questionCount = val;
    this.render();
  },

  loadMebKazanimPreset(sIdx) {
    const sub = this.draftExam.subjects[sIdx];
    const preset = this.MEB_KAZANIM_PRESETS[sub.name];
    if (!preset) return;

    if (!sub.kazanimlar) sub.kazanimlar = {};
    for (let i = 0; i < sub.questionCount; i++) {
      const q = i + 1;
      sub.kazanimlar[q] = preset[i % preset.length] || `Konu ${q}`;
    }

    if (window.App && window.App.showToast) {
      window.App.showToast(`✓ ${sub.name} dersine ${sub.questionCount} adet MEB kazanımı yüklendi!`, 'success');
    }
    this.render();
  },

  // ========================================================
  // 3. KAZANIMLAR GİRİŞ & DÜZENLEME MODALI
  // ========================================================
  openSubjectKazanimModal(sIdx) {
    const sub = this.draftExam.subjects[sIdx];
    if (!sub) return;

    let modal = document.getElementById('mock-kazanim-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mock-kazanim-modal';
      modal.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 space-y-4 animate-fade-in my-8">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 text-xl flex items-center justify-center font-black">
              🎯
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-base leading-tight">
                ${sub.name} • Soru Başına Kazanımlar
              </h3>
              <p class="text-xs text-slate-500 font-medium">${sub.questionCount} Soru için konu ve kazanım tanımlayın</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('mock-kazanim-modal').remove()"
            class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">✕</button>
        </div>

        <!-- TOPLU KAZANIM YAPIŞTIR KUTUSU -->
        <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-800">📋 Toplu Kazanım Yapıştır (Alt alta metin):</span>
            <span class="text-[10px] text-slate-500">Her satır bir soruya atanır</span>
          </div>
          <textarea id="mock-paste-kazanim-textarea" rows="3" placeholder="1. Soru Konusu&#10;2. Soru Konusu&#10;3. Soru Konusu..."
            class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none"></textarea>
          <div class="flex justify-end">
            <button type="button" onclick="window.MockExamModule.applyPastedKazanimlar(${sIdx})"
              class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition">
              Kazanımları Sorulara Doldur
            </button>
          </div>
        </div>

        <!-- SORU SORU KAZANIM LİSTESİ -->
        <div class="max-h-72 overflow-y-auto space-y-2 pr-1" id="kazanim-rows-container">
          ${this.renderKazanimInputRowsHtml(sub, sIdx)}
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button type="button" onclick="document.getElementById('mock-kazanim-modal').remove()"
            class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition">
            Tamamla ve Kapat
          </button>
        </div>
      </div>
    `;
  },

  renderKazanimInputRowsHtml(sub, sIdx) {
    let html = '';
    for (let q = 1; q <= sub.questionCount; q++) {
      const cur = (sub.kazanimlar && sub.kazanimlar[q]) || '';
      html += `
        <div class="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <span class="font-black text-slate-700 w-8 text-right">${q}. Soru:</span>
          <input type="text" value="${this.escapeHtml(cur)}"
            oninput="window.MockExamModule.updateSingleKazanim(${sIdx}, ${q}, this.value)"
            placeholder="${q}. Sorunun konusu / MEB kazanımı..."
            class="flex-1 p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500">
        </div>
      `;
    }
    return html;
  },

  updateSingleKazanim(sIdx, q, val) {
    const sub = this.draftExam.subjects[sIdx];
    if (!sub.kazanimlar) sub.kazanimlar = {};
    sub.kazanimlar[q] = val.trim();
  },

  applyPastedKazanimlar(sIdx) {
    const sub = this.draftExam.subjects[sIdx];
    const ta = document.getElementById('mock-paste-kazanim-textarea');
    if (!ta || !ta.value.trim()) return;

    const lines = ta.value.split('\n').map(l => l.replace(/^(\d+[\.\-\)]\s*)/, '').trim()).filter(Boolean);
    if (!sub.kazanimlar) sub.kazanimlar = {};

    for (let i = 0; i < Math.min(lines.length, sub.questionCount); i++) {
      sub.kazanimlar[i + 1] = lines[i];
    }

    const container = document.getElementById('kazanim-rows-container');
    if (container) {
      container.innerHTML = this.renderKazanimInputRowsHtml(sub, sIdx);
    }

    if (window.App && window.App.showToast) {
      window.App.showToast(`✓ ${Math.min(lines.length, sub.questionCount)} soru kazanımı aktarıldı!`, 'success');
    }
  },

  saveDraftExam() {
    const d = this.draftExam;
    if (!d.title || !d.title.trim()) {
      alert('Lütfen bir sınav başlığı giriniz.');
      return;
    }
    if (!d.subjects || d.subjects.length === 0) {
      alert('Lütfen en az bir ders ekleyiniz.');
      return;
    }

    const saved = window.Store.saveMockExam(d);
    this.selectedExamId = saved.id;

    if (window.App && window.App.showToast) {
      window.App.showToast(`✅ "${saved.title}" başarıyla kaydedildi!`, 'success');
    }

    this.activeView = 'results';
    this.render();
  },

  deleteExam(examId) {
    if (confirm('Bu deneme sınavını ve tüm sonuçlarını silmek istediğinize emin misiniz?')) {
      window.Store.deleteMockExam(examId);
      this.activeView = 'list';
      this.render();
    }
  },

  // ========================================================
  // 4. DENEME SONUÇLARI, PUANLAMA & SIRALAMA GÖRÜNÜMÜ
  // ========================================================
  openResultsView(examId) {
    this.selectedExamId = examId;
    this.activeView = 'results';
    this.render();
  },

  renderResultsView(container) {
    const exam = window.Store.getMockExamById(this.selectedExamId);
    if (!exam) {
      this.activeView = 'list';
      this.render();
      return;
    }

    const students = (window.Store && typeof window.Store.getStudents === 'function')
      ? window.Store.getStudents(false)
      : [];

    const examScores = exam.scores || {};
    const subjects = exam.subjects || [];

    // Her öğrenci için puan hesabı & sıralama
    const studentResults = students.map(st => {
      const sc = examScores[st.id] || { subjects: {}, totalScore: 0, totalNet: 0 };
      const subScores = sc.subjects || {};
      
      let totalNet = 0;
      let totalWeightedNet = 0;
      let maxWeightedNet = 0;

      subjects.forEach(sub => {
        const subData = subScores[sub.id] || { correct: 0, wrong: 0, empty: sub.questionCount, net: 0 };
        const coeff = parseFloat(sub.coefficient) || 1;
        const qCount = parseInt(sub.questionCount, 10) || 0;
        
        totalNet += (subData.net || 0);
        totalWeightedNet += ((subData.net || 0) * coeff);
        maxWeightedNet += (qCount * coeff);
      });

      // LGS 500 Puan Formülü
      let calculatedScore = 0;
      if (exam.formulaType === 'LGS_500' && maxWeightedNet > 0) {
        calculatedScore = 100 + (Math.max(0, totalWeightedNet) / maxWeightedNet) * 400;
      } else {
        calculatedScore = totalWeightedNet;
      }
      calculatedScore = Math.max(0, Math.min(500, Math.round(calculatedScore * 100) / 100));

      return {
        student: st,
        subScores,
        totalNet: Math.round(totalNet * 100) / 100,
        totalScore: calculatedScore,
        hasScore: Object.keys(subScores).length > 0 && Object.values(subScores).some(s => (s.correct > 0 || s.wrong > 0))
      };
    });

    // Puanına Göre Büyükten Küçüğe Sırala (Derece)
    studentResults.sort((a, b) => {
      if (a.hasScore && !b.hasScore) return -1;
      if (!a.hasScore && b.hasScore) return 1;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.totalNet !== a.totalNet) return b.totalNet - a.totalNet;
      return (a.student.firstName || '').localeCompare(b.student.firstName || '', 'tr');
    });

    container.innerHTML = `
      <div class="space-y-4 max-w-7xl mx-auto animate-fade-in pb-12">
        
        <!-- Üst Başlık & Kontroller -->
        <div class="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <button type="button" onclick="window.MockExamModule.activeView='list'; window.MockExamModule.render();"
              class="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black transition cursor-pointer">
              ←
            </button>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                  ${exam.formulaType === 'LGS_500' ? 'LGS (500 Puan)' : 'Ağırlıklı Puan'}
                </span>
                <h2 class="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  ${exam.title}
                </h2>
              </div>
              <p class="text-xs text-slate-500 font-medium mt-0.5">
                📅 ${exam.date} • ${subjects.length} Ders • Toplam ${subjects.reduce((sum, s) => sum + s.questionCount, 0)} Soru
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="window.MockExamModule.openKazanimAnalyticsView('${exam.id}')"
              class="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer">
              <span>🎯</span>
              <span>Kazanım Analizi & Rapor</span>
            </button>
            <button type="button" onclick="window.MockExamModule.openEditExam('${exam.id}')"
              class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer">
              <span>⚙️</span>
              <span>Sınavı Düzenle</span>
            </button>
          </div>
        </div>

        <!-- SONUÇ & SIRALAMA TABLOSU -->
        <div class="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div class="font-black text-slate-800 text-xs sm:text-sm">
              🏆 LGS Puan Sıralaması ve Ders Netleri (${studentResults.length} Talebe)
            </div>
            <div class="text-[11px] text-slate-500">
              Not girmek için talebenin yanındaki <strong>"Not Gir / Düzenle"</strong> butonuna tıklayınız.
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-100 text-[10px] sm:text-[11px] font-black uppercase text-slate-600 border-b border-slate-200 h-9">
                  <th class="py-2 pl-3 w-14 text-center">Derece</th>
                  <th class="py-2 px-2">Talebe Bilgisi</th>
                  <th class="py-2 px-2 text-center text-purple-800 bg-purple-50 font-black">500 Puan</th>
                  <th class="py-2 px-2 text-center text-blue-800 bg-blue-50 font-black">Top. Net</th>
                  ${subjects.map(s => `
                    <th class="py-2 px-1 text-center font-bold text-slate-700">
                      ${s.name.substring(0, 5)}<br><span class="text-[9px] text-slate-400 font-normal font-mono">(x${s.coefficient})</span>
                    </th>
                  `).join('')}
                  <th class="py-2 pr-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${studentResults.map((item, idx) => {
                  const st = item.student;
                  const isEval = item.hasScore;
                  let medal = '';
                  if (isEval) {
                    if (idx === 0) medal = '🥇';
                    else if (idx === 1) medal = '🥈';
                    else if (idx === 2) medal = '🥉';
                    else medal = `#${idx + 1}`;
                  } else {
                    medal = '-';
                  }

                  return `
                    <tr class="hover:bg-slate-50/80 transition-colors h-10">
                      <td class="text-center font-mono font-black text-xs ${idx < 3 && isEval ? 'text-amber-600 font-black' : 'text-slate-400'}">
                        ${medal}
                      </td>
                      <td class="py-2 px-2">
                        <div class="font-black text-slate-900">${st.firstName} ${st.lastName}</div>
                        <div class="text-[10px] text-slate-400 font-bold">${st.className || ''} • No: ${st.studentNo}</div>
                      </td>
                      <td class="text-center font-mono font-black text-xs text-purple-900 bg-purple-50/40">
                        ${isEval ? item.totalScore.toFixed(2) : '<span class="text-slate-300">-</span>'}
                      </td>
                      <td class="text-center font-mono font-black text-xs text-blue-900 bg-blue-50/40">
                        ${isEval ? item.totalNet.toFixed(2) : '<span class="text-slate-300">-</span>'}
                      </td>
                      ${subjects.map(s => {
                        const sd = item.subScores[s.id];
                        return `
                          <td class="text-center font-mono text-[11px] px-1">
                            ${sd ? `<span class="font-bold text-slate-800">${sd.net.toFixed(1)}</span>` : '<span class="text-slate-300">-</span>'}
                          </td>
                        `;
                      }).join('')}
                      <td class="py-2 pr-3 text-right">
                        <button type="button" onclick="window.MockExamModule.openStudentScoreInputModal('${exam.id}', '${st.id}')"
                          class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg border border-indigo-200 transition">
                          ✏️ Not Gir
                        </button>
                        <button type="button" onclick="window.MockExamModule.shareStudentWhatsAppCarnet('${exam.id}', '${st.id}')"
                          title="Veliye WhatsApp Deneme Karnesi Gönder"
                          class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200 transition ml-1">
                          📱
                        </button>
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

  // Öğrenciye Not Giriş Modalı (Ders Ders Doğru / Yanlış / Boş)
  openStudentScoreInputModal(examId, studentId) {
    const exam = window.Store.getMockExamById(examId);
    const student = window.Store.getStudentById(studentId);
    if (!exam || !student) return;

    const subjects = exam.subjects || [];
    const studentRecord = (exam.scores && exam.scores[studentId]) || { subjects: {} };
    const curScores = studentRecord.subjects || {};

    let modal = document.getElementById('mock-score-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mock-score-modal';
      modal.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 sm:p-6 space-y-4 animate-fade-in my-8">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span class="text-xs font-black text-indigo-600 uppercase tracking-wider">${exam.title}</span>
            <h3 class="font-black text-slate-900 text-base leading-tight mt-0.5">
              ${student.firstName} ${student.lastName} (${student.className} • No: ${student.studentNo})
            </h3>
          </div>
          <button type="button" onclick="document.getElementById('mock-score-modal').remove()"
            class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">✕</button>
        </div>

        <!-- DERS BAZINDA D/Y/B GİRİŞ ALANLARI -->
        <div class="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          ${subjects.map((s, idx) => {
            const sc = curScores[s.id] || { correct: 0, wrong: 0, empty: s.questionCount, net: 0 };
            return `
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div>
                  <div class="font-black text-slate-800">${s.name}</div>
                  <div class="text-[10px] text-slate-400 font-mono">${s.questionCount} Soru • Katsayı: ${s.coefficient}</div>
                </div>

                <div class="flex items-center gap-2">
                  <div class="text-center">
                    <label class="block text-[9px] font-bold text-emerald-700">D</label>
                    <input type="number" id="sc-c-${s.id}" min="0" max="${s.questionCount}" value="${sc.correct}"
                      class="w-12 p-1.5 bg-white border border-emerald-300 rounded-lg text-center font-black text-xs text-emerald-900 focus:outline-none">
                  </div>
                  <div class="text-center">
                    <label class="block text-[9px] font-bold text-rose-700">Y</label>
                    <input type="number" id="sc-w-${s.id}" min="0" max="${s.questionCount}" value="${sc.wrong}"
                      class="w-12 p-1.5 bg-white border border-rose-300 rounded-lg text-center font-black text-xs text-rose-900 focus:outline-none">
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button type="button" onclick="document.getElementById('mock-score-modal').remove()"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
            İptal
          </button>
          <button type="button" onclick="window.MockExamModule.saveStudentScoreSubmit('${examId}', '${studentId}')"
            class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition">
            💾 Notları Kaydet
          </button>
        </div>
      </div>
    `;
  },

  saveStudentScoreSubmit(examId, studentId) {
    const exam = window.Store.getMockExamById(examId);
    if (!exam) return;

    if (!exam.scores) exam.scores = {};
    if (!exam.scores[studentId]) exam.scores[studentId] = { subjects: {} };

    const subjects = exam.subjects || [];
    let totalNet = 0;
    let totalWeightedNet = 0;
    let maxWeightedNet = 0;

    subjects.forEach(s => {
      const cEl = document.getElementById(`sc-c-${s.id}`);
      const wEl = document.getElementById(`sc-w-${s.id}`);
      const c = Math.max(0, parseInt(cEl ? cEl.value : '0', 10) || 0);
      const w = Math.max(0, parseInt(wEl ? wEl.value : '0', 10) || 0);
      const penalty = parseFloat(s.wrongPenalty) || 3;
      const coeff = parseFloat(s.coefficient) || 1;
      const qCount = parseInt(s.questionCount, 10) || 0;

      const empty = Math.max(0, qCount - (c + w));
      let net = penalty > 0 ? (c - (w / penalty)) : c;
      net = Math.max(0, Math.round(net * 100) / 100);

      exam.scores[studentId].subjects[s.id] = {
        correct: c,
        wrong: w,
        empty: empty,
        net: net
      };

      totalNet += net;
      totalWeightedNet += (net * coeff);
      maxWeightedNet += (qCount * coeff);
    });

    let score = 0;
    if (exam.formulaType === 'LGS_500' && maxWeightedNet > 0) {
      score = 100 + (Math.max(0, totalWeightedNet) / maxWeightedNet) * 400;
    } else {
      score = totalWeightedNet;
    }
    score = Math.max(0, Math.min(500, Math.round(score * 100) / 100));

    exam.scores[studentId].totalScore = score;
    exam.scores[studentId].totalNet = Math.round(totalNet * 100) / 100;

    window.Store.saveMockExam(exam);

    const modal = document.getElementById('mock-score-modal');
    if (modal) modal.remove();

    if (window.App && window.App.showToast) {
      window.App.showToast(`✓ Notlar kaydedildi! Puan: ${score.toFixed(2)}`, 'success');
    }

    this.render();
  },

  // ========================================================
  // 5. KAZANIM ANALİZİ & EKSİK KONU RAPORU
  // ========================================================
  openKazanimAnalyticsView(examId) {
    this.selectedExamId = examId;
    this.activeView = 'kazanim';
    this.render();
  },

  renderKazanimAnalyticsView(container) {
    const exam = window.Store.getMockExamById(this.selectedExamId);
    if (!exam) {
      this.activeView = 'list';
      this.render();
      return;
    }

    const subjects = exam.subjects || [];

    container.innerHTML = `
      <div class="space-y-4 max-w-7xl mx-auto animate-fade-in pb-12">
        <!-- Üst Başlık -->
        <div class="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <button type="button" onclick="window.MockExamModule.openResultsView('${exam.id}')"
              class="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black transition cursor-pointer">
              ←
            </button>
            <div>
              <h2 class="text-base sm:text-lg font-black text-slate-900 leading-tight">
                🎯 Soru & Kazanım Analiz Raporu
              </h2>
              <p class="text-xs text-slate-500 font-medium">
                ${exam.title} • Her dersin kazanım dağılımı ve soru konuları
              </p>
            </div>
          </div>
        </div>

        <!-- Ders Bazında Kazanım Dağılım Kartları -->
        <div class="space-y-4">
          ${subjects.map(sub => {
            const kazanimlar = sub.kazanimlar || {};
            const qCount = sub.questionCount || 0;
            return `
              <div class="bg-white rounded-3xl shadow-xs border border-slate-200 p-5 space-y-3">
                <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 class="font-black text-slate-900 text-sm flex items-center gap-2">
                    <span>📘</span> ${sub.name} (${qCount} Soru • Katsayı: ${sub.coefficient})
                  </h3>
                  <span class="text-xs font-mono font-bold text-slate-500">
                    Tanımlı Kazanım: ${Object.keys(kazanimlar).length} / ${qCount}
                  </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  ${Array.from({ length: qCount }).map((_, i) => {
                    const q = i + 1;
                    const k = kazanimlar[q] || '<span class="italic text-slate-400">Kazanım tanımlanmadı</span>';
                    return `
                      <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
                        <span class="w-6 h-6 rounded-md bg-purple-100 text-purple-900 font-mono font-black text-xs flex items-center justify-center flex-shrink-0">
                          ${q}
                        </span>
                        <div class="flex-1 font-medium text-slate-800 leading-snug">
                          ${k}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // ========================================================
  // 6. VELİYE WHATSAPP DENEME KARNESİ GÖNDERME
  // ========================================================
  shareStudentWhatsAppCarnet(examId, studentId) {
    const exam = window.Store.getMockExamById(examId);
    const student = window.Store.getStudentById(studentId);
    if (!exam || !student) return;

    const studentRecord = (exam.scores && exam.scores[studentId]) || { subjects: {}, totalScore: 0, totalNet: 0 };
    const curScores = studentRecord.subjects || {};
    const subjects = exam.subjects || [];

    const settings = window.Store.getSettings();
    const instName = settings.institutionName || 'Ömer Avniyel Akademi';

    let msg = `*${instName}*\n`;
    msg += `🎯 *KURUMSAL DENEME SINAVI KARNESİ*\n\n`;
    msg += `👤 *Talebe:* ${student.firstName} ${student.lastName} (${student.className || ''})\n`;
    msg += `📝 *Sınav:* ${exam.title}\n`;
    msg += `📅 *Tarih:* ${exam.date}\n`;
    msg += `🏆 *500 Üzerinden Puan:* *${(studentRecord.totalScore || 0).toFixed(2)}*\n`;
    msg += `🎯 *Toplam Net:* *${(studentRecord.totalNet || 0).toFixed(2)}*\n\n`;
    msg += `📚 *Ders Bazlı Net Dağılımı:*\n`;

    subjects.forEach(s => {
      const sc = curScores[s.id] || { correct: 0, wrong: 0, empty: s.questionCount, net: 0 };
      msg += `• *${s.name}:* ${sc.correct}D ${sc.wrong}Y ➔ *${sc.net.toFixed(2)} Net* (Katsayı: ${s.coefficient})\n`;
    });

    msg += `\nTalebemizi azminden dolayı tebrik eder, muvaffakiyetlerinin devamını dileriz.`;

    const phone = (student.parentPhone || student.fatherPhone || '').replace(/\D/g, '');
    let url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    if (phone && phone.length >= 10) {
      const fullPhone = phone.startsWith('90') ? phone : ('90' + phone.replace(/^0/, ''));
      url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`;
    }

    window.open(url, '_blank');
  },

  escapeHtml(text) {
    if (!text) return '';
    return text.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
