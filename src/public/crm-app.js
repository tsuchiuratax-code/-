// === 状態管理 ===
let allClients = [];
let currentClientId = null;

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県',
];

const HEALTH_INSURANCE_LABELS = {
  'kyokai_kenpo': '協会けんぽ',
  'kenpo_kumiai': '健保組合',
  'kokuho_kumiai': '国保組合',
};

// === 初期化 ===
document.addEventListener('DOMContentLoaded', () => {
  initPrefectureSelect();
  loadClients();
});

function initPrefectureSelect() {
  const sel = document.getElementById('f_prefecture');
  for (const p of PREFECTURES) {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    sel.appendChild(opt);
  }
}

// === API ヘルパー ===
async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'エラーが発生しました' }));
    throw new Error(err.error);
  }
  return res.json();
}

// === トースト ===
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// === 顧問先一覧 ===
async function loadClients() {
  const showAll = document.getElementById('showInactive').checked;
  try {
    allClients = await api(`/clients${showAll ? '?all=1' : ''}`);
    renderClients(allClients);
    renderStats(allClients);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function filterClients() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = allClients.filter(c =>
    c.company_name.toLowerCase().includes(q) ||
    (c.representative_name || '').toLowerCase().includes(q)
  );
  renderClients(filtered);
}

function renderStats(clients) {
  const active = clients.filter(c => c.active);
  const totalEmployees = active.reduce((s, c) => s + (c.employee_count || 0), 0);
  const totalFee = active.reduce((s, c) => s + (c.monthly_fee || 0), 0);
  document.getElementById('stats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${active.length}</div><div class="stat-label">有効顧問先</div></div>
    <div class="stat-card"><div class="stat-value">${totalEmployees.toLocaleString()}</div><div class="stat-label">総従業員数</div></div>
    <div class="stat-card"><div class="stat-value">&yen;${totalFee.toLocaleString()}</div><div class="stat-label">月額顧問料合計</div></div>
    <div class="stat-card"><div class="stat-value">${clients.length - active.length}</div><div class="stat-label">無効顧問先</div></div>
  `;
}

function renderClients(clients) {
  const tbody = document.getElementById('clientsTable');
  const empty = document.getElementById('clientsEmpty');

  if (clients.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = clients.map(c => `
    <tr class="${c.active ? '' : 'inactive'}">
      <td><span class="badge ${c.active ? 'badge-active' : 'badge-inactive'}">${c.active ? '有効' : '無効'}</span></td>
      <td><a href="#" onclick="openDetail(${c.id});return false" style="color:#2b6cb0;text-decoration:none;font-weight:500">${esc(c.company_name)}</a></td>
      <td>${esc(c.representative_name || '-')}</td>
      <td>${esc(c.phone || '-')}</td>
      <td>${esc(c.industry || '-')}</td>
      <td>${c.employee_count || '-'}</td>
      <td>${HEALTH_INSURANCE_LABELS[c.health_insurance_type] || '-'}</td>
      <td>${esc(c.prefecture || '-')}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openEditModal(${c.id})">編集</button>
        ${c.active
          ? `<button class="btn btn-sm btn-danger" onclick="toggleActive(${c.id}, false)">無効化</button>`
          : `<button class="btn btn-sm btn-success" onclick="toggleActive(${c.id}, true)">有効化</button>`}
      </td>
    </tr>
  `).join('');
}

// === 新規登録モーダル ===
function openNewClientModal() {
  document.getElementById('modalTitle').textContent = '顧問先を追加';
  document.getElementById('clientId').value = '';
  document.getElementById('clientForm').reset();
  document.getElementById('contactSection').style.display = '';
  document.getElementById('clientModal').classList.add('active');
}

async function openEditModal(id) {
  try {
    const data = await api(`/clients/${id}`);
    document.getElementById('modalTitle').textContent = '顧問先を編集';
    document.getElementById('clientId').value = id;
    document.getElementById('contactSection').style.display = 'none';

    const fields = [
      'company_name','corporate_number','representative_name','industry',
      'employee_count','establishment_date','fiscal_year_end',
      'postal_code','address','phone','fax',
      'contract_start_date','contract_type','monthly_fee',
      'health_insurance_type','prefecture',
      'health_insurance_number','pension_number',
      'employment_insurance_number','workers_comp_number','notes',
    ];
    for (const f of fields) {
      const el = document.getElementById('f_' + f);
      if (el) el.value = data[f] || '';
    }

    document.getElementById('clientModal').classList.add('active');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function closeModal() {
  document.getElementById('clientModal').classList.remove('active');
}

async function saveClient(e) {
  e.preventDefault();
  const id = document.getElementById('clientId').value;
  const data = {};
  const fields = [
    'company_name','corporate_number','representative_name','industry',
    'employee_count','establishment_date','fiscal_year_end',
    'postal_code','address','phone','fax',
    'contract_start_date','contract_type','monthly_fee',
    'health_insurance_type','prefecture',
    'health_insurance_number','pension_number',
    'employment_insurance_number','workers_comp_number','notes',
  ];
  for (const f of fields) {
    const el = document.getElementById('f_' + f);
    if (el) data[f] = el.value;
  }

  // 新規の場合は連絡先も
  if (!id) {
    data.contact_name = document.getElementById('f_contact_name').value;
    data.email = document.getElementById('f_email').value;
  }

  try {
    if (id) {
      await api(`/clients/${id}`, { method: 'PUT', body: data });
      showToast('顧問先を更新しました');
    } else {
      await api('/clients', { method: 'POST', body: data });
      showToast('顧問先を登録しました');
    }
    closeModal();
    loadClients();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function toggleActive(id, activate) {
  const action = activate ? 'activate' : 'deactivate';
  try {
    await api(`/clients/${id}/${action}`, { method: 'POST' });
    showToast(activate ? '有効化しました' : '無効化しました');
    loadClients();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// === 顧問先詳細 ===
async function openDetail(id) {
  currentClientId = id;
  try {
    const data = await api(`/clients/${id}`);
    document.getElementById('detailTitle').textContent = data.company_name;

    // 基本情報
    document.getElementById('detailInfo').innerHTML = renderDetailInfo(data);

    // 連絡先
    renderContacts(data.contacts || []);

    // 履歴・通知
    loadHistory(id);
    loadNotifications(id);

    // 最初のタブをアクティブに
    document.querySelectorAll('#detailModal .tab')[0].click();
    document.getElementById('detailModal').classList.add('active');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('active');
}

function renderDetailInfo(c) {
  const row = (label, value) => value ? `<tr><td style="font-weight:600;width:180px;color:#4a5568">${label}</td><td>${esc(String(value))}</td></tr>` : '';
  return `<table class="data-table" style="max-width:600px">
    ${row('会社名', c.company_name)}
    ${row('法人番号', c.corporate_number)}
    ${row('代表者', c.representative_name)}
    ${row('住所', `${c.postal_code ? '〒' + c.postal_code + ' ' : ''}${c.address || ''}`)}
    ${row('電話番号', c.phone)}
    ${row('FAX', c.fax)}
    ${row('業種', c.industry)}
    ${row('従業員数', c.employee_count ? c.employee_count + '名' : null)}
    ${row('設立', c.establishment_date)}
    ${row('決算月', c.fiscal_year_end)}
    ${row('契約種別', c.contract_type)}
    ${row('契約開始日', c.contract_start_date)}
    ${row('月額顧問料', c.monthly_fee ? '¥' + Number(c.monthly_fee).toLocaleString() : null)}
    ${row('健保種別', HEALTH_INSURANCE_LABELS[c.health_insurance_type])}
    ${row('都道府県', c.prefecture)}
    ${row('健保番号', c.health_insurance_number)}
    ${row('厚年番号', c.pension_number)}
    ${row('雇保番号', c.employment_insurance_number)}
    ${row('労保番号', c.workers_comp_number)}
    ${row('メモ', c.notes)}
  </table>`;
}

// === タブ切り替え ===
function switchTab(tabEl) {
  const tabName = tabEl.dataset.tab;
  tabEl.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');
  tabEl.closest('.modal-body').querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
}

// === 連絡先 ===
function renderContacts(contacts) {
  document.getElementById('contactsTable').innerHTML = contacts.length === 0
    ? '<tr><td colspan="6" style="text-align:center;color:#a0aec0">連絡先が登録されていません</td></tr>'
    : contacts.map(c => `
      <tr>
        <td>${esc(c.contact_name)}${c.is_primary ? ' <span class="badge badge-active">主</span>' : ''}</td>
        <td>${esc(c.department || '-')}</td>
        <td>${esc(c.email)}</td>
        <td>${c.notify_rate_change ? 'ON' : 'OFF'}</td>
        <td>${c.notify_deadline ? 'ON' : 'OFF'}</td>
        <td><button class="btn btn-sm btn-danger" onclick="removeContact(${c.id})">削除</button></td>
      </tr>
    `).join('');
}

function openAddContactForm() {
  document.getElementById('addContactForm').style.display = '';
  document.getElementById('nc_name').value = '';
  document.getElementById('nc_email').value = '';
  document.getElementById('nc_department').value = '';
  document.getElementById('nc_position').value = '';
  document.getElementById('nc_phone').value = '';
}

async function saveNewContact() {
  const name = document.getElementById('nc_name').value.trim();
  const email = document.getElementById('nc_email').value.trim();
  if (!name || !email) { showToast('氏名とメールは必須です', 'error'); return; }

  try {
    await api(`/clients/${currentClientId}/contacts`, {
      method: 'POST',
      body: {
        contact_name: name,
        email,
        department: document.getElementById('nc_department').value,
        position: document.getElementById('nc_position').value,
        phone: document.getElementById('nc_phone').value,
        notify_rate_change: document.getElementById('nc_rate').checked,
        notify_deadline: document.getElementById('nc_deadline').checked,
      },
    });
    document.getElementById('addContactForm').style.display = 'none';
    showToast('連絡先を追加しました');
    // 再読み込み
    const data = await api(`/clients/${currentClientId}`);
    renderContacts(data.contacts || []);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function removeContact(contactId) {
  if (!confirm('この連絡先を削除しますか？')) return;
  try {
    await api(`/contacts/${contactId}`, { method: 'DELETE' });
    showToast('連絡先を削除しました');
    const data = await api(`/clients/${currentClientId}`);
    renderContacts(data.contacts || []);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// === 対応履歴 ===
async function loadHistory(clientId) {
  try {
    const history = await api(`/clients/${clientId}/history`);
    const list = document.getElementById('historyList');
    if (history.length === 0) {
      list.innerHTML = '<li class="empty">対応履歴はありません</li>';
    } else {
      list.innerHTML = history.map(h => `
        <li class="history-item">
          <span class="history-date">${h.created_at}</span>
          <span class="history-badge">${esc(h.action_type)}</span>
          <span><strong>${esc(h.subject)}</strong>${h.detail ? '<br>' + esc(h.detail) : ''}</span>
        </li>
      `).join('');
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function openAddHistoryForm() {
  document.getElementById('addHistoryForm').style.display = '';
  document.getElementById('nh_subject').value = '';
  document.getElementById('nh_detail').value = '';
}

async function saveNewHistory() {
  const subject = document.getElementById('nh_subject').value.trim();
  if (!subject) { showToast('件名は必須です', 'error'); return; }

  try {
    await api(`/clients/${currentClientId}/history`, {
      method: 'POST',
      body: {
        action_type: document.getElementById('nh_type').value,
        subject,
        detail: document.getElementById('nh_detail').value,
      },
    });
    document.getElementById('addHistoryForm').style.display = 'none';
    showToast('履歴を追加しました');
    loadHistory(currentClientId);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// === 通知履歴 ===
async function loadNotifications(clientId) {
  try {
    const logs = await api(`/clients/${clientId}/notifications`);
    const tbody = document.getElementById('notificationsTable');
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#a0aec0">通知履歴はありません</td></tr>';
    } else {
      tbody.innerHTML = logs.map(n => `
        <tr>
          <td>${n.sent_at}</td>
          <td>${esc(n.contact_name || '-')} (${esc(n.email || '-')})</td>
          <td>${esc(n.category)} ${esc(n.rate_name)} ${n.rate_percent}%</td>
          <td><span class="badge ${n.status === 'sent' ? 'badge-active' : 'badge-inactive'}">${n.status === 'sent' ? '送信済' : '失敗'}</span></td>
        </tr>
      `).join('');
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// === 料率一覧 ===
async function loadRates() {
  try {
    const rates = await api('/rates');
    const card = document.getElementById('ratesCard');
    card.style.display = '';
    document.getElementById('ratesTable').innerHTML = rates.map(r => `
      <tr>
        <td>${esc(r.category)}</td>
        <td>${esc(r.rate_name)}</td>
        <td><strong>${r.rate_percent}%</strong></td>
        <td>${r.employer_share != null ? r.employer_share + '%' : '-'}</td>
        <td>${r.employee_share != null ? r.employee_share + '%' : '-'}</td>
        <td>${r.effective_date}</td>
      </tr>
    `).join('');
    card.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// === ユーティリティ ===
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
