/* =========================================================
   ACOES.JS — Ligar e WhatsApp
   ========================================================= */

const Acoes = (() => {

    /* Detecta se é mobile (onde tel: funciona bem) */
    function ehMobile() {
        return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
            .test(navigator.userAgent);
    }

    /* Normaliza telefone pra formato E.164 do Brasil (+55...) */
    function normalizarTelefone(telefone) {
        let n = telefone.replace(/\D/g, '');
        if (!n) return '';

        // Se vier com DDI 55 já, mantém
        if (n.startsWith('55') && n.length >= 12) return n;

        // Se tiver 13 dígitos (0 + DDD + número), remove o 0 inicial
        if (n.startsWith('0') && n.length === 12) n = n.substring(1);

        // Anexa DDI Brasil
        return '55' + n;
    }

    /**
     * Inicia ligação.
     * Retorna { ok, modo, url } — se modo = 'desktop', abre modal com o número.
     */
    function ligar(telefone) {
        const numero = normalizarTelefone(telefone);
        if (!numero) return { ok: false, erro: 'Telefone inválido.' };

        const url = `tel:+${numero}`;

        if (ehMobile()) {
            window.location.href = url;
            return { ok: true, modo: 'mobile', url };
        }

        // Desktop → devolve o número pro modal
        return { ok: true, modo: 'desktop', numero, url };
    }

    /**
     * Abre WhatsApp com mensagem pronta.
     */
    function abrirWhatsApp(lead, nomeCorretor = 'Corretor') {
        const numero = normalizarTelefone(lead.telefone);
        if (!numero) return { ok: false, erro: 'Telefone inválido.' };

        const primeiroNome = (lead.nome || '').split(' ')[0] || 'cliente';
        const mensagem = `Olá ${primeiroNome}, tudo bem? ` +
                         `Sou ${nomeCorretor} da SR Lançamentos. ` +
                         `Vi que você demonstrou interesse em "${lead.interesse}". ` +
                         `Podemos conversar? 😊`;

        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank');
        return { ok: true, url };
    }

    /**
     * Só retorna a URL de WhatsApp (pra usar em link <a>).
     */
    function linkWhatsApp(lead, nomeCorretor = 'Corretor') {
        const numero = normalizarTelefone(lead.telefone);
        if (!numero) return '#';
        const primeiroNome = (lead.nome || '').split(' ')[0] || 'cliente';
        const mensagem = `Olá ${primeiroNome}, tudo bem? ` +
                         `Sou ${nomeCorretor} da SR Lançamentos. ` +
                         `Vi que você demonstrou interesse em "${lead.interesse}". ` +
                         `Podemos conversar? 😊`;
        return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    }

    function formatarTelefone(tel) {
        const n = tel.replace(/\D/g, '');
        if (n.length === 13) return `+${n.slice(0,2)} (${n.slice(2,4)}) ${n.slice(4,9)}-${n.slice(9)}`;
        if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
        if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
        return tel;
    }

    return { ligar, abrirWhatsApp, linkWhatsApp, formatarTelefone, ehMobile, normalizarTelefone };

})();