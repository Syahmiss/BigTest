// ===== GANTI SELURUH ISI <script> APLIKASI (bahagian bawah sekali, selepas <!-- Application Script -->) DENGAN FAIL INI =====

// Ensure all core functions are globally scoped for inline onclick handlers
window.switchTab = switchTab;
window.fetchData = fetchData;
window.exportCSV = exportCSV;
window.filterTable = filterTable;
window.setProgressCategoryFilter = setProgressCategoryFilter;
window.renderProgressCards = renderProgressCards;
window.handleFormSubmit = handleFormSubmit;
window.addSurveyorField = addSurveyorField;
window.addCategoryRow = addCategoryRow;
window.removeCategoryRow = removeCategoryRow;
window.addTaskField = addTaskField;
window.removeTaskField = removeTaskField;

// ===== ISI DUA NILAI INI =====
const API_URL = 'https://script.google.com/macros/s/AKfycbyEFA5qGfDKLqIjiG4YdITzuunWR95ER-geZXau0kRwWI65k5ajcHsx7T-Lo38pFH9S/exec';
const API_TOKEN = '99999999999999999999999999999999999999999999999999';

let globalData = [];
let uniqueFilesList = [];
let globalSurveyorsList = [];
const globalCategoriesList = ['Topografi', 'Utility Mapping'];
let categoryChartInstance = null;
let surveyorChartInstance = null;
let activeProgressCategory = 'all';
let progressData = [];

// Toast Notification Helper
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const toastIcon = document.getElementById('toast-icon');

    toastMsg.innerText = message;
    if(type === 'success') {
        toastIcon.className = 'fa-solid fa-circle-check text-emerald-400';
    } else if(type === 'error') {
        toastIcon.className = 'fa-solid fa-circle-exclamation text-rose-400';
    } else {
        toastIcon.className = 'fa-solid fa-circle-info text-sky-400';
    }

    toast.classList.remove('translate-y-32', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-32', 'opacity-0');
    }, 3500);
}

// Tab Switching Logic
function switchTab(tabName) {
    const overviewTab = document.getElementById('tab-content-overview');
    const progressTab = document.getElementById('tab-content-progress');
    const formTab = document.getElementById('tab-content-form');

    const navOverview = document.getElementById('nav-overview');
    const navProgress = document.getElementById('nav-progress');
    const navForm = document.getElementById('nav-form');
    const navOverviewM = document.getElementById('nav-overview-m');
    const navProgressM = document.getElementById('nav-progress-m');
    const navFormM = document.getElementById('nav-form-m');

    // Hide all tabs
    overviewTab.classList.add('hidden');
    progressTab.classList.add('hidden');
    formTab.classList.add('hidden');

    // Reset desktop & mobile nav buttons
    navOverview.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition';
    navProgress.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition';
    navForm.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition';

    navOverviewM.className = 'px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 text-center transition whitespace-nowrap';
    navProgressM.className = 'px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 text-center transition whitespace-nowrap';
    navFormM.className = 'px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 text-center transition whitespace-nowrap';

    if(tabName === 'overview') {
        overviewTab.classList.remove('hidden');
        navOverview.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white shadow transition';
        navOverviewM.className = 'px-3 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white text-center transition whitespace-nowrap';
        if(categoryChartInstance) categoryChartInstance.update();
        if(surveyorChartInstance) surveyorChartInstance.update();
    } else if(tabName === 'progress') {
        progressTab.classList.remove('hidden');
        navProgress.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white shadow transition';
        navProgressM.className = 'px-3 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white text-center transition whitespace-nowrap';
        renderProgressCards();
    } else if(tabName === 'form') {
        formTab.classList.remove('hidden');
        navForm.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white shadow transition';
        navFormM.className = 'px-3 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white text-center transition whitespace-nowrap';
    }
}

// Fetch data dari Apps Script (fail + progres)
function fetchData() {
    showToast('Memuat turun data...', 'info');

    return fetch(`${API_URL}?token=${encodeURIComponent(API_TOKEN)}`)
        .then(r => r.json())
        .then(data => {
            if (!data.ok) throw new Error(data.error || 'Ralat API');
            globalData = data.fail;
            progressData = data.progress;
            processData(globalData);
            populateFormDropdowns(globalData);
            renderProgressCards();
            showToast('Data berjaya dimuat turun!', 'success');
        })
        .catch(err => {
            console.error('Fetch Error:', err);
            showToast('Gagal memuat turun data.', 'error');
        });
}

// Peratus progres untuk satu No File + Kategori
function getPct(noFile, kategori) {
    const p = progressData.find(x => x.noFile === noFile && x.kategori === kategori);
    return p ? p.pct : 0;
}

