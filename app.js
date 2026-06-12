(function () {
  'use strict';

  var idsInput = document.getElementById('ids');
  var hint = document.getElementById('hint');
  var actionBtn = document.getElementById('action-btn');
  var actionBtnLabel = document.getElementById('action-btn-label');
  var previewSingle = document.getElementById('preview-single');
  var previewMulti = document.getElementById('preview-multi');
  var previewEmpty = document.getElementById('preview-empty');
  var multiCount = document.getElementById('multi-count');
  var previewThumbs = document.getElementById('preview-thumbs');
  var canvas = document.getElementById('qr-canvas');
  var labelSizeInput = document.getElementById('label-size');
  var labelSizeValue = document.getElementById('label-size-value');
  var labelToggle = document.getElementById('label-toggle');

  var debounceTimer = null;
  var labelFontSize = parseInt(labelSizeInput.value, 10);
  var labelEnabled = labelToggle.checked;

  // Embed mode: ?id=<base64url-encoded asset id> renders just the styled
  // QR code (frame + corner cut, no label, no surrounding UI), suitable
  // for use in an <iframe> or similar embed.
  var embedParam = new URLSearchParams(window.location.search).get('id');
  var embedId = embedParam ? decodeBase64Url(embedParam) : null;
  var isEmbed = !!embedId;
  if (isEmbed) {
    document.body.classList.add('embed-mode');
    labelEnabled = false;
    idsInput.value = embedId;
  }

  /**
   * Decodes a base64url string (RFC 4648 §5, no padding) into a UTF-8
   * text string. Returns null if the input isn't valid base64.
   */
  function decodeBase64Url(value) {
    try {
      var base64 = value.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      var binary = atob(base64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return null;
    }
  }

  // Theme handling (auto / light / dark)
  var THEME_KEY = 'qr-generator-theme';
  var LOGO_LIGHT = 'assets/logo-light.png';
  var LOGO_DARK = 'assets/logo-dark.png';
  var logoImg = document.getElementById('logo-img');
  var themeButtons = document.querySelectorAll('.theme-switch__btn');
  var darkSchemeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function effectiveTheme(mode) {
    if (mode === 'auto') {
      return darkSchemeQuery && !darkSchemeQuery.matches ? 'light' : 'dark';
    }
    return mode;
  }

  function applyTheme(mode) {
    var theme = effectiveTheme(mode);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme-mode', mode);
    logoImg.src = theme === 'light' ? LOGO_LIGHT : LOGO_DARK;
    themeButtons.forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.themeOption === mode);
    });
  }

  themeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.dataset.themeOption;
      localStorage.setItem(THEME_KEY, mode);
      applyTheme(mode);
    });
  });

  if (darkSchemeQuery) {
    darkSchemeQuery.addEventListener('change', function () {
      if ((localStorage.getItem(THEME_KEY) || 'auto') === 'auto') {
        applyTheme('auto');
      }
    });
  }

  applyTheme(localStorage.getItem(THEME_KEY) || 'auto');

  function getIds() {
    return idsInput.value
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return line.length > 0; });
  }

  // Marking layout, expressed in module sizes
  var MODULE_PX = 8; // 1 module size, in pixels
  var FRAME_MODULES = 1; // thin black border at the very outside
  var QUIET_ZONE_MODULES = 4; // white space between the frame and the QR code
  var CORNER_CUT_MODULES = 6; // bottom-right orientation corner cut
  var LABEL_PADDING = 12;
  var MAX_THUMBS = 8; // number of live QR thumbnails shown in multi-mode

  /**
   * Draws a QR code with a thin black outer frame, a white quiet zone
   * between the frame and the code, and a bottom-right orientation
   * corner cut, all sized in module units.
   */
  function drawStyledQr(targetCanvas, text) {
    var qr = qrcode(0, 'H');
    qr.addData(text);
    qr.make();

    var count = qr.getModuleCount();
    var cell = MODULE_PX;
    var frame = FRAME_MODULES * cell;
    var quietZone = QUIET_ZONE_MODULES * cell;
    var cornerCut = CORNER_CUT_MODULES * cell;
    var inset = frame + quietZone;

    var qrSize = count * cell;
    var markSize = qrSize + inset * 2;
    var width = markSize;

    var labelFont = labelFontSize + 'px sans-serif';
    var labelLineHeight = Math.round(labelFontSize * 1.25);

    // Measure how many lines the full asset id needs, using a throwaway
    // context sized to the final width.
    targetCanvas.width = width;
    targetCanvas.height = markSize;
    var ctx = targetCanvas.getContext('2d');

    var lines = [];
    var labelHeight = 0;
    if (labelEnabled) {
      ctx.font = labelFont;
      lines = wrapText(ctx, text, width - quietZone * 2);
      labelHeight = lines.length * labelLineHeight + LABEL_PADDING * 2;
    }

    var height = markSize + labelHeight;
    targetCanvas.width = width;
    targetCanvas.height = height;

    // Resizing the canvas resets its context state, but `ctx` remains a
    // valid reference to it.

    // Background (quiet zone, QR area, label area)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Thin black outer frame (1 module ring)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, markSize, markSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(frame, frame, markSize - frame * 2, markSize - frame * 2);

    // QR modules
    ctx.fillStyle = '#000000';
    for (var row = 0; row < count; row += 1) {
      for (var col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) {
          var x = inset + col * cell;
          var y = inset + row * cell;
          ctx.fillRect(x, y, cell, cell);
        }
      }
    }

    // Bottom-right orientation corner cut (6 modules)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(markSize, markSize);
    ctx.lineTo(markSize - cornerCut, markSize);
    ctx.lineTo(markSize, markSize - cornerCut);
    ctx.closePath();
    ctx.fill();

    // Label with the full asset id, wrapped across multiple lines
    if (labelEnabled) {
      ctx.fillStyle = '#4b5563';
      ctx.font = labelFont;
      ctx.textAlign = 'center';
      var firstBaseline = markSize + LABEL_PADDING + labelLineHeight * 0.75;
      for (var i = 0; i < lines.length; i += 1) {
        ctx.fillText(lines[i], width / 2, firstBaseline + i * labelLineHeight);
      }
    }
  }

  /**
   * Wraps text to fit within maxWidth, breaking on whitespace where
   * possible and falling back to character-level breaks for long
   * unbroken tokens (e.g. URLs/URNs without spaces).
   */
  function wrapText(ctx, text, maxWidth) {
    var lines = [];
    var words = text.split(/\s+/).filter(function (w) { return w.length > 0; });
    if (words.length === 0) {
      return [''];
    }

    var current = '';
    words.forEach(function (word) {
      var candidate = current ? current + ' ' + word : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
        return;
      }

      if (current) {
        lines.push(current);
        current = '';
      }

      // Break the word itself if it's wider than the available space
      while (ctx.measureText(word).width > maxWidth && word.length > 1) {
        var lo = 1;
        var hi = word.length;
        while (lo < hi) {
          var mid = Math.ceil((lo + hi) / 2);
          if (ctx.measureText(word.slice(0, mid)).width <= maxWidth) {
            lo = mid;
          } else {
            hi = mid - 1;
          }
        }
        lines.push(word.slice(0, lo));
        word = word.slice(lo);
      }
      current = word;
    });

    if (current) {
      lines.push(current);
    }

    return lines;
  }

  function canvasToBlob(targetCanvas) {
    return new Promise(function (resolve) {
      targetCanvas.toBlob(function (blob) {
        resolve(blob);
      }, 'image/png');
    });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function sanitizeFilename(text, index) {
    var safe = text
      .replace(/^[a-z]+:\/\//i, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60);
    if (!safe) {
      safe = 'asset-' + (index + 1);
    }
    return safe + '.png';
  }

  function updatePreview() {
    var ids = getIds();

    previewSingle.classList.add('hidden');
    previewMulti.classList.add('hidden');
    previewEmpty.classList.add('hidden');

    if (ids.length === 0) {
      previewEmpty.classList.remove('hidden');
      hint.textContent = 'Enter at least one asset ID to get started.';
      actionBtn.disabled = true;
      actionBtnLabel.textContent = 'Generate';
      return;
    }

    if (ids.length === 1) {
      drawStyledQr(canvas, ids[0]);
      previewSingle.classList.remove('hidden');
      hint.textContent = '1 asset ID entered.';
      actionBtn.disabled = false;
      actionBtnLabel.textContent = 'Download PNG';
      return;
    }

    multiCount.textContent = ids.length + ' asset IDs entered.';
    renderThumbnails(ids);
    previewMulti.classList.remove('hidden');
    hint.textContent = ids.length + ' asset IDs entered.';
    actionBtn.disabled = false;
    actionBtnLabel.textContent = 'Generate & Download (' + ids.length + ')';
  }

  /**
   * Renders a grid of small QR previews for the first IDs, with a
   * "+N more" tile if there are more IDs than fit.
   */
  function renderThumbnails(ids) {
    previewThumbs.innerHTML = '';

    var shown = ids.slice(0, MAX_THUMBS);
    shown.forEach(function (id) {
      var tile = document.createElement('div');
      tile.className = 'preview-thumb';

      var thumbCanvas = document.createElement('canvas');
      drawStyledQr(thumbCanvas, id);
      tile.appendChild(thumbCanvas);

      var label = document.createElement('span');
      label.className = 'preview-thumb__label';
      label.textContent = id;
      label.title = id;
      tile.appendChild(label);

      previewThumbs.appendChild(tile);
    });

    var remaining = ids.length - shown.length;
    if (remaining > 0) {
      var more = document.createElement('div');
      more.className = 'preview-thumb preview-thumb--more';
      more.textContent = '+' + remaining + ' more';
      previewThumbs.appendChild(more);
    }
  }

  function handleAction() {
    var ids = getIds();
    if (ids.length === 0) {
      return;
    }

    if (ids.length === 1) {
      canvasToBlob(canvas).then(function (blob) {
        downloadBlob(blob, sanitizeFilename(ids[0], 0));
      });
      return;
    }

    actionBtn.disabled = true;
    actionBtn.classList.add('is-loading');
    var originalLabel = actionBtnLabel.textContent;
    actionBtnLabel.textContent = 'Generating…';

    var zip = new JSZip();
    var usedNames = {};
    var offscreen = document.createElement('canvas');
    var pdf = null;

    var chain = Promise.resolve();
    ids.forEach(function (id, index) {
      chain = chain.then(function () {
        drawStyledQr(offscreen, id);
        pdf = addCanvasToPdf(pdf, offscreen);
        return canvasToBlob(offscreen).then(function (blob) {
          var name = sanitizeFilename(id, index);
          if (usedNames[name]) {
            usedNames[name] += 1;
            var dot = name.lastIndexOf('.');
            name = name.slice(0, dot) + '-' + usedNames[name] + name.slice(dot);
          } else {
            usedNames[name] = 1;
          }
          zip.file(name, blob);
        });
      });
    });

    chain
      .then(function () {
        zip.file('asset-qr-codes.pdf', pdf.output('blob'));
        zip.file('config.txt', buildConfigText(ids));
        return zip.generateAsync({ type: 'blob' });
      })
      .then(function (zipBlob) {
        downloadBlob(zipBlob, 'asset-qr-codes.zip');
      })
      .finally(function () {
        actionBtn.disabled = false;
        actionBtn.classList.remove('is-loading');
        actionBtnLabel.textContent = originalLabel;
      });
  }

  /**
   * Adds the given canvas as a full-page image, with each PDF page sized
   * to exactly match that canvas's dimensions (no margins/letterboxing).
   * Returns the jsPDF document (created on the first call).
   */
  function addCanvasToPdf(pdf, sourceCanvas) {
    var width = sourceCanvas.width;
    var height = sourceCanvas.height;
    var orientation = width > height ? 'l' : 'p';

    if (!pdf) {
      pdf = new window.jspdf.jsPDF({ unit: 'px', format: [width, height], orientation: orientation });
    } else {
      pdf.addPage([width, height], orientation);
    }

    pdf.addImage(sourceCanvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);
    return pdf;
  }

  /**
   * Builds a plain-text summary of the current generator settings and the
   * list of asset IDs included in the bundle.
   */
  function buildConfigText(ids) {
    var lines = [
      'Asset ID QR Generator - configuration',
      'Generated: ' + new Date().toISOString(),
      '',
      'Module size: ' + MODULE_PX + ' px',
      'Frame border: ' + FRAME_MODULES + ' module(s)',
      'Quiet zone: ' + QUIET_ZONE_MODULES + ' module(s)',
      'Corner cut: ' + CORNER_CUT_MODULES + ' module(s)',
      'Error correction level: H',
      'Label text size: ' + labelFontSize + ' px',
      'Label shown: ' + (labelEnabled ? 'yes' : 'no'),
      '',
      'Asset IDs (' + ids.length + '):',
    ];
    ids.forEach(function (id, index) {
      lines.push((index + 1) + '. ' + id);
    });
    return lines.join('\n') + '\n';
  }

  idsInput.addEventListener('input', function () {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(updatePreview, 150);
  });

  actionBtn.addEventListener('click', handleAction);

  labelSizeInput.addEventListener('input', function () {
    labelFontSize = parseInt(labelSizeInput.value, 10);
    labelSizeValue.textContent = labelFontSize + 'px';
    updatePreview();
  });

  labelToggle.addEventListener('change', function () {
    labelEnabled = labelToggle.checked;
    updatePreview();
  });

  updatePreview();
})();
