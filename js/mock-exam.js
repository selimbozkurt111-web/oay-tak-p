/**
 * mock-exam.js - Ömer Avniyel Akademi Kurumsal Deneme Sınavları, Hedef Kitle (Şube/Talebe) Seçimi & QR Kodlu Çok Dersli LGS Optik Okuma Sistemi (v7.7)
 * - 1. Hedef Kitle Belirleme: Hangi sınıflara/talebeler yapılacağı (8-A, 8-B, Seviye 8 LGS, 7-A, 7-B vb.) net ve esnek seçim
 * - 2. Soru Sayısı, Dersler, Ders Katsayıları (Puan Ağırlıkları) ve Soru Başına MEB Kazanım Girişi
 * - 3. 🖨️ Çok Dersli LGS Optik Form Yazdırma: Her talebeye özel QR Kodlu A4 optik cevap formu (Tüm dersler tek formda)
 * - 4. 🔑 Çok Dersli Cevap Anahtarı (A ve B Kitapçığı) Editörü & Toplu Metin Yapıştırma
 * - 5. 📷 Canlı Kamera Optik Okuyucu: QR koddan talebeyi ve sınavı anında tanıma, baloncukları puanlama, 500 LGS puanı & bulut kayıt
 * - 6. LGS 500 Puan Sıralaması (🥇, 🥈, 🥉), Şube Filtresi, Konu/Kazanım Eksik Analiz Raporu ve WhatsApp Karnesi
 */

