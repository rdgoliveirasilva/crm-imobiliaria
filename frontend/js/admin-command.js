/* Admin-only command center. Reuses existing APIs and maintenance dialogs. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const num = value => Number(value) || 0;
    const fmt = value => num(value).toLocaleString('pt-BR');
    const pct = (value,total) => total > 0 ? Math.min(100, Math.round(value / total * 100)) : 0;
    const sum = values => (values || []).reduce((a,v) => a + num(v),0);
    const date = value => value ? new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}) : 'Não disponível';
    const labels = {sem_qualificacao:'Sem qualificação',mensagem_enviada:'Mensagem enviada',follow_up:'Follow up',agendado:'Agendado',em_atendimento:'Em atendimento',retornar_depois:'Retornar depois',vendido:'Vendido',sem_interesse:'Sem interesse',sem_resposta:'Sem resposta',telefone_invalido:'Telefone inválido'};
    const colors = ['#21c7ed','#21dda8','#aa7cf7','#ffc568','#f47793','#689bd7','#7f8cae','#43b6a3'];
    const state = { view:'geral', wallets:[], users:[], summary:[], kpis:null, graphs:null, search:'', filter:'todas', drawer:null, page:1, busy:null, serial:0, charts:[], healthPeriod:'', healthFrom:'', healthTo:'', healthData:null, healthRequest:0, userAttention:false, hubPage:1, attentionOpen:false, inactivePage:1, inactiveOpen:false, teamPage:1, activity:null, activityRequest:0 };
    let actions = {}, previousFocus, contactTimer;
    const panel = (title,sub,body,cls='') => `<section class="cc-panel ${cls}"><header><div><h2>${title}</h2><p>${sub}</p></div></header>${body}</section>`;
    const empty = text => `<p class="cc-empty">${text}</p>`;
    const metric = (title,value,desc,icon='chart-simple',action='') => `<${action?'button type="button"':'article'} class="cc-metric ${action?'cc-metric-action':''}" ${action}><i class="fas fa-${icon}" aria-hidden="true"></i><div><span>${title}</span><strong>${value}</strong><small>${desc}</small></div>${action?'<i class="fas fa-arrow-up-right-from-square cc-metric-arrow" aria-hidden="true"></i>':''}</${action?'button':'article'}>`;
    function walletNumbers(c) {
        const worked = c.trabalhados === undefined ? sum((c.corretores || []).map(x=>x.qualificou)) : num(c.trabalhados);
        const total = num(c.total);
        return {total,worked,pending:Math.max(0,total-worked),progress:pct(worked,total)};
    }
    function userNumbers(u) {
        const c = state.kpis?.porCorretor?.find(c=>c.id===u.id);
        const total = num(c?.total ?? u.total_leads);
        const qualified = num(c?.qualificados);
        return {total,qualified,rate:pct(qualified,total),wallets:state.wallets.filter(w=>(w.corretores||[]).some(c=>c.id===u.id))};
    }
    function chart(id,data) {
        const canvas=$(id); if (!canvas || !window.Chart || !data) return;
        state.charts.filter(c=>c.ccId===id).forEach(c=>c.destroy()); state.charts=state.charts.filter(c=>c.ccId!==id);
        const theme=getComputedStyle(document.documentElement);
        const token=(name,fallback)=>theme.getPropertyValue(name).trim()||fallback;
        state.charts.push(new Chart(canvas,{type:'line',data:{labels:data.labels||[],datasets:[['Primeiras qualificações','qualificados',token('--theme-chart-green','#21dda8')],['Descartados','descartados',token('--theme-chart-red','#f47793')],['Requalificações','requalificados',token('--theme-chart-purple','#aa7cf7')]].map(([label,key,color])=>({label,data:data[key]||[],borderColor:color,backgroundColor:color+'16',fill:true,tension:.35,pointRadius:0,pointHoverRadius:4,pointHitRadius:16,borderWidth:2}))},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false,axis:'x'},animation:window.matchMedia('(prefers-reduced-motion: reduce)').matches?false:{duration:200},plugins:{tooltip:{enabled:true,mode:'index',intersect:false,backgroundColor:token('--theme-surface','#0b1e3d'),titleColor:token('--theme-text','#f8faff'),bodyColor:token('--theme-text','#f8faff'),borderColor:token('--theme-border','#35547c'),borderWidth:1,padding:12,callbacks:{title:items=>items.length?'Dia '+items[0].label:'',label:item=>item.dataset.label+': '+fmt(item.parsed.y)}},legend:{position:'bottom',labels:{color:token('--theme-muted','#a9bddb'),boxWidth:8,usePointStyle:true,font:{size:10}}}},scales:{x:{ticks:{color:token('--theme-muted','#a9bddb'),maxTicksLimit:7,maxRotation:0},grid:{display:false}},y:{beginAtZero:true,ticks:{color:token('--theme-muted','#a9bddb'),precision:0},grid:{color:token('--theme-chart-grid','#ffffff0b')}}}}}));
        state.charts.at(-1).ccId=id;
    }
    function destroyCharts() { state.charts.filter(c=>c.ccId!=='ccDrawerChart').forEach(c=>c.destroy()); state.charts=state.charts.filter(c=>c.ccId==='ccDrawerChart'); }
    const tagStyles = {
        sem_qualificacao:['#69a2df','hourglass-half'], follow_up:['#24b8ed','rotate'],
        mensagem_enviada:['#23dba5','comment-dots'], telefone_invalido:['#eab952','phone-slash'],
        sem_interesse:['#ec758d','ban'], sem_resposta:['#8ba2c5','phone'],
        em_atendimento:['#23cba5','headset'], retornar_depois:['#aa83ed','clock'],
        agendado:['#57bded','calendar-check'], vendido:['#59d399','circle-check']
    };
    function tags(donut, scope='') {
        if (!donut?.valores?.length) return empty('Nenhuma qualificação registrada.');
        const order=Object.keys(tagStyles);
        const items=donut.valores.map((value,i)=>({value:num(value),key:donut.chaves[i],label:donut.labels[i]}))
            .sort((a,b)=>(order.indexOf(a.key)<0?99:order.indexOf(a.key))-(order.indexOf(b.key)<0?99:order.indexOf(b.key)));
        const total=sum(items.map(i=>i.value));
        const worked=total-sum(items.filter(i=>i.key==='sem_qualificacao').map(i=>i.value));
        const style=key=>tagStyles[key]||['#8ba2c5','circle'];
        return `<div class="cc-health-summary"><span>${fmt(total)} contatos na seleção</span><strong>${pct(worked,total)}% da base trabalhada</strong></div>
            <div class="cc-health-bar" aria-hidden="true">${items.map(i=>`<span style="flex:${i.value};background:${style(i.key)[0]}" title="${esc(i.label)}: ${fmt(i.value)}"></span>`).join('')}</div>
            <p class="cc-health-hint">Selecione uma qualificação para ver os clientes <span aria-hidden="true">→</span></p>
            <div class="cc-health-flow" role="group" aria-label="Distribuição por qualificação"><div class="cc-tags">${items.map(i=>`<button type="button" class="cc-tag" data-tag="${esc(i.key)}" data-scope="${scope}" style="--tag:${style(i.key)[0]}" aria-label="${esc(i.label)}: ${fmt(i.value)} clientes"><i class="fas fa-${style(i.key)[1]}" aria-hidden="true"></i><span>${esc(i.label)}</span><strong>${fmt(i.value)}</strong><small>${pct(i.value,total)}% da base</small></button>`).join('')}</div></div>`;
    }
    function withoutRecentAccess(u) {
        const last=state.summary.find(c=>c.id===u.id)?.ultimo_acesso;
        return u.ativo!==false&&u.tipo!=='teste'&&(!last||Date.now()-new Date(last).getTime()>3*86400000);
    }
    function healthFilter() {
        return `<form id="ccHealthFilter" class="cc-health-filter"><label>Período <select id="ccHealthPeriod"><option value="">Geral</option><option value="custom" ${state.healthPeriod?'selected':''}>Personalizado</option></select></label><div class="cc-health-dates" ${state.healthPeriod?'':'hidden'}><label>De <input id="ccHealthFrom" type="date" required ${state.healthPeriod?'':'disabled'} value="${esc(state.healthFrom)}"></label><label>Até <input id="ccHealthTo" type="date" required ${state.healthPeriod?'':'disabled'} value="${esc(state.healthTo)}"></label><button type="submit">Aplicar</button></div></form>`;
    }
    async function filterHealth(value, de='', ate='') {
        if(value && (!de || !ate || de > ate))return;
        state.healthPeriod=value;state.healthFrom=de;state.healthTo=ate;
        const request=++state.healthRequest;
        state.healthData=null;
        if($('ccHealth'))$('ccHealth').innerHTML=empty('Carregando qualificações…');
        try {
            const data=value?await ApiClient.get('/api/admin/dashboard/graficos?de='+encodeURIComponent(de)+'&ate='+encodeURIComponent(ate)):state.graphs;
            if(request!==state.healthRequest)return;
            state.healthData=data.donut;
            if($('ccHealth'))$('ccHealth').innerHTML=tags(state.healthData);
        }catch{if(request===state.healthRequest&&$('ccHealth'))$('ccHealth').innerHTML=empty('Não foi possível carregar. Aplique o período novamente para tentar.');}
    }
    function liveTeam() {
        const list=state.summary.filter(c=>c.tipo!=='teste');
        return `<div class="cc-live-caption"><span class="cc-live-indicator" aria-hidden="true"></span> Monitoramento ao vivo <small>Atualização a cada minuto</small></div>`+ (list.map(c=>{
            const status=['online','ausente'].includes(c.status)?c.status:'offline';
            return `<button class="cc-person cc-live-person" data-presence="${status}" data-user="${c.id}" aria-label="Ver ${esc(c.nome)}, ${status}"><span class="cc-avatar">${esc(c.nome.split(' ').map(x=>x[0]).slice(0,2).join(''))}<i class="cc-presence-dot" aria-hidden="true"></i></span><span><strong>${esc(c.nome)}</strong><small class="cc-presence-label">${status==='online'?'Online':status==='ausente'?'Ausente':'Offline'}</small><small class="cc-last-access">Último acesso: ${esc(c.ultimo_acesso?date(c.ultimo_acesso):'Nunca acessou')}</small></span><span class="cc-person-progress"><b>${pct(c.total_qualificados,c.total_carteira)}%</b><progress value="${num(c.total_qualificados)}" max="${Math.max(1,num(c.total_carteira))}"></progress><small>${fmt(c.total_qualificados)} / ${fmt(c.total_carteira)} trabalhados</small></span></button>`;
        }).join('') || empty('Nenhum corretor ativo.'));
    }
    function attentionItems() {
        if(!state.kpis)return [];
        return [
            {key:'wallets',icon:'triangle-exclamation',title:'Carteiras com baixo progresso',description:'Menos de 20% da base trabalhada',count:state.wallets.filter(c=>{const n=walletNumbers(c);return !c.inativa_manual&&n.total>0&&n.progress<20;}).length},
            {key:'users',icon:'user-clock',title:'Equipe sem acesso recente',description:'Sem acesso há 3 dias ou nunca acessou',count:state.users.filter(withoutRecentAccess).length},
            {key:'returns',icon:'clock',title:'Clientes com retorno combinado',description:'Classificação atual · sem análise de atraso',count:num(state.kpis.porTag?.retornar_depois)}
        ].filter(item=>item.count>0);
    }
    function alerts() {
        const items=attentionItems();
        return items.length?items.map(item=>`<button type="button" class="cc-alert" ${item.key==='returns'?'data-tag="retornar_depois" data-global="true"':`data-attention="${item.key}"`}><i class="fas fa-${item.icon}" aria-hidden="true"></i><span><strong>${item.title}</strong><small>${item.description}</small></span><b>${fmt(item.count)}</b><span aria-hidden="true">→</span></button>`).join(''):'<div class="cc-attention-empty"><i class="fas fa-circle-check" aria-hidden="true"></i><p>Nenhum item de atenção nos indicadores acompanhados.</p></div>';
    }
    function updateAttention(available=true) {
        const button=$('ccAttentionToggle');if(!button)return;
        const items=attentionItems();
        const status=!available||!state.kpis?'unknown':items.length?'warning':'clear';
        const label=status==='unknown'?'Alertas indisponíveis. Aguarde a atualização.':items.length?`Atenção do gestor: ${items.length} categorias com pendências`:'Atenção do gestor: nenhum item de atenção';
        button.dataset.status=status;button.disabled=status==='unknown';button.title=label;button.setAttribute('aria-label',label);
        if($('ccAttentionContent'))$('ccAttentionContent').innerHTML=alerts();
    }
    function inactiveWallet(w) { const n=walletNumbers(w);return w.inativa_manual===true||(n.total>0&&n.pending===0); }
    function walletHubs() {
        return walletHub(true,'active')+`<details class="cc-inactive-wallets" id="ccInactiveWallets" ${state.inactiveOpen?'open':''}><summary>Carteiras inativas · ${state.wallets.filter(inactiveWallet).length}</summary>${walletHub(true,'inactive')}</details>`;
    }
    function walletHub(cards=true,group='active') {
        let list=state.wallets.filter(w=>inactiveWallet(w)===(group==='inactive')&&w.nome.toLocaleLowerCase().includes(state.search.toLocaleLowerCase()));
        if(state.filter==='atencao')list=list.filter(w=>{const n=walletNumbers(w);return !w.inativa_manual&&n.total>0&&n.progress<20;});
        const total=list.length,pageSize=6,pages=Math.max(1,Math.ceil(total/pageSize)),key=group==='inactive'?'inactivePage':'hubPage';
        state[key]=Math.max(1,Math.min(state[key],pages));const current=state[key],start=(current-1)*pageSize;
        list=list.slice(start,start+pageSize);
        const pagination=`<nav class="cc-pagination cc-hub-pagination" aria-label="Paginação de carteiras ${group==='inactive'?'inativas':'ativas'}"><span>${total?start+1:0}–${Math.min(start+pageSize,total)} de ${total} carteiras</span><div><button data-hub-group="${group}" data-hub-page="${current-1}" ${current===1?'disabled':''} aria-label="Página anterior">‹</button><strong>${current} / ${pages}</strong><button data-hub-group="${group}" data-hub-page="${current+1}" ${current===pages?'disabled':''} aria-label="Próxima página">›</button></div></nav>`;
        const tools=group==='active'?`<div class="cc-tools"><label class="cc-search"><i class="fas fa-search"></i><input id="ccSearch" placeholder="Buscar carteira..." value="${esc(state.search)}" aria-label="Buscar carteira"></label><select id="ccWalletFilter" aria-label="Situação das carteiras"><option value="todas" ${state.filter==='todas'?'selected':''}>Todas</option><option value="atencao" ${state.filter==='atencao'?'selected':''}>Atenção</option></select><button data-nav="categorias" title="Gerenciar categorias" aria-label="Gerenciar categorias"><i class="fas fa-tags"></i></button><button data-upload-mode="nova" title="Nova carteira" aria-label="Nova carteira">＋</button><button data-upload-mode="atualizar" title="Atualizar carteira existente" aria-label="Atualizar carteira existente"><i class="fas fa-rotate"></i></button></div>`:'';
        const body=`<div class="cc-wallet-grid">${list.map((w,i)=>{const n=walletNumbers(w);return `<div class="cc-wallet-shell"><button class="cc-wallet" data-wallet="${w.lista_id}" style="--wallet:${colors[i%3]}"><div class="cc-wallet-title"><i class="fas fa-folder"></i><span><strong>${esc(w.nome)}</strong><small>${w.inativa_manual?'Inativada pelo gestor · oculta dos corretores':inactiveWallet(w)?'Concluída · visível aos corretores':`${fmt(n.total)} contatos`}</small></span><b>→</b></div><div class="cc-wallet-body"><div class="cc-ring" style="--progress:${n.progress}%"><div><strong>${n.progress}%</strong><small>Trabalhado</small></div></div><dl><div><dt>Trabalhados</dt><dd>${fmt(n.worked)}</dd></div><div><dt>Pendentes</dt><dd>${fmt(n.pending)}</dd></div><div><dt>Total</dt><dd>${fmt(n.total)}</dd></div></dl></div></button><button class="cc-wallet-activity" data-wallet-activity="${w.lista_id}">${w.inativa_manual?'Reativar visibilidade':'Inativar carteira'}</button></div>`;}).join('')}</div>`;
        return `<section class="cc-panel cc-hub"><header><div><h2><i class="fas fa-folder-open"></i> Carteiras ${group==='inactive'?'inativas':'ativas'}</h2><p>${group==='inactive'?'Concluídas ou inativadas manualmente.':'Selecione uma carteira para equipe, contatos e evolução.'}</p></div>${tools}</header>${list.length?body:empty('Nenhuma carteira encontrada.')}${pagination}</section>`;
    }
    function renderHub() { $('ccHubMount').innerHTML=walletHubs(); }
    const duration = value => value===null||value===undefined?'—':`${Math.floor(Math.round(value)/60)} min ${Math.round(value)%60} s`;
    async function loadActivity(page=1) {
        const request=++state.activityRequest;
        try { const data=await ApiClient.get('/api/admin/equipe/atividade?pagina='+page);if(request!==state.activityRequest)return;state.activity=data;if(state.view==='corretor')renderActivity(); }
        catch{if(request===state.activityRequest&&$('ccActivity'))$('ccActivity').innerHTML=empty('Não foi possível carregar os indicadores.')+'<button data-call-page="1">Tentar novamente</button>';}
    }
    function renderActivity() {
        if(!$('ccActivity'))return;const a=state.activity;
        if(!a){$('ccActivity').innerHTML=empty('Carregando indicadores…');return;}
        $('ccActivity').innerHTML=`<div class="cc-team-top">${panel('Log de ligações',`${fmt(a.totalLigacoes)} cliques · últimos 30 dias`, `<div class="cc-call-counts">${a.porCorretor.map(u=>`<span>${esc(u.corretor_nome)} <b>${fmt(u.cliques)}</b></span>`).join('')||'Nenhum clique registrado.'}</div><div class="cc-table-scroll"><table class="cc-table"><thead><tr><th>Corretor / contato</th><th>Data</th><th>Intervalo</th><th>Encerramento</th></tr></thead><tbody>${a.log.map(l=>`<tr><td>${esc(l.corretor_nome)}<small>${esc(l.contato_nome)}</small></td><td>${esc(date(l.criado_em))}</td><td>${duration(l.segundos===null?null:Number(l.segundos))}</td><td>${esc(({whatsapp:'WhatsApp',qualificacao:'Qualificação',substituida:'Nova ligação'})[l.encerramento]||'Sem encerramento')}</td></tr>`).join('')}</tbody></table></div><nav class="cc-pagination"><button data-call-page="${a.pagina-1}" ${a.pagina===1?'disabled':''}>‹</button><span>${a.pagina} / ${a.paginas}</span><button data-call-page="${a.pagina+1}" ${a.pagina===a.paginas?'disabled':''}>›</button></nav>`)}${panel('Ritmo de atendimento','Últimos 30 dias · somente registros reais',`<div class="cc-activity-metrics"><article><strong>${a.mediaContatosDia===null?'—':a.mediaContatosDia.toLocaleString('pt-BR',{maximumFractionDigits:1})}</strong><span>Contatos por corretor / dia com atividade</span><small>Clientes únicos acionados por ligação ou WhatsApp.</small></article><article><strong>${duration(a.mediaRequalificacaoSegundos)}</strong><span>Entre requalificações de clientes diferentes</span><small>Mesmo corretor e mesmo dia · ${fmt(a.amostrasRequalificacao)} intervalos.</small></article><article><strong>${duration(a.mediaLigacaoSegundos)}</strong><span>Do clique em Ligar à próxima qualificação ou WhatsApp</span><small>${fmt(a.ligacoesFinalizadas)} intervalos encerrados. Não mede chamada atendida.</small></article></div>`)}</div>`;
    }
    function teamTable() {
        const list=state.users.filter(u=>!state.userAttention||withoutRecentAccess(u)),pages=Math.max(1,Math.ceil(list.length/10));state.teamPage=Math.max(1,Math.min(state.teamPage,pages));
        return `${state.userAttention?'<div class="cc-filter-notice">Sem acesso há 3 dias ou nunca acessou <button data-clear-user-filter>Mostrar todos</button></div>':''}<div class="cc-table-scroll"><table class="cc-table"><thead><tr><th>Corretor</th><th>Status</th><th>Carteiras¹</th><th>Qualificados²</th><th>Requalificações</th><th>Desempenho²</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>${list.slice((state.teamPage-1)*10,state.teamPage*10).map(u=>{const n=userNumbers(u),summary=state.summary.find(c=>c.id===u.id);return `<tr><td><button class="cc-name" data-user="${u.id}">${esc(u.nome)}</button>${u.tipo==='teste'?'<small>Usuário de teste</small>':''}</td><td><span class="cc-status ${u.ativo===false?'off':''}">${u.ativo===false?'Inativo':'Ativo'}</span></td><td>${n.wallets.length}</td><td>${u.tipo==='teste'?'—':fmt(n.qualified)}</td><td title="Não fornecido pela API atual">—</td><td>${u.tipo==='teste'?'—':n.rate+'%'}<progress value="${n.qualified}" max="${Math.max(1,n.total)}"></progress></td><td>${esc(date(summary?.ultimo_acesso))}</td><td><div class="cc-row-actions"><button data-edit="${u.id}" aria-label="Editar ${esc(u.nome)}"><i class="fas fa-pen"></i></button><button data-active="${u.id}">${u.ativo===false?'Ativar':'Inativar'}</button><button data-access="${u.id}" aria-label="Acesso de ${esc(u.nome)}"><i class="fas fa-key"></i></button></div></td></tr>`;}).join('')}</tbody></table></div><nav class="cc-pagination"><button data-team-page="${state.teamPage-1}" ${state.teamPage===1?'disabled':''} aria-label="Página anterior de corretores">‹</button><span>${state.teamPage} / ${pages} · ${list.length} corretores</span><button data-team-page="${state.teamPage+1}" ${state.teamPage===pages?'disabled':''} aria-label="Próxima página de corretores">›</button></nav><p class="cc-footnote">¹ Carteiras com clientes atribuídos, não vínculos vazios. ² Estado atual qualificado / base do corretor. Requalificações individuais e acesso de inativos não são fornecidos pelas APIs atuais.</p>`;
    }
    function render() {
        if(!state.kpis) return;
        destroyCharts();
        const k=state.kpis,g=state.graphs,worked=num(k.qualificados),total=num(k.totalContatos),pending=Math.max(0,total-worked),rate=pct(worked,total);
        let metrics,content;
        if(state.view==='geral') {
            metrics=metric('Base total',fmt(total),'Sem usuários de teste','users','data-view="carteira"')+metric('Trabalhados',fmt(worked),`${rate}% com qualificação`,'circle-check','data-health-jump="true"')+metric('Pendentes',fmt(pending),'Sem qualificação atribuída','hourglass-half','data-tag="sem_qualificacao" data-global="true"')+metric('Em atendimento',fmt(k.porTag?.em_atendimento),'Classificação atual','headset','data-tag="em_atendimento" data-global="true"');
            content=`<div class="cc-bento cc-operation-row"><section class="cc-panel cc-health" aria-labelledby="ccHealthTitle"><header><div><h2 id="ccHealthTitle">Saúde da operação</h2><p>Classificações atuais · período pela data da última classificação</p></div>${healthFilter()}</header><div id="ccHealth">${state.healthPeriod?(state.healthData?tags(state.healthData):empty('Carregando qualificações…')):tags(g.donut)}</div></section>${panel('Equipe em tempo real','Presença estimada pelo último acesso · atualização a cada minuto',liveTeam(),'cc-live')}</div>${panel('Evolução de qualificações','Últimos 30 dias · eventos registrados','<div class="cc-chart"><canvas id="ccTrend"></canvas></div>','cc-evolution cc-evolution-wide')}`;
        } else if(state.view==='carteira') {
            metrics=metric('Carteiras',fmt(state.wallets.length),'Listas cadastradas','folder')+metric('Contatos na base',fmt(total),'Sem usuários de teste','users')+metric('Trabalhados',fmt(worked),`${rate}% da base`,'circle-check')+metric('Pendentes',fmt(pending),'Sem qualificação atribuída','hourglass-half');
            content=`<div id="ccHubMount">${walletHubs()}</div>`;
        } else {
            const q=sum(g.linha.qualificados),r=sum(g.linha.requalificados);
            metrics=metric('Corretores ativos',fmt(state.users.filter(u=>u.ativo!==false&&u.tipo!=='teste').length),'Sem usuários de teste','users')+metric('Primeiras qualificações',fmt(q),'Eventos nos últimos 30 dias','circle-check')+metric('Requalificações',fmt(r),'Eventos nos últimos 30 dias','rotate')+metric('Taxa de qualificação',`${pct(sum((k.porCorretor||[]).map(c=>c.qualificados)),total)}%`,'Estado qualificado / base atual','bullseye');
            content=`<div id="ccActivity"></div><section class="cc-panel"><header><div><h2>Manutenção de corretores</h2><p>Gerencie acessos, carteiras e desempenho.</p></div><div class="cc-tools"><button class="cc-primary" data-new-user>＋ Novo corretor</button></div></header>${teamTable()}</section>`;
        }
        $('ccContent').innerHTML=`<div class="cc-metrics">${metrics}</div>${content}`;
        document.querySelectorAll('.cc-tabs [data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.view);b.setAttribute('aria-selected',String(b.dataset.view===state.view));});
        chart('ccTrend',g.linha);
        if(state.view==='corretor')renderActivity();
        updateAttention();
    }
    function close() {
        state.serial++; state.drawer=null; clearTimeout(contactTimer);
        state.charts.filter(c=>c.ccId==='ccDrawerChart').forEach(c=>c.destroy());state.charts=state.charts.filter(c=>c.ccId!=='ccDrawerChart');
        $('ccOverlay').hidden=true; document.body.classList.remove('cc-drawer-open');
        $('ccDrawerContent').innerHTML='';
        previousFocus?.focus();
    }
    async function open(type,id,tab='geral') {
        if(!state.drawer) previousFocus=document.activeElement;
        state.drawer={type,id,tab}; state.page=1;
        const item=type==='wallet'?state.wallets.find(w=>w.lista_id===id):state.users.find(u=>u.id===id);
        if(!item) return;
        $('ccOverlay').hidden=false;document.body.classList.add('cc-drawer-open');
        $('ccDrawerTitle').textContent=item.nome;
        $('ccDrawerSubtitle').textContent=type==='wallet'?`${fmt(item.total)} contatos · base sem teste`:`${item.ativo===false?'Inativo':'Ativo'} · ${item.tipo==='teste'?'Usuário de teste':'Corretor'}`;
        const tabs=type==='wallet'?[['geral','Visão geral'],['equipe','Equipe'],['contatos','Contatos'],['atividades','Atividades']]:[['geral','Visão geral'],['qualificacoes','Qualificações'],['requalificacoes','Requalificações'],['acesso','Acesso']];
        $('ccDrawerTabs').innerHTML=tabs.map(([key,label])=>`<button role="tab" aria-selected="${key===tab}" class="${key===tab?'active':''}" data-drawer-tab="${key}">${label}</button>`).join('');
        $('ccDrawerClose').focus();
        await renderDrawer();
    }
    async function renderDrawer() {
        const current=state.drawer;if(!current)return;
        state.charts.filter(c=>c.ccId==='ccDrawerChart').forEach(c=>c.destroy());state.charts=state.charts.filter(c=>c.ccId!=='ccDrawerChart');
        const request=++state.serial,body=$('ccDrawerContent');
        body.innerHTML=empty('Carregando detalhes…');
        try {
            if(current.type==='wallet') {
                const w=state.wallets.find(w=>w.lista_id===current.id),n=walletNumbers(w);
                if(current.tab==='contatos') {body.innerHTML=`<label class="cc-search"><i class="fas fa-search"></i><input id="ccContactSearch" placeholder="Nome ou telefone" aria-label="Buscar contatos"></label><div id="ccContacts"></div>`;await contacts(1);return;}
                if(current.tab==='equipe') {
                    const data=await ApiClient.get(`/api/admin/listas/${w.lista_id}/corretores`);if(request!==state.serial)return;
                    body.innerHTML=panel('Equipe da carteira','Participantes atuais e contatos atribuídos',data.corretores.filter(c=>c.participa||c.total_na_lista>0).map(c=>`<div class="cc-team-detail"><strong>${esc(c.nome)}</strong><small>${c.participa?'Participante':'Possui clientes · fora da distribuição'}</small><p>${fmt(c.qualificados_na_lista)} trabalhados / ${fmt(c.total_na_lista)} contatos</p><progress value="${num(c.qualificados_na_lista)}" max="${Math.max(1,num(c.total_na_lista))}"></progress></div>`).join('')||empty('Sem participantes.'))+`<button data-manage-wallet="${w.lista_id}">Gerenciar corretores e carteira →</button>`;return;
                }
                const g=await ApiClient.get(`/api/admin/dashboard/graficos?lista_id=${w.lista_id}`);if(request!==state.serial)return;
                if(current.tab==='atividades') {
                    body.innerHTML=panel('Atividade diária','Eventos de qualificação dos últimos 30 dias',`<div class="cc-table-scroll"><table class="cc-table"><thead><tr><th>Dia</th><th>Primeiras</th><th>Descartados</th><th>Requalificações</th></tr></thead><tbody>${g.linha.labels.map((d,i)=>`<tr><td>${esc(d)}</td><td>${fmt(g.linha.qualificados[i])}</td><td>${fmt(g.linha.descartados[i])}</td><td>${fmt(g.linha.requalificados?.[i])}</td></tr>`).reverse().join('')}</tbody></table></div>`);return;
                }
                body.innerHTML=panel('Progresso da carteira',`${fmt(n.worked)} trabalhados de ${fmt(n.total)} contatos`,`<div class="cc-drawer-progress"><strong>${n.progress}%</strong><progress value="${n.worked}" max="${Math.max(1,n.total)}"></progress></div>${tags(g.donut,'wallet')}`)+panel('Desempenho individual','Clientes qualificados ou descartados / recebidos',(w.corretores||[]).map(c=>`<div class="cc-team-detail"><strong>${esc(c.nome)}</strong><p>${fmt(c.qualificou)} / ${fmt(c.recebeu)} · ${pct(c.qualificou,c.recebeu)}%</p><progress value="${num(c.qualificou)}" max="${Math.max(1,num(c.recebeu))}"></progress></div>`).join('')||empty('Sem clientes atribuídos.'))+panel('Evolução da carteira','Últimos 30 dias','<div class="cc-chart"><canvas id="ccDrawerChart"></canvas></div>');chart('ccDrawerChart',g.linha);
            } else {
                const u=state.users.find(u=>u.id===current.id),n=userNumbers(u),summary=state.summary.find(c=>c.id===u.id);
                if(current.tab==='requalificacoes') {body.innerHTML=empty('O total e o histórico de requalificações individuais não estão disponíveis na API atual. Nenhuma estimativa foi aplicada.');return;}
                if(current.tab==='acesso') {
                    body.innerHTML=panel('Acesso e manutenção','Configurações existentes do usuário',`<dl class="cc-access"><dt>Status</dt><dd>${u.ativo===false?'Inativo':'Ativo'}</dd><dt>Tipo de acesso</dt><dd>${esc(u.tipo)}</dd><dt>Usuário</dt><dd>${esc(u.usuario)}</dd><dt>Cadastrado em</dt><dd>${esc(date(u.criado_em))}</dd><dt>Último acesso</dt><dd>${esc(date(summary?.ultimo_acesso))}</dd></dl><div class="cc-tools"><button data-edit="${u.id}">Editar dados e tipo de acesso</button><button data-active="${u.id}">${u.ativo===false?'Ativar':'Inativar'}</button></div><p class="cc-footnote">As permissões disponíveis são as do cadastro existente. Não há permissões granulares nesta versão.</p>`);return;
                }
                const g=await ApiClient.get(`/api/admin/dashboard/graficos?corretor_id=${u.id}`);if(request!==state.serial)return;
                body.innerHTML=(current.tab==='geral'?`<div class="cc-drawer-metrics">${metric('Qualificados',u.tipo==='teste'?'—':fmt(n.qualified),'Estado atual')}${metric('Taxa',u.tipo==='teste'?'—':n.rate+'%','Qualificados / base')}</div>`:'')+panel('Qualificações atuais','Clique para consultar os clientes',u.tipo==='teste'?empty('Usuários de teste são excluídos desta consulta pela API.'):tags(g.donut,'user'))+(current.tab==='geral'?panel('Carteiras com clientes atribuídos','Abra uma carteira para consultar a equipe',n.wallets.map(w=>`<button class="cc-person" data-wallet="${w.lista_id}"><i class="fas fa-folder"></i>${esc(w.nome)} →</button>`).join('')||empty('Nenhuma carteira com clientes.')):'');
            }
        } catch(error) {if(request===state.serial)body.innerHTML=`${empty('Não foi possível carregar os detalhes.')}<button data-retry-drawer> Tentar novamente</button>`;}
    }
    async function contacts(page) {
        const request=++state.serial,id=state.drawer?.id,search=$('ccContactSearch')?.value||'';
        $('ccContacts').innerHTML=empty('Carregando contatos…');
        try {const data=await ApiClient.get(`/api/admin/listas/${id}/contatos?`+new URLSearchParams({pagina:page,busca:search}));if(request!==state.serial)return;
            state.page=data.pagina;
            $('ccContacts').innerHTML=`<p class="cc-footnote">${fmt(data.total)} contatos · inclui usuários de teste quando presentes na lista</p>${data.contatos.map(c=>`<article class="cc-contact"><strong>${esc(c.nome)}</strong><a href="tel:${esc(String(c.telefone||'').replace(/[^+\d]/g,''))}">${esc(c.telefone)}</a><small>${esc(c.corretor_nome||'Sem responsável')} · ${esc(labels[c.resultado]||c.status)}</small></article>`).join('')||empty('Nenhum contato encontrado.')}<nav class="cc-pagination" aria-label="Páginas de contatos"><button data-page="${data.pagina-1}" ${data.pagina<=1?'disabled':''}>‹ Anterior</button><span>${data.pagina} / ${data.paginas}</span><button data-page="${data.pagina+1}" ${data.pagina>=data.paginas?'disabled':''}>Próxima ›</button></nav><button data-manage-wallet="${id}">Abrir manutenção dos contatos</button>`;
        } catch(error){if(request===state.serial)$('ccContacts').innerHTML=empty('Falha ao carregar contatos. Use a busca novamente para tentar.');}
    }
    async function refresh({background=false}={}) {
        if(background&&(document.hidden||state.drawer||state.attentionOpen||document.activeElement?.closest?.('#ccRoot input, #ccRoot select, .modal-overlay, #ccNewUser, .theme-control')))return;
        if(state.busy)return state.busy;
        state.busy=(async()=>{try {
            const [kpis,graphs,data,users]=await Promise.all([ApiClient.get('/api/admin/dashboard'),ApiClient.get('/api/admin/dashboard/graficos'),ApiClient.get('/api/admin/dashboard/carteiras'),ApiClient.get('/api/admin/corretores')]);
            state.kpis=kpis;state.graphs=graphs;state.wallets=data.carteiras||[];state.summary=data.corretoresResumo||[];state.users=users.corretores||[];
            render();if(state.view==='corretor')await loadActivity(state.activity?.pagina||1);if(state.healthPeriod)await filterHealth(state.healthPeriod,state.healthFrom,state.healthTo);
        }catch(error){updateAttention(false);if(!state.kpis)$('ccContent').innerHTML=empty('Não foi possível carregar o painel. Recarregue a página para tentar novamente.');}finally{state.busy=null;}})();
        return state.busy;
    }
    function navigate(tab) {
        close();
        const routes={dashboard:'admin.html',listas:'admin-carteiras.html',corretores:'admin-corretores.html',empreendimentos:'admin-empreendimentos.html'};
        if(routes[tab]) { window.location.assign(routes[tab]+(tab==='listas'&&state.filter==='atencao'?'?atencao=1':tab==='corretores'&&state.userAttention?'?atencao=1':'')); return; }
        document.querySelector(`.nav-tab[data-tab="${tab}"]`)?.click();
    }
    function mount() {
        const dashboard=$('tab-dashboard');if(!dashboard)return;
        const header=document.querySelector('.header-inner');header.insertBefore(document.querySelector('.admin-nav'),document.querySelector('.header-user'));
        const legacy=document.createElement('div');legacy.hidden=true;legacy.id='ccLegacy';while(dashboard.firstChild)legacy.append(dashboard.firstChild);dashboard.append(legacy);
        const root=document.createElement('div');root.id='ccRoot';root.innerHTML=`<div id="ccContent" aria-live="polite">${empty('Carregando operação…')}</div>`;dashboard.prepend(root);
        for(const id of ['tab-listas','tab-corretores']){const panel=$(id),legacy=document.createElement('div');legacy.hidden=true;legacy.id=id+'-legacy';while(panel.firstChild)legacy.append(panel.firstChild);panel.append(legacy);}
        const page=document.body.dataset.adminPage||'dashboard';
        if(new URLSearchParams(window.location.search).get('atencao')==='1'){if(page==='listas')state.filter='atencao';if(page==='corretores')state.userAttention=true;}
        state.view=({dashboard:'geral',listas:'carteira',corretores:'corretor'})[page]||'geral';
        if(page==='listas'||page==='corretores')$('tab-'+page).prepend(root);
        const newUser=document.createElement('dialog');newUser.id='ccNewUser';newUser.className='cc-attention-dialog';newUser.setAttribute('aria-label','Cadastrar corretor');
        newUser.innerHTML='<button type="button" id="ccCloseNewUser" aria-label="Fechar cadastro">×</button>';
        newUser.append($('tab-corretores-legacy').querySelector('.form-card'));document.body.append(newUser);
        $('ccCloseNewUser').onclick=()=>newUser.close();
        document.body.classList.add('cc-ready');

        const overlay=document.createElement('div');overlay.id='ccOverlay';overlay.hidden=true;overlay.innerHTML=`<aside class="cc-drawer" role="dialog" aria-modal="true" aria-labelledby="ccDrawerTitle"><header><div><h2 id="ccDrawerTitle"></h2><p id="ccDrawerSubtitle"></p></div><button id="ccDrawerClose" aria-label="Fechar detalhes">×</button></header><nav id="ccDrawerTabs" role="tablist" aria-label="Detalhes"></nav><div id="ccDrawerContent"></div></aside>`;document.body.append(overlay);
        $('ccDrawerClose').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
        // Mova os controles existentes para preservar listeners, tema e menu da conta.
        const account=document.querySelector('.header-user');
        account.querySelector('.user-info').hidden=true;
        const toolbar=document.createElement('header');toolbar.className='cc-top cc-account-toolbar';
        toolbar.innerHTML='<h1 id="ccPageTitle">'+({dashboard:'Centro de comando',listas:'Carteiras',corretores:'Corretores',empreendimentos:'Empreendimentos'})[page]+'</h1>';
        toolbar.append(account);document.querySelector('.admin-main').prepend(toolbar);
        const attentionButton=document.createElement('button');attentionButton.type='button';attentionButton.id='ccAttentionToggle';
        attentionButton.className='cc-attention-toggle';attentionButton.disabled=true;attentionButton.dataset.status='unknown';
        attentionButton.setAttribute('aria-label','Carregando alertas');attentionButton.setAttribute('aria-haspopup','dialog');attentionButton.setAttribute('aria-controls','ccAttentionDialog');
        attentionButton.innerHTML='<i class="fas fa-bell" aria-hidden="true"></i><span class="cc-attention-dot" aria-hidden="true"></span>';
        account.insertBefore(attentionButton,account.querySelector('.theme-control'));
        const attentionDialog=document.createElement('dialog');attentionDialog.id='ccAttentionDialog';attentionDialog.className='cc-attention-dialog';
        attentionDialog.setAttribute('aria-labelledby','ccAttentionTitle');
        attentionDialog.innerHTML='<header><div><h2 id="ccAttentionTitle">Atenção do gestor</h2><p>Selecione uma pendência para analisar.</p></div><button type="button" id="ccAttentionClose" aria-label="Fechar alertas">×</button></header><div id="ccAttentionContent"></div>';
        document.body.append(attentionDialog);
        attentionButton.addEventListener('click',()=>{updateAttention();state.attentionOpen=true;attentionDialog.showModal();});
        $('ccAttentionClose').addEventListener('click',()=>attentionDialog.close());
        attentionDialog.addEventListener('close',()=>{state.attentionOpen=false;});
        attentionDialog.addEventListener('click',event=>{if(event.target!==attentionDialog)return;const rect=attentionDialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)attentionDialog.close();});

        document.querySelectorAll('button.nav-tab[data-tab]').forEach(tab=>tab.addEventListener('click',()=>{
            $('ccPageTitle').textContent=tab.textContent.trim();
        }));
        document.addEventListener('submit',async e=>{
            if(e.target.id!=='ccHealthFilter')return;e.preventDefault();
            const de=$('ccHealthFrom').value,ate=$('ccHealthTo').value;
            $('ccHealthTo').setCustomValidity(de>ate?'A data final deve ser igual ou posterior à inicial.':'');
            if(!e.target.reportValidity())return;
            await filterHealth('custom',de,ate);
        });
        document.addEventListener('click',async e=>{
            const b=e.target.closest('button');if(!b)return;
            if(b.dataset.healthJump){navigate('dashboard');$('ccHealthPeriod')?.focus();$('ccHealth')?.scrollIntoView({block:'nearest'});}
            if(b.hasAttribute('data-clear-user-filter')){state.userAttention=false;render();}
            if(b.dataset.view){navigate(({geral:'dashboard',carteira:'listas',corretor:'corretores'})[b.dataset.view]);}
            if(b.dataset.wallet)open('wallet',Number(b.dataset.wallet));
            if(b.dataset.user)open('user',Number(b.dataset.user));
            if(b.dataset.drawerTab)open(state.drawer.type,state.drawer.id,b.dataset.drawerTab);
            if(b.hasAttribute('data-retry-drawer'))renderDrawer();
            if(b.dataset.hubPage){state[b.dataset.hubGroup==='inactive'?'inactivePage':'hubPage']=Number(b.dataset.hubPage);renderHub();$('ccHubMount').querySelector('.cc-hub-pagination button:not(:disabled)')?.focus();}
            if(b.hasAttribute('data-new-user')){newUser.showModal();$('novoNome').focus();}
            if(b.dataset.uploadMode){navigate('upload');document.querySelector(`[data-modo-upload="${b.dataset.uploadMode}"]`)?.click();}
            if(b.dataset.teamPage){state.teamPage=Number(b.dataset.teamPage);render();}
            if(b.dataset.callPage)loadActivity(Number(b.dataset.callPage));
            if(b.dataset.walletActivity){
                const wallet=state.wallets.find(w=>w.lista_id===Number(b.dataset.walletActivity));if(!wallet)return;
                if(!window.confirm(wallet.inativa_manual?'Tornar esta carteira visível aos corretores novamente?':'Inativar esta carteira? Ela ficará oculta e indisponível aos corretores.'))return;
                b.disabled=true;
                try{await ApiClient.patch(`/api/admin/listas/${wallet.lista_id}/atividade`,{inativa_manual:!wallet.inativa_manual});await refresh();}
                catch(error){window.alert(error.message);}finally{b.disabled=false;}
            }
            if(b.dataset.page)contacts(Number(b.dataset.page));
            if(b.dataset.edit){const u=state.users.find(u=>u.id===Number(b.dataset.edit));close();actions.editar?.(u);}
            if(b.dataset.active){const u=state.users.find(u=>u.id===Number(b.dataset.active));close();actions.atividade?.(u);}
            if(b.dataset.access)open('user',Number(b.dataset.access),'acesso');
            if(b.dataset.manageWallet){const w=state.wallets.find(w=>w.lista_id===Number(b.dataset.manageWallet));close();actions.lista?.(w);}
            if(b.dataset.nav)navigate(b.dataset.nav);
            if(b.dataset.attention){if(state.attentionOpen){attentionDialog.close();}state.search='';state.hubPage=1;state.userAttention=b.dataset.attention==='users';state.teamPage=1;state.filter=b.dataset.attention==='wallets'?'atencao':'todas';navigate(b.dataset.attention==='wallets'?'listas':'corretores');}
            if(b.dataset.tag){if(state.attentionOpen)attentionDialog.close();const scope=b.dataset.scope;const wallet=scope==='wallet'?state.drawer?.id:'';const user=b.dataset.global?'':scope==='user'?state.drawer?.id:'';close();actions.tag?.(b.dataset.tag,labels[b.dataset.tag]||b.dataset.tag,wallet,user,b.closest('#ccHealth')?{de:state.healthFrom,ate:state.healthTo}:{});}
        });
        document.addEventListener('toggle',e=>{if(e.target.id==='ccInactiveWallets')state.inactiveOpen=e.target.open;},true);
        document.addEventListener('input',e=>{if(e.target.id==='ccSearch'){state.search=e.target.value;state.hubPage=1;state.inactivePage=1;const cursor=e.target.selectionStart;renderHub();$('ccSearch').focus();$('ccSearch').setSelectionRange(cursor,cursor);}if(e.target.id==='ccContactSearch'){clearTimeout(contactTimer);contactTimer=setTimeout(()=>contacts(1),250);}});
        document.addEventListener('change',async e=>{if(e.target.id==='ccWalletFilter'){state.filter=e.target.value;state.hubPage=1;renderHub();}if(e.target.id==='ccHealthPeriod'){
                if(!e.target.value){await filterHealth('');render();}
                else{document.querySelector('.cc-health-dates').hidden=false;$('ccHealthFrom').disabled=false;$('ccHealthTo').disabled=false;$('ccHealthFrom').focus();}
            }
            if(['ccHealthFrom','ccHealthTo'].includes(e.target.id))$('ccHealthTo').setCustomValidity('');});
        document.addEventListener('keydown',e=>{if(!state.drawer)return;if(e.key==='Escape'){close();return;}if(e.key==='Tab'){const items=Array.from(overlay.querySelectorAll('button:not(:disabled),input,a[href],select')).filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    }
    window.addEventListener('prospect:themechange',()=>{
        const tokens=getComputedStyle(document.documentElement);
        const palette=['--theme-chart-green','--theme-chart-red','--theme-chart-purple'].map(k=>tokens.getPropertyValue(k).trim());
        for(const c of state.charts){
            c.data.datasets.forEach((d,i)=>{d.borderColor=palette[i];d.backgroundColor=palette[i]+'16';});
            const muted=tokens.getPropertyValue('--theme-muted').trim();
            c.options.plugins.legend.labels.color=muted;
            Object.assign(c.options.plugins.tooltip,{backgroundColor:tokens.getPropertyValue('--theme-surface').trim(),titleColor:tokens.getPropertyValue('--theme-text').trim(),bodyColor:tokens.getPropertyValue('--theme-text').trim(),borderColor:tokens.getPropertyValue('--theme-border').trim()});
            c.options.scales.x.ticks.color=muted;c.options.scales.y.ticks.color=muted;
            c.options.scales.y.grid.color=tokens.getPropertyValue('--theme-chart-grid').trim();c.update('none');
        }
    });
    window.addEventListener('prospect:charts-ready',()=>{if(state.kpis)render();});
    window.AdminCommand={connect(value){actions=value;},refresh,close};
    document.addEventListener('DOMContentLoaded',mount);
})();
