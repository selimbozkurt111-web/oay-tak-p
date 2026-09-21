/**
 * leave-return.js - Haftalık İzin Dönüşü Takip Modülü
 * - 5 ve 6. Sınıflar: Resmi dönüş Pazartesi sabahı (08:00). Pazar günü saat kaçta gelirlerse gelsinler ERKEN sayılır (0 dk ceza).
 * - 7 ve 8. Sınıflar: Resmi dönüş Pazar akşamı (varsayılan 18:00).
 * - Standart Pazar ve Pazartesi saatleri arayüzden kolayca değiştirilebilir.
 * - "⚡ Şimdi Geldi" ve "🏷️ İzinli" mazeret butonları (Yarın Sabah, 30 dk, 1 saat, 1.5 saat, 2 saat).
 * - İzinli olanlar: 0 Puan alır, 0 Ceza alır.
 * - Geç kalanlara dakika başına 3 katı (3x) izne geç çıkış cezası.
 */

window.LeaveReturnModule = {
  currentDate: new Date().toISOString().split('T')[0],
  expectedSundayTime: localStorage.getItem('yoklama_expected_sunday_time') || localStorage.getItem('yoklama_expected_return_time') || '18:00',
  expectedMondayTime: localStorage.getItem('yoklama_expected_monday_time') || '08:00',
  expectedReturnTime: localStorage.getItem('yoklama_expected_sunday_time') || localStorage.getItem('yoklama_expected_return_time') || '18:00',
  selectedClasses: [],
  statusFilter: 'ALL', // 'ALL' | 'GEC' | 'GELMEDI' | 'IZINLI' | 'ERKEN' | 'VAKTINDE'
  searchQuery: '',
  activeExcuseStudentId: null,

  init() {
    this.renderView();
  },

  // 0: Pazar, 1: Pazartesi, 2: Salı, ...
  getDayOfWeek(dateStr) {
    if (!dateStr) return -1;
    const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
    return isNaN(d) ? -1 : d.getDay();
  },

  getDayName(dateStr) {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const idx = this.getDayOfWeek(dateStr);
    return idx >= 0 ? days[idx] : '';
  },

  getPreviousDayString(dateStr) {
    const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  },

  getNextDayString(dateStr) {
    const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
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
    this.currentDate = this.getPreviousDayString(this.currentDate);
    this.renderView();
  },

  nextDay() {
    this.currentDate = this.getNextDayString(this.currentDate);
    this.renderView();
  },

  // 5 veya 6. Sınıf kontrolü
  isJuniorStudent(student) {
    if (!student) return false;
    const cName = (typeof student === 'string' ? student : (student.className || '')).trim();
    if (/^[56]|^5\b|^6\b|5\.\s*sınıf|6\.\s*sınıf/i.test(cName)) return true;
    const no = String(student.studentNo || '');
    if (/^[56]\d{2}/.test(no)) return true;
    return false;
  },

  // Talebenin ilgili gündeki beklenen dönüş saati
  getExpectedTimeForStudent(student, dateStr = this.currentDate) {
    const day = this.getDayOfWeek(dateStr);
    const isJunior = this.isJuniorStudent(student);
    if (day === 1 && isJunior) {
      return this.expectedMondayTime || '08:00';
    }
    return this.expectedSundayTime || '18:00';
  },

  setExpectedSundayTime(timeStr) {
    if (!timeStr) return;
    this.expectedSundayTime = timeStr;
    this.expectedReturnTime = timeStr;
    localStorage.setItem('yoklama_expected_sunday_time', timeStr);
    localStorage.setItem('yoklama_expected_return_time', timeStr);
    this.recalculateCurrentDayReturns();
    this.renderView();
    if (window.App && window.App.showToast) {
      window.App.showToast(`Pazar akşamı dönüş saati ${timeStr} olarak güncellendi.`, 'info');
    }
  },

  setExpectedMondayTime(timeStr) {
    if (!timeStr) return;
    this.expectedMondayTime = timeStr;
    localStorage.setItem('yoklama_expected_monday_time', timeStr);
    this.recalculateCurrentDayReturns();
    this.renderView();
    if (window.App && window.App.showToast) {
      window.App.showToast(`Pazartesi sabahı dönüş saati ${timeStr} olarak güncellendi.`, 'info');
    }
  },

  setExpectedReturnTime(timeStr) {
    this.setExpectedSundayTime(timeStr);
  },

  recalculateCurrentDayReturns() {
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    Object.keys(dayReturns).forEach(studentId => {
      const rec = dayReturns[studentId];
      if (rec && rec.status !== 'IZINLI' && rec.arrivalTime) {
        const student = window.Store.getStudentById(studentId);
        const expectedTime = this.getExpectedTimeForStudent(student, this.currentDate);
        const excuse = rec.excuseType ? { type: rec.excuseType, minutes: rec.excuseMinutes || 0 } : null;
        const calc = this.calculateDifference(student, rec.arrivalTime, expectedTime, excuse);
        window.Store.saveLeaveReturn(this.currentDate, studentId, {
          ...rec,
          expectedTime,
          ...calc
        });
      }
    });
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

  // Zaman farkı, 3x ceza ve mazeret hesaplayıcı
  calculateDifference(student, arrivalTime, expectedTime, excuse = null) {
    const dayOfWeek = this.getDayOfWeek(this.currentDate);
    const isJunior = this.isJuniorStudent(student);

    // 1. İzinli ve henüz varış saati girilmemişse
    if (!arrivalTime && excuse) {
      return {
        status: 'IZINLI',
        lateMinutes: 0,
        earlyMinutes: 0,
        penaltyMinutes: 0,
        statusLabel: `İzinli (${excuse.type})`,
        penaltyLabel: 'Ceza Yok (İzinli)'
      };
    }

    // 2. 5 ve 6. Sınıflar Pazar günü saat kaçta gelirse gelsin Erken sayılır! (Resmi dönüş Pazartesi sabah 08:00)
    if (dayOfWeek === 0 && isJunior && arrivalTime) {
      return {
        status: 'ERKEN',
        lateMinutes: 0,
        earlyMinutes: 0,
        penaltyMinutes: 0,
        statusLabel: `Pazar Geldi (Erken • ${arrivalTime})`,
        penaltyLabel: 'Ceza Yok (Erken)'
      };
    }

    // 3. Normal veya İzinli Karşılaştırma
    if (!arrivalTime) {
      return {
        status: 'GELMEDI',
        lateMinutes: 0,
        earlyMinutes: 0,
        penaltyMinutes: 0,
        statusLabel: 'Yolda / Gelmedi',
        penaltyLabel: '-'
      };
    }

    const [arrH, arrM] = arrivalTime.split(':').map(Number);
    const [expH, expM] = (expectedTime || '18:00').split(':').map(Number);
    const arrTotal = arrH * 60 + arrM;
    let expTotal = expH * 60 + expM;

    // Ek izin dakikası varsa (örn: +30 dk, +60 dk, +90 dk, +120 dk)
    if (excuse && excuse.minutes > 0) {
      expTotal += excuse.minutes;
    }

    const diff = arrTotal - expTotal;

    if (diff > 0) {
      // Geç kaldı: 1 dk gecikme = 3 katı (3x) ceza
      const penaltyMinutes = diff * 3;
      const note = excuse && excuse.minutes > 0 ? ` (${excuse.type} Aşımı)` : '';
      return {
        status: 'GEC',
        lateMinutes: diff,
        earlyMinutes: 0,
        penaltyMinutes: penaltyMinutes,
        statusLabel: `${diff} dk Geç Kaldı${note}`,
        penaltyLabel: `+${penaltyMinutes} dk Ceza (3x)`
      };
    } else if (excuse && excuse.type) {
      // İzinliydi ve izin süresi dolmadan geldi -> İzinli (0 Ceza, 0 Puan)
      return {
        status: 'IZINLI',
        lateMinutes: 0,
        earlyMinutes: Math.abs(diff),
        penaltyMinutes: 0,
        statusLabel: `İzinli Geldi (${arrivalTime})`,
        penaltyLabel: 'Ceza Yok (İzinli)'
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
    const student = window.Store.getStudentById(studentId);
    const expectedTime = this.getExpectedTimeForStudent(student, this.currentDate);
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    const existing = dayReturns[studentId] || {};

    const excuse = existing.excuseType ? {
      type: existing.excuseType,
      minutes: existing.excuseMinutes || 0
    } : null;

    const calc = this.calculateDifference(student, arrivalTime, expectedTime, excuse);

    window.Store.saveLeaveReturn(this.currentDate, studentId, {
      ...existing,
      arrivalTime,
      expectedTime,
      ...calc
    });

    this.renderView();
    if (window.App && window.App.showToast) {
      const name = student ? `${student.firstName} ${student.lastName}` : 'Öğrenci';
      if (calc.status === 'GEC') {
        window.App.showToast(`⚠️ ${name}: ${calc.statusLabel} (+${calc.penaltyMinutes} dk geç çıkış cezası işlendi)`, 'warning');
      } else if (calc.status === 'IZINLI') {
        window.App.showToast(`✅ ${name} izin dahilinde geldi: ${arrivalTime}`, 'success');
      } else {
        window.App.showToast(`✅ ${name} kaydedildi: ${arrivalTime} (${calc.statusLabel})`, 'success');
      }
    }
  },

  // Mazeret / İzin Verme İşlemleri
  openExcuseModal(studentId) {
    this.activeExcuseStudentId = studentId;
    this.renderExcuseModal();
  },

  closeExcuseModal() {
    this.activeExcuseStudentId = null;
    const container = document.getElementById('leave-return-excuse-modal-container');
    if (container) container.innerHTML = '';
  },

  setStudentExcuse(excuseType, minutes) {
    const studentId = this.activeExcuseStudentId;
    if (!studentId) return;
    const student = window.Store.getStudentById(studentId);
    const expectedTime = this.getExpectedTimeForStudent(student, this.currentDate);
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    const existing = dayReturns[studentId] || {};

    const excuse = {
      type: excuseType,
      minutes: minutes
    };

    const calc = this.calculateDifference(student, existing.arrivalTime || null, expectedTime, excuse);

    window.Store.saveLeaveReturn(this.currentDate, studentId, {
      ...existing,
      expectedTime,
      excuseType,
      excuseMinutes: minutes,
      status: 'IZINLI',
      lateMinutes: 0,
      earlyMinutes: calc.earlyMinutes || 0,
      penaltyMinutes: 0,
      statusLabel: `İzinli (${excuseType})`,
      penaltyLabel: 'Ceza Yok (İzinli)'
    });

    this.closeExcuseModal();
    this.renderView();

    if (window.App && window.App.showToast) {
      const name = student ? `${student.firstName} ${student.lastName}` : 'Öğrenci';
      window.App.showToast(`🏷️ ${name}: İzin kaydedildi [${excuseType}] (0 Ceza, 0 Puan)`, 'info');
    }
  },

  clearRecord(studentId) {
    window.Store.deleteLeaveReturn(this.currentDate, studentId);
    this.renderView();
    if (window.App && window.App.showToast) {
      window.App.showToast('Giriş/İzin kaydı silindi (Henüz Gelmedi durumuna alındı).', 'info');
    }
  },

  getFilteredStudents() {
    let students = window.Store.getStudents();
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);

    // Sınıf filtresi
    if (this.selectedClasses && this.selectedClasses.length > 0) {
      students = students.filter(s => this.selectedClasses.includes(s.className));
    }

    // Durum filtresi (Tümü, İzinliler, Geç Kalanlar, Gelmeyenler, Erken, Vaktinde)
    if (this.statusFilter !== 'ALL') {
      students = students.filter(s => {
        const rec = dayReturns[s.id];
        if (this.statusFilter === 'GELMEDI') {
          return !rec || (!rec.arrivalTime && rec.status !== 'IZINLI');
        }
        if (this.statusFilter === 'IZINLI') {
          return rec && rec.status === 'IZINLI';
        }
        if (!rec || !rec.arrivalTime) return false;
        return rec.status === this.statusFilter;
      });
    }

    // Arama filtresi
    if (this.searchQuery) {
      students = students.filter(s =>
        (s.firstName && s.firstName.toLowerCase().includes(this.searchQuery)) ||
        (s.lastName && s.lastName.toLowerCase().includes(this.searchQuery)) ||
        (s.studentNo && String(s.studentNo).includes(this.searchQuery)) ||
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
    const dayOfWeek = this.getDayOfWeek(this.currentDate);

    // Pazartesi günü için Pazar günü giriş yapmış öğrencileri de kontrol et
    const prevDayStr = this.getPreviousDayString(this.currentDate);
    const sundayReturns = dayOfWeek === 1 ? window.Store.getLeaveReturnsByDate(prevDayStr) : {};

    // KPI İstatistikleri
    let arrivedCount = 0;
    let excusedCount = 0;
    let lateCount = 0;
    let earlyCount = 0;
    let onTimeCount = 0;
    let totalPenaltyMins = 0;
    let pendingCount = 0;

    allStudents.forEach(s => {
      const rec = dayReturns[s.id];
      const isJunior = this.isJuniorStudent(s);
      const arrivedOnSunday = dayOfWeek === 1 && isJunior && sundayReturns[s.id] && sundayReturns[s.id].arrivalTime;

      if (rec && rec.status === 'IZINLI') {
        excusedCount++;
        if (rec.arrivalTime) {
          arrivedCount++;
        }
      } else if (rec && rec.arrivalTime) {
        arrivedCount++;
        if (rec.status === 'GEC') {
          lateCount++;
          totalPenaltyMins += (rec.penaltyMinutes || 0);
        } else if (rec.status === 'ERKEN') {
          earlyCount++;
        } else if (rec.status === 'VAKTINDE') {
          onTimeCount++;
        }
      } else if (arrivedOnSunday) {
        arrivedCount++;
        earlyCount++;
      } else {
        pendingCount++;
      }
    });

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
                5 ve 6. Sınıflar <strong class="text-indigo-600">Pazartesi sabah 08:00</strong>, 7 ve 8. Sınıflar <strong class="text-indigo-600">Pazar akşamı</strong> döner. İzinli olanlara ceza ve puan verilmez. Geç kalanlara <strong class="text-rose-700">dakika başına 3 katı (3x)</strong> geç çıkış cezası uygulanır.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="window.print()" 
                class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs">
                <span>🖨️ Çizelgeyi Yazdır / PDF</span>
              </button>
            </div>
          </div>

          <!-- Tarih & Standart Dönüş Saatleri Ayarı -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <!-- Tarih Seçici -->
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

            <!-- Beklenen Standart Dönüş Saatleri (Pazar 7-8 & Pazartesi 5-6) -->
            <div class="flex flex-wrap items-center gap-3 bg-indigo-50/80 border border-indigo-200 p-2 sm:px-3 sm:py-1.5 rounded-2xl">
              <!-- Pazar Akşamı (7 & 8. Sınıf) -->
              <div class="flex items-center gap-2">
                <span class="text-base">⏰</span>
                <div>
                  <div class="text-[10px] font-black text-indigo-900 uppercase">PAZAR AKŞAMI (7 & 8):</div>
                  <div class="flex items-center gap-1">
                    <input type="time" value="${this.expectedSundayTime}" 
                      class="bg-white border border-indigo-300 font-mono font-black text-xs text-indigo-950 px-2 py-0.5 rounded-lg focus:outline-none"
                      onchange="window.LeaveReturnModule.setExpectedSundayTime(this.value)">
                  </div>
                </div>
              </div>

              <div class="hidden sm:block h-6 w-px bg-indigo-200"></div>

              <!-- Pazartesi Sabahı (5 & 6. Sınıf) -->
              <div class="flex items-center gap-2">
                <span class="text-base">⏰</span>
                <div>
                  <div class="text-[10px] font-black text-indigo-900 uppercase">PAZARTESİ SABAHI (5 & 6):</div>
                  <div class="flex items-center gap-1">
                    <input type="time" value="${this.expectedMondayTime}" 
                      class="bg-white border border-indigo-300 font-mono font-black text-xs text-indigo-950 px-2 py-0.5 rounded-lg focus:outline-none"
                      onchange="window.LeaveReturnModule.setExpectedMondayTime(this.value)">
                  </div>
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
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
          <!-- Toplam -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('ALL')"
            class="cursor-pointer bg-white p-3 rounded-2xl border transition-all ${
              this.statusFilter === 'ALL' ? 'ring-2 ring-slate-900 shadow-md border-slate-900' : 'border-slate-200 hover:border-slate-300'
            }">
            <div class="text-[10px] font-bold text-slate-500 uppercase">TÜM TALEBELER</div>
            <div class="text-2xl font-black text-slate-800 mt-1">${allStudents.length}</div>
            <div class="text-[10px] text-slate-400">Beklenen mevcud</div>
          </div>

          <!-- Gelenler -->
          <div class="bg-white p-3 rounded-2xl border border-slate-200">
            <div class="text-[10px] font-bold text-emerald-600 uppercase">GELENLER</div>
            <div class="text-2xl font-black text-emerald-700 mt-1">${arrivedCount} / ${allStudents.length}</div>
            <div class="text-[10px] text-emerald-600 font-bold">%${allStudents.length ? Math.round((arrivedCount / allStudents.length) * 100) : 0} Dönüş Oranı</div>
          </div>

          <!-- Henüz Gelmedi (Yolda) -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('GELMEDI')"
            class="cursor-pointer bg-white p-3 rounded-2xl border transition-all ${
              this.statusFilter === 'GELMEDI' ? 'ring-2 ring-amber-500 shadow-md border-amber-500' : 'border-amber-200 hover:border-amber-300'
            }">
            <div class="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1">
              <span>⏳ YOLDA / BEKLENEN</span>
            </div>
            <div class="text-2xl font-black text-amber-700 mt-1">${pendingCount}</div>
            <div class="text-[10px] text-amber-600 font-medium">Giriş bekleniyor</div>
          </div>

          <!-- İzinliler (Mazeretliler) -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('IZINLI')"
            class="cursor-pointer bg-amber-50/70 p-3 rounded-2xl border transition-all ${
              this.statusFilter === 'IZINLI' ? 'ring-2 ring-amber-500 shadow-md border-amber-400' : 'border-amber-200 hover:border-amber-300'
            }">
            <div class="text-[10px] font-black text-amber-900 uppercase flex items-center gap-1">
              <span>🏷️ İZİNLİLER</span>
            </div>
            <div class="text-2xl font-black text-amber-700 mt-1">${excusedCount}</div>
            <div class="text-[10px] text-amber-700 font-bold">0 Ceza • 0 Puan</div>
          </div>

          <!-- Geç Kalanlar (3x Ceza Uygulananlar) -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('GEC')"
            class="cursor-pointer bg-rose-50/70 p-3 rounded-2xl border transition-all ${
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
            class="cursor-pointer bg-white p-3 rounded-2xl border transition-all ${
              this.statusFilter === 'ERKEN' ? 'ring-2 ring-emerald-600 shadow-md border-emerald-600' : 'border-emerald-200 hover:border-emerald-300'
            }">
            <div class="text-[10px] font-bold text-emerald-800 uppercase">🟢 ERKEN GELEN</div>
            <div class="text-2xl font-black text-emerald-700 mt-1">${earlyCount}</div>
            <div class="text-[10px] text-emerald-600">Saatinden önce gelen</div>
          </div>

          <!-- Vaktinde Gelenler -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('VAKTINDE')"
            class="cursor-pointer bg-white p-3 rounded-2xl border transition-all ${
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
                  Filtre: ${
                    this.statusFilter === 'GEC' ? '🔴 Sadece Geç Kalanlar' : 
                    (this.statusFilter === 'GELMEDI' ? '⏳ Sadece Gelmeyenler' : 
                    (this.statusFilter === 'IZINLI' ? '🏷️ Sadece İzinliler' : 
                    (this.statusFilter === 'ERKEN' ? '🟢 Erken Gelenler' : '🔵 Vaktinde Gelenler')))
                  }
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

      <!-- Mazeret / İzin Modalı Konteyneri -->
      <div id="leave-return-excuse-modal-container"></div>
    `;

    this.renderStudentRows();
  },

  renderStudentRows() {
    const tableContainer = document.getElementById('leave-return-table-container');
    if (!tableContainer) return;

    const students = this.getFilteredStudents();
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    const dayOfWeek = this.getDayOfWeek(this.currentDate);
    const prevDayStr = this.getPreviousDayString(this.currentDate);
    const sundayReturns = dayOfWeek === 1 ? window.Store.getLeaveReturnsByDate(prevDayStr) : {};

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
            <th class="py-3 px-4 min-w-[220px]">Varış Saati & İzin</th>
            <th class="py-3 px-4">Durum</th>
            <th class="py-3 px-4">İzne Geç Çıkış Cezası</th>
            <th class="py-3 px-4 text-center w-24 no-print">İşlem</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${students.map((s, idx) => {
            const rec = dayReturns[s.id];
            const hasRecord = rec && (rec.arrivalTime || rec.status === 'IZINLI');
            const isJunior = this.isJuniorStudent(s);
            const arrivedOnSunday = dayOfWeek === 1 && isJunior && sundayReturns[s.id] && sundayReturns[s.id].arrivalTime;
            const sundayRec = arrivedOnSunday ? sundayReturns[s.id] : null;

            let statusBadge = '';
            let penaltyBadge = '';

            if (rec && rec.status === 'IZINLI') {
              // İzinli
              statusBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black border border-amber-300 flex items-center gap-1 w-max shadow-2xs">
                  <span>🏷️</span> <span>${rec.statusLabel || `İzinli (${rec.excuseType || ''})`}</span>
                </span>
              `;
              penaltyBadge = `
                <span class="text-amber-700 font-bold text-[11px] flex items-center gap-1">
                  <span>✓</span> <span>Ceza Yok (İzinli)</span>
                </span>
              `;
            } else if (hasRecord && rec.arrivalTime) {
              if (rec.status === 'GEC') {
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
              } else if (rec.status === 'ERKEN') {
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
            } else if (arrivedOnSunday) {
              // Pazartesi günü bakılıyor ama 5 veya 6. sınıf Pazar akşamı zaten gelmiş
              statusBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1 w-max">
                  <span>✓</span> <span>Pazar Geldi (${sundayRec.arrivalTime})</span>
                </span>
              `;
              penaltyBadge = `<span class="text-emerald-700 font-bold text-[11px]">✓ Dün Geldi (Ceza Yok)</span>`;
            } else if (dayOfWeek === 0 && isJunior) {
              // Pazar günü ve 5-6. sınıf henüz gelmemiş (resmi dönüş Pazartesi sabahı)
              statusBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold border border-indigo-200 flex items-center gap-1 w-max">
                  <span>📅</span> <span>Pzt 08:00 Bekleniyor</span>
                </span>
              `;
              penaltyBadge = `<span class="text-slate-400 font-medium text-[11px]">Pazartesi bekleniyor</span>`;
            } else {
              // Diğer sınıflar için henuz gelmedi
              statusBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center gap-1 w-max">
                  <span>⏳</span> <span>Yolda / Gelmedi</span>
                </span>
              `;
              penaltyBadge = `<span class="text-slate-400 font-medium">-</span>`;
            }

            return `
              <tr class="hover:bg-slate-50/80 transition ${hasRecord && rec.status === 'GEC' ? 'bg-rose-50/30' : ''}">
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
                  <div class="font-bold text-slate-700 text-xs flex items-center gap-1">
                    <span>${s.className}</span>
                    ${isJunior ? '<span class="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded text-[9px] font-black">Pzt 08:00</span>' : '<span class="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">Pazar</span>'}
                  </div>
                  <div class="text-[10px] text-slate-500">${s.yatakhane || '-'}</div>
                </td>

                <!-- Varış Saati & Butonlar -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${hasRecord ? `
                      <input type="time" value="${rec.arrivalTime || ''}" 
                        class="px-2.5 py-1 bg-white border border-slate-300 font-mono font-black text-xs text-slate-900 rounded-xl focus:border-indigo-500 focus:outline-none shadow-2xs"
                        onchange="window.LeaveReturnModule.recordArrivalTime('${s.id}', this.value)">

                      <button type="button" onclick="window.LeaveReturnModule.openExcuseModal('${s.id}')"
                        class="px-2 py-1 rounded-xl text-xs font-black transition border shadow-2xs ${
                          rec.status === 'IZINLI' 
                            ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200' 
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                        }"
                        title="İzin detayını görüntüle veya değiştir">
                        <span>🏷️</span>
                        <span>${rec.status === 'IZINLI' ? (rec.excuseType || 'İzinli') : 'İzin'}</span>
                      </button>
                    ` : `
                      <!-- Henüz kayıt yok -->
                      <button type="button" onclick="window.LeaveReturnModule.recordNow('${s.id}')"
                        class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs rounded-xl transition flex items-center gap-1 shadow-xs">
                        <span>⚡</span>
                        <span>Şimdi Geldi</span>
                      </button>

                      <button type="button" onclick="window.LeaveReturnModule.openExcuseModal('${s.id}')"
                        class="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-black text-xs rounded-xl transition flex items-center gap-1 shadow-xs"
                        title="Öğrenciye izin ver (0 Ceza, 0 Puan)">
                        <span>🏷️</span>
                        <span>İzinli</span>
                      </button>

                      <input type="time" 
                        placeholder="--:--"
                        class="px-2 py-1 bg-slate-50 border border-slate-200 font-mono text-xs text-slate-600 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none w-20"
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

                <!-- İşlemler (Sıfırla / Sil) -->
                <td class="py-3 px-4 text-center no-print">
                  ${hasRecord ? `
                    <button type="button" onclick="window.LeaveReturnModule.clearRecord('${s.id}')"
                      title="Giriş / İzin kaydını sil"
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
  },

  // Mazeret & İzin Seçim Penceresi (Modal)
  renderExcuseModal() {
    const container = document.getElementById('leave-return-excuse-modal-container');
    if (!container || !this.activeExcuseStudentId) return;

    const student = window.Store.getStudentById(this.activeExcuseStudentId);
    if (!student) return;

    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    const existing = dayReturns[this.activeExcuseStudentId];
    const hasExistingRecord = existing && (existing.arrivalTime || existing.status === 'IZINLI');

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in no-print">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4">
          <!-- Başlık ve Kapatma -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 font-black text-lg flex items-center justify-center shadow-inner">
                🏷️
              </div>
              <div>
                <h3 class="font-black text-sm sm:text-base text-slate-900">${student.firstName} ${student.lastName}</h3>
                <p class="text-xs text-slate-500">${student.className} • No: ${student.studentNo || student.id} • ${student.yatakhane || '-'}</p>
              </div>
            </div>
            <button onclick="window.LeaveReturnModule.closeExcuseModal()"
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center">
              ✕
            </button>
          </div>

          <!-- Kural Bilgilendirmesi -->
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
            <div class="font-black flex items-center gap-1.5">
              <span>ℹ️</span> <span>İzinli Talebe Kuralı:</span>
            </div>
            <p class="text-[11px] text-amber-800 leading-relaxed">
              İzinli olarak işaretlenen talebeler <strong>puan alamaz (0 Puan)</strong>, ancak kendilerine <strong>ceza da uygulanmaz (0 Ceza)</strong>.
            </p>
          </div>

          <!-- 5 Seçenekli İzin Menüsü -->
          <div class="space-y-2">
            <div class="text-[11px] font-black uppercase text-slate-400 tracking-wider">İzin / Mazeret Süresi Seçiniz:</div>
            
            <!-- 1. Yarın Sabah -->
            <button type="button" onclick="window.LeaveReturnModule.setStudentExcuse('Yarın Sabah', 0)"
              class="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50/50 transition flex items-center justify-between group">
              <div class="flex items-center gap-3">
                <span class="text-xl group-hover:scale-110 transition">🌅</span>
                <div>
                  <div class="font-black text-xs text-slate-900">Yarın Sabah</div>
                  <div class="text-[10px] text-slate-500">Bu akşam gelmeyecek, yarın sabah dönecek.</div>
                </div>
              </div>
              <span class="text-xs font-black text-amber-600 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-1 rounded-xl">Seç ➔</span>
            </button>

            <!-- 2. Yarım Saat -->
            <button type="button" onclick="window.LeaveReturnModule.setStudentExcuse('Yarım Saat (+30 dk)', 30)"
              class="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50/50 transition flex items-center justify-between group">
              <div class="flex items-center gap-3">
                <span class="text-xl group-hover:scale-110 transition">⏱️</span>
                <div>
                  <div class="font-black text-xs text-slate-900">Yarım Saat (+30 dk)</div>
                  <div class="text-[10px] text-slate-500">30 dakika ek izin süresi tanınır.</div>
                </div>
              </div>
              <span class="text-xs font-black text-amber-600 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-1 rounded-xl">Seç ➔</span>
            </button>

            <!-- 3. 1 Saat -->
            <button type="button" onclick="window.LeaveReturnModule.setStudentExcuse('1 Saat (+60 dk)', 60)"
              class="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50/50 transition flex items-center justify-between group">
              <div class="flex items-center gap-3">
                <span class="text-xl group-hover:scale-110 transition">⏱️</span>
                <div>
                  <div class="font-black text-xs text-slate-900">1 Saat (+60 dk)</div>
                  <div class="text-[10px] text-slate-500">1 saat (60 dakika) ek izin süresi tanınır.</div>
                </div>
              </div>
              <span class="text-xs font-black text-amber-600 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-1 rounded-xl">Seç ➔</span>
            </button>

            <!-- 4. 1.5 Saat -->
            <button type="button" onclick="window.LeaveReturnModule.setStudentExcuse('1.5 Saat (+90 dk)', 90)"
              class="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50/50 transition flex items-center justify-between group">
              <div class="flex items-center gap-3">
                <span class="text-xl group-hover:scale-110 transition">⏱️</span>
                <div>
                  <div class="font-black text-xs text-slate-900">1.5 Saat (+90 dk)</div>
                  <div class="text-[10px] text-slate-500">1.5 saat (90 dakika) ek izin süresi tanınır.</div>
                </div>
              </div>
              <span class="text-xs font-black text-amber-600 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-1 rounded-xl">Seç ➔</span>
            </button>

            <!-- 5. 2 Saat -->
            <button type="button" onclick="window.LeaveReturnModule.setStudentExcuse('2 Saat (+120 dk)', 120)"
              class="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50/50 transition flex items-center justify-between group">
              <div class="flex items-center gap-3">
                <span class="text-xl group-hover:scale-110 transition">⏱️</span>
                <div>
                  <div class="font-black text-xs text-slate-900">2 Saat (+120 dk)</div>
                  <div class="text-[10px] text-slate-500">2 saat (120 dakika) ek izin süresi tanınır.</div>
                </div>
              </div>
              <span class="text-xs font-black text-amber-600 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-1 rounded-xl">Seç ➔</span>
            </button>
          </div>

          <!-- Alt Butonlar -->
          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            ${hasExistingRecord ? `
              <button type="button" onclick="window.LeaveReturnModule.clearRecord('${student.id}'); window.LeaveReturnModule.closeExcuseModal();"
                class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs rounded-xl transition flex items-center gap-1.5">
                <span>🗑️</span> <span>İzni Kaldır / Sıfırla</span>
              </button>
            ` : `<div></div>`}

            <button type="button" onclick="window.LeaveReturnModule.closeExcuseModal()"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition">
              Kapat
            </button>
          </div>
        </div>
      </div>
    `;
  }
};
