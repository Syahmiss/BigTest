// ===== Fail ini mengganti keseluruhan blok <script> aplikasi dalam teamsite/index.html =====
// Simpan sebagai teamsite/teamsite-script.js, sebelah index.html

// ===== ISI DUA NILAI INI =====
const API_URL = 'https://script.google.com/macros/s/AKfycbyEFA5qGfDKLqIjiG4YdITzuunWR95ER-geZXau0kRwWI65k5ajcHsx7T-Lo38pFH9S/exec';
const API_TOKEN = '99999999999999999999999999999999999999999999999999';

let globalTableData = [];
let categoryChartInstance = null;
let statusChartInstance = null;

// Baca semua laporan dari sheet melalui Apps Script
function loadCSVData() {
    const icon = document.getElementById('refreshIcon');
    icon.classList.add('fa-spin');

    return fetch(`${API_URL}?token=${encodeURIComponent(API_TOKEN)}`)
        .then(r => r.json())
        .then(data => {
            if (!data.ok) throw new Error(data.error || 'Ralat API');
            // Susun semula ikut 13 lajur yang renderTable() dan KPI sedia guna
            globalTableData = data.laporan.map(r => [
                r['No File'],            // 0
                r['Tarikh'],             // 1
                r['Masa Mula'],          // 2
                r['Masa Tamat'],         // 3
                r['Kategori'],           // 4
                r['Surveyor'],           // 5
                '-',                     // 6 Tugas (laporan tak simpan tugas)
                r['Kuantiti Siap'],      // 7
                r['Unit'],               // 8
                r['Status Isu'],         // 9
                '',                      // 10 Jangka Siap Asal (tiada dalam laporan)
                r['Jangka Siap Semasa'], // 11
                r['Perancangan']         // 12
            ]);
            processAndRender(globalTableData);
        })
        .catch(err => {
            console.error('Fetch Error:', err);
            showCustomModal('Ralat Sambungan', 'Gagal memuat turun data dari Google Sheets.');
        })
        .finally(() => {
            setTimeout(() => icon.classList.remove('fa-spin'), 600);
        });
}

function refreshData() {
    loadCSVData();
}

function processAndRender(data) {
    renderTable(data);
    updateKPIs(data);
    populateCategoryDropdown(data);
    renderCharts(data);
}

function updateKPIs(data) {
    const uniqueFiles = new Set();
    let selesai = 0;
    let proses = 0;
    let isu = 0;
    const surveyorSet = new Set();

    data.forEach(row => {
        const noFile = (row[0] || "").trim();
        if (noFile) uniqueFiles.add(noFile);

        // Ditegaskan untuk menyemak kolum ke-9 (Status Isu) dengan logik yang lebih inklusif
        const statusRaw = row[9] !== undefined && row[9] !== null ? String(row[9]).trim() : "";
        const status = statusRaw.toLowerCase();

        if (status.includes("selesai")) {
            selesai++;
        } else if (status.includes("isu") || status.includes("tertunda") || status.includes("cuaca") || status.includes("lewat") || (status !== "" && !status.includes("normal") && !status.includes("baik"))) {
            isu++;
        } else {
            proses++;
        }

        if (row[5]) surveyorSet.add(row[5].trim());
    });

    const totalUnique = uniqueFiles.size;
    const totalRows = data.length;

    document.getElementById('metricTotal').innerText = totalUnique;
    document.getElementById('metricSelesai').innerText = selesai;
    document.getElementById('metricProses').innerText = proses;
    document.getElementById('metricIsu').innerText = isu;
    document.getElementById('metricSurveyor').innerText = surveyorSet.size;

    const pct = totalRows > 0 ? Math.round((selesai / totalRows) * 100) : 0;
    document.getElementById('pctSelesai').innerText = `${pct}% daripada jumlah rekod (${totalRows} entri)`;
}

function populateCategoryDropdown(data) {
    const catFilter = document.getElementById('categoryFilter');
    const currentVal = catFilter.value;
    const categories = [...new Set(data.map(row => row[4]).filter(Boolean))];

    catFilter.innerHTML = '<option value="">Semua Kategori</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === currentVal) opt.selected = true;
        catFilter.appendChild(opt);
    });
}

