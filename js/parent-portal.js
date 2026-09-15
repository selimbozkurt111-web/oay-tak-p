/**
 * parent-portal.js - Kardeş Destekli Veli Portalı (Salt Okunur / Read-Only)
 */

window.ParentPortal = {
  activeFamilyCode: null,
  activeStudentId: null,
  familyStudents: [],

  init() {
    // Veli daha önce kod girdiyse hafızada tut
    const savedCode = sessionStorage.getItem('yoklama_parent_code');
    if (savedCode) {
      this.loginWithCode(savedCode, false);
    } else {
      this.renderLoginScreen();
    }
  },

  renderLoginScreen() {
    const container = document.getElementById('parent-portal-container');
    if (!container) return;

    container.innerHTML = `
      <div class="max-w-md mx-auto py-12 px-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
          <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl shadow-inner font-bold">
            👨‍👩‍👧‍👦
          </div>
          <h2 class="text-2xl font-black text-slate-900 mb-2">Veli Bilgilendirme Portalı</h2>
          <p class="text-xs text-slate-500 mb-6 leading-relaxed">
            Çocuklarınızın kurstaki yoklama, namaz, kılık-kıyafet ve ders performans durumunu incelemek için size verilen <strong>Aile / Veli Kodunu</strong> giriniz.
          </p>

          <form onsubmit="window.ParentPortal.handleLoginSubmit(event)" class="space-y-4">
            <div>
              <label class="block text-left text-xs font-bold text-slate-600 mb-1.5 uppercase">AİLE / VELİ KODU</label>
              <input type="text" id="parent-code-input" required placeholder="Örn: YILMAZ2026" 
                class="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-lg font-mono font-bold text-slate-800 tracking-wider uppercase focus:border-indigo-600 focus:bg-white focus:outline-none transition">
            </div>

            <button type="submit" 
              class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2">
              <span>Sisteme Giriş Yap</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </button>
          </form>

          <!-- Hızlı Test / Örnek Kod Kutusu -->
          <div class="mt-8 pt-6 border-t border-slate-100 text-left">
            <div class="text-[11px] font-bold text-slate-400 uppercase mb-2">💡 Hızlı Deneme İçin Örnek Aile Kodları:</div>
            <div class="space-y-1.5 text-xs text-slate-600">
              <button onclick="window.ParentPortal.fillAndLogin('YILMAZ2026')" class="w-full p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left flex items-center justify-between transition">
                <span><strong>YILMAZ2026</strong> (Ahmet & Ali - 2 Kardeş)</span>
                <span class="text-indigo-600 font-bold text-[11px]">Dene →</span>
              </button>
              <button onclick="window.ParentPortal.fillAndLogin('DEMIR2026')" class="w-full p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left flex items-center justify-between transition">
                <span><strong>DEMIR2026</strong> (Bilal & Ömer Faruk - 2 Kardeş)</span>
                <span class="text-indigo-600 font-bold text-[11px]">Dene →</span>
              </button>
              <button onclick="window.ParentPortal.fillAndLogin('CAN2026')" class="w-full p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left flex items-center justify-between transition">
                <span><strong>CAN2026</strong> (Yusuf Can - Tek Çocuk)</span>
                <span class="text-indigo-600 font-bold text-[11px]">Dene →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  fillAndLogin(code) {
    const input = document.getElementById('parent-code-input');
    if (input) input.value = code;
    this.loginWithCode(code);
  },

  handleLoginSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('parent-code-input');
    if (!input || !input.value.trim()) return;
    this.loginWithCode(input.value.trim());
  },

  loginWithCode(code, showToast = true) {
    const students = window.Store.getStudentsByFamilyCode(code);

    if (students.length === 0) {
      // Kod bulunamadıysa öğrenci no olarak da kontrol edelim
      const singleStudent = window.Store.getStudentByNo(code);
      if (singleStudent) {
        this.activeFamilyCode = singleStudent.familyCode || code;
        this.familyStudents = [singleStudent];
        this.activeStudentId = singleStudent.id;
        sessionStorage.setItem('yoklama_parent_code', code);
        if (showToast) window.App.showToast(`Hoş geldiniz Sayın ${singleStudent.fatherName || 'Veli'}`, 'success');
        this.renderPortalDashboard();
        return;
      }

      window.App.showToast('Girilen Aile / Veli Koduna ait öğrenci kaydı bulunamadı. Lütfen kontrol ediniz.', 'error');
      return;
    }

    this.activeFamilyCode = code.toUpperCase();
    this.familyStudents = students;
    this.activeStudentId = students[0].id;
    sessionStorage.setItem('yoklama_parent_code', this.activeFamilyCode);

    const familyName = students[0].lastName || '';
    if (showToast) {
      window.App.showToast(`Hoş geldiniz (${familyName} Ailesi - ${students.length} Öğrenci)`, 'success');
    }

    this.renderPortalDashboard();
  },

  logout() {
    sessionStorage.removeItem('yoklama_parent_code');
    this.activeFamilyCode = null;
    this.activeStudentId = null;
    this.familyStudents = [];
    this.renderLoginScreen();
    window.App.showToast('Veli portalından güvenli çıkış yapıldı.', 'info');
  },

  selectStudent(studentId) {
    this.activeStudentId = studentId;
    this.renderPortalDashboard();
  },

  renderPortalDashboard() {
    const container = document.getElementById('parent-portal-container');
    if (!container) return;

    const currentStudent = this.familyStudents.find(s => s.id === this.activeStudentId) || this.familyStudents[0];
    if (!currentStudent) {
      this.renderLoginScreen();
      return;
    }

    const stats = window.Store.getStudentStats(currentStudent.id);
    const attendanceRecords = window.Store.getAttendanceForStudent(currentStudent.id);
    const performances = window.Store.getPerformanceForStudent(currentStudent.id);

    container.innerHTML = `
      <div class="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <!-- Veli Hoşgeldiniz & Kardeş Seçim Başlığı -->
        <div class="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div class="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold backdrop-blur-xs">
                  AİLE KODU: ${this.activeFamilyCode}
                </span>
                <span class="text-xs text-indigo-200">| Anne: ${currentStudent.motherName || '-'} / Baba: ${currentStudent.fatherName || '-'}</span>
              </div>
              <h2 class="text-2xl font-black tracking-tight">Veli Bilgilendirme ve Takip Portalı</h2>
              <p class="text-xs text-indigo-200 mt-1">
                Bu alanda yalnızca çocuğunuza ait devamsızlık, namaz durumu ve ders gelişim karnesini salt okunur olarak inceleyebilirsiniz.
              </p>
            </div>

            <div class="flex items-center gap-3 no-print">
              <button onclick="window.print()" 
                class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center gap-2 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                </svg>
                Karne / Rapor Yazdır
              </button>
              <button onclick="window.ParentPortal.logout()" 
                class="px-4 py-2 bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition">
                Çıkış Yap
              </button>
            </div>
          </div>

          <!-- KARDEŞ SEÇİM SEKMELERİ (Birden fazla kardeş varsa gösterilir) -->
          ${this.familyStudents.length > 1 ? `
            <div class="mt-6 pt-5 border-t border-white/15 no-print">
              <div class="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-2 flex items-center gap-1.5">
                <span>👨‍👧‍👦 AİLEDEKİ ÇOCUKLARINIZ (${this.familyStudents.length} Kardeş):</span>
                <span class="text-[10px] text-indigo-300 font-normal">(Görüntülemek istediğiniz çocuğunuzu seçiniz)</span>
              </div>
              <div class="flex flex-wrap gap-2.5">
                ${this.familyStudents.map(s => {
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

        <!-- Seçili Öğrencinin Kimlik ve Özet Kartı -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-black text-xl flex items-center justify-center">
                ${currentStudent.firstName[0]}${currentStudent.lastName[0]}
              </div>
              <div>
                <h3 class="text-xl font-black text-slate-900">${currentStudent.firstName} ${currentStudent.lastName}</h3>
                <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                  <span>Okul/Kurs No: <strong class="text-slate-800">${currentStudent.studentNo}</strong></span>
                  <span>•</span>
                  <span>Sınıf/Şube: <strong class="text-slate-800">${currentStudent.className}</strong></span>
                  <span>•</span>
                  <span>Veli Tel: <strong class="text-slate-800">${currentStudent.parentPhone || '-'}</strong></span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <!-- Devam Oranı Rozeti -->
              <div class="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div class="text-[10px] font-bold text-emerald-700 uppercase">Kursa Devam Oranı</div>
                <div class="text-xl font-black text-emerald-800">%${stats.attendanceRate}</div>
              </div>

              <!-- Başarı Puanı Rozeti -->
              <div class="px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <div class="text-[10px] font-bold text-purple-700 uppercase">Performans Notu</div>
                <div class="text-xl font-black text-purple-800">${stats.avgScore > 0 ? stats.avgScore + ' Puan' : 'Henüz Girilmedi'}</div>
              </div>
            </div>
          </div>

          <!-- 7 Özel Durumun Sayısal Dağılımı -->
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

        <!-- İki Sütunlu Detay Alanı: Yoklama Geçmişi & Performans Karnesi -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Sol Sütun: Gün Gün Yoklama ve Devamsızlık Listesi -->
          <div class="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  📅
                </div>
                <div>
                  <h4 class="font-bold text-slate-800 text-sm">Günlük Yoklama ve Durum Geçmişi</h4>
                  <p class="text-[11px] text-slate-400">Son tarihten geriye doğru sıralanmıştır</p>
                </div>
              </div>
              <span class="text-xs font-bold text-slate-500">Toplam: ${attendanceRecords.length} Gün</span>
            </div>

            <div class="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              ${attendanceRecords.length === 0 ? `
                <div class="py-12 text-center text-slate-400 text-sm">Henüz kayıtlı yoklama bulunmuyor.</div>
              ` : attendanceRecords.map(r => {
                const cfg = window.STATUS_CONFIG[r.status] || window.STATUS_CONFIG['V'];
                return `
                  <div class="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <span class="w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
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

          <!-- Sağ Sütun: Ders & Performans Karnesi, Öğretmen Görüşleri -->
          <div class="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  🎓
                </div>
                <div>
                  <h4 class="font-bold text-slate-800 text-sm">Performans Karnesi ve Öğretmen Görüşleri</h4>
                  <p class="text-[11px] text-slate-400">Eğitmenlerin ders içi gelişim değerlendirmeleri</p>
                </div>
              </div>
              <span class="text-xs font-bold text-slate-500">${performances.length} Değerlendirme</span>
            </div>

            <div class="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
              ${performances.length === 0 ? `
                <div class="py-12 text-center text-slate-400 text-sm">Henüz öğretmen değerlendirmesi girilmemiştir.</div>
              ` : performances.map(p => {
                return `
                  <div class="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                    <div class="flex items-start justify-between gap-3 mb-2.5">
                      <div>
                        <div class="font-bold text-slate-900 text-sm text-indigo-950">${p.subject}</div>
                        <div class="text-[10px] text-slate-400 font-medium">Değerlendirme Tarihi: ${p.date}</div>
                      </div>
                      <span class="px-3 py-1 rounded-lg bg-purple-100 text-purple-900 font-black text-xs border border-purple-200">
                        ${p.criteria?.score || 100} / 100
                      </span>
                    </div>

                    <!-- Kriter Yıldızları -->
                    <div class="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg text-slate-700 mb-2.5 font-medium">
                      <div>Ders Katılımı: <div class="text-amber-500 font-bold">${'★'.repeat(p.criteria?.participation || 5)}</div></div>
                      <div>Ödev & Ezber: <div class="text-amber-500 font-bold">${'★'.repeat(p.criteria?.homework || 5)}</div></div>
                      <div>Uyum & Namaz: <div class="text-amber-500 font-bold">${'★'.repeat(p.criteria?.behavior || 5)}</div></div>
                    </div>

                    <!-- Rozetler -->
                    ${p.badges && p.badges.length > 0 ? `
                      <div class="flex flex-wrap gap-1.5 mb-2.5">
                        ${p.badges.map(b => `<span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">${b}</span>`).join('')}
                      </div>
                    ` : ''}

                    <!-- Öğretmen Notu -->
                    ${p.teacherNote ? `
                      <div class="text-xs text-slate-700 bg-emerald-50 border-l-3 border-emerald-500 p-2.5 rounded-r">
                        <strong class="text-emerald-900">Eğitmen Görüşü:</strong> ${p.teacherNote}
                      </div>
                    ` : ''}

                    <div class="text-right text-[10px] text-slate-400 mt-2 font-medium">
                      Değerlendiren: <span class="text-slate-700 font-bold">${p.teacherName || 'Öğretmen'}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
