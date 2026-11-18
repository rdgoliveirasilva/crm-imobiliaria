/* Eventos de uso, não gravação de áudio nem confirmação de chamada atendida. */
window.ContatoEvents = (() => {
    let queue = Promise.resolve();
    function record(tipo, leadId) {
        if (!Number.isSafeInteger(Number(leadId)) || !crypto.randomUUID) return Promise.resolve();
        const evento = { evento_id:crypto.randomUUID(), lead_id:Number(leadId), tipo };
        queue = queue.then(async () => {
            const response = await fetch('/api/corretor/eventos-contato', { method:'POST', keepalive:true,
                headers:{'Content-Type':'application/json', Authorization:`Bearer ${AuthSession.getItem('sr_token')}`},
                body:JSON.stringify(evento), signal:AbortSignal.timeout(6000) });
            if (!response.ok) throw Error('Evento não registrado');
        }).catch(() => { console.warn('Não foi possível registrar um evento de contato.'); });
        return queue;
    }
    return { record };
})();
