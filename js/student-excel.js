/**
 * student-excel.js - Güvenli Yönlendirme Modülü
 */
window.StudentExcelModule = {
  init() {
    if (window.App) {
      window.App.activeTab = 'ogrenciler';
      window.App.renderStudentsView();
    }
  },
  render() {
    if (window.App) {
      window.App.activeTab = 'ogrenciler';
      window.App.renderStudentsView();
    }
  }
};
