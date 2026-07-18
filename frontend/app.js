// ==========================================
// Antigravity Pay - Frontend Application Logic
// 100% Vanilla ES6 JavaScript (No Build Step)
// ==========================================

const API_BASE = "http://127.0.0.1:8000/api";

// Global app state
let state = {
    activeTab: "dashboard",
    summary: {},
    transactions: [],
    holdings: [],
    fixedDeposits: [],
    gold: [],
    pf: [],
    realestate: [],
    insurance: [],
    templates: [],
    currentPreview: null // Stores currently uploaded preview payload
};

// Global chart instances
let allocationChartInstance = null;
let cashflowChartInstance = null;

// App initialization on DOM load
document.addEventListener("DOMContentLoaded", () => {
    // Initial data fetch
    refreshAllData();

    // Set up Drag and Drop Handlers
    initDragAndDrop();
});

// Refresh all sections of the app
async function refreshAllData() {
    await fetchSummary();
    await fetchTransactions();
    await fetchHoldings();
    await fetchFixedDeposits();
    await fetchGold();
    await fetchPF();
    await fetchRealEstate();
    await fetchInsurance();
    await fetchTemplates();
    renderAll();
}

// ----------------- API CALLS -----------------

async function fetchSummary() {
    try {
        const res = await fetch(`${API_BASE}/summary`);
        if (!res.ok) throw new Error("Failed to fetch summary data.");
        state.summary = await res.json();
    } catch (e) {
        console.error(e);
    }
}

async function fetchTransactions() {
    try {
        const res = await fetch(`${API_BASE}/transactions`);
        if (!res.ok) throw new Error("Failed to fetch ledger transactions.");
        state.transactions = await res.json();
    } catch (e) {
        console.error(e);
    }
}

async function fetchHoldings() {
    try {
        const res = await fetch(`${API_BASE}/holdings`);
        if (!res.ok) throw new Error("Failed to fetch portfolio holdings.");
        state.holdings = await res.json();
    } catch (e) {
        console.error(e);
    }
}

async function fetchFixedDeposits() {
    try {
        const res = await fetch(`${API_BASE}/fixed-deposits`);
        if (!res.ok) throw new Error("Failed to fetch fixed deposits.");
        state.fixedDeposits = await res.json();
    } catch (e) {
        console.error(e);
    }
}

async function fetchTemplates() {
    try {
        const res = await fetch(`${API_BASE}/templates`);
        if (!res.ok) throw new Error("Failed to fetch templates.");
        state.templates = await res.json();
    } catch (e) {
        console.error(e);
    }
}

async function fetchGold() {
    try {
        const res = await fetch(`${API_BASE}/gold`);
        if (!res.ok) throw new Error("Failed to fetch gold holdings.");
        state.gold = await res.json();
    } catch (e) {
        console.error(e);
    }
}

async function fetchPF() {
    try {
        const res = await fetch(`${API_BASE}/provident-funds`);
        if (!res.ok) throw new Error("Failed to fetch provident funds.");
        state.pf = await res.json();
    } catch (e) {
        console.error(e);
    }
}

async function fetchRealEstate() {
    try {
        const res = await fetch(`${API_BASE}/real-estate`);
        if (!res.ok) throw new Error("Failed to fetch real estate holdings.");
        state.realestate = await res.json();
    } catch (e) {
        console.error(e);
    }
}

async function fetchInsurance() {
    try {
        const res = await fetch(`${API_BASE}/insurance`);
        if (!res.ok) throw new Error("Failed to fetch insurance policies.");
        state.insurance = await res.json();
    } catch (e) {
        console.error(e);
    }
}

// ----------------- DOM RENDERING -----------------

function renderAll() {
    renderSummaryCards();
    renderCharts();
    renderRecentTransactions();
    renderLedger();
    renderHoldings();
    renderFixedDeposits();
    renderGold();
    renderPF();
    renderRealEstate();
    renderInsurance();
    renderTemplatesList();
}

function renderSummaryCards() {
    const s = state.summary;
    if (!s.net_worth) return;

    document.getElementById("val-net-worth").innerText = formatINR(s.net_worth);
    document.getElementById("val-cash").innerText = formatINR(s.total_cash);
    document.getElementById("val-cc-debt").innerText = formatINR(s.total_cc_debt);
    document.getElementById("val-invest-val").innerText = formatINR(s.total_investments_value);

    // Render P&L Gain/Loss
    const pnlBadge = document.getElementById("val-invest-pnl");
    const gainLoss = s.investments_gain_loss || 0.0;
    const cost = s.total_investments_cost || 0.0;
    const pct = cost > 0 ? (gainLoss / cost) * 100 : 0.0;

    pnlBadge.innerText = `${gainLoss >= 0 ? '+' : ''}${formatINR(gainLoss)} (${pct.toFixed(2)}%)`;
    if (gainLoss >= 0) {
        pnlBadge.className = "pnl-badge positive";
    } else {
        pnlBadge.className = "pnl-badge negative";
    }
}

