const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../frontend/js/corretor-theme.js'), 'utf8');

function fixture(hour, stored = null, storageBlocked = false, adminDesktop = false) {
    let now = new Date(2026, 10, 12, hour, 0, 0);
    const events = {}, dataset = {}, buttons = {}, meta = {};
    const options = { hidden: true, style: {}, setAttribute() {}, showPopover() { this.open = true; }, hidePopover() { this.open = false; }, getBoundingClientRect: () => ({ width: 220, height: 190 }), querySelectorAll: () => Object.values(buttons), querySelector: () => Object.values(buttons).find(b => b.pressed === 'true') };
    const toggle = { getBoundingClientRect: () => ({ left: 270, top: 430, bottom: 470 }), setAttribute() {}, querySelector: () => ({}), focus() {}, addEventListener: (type, fn) => { events['toggle:' + type] = fn; } };
    const control = { contains: target => target === toggle || Object.values(buttons).includes(target), addEventListener: (name, fn) => { events['control:' + name] = fn; } };
    for (const choice of ['auto', 'light', 'dark']) buttons[choice] = { dataset: { themeChoice: choice }, setAttribute(k,v) { this.pressed = v; }, focus() {}, addEventListener: (type, fn) => { events[choice + ':' + type] = fn; } };
    const document = { documentElement: { dataset, classList: { contains: name => adminDesktop && name === "admin-desktop-theme" } }, querySelector: () => meta, querySelectorAll: () => Object.values(buttons),
        getElementById: id => ({ themeToggle: toggle, themeControl: control, themeOptions: options })[id], addEventListener: (name, fn) => { events[name] = fn; } };
    const window = { innerWidth: 320, innerHeight: 500, matchMedia: () => ({ matches: !adminDesktop, addEventListener() {} }), dispatchEvent() {}, addEventListener: (name, fn) => { events[name] = fn; } };
    const localStorage = { getItem() { if (storageBlocked) throw Error(); return stored; }, setItem(key, value) { if (storageBlocked) throw Error(); stored = value; } };
    let timer;
    vm.runInNewContext(source, { document, window, localStorage, CustomEvent: function() {}, Date: class extends Date { constructor(value) { super(value ?? now.getTime()); } }, clearTimeout() {}, setTimeout(fn, delay) { timer = { fn, delay }; } });
    events.DOMContentLoaded();
    return { dataset, events, options, meta, get stored() { return stored; }, get timer() { return timer; }, setHour(hour) { now.setHours(hour); } };
}

test('automático usa claro entre 6h e 18h e agenda a próxima transição', () => {
    for (const [hour, expected] of [[0,'dark'],[5,'dark'],[6,'light'],[17,'light'],[18,'dark'],[23,'dark']]) {
        const f = fixture(hour);
        assert.equal(f.dataset.theme, expected);
        assert.ok(f.timer.delay > 0 && f.timer.delay <= 12 * 3600000 + 50);
    }
    const f = fixture(17); f.setHour(18); f.timer.fn();
    assert.equal(f.dataset.theme, 'dark');
});

test('escolha manual persiste e não é substituída ao mudar o horário', () => {
    const f = fixture(10);
    f.events['dark:click']();
    assert.equal(f.stored, 'dark');
    f.setHour(12); f.events.focus();
    assert.equal(f.dataset.theme, 'dark');
    assert.equal(fixture(12, f.stored).dataset.theme, 'dark');
    f.events['auto:click']();
    assert.equal(f.stored, 'auto');
    assert.equal(f.dataset.theme, 'light');
});

test('toque com focusout nulo não fecha opções antes de selecionar escuro', () => {
    const f = fixture(12);
    f.events['toggle:click']();
    f.events['control:focusout']({ relatedTarget: null });
    assert.equal(f.options.hidden, false);
    f.events['dark:click']();
    assert.equal(f.dataset.themePreference, 'dark');
    assert.equal(f.dataset.theme, 'dark');
    assert.equal(f.stored, 'dark');
    assert.equal(f.options.hidden, true);
});

test('tema funciona com armazenamento bloqueado e sincroniza outras abas', () => {
    const f = fixture(22, null, true);
    f.events['light:click']();
    assert.equal(f.dataset.theme, 'light');
    f.events.storage({ key: 'prospect-theme', newValue: 'dark' });
    assert.equal(f.dataset.theme, 'dark');
    const invalid = fixture(12, 'invalid');
    assert.equal(invalid.dataset.themePreference, 'auto');
});

test('paletas mantêm contraste de texto AA nas superfícies e estados', () => {
    const css = fs.readFileSync(path.join(__dirname, '../../frontend/css/corretor-theme-tokens.css'), 'utf8');
    const blocks = [css.match(/:root\s*\{([^}]+)\}/)[1], css.match(/:root\[data-theme="light"\]\s*\{([^}]+)\}/)[1]];
    const luminance = hex => {
        const values = hex.slice(1).match(/../g).map(n => parseInt(n,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
        return values[0]*.2126 + values[1]*.7152 + values[2]*.0722;
    };
    for (const block of blocks) {
        const colors = Object.fromEntries([...block.matchAll(/--theme-([\w-]+):\s*(#[\da-f]{6})\b/g)].map(m => [m[1],m[2]]));
        const pairs = ['page','surface','card','control'].flatMap(bg => ['text','muted','accent'].map(fg => [fg,bg]));
        pairs.push(...['success','warning','danger','purple'].map(fg => [fg,fg+'-bg']));
        for (const [fg,bg] of pairs) {
            const [a,b] = [luminance(colors[fg]),luminance(colors[bg])].sort((x,y)=>y-x);
            assert.ok((a+.05)/(b+.05) >= 4.5, `${fg} sobre ${bg}: contraste insuficiente`);
        }
    }
});

test('admin desktop inicia automático e conserva escolha manual nos próximos acessos', () => {
    const initial = fixture(12, null, false, true);
    assert.equal(initial.dataset.themePreference, 'auto');
    assert.equal(initial.meta.content, '#f3f6fc');
    initial.events['dark:click']();
    const reopened = fixture(10, initial.stored, false, true);
    assert.equal(reopened.dataset.themePreference, 'dark');
    assert.equal(reopened.dataset.theme, 'dark');
    assert.equal(reopened.meta.content, '#061126');
    reopened.events['auto:click']();
    assert.equal(reopened.dataset.theme, 'light');
    reopened.setHour(20); reopened.events.focus();
    assert.equal(reopened.dataset.theme, 'dark');
    assert.equal(reopened.stored, 'auto');
});

test('seletor do admin abre acima da sidebar sem sair da viewport e fecha ao escolher', () => {
    const f = fixture(12, null, false, true);
    f.events['toggle:click']();
    assert.equal(f.options.open, true);
    assert.equal(f.options.hidden, false);
    assert.equal(f.options.style.left, '88px');
    assert.equal(f.options.style.top, '230px');
    assert.equal(f.options.style.maxWidth, '296px');
    f.events['dark:click']();
    assert.equal(f.options.open, false);
    assert.equal(f.options.hidden, true);
    assert.equal(f.stored, 'dark');
    f.events['toggle:click']();
    f.events['light:click']();
    assert.equal(f.dataset.theme, 'light');
    f.events['toggle:click']();
    f.events['auto:click']();
    assert.equal(f.dataset.themePreference, 'auto');
    assert.equal(f.options.open, false);
});
