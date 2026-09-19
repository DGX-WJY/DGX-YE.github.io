(function () {
    'use strict';

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const toast = $('.toast');
    let toastTimer;

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
    }

    $$('[data-modal]').forEach((button) => {
        button.addEventListener('click', () => {
            const modal = document.getElementById(`${button.dataset.modal}-modal`);
            if (modal && typeof modal.showModal === 'function') modal.showModal();
        });
    });

    const jsonInput = $('[data-json-input]');
    const jsonResult = $('[data-json-result]');
    $$('[data-json-action]').forEach((button) => button.addEventListener('click', () => {
        const action = button.dataset.jsonAction;
        if (action === 'clear') {
            jsonInput.value = '';
            jsonResult.textContent = '等待输入';
            return;
        }
        try {
            const parsed = JSON.parse(jsonInput.value);
            jsonInput.value = action === 'minify' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
            jsonResult.textContent = action === 'minify' ? '已压缩 · JSON 有效' : '已格式化 · JSON 有效';
        } catch (error) {
            jsonResult.textContent = `格式错误 · ${error.message}`;
        }
    }));

    const base64Input = $('[data-base64-input]');
    const base64Output = $('[data-base64-output]');
    $$('[data-base64-action]').forEach((button) => button.addEventListener('click', () => {
        try {
            const value = base64Input.value;
            base64Output.textContent = button.dataset.base64Action === 'encode'
                ? btoa(unescape(encodeURIComponent(value)))
                : decodeURIComponent(escape(atob(value)));
        } catch (error) {
            base64Output.textContent = '无法处理：请检查输入内容';
        }
    }));

    const colorPicker = $('[data-color-picker]');
    const colorHex = $('[data-color-hex]');
    function updateColor(hex) {
        const normalized = hex.replace('#', '');
        if (!/^[0-9a-f]{6}$/i.test(normalized)) return;
        const [r, g, b] = normalized.match(/.{2}/g).map((part) => parseInt(part, 16));
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const lightness = (max + min) / 2;
        const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
        const hue = max === min ? 0 : ((g - b) / (max - min) + (g < b ? 6 : 0)) / 6;
        $('[data-color-rgb]').textContent = `${r}, ${g}, ${b}`;
        $('[data-color-hsl]').textContent = `${Math.round(hue * 360)}°, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%`;
    }
    colorPicker.addEventListener('input', () => { colorHex.value = colorPicker.value.toUpperCase(); updateColor(colorPicker.value); });
    colorHex.addEventListener('input', () => updateColor(colorHex.value));

    $$('.modal').forEach((modal) => modal.addEventListener('close', () => {
        if (modal.id === 'suggestion-modal' && modal.returnValue === 'submit') showToast('建议已记录，感谢你的参与。');
    }));
})();