// Tukar YYYY-MM-DD dari input date kepada DD/MM/YYYY
function toDMY(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

// Process data and calculate unique file logic
function processData(data) {
    const uniqueMap = new Map();

    data.forEach(item => {
        const noFile = (item['No File'] || 'TANPA_NO_FILE').trim();
        if (!uniqueMap.has(noFile)) {
            uniqueMap.set(noFile, {
                ...item,
                _subRecords: [item],
                categories: new Set([item['Kategori']].filter(Boolean))
            });
        } else {
            const existing = uniqueMap.get(noFile);
            existing._subRecords.push(item);
            if(item['Kategori']) existing.categories.add(item['Kategori']);
        }
    });
    uniqueFilesList = Array.from(uniqueMap.values());

    // Update KPI Total Files (Unique count)
    document.getElementById('kpi-total-files').innerText = uniqueFilesList.length;

    // Update KPI Total Surveyors
    const uniqueSurveyors = new Set(data.map(item => item['Surveyor']).filter(Boolean));
    document.getElementById('kpi-total-surveyors').innerText = uniqueSurveyors.size;

    // Calculate Top Category
    const catCounts = {};
    uniqueFilesList.forEach(item => {
        item.categories.forEach(cat => {
            catCounts[cat] = (catCounts[cat] || 0) + 1;
        });
    });

    let topCat = '-';
    let maxCount = 0;
    for(let cat in catCounts) {
        if(catCounts[cat] > maxCount) {
            maxCount = catCounts[cat];
            topCat = cat;
        }
    }
    document.getElementById('kpi-top-category').innerText = topCat;

    // Populate Category Filter Dropdown
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = '<option value="">Semua Kategori</option>';
    Object.keys(catCounts).forEach(cat => {
        categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    // Update Form Category Dropdown rows
    initCategoryRows();

    // Render Table & Charts
    renderTable(data);
    renderCharts(data, uniqueFilesList);
}

// Populate Form Dropdowns (Surveyor)
function populateFormDropdowns(data) {
    const surveyorSet = new Set(globalSurveyorsList);
    // Default surveyor list as requested
    ['Mangkuk1', 'Mangkuk2', 'Mangkuk3', 'Mangkuk4'].forEach(s => surveyorSet.add(s));

    data.forEach(item => {
        if(item['Surveyor']) {
            // split if combined with ' & '
            item['Surveyor'].split('&').forEach(s => surveyorSet.add(s.trim()));
        }
    });
    globalSurveyorsList = Array.from(surveyorSet).sort();

    const containers = document.querySelectorAll('.surveyor-dropdown');
    containers.forEach(select => {
        let optionsHtml = '<option value="" disabled selected>Pilih Surveyor</option>';
        globalSurveyorsList.forEach(srv => {
            optionsHtml += `<option value="${srv}">${srv}</option>`;
        });
        select.innerHTML = optionsHtml;
    });
    initCategoryRows();
}

function getCategoryOptionsHtml(selectedVal = '') {
    let html = '<option value="" disabled selected>Pilih Kategori</option>';
    globalCategoriesList.forEach(cat => {
        html += `<option value="${cat}" ${cat === selectedVal ? 'selected' : ''}>${cat}</option>`;
    });
    return html;
}

function getUnitOptionsHtml(selectedVal = '') {
    const units = ['m', 'km', 'eka'];
    let html = '<option value="" disabled selected>Pilih Unit</option>';
    units.forEach(u => {
        html += `<option value="${u}" ${u === selectedVal ? 'selected' : ''}>${u}</option>`;
    });
    return html;
}

function initCategoryRows() {
    const container = document.getElementById('categoryRowsContainer');
    if(!container) return;
    if(container.children.length === 0) {
        addCategoryRow();
    } else {
        const selects = container.querySelectorAll('.category-dropdown');
        selects.forEach(sel => {
            const current = sel.value;
            sel.innerHTML = getCategoryOptionsHtml(current);
        });
        const unitSelects = container.querySelectorAll('.unit-dropdown');
        unitSelects.forEach(sel => {
            const current = sel.value;
            sel.innerHTML = getUnitOptionsHtml(current);
        });
    }
}

function addCategoryRow(defaultCat = '', defaultTarget = '', defaultUnit = '') {
    const container = document.getElementById('categoryRowsContainer');
    if(!container) return;
    const rowId = 'cat_row_' + Date.now() + Math.random().toString(36).substring(2, 5);
    const div = document.createElement('div');
    div.className = 'bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 relative group';
    div.id = rowId;

    div.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Kategori</label>
                <select name="rowCategory" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition category-dropdown">
                    ${getCategoryOptionsHtml(defaultCat)}
                </select>
            </div>
            <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Target</label>
                <input type="text" name="rowTarget" required value="${defaultTarget}" placeholder="Cth: 50" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition">
            </div>
            <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Unit</label>
                <div class="flex items-center space-x-2">
                    <select name="rowUnit" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition unit-dropdown">
                        ${getUnitOptionsHtml(defaultUnit)}
                    </select>
                    <button type="button" onclick="removeCategoryRow('${rowId}')" class="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/20 transition cursor-pointer" title="Buang Kategori">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    container.appendChild(div);
}

function removeCategoryRow(rowId) {
    const container = document.getElementById('categoryRowsContainer');
    if(container.children.length <= 1) {
        showToast('Sekurang-kurangnya satu kategori diperlukan.', 'error');
        return;
    }
    const el = document.getElementById(rowId);
    if(el) el.remove();
}

// Functions for Tasks Dynamic Inputs
function addTaskField() {
    const container = document.getElementById('tasksContainer');
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-2';
    div.innerHTML = `
        <input type="text" name="taskInput" placeholder="Cth: Kerja pengukuran butiran" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition">
        <button type="button" onclick="removeTaskField(this)" class="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/20 transition cursor-pointer">
            <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
    `;
    container.appendChild(div);
}

function removeTaskField(buttonElement) {
    const row = buttonElement.parentElement;
    if(row) row.remove();
}

function resetTaskContainer() {
    const container = document.getElementById('tasksContainer');
    if(!container) return;
    container.innerHTML = `
        <div class="flex items-center space-x-2">
            <input type="text" name="taskInput" placeholder="Cth: Kerja penandaan sempadan tapak" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition">
        </div>
    `;
}

// Function to dynamically add a new surveyor selection field
function addSurveyorField() {
    const container = document.getElementById('surveyorsContainer');
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-2';

    let optionsHtml = '<option value="" disabled selected>Pilih Surveyor</option>';
    globalSurveyorsList.forEach(srv => {
        optionsHtml += `<option value="${srv}">${srv}</option>`;
    });

    div.innerHTML = `
        <select name="surveyorSelect" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition surveyor-dropdown">
            ${optionsHtml}
        </select>
        <button type="button" onclick="this.parentElement.remove()" class="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/20 transition cursor-pointer">
            <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
    `;
    container.appendChild(div);
}

// Render Data Table
function renderTable(data) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';

    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-500">Tiada rekod dijumpai.</td></tr>`;
        document.getElementById('record-count').innerText = '0 Rekod';
        document.getElementById('table-info').innerText = 'Menunjukkan 0 daripada 0 rekod';
        return;
    }

    data.forEach((item) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/50 transition border-b border-slate-800/60';
        tr.innerHTML = `
            <td class="py-3.5 px-6 font-medium text-white">${item['No File'] || '-'}</td>
            <td class="py-3.5 px-6 text-slate-300">${item['Surveyor'] || '-'}</td>
            <td class="py-3.5 px-6">
                <span class="px-2.5 py-1 rounded-lg text-xs font-semibold ${item['Kategori'] === 'Topografi' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}">
                    ${item['Kategori'] || '-'}
                </span>
            </td>
            <td class="py-3.5 px-6 font-semibold text-sky-400">${item['Target'] || '-'}</td>
            <td class="py-3.5 px-6 text-slate-400">${item['Unit'] || '-'}</td>
            <td class="py-3.5 px-6 text-slate-400">${item['Tarikh Mula'] || '-'}</td>
            <td class="py-3.5 px-6 text-slate-400">${item['Tarikh Siap'] || '-'}</td>
            <td class="py-3.5 px-6 text-slate-300">${item['Tugas'] || '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('record-count').innerText = `${data.length} Rekod`;
    document.getElementById('table-info').innerText = `Menunjukkan semua ${data.length} rekod aktif`;
}

// Filter Table & Search
function filterTable() {
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    const catVal = document.getElementById('categoryFilter').value;

    const filtered = globalData.filter(item => {
        const noFile = (item['No File'] || '').toLowerCase();
        const surveyor = (item['Surveyor'] || '').toLowerCase();
        const kategori = item['Kategori'] || '';

        const matchesSearch = noFile.includes(searchVal) || surveyor.includes(searchVal);
        const matchesCat = catVal === '' || kategori === catVal;

        return matchesSearch && matchesCat;
    });

    renderTable(filtered);
}

// Render Charts using Chart.js
function renderCharts(data, uniqueFiles) {
    const catMap = {};
    uniqueFiles.forEach(item => {
        item.categories.forEach(cat => {
            catMap[cat] = (catMap[cat] || 0) + 1;
        });
    });

    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    if(categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(ctxCat, {
        type: 'bar',
        data: {
            labels: Object.keys(catMap),
            datasets: [{
                label: 'Bilangan Fail Unik',
                data: Object.values(catMap),
                backgroundColor: ['#38bdf8', '#c084fc', '#34d399', '#f472b6', '#fbbf24', '#818cf8'],
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
                },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, precision: 0 }
                }
            }
        }
    });

    const srvMap = {};
    data.forEach(item => {
        const srv = item['Surveyor'] || 'Tidak Diketahui';
        srvMap[srv] = (srvMap[srv] || 0) + 1;
    });

    const ctxSrv = document.getElementById('surveyorChart').getContext('2d');
    if(surveyorChartInstance) surveyorChartInstance.destroy();

    surveyorChartInstance = new Chart(ctxSrv, {
        type: 'doughnut',
        data: {
            labels: Object.keys(srvMap),
            datasets: [{
                data: Object.values(srvMap),
                backgroundColor: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24', '#fb7185'],
                borderWidth: 2,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, boxWidth: 12 }
                }
            },
            cutout: '70%'
        }
    });
}

// Progress Category Filter
function setProgressCategoryFilter(cat) {
    activeProgressCategory = cat;
    const btnAll = document.getElementById('prog-filter-all');
    const btnTopo = document.getElementById('prog-filter-topo');
    const btnUtility = document.getElementById('prog-filter-utility');

    btnAll.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold ' + (cat === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white');
    btnTopo.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold ' + (cat === 'Topografi' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white');
    btnUtility.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold ' + (cat === 'Utility Mapping' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white');

    renderProgressCards();
}

// Render Progres Cards (Grouped by No File, with distinct category progress bars in the same card)
function renderProgressCards() {
    const searchInputVal = (document.getElementById('searchProgressInput').value || '').toLowerCase();

    const filteredFiles = uniqueFilesList.filter(item => {
        const noFile = (item['No File'] || '').toLowerCase();
        const surveyors = (item._subRecords || [item]).map(r => (r['Surveyor'] || '').toLowerCase()).join(' ');
        const categories = Array.from(item.categories || []).join(' ').toLowerCase();

        const matchesSearch = noFile.includes(searchInputVal) || surveyors.includes(searchInputVal) || categories.includes(searchInputVal);

        let matchesCategoryFilter = true;
        if(activeProgressCategory !== 'all') {
            matchesCategoryFilter = item.categories.has(activeProgressCategory) || (item._subRecords || []).some(r => (r['Kategori'] || '').toLowerCase() === activeProgressCategory.toLowerCase());
        }

        return matchesSearch && matchesCategoryFilter;
    });

    const progressGrid = document.getElementById('progressGrid');
    progressGrid.innerHTML = '';

    if(filteredFiles.length === 0) {
        progressGrid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-500 text-sm">Tiada fail dijumpai untuk paparan progres.</div>`;
        return;
    }

    filteredFiles.forEach(item => {
        progressGrid.appendChild(createProgressCardElement(item));
    });
}

function createProgressCardElement(item) {
    const card = document.createElement('div');
    card.className = 'bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition shadow-sm';

    const subRecords = item._subRecords || [item];
    const allCategories = [...new Set(subRecords.map(r => r['Kategori']).filter(Boolean))];
    const categoriesList = allCategories.length > 0 ? allCategories.join(' & ') : 'Pelbagai';
    const surveyorsList = [...new Set(subRecords.map(r => r['Surveyor']).filter(Boolean))].join(', ');

    let progressSectionsHtml = '';

    const categoryMap = new Map();
    subRecords.forEach(sub => {
        const cat = sub['Kategori'] || 'Am';
        if(!categoryMap.has(cat)) {
            categoryMap.set(cat, []);
        }
        categoryMap.get(cat).push(sub);
    });

    categoryMap.forEach((subs, catName) => {
        let targetSum = subs.reduce((acc, curr) => acc + (parseFloat(curr['Target']) || 0), 0);
        let unitName = subs[0]['Unit'] || '';
        let isTopo = catName.toLowerCase() === 'topografi';
        let isUtility = catName.toLowerCase() === 'utility mapping';

        let iconClass = isTopo ? 'fa-mountain text-sky-400' : (isUtility ? 'fa-network-wired text-purple-400' : 'fa-layer-group text-emerald-400');
        let barColor = isTopo ? 'from-sky-500 to-indigo-500' : (isUtility ? 'from-purple-500 to-pink-500' : 'from-emerald-500 to-teal-500');
        let textColor = isTopo ? 'text-sky-400' : (isUtility ? 'text-purple-400' : 'text-emerald-400');

        const pct = getPct(item['No File'], catName);

        progressSectionsHtml += `
            <div class="space-y-1.5 pt-2 border-t border-slate-800/60 first:border-t-0 first:pt-0">
                <div class="flex justify-between items-center text-xs">
                    <span class="${textColor} font-semibold flex items-center"><i class="fa-solid ${iconClass} mr-1.5"></i> ${catName}</span>
                    <span class="text-slate-400 font-medium">${targetSum} ${unitName} &bull; <strong class="text-slate-200">${pct}%</strong></span>
                </div>
                <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div class="bg-gradient-to-r ${barColor} h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    });

    card.innerHTML = `
        <div class="flex items-start justify-between">
            <div>
                <span class="text-xs px-2.5 py-0.5 rounded-full border bg-sky-500/10 text-sky-400 border-sky-500/20 font-semibold">${categoriesList}</span>
                <h4 class="font-extrabold text-base text-white mt-2">${item['No File'] || 'Tanpa No File'}</h4>
            </div>
            <div class="text-right">
                <span class="text-xs px-2 py-1 bg-slate-800 text-amber-400 rounded-lg border border-slate-700 font-medium">0% Global</span>
            </div>
        </div>

        <div class="space-y-3">
            ${progressSectionsHtml}
        </div>

        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span class="truncate max-w-[180px]" title="${surveyorsList}"><i class="fa-solid fa-user-gear text-slate-500 mr-1.5"></i> ${surveyorsList || '-'}</span>
            <span class="text-amber-400"><i class="fa-solid fa-clock mr-1"></i> Menunggu Site</span>
        </div>
    `;
    return card;
}

// Handle Form Submission (hantar ke Apps Script, action 'fail')
function handleFormSubmit(event) {
    event.preventDefault();

    const noFile = document.getElementById('inputNoFile').value.trim();
    const combinedSurveyor = Array.from(document.querySelectorAll('select[name="surveyorSelect"]'))
        .map(s => s.value).filter(Boolean).join(' & ');
    const tarikhMula = document.getElementById('inputTarikhMula').value;
    const tarikhSiap = document.getElementById('inputTarikhSiap').value;
    const combinedTasks = Array.from(document.querySelectorAll('input[name="taskInput"]'))
        .map(i => i.value.trim()).filter(Boolean).join(', ') || '-';

    const catRows = document.querySelectorAll('#categoryRowsContainer > div');
    if (catRows.length === 0) {
        showToast('Sila masukkan sekurang-kurangnya satu kategori.', 'error');
        return;
    }

    showToast('Menghantar data...', 'info');

    const posts = [];
    catRows.forEach(row => {
        const kategori = row.querySelector('select[name="rowCategory"]').value;
        const target = row.querySelector('input[name="rowTarget"]').value.trim();
        const unit = row.querySelector('select[name="rowUnit"]').value;
        if (!kategori || !target || !unit) return;

        posts.push(
            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'fail',
                    token: API_TOKEN,
                    noFile,
                    surveyor: combinedSurveyor || '-',
                    kategori,
                    target,
                    unit,
                    tarikhMula: toDMY(tarikhMula),
                    tarikhSiap: toDMY(tarikhSiap),
                    tugas: combinedTasks
                })
            }).then(r => r.json())
        );
    });

    Promise.all(posts)
        .then(results => {
            const gagal = results.find(r => !r.ok);
            if (gagal) throw new Error(gagal.error);
            document.getElementById('surveyForm').reset();
            resetCategoryAndTasks();
            showToast('Rekod disimpan ke Google Sheets!', 'success');
            switchTab('overview');
            return fetchData();
        })
        .catch(err => {
            console.error('Submission Error:', err);
            showToast('Gagal menyimpan: ' + err.message, 'error');
        });
}

// Kosongkan baris kategori dan tugas selepas simpan
function resetCategoryAndTasks() {
    document.getElementById('categoryRowsContainer').innerHTML = '';
    initCategoryRows();
    resetTaskContainer();
}

function exportCSV() {
    if(globalData.length === 0) {
        showToast('Tiada data untuk dieksport.', 'error');
        return;
    }

    const csv = Papa.unparse(globalData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `GeoSurvey_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Laporan CSV berjaya dieksport!', 'success');
}

window.onload = function() {
    initCategoryRows();
    fetchData();
};