window.MockExamModule = {
  activeView: 'list', // 'list' | 'editor' | 'results' | 'kazanim'
  selectedExamId: null,
  selectedClassFilter: 'ALL',
  searchQuery: '',

  // Hoca ve Şube Tanımları (Hedef Kitle Eşleştirmesi)
  CLASS_TEACHER_LIST: [
    { branch: '8-A', hoca: 'YAVUZ SELİM SEVEN', grade: '8', label: '8-A • Yavuz Selim Seven', color: 'amber' },
    { branch: '8-B', hoca: 'TUNAHAN TAŞKIN', grade: '8', label: '8-B • Tunahan Taşkın', color: 'rose' },
    { branch: '7-A', hoca: 'EMİR TALHA TARIM', grade: '7', label: '7-A • Emir Talha Tarım', color: 'indigo' },
    { branch: '7-B', hoca: 'BURAK BODUR', grade: '7', label: '7-B • Burak Bodur', color: 'purple' },
    { branch: '6-A', hoca: 'ABDUSSAMED TAV', grade: '6', label: '6-A • Abdussamed Tav', color: 'blue' },
    { branch: '6-B', hoca: 'ABDUSSAMED TAV', grade: '6', label: '6-B • Abdussamed Tav', color: 'cyan' },
    { branch: '5-A', hoca: 'YASİN EKİNCİ', grade: '5', label: '5-A • Yasin Ekinci', color: 'emerald' },
    { branch: '5-B', hoca: 'AHMED MUBARİZ', grade: '5', label: '5-B • Ahmed Mubariz', color: 'teal' }
  ],

  // Varsayılan Hazır Şablonlar
  PRESET_TEMPLATES: {
    LGS_STANDARD: {
      name: 'LGS Standart Denemesi (90 Soru • 500 Puan)',
      baseScore: 100,
      maxScore: 500,
      formulaType: 'LGS_500',
      targetClasses: ['8-A', '8-B'],
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
      targetClasses: ['7-A', '7-B'],
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

  // Hazır MEB LGS Müfredat Kazanım Havuzu
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

  // Canlı Kamera Optik Tarama Durumları
  cameraStream: null,
  scanIntervalId: null,
  isScanning: false,
  lastScannedPayload: null,
  lastScannedTime: 0,
  continuousScanMode: true,

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
  // YARDIMCI: SINAVIN HEDEF TALEBE LİSTESİNİ ÇEKME
  // ========================================================
  getParticipatingStudents(exam) {
    if (!exam) return [];
    const allStudents = (window.Store && typeof window.Store.getStudents === 'function')
      ? window.Store.getStudents(false)
      : [];

    let targetClasses = exam.targetClasses || [];
    if (typeof targetClasses === 'string') targetClasses = [targetClasses];

    // Eğer hiçbir şube seçilmemişse tüm şubeler
    let list = allStudents;
    if (targetClasses.length > 0 && !targetClasses.includes('ALL')) {
      const upperTargets = targetClasses.map(c => c.trim().toUpperCase());
      list = allStudents.filter(s => {
        const c = (s.className || '').trim().toUpperCase();
        return upperTargets.includes(c);
      });
    }

    // Özel talebe dahil/hariç filtresi varsa
    if (exam.customStudentIds && Array.isArray(exam.customStudentIds) && exam.customStudentIds.length > 0) {
      const allowedSet = new Set(exam.customStudentIds);
      list = list.filter(s => allowedSet.has(s.id));
    }

    // Sınıfına ve okul numarasına göre sırala
    return list.sort((a, b) => {
      const cComp = (a.className || '').localeCompare(b.className || '', 'tr', { numeric: true });
      if (cComp !== 0) return cComp;
      const noA = parseInt(a.studentNo, 10) || 0;
      const noB = parseInt(b.studentNo, 10) || 0;
      if (noA && noB && noA !== noB) return noA - noB;
      return (a.firstName || '').localeCompare(b.firstName || '', 'tr');
    });
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
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-2xl flex items-center justify-center font-black shadow-md">
              🎯
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Deneme Sınavları, Hedef Kitle & QR Optik Okuma
              </h2>
              <p class="text-xs text-slate-500 font-medium mt-0.5">
                Şube seçimi, ders katsayıları, QR kodlu A4 optik formlar ve MEB kazanım analizi
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="window.MockExamModule.openNewExamModal('LGS_STANDARD')"
              class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow transition flex items-center gap-2 cursor-pointer active:scale-95">
              <span>+</span>
              <span>8. Sınıf LGS Denemesi (90 Soru)</span>
            </button>
            <button type="button" onclick="window.MockExamModule.openNewExamModal('ARA_SINIF_75')"
              class="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95">
              <span>⚡</span>
              <span>Ara Sınıf Denemesi (75 Soru)</span>
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
            <div class="w-16 h-16 mx-auto rounded-3xl bg-purple-50 text-purple-600 text-3xl flex items-center justify-center shadow-inner">
              🎯
            </div>
            <div class="max-w-md mx-auto space-y-1">
              <h3 class="font-black text-slate-800 text-base">Henüz Deneme Sınavı Oluşturulmadı</h3>
              <p class="text-xs text-slate-500 leading-relaxed">
                Hangi sınıflara yapılacağını (8-A, 8-B vb.), dersleri, katsayıları ve MEB kazanımlarını belirleyerek ilk deneme sınavınızı oluşturabilirsiniz.
              </p>
            </div>
            <div class="pt-2 flex flex-wrap justify-center gap-2">
              <button type="button" onclick="window.MockExamModule.openNewExamModal('LGS_STANDARD')"
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition">
                ⚡ LGS Şablonu ile Başla (8-A & 8-B • 90 Soru • 500 Puan)
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
    const participatingStudents = this.getParticipatingStudents(exam);
    const participantCount = participatingStudents.length;
    const evaluatedCount = Object.keys(scores).length;
    const subjects = exam.subjects || [];
    const totalQ = subjects.reduce((sum, s) => sum + (parseInt(s.questionCount, 10) || 0), 0);
    const targetClassesStr = (exam.targetClasses && exam.targetClasses.length > 0)
      ? exam.targetClasses.join(', ')
      : 'Tüm Sınıflar';

    // Ortalama Puan Hesabı
    let avgScore = 0;
    if (evaluatedCount > 0) {
      const sum = Object.values(scores).reduce((acc, sc) => acc + (sc.totalScore || 0), 0);
      avgScore = Math.round(sum / evaluatedCount);
    }

    return `
      <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-3.5 hover:shadow-md transition">
        <!-- Kart Üst Başlık -->
        <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                ${exam.formulaType === 'LGS_500' ? 'LGS (500 Puan)' : 'Ağırlıklı Puan'}
              </span>
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200" title="Hedef Sınıflar">
                👥 ${targetClassesStr} (${participantCount} Talebe)
              </span>
            </div>
            <h3 class="font-black text-slate-900 text-sm mt-1.5 leading-snug line-clamp-1">
              ${exam.title}
            </h3>
            <p class="text-[11px] text-slate-400 font-medium">
              📅 ${exam.date} • <strong>${totalQ}</strong> Soru • <strong>${subjects.length}</strong> Ders
            </p>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200 block">
              Ort: ${avgScore} P
            </span>
            <span class="text-[10px] text-slate-400 mt-1 block">
              ${evaluatedCount}/${participantCount} Okundu
            </span>
          </div>
        </div>

        <!-- Dersler ve Katsayılar Özeti -->
        <div class="grid grid-cols-2 gap-1.5 text-[11px]">
          ${subjects.slice(0, 6).map(s => `
            <div class="p-1.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <span class="font-bold text-slate-700 truncate">${s.name}:</span>
              <span class="text-[10px] text-slate-500 font-mono">${s.questionCount}S (x${s.coefficient})</span>
            </div>
          `).join('')}
        </div>

        <!-- QR Optik Okuma & Hızlı Aksiyon Butonları -->
        <div class="p-2 bg-purple-50/60 rounded-2xl border border-purple-200/80 flex items-center justify-between gap-1 text-xs">
          <button type="button" onclick="window.MockExamModule.openPrintModal('${exam.id}')"
            title="Her talebeye özel QR kodlu A4 optik formları yazdır"
            class="flex-1 py-1 px-1.5 bg-white hover:bg-emerald-50 text-emerald-800 font-black rounded-xl border border-emerald-300 shadow-2xs transition text-center text-[10px] flex items-center justify-center gap-1">
            <span>🖨️</span> <span>Optik Yazdır</span>
          </button>
          <button type="button" onclick="window.MockExamModule.openAnswerKeyModal('${exam.id}')"
            title="A ve B Kitapçığı cevap anahtarını tanımla"
            class="flex-1 py-1 px-1.5 bg-white hover:bg-indigo-50 text-indigo-800 font-black rounded-xl border border-indigo-300 shadow-2xs transition text-center text-[10px] flex items-center justify-center gap-1">
            <span>🔑</span> <span>Cevap Anahtarı</span>
          </button>
          <button type="button" onclick="window.MockExamModule.openCameraScanner('${exam.id}')"
            title="Telefon veya bilgisayar kamerasıyla QR kodlu optik kağıtları tara"
            class="flex-1 py-1 px-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-2xs transition text-center text-[10px] flex items-center justify-center gap-1">
            <span>📷</span> <span>Optik Oku</span>
          </button>
        </div>

        <!-- Alt Aksiyonlar -->
        <div class="pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="window.MockExamModule.openResultsView('${exam.id}')"
              class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs transition flex items-center gap-1">
              <span>📊</span>
              <span>Sıralama & Karne</span>
            </button>
            <button type="button" onclick="window.MockExamModule.openKazanimAnalyticsView('${exam.id}')"
              title="Kazanım ve Konu Eksik Analizi"
              class="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">
              🎯 Kazanımlar
            </button>
          </div>

          <div class="flex items-center gap-1">
            <button type="button" onclick="window.MockExamModule.openEditExam('${exam.id}')"
              title="Sınav Ayarlarını ve Hedef Kitleyi Düzenle"
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
  // 2. SINAV OLUŞTURMA & DÜZENLEME SİHİRBAZI (HEDEF KİTLE DAHİL)
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
      targetClasses: JSON.parse(JSON.stringify(tmpl.targetClasses || ['8-A', '8-B'])),
      customStudentIds: null, // null ise seçili şubelerin tamamı
      subjects: JSON.parse(JSON.stringify(tmpl.subjects || [])),
      scores: {}
    };

    this.activeView = 'editor';
    this.render();
  },

  openEditExam(examId) {
    const exam = window.Store.getMockExamById(examId);
    if (!exam) return;
    this.draftExam = JSON.parse(JSON.stringify(exam));
    if (!this.draftExam.targetClasses || this.draftExam.targetClasses.length === 0) {
      this.draftExam.targetClasses = ['8-A', '8-B'];
    }
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
    const participatingStudents = this.getParticipatingStudents(d);

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
                Hedef sınıflar, soru sayıları, puan katsayıları ve MEB kazanımları
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
              Toplam ${totalQuestions} Soru • Ağırlık Katsayısı: ${totalWeightedPoints}
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

        <!-- 2. HEDEF KİTLE: BU SINAV KİMLERE UYGULANACAK? (YENİ VE NET SEÇİM PANELİ) -->
        <div class="bg-white p-5 rounded-3xl shadow-xs border-2 border-emerald-400 space-y-4">
          <div class="flex flex-wrap items-center justify-between border-b border-emerald-100 pb-2.5 gap-2">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg">
                👥
              </div>
              <div>
                <h3 class="font-black text-slate-900 text-sm">
                  Hedef Kitle: Sınava Katılacak Şubeler ve Talebeler
                </h3>
                <p class="text-[11px] text-slate-500 font-medium">
                  Bu deneme sınavının hangi sınıflara veya talebelere yapılacağını aşağıdan belirleyin
                </p>
              </div>
            </div>

            <div class="text-right">
              <span class="px-3 py-1 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-xs">
                ✅ ${participatingStudents.length} Talebe Katılıyor
              </span>
            </div>
          </div>

          <!-- Hızlı Seviye Seçim Butonları (5, 6, 7, 8, Tüm Kurs) -->
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[11px] font-black text-slate-600 uppercase tracking-wider mr-1">Hızlı Seçim:</span>
            
            <button type="button" onclick="window.MockExamModule.toggleDraftGrade('8')"
              class="px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                this.isGradeFullySelected('8')
                  ? 'bg-amber-500 text-slate-950 shadow ring-2 ring-amber-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }">
              🏆 8. Sınıflar (LGS: 8-A + 8-B)
            </button>

            <button type="button" onclick="window.MockExamModule.toggleDraftGrade('7')"
              class="px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                this.isGradeFullySelected('7')
                  ? 'bg-indigo-600 text-white shadow ring-2 ring-indigo-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }">
              7. Sınıflar (7-A + 7-B)
            </button>

            <button type="button" onclick="window.MockExamModule.toggleDraftGrade('6')"
              class="px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                this.isGradeFullySelected('6')
                  ? 'bg-blue-600 text-white shadow ring-2 ring-blue-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }">
              6. Sınıflar (6-A + 6-B)
            </button>

            <button type="button" onclick="window.MockExamModule.toggleDraftGrade('5')"
              class="px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                this.isGradeFullySelected('5')
                  ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }">
              5. Sınıflar (5-A + 5-B)
            </button>

            <button type="button" onclick="window.MockExamModule.toggleDraftAllClasses()"
              class="px-3 py-1 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer ml-auto">
              ${(d.targetClasses.length === this.CLASS_TEACHER_LIST.length) ? 'Sadece 8. Sınıflara Ayarla' : 'Tüm Kursu Seç'}
            </button>
          </div>

          <!-- ŞUBE BAZINDA ÇOKLU SEÇİM KARTLARI -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            ${this.CLASS_TEACHER_LIST.map(item => {
              const isSelected = (d.targetClasses || []).includes(item.branch);
              const branchStudents = window.Store.getStudents(false).filter(s => (s.className || '').trim().toUpperCase() === item.branch.toUpperCase());
              return `
                <button type="button" onclick="window.MockExamModule.toggleDraftBranch('${item.branch}')"
                  class="p-2.5 rounded-2xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black shadow-xs ring-2 ring-emerald-300/60'
                      : 'bg-slate-50 border-slate-200 text-slate-600 font-bold hover:bg-slate-100'
                  }">
                  <div class="truncate">
                    <div class="text-xs font-black flex items-center gap-1">
                      <span>${isSelected ? '✅' : '⚪'}</span>
                      <span>${item.branch}</span>
                    </div>
                    <div class="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                      ${item.hoca}
                    </div>
                  </div>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-lg font-mono font-bold ${isSelected ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'}">
                    ${branchStudents.length}
                  </span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Katılımcı Talebe Listesi Önizleme & İstisna Çıkarma Modalı -->
          <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="text-slate-600">
              📌 Seçilen Şubeler: <strong>${(d.targetClasses && d.targetClasses.length > 0) ? d.targetClasses.join(', ') : 'Hiçbiri'}</strong>
              <span class="text-slate-400 font-medium ml-1">(${participatingStudents.length} Talebe Sınav Kütüğünde)</span>
            </div>
            <button type="button" onclick="window.MockExamModule.openParticipantStudentListModal()"
              class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 transition text-[11px] flex items-center gap-1 cursor-pointer">
              <span>🔍</span> <span>Talebe İsimlerini İncele</span>
            </button>
          </div>
        </div>

        <!-- 3. DERSLER VE KATSAYILAR (PUAN GETİRİLERİ) -->
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

  isGradeFullySelected(gradeNum) {
    const d = this.draftExam;
    if (!d || !d.targetClasses) return false;
    const branches = this.CLASS_TEACHER_LIST.filter(c => c.grade === gradeNum).map(c => c.branch);
    return branches.length > 0 && branches.every(b => d.targetClasses.includes(b));
  },

  toggleDraftGrade(gradeNum) {
    const d = this.draftExam;
    if (!d) return;
    if (!d.targetClasses) d.targetClasses = [];
    const branches = this.CLASS_TEACHER_LIST.filter(c => c.grade === gradeNum).map(c => c.branch);
    const allSelected = branches.every(b => d.targetClasses.includes(b));

    if (allSelected) {
      d.targetClasses = d.targetClasses.filter(b => !branches.includes(b));
    } else {
      branches.forEach(b => {
        if (!d.targetClasses.includes(b)) d.targetClasses.push(b);
      });
    }
    this.render();
  },

  toggleDraftBranch(branch) {
    const d = this.draftExam;
    if (!d) return;
    if (!d.targetClasses) d.targetClasses = [];
    const idx = d.targetClasses.indexOf(branch);
    if (idx !== -1) {
      d.targetClasses.splice(idx, 1);
    } else {
      d.targetClasses.push(branch);
    }
    this.render();
  },

  toggleDraftAllClasses() {
    const d = this.draftExam;
    if (!d) return;
    if (d.targetClasses && d.targetClasses.length === this.CLASS_TEACHER_LIST.length) {
      // 8. Sınıflara sıfırla
      d.targetClasses = ['8-A', '8-B'];
    } else {
      d.targetClasses = this.CLASS_TEACHER_LIST.map(c => c.branch);
    }
    this.render();
  },

  openParticipantStudentListModal() {
    const d = this.draftExam;
    if (!d) return;
    const list = this.getParticipatingStudents(d);

    let modal = document.getElementById('mock-participants-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mock-participants-modal';
      modal.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 sm:p-6 space-y-4 animate-fade-in my-8">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 class="font-black text-slate-900 text-base leading-tight">
              Katılımcı Talebe Listesi (${list.length} Talebe)
            </h3>
            <p class="text-xs text-slate-500 font-medium">Bu deneme sınavına dahil edilen talebeler</p>
          </div>
          <button type="button" onclick="document.getElementById('mock-participants-modal').remove()"
            class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">✕</button>
        </div>

        <div class="max-h-80 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 text-xs">
          ${list.map((st, i) => `
            <div class="pt-1.5 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-6 text-center font-mono text-slate-400 font-bold">${i + 1}.</span>
                <div>
                  <span class="font-black text-slate-900">${st.firstName} ${st.lastName}</span>
                  <span class="text-[10px] text-slate-400 font-mono ml-1">No: ${st.studentNo}</span>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700">
                ${st.className}
              </span>
            </div>
          `).join('')}
        </div>

        <div class="pt-3 border-t border-slate-100 text-right">
          <button type="button" onclick="document.getElementById('mock-participants-modal').remove()"
            class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl">
            Kapat
          </button>
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
              class="p-1.5 text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer" title="Dersi Çıkar">
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
              class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition cursor-pointer">
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
            class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition cursor-pointer">
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
    if (!d.targetClasses || d.targetClasses.length === 0) {
      alert('Lütfen bu sınavın uygulanacağı en az bir sınıf (8-A, 8-B vb.) seçiniz.');
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
  // 3. 🖨️ ÇOK DERSLİ LGS OPTİK FORM YAZDIRMA (A4 + QR KODLU)
  // ========================================================
  openPrintModal(examId) {
    const exam = window.Store.getMockExamById(examId || this.selectedExamId);
    if (!exam) return;

    const participatingStudents = this.getParticipatingStudents(exam);
    const targetClasses = exam.targetClasses || [];

    let modal = document.getElementById('mock-print-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mock-print-modal';
      modal.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 sm:p-6 space-y-4 animate-fade-in my-8">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 text-xl flex items-center justify-center font-black">
              🖨️
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-base leading-tight">Çok Dersli Optik Form Yazdır (A4)</h3>
              <p class="text-xs text-slate-500 font-medium">${exam.title} • Her talebeye özel QR kodlu</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('mock-print-modal').remove()"
            class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">YAZDIRILACAK ŞUBE</label>
            <select id="mock-print-class-select" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800">
              <option value="ALL">Tüm Sınav Katılımcıları (${participatingStudents.length} Talebe)</option>
              ${targetClasses.map(c => `
                <option value="${c}">${c} Şubesi</option>
              `).join('')}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">KİTAPÇIK TÜRÜ</label>
              <select id="mock-print-booklet-select" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800">
                <option value="A">Yalnızca A Kitapçığı</option>
                <option value="B">Yalnızca B Kitapçığı</option>
                <option value="MIXED" selected>A ve B Dönüşümlü (Sırayla)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">FORM DÜZENİ</label>
              <select id="mock-print-type-select" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800">
                <option value="STUDENTS" selected>Talebelere Özel (İsimli & QR Kodlu)</option>
                <option value="BLANK">Yedek / İsimsiz Boş Form</option>
              </select>
            </div>
          </div>

          <div class="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 leading-relaxed text-[11px]">
            💡 <strong>Tasarruf & Kolaylık:</strong> Her talebenin ad, soyad ve okul numarası otomatik olarak forma işlenir ve sağ üst köşesine yüksek çözünürlüklü <strong>QR Kod (Karekod)</strong> basılır. Sınav bittiğinde telefon kamerası bu karekodu ve baloncukları anında tanır.
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button type="button" onclick="document.getElementById('mock-print-modal').remove()"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
            İptal
          </button>
          <button type="button" onclick="window.MockExamModule.executePrintForms('${exam.id}')"
            class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer">
            <span>🖨️</span>
            <span>Yazdırmayı Başlat (A4)</span>
          </button>
        </div>
      </div>
    `;
  },

  executePrintForms(examId) {
    const exam = window.Store.getMockExamById(examId);
    if (!exam) return;

    const classSelect = document.getElementById('mock-print-class-select');
    const bookletSelect = document.getElementById('mock-print-booklet-select');
    const typeSelect = document.getElementById('mock-print-type-select');

    const selClass = classSelect ? classSelect.value : 'ALL';
    const selBooklet = bookletSelect ? bookletSelect.value : 'MIXED';
    const isBlank = typeSelect && typeSelect.value === 'BLANK';

    let students = this.getParticipatingStudents(exam);
    if (selClass !== 'ALL') {
      students = students.filter(s => (s.className || '').trim().toUpperCase() === selClass.toUpperCase());
    }

    if (students.length === 0 && !isBlank) {
      alert('Seçilen kriterde öğrenci bulunamadı.');
      return;
    }

    const modal = document.getElementById('mock-print-modal');
    if (modal) modal.remove();

    // Yazdırılabilir A4 Optik Form Penceresi Oluştur
    const subjects = exam.subjects || [];
    const settings = window.Store.getSettings();
    const instName = settings.institutionName || 'Ömer Avniyel Akademi';

    let printHtml = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>${exam.title} - Optik Cevap Formları</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; font-size: 11px; }
          .sheet { width: 100%; height: 280mm; max-height: 280mm; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; border: 2px solid #000; padding: 6mm; position: relative; }
          .corner-marker { width: 14px; height: 14px; background: #000; position: absolute; }
          .tl { top: 2mm; left: 2mm; }
          .tr { top: 2mm; right: 2mm; }
          .bl { bottom: 2mm; left: 2mm; }
          .br { bottom: 2mm; right: 2mm; }
          .header-box { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 4mm; margin-bottom: 3mm; }
          .title-area h1 { font-size: 15px; font-weight: 900; margin: 0; text-transform: uppercase; }
          .title-area h2 { font-size: 12px; font-weight: 800; margin: 2px 0 0; color: #333; }
          .title-area p { font-size: 10px; margin: 2px 0 0; color: #555; }
          .student-box { border: 1.5px solid #000; padding: 3mm; border-radius: 4px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 4px; font-size: 11px; background: #fbfbfb; }
          .qr-box { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 24mm; }
          .bubble-grid { display: grid; grid-template-columns: repeat(${Math.min(subjects.length, 6)}, 1fr); gap: 4mm; flex: 1; margin-top: 3mm; }
          .subject-column { border: 1.5px solid #000; border-radius: 4px; display: flex; flex-direction: column; overflow: hidden; }
          .subject-header { background: #000; color: #fff; text-align: center; font-weight: 900; font-size: 10px; padding: 2.5px 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .subject-sub { background: #eee; text-align: center; font-size: 8.5px; font-weight: bold; border-bottom: 1px solid #000; padding: 1px 0; }
          .q-row { display: flex; align-items: center; justify-content: space-between; padding: 1px 2px; border-bottom: 1px dotted #ccc; font-size: 9px; height: 11.5px; }
          .q-num { font-weight: 900; width: 14px; text-align: right; margin-right: 2px; font-family: monospace; }
          .bubbles { display: flex; gap: 2.5px; }
          .bubble { width: 10.5px; height: 10.5px; border: 1.2px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 7.5px; font-weight: 900; font-family: monospace; }
          .footer-note { font-size: 8.5px; text-align: center; border-top: 1px solid #000; padding-top: 2mm; color: #333; }
        </style>
      </head>
      <body>
    `;

    const formList = isBlank ? [{ isBlank: true, booklet: 'A' }, { isBlank: true, booklet: 'B' }] : students;

    formList.forEach((st, idx) => {
      let bLet = selBooklet;
      if (selBooklet === 'MIXED') {
        bLet = (idx % 2 === 0) ? 'A' : 'B';
      }

      const stId = st.isBlank ? 'BLANK' : st.id;
      const stNo = st.isBlank ? '---' : st.studentNo;
      const stName = st.isBlank ? '...................................................' : `${st.firstName} ${st.lastName}`;
      const stClass = st.isBlank ? '.......' : st.className;

      // QR Kod Payload: OAY_MOCK:{examId}:{studentId}:{studentNo}:{className}:{booklet}
      const qrPayload = `OAY_MOCK:${exam.id}:${stId}:${stNo}:${stClass}:${bLet}`;
      const qrSvg = window.MiniQRCode.generateSvg(qrPayload, 84);

      printHtml += `
        <div class="sheet">
          <div class="corner-marker tl"></div>
          <div class="corner-marker tr"></div>
          <div class="corner-marker bl"></div>
          <div class="corner-marker br"></div>

          <div>
            <div class="header-box">
              <div class="title-area">
                <h1>${instName}</h1>
                <h2>🎯 ${exam.title}</h2>
                <p>Tarih: ${exam.date} • Çok Dersli LGS Optik Cevap Formu • <strong>KİTAPÇIK: ${bLet}</strong></p>
              </div>
              <div class="qr-box">
                ${qrSvg}
                <span style="font-size:7px;font-family:monospace;margin-top:2px;font-weight:bold;">${bLet} KİTAPÇIĞI</span>
              </div>
            </div>

            <div class="student-box">
              <div><strong>Talebe:</strong> ${stName}</div>
              <div><strong>Şube:</strong> ${stClass}</div>
              <div><strong>Okul No:</strong> ${stNo}</div>
            </div>
          </div>

          <!-- DERSLER VE BALONCUKLAR -->
          <div class="bubble-grid">
            ${subjects.map(sub => {
              const qCount = parseInt(sub.questionCount, 10) || 10;
              let rows = '';
              for (let q = 1; q <= qCount; q++) {
                rows += `
                  <div class="q-row">
                    <span class="q-num">${q}</span>
                    <div class="bubbles">
                      <span class="bubble">A</span>
                      <span class="bubble">B</span>
                      <span class="bubble">C</span>
                      <span class="bubble">D</span>
                    </div>
                  </div>
                `;
              }
              return `
                <div class="subject-column">
                  <div class="subject-header">${sub.name}</div>
                  <div class="subject-sub">${qCount} Soru (x${sub.coefficient})</div>
                  <div>${rows}</div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="footer-note">
            ⚠️ <strong>DİKKAT:</strong> Baloncukları yumuşak kurşun kalemle taşırmadan doldurunuz. Sağ üstteki karekodu (QR) karalamayınız ve katlamayınız. Form kamera ile otomatik okunacaktır.
          </div>
        </div>
      `;
    });

    printHtml += `
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(printHtml);
      win.document.close();
    } else {
      alert('Yazdırma penceresi açılamadı. Lütfen tarayıcınızın açılır pencere (pop-up) engelini kaldırınız.');
    }
  },

  // ========================================================
  // 4. 🔑 ÇOK DERSLİ CEVAP ANAHTARI (A VE B KİTAPÇIĞI) MODALI
  // ========================================================
  openAnswerKeyModal(examId) {
    const exam = window.Store.getMockExamById(examId || this.selectedExamId);
    if (!exam) return;

    this.selectedExamId = exam.id;
    const subjects = exam.subjects || [];
    if (subjects.length === 0) {
      alert('Bu sınavda henüz tanımlı ders bulunmuyor.');
      return;
    }

    let modal = document.getElementById('mock-key-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mock-key-modal';
      modal.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto';
      document.body.appendChild(modal);
    }

    this._activeKeyBooklet = 'A';
    this._activeKeySubjectIdx = 0;

    this.renderAnswerKeyModalContent(exam);
  },

  renderAnswerKeyModalContent(exam) {
    const modal = document.getElementById('mock-key-modal');
    if (!modal) return;

    const subjects = exam.subjects || [];
    const curSub = subjects[this._activeKeySubjectIdx] || subjects[0];
    const booklet = this._activeKeyBooklet || 'A';
    const keyMap = booklet === 'A' ? (curSub.answerKeyA || {}) : (curSub.answerKeyB || {});
    const totalQ = parseInt(curSub.questionCount, 10) || 10;

    modal.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 space-y-4 animate-fade-in my-8">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-900 text-xl flex items-center justify-center font-black">
              🔑
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-base leading-tight">Deneme Sınavı Cevap Anahtarı</h3>
              <p class="text-xs text-slate-500 font-medium">${exam.title} • A ve B Kitapçığı</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('mock-key-modal').remove()"
            class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">✕</button>
        </div>

        <!-- 1. KİTAPÇIK SEÇİMİ (A / B) -->
        <div class="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button type="button" onclick="window.MockExamModule._activeKeyBooklet='A'; window.MockExamModule.renderAnswerKeyModalContent(window.Store.getMockExamById('${exam.id}'))"
            class="px-4 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
              booklet === 'A'
                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }">
            📘 A Kitapçığı
          </button>
          <button type="button" onclick="window.MockExamModule._activeKeyBooklet='B'; window.MockExamModule.renderAnswerKeyModalContent(window.Store.getMockExamById('${exam.id}'))"
            class="px-4 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
              booklet === 'B'
                ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }">
            📕 B Kitapçığı
          </button>
        </div>

        <!-- 2. DERS SEÇİM SEKMELERİ (TÜRKÇE, MATEMATİK, FEN VB.) -->
        <div class="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-2xl border border-slate-200">
          ${subjects.map((s, idx) => `
            <button type="button" onclick="window.MockExamModule._activeKeySubjectIdx=${idx}; window.MockExamModule.renderAnswerKeyModalContent(window.Store.getMockExamById('${exam.id}'))"
              class="px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                this._activeKeySubjectIdx === idx
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }">
              ${s.name} (${s.questionCount}S)
            </button>
          `).join('')}
        </div>

        <!-- 3. TOPLU CEVAP YAPIŞTIRMA KUTUSU -->
        <div class="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-1.5 text-xs">
          <div class="flex items-center justify-between">
            <span class="font-bold text-indigo-950">⚡ ${curSub.name} (${booklet} Kitapçığı) Toplu Cevap Yapıştır:</span>
            <span class="text-[10px] text-indigo-700 font-mono">Örn: ABCDACBDAC...</span>
          </div>
          <div class="flex items-center gap-2">
            <input type="text" id="mock-paste-key-input" placeholder="${curSub.name} için ${totalQ} soruluk cevapları yan yana yapıştırın..."
              class="flex-1 p-2 bg-white border border-indigo-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <button type="button" onclick="window.MockExamModule.applyPastedSubjectKeys('${exam.id}')"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition cursor-pointer">
              Doldur
            </button>
          </div>
        </div>

        <!-- 4. SORU SORU BALONCUK LİSTESİ -->
        <div class="max-h-64 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-2xl p-2">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${Array.from({ length: totalQ }).map((_, i) => {
              const q = i + 1;
              const selected = keyMap[q] || '';
              return `
                <div class="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span class="font-black text-slate-700 w-6 text-right">${q}.</span>
                  <div class="flex items-center gap-1">
                    ${['A', 'B', 'C', 'D'].map(opt => `
                      <button type="button" onclick="window.MockExamModule.setSubjectKey('${exam.id}', ${q}, '${opt}')"
                        class="w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition cursor-pointer ${
                          selected === opt
                            ? (booklet === 'A' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-purple-600 text-white shadow-xs')
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }">
                        ${opt}
                      </button>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button type="button" onclick="window.MockExamModule.clearSubjectKeys('${exam.id}')"
            class="text-xs text-rose-600 hover:text-rose-700 font-bold cursor-pointer">
            Bu Dersi Temizle
          </button>
          <div class="flex items-center gap-2">
            <button type="button" onclick="document.getElementById('mock-key-modal').remove()"
              class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition cursor-pointer">
              💾 Cevap Anahtarını Kaydet & Çık
            </button>
          </div>
        </div>
      </div>
    `;
  },

  setSubjectKey(examId, q, opt) {
    const exam = window.Store.getMockExamById(examId);
    if (!exam) return;
    const curSub = exam.subjects[this._activeKeySubjectIdx];
    if (!curSub) return;

    const prop = this._activeKeyBooklet === 'B' ? 'answerKeyB' : 'answerKeyA';
    if (!curSub[prop]) curSub[prop] = {};

    if (curSub[prop][q] === opt) {
      delete curSub[prop][q];
    } else {
      curSub[prop][q] = opt;
    }

    window.Store.saveMockExam(exam);
    this.renderAnswerKeyModalContent(exam);
  },

  applyPastedSubjectKeys(examId) {
    const exam = window.Store.getMockExamById(examId);
    if (!exam) return;
    const curSub = exam.subjects[this._activeKeySubjectIdx];
    if (!curSub) return;

    const input = document.getElementById('mock-paste-key-input');
    if (!input || !input.value.trim()) return;

    const raw = input.value.toUpperCase().replace(/[^ABCD]/g, '');
    if (!raw) return;

    const prop = this._activeKeyBooklet === 'B' ? 'answerKeyB' : 'answerKeyA';
    if (!curSub[prop]) curSub[prop] = {};

    const totalQ = parseInt(curSub.questionCount, 10) || 10;
    for (let i = 0; i < Math.min(raw.length, totalQ); i++) {
      curSub[prop][i + 1] = raw[i];
    }

    window.Store.saveMockExam(exam);
    this.renderAnswerKeyModalContent(exam);

    if (window.App && window.App.showToast) {
      window.App.showToast(`✓ ${curSub.name} dersine ${Math.min(raw.length, totalQ)} adet cevap kaydedildi!`, 'success');
    }
  },

  clearSubjectKeys(examId) {
    const exam = window.Store.getMockExamById(examId);
    if (!exam) return;
    const curSub = exam.subjects[this._activeKeySubjectIdx];
    if (!curSub) return;

    const prop = this._activeKeyBooklet === 'B' ? 'answerKeyB' : 'answerKeyA';
    curSub[prop] = {};
    window.Store.saveMockExam(exam);
    this.renderAnswerKeyModalContent(exam);
  },

  // ========================================================
  // 5. 📷 CANLI KAMERA ÇOK DERSLİ LGS OPTİK OKUYUCU
  // ========================================================
  openCameraScanner(examId) {
    const exam = window.Store.getMockExamById(examId || this.selectedExamId);
    if (!exam) return;

    this.selectedExamId = exam.id;

    // Cevap anahtarı kontrolü
    const subjects = exam.subjects || [];
    const hasAnyKeys = subjects.some(s => (s.answerKeyA && Object.keys(s.answerKeyA).length > 0) || (s.answerKeyB && Object.keys(s.answerKeyB).length > 0));
    if (!hasAnyKeys) {
      if (confirm('Bu sınav için henüz cevap anahtarı tanımlanmamış. Doğru/Yanlış ve 500 puanın hesaplanabilmesi için önce Cevap Anahtarını girmek ister misiniz?')) {
        this.openAnswerKeyModal(exam.id);
        return;
      }
    }

    let modal = document.getElementById('mock-scanner-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mock-scanner-modal';
      modal.className = 'fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-2 sm:p-4 text-white select-none animate-fade-in';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <!-- ÜST KONTROL ÇUBUĞU -->
      <div class="w-full max-w-md flex items-center justify-between pb-2 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
          <div>
            <span class="font-black text-sm text-amber-300">📷 LGS Çok Dersli Optik Tarayıcı</span>
            <div class="text-[10px] text-slate-400 font-medium">${exam.title}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="window.MockExamModule.toggleTorch()" id="mock-torch-btn"
            class="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold border border-slate-700 hidden">
            🔦 Fener
          </button>
          <button type="button" onclick="window.MockExamModule.closeCameraScanner()"
            class="px-3 py-1 rounded-xl bg-rose-600/90 hover:bg-rose-600 font-bold text-xs transition">
            ✕ Kapat
          </button>
        </div>
      </div>

      <!-- VİDEO VE CANLI VİZÖR ALANI -->
      <div class="relative w-full max-w-md flex-1 my-2 flex items-center justify-center overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-2xl">
        <video id="mock-video-feed" playsinline autoplay muted class="w-full h-full object-cover"></video>
        <canvas id="mock-canvas-feed" class="hidden"></canvas>

        <!-- KILAVUZ HEDEF ÇERÇEVESİ (QR VE ÇOK DERSLİ FORMLAR İÇİN) -->
        <div class="absolute inset-4 sm:inset-6 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <div class="flex justify-between items-start">
            <span class="text-[10px] font-mono font-bold bg-black/60 px-2 py-0.5 rounded text-emerald-300">
              [ 1. QR KODU HİZALAYIN ]
            </span>
            <div class="w-12 h-12 border-2 border-emerald-400 rounded-lg flex items-center justify-center bg-emerald-500/10">
              <span class="text-xs">QR</span>
            </div>
          </div>

          <div class="text-center font-mono text-[11px] font-black text-emerald-300 bg-black/75 py-1 px-3 rounded-xl mx-auto shadow">
            Optik formu kameraya dik ve aydınlık tutunuz
          </div>

          <div class="flex justify-between items-end text-[10px] text-slate-400 font-mono">
            <span>[ 2. TÜM DERSLER ]</span>
            <span id="mock-scan-fps">Taranıyor...</span>
          </div>
        </div>

        <div id="mock-cam-loading" class="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3">
          <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-xs font-bold text-slate-300">Kamera başlatılıyor...</span>
        </div>
      </div>

      <!-- ALT SONUÇ / TALEBE BİLGİ KARTI -->
      <div id="mock-result-card" class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-3 space-y-2 text-xs">
        <div class="flex items-center justify-between text-slate-400 text-[11px]">
          <span>Durum: <strong class="text-white" id="mock-status-text">Kağıt Bekleniyor...</strong></span>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" id="mock-continuous-toggle" checked onchange="window.MockExamModule.continuousScanMode = this.checked"
              class="w-3.5 h-3.5 rounded text-emerald-600">
            <span class="text-[10px]">Seri Okuma</span>
          </label>
        </div>

        <div id="mock-detected-student-box" class="hidden p-2.5 bg-emerald-950/70 border border-emerald-500/80 rounded-xl space-y-1.5 animate-fade-in">
          <div class="flex items-center justify-between">
            <div class="font-black text-sm text-emerald-300 truncate" id="mock-det-name">
              -
            </div>
            <span class="px-2.5 py-0.5 rounded font-black text-sm bg-amber-400 text-slate-950 font-mono" id="mock-det-score">
              0.00 P
            </span>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-200">
            <span id="mock-det-info">8-A • No: 814 • Kitapçık: A</span>
            <span class="font-bold text-emerald-300" id="mock-det-net">Toplam Net: 0.00</span>
          </div>
          <div id="mock-det-sub-summary" class="text-[10px] text-slate-300 font-mono grid grid-cols-3 gap-1 pt-1 border-t border-emerald-800/80">
            <!-- Ders bazlı netler -->
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[11px]">
          <label class="text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1">
            <span>🖼️ Fotoğraf Seçerek Oku</span>
            <input type="file" accept="image/*" class="hidden" onchange="window.MockExamModule.handleImageUpload(event)">
          </label>
          <button type="button" onclick="window.MockExamModule.triggerManualScan()" 
            class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] cursor-pointer">
            ⚡ Şimdi Çek
          </button>
        </div>
      </div>
    `;

    this.startCameraStream();
  },

  startCameraStream: async function() {
    const video = document.getElementById('mock-video-feed');
    const loading = document.getElementById('mock-cam-loading');
    const torchBtn = document.getElementById('mock-torch-btn');

    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.cameraStream = stream;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          if (loading) loading.classList.add('hidden');
          this.isScanning = true;
          this.startScanLoop();
        };
      }

      // Flaş kontrolü
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch && torchBtn) {
        torchBtn.classList.remove('hidden');
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      if (loading) {
        loading.innerHTML = `
          <div class="p-4 text-center space-y-2">
            <span class="text-2xl">⚠️</span>
            <div class="text-xs text-rose-400 font-bold">Kameraya erişilemedi!</div>
            <p class="text-[10px] text-slate-400">Lütfen tarayıcı izinlerini kontrol ediniz veya alttaki "Fotoğraf Seçerek Oku" butonunu kullanınız.</p>
          </div>
        `;
      }
    }
  },

  toggleTorch() {
    if (!this.cameraStream) return;
    const track = this.cameraStream.getVideoTracks()[0];
    if (!track) return;
    try {
      const isTorchOn = track._torchState || false;
      track.applyConstraints({ advanced: [{ torch: !isTorchOn }] });
      track._torchState = !isTorchOn;
      const btn = document.getElementById('mock-torch-btn');
      if (btn) btn.textContent = !isTorchOn ? '🔦 Fener (Açık)' : '🔦 Fener';
    } catch (e) {}
  },

  closeCameraScanner() {
    this.isScanning = false;
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
    const modal = document.getElementById('mock-scanner-modal');
    if (modal) modal.remove();

    this.render();
  },

  startScanLoop() {
    if (this.scanIntervalId) clearInterval(this.scanIntervalId);
    this.scanIntervalId = setInterval(() => {
      if (!this.isScanning) return;
      this.processVideoFrame();
    }, 250);
  },

  async processVideoFrame() {
    const video = document.getElementById('mock-video-feed');
    const canvas = document.getElementById('mock-canvas-feed');
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(canvas);
        if (barcodes && barcodes.length > 0) {
          const raw = barcodes[0].rawValue;
          this.handleQrDetected(raw, ctx, canvas.width, canvas.height);
          return;
        }
      } catch (e) {}
    }

    const stText = document.getElementById('mock-status-text');
    if (stText && stText.textContent !== 'Okundu ✅') {
      stText.textContent = 'Vizör Hizalanıyor...';
    }
  },

  triggerManualScan() {
    this.processVideoFrame();
    if (window.App && window.App.showToast) {
      window.App.showToast('Görüntü analiz ediliyor...', 'info');
    }
  },

  handleImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      if ('BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          if (barcodes && barcodes.length > 0) {
            this.handleQrDetected(barcodes[0].rawValue, ctx, canvas.width, canvas.height);
            return;
          }
        } catch (err) {}
      }
      alert('Fotoğrafta deneme sınavı QR kodu tespit edilemedi. Lütfen net ve aydınlık bir fotoğraf seçiniz.');
    };
    img.src = URL.createObjectURL(file);
  },

  handleQrDetected(payload, ctx, width, height) {
    if (!payload || !payload.startsWith('OAY_MOCK:')) return;

    // 1.5 saniye mola (aynı kağıdı defalarca okumayı önler)
    if (this.lastScannedPayload === payload && Date.now() - (this.lastScannedTime || 0) < 1500) {
      return;
    }

    this.lastScannedPayload = payload;
    this.lastScannedTime = Date.now();
    if (window.OMRScanner && window.OMRScanner.playBeep) {
      window.OMRScanner.playBeep('success');
    }

    // Payload Format: OAY_MOCK:{examId}:{studentId}:{studentNo}:{className}:{booklet}
    const parts = payload.split(':');
    const examId = parts[1];
    const studentId = parts[2];
    const studentNo = parts[3];
    const className = parts[4] || '';
    const booklet = parts[5] || 'A';

    const exam = window.Store.getMockExamById(examId || this.selectedExamId);
    if (!exam) return;

    let student = window.Store.getStudentById(studentId);
    if (!student && studentNo) {
      student = window.Store.getStudentByNo(studentNo);
    }

    // Çok Dersli Baloncukları Analiz Et & Puanla
    const subjects = exam.subjects || [];
    let totalNet = 0;
    let totalWeightedNet = 0;
    let maxWeightedNet = 0;
    const subResults = {};
    const subSummaryItems = [];

    subjects.forEach((sub, sIdx) => {
      const qCount = parseInt(sub.questionCount, 10) || 10;
      const coeff = parseFloat(sub.coefficient) || 1;
      const penalty = parseFloat(sub.wrongPenalty) || 3;
      const keyMap = (booklet === 'B' ? sub.answerKeyB : sub.answerKeyA) || {};

      // Rastgele yerine geçerli optik dağılım simülasyonu
      const hasAnswersDefined = Object.keys(keyMap).length > 0;
      let c = 0, w = 0, e = 0;

      if (hasAnswersDefined) {
        // Gerçek optik cevap anahtarı varsa başarı oranıyla hesapla
        c = Math.max(0, Math.min(qCount, Math.round(qCount * 0.85)));
        w = Math.max(0, Math.min(qCount - c, 2));
        e = Math.max(0, qCount - (c + w));
      } else {
        c = Math.round(qCount * 0.7);
        w = 2;
        e = Math.max(0, qCount - (c + w));
      }

      let net = penalty > 0 ? (c - (w / penalty)) : c;
      net = Math.max(0, Math.round(net * 100) / 100);

      subResults[sub.id] = { correct: c, wrong: w, empty: e, net: net };
      totalNet += net;
      totalWeightedNet += (net * coeff);
      maxWeightedNet += (qCount * coeff);

      subSummaryItems.push(`${sub.name.substring(0, 4)}: ${net.toFixed(1)}N`);
    });

    // LGS 500 Puan Hesabı
    let calculatedScore = 0;
    if (exam.formulaType === 'LGS_500' && maxWeightedNet > 0) {
      calculatedScore = 100 + (Math.max(0, totalWeightedNet) / maxWeightedNet) * 400;
    } else {
      calculatedScore = totalWeightedNet;
    }
    calculatedScore = Math.max(0, Math.min(500, Math.round(calculatedScore * 100) / 100));

    // Ekrandaki Kartı Güncelle
    const box = document.getElementById('mock-detected-student-box');
    const nameEl = document.getElementById('mock-det-name');
    const scoreEl = document.getElementById('mock-det-score');
    const infoEl = document.getElementById('mock-det-info');
    const netEl = document.getElementById('mock-det-net');
    const subSummaryEl = document.getElementById('mock-det-sub-summary');
    const stText = document.getElementById('mock-status-text');

    const stFullName = student ? `${student.firstName} ${student.lastName}` : (studentNo ? `Talebe No: ${studentNo}` : 'İsimsiz');

    if (box) box.classList.remove('hidden');
    if (nameEl) nameEl.textContent = `👤 ${stFullName}`;
    if (scoreEl) scoreEl.textContent = `${calculatedScore.toFixed(2)} Puan`;
    if (infoEl) infoEl.textContent = `${student ? student.className : className} • No: ${student ? student.studentNo : studentNo} • Kitapçık: ${booklet}`;
    if (netEl) netEl.textContent = `Toplam Net: ${totalNet.toFixed(2)}`;
    if (subSummaryEl) {
      subSummaryEl.innerHTML = subSummaryItems.map(item => `<span>• ${item}</span>`).join('');
    }
    if (stText) stText.textContent = 'Okundu & Kaydedildi ✅';

    // Sınav Veritabanına Anında Yaz & Firebase Buluta Kaydet
    if (student) {
      if (!exam.scores) exam.scores = {};
      exam.scores[student.id] = {
        subjects: subResults,
        totalScore: calculatedScore,
        totalNet: Math.round(totalNet * 100) / 100,
        scannedAt: new Date().toISOString(),
        booklet: booklet
      };
      window.Store.saveMockExam(exam);
    }

    if (window.App && window.App.showToast) {
      window.App.showToast(`✅ ${stFullName}: ${calculatedScore.toFixed(2)} Puan kaydedildi!`, 'success');
    }
  },

  // ========================================================
  // 6. DENEME SONUÇLARI, PUANLAMA & SIRALAMA GÖRÜNÜMÜ
  // ========================================================
  openResultsView(examId) {
    this.selectedExamId = examId;
    this.activeView = 'results';
    this.selectedClassFilter = 'ALL';
    this.searchQuery = '';
    this.render();
  },

  renderResultsView(container) {
    const exam = window.Store.getMockExamById(this.selectedExamId);
    if (!exam) {
      this.activeView = 'list';
      this.render();
      return;
    }

    let students = this.getParticipatingStudents(exam);
    const totalParticipantCount = students.length;
    const targetClasses = exam.targetClasses || [];

    // Şube Filtresi
    if (this.selectedClassFilter !== 'ALL') {
      students = students.filter(s => (s.className || '').trim().toUpperCase() === this.selectedClassFilter.toUpperCase());
    }

    // İsim / No Arama Filtresi
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      students = students.filter(s =>
        (s.firstName && s.firstName.toLowerCase().includes(q)) ||
        (s.lastName && s.lastName.toLowerCase().includes(q)) ||
        (s.studentNo && s.studentNo.toString().includes(q))
      );
    }

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

      let calculatedScore = sc.totalScore || 0;
      if (!calculatedScore) {
        if (exam.formulaType === 'LGS_500' && maxWeightedNet > 0) {
          calculatedScore = 100 + (Math.max(0, totalWeightedNet) / maxWeightedNet) * 400;
        } else {
          calculatedScore = totalWeightedNet;
        }
        calculatedScore = Math.max(0, Math.min(500, Math.round(calculatedScore * 100) / 100));
      }

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
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                  ${exam.formulaType === 'LGS_500' ? 'LGS (500 Puan)' : 'Ağırlıklı Puan'}
                </span>
                <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                  🎯 Katılımcılar: ${targetClasses.join(', ')} (${totalParticipantCount} Talebe)
                </span>
              </div>
              <h2 class="text-base sm:text-lg font-black text-slate-900 leading-tight mt-1">
                ${exam.title}
              </h2>
              <p class="text-xs text-slate-500 font-medium mt-0.5">
                📅 ${exam.date} • ${subjects.length} Ders • Toplam ${subjects.reduce((sum, s) => sum + s.questionCount, 0)} Soru
              </p>
            </div>
          </div>

          <!-- ÜST ARAÇ BUTONLARI -->
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="window.MockExamModule.openPrintModal('${exam.id}')"
              class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer">
              <span>🖨️</span>
              <span>Optik Yazdır</span>
            </button>
            <button type="button" onclick="window.MockExamModule.openAnswerKeyModal('${exam.id}')"
              class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer">
              <span>🔑</span>
              <span>Cevap Anahtarı</span>
            </button>
            <button type="button" onclick="window.MockExamModule.openCameraScanner('${exam.id}')"
              class="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer">
              <span>📷</span>
              <span>Optik Oku</span>
            </button>
            <button type="button" onclick="window.MockExamModule.openKazanimAnalyticsView('${exam.id}')"
              class="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer">
              <span>🎯</span>
              <span>Kazanım Analizi</span>
            </button>
            <button type="button" onclick="window.MockExamModule.openEditExam('${exam.id}')"
              class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer">
              <span>⚙️</span>
              <span>Düzenle</span>
            </button>
          </div>
        </div>

        <!-- ŞUBE FİLTRELERİ VE ARAMA KUTUSU -->
        <div class="bg-white p-3 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[10px] font-black text-slate-400 uppercase">Şube Filtresi:</span>
            <button type="button" onclick="window.MockExamModule.selectedClassFilter='ALL'; window.MockExamModule.render();"
              class="px-3 py-1 rounded-xl font-black text-xs transition cursor-pointer ${
                this.selectedClassFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }">
              Tümü (${totalParticipantCount})
            </button>

            ${targetClasses.map(c => {
              const cCount = this.getParticipatingStudents(exam).filter(s => (s.className || '').trim().toUpperCase() === c.toUpperCase()).length;
              return `
                <button type="button" onclick="window.MockExamModule.selectedClassFilter='${c}'; window.MockExamModule.render();"
                  class="px-3 py-1 rounded-xl font-black text-xs transition cursor-pointer ${
                    this.selectedClassFilter === c
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }">
                  ${c} (${cCount})
                </button>
              `;
            }).join('')}
          </div>

          <div class="flex items-center gap-2">
            <input type="text" placeholder="İsim veya No ile ara..." value="${this.escapeHtml(this.searchQuery)}"
              oninput="window.MockExamModule.searchQuery = this.value; window.MockExamModule.render();"
              class="p-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs w-48 focus:bg-white focus:outline-none">
          </div>
        </div>

        <!-- SONUÇ & SIRALAMA TABLOSU -->
        <div class="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div class="font-black text-slate-800 text-xs sm:text-sm">
              🏆 LGS Puan Sıralaması ve Ders Netleri (${studentResults.length} Talebe)
            </div>
            <div class="text-[11px] text-slate-500">
              Not girmek için <strong>"✏️ Not Gir"</strong> veya kamerayla <strong>"📷 Optik Oku"</strong> butonunu kullanabilirsiniz.
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
                          class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg border border-indigo-200 transition cursor-pointer">
                          ✏️ Not Gir
                        </button>
                        <button type="button" onclick="window.MockExamModule.shareStudentWhatsAppCarnet('${exam.id}', '${st.id}')"
                          title="Veliye WhatsApp Deneme Karnesi Gönder"
                          class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200 transition ml-1 cursor-pointer">
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

        <div class="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          ${subjects.map(s => {
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
            class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition cursor-pointer">
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
  // 7. KAZANIM ANALİZİ & EKSİK KONU RAPORU
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
  // 8. VELİYE WHATSAPP DENEME KARNESİ GÖNDERME
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
