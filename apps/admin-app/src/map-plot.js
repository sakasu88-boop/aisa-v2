/**
 * マップ画像プレビュー上でクリックし、0–1 正規化座標を取得する。
 * object-fit: contain によるレターボックス内の「実描画領域」を基準にする。
 */

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

/**
 * img が object-fit: contain で収まっているときの、実際に絵が描画されている矩形（ビューポート座標）
 */
function getContainedImageContentRect(img) {
  const rect = img.getBoundingClientRect();
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) {
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  const cw = rect.width;
  const ch = rect.height;
  const scale = Math.min(cw / nw, ch / nh);
  const rw = nw * scale;
  const rh = nh * scale;
  const ox = (cw - rw) / 2;
  const oy = (ch - rh) / 2;

  return {
    left: rect.left + ox,
    top: rect.top + oy,
    width: rw,
    height: rh,
  };
}

export function initMapPlot() {
  const stage = document.getElementById('map-stage');
  const img = document.getElementById('map-image');
  const fallback = document.getElementById('map-fallback');
  const pinLayer = document.getElementById('map-pin-layer');
  const fileInput = document.getElementById('map-file-input');
  const resetBtn = document.getElementById('map-reset');
  const clearPinBtn = document.getElementById('map-clear-pin');
  const coordReadout = document.getElementById('coord-xy');
  const jsonPre = document.getElementById('map-json');
  const copyBtn = document.getElementById('map-copy-json');

  if (!stage || !pinLayer || !jsonPre) {
    return {
      getLastCoords: () => ({ x: null, y: null }),
      getCoordinateSpace: () => 'none',
    };
  }

  let objectUrl = null;
  let pinEl = null;
  let lastCoords = { x: null, y: null, normalized: true };
  let coordSpace = 'placeholder';

  function setJson() {
    const text = JSON.stringify(
      {
        x: lastCoords.x,
        y: lastCoords.y,
        normalized: true,
        coordinateSpace: coordSpace,
        note:
          coordSpace === 'imageContent'
            ? '0–1 は画像の描画矩形（レターボックス除く）に対する相対座標'
            : '0–1 はプレースホルダー領域全体に対する相対座標',
      },
      null,
      2,
    );
    jsonPre.textContent = text;
  }

  function updateReadout() {
    if (coordReadout) {
      coordReadout.textContent =
        lastCoords.x != null && lastCoords.y != null
          ? `X: ${lastCoords.x.toFixed(4)}　Y: ${lastCoords.y.toFixed(4)}`
          : 'X: —　Y: —';
    }
    setJson();
  }

  /** 正規化に使う矩形（ビューポート座標） */
  function getNormalizationRect() {
    if (img && !img.hidden && img.complete && img.naturalWidth > 0) {
      coordSpace = 'imageContent';
      return getContainedImageContentRect(img);
    }
    if (fallback) {
      coordSpace = 'placeholder';
      const r = fallback.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    coordSpace = 'stage';
    const r = stage.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }

  function placePin(clientX, clientY) {
    const norm = getNormalizationRect();
    let nx = (clientX - norm.left) / norm.width;
    let ny = (clientY - norm.top) / norm.height;
    lastCoords.x = clamp01(nx);
    lastCoords.y = clamp01(ny);

    const stageRect = stage.getBoundingClientRect();
    const pinX = (norm.left - stageRect.left) + lastCoords.x * norm.width;
    const pinY = (norm.top - stageRect.top) + lastCoords.y * norm.height;
    const leftPct = (pinX / stageRect.width) * 100;
    const topPct = (pinY / stageRect.height) * 100;

    if (!pinEl) {
      pinEl = document.createElement('span');
      pinEl.className = 'map-pin-marker';
      pinEl.textContent = '📍';
      pinEl.setAttribute('aria-hidden', 'true');
      pinLayer.appendChild(pinEl);
    }

    pinEl.style.left = `${leftPct}%`;
    pinEl.style.top = `${topPct}%`;
    updateReadout();
  }

  function clearPin() {
    lastCoords = { x: null, y: null, normalized: true };
    if (pinEl) {
      pinEl.remove();
      pinEl = null;
    }
    updateReadout();
  }

  stage.addEventListener('click', (e) => {
    if (e.target === fileInput) return;
    placePin(e.clientX, e.clientY);
  });

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file || !img || !fallback) return;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      img.hidden = false;
      fallback.hidden = true;
      clearPin();
    };
    img.onerror = () => {
      img.hidden = true;
      fallback.hidden = false;
    };
    img.src = objectUrl;
  });

  resetBtn?.addEventListener('click', () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    if (fileInput) fileInput.value = '';
    if (img) {
      img.src = '';
      img.hidden = true;
    }
    if (fallback) fallback.hidden = false;
    clearPin();
  });

  clearPinBtn?.addEventListener('click', clearPin);

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(jsonPre.textContent ?? '');
      const t = copyBtn.textContent;
      copyBtn.textContent = 'コピーしました';
      setTimeout(() => {
        copyBtn.textContent = t;
      }, 1600);
    } catch {
      copyBtn.textContent = 'コピー失敗';
      setTimeout(() => {
        copyBtn.textContent = 'JSON をコピー';
      }, 1600);
    }
  });

  updateReadout();

  return {
    getLastCoords: () => ({ x: lastCoords.x, y: lastCoords.y }),
    getCoordinateSpace: () => coordSpace,
  };
}
