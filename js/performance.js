/**
 * performance.js - Öğrenci Performans, Karne ve Değerlendirme Modülü (Personel)
 */

window.PerformanceModule = {
  currentFilterClass: 'ALL',
  searchQuery: '',
  selectedBadges: new Set(),

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
          onclick="window.PerformanceModule.toggleBadge('${b.name}')"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
            isSelected 
              ? `${b.color} ring-2 ring-emerald-500 font-bold scale-105 shadow-sm` 
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }">
          <span>${b.icon}</span>
          <span>${b.name}</span>
          ${isSelected ? '<span class="text-emerald-700 font-black">✓</span>' : ''}
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

    // Formu temizle
    this.selectedBadges.clear();
    document.getElementById('perf-form').reset();
    document.getElementById('perf-date').value = new Date().toISOString().split('T')[0];
    this.renderBadgesPicker();
    this.renderHistory();
  },

  deleteEntry(id) {
    if (confirm('Bu performans değerlendirmesini silmek istediğinizden emin misiniz?')) {
      window.Store.deletePerformance(id);
      window.App.showToast('Değerlendirme kaydı silindi.', 'info');
      this.renderHistory();
    }
  },

  renderView() {
    const container = document.getElementById('performance-container');
    if (!container) return;

    const students = window.Store.getStudents();
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Sol Panel: Yeni Performans Girişi Formu -->
        <div class="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div class="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ★
            </div>
            <div>
              <h3 class="font-bold text-slate-800 text-base">Yeni Performans Değerlendirmesi</h3>
              <p class="text-xs text-slate-500">Öğrenciye ders notu, kural uyumu ve görüş ekleyin</p>
            </div>
          </div>

          <form id="perf-form" onsubmit="window.PerformanceModule.savePerformanceEntry(event)" class="space-y-4">
            <!-- Öğrenci Seçimi -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">ÖĞRENCİ SEÇİNİZ *</label>
              <select id="perf-student-id" required
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">-- Öğrenci Seçin --</option>
                ${students.map(s => `<option value="${s.id}">${s.studentNo} - ${s.firstName} ${s.lastName} (${s.className})</option>`).join('')}
              </select>
            </div>

            <!-- Ders / Konu & Tarih -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">DERS / ALAN *</label>
                <select id="perf-subject" required
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option value="Kuran-ı Kerim & Ezber">Kuran-ı Kerim & Ezber</option>
                  <option value="Tecvid & Mahreç">Tecvid & Mahreç</option>
                  <option value="Ahlak & İlmihal">Ahlak & İlmihal</option>
                  <option value="Siyer-i Nebi">Siyer-i Nebi</option>
                  <option value="Ders & Etüt Takibi">Ders & Etüt Takibi</option>
                  <option value="Genel Düzen & Ahlak">Genel Düzen & Ahlak</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">TARİH</label>
                <input type="date" id="perf-date" value="${today}"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              </div>
            </div>

            <!-- Kriterler (Yıldız / Derece) -->
            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div class="text-xs font-bold text-slate-700 uppercase tracking-wide">Kriter Puanlaması (1 - 5)</div>
              
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-600 font-medium">Ders İçi Katılım & Gayret:</span>
                <select id="perf-part" class="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700">
                  <option value="5">⭐⭐⭐⭐⭐ (5 - Pekiyi)</option>
                  <option value="4">⭐⭐⭐⭐ (4 - İyi)</option>
                  <option value="3">⭐⭐⭐ (3 - Orta)</option>
                  <option value="2">⭐⭐ (2 - Geçer)</option>
                  <option value="1">⭐ (1 - Zayıf)</option>
                </select>
              </div>

              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-600 font-medium">Ödev & Ezber Tamamlama:</span>
                <select id="perf-hw" class="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700">
                  <option value="5">⭐⭐⭐⭐⭐ (5 - Tam)</option>
                  <option value="4">⭐⭐⭐⭐ (4 - İyi)</option>
                  <option value="3">⭐⭐⭐ (3 - Kısmi)</option>
                  <option value="2">⭐⭐ (2 - Eksik)</option>
                  <option value="1">⭐ (1 - Yapılmadı)</option>
                </select>
              </div>

              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-600 font-medium">Namaz, Kıyafet & Uyum:</span>
                <select id="perf-beh" class="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700">
                  <option value="5">⭐⭐⭐⭐⭐ (5 - Mükemmel)</option>
                  <option value="4">⭐⭐⭐⭐ (4 - İyi)</option>
                  <option value="3">⭐⭐⭐ (3 - Uyarılı)</option>
                  <option value="2">⭐⭐ (2 - Gelişmeli)</option>
                  <option value="1">⭐ (1 - Kurallara Uymadı)</option>
                </select>
              </div>

              <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span class="text-slate-700 font-bold">Ders Puanı (100 üzerinden):</span>
                <input type="number" id="perf-score" min="0" max="100" value="95" 
                  class="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-center text-slate-800">
              </div>
            </div>

            <!-- Başarı Rozetleri Seçimi -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">ÖĞRENCİYE ROZET / ETİKET EKLE</label>
              <div id="perf-badges-container" class="flex flex-wrap gap-1.5">
                <!-- renderBadgesPicker ile doldurulacak -->
              </div>
            </div>

            <!-- Öğretmen Notu / Görüşü -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">ÖĞRETMEN GÖRÜŞÜ & GERİ BİLDİRİM (Velinin göreceği not)</label>
              <textarea id="perf-note" rows="3" placeholder="Öğrencinin bugünkü gayreti, eksikleri veya tebrik notunuz..." 
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"></textarea>
            </div>

            <!-- Öğretmen İsmi -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">DEĞERLENDİREN ÖĞRETMEN / EĞİTMEN</label>
              <input type="text" id="perf-teacher" placeholder="Örn: Hasan Hoca" 
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>

            <button type="submit" 
              class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow transition flex items-center justify-center gap-2">
              <span>✓ Değerlendirmeyi Kaydet</span>
            </button>
          </form>
        </div>

        <!-- Sağ Panel: Geçmiş Performans ve Değerlendirmeler -->
        <div class="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 class="font-bold text-slate-800 text-base">Kayıtlı Performans Değerlendirmeleri</h3>
              <p class="text-xs text-slate-500">Velilerin de görüntüleyebildiği karne kayıtları</p>
            </div>
            <div>
              <input type="text" placeholder="Öğrenci veya ders ara..." 
                class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-48"
                oninput="window.PerformanceModule.searchQuery = this.value.toLowerCase().trim(); window.PerformanceModule.renderHistory();">
            </div>
          </div>

          <div id="perf-history-list" class="space-y-3.5 max-h-[700px] overflow-y-auto pr-1">
            <!-- renderHistory ile doldurulacak -->
          </div>
        </div>
      </div>
    `;

    this.renderBadgesPicker();
    this.renderHistory();
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
        <div class="py-12 text-center text-slate-400 text-sm">
          Henüz kayıtlı performans değerlendirmesi bulunmuyor.
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
        <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition shadow-xs">
          <div class="flex items-start justify-between gap-3 mb-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900 text-sm">${studentName}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">No: ${studentNo} (${studentClass})</span>
              </div>
              <div class="text-xs text-emerald-700 font-semibold mt-0.5">${p.subject}</div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-sm border border-emerald-200">
                ${p.criteria?.score || 0} Puan
              </span>
              <button onclick="window.PerformanceModule.deleteEntry('${p.id}')" 
                class="text-slate-400 hover:text-rose-600 p-1 transition" title="Sil">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Kriterler -->
          <div class="grid grid-cols-3 gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-100 text-slate-600 mb-2">
            <div>Katılım: <span class="font-bold text-amber-500">${'★'.repeat(p.criteria?.participation || 5)}</span></div>
            <div>Ödev/Ezber: <span class="font-bold text-amber-500">${'★'.repeat(p.criteria?.homework || 5)}</span></div>
            <div>Uyum & Namaz: <span class="font-bold text-amber-500">${'★'.repeat(p.criteria?.behavior || 5)}</span></div>
          </div>

          <!-- Rozetler -->
          ${p.badges && p.badges.length > 0 ? `
            <div class="flex flex-wrap gap-1 mb-2">
              ${p.badges.map(b => `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">${b}</span>`).join('')}
            </div>
          ` : ''}

          <!-- Öğretmen Notu -->
          ${p.teacherNote ? `
            <div class="text-xs text-slate-700 bg-emerald-50/50 border-l-2 border-emerald-500 p-2 rounded-r mb-2">
              <span class="font-bold text-emerald-900">Öğretmen Görüşü:</span> ${p.teacherNote}
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
