/**
 * leave-return.js - Haftalık İzin Dönüşü Takip Modülü
 * - Talebelerin yurda/kuruma dönüş saatlerini anlık veya manuel kaydetme
 * - Belirlenen standart dönüş saatine göre Erken / Vaktinde / Geç kalanları hesaplama
 * - Kaç dakika geç kaldıysa 3 katı (geç_dakika * 3) izne geç çıkış cezası hesaplayıp sisteme işleme
 * - Canlı bulut senkronizasyonu ve anlık liste filtreleme
 */

window.LeaveReturnModule = {
  currentDate: new Date().toISOString().split('T')[0],
  expectedReturnTime: localStorage.getItem('yoklama_expected_return_time') || '18:00',
  selectedClasses: [],
  statusFilter: 'ALL', // 'ALL' | 'GEC' | 'GELMEDI' | 'ERKEN' | 'VAKTINDE'
  searchQuery: '',

  init() {
    this.renderView();
  },

  getDayName(dateStr) {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const d = new Date(dateStr);
    return isNaN(d) ? '' : days[d.getDay()];
  },

  setDate(dateStr) {
    if (!dateStr) return;
    this.currentDate = dateStr;
    this.renderView();
  },

  setToday() {
    this.currentDate = new Date().toISOString().split('T')[0];
    this.renderView();
  },

  prevDay() {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() - 1);
    this.currentDate = d.toISOString().split('T')[0];
    this.renderView();
  },

  nextDay() {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + 1);
    this.currentDate = d.toISOString().split('T')[0];
    this.renderView();
  },

  setExpectedReturnTime(timeStr) {
    if (!timeStr) return;
    this.expectedReturnTime = timeStr;
    localStorage.setItem('yoklama_expected_return_time', timeStr);
    
    // Var olan o günkü kayıtların durumlarını yeni saate göre güncelle
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    Object.keys(dayReturns).forEach(studentId => {
      const rec = dayReturns[studentId];
      if (rec && rec.arrivalTime) {
        const calc = this.calculateDifference(rec.arrivalTime, this.expectedReturnTime);
        window.Store.saveLeaveReturn(this.currentDate, studentId, {
          ...rec,
          expectedTime: this.expectedReturnTime,
          ...calc
        });
      }
    });

    this.renderView();
    if (window.App && window.App.showToast) {
      window.App.showToast(`Standart izin dönüş saati ${timeStr} olarak güncellendi.`, 'info');
    }
  },

  toggleClass(className) {
    if (this.selectedClasses.includes(className)) {
      this.selectedClasses = this.selectedClasses.filter(c => c !== className);
    } else {
      this.selectedClasses.push(className);
    }
    this.renderView();
  },

  toggleAllClasses() {
    this.selectedClasses = [];
    this.renderView();
  },

  setStatusFilter(status) {
    this.statusFilter = status;
    this.renderView();
  },

  setSearchQuery(q) {
    this.searchQuery = (q || '').toLowerCase().trim();
    this.renderStudentRows();
  },

  // Zaman farkı ve 3x ceza hesaplayıcı
  calculateDifference(arrivalTime, expectedTime) {
    const [arrH, arrM] = arrivalTime.split(':').map(Number);
    const [expH, expM] = expectedTime.split(':').map(Number);
    const arrTotal = arrH * 60 + arrM;
    const expTotal = expH * 60 + expM;
    const diff = arrTotal - expTotal;

    if (diff > 0) {
      // Geç kaldı: 1 dk gecikme = 3 dk geç çıkış cezası!
      const penaltyMinutes = diff * 3;
      return {
        status: 'GEC',
        lateMinutes: diff,
        earlyMinutes: 0,
        penaltyMinutes: penaltyMinutes,
        statusLabel: `${diff} dk Geç Kaldı`,
        penaltyLabel: `+${penaltyMinutes} dk Ceza (3x)`
      };
    } else if (diff < 0) {
      // Erken geldi
      const early = Math.abs(diff);
      return {
        status: 'ERKEN',
        lateMinutes: 0,
        earlyMinutes: early,
        penaltyMinutes: 0,
        statusLabel: `${early} dk Erken`,
        penaltyLabel: 'Ceza Yok'
      };
    } else {
      // Tam vaktinde
      return {
        status: 'VAKTINDE',
        lateMinutes: 0,
        earlyMinutes: 0,
        penaltyMinutes: 0,
        statusLabel: 'Tam Vaktinde',
        penaltyLabel: 'Ceza Yok'
      };
    }
  },

  // "⚡ Şimdi Geldi" Tek Tık Hızlı Kayıt
  recordNow(studentId) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const arrivalTime = `${h}:${m}`;
    this.recordArrivalTime(studentId, arrivalTime);
  },

  recordArrivalTime(studentId, arrivalTime) {
    if (!arrivalTime) return;
    const calc = this.calculateDifference(arrivalTime, this.expectedReturnTime);
    window.Store.saveLeaveReturn(this.currentDate, studentId, {
      arrivalTime,
      expectedTime: this.expectedReturnTime,
      ...calc
    });

    this.renderView();
    if (window.App && window.App.showToast) {
      const st = window.Store.getStudentById(studentId);
      const name = st ? `${st.firstName} ${st.lastName}` : 'Öğrenci';
      if (calc.status === 'GEC') {
        window.App.showToast(`⚠️ ${name}: ${calc.statusLabel} (+${calc.penaltyMinutes} dk geç çıkış cezası işlendi)`, 'warning');
      } else {
        window.App.showToast(`✅ ${name} kaydedildi: ${arrivalTime} (${calc.statusLabel})`, 'success');
      }
    }
  },

  clearRecord(studentId) {
    window.Store.deleteLeaveReturn(this.currentDate, studentId);
    this.renderView();
    if (window.App && window.App.showToast) {
      window.App.showToast('Giriş kaydı silindi (Henüz Gelmedi durumuna alındı).', 'info');
    }
  },

  getFilteredStudents() {
    let students = window.Store.getStudents();
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);

    // Sınıf filtresi
    if (this.selectedClasses && this.selectedClasses.length > 0) {
      students = students.filter(s => this.selectedClasses.includes(s.className));
    }

    // Durum filtresi (Tümü, Geç Kalanlar, Gelmeyenler, Erken, Vaktinde)
    if (this.statusFilter !== 'ALL') {
      students = students.filter(s => {
        const rec = dayReturns[s.id];
        if (this.statusFilter === 'GELMEDI') {
          return !rec || !rec.arrivalTime;
        }
        if (!rec || !rec.arrivalTime) return false;
        return rec.status === this.statusFilter;
      });
    }

    // Arama filtresi
    if (this.searchQuery) {
      students = students.filter(s =>
        s.firstName.toLowerCase().includes(this.searchQuery) ||
        s.lastName.toLowerCase().includes(this.searchQuery) ||
        (s.studentNo && s.studentNo.includes(this.searchQuery)) ||
        (s.className && s.className.toLowerCase().includes(this.searchQuery)) ||
        (s.yatakhane && s.yatakhane.toLowerCase().includes(this.searchQuery))
      );
    }

    return students;
  },

  renderView() {
    const container = document.getElementById('leave-return-container');
    if (!container) return;

    const allStudents = window.Store.getStudents();
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    const classes = window.Store.getClasses();
    const dayName = this.getDayName(this.currentDate);

    // KPI İstatistikleri
    let arrivedCount = 0;
    let lateCount = 0;
    let earlyCount = 0;
    let onTimeCount = 0;
    let totalPenaltyMins = 0;

    allStudents.forEach(s => {
      const rec = dayReturns[s.id];
      if (rec && rec.arrivalTime) {
        arrivedCount++;
        if (rec.status === 'GEC') {
          lateCount++;
          totalPenaltyMins += (rec.penaltyMinutes || 0);
        } else if (rec.status === 'ERKEN') {
          earlyCount++;
        } else if (rec.status === 'VAKTINDE') {
          onTimeCount++;
        }
      }
    });

    const notArrivedCount = allStudents.length - arrivedCount;

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in max-w-7xl mx-auto">
        <!-- 1. ÜST BAŞLIK & KONTROL PANELİ -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>🧳 Haftalık İzin Dönüşü Takip Sistemi</span>
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Talebelerin varış saatini anında kaydedin. Geç kalanlara <strong class="text-rose-700">dakika başına 3 katı (3x)</strong> geç çıkış cezası otomatik uygulanır.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="window.print()" 
                class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs">
                <span>🖨️ Çizelgeyi Yazdır / PDF</span>
              </button>
            </div>
          </div>

          <!-- Tarih & Standart Dönüş Saati Ayarı -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-black text-slate-700 uppercase">DÖNÜŞ TARİHİ:</span>
              <button onclick="window.LeaveReturnModule.prevDay()" 
                class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition">◀</button>
              
              <input type="date" value="${this.currentDate}" 
                class="px-3 py-1.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                onchange="window.LeaveReturnModule.setDate(this.value)">

              <div class="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-2xs">
                📅 ${dayName}
              </div>

              <button onclick="window.LeaveReturnModule.nextDay()" 
                class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition">▶</button>

              <button onclick="window.LeaveReturnModule.setToday()" 
                class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">
                Bugün
              </button>
            </div>

            <!-- Beklenen Standart Dönüş Saati -->
            <div class="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-2xl">
              <span class="text-lg">⏰</span>
              <div>
                <div class="text-[10px] font-black text-indigo-900 uppercase">STANDART DÖNÜŞ SAATİ:</div>
                <div class="flex items-center gap-1.5">
                  <input type="time" value="${this.expectedReturnTime}" 
                    class="bg-white border border-indigo-300 font-mono font-black text-xs text-indigo-950 px-2 py-0.5 rounded-lg focus:outline-none"
                    onchange="window.LeaveReturnModule.setExpectedReturnTime(this.value)">
                  <span class="text-[10px] text-indigo-600 font-bold">(Bu saatten sonrası gecikmedir)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sınıf Filtresi -->
          <div class="pt-2 border-t border-slate-100">
            <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>SINIF FİLTRESİ:</span>
              ${this.selectedClasses.length > 0 ? `
                <span class="text-indigo-600 font-semibold cursor-pointer hover:underline" onclick="window.LeaveReturnModule.toggleAllClasses()">
                  Filtreyi Temizle
                </span>
              ` : ''}
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <button type="button" onclick="window.LeaveReturnModule.toggleAllClasses()"
                class="px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  this.selectedClasses.length === 0 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }">
                Tüm Sınıflar (${allStudents.length})
              </button>
              ${classes.map(c => {
                const isChecked = this.selectedClasses.includes(c);
                return `
                  <button type="button" onclick="window.LeaveReturnModule.toggleClass('${c}')"
                    class="px-3 py-1.5 rounded-xl text-xs font-black transition border flex items-center gap-1.5 ${
                      isChecked 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }">
                    <span>${isChecked ? '✓' : '+'}</span>
                    <span>${c}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- 2. KPI CANLI SAYAÇ KARTLARI -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <!-- Toplam -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('ALL')"
            class="cursor-pointer bg-white p-3.5 rounded-2xl border transition-all ${
              this.statusFilter === 'ALL' ? 'ring-2 ring-slate-900 shadow-md border-slate-900' : 'border-slate-200 hover:border-slate-300'
            }">
            <div class="text-[10px] font-bold text-slate-500 uppercase">TÜM TALEBELER</div>
            <div class="text-2xl font-black text-slate-800 mt-1">${allStudents.length}</div>
            <div class="text-[10px] text-slate-400">Beklenen mevcud</div>
          </div>

          <!-- Gelenler -->
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200">
            <div class="text-[10px] font-bold text-emerald-600 uppercase">GELENLER (TOPLAM)</div>
            <div class="text-2xl font-black text-emerald-700 mt-1">${arrivedCount} / ${allStudents.length}</div>
            <div class="text-[10px] text-emerald-600 font-bold">%${allStudents.length ? Math.round((arrivedCount / allStudents.length) * 100) : 0} Dönüş Oranı</div>
          </div>

          <!-- Henüz Gelmedi (Yolda) -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('GELMEDI')"
            class="cursor-pointer bg-white p-3.5 rounded-2xl border transition-all ${
              this.statusFilter === 'GELMEDI' ? 'ring-2 ring-amber-500 shadow-md border-amber-500' : 'border-amber-200 hover:border-amber-300'
            }">
            <div class="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1">
              <span>⏳ YOLDA / GELMEDİ</span>
            </div>
            <div class="text-2xl font-black text-amber-700 mt-1">${notArrivedCount}</div>
            <div class="text-[10px] text-amber-600 font-medium">Giriş bekleniyor</div>
          </div>

          <!-- Geç Kalanlar (3x Ceza Uygulananlar) -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('GEC')"
            class="cursor-pointer bg-rose-50/70 p-3.5 rounded-2xl border transition-all ${
              this.statusFilter === 'GEC' ? 'ring-2 ring-rose-600 shadow-md border-rose-600' : 'border-rose-200 hover:border-rose-300'
            }">
            <div class="text-[10px] font-black text-rose-800 uppercase flex items-center gap-1">
              <span>🔴 GEÇ KALANLAR</span>
            </div>
            <div class="text-2xl font-black text-rose-700 mt-1">${lateCount}</div>
            <div class="text-[10px] text-rose-600 font-black">+${totalPenaltyMins} dk 3x Ceza</div>
          </div>

          <!-- Erken Gelenler -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('ERKEN')"
            class="cursor-pointer bg-white p-3.5 rounded-2xl border transition-all ${
              this.statusFilter === 'ERKEN' ? 'ring-2 ring-emerald-600 shadow-md border-emerald-600' : 'border-emerald-200 hover:border-emerald-300'
            }">
            <div class="text-[10px] font-bold text-emerald-800 uppercase">🟢 ERKEN GELENLER</div>
            <div class="text-2xl font-black text-emerald-700 mt-1">${earlyCount}</div>
            <div class="text-[10px] text-emerald-600">Saatinden önce gelen</div>
          </div>

          <!-- Vaktinde Gelenler -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('VAKTINDE')"
            class="cursor-pointer bg-white p-3.5 rounded-2xl border transition-all ${
              this.statusFilter === 'VAKTINDE' ? 'ring-2 ring-blue-600 shadow-md border-blue-600' : 'border-blue-200 hover:border-blue-300'
            }">
            <div class="text-[10px] font-bold text-blue-800 uppercase">🔵 TAM VAKTİNDE</div>
            <div class="text-2xl font-black text-blue-700 mt-1">${onTimeCount}</div>
            <div class="text-[10px] text-blue-600">Saatinde gelen</div>
          </div>
        </div>

        <!-- 3. ARAMA VE LİSTE KARTI -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black text-slate-800 uppercase">TALEBE LİSTESİ & VARIS SAATLERİ</span>
              ${this.statusFilter !== 'ALL' ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300">
                  Filtre: ${this.statusFilter === 'GEC' ? '🔴 Sadece Geç Kalanlar' : (this.statusFilter === 'GELMEDI' ? '⏳ Sadece Gelmeyenler' : (this.statusFilter === 'ERKEN' ? '🟢 Erken Gelenler' : '🔵 Vaktinde Gelenler'))}
                  <button onclick="window.LeaveReturnModule.setStatusFilter('ALL')" class="ml-1 text-indigo-700 hover:text-black">×</button>
                </span>
              ` : ''}
            </div>

            <div class="w-full sm:w-64 relative">
              <input type="text" placeholder="İsim, No veya Oda ara..." 
                value="${this.searchQuery}"
                oninput="window.LeaveReturnModule.setSearchQuery(this.value)"
                class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs">
              <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          <!-- Tablo Alanı -->
          <div id="leave-return-table-container" class="overflow-x-auto">
            <!-- renderStudentRows() ile doldurulacak -->
          </div>
        </div>
      </div>
    `;

    this.renderStudentRows();
  },

  renderStudentRows() {
    const tableContainer = document.getElementById('leave-return-table-container');
    if (!tableContainer) return;

    const students = this.getFilteredStudents();
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);

    if (students.length === 0) {
      tableContainer.innerHTML = `
        <div class="text-center py-12 text-slate-400">
          <span class="text-3xl block mb-2">🔍</span>
          <div class="text-sm font-bold text-slate-600">Kriterlere uygun talebe bulunamadı.</div>
          <div class="text-xs text-slate-400 mt-1">Filtrelerinizi temizleyip tekrar deneyiniz.</div>
        </div>
      `;
      return;
    }

    tableContainer.innerHTML = `
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
            <th class="py-3 px-4 w-12 text-center">#</th>
            <th class="py-3 px-4">Talebe Bilgisi</th>
            <th class="py-3 px-4">Sınıf / Oda</th>
            <th class="py-3 px-4 min-w-[200px]">Varış Saati</th>
            <th class="py-3 px-4">Durum</th>
            <th class="py-3 px-4">İzne Geç Çıkış Cezası</th>
            <th class="py-3 px-4 text-center w-24 no-print">İşlem</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${students.map((s, idx) => {
            const rec = dayReturns[s.id];
            const hasRecord = rec && rec.arrivalTime;
            const status = hasRecord ? rec.status : 'GELMEDI';

            let statusBadge = '';
            let penaltyBadge = '';

            if (!hasRecord) {
              statusBadge = `<span class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center gap-1 w-max">⏳ Yolda / Gelmedi</span>`;
              penaltyBadge = `<span class="text-slate-400 font-medium">-</span>`;
            } else if (status === 'GEC') {
              statusBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 font-black border border-rose-300 flex items-center gap-1 w-max shadow-2xs">
                  <span>🔴</span> <span>${rec.statusLabel || `${rec.lateMinutes} dk Geç`}</span>
                </span>
              `;
              penaltyBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center gap-1 w-max shadow-xs animate-pulse">
                  <span>⚡</span> <span>+${rec.penaltyMinutes} dk Geç Çıkış (3x)</span>
                </span>
              `;
            } else if (status === 'ERKEN') {
              statusBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-black border border-emerald-300 flex items-center gap-1 w-max">
                  <span>🟢</span> <span>${rec.statusLabel || `${rec.earlyMinutes} dk Erken`}</span>
                </span>
              `;
              penaltyBadge = `<span class="text-emerald-700 font-bold text-[11px]">✓ Ceza Yok</span>`;
            } else {
              statusBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-black border border-blue-300 flex items-center gap-1 w-max">
                  <span>🔵</span> <span>Tam Vaktinde</span>
                </span>
              `;
              penaltyBadge = `<span class="text-emerald-700 font-bold text-[11px]">✓ Ceza Yok</span>`;
            }

            return `
              <tr class="hover:bg-slate-50/80 transition ${hasRecord && status === 'GEC' ? 'bg-rose-50/30' : ''}">
                <td class="py-3 px-4 text-center font-bold text-slate-400">${idx + 1}</td>
                
                <!-- İsim ve Numara -->
                <td class="py-3 px-4">
                  <div class="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <span>${s.firstName} ${s.lastName}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 font-mono">No: ${s.studentNo || s.id}</div>
                </td>

                <!-- Sınıf & Yatakhane -->
                <td class="py-3 px-4">
                  <div class="font-bold text-slate-700 text-xs">${s.className}</div>
                  <div class="text-[10px] text-slate-500">${s.yatakhane || '-'}</div>
                </td>

                <!-- Varış Saati & Şimdi Geldi Butonu -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2 flex-wrap">
                    ${hasRecord ? `
                      <input type="time" value="${rec.arrivalTime}" 
                        class="px-2.5 py-1 bg-white border border-slate-300 font-mono font-black text-xs text-slate-900 rounded-xl focus:border-indigo-500 focus:outline-none shadow-2xs"
                        onchange="window.LeaveReturnModule.recordArrivalTime('${s.id}', this.value)">
                    ` : `
                      <button type="button" onclick="window.LeaveReturnModule.recordNow('${s.id}')"
                        class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs rounded-xl transition flex items-center gap-1 shadow-xs">
                        <span>⚡</span>
                        <span>Şimdi Geldi</span>
                      </button>
                      
                      <input type="time" 
                        placeholder="--:--"
                        class="px-2 py-1 bg-slate-50 border border-slate-200 font-mono text-xs text-slate-600 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none w-24"
                        onchange="window.LeaveReturnModule.recordArrivalTime('${s.id}', this.value)">
                    `}
                  </div>
                </td>

                <!-- Durum -->
                <td class="py-3 px-4">
                  ${statusBadge}
                </td>

                <!-- İzne Geç Çıkış Cezası (3x) -->
                <td class="py-3 px-4">
                  ${penaltyBadge}
                </td>

                <!-- İşlemler -->
                <td class="py-3 px-4 text-center no-print">
                  ${hasRecord ? `
                    <button type="button" onclick="window.LeaveReturnModule.clearRecord('${s.id}')"
                      title="Giriş saatini sil / Sıfırla"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition text-sm">
                      🗑️
                    </button>
                  ` : `
                    <span class="text-slate-300 text-xs">-</span>
                  `}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }
};
