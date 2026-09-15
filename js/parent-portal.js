/**
 * parent-portal.js - Kardeş Destekli Veli Portalı (Salt Okunur)
 */

window.ParentPortal = {
  activeStudentId: null,

  init() {
    const session = window.App.currentSession;
    if (!session || session.role !== 'parent') {
      this.renderLoginNotice();
      return;
    }

    if (session.students && session.students.length > 0) {
      if (!this.activeStudentId || !session.students.find(s => s.id === this.activeStudentId)) {
        this.activeStudentId = session.students[0].id;
      }
      this.renderPortalDashboard();
    } else {
      this.renderLoginNotice();
    }
  },

  renderLoginNotice() {
    const container = document.getElementById('parent-portal-container');
    if (!container) return;
    container.innerHTML = `
      <div class="max-w-md mx-auto py-12 text-center">
        <div class="p-6 bg-white rounded-3xl shadow border border-slate-200">
          <p class="text-sm text-slate-600 mb-4">Veli portalına erişebilmek için lütfen Aile Kodunuz ile giriş yapınız.</p>
          <button onclick="window.App.logout()" class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs">Giriş Ekranına Dön</button>
        </div>
      </div>
    `;
  },

  selectStudent(studentId) {
    this.activeStudentId = studentId;
    this.renderPortalDashboard();
  },

  renderPortalDashboard() {
    const container = document.getElementById('parent-portal-container');
    if (!container) return;

    const session = window.App.currentSession;
    const students = session.students || [];
    const currentStudent = students.find(s => s.id === this.activeStudentId) || students[0];

    if (!currentStudent) {
      this.renderLoginNotice();
      return;
    }

    const stats = window.Store.getStudentStats(currentStudent.id);
    const attendanceRecords = window.Store.getAttendanceForStudent(currentStudent.id);
    const performances = window.Store.getPerformanceForStudent(currentStudent.id);

    container.innerHTML = `
      <div class="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <!-- Veli Başlığı & Kardeş Sekmeleri -->
        <div class="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold">
                  AİLE KODU: ${session.familyCode}
                </span>
                <span class="text-xs text-indigo-200">| Veli Bilgilendirme Portalı</span>
              </div>
              <h2 class="text-2xl font-black tracking-tight">Öğrenci Durum ve Karne Portalı</h2>
              <p class="text-xs text-indigo-200 mt-1">
                Bu alanda yalnızca çocuğunuza ait devam durumu, kılık-kıyafet/namaz bilgisi ve karnesini salt okunur olarak inceleyebilirsiniz.
              </p>
            </div>

            <div class="flex items-center gap-2 no-print">
              <button onclick="window.print()" 
                class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center gap-2 transition">
                <span>🖨️ Karne / Rapor Yazdır</span>
              </button>
              <button onclick="window.App.logout()" 
                class="px-4 py-2 bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition">
                Çıkış Yap
              </button>
            </div>
          </div>

          <!-- KARDEŞ SEKMELERİ -->
          ${students.length > 1 ? `
            <div class="mt-6 pt-5 border-t border-white/15 no-print">
              <div class="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-2 flex items-center gap-1.5">
                <span>👨‍👧‍👦 AİLEDEKİ ÇOCUKLARINIZ (${students.length} Kardeş):</span>
                <span class="text-[10px] text-indigo-300 font-normal">(Görüntülemek istediğiniz çocuğunuzu seçiniz)</span>
              </div>
              <div class="flex flex-wrap gap-2.5">
                ${students.map(s => {
                  const isCurrent = s.id === currentStudent.id;
                  return `
                    <button onclick="window.ParentPortal.selectStudent('${s.id}')"
                      class="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        isCurrent 
                          ? 'bg-white text-indigo-900 shadow-md scale-105' 
                          : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                      }">
                      <span class="w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-indigo-600' : 'bg-white/60'}"></span>
                      <span>${s.firstName} ${s.lastName}</span>
                      <span class="text-[11px] opacity-75">(${s.className} - No: ${s.studentNo})</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Öğrenci Künyesi -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-black text-xl flex items-center justify-center">
                ${currentStudent.firstName[0]}${currentStudent.lastName[0]}
              </div>
              <div>
                <h3 class="text-xl font-black text-slate-900">${currentStudent.firstName} ${currentStudent.lastName}</h3>
                <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                  <span>No: <strong class="text-slate-800">${currentStudent.studentNo}</strong></span>
                  <span>•</span>
                  <span>Sınıfı: <strong class="text-slate-800">${currentStudent.className}</strong></span>
                  <span>•</span>
                  <span>Etüt Hocası: <strong class="text-slate-800">${currentStudent.etutHocasi || '-'}</strong></span>
                  <span>•</span>
                  <span>Dahili Hoca: <strong class="text-slate-800">${currentStudent.dahiliHoca || '-'}</strong></span>
                  <span>•</span>
                  <span>Yatakhane: <strong class="text-indigo-800">${currentStudent.yatakhane || '-'}</strong></span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div class="text-[10px] font-bold text-emerald-700 uppercase">Devam Oranı</div>
                <div class="text-xl font-black text-emerald-800">%${stats.attendanceRate}</div>
              </div>
              <div class="px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <div class="text-[10px] font-bold text-purple-700 uppercase">Performans Notu</div>
                <div class="text-xl font-black text-purple-800">${stats.avgScore > 0 ? stats.avgScore + ' Puan' : 'Girilmedi'}</div>
              </div>
            </div>
          </div>

          <!-- 7 Özel Durum İstatistiği -->
          <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-5">
            ${Object.keys(window.STATUS_CONFIG).map(code => {
              const cfg = window.STATUS_CONFIG[code];
              const count = stats.counts[code] || 0;
              return `
                <div class="p-3 rounded-xl border flex flex-col items-center justify-center text-center" 
                  style="background-color: ${cfg.bg}08; border-color: ${cfg.border}30;">
                  <span class="w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center mb-1.5" 
                    style="background-color: ${cfg.bg};">
                    ${cfg.code}
                  </span>
                  <span class="text-[11px] font-semibold text-slate-700">${cfg.short}</span>
                  <span class="text-base font-black text-slate-900 mt-0.5">${count} Gün</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Detaylar: Yoklama Geçmişi & Performans -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h4 class="font-bold text-slate-800 text-sm mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span>📅</span> Günlük Yoklama ve Durum Geçmişi
            </h4>
            <div class="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              ${attendanceRecords.length === 0 ? `
                <div class="py-12 text-center text-slate-400 text-sm">Henüz kayıtlı yoklama bulunmuyor.</div>
              ` : attendanceRecords.map(r => {
                const cfg = window.STATUS_CONFIG[r.status] || window.STATUS_CONFIG['V'];
                return `
                  <div class="p-3 rounded-xl border border-slate-100 bg-slate-50/60 transition flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <span class="w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5"
                        style="background-color: ${cfg.bg};">
                        ${cfg.code}
                      </span>
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold text-slate-800">${cfg.label}</span>
                          <span class="text-[10px] text-slate-400 font-mono">${r.date}</span>
                        </div>
                        <div class="text-[11px] text-slate-500 mt-0.5">${cfg.desc}</div>
                        ${r.note ? `
                          <div class="text-xs text-slate-700 bg-white border border-slate-200 p-1.5 rounded-md mt-1.5 font-medium">
                            📝 <strong>Öğretmen Notu:</strong> ${r.note}
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h4 class="font-bold text-slate-800 text-sm mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span>🎓</span> Ders & Performans Karnesi
            </h4>
            <div class="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              ${performances.length === 0 ? `
                <div class="py-12 text-center text-slate-400 text-sm">Henüz öğretmen değerlendirmesi girilmemiştir.</div>
              ` : performances.map(p => `
                <div class="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div class="font-bold text-slate-900 text-sm">${p.subject}</div>
                      <div class="text-[10px] text-slate-400 font-medium">Tarih: ${p.date}</div>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 font-black text-xs">
                      ${p.criteria?.score || 100} / 100
                    </span>
                  </div>
                  <div class="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-2 rounded-lg text-slate-700 mb-2">
                    <div>Katılım: <span class="text-amber-500 font-bold">${'★'.repeat(p.criteria?.participation || 5)}</span></div>
                    <div>Ödev: <span class="text-amber-500 font-bold">${'★'.repeat(p.criteria?.homework || 5)}</span></div>
                    <div>Uyum & Namaz: <span class="text-amber-500 font-bold">${'★'.repeat(p.criteria?.behavior || 5)}</span></div>
                  </div>
                  ${p.teacherNote ? `
                    <div class="text-xs text-slate-700 bg-emerald-50 border-l-2 border-emerald-500 p-2 rounded-r">
                      <strong>Eğitmen Görüşü:</strong> ${p.teacherNote}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
