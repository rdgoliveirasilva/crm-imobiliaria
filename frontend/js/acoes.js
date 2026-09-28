/* =========================================================
   ACOES.JS — Ligar e WhatsApp
   ========================================================= */

const Acoes = (() => {

    /* Detecta se é mobile */
    function ehMobile() {
        return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
            .test(navigator.userAgent);
    }

    /* Normaliza telefone pra formato E.164 do Brasil (+55...) */
    function normalizarTelefone(telefone) {
        let n = telefone.replace(/\D/g, '');
        if (!n) return '';

        if (n.startsWith('55') && n.length >= 12) return n;
        if (n.startsWith('0') && n.length === 12) n = n.substring(1);

        return '55' + n;
    }

    /**
     * Inicia ligação.
     */
    function ligar(telefone) {
        const numero = normalizarTelefone(telefone);
        if (!numero) return { ok: false, erro: 'Telefone inválido.' };

        const url = `tel:+${numero}`;

        if (ehMobile()) {
            window.location.href = url;
            return { ok: true, modo: 'mobile', url };
        }

        return { ok: true, modo: 'desktop', numero, url };
    }

    /**
     * Monta a mensagem final.
     * - Se o lead veio com `lista_mensagem`, usa ela.
     * - Senão, usa o template padrão.
     * - Substitui as variáveis.
     */
    function montarMensagem(lead, nomeCorretor = 'Corretor') {
        const primeiroNome = (lead.nome || 'cliente').split(' ')[0] || 'cliente';
        const nomeCompleto = lead.nome || 'cliente';

        // Mensagem da lista OU template padrão
        let mensagemBase = lead.lista_mensagem && lead.lista_mensagem.trim()
            ? lead.lista_mensagem
            : 'Olá {nome}, tudo bem? Sou {corretor} da {empresa}. Vi que você demonstrou interesse em "{interesse}". Podemos conversar?';

        // Substitui variáveis
        const mensagemFinal = mensagemBase
            .replace(/\{nome\}/g, primeiroNome)
            .replace(/\{nome_completo\}/g, nomeCompleto)
            .replace(/\{corretor\}/g, nomeCorretor)
            .replace(/\{empresa\}/g, 'SR Lançamentos')
            .replace(/\{interesse\}/g, lead.interesse || 'um imóvel');

        return mensagemFinal;
    }

    /**
     * Abre WhatsApp com a mensagem (personalizada ou padrão).
     */
    function abrirWhatsApp(lead, nomeCorretor = 'Corretor') {
        const numero = normalizarTelefone(lead.telefone);
        if (!numero) return { ok: false, erro: 'Telefone inválido.' };

        const mensagem = montarMensagem(lead, nomeCorretor);
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

        window.open(url, '_blank');
        return { ok: true, url };
    }

    /**
     * Só retorna a URL (pra usar em link <a>).
     */
    function linkWhatsApp(lead, nomeCorretor = 'Corretor') {
        const numero = normalizarTelefone(lead.telefone);
        if (!numero) return '#';
        const mensagem = montarMensagem(lead, nomeCorretor);
        return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    }

    function formatarTelefone(tel) {
        const n = String(tel).replace(/\D/g, '');
        if (n.length === 13) return `+${n.slice(0,2)} (${n.slice(2,4)}) ${n.slice(4,9)}-${n.slice(9)}`;
        if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
        if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
        return tel;
    }

    return {
        ligar,
        abrirWhatsApp,
        linkWhatsApp,
        montarMensagem,
        formatarTelefone,
        ehMobile,
        normalizarTelefone
    };

})();