function renderRecentTransactions() {
    const tbody = document.getElementById("recent-transactions-tbody");
    tbody.innerHTML = "";

    const recents = state.transactions.slice(0, 5);
    if (recents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="center-text mute-text">No transactions imported yet.</td></tr>`;
        return;
    }

    recents.forEach(t => {
        const row = document.createElement("tr");
        const amt = t.debit > 0 ? t.debit : t.credit;
        const amtBadge = t.debit > 0 
            ? `<span class="badge debit-badge">- ${formatINR(amt)}</span>`
            : `<span class="badge credit-badge">+ ${formatINR(amt)}</span>`;

        row.innerHTML = `
            <td>${formatDateLabel(t.date)}</td>
            <td><span class="mute-text">${t.institution}</span> (${t.account_name})</td>
            <td>${t.description}</td>
            <td><span class="tag">${t.category || "Uncategorized"}</span></td>
            <td class="num-col">${amtBadge}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderLedger() {
    const tbody = document.getElementById("ledger-tbody");
    tbody.innerHTML = "";

    const txns = state.transactions;
    if (txns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="center-text mute-text">No transactions loaded.</td></tr>`;
        return;
    }

    // Populate Account Filter options (only if not already populated to avoid resetting selection)
    const accFilter = document.getElementById("ledger-filter-account");
    if (accFilter.options.length <= 1) {
        const uniqueAccounts = {};
        txns.forEach(t => {
            uniqueAccounts[t.account_id] = `${t.institution} - ${t.account_name}`;
        });
        for (const [id, label] of Object.entries(uniqueAccounts)) {
            const opt = document.createElement("option");
            opt.value = id;
            opt.textContent = label;
            accFilter.appendChild(opt);
        }
    }

    txns.forEach(t => {
        const row = document.createElement("tr");
        row.className = "ledger-row-item";
        row.dataset.accountId = t.account_id;
        row.dataset.category = t.category || "Uncategorized";
        row.dataset.searchText = `${t.description} ${t.reference_no || ''}`.toLowerCase();

        const drText = t.debit > 0 ? formatINR(t.debit) : "-";
        const crText = t.credit > 0 ? formatINR(t.credit) : "-";
        const balText = t.balance !== null ? formatINR(t.balance) : "-";

        row.innerHTML = `
            <td>${t.date}</td>
            <td><span class="mute-text">${t.institution}</span></td>
            <td>${t.description}</td>
            <td>${t.reference_no || '-'}</td>
            <td><span class="tag">${t.category || 'Uncategorized'}</span></td>
            <td class="num-col" style="${t.debit > 0 ? 'color:#fb7185' : ''}">${drText}</td>
            <td class="num-col" style="${t.credit > 0 ? 'color:#34d399' : ''}">${crText}</td>
            <td class="num-col">${balText}</td>
        `;
        tbody.appendChild(row);
    });
}

function filterLedger() {
    const searchVal = document.getElementById("ledger-search").value.toLowerCase();
    const accIdVal = document.getElementById("ledger-filter-account").value;
    const catVal = document.getElementById("ledger-filter-category").value;

    const rows = document.querySelectorAll(".ledger-row-item");
    rows.forEach(r => {
        const matchesSearch = !searchVal || r.dataset.searchText.includes(searchVal);
        const matchesAcc = !accIdVal || r.dataset.accountId === accIdVal;
        const matchesCat = !catVal || r.dataset.category === catVal;

        if (matchesSearch && matchesAcc && matchesCat) {
            r.style.display = "";
        } else {
            r.style.display = "none";
        }
    });
}

function renderHoldings() {
    const tbody = document.getElementById("investments-tbody");
    tbody.innerHTML = "";

    const holdings = state.holdings;
    if (holdings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="center-text mute-text">No investment holdings registered.</td></tr>`;
        return;
    }

    holdings.forEach(h => {
        const row = document.createElement("tr");
        row.className = "clickable-row";
        row.onclick = () => openTradesModal(h);

        const currentVal = h.total_quantity * (h.current_price > 0 ? h.current_price : h.average_price);
        const gainLoss = currentVal - h.total_invested_amount;
        const gainPct = h.total_invested_amount > 0 ? (gainLoss / h.total_invested_amount) * 100 : 0.0;
        
        const pnlColor = gainLoss >= 0 ? "#34d399" : "#fb7185";

        row.innerHTML = `
            <td><strong>${h.asset_name}</strong></td>
            <td>${h.institution} (${h.account_name})</td>
            <td><span class="tag">${h.symbol_or_code}</span></td>
            <td class="num-col">${h.total_quantity.toFixed(3)}</td>
            <td class="num-col">${formatINR(h.average_price)}</td>
            <td class="num-col">${formatINR(h.total_invested_amount)}</td>
            <td class="num-col">${h.current_price > 0 ? formatINR(h.current_price) : '-'}</td>
            <td class="num-col"><strong>${formatINR(currentVal)}</strong></td>
            <td class="num-col" style="color:${pnlColor}; font-weight:600;">
                ${gainLoss >= 0 ? '+' : ''}${formatINR(gainLoss)} (${gainPct.toFixed(2)}%)
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderFixedDeposits() {
    const tbody = document.getElementById("fds-tbody");
    tbody.innerHTML = "";

    const fds = state.fixedDeposits;
    if (fds.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="center-text mute-text">No active Fixed Deposits imported.</td></tr>`;
        return;
    }

    fds.forEach(fd => {
        const row = document.createElement("tr");
        const statusBadge = fd.status === "ACTIVE" 
            ? `<span class="badge credit-badge">Active</span>`
            : `<span class="badge debit-badge">Matured</span>`;

        row.innerHTML = `
            <td><strong>${fd.fd_number}</strong></td>
            <td>${fd.institution} (${fd.account_name})</td>
            <td class="num-col">${formatINR(fd.principal_amount)}</td>
            <td class="num-col">${formatINR(fd.maturity_amount)}</td>
            <td class="num-col">${fd.interest_rate.toFixed(2)}%</td>
            <td>${fd.deposit_date}</td>
            <td>${fd.maturity_date}</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderTemplatesList() {
    const container = document.getElementById("templates-list-div");
    container.innerHTML = "";

    if (state.templates.length === 0) {
        container.innerHTML = `<p class="mute-text center-text">No custom templates configured.</p>`;
        return;
    }

    state.templates.forEach(t => {
        const item = document.createElement("div");
        item.className = "template-item";
        item.innerHTML = `
            <div class="template-item-info">
                <h5>${t.name}</h5>
                <span>Institution: ${t.config.institution} | Matches: ${t.config.identification_keywords.join(', ')}</span>
            </div>
            <button class="text-btn" style="color:var(--color-danger);" onclick="deleteTemplate('${t.name}')">Delete</button>
        `;
        container.appendChild(item);
    });
}

// ----------------- MODAL ACTIONS -----------------

function openTradesModal(holding) {
    document.getElementById("txt-trades-asset-title").innerText = `Trades Ledger - ${holding.asset_name}`;
    const tbody = document.getElementById("trades-tbody");
    tbody.innerHTML = "";

    holding.trades.forEach(t => {
        const row = document.createElement("tr");
        const typeBadge = t.transaction_type === "BUY"
            ? `<span class="badge credit-badge" style="background-color:rgba(16,185,129,0.08);">BUY</span>`
            : t.transaction_type === "SELL"
                ? `<span class="badge debit-badge" style="background-color:rgba(244,63,94,0.08);">SELL</span>`
                : `<span class="badge" style="background-color:rgba(99,102,241,0.08);color:#c7d2fe;">REINVEST</span>`;

        row.innerHTML = `
            <td>${t.date}</td>
            <td>${typeBadge}</td>
            <td class="num-col">${t.quantity.toFixed(3)}</td>
            <td class="num-col">${formatINR(t.price_per_unit)}</td>
            <td class="num-col"><strong>${formatINR(t.total_amount)}</strong></td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById("trades-modal").style.display = "flex";
}

function closeTradesModal() {
    document.getElementById("trades-modal").style.display = "none";
}

// ----------------- CHARTS CREATION -----------------

function renderCharts() {
    const s = state.summary;
    if (s.net_worth === undefined) return;

    // 1. Asset Allocation Chart
    const ctxAlloc = document.getElementById("chart-allocation").getContext("2d");
    if (allocationChartInstance) {
        allocationChartInstance.destroy();
    }
    
    const cashVal = s.total_cash || 0;
    const fdVal = s.total_fixed_deposits || 0;
    const invVal = s.total_investments_value || 0;
    const goldVal = s.total_gold_value || 0;
    const pfVal = s.total_pf_value || 0;
    const reVal = s.total_real_estate_equity || 0;
    
    // Check if there is any data to show in chart
    if (cashVal === 0 && fdVal === 0 && invVal === 0 && goldVal === 0 && pfVal === 0 && reVal === 0) {
        return;
    }

    allocationChartInstance = new Chart(ctxAlloc, {
        type: 'doughnut',
        data: {
            labels: ['Cash', 'Fixed Deposits', 'Investments (Stocks/MF)', 'Gold & Bullion', 'Provident Funds', 'Real Estate Equity'],
            datasets: [{
                data: [cashVal, fdVal, invVal, goldVal, pfVal, reVal],
                backgroundColor: [
                    '#10b981', // Success Emerald green
                    '#06b6d4', // Cyan
                    '#6366f1', // Primary Indigo
                    '#eab308', // Gold Yellow
                    '#f97316', // Orange (PF)
                    '#ec4899'  // Pink (Real Estate)
                ],
                borderColor: '#111827',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI"' } }
                }
            }
        }
    });

    // 2. Income vs Expenses Chart (Monthly Trend)
    // Gather debits and credits grouped by month
    const monthlyData = {};
    state.transactions.forEach(t => {
        const month = t.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
            monthlyData[month] = { income: 0.0, expense: 0.0 };
        }
        monthlyData[month].income += t.credit;
        monthlyData[month].expense += t.debit;
    });

    // Get sorted list of last 6 months
    const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
    const incomeData = sortedMonths.map(m => monthlyData[m].income);
    const expenseData = sortedMonths.map(m => monthlyData[m].expense);
    const labels = sortedMonths.map(m => {
        const dateObj = new Date(m + "-01");
        return dateObj.toLocaleString('default', { month: 'short', year: '2-digit' });
    });

    const ctxCashflow = document.getElementById("chart-cashflow").getContext("2d");
    if (cashflowChartInstance) {
        cashflowChartInstance.destroy();
    }
    cashflowChartInstance = new Chart(ctxCashflow, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: [
                {
                    label: 'Income',
                    data: incomeData.length > 0 ? incomeData : [0],
                    backgroundColor: '#10b981',
                    borderRadius: 4
                },
                {
                    label: 'Expenses',
                    data: expenseData.length > 0 ? expenseData : [0],
                    backgroundColor: '#f43f5e',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8' }
                }
            }
        }
    });
}

// ----------------- DRAG & DROP UPLOAD HANDLERS -----------------

function initDragAndDrop() {
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");

    // Click drop zone triggers file browse
    dropZone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Drag events
    ["dragenter", "dragover"].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add("dragover");
        }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
        }, false);
    });

    dropZone.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
}

