/* Hub administrativo: dados existentes, detalhes somente leitura e edição explícita. */
window.AdminProperties = (() => {
    const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const url = value => { try { const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:''; } catch {return '';} };
    const status = value => ({publicado:'Publicado',rascunho:'Rascunho',arquivado:'Arquivado'})[value]||'Não informado';
    const unique = (items,key) => [...new Set(items.map(e=>e[key]?.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    function filter(items,search,bairro,construtora) {
        const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
        return items.filter(e=>(!bairro||e.bairro?.trim()===bairro)&&(!construtora||e.construtora?.trim()===construtora)&&normalize([e.nome,e.construtora,e.bairro,e.cidade].join(' ')).includes(normalize(search)));
    }
    function totals(items) {return [items.length,unique(items,'construtora').length,unique(items,'bairro').length,items.filter(e=>e.fase==='Entregue').length];}
    function paginate(list, requested=1) {
        const pages=Math.max(1,Math.ceil(list.length/8));
        const page=Math.max(1,Math.min(Number(requested)||1,pages));
        return {page,pages,total:list.length,start:(page-1)*8,items:list.slice((page-1)*8,page*8)};
    }
    let items=[],actions={},mounted=false,drawer,selected=null,previousFocus,currentPage=1,importDialog;
    const $=id=>document.getElementById(id);
    function mount() {
        if(mounted)return;mounted=true;
        const page=$('tab-empreendimentos');
        page.querySelector('.emp-header').hidden=true;page.querySelector('.emp-list-header').hidden=true;
        const importer=page.querySelector('.emp-importer-card');
        const choice=document.createElement('dialog');choice.className='eh-add-dialog';choice.setAttribute('aria-labelledby','ehAddTitle');
        choice.innerHTML='<header><h2 id="ehAddTitle">Adicionar empreendimento</h2><button type="button" data-close aria-label="Fechar">×</button></header><p>Como deseja cadastrar?</p><div class="eh-add-options"><button type="button" id="ehChooseImport"><i class="fab fa-google-drive"></i><strong>Importar</strong><span>Extrair informações dos PDFs do Google Drive.</span></button><button type="button" id="ehChooseManual"><i class="fas fa-pen"></i><strong>Manual</strong><span>Preencher os dados do empreendimento.</span></button></div>';
        importDialog=document.createElement('dialog');importDialog.className='eh-add-dialog eh-import-dialog';importDialog.setAttribute('aria-labelledby','ehImportTitle');
        importDialog.innerHTML='<header><h2 id="ehImportTitle">Importar do Google Drive</h2><button type="button" data-close aria-label="Fechar importação">×</button></header>';
        importDialog.append(importer);importer.querySelector('.card-header').hidden=true;$('btnNovoEmpreendimento').hidden=true;
        document.body.append(choice,importDialog);
        for(const modal of [choice,importDialog]) {
            modal.querySelector('[data-close]').onclick=()=>modal.close();
            modal.addEventListener('close',()=>{if(!choice.open&&!importDialog.open)document.body.classList.remove('eh-add-open');});
            modal.addEventListener('click',event=>{if(event.target!==modal)return;const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();});
        }
        function showImport(){importer.style.display='';importDialog.showModal();document.body.classList.add('eh-add-open');}
        $('ehChooseManual').onclick=()=>{choice.close();actions.create();};
        $('ehChooseImport').onclick=()=>{choice.close();showImport();};
        const hub=document.createElement('section');hub.className='cc-panel eh-hub';
        hub.innerHTML='<header><div><h2><i class="fas fa-building"></i> Hub de Empreendimentos</h2><p>Visualize, filtre e gerencie os empreendimentos.</p></div><div class="cc-tools"><label class="cc-search"><i class="fas fa-search"></i><input id="ehSearch" aria-label="Buscar empreendimento" placeholder="Buscar empreendimento…"></label><select id="ehBairro" aria-label="Bairro"></select><select id="ehConstrutora" aria-label="Construtora"></select><button id="ehNew" class="cc-primary">＋ Adicionar empreendimento</button></div></header>';
        const metrics=document.createElement('div');metrics.id='ehMetrics';metrics.className='eh-metrics';page.prepend(metrics,hub);
        hub.append($('empGrid'),$('empVazio'));$('empGrid').classList.add('eh-grid');
        $('empVazio').style.display='none';$('empGrid').textContent='Carregando empreendimentos…';
        $('ehNew').onclick=()=>{choice.showModal();document.body.classList.add('eh-add-open');};
        const pagination=document.createElement('nav');pagination.id='ehPagination';pagination.className='cc-pagination eh-pagination';pagination.setAttribute('aria-label','Páginas de empreendimentos');hub.append(pagination);
        pagination.addEventListener('click',event=>{const b=event.target.closest('[data-eh-page]');if(!b||b.disabled)return;currentPage=Number(b.dataset.ehPage);renderCards();pagination.querySelector('button:not(:disabled)')?.focus();});
        const resetPage=()=>{currentPage=1;renderCards();};
        $('ehSearch').addEventListener('input',resetPage);['ehBairro','ehConstrutora'].forEach(id=>$(id).addEventListener('change',resetPage));
        $('empGrid').addEventListener('click',event=>{const card=event.target.closest('[data-property]');if(card)open(Number(card.dataset.property));});
        drawer=document.createElement('dialog');drawer.className='eh-drawer';drawer.setAttribute('aria-labelledby','ehTitle');document.body.append(drawer);
        drawer.addEventListener('close',()=>{selected=null;document.body.classList.remove('eh-drawer-open');previousFocus?.focus();});
        drawer.addEventListener('click',async event=>{
            if(event.target===drawer){const box=drawer.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)drawer.close();return;}
            const button=event.target.closest('button[data-action]');if(!button)return;
            const e=items.find(e=>e.id===selected);if(button.dataset.action==='close'){drawer.close();return;}if(!e)return;
            if(button.dataset.action==='edit'){drawer.close();actions.edit(e);}
            if(button.dataset.action==='delete'){drawer.close();actions.remove(e.id,e.nome);}
            if(button.dataset.action==='publish'){
                button.disabled=true;button.textContent='Salvando…';
                try {
                    const {empreendimento}=await ApiClient.patch(`/api/admin/empreendimentos/${e.id}/status`,{status:e.status==='publicado'?'rascunho':'publicado'});
                    if(!empreendimento)throw Error('Não foi possível confirmar a alteração.');
                    Object.assign(e,empreendimento);renderCards();if(drawer.open&&selected===e.id)renderDetails(e);
                    actions.notify('Status atualizado.','success');
                } catch(error){actions.notify(error.message||'Erro ao alterar status.','error');if(drawer.open&&selected===e.id)renderDetails(e);}
            }
        });
    }
    function renderCards() {
        const list=filter(items,$('ehSearch').value,$('ehBairro').value,$('ehConstrutora').value);
        const result=paginate(list,currentPage);currentPage=result.page;
        $('ehPagination').innerHTML=`<span>${result.total?result.start+1:0}–${Math.min(result.start+8,result.total)} de ${result.total} empreendimentos</span><div><button data-eh-page="${currentPage-1}" ${currentPage===1?'disabled':''} aria-label="Página anterior">‹</button><strong>${currentPage} / ${result.pages}</strong><button data-eh-page="${currentPage+1}" ${currentPage===result.pages?'disabled':''} aria-label="Próxima página">›</button></div>`;
        $('empGrid').innerHTML=result.items.map(e=>`<button type="button" class="eh-card" data-property="${e.id}" aria-label="Ver detalhes de ${esc(e.nome)}"><div class="eh-cover">${url(e.capa_url)?`<img src="${esc(url(e.capa_url))}" alt="${esc(e.nome)}" loading="lazy" decoding="async">`:'<i class="fas fa-building eh-no-image" aria-hidden="true"></i>'}<span class="eh-status ${e.status==='publicado'?'published':''}">${status(e.status)}</span><span class="eh-arrow" aria-hidden="true">➜</span></div><div class="eh-card-body"><h3>${esc(e.nome)}</h3><div class="eh-chips"><span><i class="fas fa-building"></i> ${esc(e.construtora||'Construtora não informada')}</span><span><i class="fas fa-location-dot"></i> ${esc(e.bairro||e.cidade||'Local não informado')}</span></div></div></button>`).join('');
        $('empVazio').style.display=list.length?'none':'block';$('empVazio').querySelector('h3').textContent=items.length?'Nenhum empreendimento neste filtro':'Nenhum empreendimento cadastrado';
        $('empVazio').querySelector('p').textContent=items.length?'Ajuste a busca ou os filtros.':'Use Adicionar empreendimento ou importe do Google Drive.';
        $('empGrid').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.replaceWith(Object.assign(document.createElement('span'),{className:'eh-image-error',textContent:'Imagem indisponível'}));},{once:true}));
    }
    function renderDetails(e) {
        const fields=[['Construtora',e.construtora],['Tipo',e.tipo_imovel],['Fase',e.fase],['Previsão de entrega',e.previsao_entrega],['Endereço',e.endereco],['Bairro',e.bairro],['Cidade / UF',[e.cidade,e.estado].filter(Boolean).join(' / ')],['Dormitórios',e.dormitorios],['Metragens',e.metragens],['Vagas',e.vagas],['Renda presumida',e.renda_presumida==null?'':Number(e.renda_presumida).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})]];
        drawer.innerHTML=`<header><div><h2 id="ehTitle">${esc(e.nome)}</h2><span class="eh-status-static">${status(e.status)}</span></div><button data-action="close" aria-label="Fechar detalhes">×</button></header>${url(e.capa_url)?`<img class="eh-detail-image" src="${esc(url(e.capa_url))}" alt="${esc(e.nome)}">`:'<div class="eh-image-error">Sem imagem cadastrada</div>'}<div class="eh-detail-actions"><button data-action="edit"><i class="fas fa-pen"></i> Editar</button><button data-action="publish" class="eh-publish">${e.status==='publicado'?'Despublicar':'Publicar'}</button>${url(e.pdf_url)?`<a href="${esc(url(e.pdf_url))}" target="_blank" rel="noopener noreferrer">Abrir book ↗</a>`:''}</div><dl class="eh-facts">${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value||'Não informado')}</dd></div>`).join('')}</dl><section><h3>Descrição</h3><p class="eh-text">${esc(e.descricao||'Não informada')}</p></section><section><h3>Comodidades</h3><div class="eh-chips">${(Array.isArray(e.comodidades)&&e.comodidades.length)?e.comodidades.map(c=>`<span>${esc(c)}</span>`).join(''):'Não informadas'}</div></section>${e.observacoes?`<section><h3>Observações</h3><p class="eh-text">${esc(e.observacoes)}</p></section>`:''}<button class="eh-delete" data-action="delete"><i class="fas fa-trash"></i> Excluir empreendimento</button>`;
        const img=drawer.querySelector('img');if(img)img.onerror=()=>{img.replaceWith(Object.assign(document.createElement('p'),{textContent:'Imagem indisponível',className:'eh-image-error'}));};
    }
    function open(id) {const e=items.find(e=>e.id===id);if(!e)return;selected=id;previousFocus=document.activeElement;renderDetails(e);document.body.classList.add('eh-drawer-open');drawer.showModal();}
    function update(data,callbacks) {
        actions=callbacks;mount();items=data;
        const labels=[['Empreendimentos total','Cadastrados na plataforma'],['Construtoras total','Vinculadas aos empreendimentos'],['Bairros total','Com empreendimentos'],['Prontos','Fase: Entregue']];
        $('ehMetrics').innerHTML=totals(items).map((value,i)=>`<article><div><strong>${labels[i][0]}</strong><small>${labels[i][1]}</small></div><b>${value.toLocaleString('pt-BR')}</b></article>`).join('');
        for(const [id,key,label] of [['ehBairro','bairro','Todos os bairros'],['ehConstrutora','construtora','Todas as construtoras']]){
            const select=$(id),value=select.value;select.innerHTML=`<option value="">${label}</option>`+unique(items,key).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(unique(items,key).includes(value))select.value=value;
        }
        renderCards();
    }
    return { update, filter, totals, paginate,
    closeImport(){if(importDialog?.open)importDialog.close();},
    pauseImport(){const wasOpen=importDialog?.open;if(wasOpen)importDialog.close();return ()=>{if(wasOpen){importDialog.showModal();document.body.classList.add('eh-add-open');}};},
    fail(retry) {
        if(items.length)return;
        $('empGrid').textContent='Não foi possível carregar os empreendimentos. ';
        const button=document.createElement('button');button.type='button';button.textContent='Tentar novamente';button.onclick=retry;$('empGrid').append(button);
    }, prepare(callbacks) { actions=callbacks;mount(); } };
})();
