// ================================================================
//  apparence/apparence.js
//  Gestion des thèmes visuels — sauvegarde dans localStorage
// ================================================================

(function () {

    const STORAGE_KEY  = 'appTheme';
    const STORAGE_OPTS = 'appOptions';
    const THEMES       = ['classique', 'dark', 'vert'];

    // ── Appliquer un thème ────────────────────────────────────
    window.applyTheme = function (name) {
        if (!THEMES.includes(name)) name = 'classique';
        document.body.classList.remove('theme-dark', 'theme-vert');
        if (name === 'dark') document.body.classList.add('theme-dark');
        if (name === 'vert') document.body.classList.add('theme-vert');
        localStorage.setItem(STORAGE_KEY, name);
        updateThemeUI(name);
    };

    // ── Mettre à jour les cartes de sélection ────────────────
    function updateThemeUI(activeName) {
        THEMES.forEach(function (name) {
            var card  = document.querySelector('.theme-option-card[data-theme="' + name + '"]');
            var check = document.getElementById('check-' + name);
            if (!card || !check) return;
            if (name === activeName) {
                card.classList.add('selected');
                check.classList.add('visible');
            } else {
                card.classList.remove('selected');
                check.classList.remove('visible');
            }
        });
    }

    // ── Options d'affichage ───────────────────────────────────
    function loadOptions() {
        try { return JSON.parse(localStorage.getItem(STORAGE_OPTS)) || {}; } catch (e) { return {}; }
    }

    function saveOptions(opts) {
        localStorage.setItem(STORAGE_OPTS, JSON.stringify(opts));
    }

    function applyOption(key, value) {
        if (key === 'fontsize') {
            document.body.style.fontSize = value ? '15px' : '';
        }
        if (key === 'noanimation') {
            var existing = document.getElementById('no-anim-style');
            if (value) {
                if (!existing) {
                    var style = document.createElement('style');
                    style.id = 'no-anim-style';
                    style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
                    document.head.appendChild(style);
                }
            } else {
                if (existing) existing.remove();
            }
        }
    }

    function applyAllOptions() {
        var opts = loadOptions();
        Object.keys(opts).forEach(function (k) { applyOption(k, opts[k]); });
    }

    function updateToggleUI(key, value) {
        var toggle = document.getElementById('toggle-' + key);
        if (!toggle) return;
        if (value) toggle.classList.add('on');
        else toggle.classList.remove('on');
    }

    function initToggleUI() {
        var opts = loadOptions();
        ['fontsize', 'noanimation'].forEach(function (key) {
            updateToggleUI(key, !!opts[key]);
        });
    }

    // ── Exposer toggleAppOption ───────────────────────────────
    window.toggleAppOption = function (key, toggleEl) {
        var opts = loadOptions();
        var newVal = !opts[key];
        opts[key] = newVal;
        saveOptions(opts);
        applyOption(key, newVal);
        if (newVal) toggleEl.classList.add('on');
        else toggleEl.classList.remove('on');
    };

    // ── Init au chargement ────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        var savedTheme = localStorage.getItem(STORAGE_KEY) || 'classique';
        window.applyTheme(savedTheme);
        applyAllOptions();

        // Rafraîchir l'UI de l'onglet quand il est ouvert
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.tab-button');
            if (btn && btn.getAttribute('data-tab') === 'apparence') {
                setTimeout(function () {
                    updateThemeUI(localStorage.getItem(STORAGE_KEY) || 'classique');
                    initToggleUI();
                }, 50);
            }
        });
    });

})();