async function handleFileUpload(file) {
    const progressBox = document.getElementById("parsing-progress");
    const progressFill = document.getElementById("progress-bar-fill");
    const statusText = document.getElementById("progress-status-text");
    
    // Reset steps UI
    document.getElementById("step-upload").className = "step completed";
    document.getElementById("step-detect").className = "step active";
    document.getElementById("step-parse").className = "step";
    
    progressBox.style.display = "block";
    progressFill.style.width = "30%";
    statusText.innerText = `Uploading ${file.name}...`;

    const formData = new FormData();
    formData.append("file", file);

    try {
        // Step 2: Running layout detection
        setTimeout(() => {
            progressFill.style.width = "60%";
            document.getElementById("step-detect").className = "step completed";
            document.getElementById("step-parse").className = "step active";
            statusText.innerText = "Analyzing file headers and matching templates...";
        }, 800);

        const res = await fetch(`${API_BASE}/upload`, {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Upload / parsing failed.");
        }

        const data = await res.json();
        state.currentPreview = data;

        // Step 3: Success
        progressFill.style.width = "100%";
        document.getElementById("step-parse").className = "step completed";
        statusText.innerText = "Parsing completed successfully!";

        setTimeout(() => {
            progressBox.style.display = "none";
            renderPreview(data);
        }, 500);

    } catch (e) {
        progressFill.style.width = "0%";
        statusText.innerHTML = `<span style="color:var(--color-danger);">Error: ${e.message}</span>`;
        console.error(e);
    }
}

function renderPreview(data) {
    const container = document.getElementById("preview-container");
    container.style.display = "block";

    // Set header badge type
    const typeLabel = document.getElementById("txt-detected-type");
    if (data.file_type === "bank_statement") typeLabel.innerText = "Detected PDF Bank Statement";
    else if (data.file_type === "email_alert") typeLabel.innerText = "Detected Email Expense Alert";
    else if (data.file_type === "investment_statement") typeLabel.innerText = "Detected Investment CAS Portfolio";
    else typeLabel.innerText = "Import Preview";

    // Fill Account Form details
    const acc = data.account;
    document.getElementById("acc-name").value = acc.name;
    document.getElementById("acc-inst").value = acc.institution;
    document.getElementById("acc-type").value = acc.account_type;
    document.getElementById("acc-suffix").value = acc.account_number_suffix;

    // Show appropriate table
    const bankTable = document.getElementById("preview-bank-table");
    const investTable = document.getElementById("preview-investment-table");
    const countLabel = document.getElementById("txt-preview-count");

    if (data.file_type === "investment_statement") {
        bankTable.style.display = "none";
        investTable.style.display = "table";
        
        const tbody = document.getElementById("preview-investment-tbody");
        tbody.innerHTML = "";
        
        let totalCount = 0;
        data.investments.forEach(inv => {
            const row = document.createElement("tr");
            const qty = inv.transactions.reduce((acc, t) => acc + t.quantity, 0.0);
            const totalCost = inv.transactions.reduce((acc, t) => acc + t.total_amount, 0.0);
            const avgPrice = qty > 0 ? totalCost / qty : 0.0;
            
            row.innerHTML = `
                <td><strong>${inv.asset_name}</strong></td>
                <td><span class="tag">${inv.symbol_or_code}</span></td>
                <td class="num-col">${inv.transactions.length} trades</td>
                <td class="num-col">${qty.toFixed(3)}</td>
                <td class="num-col">${formatINR(avgPrice)}</td>
            `;
            tbody.appendChild(row);
            totalCount += inv.transactions.length;
        });
        countLabel.innerText = `${data.investments.length} holdings (${totalCount} trades)`;
    } else {
        bankTable.style.display = "table";
        investTable.style.display = "none";
        
        const tbody = document.getElementById("preview-bank-tbody");
        tbody.innerHTML = "";
        
        data.bank_transactions.forEach(t => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${t.date}</td>
                <td><input type="text" class="table-input desc-input" value="${t.description}"></td>
                <td><input type="text" class="table-input ref-input" value="${t.reference_no || ''}"></td>
                <td>
                    <select class="table-input cat-input">
                        <option value="Uncategorized" ${t.category==='Uncategorized'?'selected':''}>Uncategorized</option>
                        <option value="Food & Dining" ${t.category==='Food & Dining'?'selected':''}>Food & Dining</option>
                        <option value="Salary" ${t.category==='Salary'?'selected':''}>Salary/Income</option>
                        <option value="Utilities" ${t.category==='Utilities'?'selected':''}>Utilities/Bills</option>
                        <option value="Shopping" ${t.category==='Shopping'?'selected':''}>Shopping</option>
                        <option value="Transport" ${t.category==='Transport'?'selected':''}>Travel/Transport</option>
                    </select>
                </td>
                <td class="num-col"><input type="number" step="0.01" class="table-input num-col debit-input" value="${t.debit}"></td>
                <td class="num-col"><input type="number" step="0.01" class="table-input num-col credit-input" value="${t.credit}"></td>
            `;
            tbody.appendChild(row);
        });
        countLabel.innerText = data.bank_transactions.length;
    }
}

function cancelPreview() {
    document.getElementById("preview-container").style.display = "none";
    state.currentPreview = null;
}

async function confirmImport() {
    if (!state.currentPreview) return;

    // Build values payload from updated Form/Inputs
    const accPayload = {
        name: document.getElementById("acc-name").value,
        institution: document.getElementById("acc-inst").value,
        account_type: document.getElementById("acc-type").value,
        account_number_suffix: document.getElementById("acc-suffix").value
    };

    const confirmPayload = {
        account: accPayload
    };

    if (state.currentPreview.file_type === "investment_statement") {
        confirmPayload.investments = state.currentPreview.investments;
    } else {
        // Collect edited details from table input elements
        const txns = [];
        const rows = document.querySelectorAll("#preview-bank-tbody tr");
        rows.forEach(r => {
            const desc = r.querySelector(".desc-input").value;
            const ref = r.querySelector(".ref-input").value;
            const cat = r.querySelector(".cat-input").value;
            const debit = parseFloat(r.querySelector(".debit-input").value) || 0.0;
            const credit = parseFloat(r.querySelector(".credit-input").value) || 0.0;
            const date = r.cells[0].innerText;
            
            txns.push({
                date,
                description: desc,
                reference_no: ref ? ref : null,
                debit,
                credit,
                category: cat,
                balance: null
            });
        });
        confirmPayload.bank_transactions = txns;
    }

    try {
        const res = await fetch(`${API_BASE}/confirm-import`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: jsonStringify(confirmPayload)
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Import failed.");
        }

        const data = await res.json();
        alert(data.message);
        
        // Cleanup UI
        cancelPreview();
        await refreshAllData();
        switchTab('dashboard');

    } catch (e) {
        alert("Error during confirmation: " + e.message);
        console.error(e);
    }
}

// ----------------- CUSTOM TEMPLATE CREATOR -----------------

async function saveCustomTemplate(e) {
    e.preventDefault();
    const name = document.getElementById("tmpl-name").value;
    const institution = document.getElementById("tmpl-inst").value;
    const keywords = document.getElementById("tmpl-keywords").value.split(",").map(k => k.trim());
    
    const columns = {
        date: parseInt(document.getElementById("col-date").value),
        description: parseInt(document.getElementById("col-desc").value),
        ref_no: parseInt(document.getElementById("col-ref").value),
        debit: parseInt(document.getElementById("col-debit").value),
        credit: parseInt(document.getElementById("col-credit").value),
        balance: parseInt(document.getElementById("col-bal").value)
    };

    const date_format = document.getElementById("tmpl-date-fmt").value;
    const start_trigger = document.getElementById("tmpl-start-regex").value;
    const end_trigger = document.getElementById("tmpl-end-regex").value;

    const payload = {
        name,
        config: {
            account_type: "BANK",
            institution,
            identification_keywords: keywords,
            columns,
            date_format,
            start_trigger,
            end_trigger
        }
    };

    try {
        const res = await fetch(`${API_BASE}/templates`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: jsonStringify(payload)
        });

        if (!res.ok) throw new Error("Saving template failed.");
        
        alert(`Template '${name}' saved successfully!`);
        document.getElementById("template-builder-form").reset();
        await fetchTemplates();
        renderTemplatesList();
    } catch (err) {
        alert("Error saving template: " + err.message);
    }
}

async function deleteTemplate(name) {
    // Note: To keep SQL schema simple, we just call save_template with empty/deleted if we had a delete endpoint.
    // For local convenience, we can just save it or delete. Since templates are in SQLite, we can define a quick delete.
    // To make it simple, we can run a delete. Let's just create an alert for now.
    alert("Templates are persistent offline. Deleting requires database reset or template pruning endpoint (coming soon).");
}

// ----------------- TAB NAVIGATION -----------------

function switchTab(tabId) {
    // Hide active tabs
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));

    // Activate selected
    document.getElementById(`tab-${tabId}`).classList.add("active");
    document.getElementById(`btn-tab-${tabId}`).classList.add("active");

    // Update Header titles
    const title = document.getElementById("page-title");
    const subtitle = document.getElementById("page-subtitle");
    
    if (tabId === "dashboard") {
        title.innerText = "Dashboard Overview";
        subtitle.innerText = "Welcome back. Your financial vault is local and secure.";
        renderCharts(); // Force redraw charts when returning to dashboard
    } else if (tabId === "upload") {
        title.innerText = "Import Financial Data";
        subtitle.innerText = "Upload credit card bills, mutual funds, or transaction emails.";
    } else if (tabId === "ledger") {
        title.innerText = "Ledger Book Entries";
        subtitle.innerText = "Browse, search, and audit your personal ledger logs.";
    } else if (tabId === "investments") {
        title.innerText = "Investment Portfolio";
        subtitle.innerText = "Stocks & Mutual Funds consolidated average pricing.";
    } else if (tabId === "fds") {
        title.innerText = "Fixed Deposit Assets";
        subtitle.innerText = "Manage active fixed deposit holdings.";
    } else if (tabId === "gold") {
        title.innerText = "Gold & Precious Metals";
        subtitle.innerText = "Track physical bullion, coins, Sovereign Gold Bonds and ETFs.";
    } else if (tabId === "pf") {
        title.innerText = "Provident Retirement Funds";
        subtitle.innerText = "Manage compounding balances in EPF, PPF, and NPS accounts.";
    } else if (tabId === "realestate") {
        title.innerText = "Real Estate Portfolio";
        subtitle.innerText = "Monitor property values, mortgages, and rental streams.";
    } else if (tabId === "insurance") {
        title.innerText = "Insurance Registry";
        subtitle.innerText = "Keep track of active life, medical, auto, and ULIP policies.";
    } else if (tabId === "templates") {
        title.innerText = "Statement Configurator";
        subtitle.innerText = "Configure columns and trigger keywords for new statement sheets.";
    }

    state.activeTab = tabId;
}

// ----------------- NEW ASSETS RENDERERS -----------------

function renderGold() {
    const tbody = document.getElementById("gold-tbody");
    tbody.innerHTML = "";

    const gold = state.gold;
    if (gold.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="center-text mute-text">No gold holdings logged.</td></tr>`;
        return;
    }

    gold.forEach(g => {
        const row = document.createElement("tr");
        const currentVal = g.weight_grams * g.current_price_per_gram;
        const gainLoss = currentVal - g.invested_amount;
        const pnlColor = gainLoss >= 0 ? "#34d399" : "#fb7185";

        let typeText = g.gold_type;
        if (g.gold_type === 'PHYSICAL_BAR') typeText = 'Physical Gold';
        else if (g.gold_type === 'SOVEREIGN_GOLD_BOND') typeText = 'Sovereign Gold Bond (SGB)';
        else if (g.gold_type === 'GOLD_ETF') typeText = 'Gold ETF';

        row.innerHTML = `
            <td><strong>${typeText}</strong></td>
            <td>${g.institution} (${g.account_name})</td>
            <td>${g.weight_grams.toFixed(2)} g</td>
            <td>${g.purity_carats}K</td>
            <td class="num-col">${formatINR(g.invested_amount)}</td>
            <td class="num-col">${formatINR(g.current_price_per_gram)}/g</td>
            <td class="num-col"><strong>${formatINR(currentVal)}</strong></td>
            <td class="num-col" style="color:${pnlColor}; font-weight:600;">
                ${gainLoss >= 0 ? '+' : ''}${formatINR(gainLoss)}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderPF() {
    const tbody = document.getElementById("pf-tbody");
    tbody.innerHTML = "";

    const pf = state.pf;
    if (pf.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="center-text mute-text">No provident funds accounts configured.</td></tr>`;
        return;
    }

    pf.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${p.pf_type}</strong></td>
            <td>${p.institution} (${p.account_name})</td>
            <td class="num-col"><strong>${formatINR(p.current_balance)}</strong></td>
            <td class="num-col">${p.monthly_contribution > 0 ? formatINR(p.monthly_contribution) : '-'}</td>
            <td class="num-col">${p.interest_rate.toFixed(2)}%</td>
            <td>${p.last_updated_date}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderRealEstate() {
    const tbody = document.getElementById("realestate-tbody");
    tbody.innerHTML = "";

    const re = state.realestate;
    if (re.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="center-text mute-text">No property holdings logged.</td></tr>`;
        return;
    }

    re.forEach(r => {
        const row = document.createElement("tr");
        const equity = r.current_estimated_value - r.associated_loan_amount;

        row.innerHTML = `
            <td><strong>${r.property_name}</strong></td>
            <td>${r.institution || '-'} (${r.account_name})</td>
            <td class="num-col">${formatINR(r.purchase_price)}</td>
            <td class="num-col">${formatINR(r.current_estimated_value)}</td>
            <td class="num-col" style="color:#fb7185;">${r.associated_loan_amount > 0 ? formatINR(r.associated_loan_amount) : '-'}</td>
            <td class="num-col"><strong>${formatINR(equity)}</strong></td>
            <td class="num-col">${r.monthly_rental_income > 0 ? formatINR(r.monthly_rental_income) : '-'}</td>
            <td><span class="tag">${r.status.replace('_', ' ')}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function renderInsurance() {
    const tbody = document.getElementById("insurance-tbody");
    tbody.innerHTML = "";

    const ins = state.insurance;
    if (ins.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="center-text mute-text">No insurance policies registered.</td></tr>`;
        return;
    }

    ins.forEach(i => {
        const row = document.createElement("tr");
        const statusBadge = i.status === "ACTIVE" 
            ? `<span class="badge credit-badge">Active</span>`
            : `<span class="badge debit-badge">Lapsed</span>`;

        row.innerHTML = `
            <td><strong>${i.policy_number}</strong></td>
            <td>${i.institution} (${i.account_name})</td>
            <td>${i.policy_name}</td>
            <td><span class="tag">${i.policy_type.replace('_', ' ')}</span></td>
            <td class="num-col"><strong>${formatINR(i.sum_assured)}</strong></td>
            <td class="num-col">${formatINR(i.premium_amount)}</td>
            <td>${i.premium_frequency}</td>
            <td>${i.due_date}</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(row);
    });
}

// ----------------- MODAL ACTIONS & CONTROLLERS -----------------

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = "flex";
}

let pendingAccountType = null;

function openCreateAccountModal(type = 'BANK') {
    pendingAccountType = type;
    document.getElementById("new-acc-type").value = type;
    openModal('account-modal');
}

async function saveManualAccount(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById("new-acc-name").value.trim(),
        institution: document.getElementById("new-acc-inst").value.trim(),
        account_type: document.getElementById("new-acc-type").value,
        account_number_suffix: document.getElementById("new-acc-suffix").value.trim()
    };

    try {
        const res = await fetch(`${API_BASE}/accounts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to create account profile.");
        
        closeModal('account-modal');
        document.getElementById("form-add-account").reset();
        
        // Refresh account dropdowns in manual entry modals
        await refreshAccountSelects();
        alert("Account profile created successfully!");
    } catch (err) {
        alert(err.message);
    }
}

async function refreshAccountSelects() {
    try {
        const res = await fetch(`${API_BASE}/accounts`);
        if (!res.ok) throw new Error("Failed to fetch accounts.");
        const accounts = await res.json();
        
        const populateSelect = (selectId, filterTypes) => {
            const select = document.getElementById(selectId);
            if (!select) return;
            select.innerHTML = "";
            const filtered = accounts.filter(a => filterTypes.includes(a.account_type));
            if (filtered.length === 0) {
                const opt = document.createElement("option");
                opt.value = "";
                opt.textContent = "No accounts configured - click link below to add";
                select.appendChild(opt);
            } else {
                filtered.forEach(a => {
                    const opt = document.createElement("option");
                    opt.value = a.id;
                    opt.textContent = `${a.institution} - ${a.name} (xxx${a.account_number_suffix})`;
                    select.appendChild(opt);
                });
            }
        };

        populateSelect("txn-acc-select", ["BANK", "CREDIT_CARD"]);
        populateSelect("fd-acc-select", ["FIXED_DEPOSIT", "BANK"]);
        populateSelect("trade-acc-select", ["STOCK", "MUTUAL_FUND"]);
        populateSelect("gold-acc-select", ["GOLD"]);
        populateSelect("pf-acc-select", ["PROVIDENT_FUND"]);
        populateSelect("re-acc-select", ["REAL_ESTATE"]);
        populateSelect("ins-acc-select", ["INSURANCE"]);
    } catch (e) {
        console.error(e);
    }
}

function openManualTxnModal() {
    refreshAccountSelects();
    document.getElementById("txn-date").value = new Date().toISOString().substring(0, 10);
    openModal("manual-txn-modal");
}

function openManualFDModal() {
    refreshAccountSelects();
    document.getElementById("fd-dep-date").value = new Date().toISOString().substring(0, 10);
    openModal("manual-fd-modal");
}

function openManualTradeModal() {
    refreshAccountSelects();
    document.getElementById("trade-date").value = new Date().toISOString().substring(0, 10);
    openModal("manual-trade-modal");
}

function openManualGoldModal() {
    refreshAccountSelects();
    openModal("manual-gold-modal");
}

function openManualPFModal() {
    refreshAccountSelects();
    document.getElementById("pf-date").value = new Date().toISOString().substring(0, 10);
    openModal("manual-pf-modal");
}

function openManualRealEstateModal() {
    refreshAccountSelects();
    openModal("manual-realestate-modal");
}

function openManualInsuranceModal() {
    refreshAccountSelects();
    document.getElementById("ins-due").value = new Date().toISOString().substring(0, 10);
    openModal("manual-insurance-modal");
}

async function saveManualTxn(e) {
    e.preventDefault();
    const accSelect = document.getElementById("txn-acc-select");
    if (!accSelect.value) {
        alert("Please select or create an account first.");
        return;
    }
    const payload = {
        account_id: parseInt(accSelect.value),
        date: document.getElementById("txn-date").value,
        description: document.getElementById("txn-desc").value.trim(),
        reference_no: document.getElementById("txn-ref").value.trim() || null,
        debit: parseFloat(document.getElementById("txn-debit").value) || 0.0,
        credit: parseFloat(document.getElementById("txn-credit").value) || 0.0,
        category: document.getElementById("txn-cat").value
    };

    try {
        const res = await fetch(`${API_BASE}/transactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const details = await res.json();
            throw new Error(details.detail || "Failed to save transaction.");
        }
        closeModal('manual-txn-modal');
        document.getElementById("form-add-txn").reset();
        await refreshAllData();
    } catch (err) {
        alert(err.message);
    }
}

async function saveManualFD(e) {
    e.preventDefault();
    const accSelect = document.getElementById("fd-acc-select");
    if (!accSelect.value) {
        alert("Please select a bank account first.");
        return;
    }
    const payload = {
        account_id: parseInt(accSelect.value),
        fd_number: document.getElementById("fd-number").value.trim(),
        principal_amount: parseFloat(document.getElementById("fd-principal").value),
        maturity_amount: parseFloat(document.getElementById("fd-maturity-amt").value),
        interest_rate: parseFloat(document.getElementById("fd-rate").value),
        deposit_date: document.getElementById("fd-dep-date").value,
        maturity_date: document.getElementById("fd-mat-date").value,
        status: document.getElementById("fd-status").value
    };

    try {
        const res = await fetch(`${API_BASE}/fixed-deposits`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const details = await res.json();
            throw new Error(details.detail || "Failed to save Fixed Deposit.");
        }
        closeModal('manual-fd-modal');
        document.getElementById("form-add-fd").reset();
        await refreshAllData();
    } catch (err) {
        alert(err.message);
    }
}

async function saveManualTrade(e) {
    e.preventDefault();
    const accSelect = document.getElementById("trade-acc-select");
    if (!accSelect.value) {
        alert("Please select a portfolio account first.");
        return;
    }
    const qty = parseFloat(document.getElementById("trade-qty").value);
    const price = parseFloat(document.getElementById("trade-price").value);
    let total = parseFloat(document.getElementById("trade-total").value);
    if (isNaN(total) || total <= 0) {
        total = qty * price;
    }

    const payload = {
        account_id: parseInt(accSelect.value),
        asset_name: document.getElementById("trade-name").value.trim().toUpperCase(),
        symbol_or_code: document.getElementById("trade-symbol").value.trim().toUpperCase(),
        date: document.getElementById("trade-date").value,
        transaction_type: document.getElementById("trade-type").value,
        quantity: qty,
        price_per_unit: price,
        total_amount: total
    };

    try {
        const res = await fetch(`${API_BASE}/investments/trade`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const details = await res.json();
            throw new Error(details.detail || "Failed to save investment trade.");
        }
        closeModal('manual-trade-modal');
        document.getElementById("form-add-trade").reset();
        await refreshAllData();
    } catch (err) {
        alert(err.message);
    }
}

async function saveManualGold(e) {
    e.preventDefault();
    const accSelect = document.getElementById("gold-acc-select");
    if (!accSelect.value) {
        alert("Please select a Gold storage account first.");
        return;
    }
    const payload = {
        account_id: parseInt(accSelect.value),
        gold_type: document.getElementById("gold-type").value,
        weight_grams: parseFloat(document.getElementById("gold-weight").value),
        purity_carats: parseInt(document.getElementById("gold-purity").value),
        invested_amount: parseFloat(document.getElementById("gold-invested").value),
        current_price_per_gram: parseFloat(document.getElementById("gold-rate").value)
    };

    try {
        const res = await fetch(`${API_BASE}/gold`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to save gold asset details.");
        closeModal('manual-gold-modal');
        document.getElementById("form-add-gold").reset();
        await refreshAllData();
    } catch (err) {
        alert(err.message);
    }
}

async function saveManualPF(e) {
    e.preventDefault();
    const accSelect = document.getElementById("pf-acc-select");
    if (!accSelect.value) {
        alert("Please select a Provident Fund account first.");
        return;
    }
    const payload = {
        account_id: parseInt(accSelect.value),
        pf_type: document.getElementById("pf-type").value,
        current_balance: parseFloat(document.getElementById("pf-balance").value),
        monthly_contribution: parseFloat(document.getElementById("pf-contrib").value) || 0.0,
        interest_rate: parseFloat(document.getElementById("pf-rate").value) || 0.0,
        last_updated_date: document.getElementById("pf-date").value
    };

    try {
        const res = await fetch(`${API_BASE}/provident-funds`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to save PF details.");
        closeModal('manual-pf-modal');
        document.getElementById("form-add-pf").reset();
        await refreshAllData();
    } catch (err) {
        alert(err.message);
    }
}

async function saveManualRealEstate(e) {
    e.preventDefault();
    const accSelect = document.getElementById("re-acc-select");
    if (!accSelect.value) {
        alert("Please select a Property account first.");
        return;
    }
    const payload = {
        account_id: parseInt(accSelect.value),
        property_name: document.getElementById("re-name").value.trim(),
        purchase_price: parseFloat(document.getElementById("re-purchase").value),
        current_estimated_value: parseFloat(document.getElementById("re-valuation").value),
        associated_loan_amount: parseFloat(document.getElementById("re-loan").value) || 0.0,
        monthly_rental_income: parseFloat(document.getElementById("re-rent").value) || 0.0,
        status: document.getElementById("re-status").value
    };

    try {
        const res = await fetch(`${API_BASE}/real-estate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to save real estate property details.");
        closeModal('manual-realestate-modal');
        document.getElementById("form-add-re").reset();
        await refreshAllData();
    } catch (err) {
        alert(err.message);
    }
}

async function saveManualInsurance(e) {
    e.preventDefault();
    const accSelect = document.getElementById("ins-acc-select");
    if (!accSelect.value) {
        alert("Please select an Insurance profile first.");
        return;
    }
    const payload = {
        account_id: parseInt(accSelect.value),
        policy_number: document.getElementById("ins-number").value.trim(),
        policy_name: document.getElementById("ins-name").value.trim(),
        policy_type: document.getElementById("ins-type").value,
        sum_assured: parseFloat(document.getElementById("ins-cover").value),
        premium_amount: parseFloat(document.getElementById("ins-premium").value),
        premium_frequency: document.getElementById("ins-freq").value,
        due_date: document.getElementById("ins-due").value,
        maturity_date: document.getElementById("ins-maturity").value || null,
        status: document.getElementById("ins-status").value
    };

    try {
        const res = await fetch(`${API_BASE}/insurance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to save insurance policy details.");
        closeModal('manual-insurance-modal');
        document.getElementById("form-add-insurance").reset();
        await refreshAllData();
    } catch (err) {
        alert(err.message);
    }
}

// ----------------- FORMATTING UTILITIES -----------------

function formatINR(amount) {
    const amt = parseFloat(amount) || 0.0;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(amt);
}

function formatDateLabel(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Helper to serialize objects safely (prevents prototype issues)
function jsonStringify(obj) {
    return JSON.stringify(obj);
}