function renderCharts(data) {
    const catCounts = {};
    data.forEach(row => {
        const cat = row[4] || 'Lain-lain';
        catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const catLabels = Object.keys(catCounts);
    const catValues = Object.values(catCounts);

    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: catLabels,
            datasets: [{
                data: catValues,
                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } }
            }
        }
    });

    let selesaiCount = 0, prosesCount = 0, isuCount = 0;
    data.forEach(row => {
        const status = (row[9] || "").toLowerCase();
        if (status.includes("selesai")) selesaiCount++;
        else if (status.includes("isu") || status.includes("tertunda") || status.includes("cuaca") || status.includes("lewat") || (status !== "" && !status.includes("normal") && !status.includes("baik"))) isuCount++;
        else prosesCount++;
    });

    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(ctxStatus, {
        type: 'bar',
        data: {
            labels: ['Selesai', 'Dalam Proses', 'Isu / Tertunda'],
            datasets: [{
                label: 'Bilangan Fail',
                data: [selesaiCount, prosesCount, isuCount],
                backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#334155' } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function filterTable() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const catVal = document.getElementById('categoryFilter').value.toLowerCase();
    const statusVal = document.getElementById('statusFilter').value.toLowerCase();

    const filtered = globalTableData.filter(row => {
        const noFile = (row[0] || "").toLowerCase();
        const tarikh = (row[1] || "").toLowerCase();
        const kat = (row[4] || "").toLowerCase();
        const surveyor = (row[5] || "").toLowerCase();
        const tugas = (row[6] || "").toLowerCase();
        const status = (row[9] || "").toLowerCase();

        const matchQuery = noFile.includes(query) || tarikh.includes(query) || surveyor.includes(query) || tugas.includes(query);
        const matchCat = !catVal || kat === catVal;

        let matchStatus = true;
        if (statusVal === 'selesai') matchStatus = status.includes('selesai');
        else if (statusVal === 'normal') matchStatus = status.includes('normal');
        else if (statusVal === 'isu') matchStatus = status.includes('isu') || status.includes('tertunda') || status.includes('cuaca') || status.includes('lewat') || (status !== "" && !status.includes('normal'));

        return matchQuery && matchCat && matchStatus;
    });

    renderTable(filtered);
}

function resetFilters() {
    document.getElementById('searchInput').value = "";
    document.getElementById('categoryFilter').value = "";
    document.getElementById('statusFilter').value = "";
    renderTable(globalTableData);
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500">Tiada rekod data dijumpai.</td></tr>`;
        document.getElementById('recordCount').innerText = `Memaparkan 0 daripada 0 rekod lapangan`;
        return;
    }

    data.forEach((row) => {
        const status = (row[9] !== undefined && row[9] !== null && String(row[9]).trim() !== "") ? String(row[9]).trim() : "Normal";
        let statusBadge = "bg-slate-500/10 text-slate-400 border-slate-500/20";

        const statusLower = status.toLowerCase();
        if (statusLower.includes("selesai")) {
            statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        } else if (statusLower.includes("isu") || statusLower.includes("tertunda") || statusLower.includes("cuaca") || statusLower.includes("lewat") || !statusLower.includes("normal")) {
            statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";
        } else if (statusLower.includes("proses")) {
            statusBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
        } else {
            statusBadge = "bg-blue-500/10 text-blue-400 border-blue-500/20";
        }

        let tugasRaw = row[6] || '-';
        let tugasHtml = '';
        if (tugasRaw.includes('•') || tugasRaw.includes('<br>')) {
            tugasHtml = `<ul class="list-disc list-inside space-y-0.5 text-slate-300">${tugasRaw.split(/•|<br>/).filter(t=>t.trim()).map(t => `<li>${t.trim()}</li>`).join('')}</ul>`;
        } else {
            tugasHtml = `<ul class="list-disc list-inside space-y-0.5 text-slate-300"><li>${tugasRaw}</li></ul>`;
        }

        const tr = document.createElement('tr');
        tr.className = "hover:bg-dark-700/40 transition-colors border-b border-dark-700/30";
        tr.innerHTML = `
            <td class="py-3 px-4 font-mono font-bold text-gold-400">${row[0] || '-'}</td>
            <td class="py-3 px-4 text-slate-300 font-medium">${row[1] || '-'}</td>
            <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">${row[2] || '-'} - ${row[3] || '-'}</td>
            <td class="py-3 px-4"><span class="px-2.5 py-1 bg-dark-700 text-slate-200 rounded-md text-[10px] font-semibold tracking-wide border border-dark-600">${row[4] || '-'}</span></td>
            <td class="py-3 px-4 font-semibold text-slate-200">${row[5] || '-'}</td>
            <td class="py-3 px-4">${tugasHtml}</td>
            <td class="py-3 px-4"><span class="font-bold text-white">${row[7] || '-'}</span> <span class="text-slate-400 text-[11px]">${row[8] || ''}</span></td>
            <td class="py-3 px-4"><span class="px-2.5 py-1 rounded-full text-[10px] border font-medium inline-block ${statusBadge}">${status}</span></td>
            <td class="py-3 px-4 text-[11px]">
                <div class="line-through text-slate-500">${row[10] || '-'}</div>
                <div class="text-slate-200 font-semibold">${row[11] || '-'}</div>
            </td>
            <td class="py-3 px-4 text-slate-300 text-[11px]">${row[12] || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
    document.getElementById('recordCount').innerText = `Memaparkan ${data.length} daripada ${globalTableData.length} rekod lapangan`;
}

function openFormModal() {
    document.getElementById('recordFormModal').classList.remove('hidden');
}

function closeFormModal() {
    document.getElementById('recordFormModal').classList.add('hidden');
}

function addTugasField() {
    const container = document.getElementById('tugasContainer');
    const div = document.createElement('div');
    div.className = "flex items-center space-x-2 mt-2";
    div.innerHTML = `
        <input type="text" required placeholder="Tugas seterusnya..."
            class="tugas-input w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-gold-500">
        <button type="button" onclick="this.parentElement.remove()" class="text-rose-400 hover:text-rose-300 p-2 text-xs">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

// Hantar laporan ke Apps Script (action 'laporan')
function handleFormSubmit(event) {
    event.preventDefault();

    const toDMY = iso => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    };

    const body = {
        action: 'laporan',
        token: API_TOKEN,
        noFile: document.getElementById('inputNoFile').value.trim(),
        tarikh: toDMY(document.getElementById('inputTarikh').value),
        masaMula: document.getElementById('inputMasaMula').value,
        masaTamat: document.getElementById('inputMasaTamat').value,
        kategori: document.getElementById('inputKategori').value,
        surveyor: document.getElementById('inputSurveyor').value.trim(),
        kuantitiSiap: document.getElementById('inputKuantiti').value.trim(),
        unit: document.getElementById('inputUnit').value,
        statusIsu: document.getElementById('inputStatus').value.trim(),
        jangkaSemasa: toDMY(document.getElementById('inputJangkaSemasa').value),
        perancangan: document.getElementById('inputPerancangan').value.trim() || '-'
    };

    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    submitBtn.disabled = true;
    submitText.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...';

    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
    })
        .then(r => r.json())
        .then(res => {
            if (!res.ok) throw new Error(res.error || 'Ralat tidak diketahui');
            closeFormModal();
            document.getElementById('surveyForm').reset();
            showCustomModal('Berjaya Disimpan', `Laporan fail ${body.noFile} telah disimpan ke Google Sheet.`);
            return loadCSVData();
        })
        .catch(err => {
            console.error('Ralat simpan:', err);
            showCustomModal('Ralat Sambungan', 'Gagal simpan: ' + err.message);
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitText.innerText = 'Simpan Rekod Lapangan';
        });
}

function exportCSV() {
    let csvContent = "data:text/csv;charset=utf-8,No File,Tarikh,Masa Mula,Masa Tamat,Kategori,Surveyor,Tugas,Kuantiti,Unit,Status Isu,Jangka Siap Asal,Jangka Siap Semasa,Perancangan\r\n";
    globalTableData.forEach(row => {
        csvContent += row.map(e => `"${e || ''}"`).join(",") + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_lapangan_jurukur_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showCustomModal(title, message) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalMessage').innerText = message;
    document.getElementById('notificationModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('notificationModal').classList.add('hidden');
}

window.onload = loadCSVData;
