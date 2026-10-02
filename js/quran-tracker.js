/**
 * quran-tracker.js - Kur'an-ı Kerim Hatim ve Tilavet Takip Modülü (Ömer Avniyel Akademi)
 * - Dini ders gruplarına (Dahili Hoca), Seviyelere ve Sınıflara göre gruplama
 * - Kaldığı sayfayı girince anında otomatik hesaplama:
 *    * Kaç sayfa okudu (ve toplam ömür boyu sayfa)
 *    * Kaç sayfa kaldı (604 sayfa üzerinden)
 *    * Yüzde kaç okudu (%)
 *    * Yüzde kaç kaldı (%)
 *    * Kaçıncı Cüzde olduğu
 *    * Tamamlanan Hatim sayısı
 * - Canlı TV Panosunda ve Podyumda en çok okuyanları sergileme
 * - Veliye tek tıkla WhatsApp Hatim Durumu Gönderme
 */

window.QuranTrackerModule = {
  selectedGroup: 'ALL',
  selectedLevel: 'ALL',
  selectedClass: 'ALL',
  searchQuery: '',
  viewMode: 'cards', // 'cards' | 'table' | 'groups'
  editingStudentId: null,
  tempPage: 1,
  tempHatim: 0,
  tempNote: '',

  init() {
    this.bindEvents();
    this.renderView();
  },

  bindEvents() {
    if (!this._boundListener) {
      this._boundListener = () => {
        const container = document.getElementById('quran-tracker-container');
        if (container) this.renderView();
      };
      window.addEventListener('quran-tracker-updated', this._boundListener);
      window.addEventListener('cloud-sync-done', this._boundListener);
    }
  },

  setGroup(grp) {
    this.selectedGroup = grp;
    this.renderView();
  },

  setLevel(lvl) {
    this.selectedLevel = lvl;
    this.renderView();
  },

  setClass(cls) {
    this.selectedClass = cls;
    this.renderView();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    this.renderView();
  },

  // Doğrudan satırdan / karttan sayfa güncelleme
  handleQuickPageInput(studentId, newPageVal) {
    const page = parseInt(newPageVal, 10);
    if (isNaN(page) || page < 0) return;
    const rec = window.Store.getQuranRecord(studentId);
    const res = window.Store.saveQuranRecord(studentId, page, rec.hatimCount);
    if (res.success) {
      if (res.stats.isHatimComplete) {
        this.openHatimCompleteModal(studentId);
      } else {
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast(`${res.stats.currentPage}. Sayfa kaydedildi (%${res.stats.percentRead})`, 'info');
        }
        this.renderView();
      }
    }
  },

  // Butonla sayfa artırma (+1, +5, +10, +20)
  addPages(studentId, count) {
    const rec = window.Store.getQuranRecord(studentId);
    const newPage = Math.min(604, (rec.currentPage || 0) + count);
    const res = window.Store.saveQuranRecord(studentId, newPage, rec.hatimCount);
    if (res.success) {
      if (res.stats.isHatimComplete) {
        this.openHatimCompleteModal(studentId);
      } else {
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast(`+${count} sayfa eklendi ➔ Sayfa: ${res.stats.currentPage} (%${res.stats.percentRead})`, 'success');
        }
        this.renderView();
      }
    }
  },

  // Düzenleme Modalı Aç
  openEditModal(studentId) {
    const rec = window.Store.getQuranRecord(studentId);
    this.editingStudentId = studentId;
    this.tempPage = rec.currentPage || 1;
    this.tempHatim = rec.hatimCount || 0;
    this.tempNote = rec.note || '';
    this.renderModal();
  },

  closeEditModal() {
    this.editingStudentId = null;
    const modal = document.getElementById('quran-edit-modal-wrapper');
    if (modal) modal.remove();
  },

  // Modal içinden canlı sayfa hesaplama ve önizleme
  onModalPageChange(val) {
    this.tempPage = Math.min(604, Math.max(0, parseInt(val, 10) || 0));
    this.updateModalCalculations();
  },

  onModalHatimChange(val) {
    this.tempHatim = Math.max(0, parseInt(val, 10) || 0);
    this.updateModalCalculations();
  },

  modalAddPages(count) {
    this.tempPage = Math.min(604, Math.max(0, this.tempPage + count));
    const input = document.getElementById('quran-modal-page-input');
    if (input) input.value = this.tempPage;
    this.updateModalCalculations();
  },

  updateModalCalculations() {
    const stats = window.Store.calculateQuranStats(this.tempPage, this.tempHatim);
    const calcContainer = document.getElementById('quran-modal-calc-preview');
    if (!calcContainer) return;

    calcContainer.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div class="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200">
          <div class="text-[10px] font-black text-emerald-800 uppercase">Okunan Sayfa</div>
          <div class="text-base font-black text-emerald-900 mt-0.5">${stats.pagesReadInHatim} / 604</div>
          <div class="text-[10px] text-emerald-700 font-bold mt-0.5">%${stats.percentRead} Tamam</div>
        </div>

        <div class="p-2.5 bg-amber-50 rounded-2xl border border-amber-200">
          <div class="text-[10px] font-black text-amber-800 uppercase">Kalan Sayfa</div>
          <div class="text-base font-black text-amber-900 mt-0.5">${stats.pagesLeftInHatim} Sayfa</div>
          <div class="text-[10px] text-amber-700 font-bold mt-0.5">%${stats.percentLeft} Kaldı</div>
        </div>

        <div class="p-2.5 bg-indigo-50 rounded-2xl border border-indigo-200">
          <div class="text-[10px] font-black text-indigo-800 uppercase">Bulunduğu Cüz</div>
          <div class="text-base font-black text-indigo-900 mt-0.5">${stats.cuzNo}. Cüz</div>
          <div class="text-[10px] text-indigo-600 font-medium mt-0.5">${stats.cuzPageRange}. sf</div>
        </div>

        <div class="p-2.5 bg-purple-50 rounded-2xl border border-purple-200">
          <div class="text-[10px] font-black text-purple-800 uppercase">Tamamlanan Hatim</div>
          <div class="text-base font-black text-purple-900 mt-0.5">${stats.hatimCount} Hatim</div>
          <div class="text-[10px] text-purple-600 font-bold mt-0.5">${stats.totalLifetimePages} Toplam sf</div>
        </div>
      </div>

      <!-- İlerleme Çubuğu -->
      <div class="space-y-1">
        <div class="flex items-center justify-between text-[11px] font-bold text-slate-500">
          <span>Hatim İlerleme Oranı</span>
          <span class="font-black text-emerald-700">%${stats.percentRead}</span>
        </div>
        <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 shadow-xs"
            style="width: ${stats.percentRead}%"></div>
        </div>
      </div>
    `;
  },

  saveModalData() {
    if (!this.editingStudentId) return;
    const noteInput = document.getElementById('quran-modal-note-input');
    const note = noteInput ? noteInput.value.trim() : this.tempNote;
    const groupSelect = document.getElementById('quran-modal-group-select');
    const selectedGroup = groupSelect ? groupSelect.value : null;

    const res = window.Store.saveQuranRecord(this.editingStudentId, this.tempPage, this.tempHatim, note, selectedGroup);
    if (res.success) {
      if (res.stats.isHatimComplete) {
        this.closeEditModal();
        this.openHatimCompleteModal(this.editingStudentId);
      } else {
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast('Kur\'an-ı Kerim ilerlemesi ve dini ders grubu başarıyla kaydedildi!', 'success');
        }
        this.closeEditModal();
        this.renderView();
      }
    }
  },

  // Hatim Tamamlama Tebrik Modalı
  openHatimCompleteModal(studentId) {
    const student = window.Store.getStudentById(studentId);
    if (!student) return;
    const rec = window.Store.getQuranRecord(studentId);
    const nextHatimNo = (rec.hatimCount || 0) + 1;

    let existingWrapper = document.getElementById('quran-hatim-complete-modal');
    if (!existingWrapper) {
      existingWrapper = document.createElement('div');
      existingWrapper.id = 'quran-hatim-complete-modal';
      document.body.appendChild(existingWrapper);
    }

    existingWrapper.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in no-print">
        <div class="bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 text-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border-2 border-amber-400 shadow-2xl text-center space-y-5 relative overflow-hidden">
          <div class="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl"></div>
          <div class="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>

          <div class="text-6xl animate-bounce">🎉</div>
          
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider">
            <span>📖 HATİM TEBRİK VE KUTLAMASI</span>
          </div>

          <div>
            <h3 class="text-xl sm:text-2xl font-black text-amber-300">
              ${student.firstName} ${student.lastName}
            </h3>
            <p class="text-xs text-slate-300 mt-1">
              ${student.className} • No: ${student.studentNo || student.id} • ${rec.diniGrup || student.dahiliHoca || '-'}
            </p>
          </div>

          <div class="p-4 bg-slate-800/80 rounded-2xl border border-amber-500/30 text-xs text-amber-200 leading-relaxed font-medium">
            Talebemiz 604 sayfalık Kur'an-ı Kerim tilavetini tamamlayarak <strong>${nextHatimNo}. Hatm-i Şerifini</strong> bitirmiştir. Talebemizi ve emeği geçen hocalarımızı tebrik ederiz!
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button type="button" onclick="window.QuranTrackerModule.confirmCompleteHatim('${student.id}');"
              class="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/30 hover:scale-105 transition flex items-center justify-center gap-2 cursor-pointer">
              <span>🌟 Hatmi Onayla & Yeni Hatme Başla</span>
            </button>
            <button type="button" onclick="document.getElementById('quran-hatim-complete-modal').remove(); window.QuranTrackerModule.renderView();"
              class="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer">
              Kapat
            </button>
          </div>
        </div>
      </div>
    `;
  },

  confirmCompleteHatim(studentId) {
    const res = window.Store.completeHatim(studentId);
    const modal = document.getElementById('quran-hatim-complete-modal');
    if (modal) modal.remove();
    if (res.success) {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Tebrikler! Yeni hatim başlatıldı ve hatim sayısı güncellendi! 🎉', 'success');
      }
      this.renderView();
    }
  },

  renderModal() {
    let modalWrapper = document.getElementById('quran-edit-modal-wrapper');
    if (!modalWrapper) {
      modalWrapper = document.createElement('div');
      modalWrapper.id = 'quran-edit-modal-wrapper';
      document.body.appendChild(modalWrapper);
    }

    const student = window.Store.getStudentById(this.editingStudentId);
    if (!student) return;
    const rec = window.Store.getQuranRecord(this.editingStudentId);

    modalWrapper.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in no-print"
        onclick="if(event.target === this) window.QuranTrackerModule.closeEditModal()">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto">
          <!-- Başlık ve Kapatma -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-2xl flex items-center justify-center shadow-inner">
                📖
              </div>
              <div>
                <h3 class="font-black text-base text-slate-900">${student.firstName} ${student.lastName}</h3>
                <p class="text-xs text-slate-500">${student.className} • ${rec.diniGrup || student.dahiliHoca || 'Dini Ders Grubu'}</p>
              </div>
            </div>
            <button onclick="window.QuranTrackerModule.closeEditModal()" 
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Canlı Otomatik Hesaplama Önizleme Kutusu -->
          <div id="quran-modal-calc-preview" class="space-y-3"></div>

          <!-- Sayfa ve Hatim Giriş Alanları -->
          <div class="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label class="block text-xs font-black uppercase text-slate-700 mb-1">
                Kaldığı Sayfa (1 - 604):
              </label>
              <div class="flex items-center gap-2">
                <input type="number" id="quran-modal-page-input" min="0" max="604" value="${this.tempPage}"
                  class="flex-1 px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition shadow-2xs font-mono"
                  oninput="window.QuranTrackerModule.onModalPageChange(this.value)">

                <!-- Hızlı Ekleme Butonları -->
                <div class="flex items-center gap-1">
                  <button type="button" onclick="window.QuranTrackerModule.modalAddPages(1)"
                    class="px-2.5 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-black text-xs rounded-xl border border-slate-200 transition cursor-pointer">
                    +1
                  </button>
                  <button type="button" onclick="window.QuranTrackerModule.modalAddPages(5)"
                    class="px-2.5 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-black text-xs rounded-xl border border-slate-200 transition cursor-pointer">
                    +5
                  </button>
                  <button type="button" onclick="window.QuranTrackerModule.modalAddPages(10)"
                    class="px-2.5 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-black text-xs rounded-xl border border-slate-200 transition cursor-pointer">
                    +10
                  </button>
                  <button type="button" onclick="window.QuranTrackerModule.modalAddPages(20)"
                    class="px-2.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-black text-xs rounded-xl border border-emerald-300 transition cursor-pointer"
                    title="1 Cüz Ekle (20 Sayfa)">
                    +1 Cüz
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-black uppercase text-slate-700 mb-1">
                  Tamamlanan Hatim Sayısı:
                </label>
                <input type="number" min="0" value="${this.tempHatim}"
                  class="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition shadow-2xs font-mono"
                  oninput="window.QuranTrackerModule.onModalHatimChange(this.value)">
              </div>

              <div>
                <label class="block text-xs font-black uppercase text-slate-700 mb-1 flex items-center justify-between">
                  <span>Dini Ders Grubu / Hocası:</span>
                  <span class="text-[10px] text-emerald-600 font-bold lowercase">değiştirilebilir</span>
                </label>
                <select id="quran-modal-group-select"
                  class="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition shadow-2xs">
                  ${(window.Store && typeof window.Store.getDahiliHocalari === 'function' ? window.Store.getDahiliHocalari() : [
                    'YASİN EKİNCİ',
                    'AHMED MUBARİZ',
                    'ABDUSSAMED TAV',
                    'EMİR TALHA TARIM',
                    'BURAK BODUR',
                    'TUNAHAN TAŞKIN',
                    'SELİM BOZKURT',
                    'YAVUZ SELİM SEVEN'
                  ]).map(h => {
                    const currentGroup = (rec.diniGrup || student.dahiliHoca || '').trim();
                    const isSelected = currentGroup === h;
                    return `<option value="${h}" ${isSelected ? 'selected' : ''}>${h}</option>`;
                  }).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-black uppercase text-slate-700 mb-1">
                Öğretmen Notu / Açıklama (İsteğe Bağlı):
              </label>
              <input type="text" id="quran-modal-note-input" placeholder="Örn: Tecvid gayreti çok iyi, 5. cüze geçti..." value="${this.tempNote}"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition">
            </div>
          </div>

          <!-- Alt Butonlar -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="window.Store.sendWhatsAppQuranReport('${student.id}');"
              class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer">
              <span>📲</span> <span>Veliye WhatsApp Gönder</span>
            </button>

            <div class="flex items-center gap-2">
              <button type="button" onclick="window.QuranTrackerModule.closeEditModal()"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">
                Vazgeç
              </button>
              <button type="button" onclick="window.QuranTrackerModule.saveModalData()"
                class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition shadow cursor-pointer">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.updateModalCalculations();
  },

  renderView(preserveScroll = true) {
    const scrollY = preserveScroll ? window.scrollY : 0;
    const container = document.getElementById('quran-tracker-container');
    if (!container) return;

    const allStudents = window.Store.getStudents(false); // Aktif öğrenciler
    const allRecords = window.Store.getAllQuranRecords();
    const groupSummaries = window.Store.getQuranGroupSummary();
    const classes = window.Store.getClasses();

    // Benzersiz Dini Ders Grupları (Dahili Hoca veya custom)
    const groups = Array.from(new Set(allStudents.map(s => {
      const rec = allRecords[s.id];
      const curG = (rec && rec.diniGrup) ? rec.diniGrup.trim() : '';
      const hoca = (s.dahiliHoca || '').trim();
      return (curG && curG !== 'Genel' && !curG.startsWith('Seviye')) ? curG : (hoca || 'Genel');
    }))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));

    // Filtreleme
    let filtered = allStudents.map(s => {
      const rec = allRecords[s.id] || { currentPage: 1, hatimCount: 0, diniGrup: s.dahiliHoca || 'Genel' };
      const stats = window.Store.calculateQuranStats(rec.currentPage, rec.hatimCount);
      const curG = (rec && rec.diniGrup) ? rec.diniGrup.trim() : '';
      const hoca = (s.dahiliHoca || '').trim();
      const resolvedG = (curG && curG !== 'Genel' && !curG.startsWith('Seviye')) ? curG : (hoca || 'Genel');
      return {
        student: s,
        record: rec,
        stats,
        diniGrup: resolvedG
      };
    });

    // Grup filtresi
    if (this.selectedGroup !== 'ALL') {
      filtered = filtered.filter(item => item.diniGrup === this.selectedGroup);
    }

    // Seviye filtresi
    if (this.selectedLevel !== 'ALL') {
      filtered = filtered.filter(item => item.student.seviye === this.selectedLevel);
    }

    // Sınıf filtresi
    if (this.selectedClass !== 'ALL') {
      filtered = filtered.filter(item => item.student.className === this.selectedClass);
    }

    // Arama
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const s = item.student;
        return (
          (s.firstName && s.firstName.toLowerCase().includes(q)) ||
          (s.lastName && s.lastName.toLowerCase().includes(q)) ||
          (s.studentNo && String(s.studentNo).includes(q)) ||
          (s.className && s.className.toLowerCase().includes(q)) ||
          (s.yatakhane && s.yatakhane.toLowerCase().includes(q)) ||
          (item.diniGrup && item.diniGrup.toLowerCase().includes(q))
        );
      });
    }

    // Sıralama: En çok okuyan en üstte
    filtered.sort((a, b) => {
      if (b.stats.totalLifetimePages !== a.stats.totalLifetimePages) {
        return b.stats.totalLifetimePages - a.stats.totalLifetimePages;
      }
      return (a.student.firstName || '').localeCompare(b.student.firstName || '', 'tr');
    });

    // İstatistikler
    const totalStudentsInView = filtered.length;
    let totalLifetimePagesInView = 0;
    let totalCompletedHatimsInView = 0;
    let totalCurrentPagesInView = 0;

    filtered.forEach(item => {
      totalLifetimePagesInView += item.stats.totalLifetimePages;
      totalCompletedHatimsInView += item.stats.hatimCount;
      totalCurrentPagesInView += item.stats.currentPage;
    });

    const avgPercentInView = totalStudentsInView > 0 
      ? Math.min(100, parseFloat(((totalCurrentPagesInView / (totalStudentsInView * 604)) * 100).toFixed(1))) 
      : 0;

    const topStudent = filtered[0] || null;

    container.innerHTML = `
      <div class="space-y-5 animate-fade-in max-w-7xl mx-auto">
        <!-- 1. ÜST BAŞLIK & KONTROL PANELİ -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div class="flex flex-wrap items-center gap-3 mb-1">
                <h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>📖 Kur'an-ı Kerim Hatim ve Tilavet Takibi</span>
                </h2>
                <!-- GÖRÜNÜM MODU SEÇİCİ -->
                <div class="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1 shadow-inner">
                  <button type="button" onclick="window.QuranTrackerModule.setViewMode('cards')"
                    class="py-1 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                      this.viewMode === 'cards' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    🗂️ Kartlar
                  </button>
                  <button type="button" onclick="window.QuranTrackerModule.setViewMode('table')"
                    class="py-1 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                      this.viewMode === 'table' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    📋 Tablo
                  </button>
                  <button type="button" onclick="window.QuranTrackerModule.setViewMode('groups')"
                    class="py-1 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                      this.viewMode === 'groups' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    👥 Dini Ders Grupları
                  </button>
                </div>
              </div>
              <p class="text-xs text-slate-500">
                Talebelerimizin kaldığı sayfayı giriniz; okunan ve kalan sayfalar, yüzdeler ve cüz bilgisi otomatik hesaplanır. En çok okuyanlar TV panosunda sergilenir.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button type="button" onclick="window.QuranTrackerModule.openRecoveryModal()"
                class="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Hafızadaki Kur'an verilerini kurtar, yedekle veya toplu düzenle">
                <span>🛡️</span> <span>Verileri Kurtar & Yedekle</span>
              </button>
              <a href="pano.html" target="_blank"
                class="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs">
                <span>📺 Canlı Pano Vitrini</span>
              </a>
              <button onclick="window.print()" 
                class="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                <span>🖨️ Yazdır / PDF</span>
              </button>
            </div>
          </div>

          <!-- 2. KPI CANLI SAYAÇ KARTLARI -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <!-- 1. Toplam Talebe -->
            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <div class="text-[10px] font-black text-slate-500 uppercase tracking-wider">İncelenen Talebe</div>
              <div class="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">${totalStudentsInView}</div>
              <div class="text-[10px] text-slate-400 font-semibold mt-0.5">Kayıtlı Öğrenci</div>
            </div>

            <!-- 2. Toplam Okunan Sayfa -->
            <div class="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-center">
              <div class="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Toplam Okunan</div>
              <div class="text-xl sm:text-2xl font-black text-emerald-900 mt-0.5">${totalLifetimePagesInView.toLocaleString('tr-TR')}</div>
              <div class="text-[10px] text-emerald-600 font-semibold mt-0.5">Mushaf Sayfası</div>
            </div>

            <!-- 3. Tamamlanan Hatim -->
            <div class="p-3 bg-amber-50/80 rounded-2xl border border-amber-300 text-center">
              <div class="text-[10px] font-black text-amber-800 uppercase tracking-wider">Tamamlanan Hatim</div>
              <div class="text-xl sm:text-2xl font-black text-amber-900 mt-0.5">${totalCompletedHatimsInView} Hatim</div>
              <div class="text-[10px] text-amber-700 font-semibold mt-0.5">Biten Hatm-i Şerif</div>
            </div>

            <!-- 4. Ortalama İlerleme -->
            <div class="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-center">
              <div class="text-[10px] font-black text-indigo-800 uppercase tracking-wider">Ortalama Hatim</div>
              <div class="text-xl sm:text-2xl font-black text-indigo-900 mt-0.5">%${avgPercentInView}</div>
              <div class="text-[10px] text-indigo-600 font-semibold mt-0.5">Kurs Tamamlama</div>
            </div>

            <!-- 5. En Çok Okuyan / Lider -->
            <div class="p-3 bg-gradient-to-br from-amber-50 to-yellow-100 rounded-2xl border border-amber-300 text-center col-span-2 sm:col-span-1">
              <div class="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center justify-center gap-1">
                <span>👑 Hatim Lideri</span>
              </div>
              <div class="text-xs sm:text-sm font-black text-slate-900 mt-1 truncate" title="${topStudent ? `${topStudent.student.firstName} ${topStudent.student.lastName}` : '-'}">
                ${topStudent ? `${topStudent.student.firstName} ${topStudent.student.lastName}` : '-'}
              </div>
              <div class="text-[10px] text-amber-800 font-bold mt-0.5">
                ${topStudent ? `${topStudent.stats.currentPage}. sf (${topStudent.stats.hatimCount} Hatim)` : '0 sf'}
              </div>
            </div>
          </div>

          <!-- 3. FİLTRELER: Dini Ders Grubu, Seviye, Sınıf ve Arama -->
          <div class="space-y-3 pt-2 border-t border-slate-100">
            <!-- Dini Ders Grubu (Dahili Hoca) Butonları -->
            <div>
              <div class="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>DİNİ DERS GRUBU / DAHİLİ HOCA:</span>
                ${this.selectedGroup !== 'ALL' ? `
                  <button type="button" onclick="window.QuranTrackerModule.setGroup('ALL')" class="text-emerald-700 font-bold hover:underline cursor-pointer">
                    Grubu Sıfırla
                  </button>
                ` : ''}
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="window.QuranTrackerModule.setGroup('ALL')"
                  class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    this.selectedGroup === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }">
                  Tüm Gruplar (${allStudents.length})
                </button>
                ${groups.map(grp => {
                  const isSel = this.selectedGroup === grp;
                  const count = allStudents.filter(s => {
                    const rec = allRecords[s.id];
                    const curG = (rec && rec.diniGrup) ? rec.diniGrup.trim() : '';
                    const hoca = (s.dahiliHoca || '').trim();
                    const rG = (curG && curG !== 'Genel' && !curG.startsWith('Seviye')) ? curG : (hoca || 'Genel');
                    return rG === grp;
                  }).length;
                  return `
                    <button type="button" onclick="window.QuranTrackerModule.setGroup('${grp}')"
                      class="px-2.5 py-1.5 rounded-xl text-xs font-black transition border flex items-center gap-1 cursor-pointer ${
                        isSel 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }">
                      <span>${isSel ? '✓' : '🕌'}</span>
                      <span>${grp}</span>
                      <span class="text-[10px] opacity-80">(${count})</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Alt Filtre Satırı: Seviye, Sınıf ve Arama Kutusu -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div class="flex flex-wrap items-center gap-2">
                <!-- Seviye Filtresi -->
                <div class="flex items-center gap-1">
                  <span class="text-[10px] font-black text-slate-400 uppercase">SEVİYE:</span>
                  <select onchange="window.QuranTrackerModule.setLevel(this.value)"
                    class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none">
                    <option value="ALL" ${this.selectedLevel === 'ALL' ? 'selected' : ''}>Tüm Seviyeler</option>
                    <option value="Seviye 1" ${this.selectedLevel === 'Seviye 1' ? 'selected' : ''}>Seviye 1</option>
                    <option value="Seviye 2" ${this.selectedLevel === 'Seviye 2' ? 'selected' : ''}>Seviye 2</option>
                    <option value="Seviye 3" ${this.selectedLevel === 'Seviye 3' ? 'selected' : ''}>Seviye 3</option>
                  </select>
                </div>

                <!-- Sınıf Filtresi -->
                <div class="flex items-center gap-1">
                  <span class="text-[10px] font-black text-slate-400 uppercase">SINIF:</span>
                  <select onchange="window.QuranTrackerModule.setClass(this.value)"
                    class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none">
                    <option value="ALL" ${this.selectedClass === 'ALL' ? 'selected' : ''}>Tüm Sınıflar</option>
                    ${classes.map(c => `
                      <option value="${c}" ${this.selectedClass === c ? 'selected' : ''}>${c}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <!-- Arama Kutusu -->
              <div class="w-full sm:w-64 relative">
                <input type="text" placeholder="Talebe adı, hoca, no ara..." value="${this.searchQuery}"
                  class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  oninput="window.QuranTrackerModule.searchQuery = this.value.toLowerCase().trim(); window.QuranTrackerModule.renderView();">
                <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. GÖRÜNÜM İÇERİĞİ -->
        ${this.renderViewContent(filtered, groupSummaries)}
      </div>
    `;

    if (preserveScroll && scrollY > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    }
  },

  renderViewContent(filtered, groupSummaries) {
    if (this.viewMode === 'groups') {
      return this.renderGroupsView(groupSummaries);
    }
    if (this.viewMode === 'table') {
      return this.renderTableView(filtered);
    }
    return this.renderCardsView(filtered);
  },

  // --- KARTLAR GÖRÜNÜMÜ ---
  renderCardsView(filtered) {
    if (filtered.length === 0) {
      return `
        <div class="bg-white rounded-3xl p-12 text-center text-slate-400 font-semibold border border-slate-200">
          Seçilen grup ve kriterlere uygun talebe bulunamadı.
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        ${filtered.map((item, idx) => {
          const s = item.student;
          const st = item.stats;
          const rec = item.record;
          const rank = idx + 1;
          const isTop3 = rank <= 3;
          const medal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : ''));

          return `
            <div class="bg-white rounded-3xl border border-slate-200 hover:border-emerald-300 p-4 sm:p-5 shadow-xs hover:shadow-md transition space-y-3.5 relative overflow-hidden">
              ${isTop3 ? `
                <div class="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-amber-200 text-slate-950 font-black text-[10px] px-3 py-1 rounded-bl-2xl shadow-xs flex items-center gap-1">
                  <span>${medal}</span> <span>${rank}. Sırada</span>
                </div>
              ` : `
                <div class="absolute top-2.5 right-3 text-[11px] font-black text-slate-300 font-mono">
                  #${rank}
                </div>
              `}

              <!-- Talebe Başlık Bilgisi -->
              <div class="flex items-center gap-3 pr-8">
                <div class="w-11 h-11 rounded-2xl ${isTop3 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-800'} font-black text-lg flex items-center justify-center shadow-inner flex-shrink-0">
                  📖
                </div>
                <div class="overflow-hidden">
                  <h4 class="font-black text-sm text-slate-900 truncate">
                    ${s.firstName} ${s.lastName}
                  </h4>
                  <p class="text-[11px] text-slate-400 truncate">
                    ${s.className} • ${item.diniGrup || s.dahiliHoca || '-'} • ${s.seviye || ''}
                  </p>
                </div>
              </div>

              <!-- İlerleme Çubuğu ve Otomatik İstatistikler -->
              <div class="space-y-1.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-black text-slate-800">
                    Kaldığı Sayfa: <strong class="text-emerald-700 font-mono text-sm">${st.currentPage}</strong> / 604
                  </span>
                  <span class="font-black text-emerald-700 font-mono">
                    %${st.percentRead} Okundu
                  </span>
                </div>

                <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-full transition-all duration-300 shadow-2xs"
                    style="width: ${st.percentRead}%"></div>
                </div>

                <div class="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Kalan: <strong class="text-amber-800 font-bold">${st.pagesLeftInHatim} sf</strong> (%${st.percentLeft})</span>
                  <span>Cüz: <strong class="text-indigo-800 font-bold">${st.cuzNo}. Cüz</strong></span>
                  ${st.hatimCount > 0 ? `<span class="text-purple-700 font-black">🌟 ${st.hatimCount} Hatim</span>` : ''}
                </div>
              </div>

              <!-- Hızlı Sayfa Girişi & Butonlar -->
              <div class="space-y-2 pt-1">
                <div class="flex items-center justify-between gap-1.5">
                  <span class="text-[10px] font-bold text-slate-400 uppercase">Hızlı Sayfa Ekle:</span>
                  <div class="flex items-center gap-1">
                    <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 1)"
                      class="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 text-[11px] font-black rounded-lg transition cursor-pointer">
                      +1
                    </button>
                    <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 5)"
                      class="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 text-[11px] font-black rounded-lg transition cursor-pointer">
                      +5
                    </button>
                    <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 10)"
                      class="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 text-[11px] font-black rounded-lg transition cursor-pointer">
                      +10
                    </button>
                    <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 20)"
                      class="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-black rounded-lg transition cursor-pointer"
                      title="1 Cüz Ekle (20 Sayfa)">
                      +20
                    </button>
                  </div>
                </div>

                <!-- Kart Alt Eylem Butonları -->
                <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <button type="button" onclick="window.QuranTrackerModule.openEditModal('${s.id}')"
                    class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl transition flex items-center gap-1 cursor-pointer">
                    <span>✍️ Düzenle</span>
                  </button>

                  <div class="flex items-center gap-1.5">
                    ${st.isHatimComplete ? `
                      <button type="button" onclick="window.QuranTrackerModule.openHatimCompleteModal('${s.id}')"
                        class="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer animate-pulse">
                        <span>🎉 Hatim Tamam</span>
                      </button>
                    ` : ''}

                    <button type="button" onclick="window.Store.sendWhatsAppQuranReport('${s.id}')"
                      class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                      title="Veliye WhatsApp ile Hatim Bilgisi Gönder">
                      <span>📲 WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // --- TABLO GÖRÜNÜMÜ ---
  renderTableView(filtered) {
    return `
      <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-black">
                <th class="py-3 px-3 w-10 text-center">#</th>
                <th class="py-3 px-3">Talebe Adı Soyadı</th>
                <th class="py-3 px-3 text-center w-16">Sınıf</th>
                <th class="py-3 px-3">Dini Ders Grubu / Hocası</th>
                <th class="py-3 px-3 text-center">Kaldığı Sayfa</th>
                <th class="py-3 px-3 text-center">Okunan / Kalan</th>
                <th class="py-3 px-3 text-center">İlerleme (%)</th>
                <th class="py-3 px-3 text-center">Cüz</th>
                <th class="py-3 px-3 text-center">Hatim</th>
                <th class="py-3 px-3 text-center w-36">İşlemler</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="10" class="py-12 text-center text-slate-400 font-semibold">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ` : filtered.map((item, idx) => {
                const s = item.student;
                const st = item.stats;
                const rank = idx + 1;
                const isTop3 = rank <= 3;

                return `
                  <tr class="hover:bg-slate-50 transition cursor-pointer" onclick="window.QuranTrackerModule.openEditModal('${s.id}')">
                    <td class="py-3 px-3 text-center font-bold ${isTop3 ? 'text-amber-600 font-black' : 'text-slate-400'}">
                      ${rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : rank))}
                    </td>
                    <td class="py-3 px-3 font-black text-slate-900">
                      <div>${s.firstName} ${s.lastName}</div>
                      <div class="text-[10px] text-slate-400 font-mono">No: ${s.studentNo || s.id}</div>
                    </td>
                    <td class="py-3 px-3 text-center">
                      <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">${s.className}</span>
                    </td>
                    <td class="py-3 px-3 text-slate-700 font-semibold">
                      ${item.diniGrup || s.dahiliHoca || '-'}
                    </td>
                    <td class="py-3 px-3 text-center font-mono font-black text-sm text-slate-900" onclick="event.stopPropagation()">
                      <input type="number" min="0" max="604" value="${st.currentPage}"
                        class="w-16 px-1.5 py-1 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                        onchange="window.QuranTrackerModule.handleQuickPageInput('${s.id}', this.value)">
                    </td>
                    <td class="py-3 px-3 text-center text-[11px]">
                      <span class="text-emerald-700 font-black">${st.pagesReadInHatim} sf</span> / 
                      <span class="text-amber-800 font-bold">${st.pagesLeftInHatim} sf kaldı</span>
                    </td>
                    <td class="py-3 px-3 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <div class="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div class="h-full bg-emerald-600 rounded-full" style="width: ${st.percentRead}%"></div>
                        </div>
                        <span class="font-mono font-black text-xs text-emerald-800">%${st.percentRead}</span>
                      </div>
                    </td>
                    <td class="py-3 px-3 text-center font-bold text-indigo-900">
                      ${st.cuzNo}. Cüz
                    </td>
                    <td class="py-3 px-3 text-center font-black ${st.hatimCount > 0 ? 'text-amber-700' : 'text-slate-400'}">
                      ${st.hatimCount > 0 ? `🌟 ${st.hatimCount}` : '0'}
                    </td>
                    <td class="py-3 px-3 text-center" onclick="event.stopPropagation()">
                      <div class="flex items-center justify-center gap-1">
                        <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 1)"
                          class="px-1.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 font-bold rounded-lg text-[10px]" title="+1 Sayfa">+1</button>
                        <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 5)"
                          class="px-1.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 font-bold rounded-lg text-[10px]" title="+5 Sayfa">+5</button>
                        <button type="button" onclick="window.QuranTrackerModule.openEditModal('${s.id}')"
                          class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-lg text-[10px]">✍️</button>
                        <button type="button" onclick="window.Store.sendWhatsAppQuranReport('${s.id}')"
                          class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-[10px]" title="WhatsApp">📲</button>
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

  // --- DİNİ DERS GRUPLARI LİDERLİĞİ VE KARŞILAŞTIRMA ---
  renderGroupsView(groupSummaries) {
    if (!groupSummaries || groupSummaries.length === 0) {
      return `
        <div class="bg-white rounded-3xl p-12 text-center text-slate-400 font-semibold border border-slate-200">
          Kayıtlı grup bulunamadı.
        </div>
      `;
    }

    return `
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${groupSummaries.map((g, idx) => {
            const rank = idx + 1;
            const topStudent = g.topReader ? g.topReader.student : null;
            const topStats = g.topReader ? g.topReader.stats : null;

            return `
              <div class="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs relative overflow-hidden">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div class="flex items-center gap-2.5">
                    <span class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-900 font-black text-lg flex items-center justify-center">
                      🕌
                    </span>
                    <div>
                      <h4 class="font-black text-sm text-slate-900">${g.groupName}</h4>
                      <p class="text-[11px] text-slate-400">${g.studentCount} Talebe</p>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-black text-xs font-mono">
                    #${rank}. Grup
                  </span>
                </div>

                <!-- Grup İstatistikleri -->
                <div class="grid grid-cols-3 gap-2 text-center text-xs">
                  <div class="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div class="text-[10px] font-black text-emerald-800 uppercase">Toplam Sayfa</div>
                    <div class="text-sm font-black text-emerald-900 mt-0.5">${g.totalLifetimePages.toLocaleString('tr-TR')}</div>
                  </div>
                  <div class="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                    <div class="text-[10px] font-black text-amber-800 uppercase">Biten Hatim</div>
                    <div class="text-sm font-black text-amber-900 mt-0.5">${g.totalCompletedHatims} Hatim</div>
                  </div>
                  <div class="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div class="text-[10px] font-black text-indigo-800 uppercase">Grup İlerleme</div>
                    <div class="text-sm font-black text-indigo-900 mt-0.5">%${g.avgPercent}</div>
                  </div>
                </div>

                <!-- Grup Lideri Talebe -->
                ${topStudent ? `
                  <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between gap-2">
                    <div>
                      <div class="text-[10px] font-black text-slate-400 uppercase">Grup Birincisi:</div>
                      <div class="font-black text-slate-900 mt-0.5">${topStudent.firstName} ${topStudent.lastName}</div>
                      <div class="text-[10px] text-slate-500">${topStudent.className}</div>
                    </div>
                    <div class="text-right">
                      <div class="font-black text-emerald-700 font-mono text-sm">${topStats.currentPage}. sf</div>
                      <div class="text-[10px] text-amber-700 font-bold">${topStats.hatimCount} Hatim (%${topStats.percentRead})</div>
                    </div>
                  </div>
                ` : ''}

                <button type="button" onclick="window.QuranTrackerModule.setGroup('${g.groupName}'); window.QuranTrackerModule.setViewMode('cards');"
                  class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl transition text-center cursor-pointer">
                  Bu Grubu Filtrele & Talebeleri İncele ➔
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // ========================================================
  // --- KUR'AN VERİLERİNİ KURTARMA, YEDEKLEME & TOPLU GİRİŞ ---
  // ========================================================
  openRecoveryModal() {
    let wrapper = document.getElementById('quran-recovery-modal-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'quran-recovery-modal-wrapper';
      document.body.appendChild(wrapper);
    }

    const allStudents = window.Store.getStudents(false);
    const allRecords = window.Store.getAllQuranRecords();

    wrapper.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-fade-in no-print"
        onclick="if(event.target === this) window.QuranTrackerModule.closeRecoveryModal()">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-5 sm:p-6 space-y-5 max-h-[95vh] overflow-y-auto">
          
          <!-- Başlık -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-black text-2xl flex items-center justify-center shadow-inner">
                🛡️
              </div>
              <div>
                <h3 class="font-black text-base sm:text-lg text-slate-900">Kur'an-ı Kerim Veri Kurtarma & Yedekleme Merkezi</h3>
                <p class="text-xs text-slate-500">Kayıp sayfaları kurtarma, cihazlar arası eşitlik sağlama ve hızlı toplu giriş</p>
              </div>
            </div>
            <button onclick="window.QuranTrackerModule.closeRecoveryModal()" 
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center cursor-pointer">
              ✕
            </button>
          </div>

          <!-- 1. OTOMATİK KURTARMA BUTONU & BİLGİ KUTUSU -->
          <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
            <div class="flex items-start gap-3">
              <span class="text-2xl">🔍</span>
              <div>
                <h4 class="font-black text-xs sm:text-sm text-emerald-950">1. Yerel Hafızadan & Geçmişten Otomatik Kurtarma</h4>
                <p class="text-xs text-emerald-800 leading-relaxed mt-0.5">
                  Tarayıcınızın geçmiş kayıtlarını ve yerel yedeklerini tarar. 1 yazan talebelerin daha önce girilmiş gerçek sayfaları varsa anında kurtarır ve buluta işler.
                </p>
              </div>
            </div>
            <button type="button" onclick="window.QuranTrackerModule.runAutoRecovery()"
              class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer">
              <span>🚀</span> <span>Geçmiş Hafızayı Tara ve Sayfaları Kurtar</span>
            </button>
          </div>

          <!-- 2. BAŞKA CİHAZDA GİRİLDİYSE KURTARMA REHBERİ -->
          <div class="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-2">
            <div class="flex items-center gap-2 font-black text-amber-900">
              <span>📱</span> <span>Sayfaları Başka Bir Telefonda veya Bilgisayarda mı Girdiniz?</span>
            </div>
            <p class="leading-relaxed text-amber-900">
              Eğer Kur'an sayfalarını <strong>telefonunuzdan, evdeki bilgisayardan veya başka bir tarayıcıdan</strong> yazdıysanız endişe etmeyiniz! 
              Yeni <strong>v5.9 Koruma Kalkanı</strong> sayesinde o cihazda bu takip ekranını bir kez açtığınız anda, sistem o cihazdaki gerçek sayfaları algılayacak ve buluta otomatik olarak geri yükleyecektir.
            </p>
          </div>

          <!-- 3. YEDEK İNDİR / YÜKLE -->
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-black text-xs uppercase text-slate-800">2. Yedek Dosyası İndir / Yükle</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" onclick="window.QuranTrackerModule.downloadQuranBackup()"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                <span>📥</span> <span>Kur'an Verilerini İndir (Yedek Al)</span>
              </button>
              <label class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                <span>📤</span> <span>Yedek Dosyası Yükle</span>
                <input type="file" accept=".json" class="hidden" onchange="window.QuranTrackerModule.importQuranBackupFile(event)">
              </label>
            </div>
          </div>

          <!-- 4. HIZLI TOPLU SAYFA DÜZENLEME TABLOSU -->
          <div class="space-y-2 pt-2 border-t border-slate-100">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-black text-xs uppercase text-slate-800">3. Hızlı Toplu Sayfa Düzenleyici (Excel Usulü)</h4>
                <p class="text-[11px] text-slate-500">Tüm talebelerin sayfalarını tek ekranda topluca inceleyip saniyeler içinde güncelleyebilirsiniz.</p>
              </div>
            </div>

            <form id="quran-batch-form" onsubmit="window.QuranTrackerModule.saveBatchPages(event)" class="space-y-3">
              <div class="max-h-64 overflow-y-auto border border-slate-200 rounded-2xl">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-900 text-white sticky top-0 uppercase text-[10px]">
                    <tr>
                      <th class="p-2.5 w-10 text-center">#</th>
                      <th class="p-2.5">Talebe</th>
                      <th class="p-2.5 text-center w-16">Sınıf</th>
                      <th class="p-2.5">Dini Grup</th>
                      <th class="p-2.5 text-center w-24">Kaldığı Sayfa</th>
                      <th class="p-2.5 text-center w-20">Hatim</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${allStudents.map((s, idx) => {
                      const rec = allRecords[s.id] || { currentPage: 1, hatimCount: 0 };
                      return `
                        <tr class="hover:bg-slate-50">
                          <td class="p-2 text-center text-slate-400 font-bold">${idx + 1}</td>
                          <td class="p-2 font-black text-slate-900">
                            ${s.firstName} ${s.lastName}
                            <span class="text-[10px] text-slate-400 font-mono ml-1">#${s.studentNo || s.id}</span>
                          </td>
                          <td class="p-2 text-center font-bold text-slate-600">${s.className}</td>
                          <td class="p-2 text-slate-700 text-[11px] font-medium">${rec.diniGrup || s.dahiliHoca || '-'}</td>
                          <td class="p-2 text-center">
                            <input type="number" min="0" max="604" name="page_${s.id}" value="${rec.currentPage || 1}"
                              class="w-20 px-2 py-1 text-center bg-slate-50 border-2 border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none font-mono">
                          </td>
                          <td class="p-2 text-center">
                            <input type="number" min="0" name="hatim_${s.id}" value="${rec.hatimCount || 0}"
                              class="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono">
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>

              <div class="flex items-center justify-between pt-2">
                <span class="text-[11px] text-slate-500">Düzenlemeyi bitirdikten sonra aşağıdaki butona basınız:</span>
                <button type="submit"
                  class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5">
                  <span>💾</span> <span>Tüm Sayfaları Toplu Kaydet & Buluta Yükle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  closeRecoveryModal() {
    const wrapper = document.getElementById('quran-recovery-modal-wrapper');
    if (wrapper) wrapper.remove();
  },

  runAutoRecovery() {
    const res = window.Store.recoverQuranRecordsFromStorage();
    if (res.success && res.recoveredCount > 0) {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(`🎉 ${res.recoveredCount} talebenin Kur'an sayfası hafızadan kurtarıldı ve buluta işlendi!`, 'success');
      }
      this.closeRecoveryModal();
      this.renderView();
    } else {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Bu tarayıcının yerel hafızasında eski kayıt bulunamadı. Sayfaları girdiğiniz diğer cihazı (telefon/tablet) açtığınızda sistem otomatik kurtaracaktır.', 'info');
      }
    }
  },

  downloadQuranBackup() {
    try {
      const records = window.Store.getAllQuranRecords();
      const payload = {
        type: 'OAY_QURAN_TRACKER_BACKUP',
        version: '5.9',
        exportedAt: new Date().toISOString(),
        quranTracker: records
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kuran_hatim_takip_yedek_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Kur\'an takip verileri başarıyla bilgisayarınıza indirildi.', 'success');
      }
    } catch (e) {
      console.error('downloadQuranBackup error:', e);
    }
  },

  importQuranBackupFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const data = parsed.quranTracker || parsed;
        if (data && typeof data === 'object') {
          localStorage.setItem('yoklama_quran_tracker_v1', JSON.stringify(data));
          try { localStorage.setItem('yoklama_quran_tracker_backup_v1', JSON.stringify(data)); } catch (err) {}
          if (window.Store && window.Store.isCloudEnabled()) {
            window.Store.syncToCloud('kurs_data/quranTracker', data);
          }
          window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: data }));
          if (window.App && typeof window.App.showToast === 'function') {
            window.App.showToast('Yedek dosyasındaki Kur\'an verileri başarıyla yüklendi ve buluta aktarıldı!', 'success');
          }
          this.closeRecoveryModal();
          this.renderView();
        } else {
          alert('Geçersiz yedek dosyası formatı.');
        }
      } catch (err) {
        alert('Yedek dosyası okunamadı: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  saveBatchPages(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const allStudents = window.Store.getStudents(false);
    const allRecords = window.Store.getAllQuranRecords();
    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    allStudents.forEach(s => {
      const pageVal = formData.get(`page_${s.id}`);
      const hatimVal = formData.get(`hatim_${s.id}`);
      if (pageVal !== null) {
        const page = Math.min(604, Math.max(0, parseInt(pageVal, 10) || 0));
        const hatim = Math.max(0, parseInt(hatimVal, 10) || 0);
        const cur = allRecords[s.id] || {};
        if (cur.currentPage !== page || cur.hatimCount !== hatim) {
          allRecords[s.id] = {
            ...cur,
            studentId: s.id,
            currentPage: page,
            hatimCount: hatim,
            diniGrup: cur.diniGrup || s.dahiliHoca || 'Genel',
            updatedAt: nowIso
          };
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      localStorage.setItem('yoklama_quran_tracker_v1', JSON.stringify(allRecords));
      try { localStorage.setItem('yoklama_quran_tracker_backup_v1', JSON.stringify(allRecords)); } catch (e) {}
      if (window.Store && window.Store.isCloudEnabled()) {
        window.Store.syncToCloud('kurs_data/quranTracker', allRecords);
      }
      window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: allRecords }));
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(`✅ ${updatedCount} talebenin sayfası kaydedildi ve buluta eşitlendi!`, 'success');
      }
    } else {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Herhangi bir değişiklik yapılmadı.', 'info');
      }
    }

    this.closeRecoveryModal();
    this.renderView();
  }
};
