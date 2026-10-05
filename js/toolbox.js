(function () {
  'use strict';

  const workspace = document.querySelector('[data-tool-workspace]');

  function element(name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function buildPanel(tool) {
    const panel = element('section', 'tool-panel');
    panel.id = `tool-${tool.slug}`;
    panel.dataset.tool = tool.slug;
    panel.setAttribute('aria-labelledby', `${tool.slug}-title`);
    const title = element('h2', '', tool.title);
    title.id = `${tool.slug}-title`;
    panel.append(element('p', 'eyebrow', tool.category), title, element('p', '', tool.description));

    if (tool.slug === 'color-converter') {
      const row = element('div', 'color-input-row');
      const picker = element('input');
      picker.type = 'color';
      picker.value = '#c7f36a';
      picker.setAttribute('aria-label', '选择颜色');
      picker.dataset.colorPicker = '';
      const input = element('input');
      input.type = 'text';
      input.value = '#C7F36A';
      input.setAttribute('aria-label', 'HEX 颜色值');
      input.dataset.colorHex = '';
      row.append(picker, input);
      panel.append(row, element('div', 'color-swatches'), element('div', 'color-readouts'), element('p', 'color-message'));
      return panel;
    }

    const input = element('textarea');
    input.dataset.toolInput = '';
    input.setAttribute('aria-label', `${tool.title}输入`);
    input.placeholder = tool.slug === 'json-formatter' ? '{"hello":"world"}' : '输入 UTF-8 文本';
    panel.append(input);
    const actions = element('div', 'tool-panel-actions');
    const actionNames = tool.slug === 'json-formatter'
      ? [['format', '格式化'], ['minify', '压缩'], ['copy', '复制结果']]
      : [['encode', '编码'], ['decode', '解码'], ['copy', '复制结果']];
    actionNames.forEach(([action, label]) => {
      const button = element('button', '', label);
      button.type = 'button';
      button.dataset.action = action;
      actions.append(button);
    });
    panel.append(actions, element('pre', 'tool-output', '结果显示在这里'));
    return panel;
  }

  function showOutput(panel, text, isError) {
    const output = panel.querySelector('.tool-output');
    output.textContent = text;
    output.classList.toggle('tool-error', isError);
    output.setAttribute('role', isError ? 'alert' : 'status');
  }

  function toBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function fromBase64(value) {
    const binary = atob(value.trim());
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  workspace.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const panel = button.closest('[data-tool]');
    const value = panel.querySelector('[data-tool-input]').value;
    const action = button.dataset.action;

    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(panel.querySelector('.tool-output').textContent);
        button.textContent = '已复制';
      } catch (error) {
        console.error('[Toolbox] Could not copy the result.', error);
        showOutput(panel, '复制失败，请检查浏览器剪贴板权限。', true);
      }
      return;
    }

    try {
      const result = panel.dataset.tool === 'json-formatter'
        ? JSON.stringify(JSON.parse(value), null, action === 'minify' ? 0 : 2)
        : action === 'encode' ? toBase64(value) : fromBase64(value);
      showOutput(panel, result, false);
    } catch (error) {
      showOutput(panel, `处理失败：${error.message}`, true);
    }
  });

  function updateColor(value) {
    const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
    if (!match) return false;
    const hex = `#${match[1].toUpperCase()}`;
    const channels = hex.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16));
    const [red, green, blue] = channels;
    const [r, g, b] = channels.map((channel) => channel / 255);
    const maximum = Math.max(r, g, b);
    const minimum = Math.min(r, g, b);
    const difference = maximum - minimum;
    let hue = 0;
    if (difference) {
      if (maximum === r) hue = ((g - b) / difference) % 6;
      else if (maximum === g) hue = (b - r) / difference + 2;
      else hue = (r - g) / difference + 4;
    }
    hue = (hue * 60 + 360) % 360;
    const lightness = (maximum + minimum) / 2;
    const saturation = difference ? difference / (1 - Math.abs(2 * lightness - 1)) : 0;
    const panel = document.querySelector('[data-tool="color-converter"]');
    panel.querySelector('.color-message').textContent = '';
    panel.querySelector('[data-color-hex]').value = hex;
    panel.querySelector('[data-color-picker]').value = hex;
    panel.querySelector('.color-swatches').style.backgroundColor = hex;
    panel.querySelector('.color-readouts').replaceChildren(
      element('span', '', `RGB ${red}, ${green}, ${blue}`),
      element('span', '', `HSL ${Math.round(hue)}°, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%`)
    );
    return true;
  }

  workspace.addEventListener('input', (event) => {
    if (event.target.matches('[data-color-hex]')) {
      if (!updateColor(event.target.value)) {
        event.target.setCustomValidity('请输入 6 位 HEX 颜色值，例如 #C7F36A');
        document.querySelector('[data-tool="color-converter"] .color-message').textContent = '请输入有效的 6 位 HEX 颜色值。';
      } else {
        event.target.setCustomValidity('');
      }
    } else if (event.target.matches('[data-color-picker]')) {
      updateColor(event.target.value);
      const hexInput = document.querySelector('[data-color-hex]');
      hexInput.setCustomValidity('');
    }
  });

  fetch('/data/tools.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((tools) => {
      if (!Array.isArray(tools)) throw new Error('工具目录格式无效');
      tools.forEach((tool) => workspace.append(buildPanel(tool)));
      updateColor('#c7f36a');
    })
    .catch((error) => {
      console.error('[Toolbox] Could not load tool definitions.', error);
      workspace.replaceChildren(element('p', 'empty-state', `工具加载失败：${error.message}`));
    });
})();
