const GITHUB_RAW = 'https://raw.githubusercontent.com/fyildirim-debug/DcFyBot/main/.fy/version.json';
const GITHUB_REPO = 'https://github.com/fyildirim-debug/DcFyBot';

async function renderVersions() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/versions');

  try {
    // Yerel ve uzak versiyonu paralel cek
    const [localRes, remoteRes] = await Promise.allSettled([
      API.get('/api/version'),
      fetch(GITHUB_RAW, { cache: 'no-store' }).then(r => r.json())
    ]);

    const local = localRes.status === 'fulfilled' ? localRes.value : {};
    const remote = remoteRes.status === 'fulfilled' ? remoteRes.value : null;

    const localVer = local.version || '?';
    const remoteVer = remote?.version || '?';
    const hasUpdate = remote && remoteVer !== localVer && compareVersions(remoteVer, localVer) > 0;
    const history = remote?.history || [];

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Versiyonlar</h1>
          <p class="page-subtitle">Guncellemeleri kontrol edin</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="renderVersions()">${svgIcon('list')} Yenile</button>
      </div>

      <!-- Versiyon Durumu -->
      <div class="stats-grid" style="grid-template-columns:1fr 1fr 1fr">
        <div class="stat-card">
          <div class="stat-label">Yuklü Versiyon</div>
          <div class="stat-value" style="color:var(--accent)">${localVer}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Son Versiyon (GitHub)</div>
          <div class="stat-value" style="color:${hasUpdate ? 'var(--warning)' : 'var(--success)'}">${remoteVer}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Durum</div>
          <div style="margin-top:8px">
            ${hasUpdate
              ? `<span class="badge badge-warning" style="font-size:12px">Guncelleme Mevcut!</span>`
              : `<span class="badge badge-success" style="font-size:12px">Guncel</span>`
            }
          </div>
        </div>
      </div>

      ${hasUpdate ? `
      <div class="alert alert-warning" style="display:flex;align-items:center;justify-content:space-between">
        <span><strong>v${remoteVer}</strong> mevcut! Guncelleme icin GitHub'a gidin.</span>
        <a href="${GITHUB_REPO}/releases" target="_blank" class="btn btn-primary btn-sm">GitHub'da Guncelle</a>
      </div>
      ` : ''}

      <!-- Versiyon Gecmisi -->
      <div class="section-title">Versiyon Gecmisi</div>
      <div class="card card-flush">
        ${history.length === 0
          ? '<div class="empty-state">Versiyon gecmisi bulunamadi</div>'
          : `<div class="table-wrap" style="max-height:500px;overflow-y:auto">
            ${history.map((h, i) => {
              const isCurrent = h.version === localVer;
              const isLatest = i === 0;
              return `
              <div class="version-item ${isCurrent ? 'version-current' : ''}" style="padding:14px 20px;border-bottom:1px solid var(--border-subtle);display:flex;gap:14px;align-items:flex-start">
                <div style="flex-shrink:0;width:80px">
                  <span class="mono" style="font-size:14px;font-weight:700;color:${isCurrent ? 'var(--accent)' : 'var(--text-heading)'}">${h.version}</span>
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;color:var(--text-primary)">${h.summary}</div>
                  <div class="mono" style="font-size:11px;color:var(--text-muted);margin-top:4px">${h.date}</div>
                </div>
                <div style="flex-shrink:0;display:flex;gap:4px">
                  ${isCurrent ? '<span class="badge badge-success" style="font-size:10px">Yuklu</span>' : ''}
                  ${isLatest ? '<span class="badge badge-info" style="font-size:10px">Son</span>' : ''}
                </div>
              </div>`;
            }).join('')}
          </div>`
        }
      </div>

      <div style="margin-top:16px;text-align:center">
        <a href="${GITHUB_REPO}" target="_blank" class="btn btn-secondary btn-sm">${svgIcon('list')} GitHub Deposu</a>
      </div>
    `;
  } catch(e) {
    document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

// Versiyon karsilastirma: "1.2.4.1" > "1.2.4.0" => 1
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}
