document.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id), admin=AuthSession.getItem('sr_tipo')==='admin';
 if(admin&&!document.body.classList.contains('admin-command')){location.replace('admin-esteira.html');return;}
 if(admin)$('pipelineAccount').append(document.querySelector('.header-user'));
 $('pipelineBrokerWrap').hidden=!admin;
 if(!admin)document.querySelectorAll('nav a[href="esteira.html"]').forEach(link=>link.setAttribute('aria-current','page'));
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=value=>value?new Date(String(value).replace(' ','T').replace(/([+-]\d{2})$/, '$1:00')).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
 let deals=[],stages=[],request=0,selected=null,saving=false,dragged=null,previousFocus;
 const dialog=$('pipelineDialog');
 function render(){
  const sold=deals.filter(d=>d.etapa>=3).length,finished=deals.filter(d=>d.etapa===5).length,half=deals.filter(d=>d.comissao_recebida===50).length;
  $('pipelineMetrics').innerHTML=[['Em negociação',deals.length-finished],['Vendas contratadas',sold],['Comissão parcial (50%)',half],['Finalizados (100%)',finished]].map(([label,value])=>`<article><span>${label}</span><strong>${value}</strong></article>`).join('');
  $('pipelineBoard').innerHTML=stages.map((label,index)=>{
   const rows=deals.filter(d=>d.etapa===index);
   return `<section class="pipeline-column" data-stage="${index}" aria-labelledby="stage${index}"><header><h2 id="stage${index}">${esc(label)}</h2><span>${rows.length}</span></header><div class="pipeline-cards">${rows.map(d=>`<button type="button" draggable="${d.etapa<5}" class="pipeline-card" data-deal="${d.id}"><strong>${esc(d.nome)}</strong><span>${esc(d.telefone)}</span><small>${esc(d.carteira)}</small>${admin?`<small>Corretor: ${esc(d.corretor||'Sem corretor')}</small>`:''}<span class="pipeline-badge">${d.etapa>=3?'Vendido · ':''}${d.comissao_recebida}% recebido</span><small>Atualizado em ${esc(date(d.atualizado_em))}</small><span class="pipeline-open">Ver negociação →</span></button>`).join('')||'<p class="pipeline-empty">Nenhum cliente nesta etapa.</p>'}</div></section>`;
  }).join('');
 }
 function options(node,key,label,rows){const values=new Map(rows.filter(d=>d[key]).map(d=>[d[key],d[label]]));node.innerHTML='<option value="">'+(key==='lista_id'?'Todas as carteiras':'Todos os corretores')+'</option>'+Array.from(values).sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'pt-BR')).map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('');}
 async function load(initial=false){const token=++request;$('pipelineFeedback').textContent='Carregando negociações…';
  const params=new URLSearchParams({busca:$('pipelineSearch').value});if($('pipelineWallet').value)params.set('lista_id',$('pipelineWallet').value);if(admin&&$('pipelineBroker').value)params.set('corretor_id',$('pipelineBroker').value);
  try{const data=await ApiClient.get('/api/esteira?'+params);if(token!==request)return;deals=data.negociacoes;stages=data.etapas;
   if(initial){options($('pipelineWallet'),'lista_id','carteira',deals);options($('pipelineBroker'),'corretor_id','corretor',deals);}
   render();$('pipelineFeedback').textContent=deals.length?`${deals.length} negociações. Abra um cliente para avançar ou arraste para a próxima etapa.`:'Nenhuma negociação encontrada. Adicione clientes pela prospecção.';
   if(initial){const lead=Number(new URLSearchParams(location.search).get('lead'));const d=deals.find(d=>d.lead_id===lead);if(d)open(d.id);}
  }catch(e){if(token===request)$('pipelineFeedback').textContent=e.message+' Use Atualizar para tentar novamente.';}
 }
 async function open(id,target){selected=deals.find(d=>d.id===id);if(!selected)return;previousFocus=document.activeElement;
  const d=selected;dialog.innerHTML=`<header><div><h2 id="pipelineTitle">${esc(d.nome)}</h2><p>${esc(d.carteira)} · ${esc(d.corretor||'Sem corretor')}</p></div><button type="button" data-close aria-label="Fechar">×</button></header><p>${esc(d.telefone)}</p><p>Etapa atual: <strong>${esc(stages[d.etapa])}</strong></p><p>Comissão recebida: <strong>${d.comissao_recebida}%</strong> do total.</p>${d.vendido_em?`<p>Venda registrada em ${esc(date(d.vendido_em))}</p>`:''}${d.etapa===5?'<p class="pipeline-complete">Venda finalizada · comissão integral recebida.</p>':`<form id="pipelineMove"><label>Etapa<select id="pipelineStage"><option value="${d.etapa}">${esc(stages[d.etapa])}</option><option value="${d.etapa+1}" ${target===d.etapa+1?'selected':''}>${esc(stages[d.etapa+1])}</option></select></label><label class="pipeline-check" id="halfWrap"><input id="pipelineHalf" type="checkbox" ${d.comissao_recebida===50?'checked disabled':''}> Confirmo o recebimento de 50% da comissão</label><p class="pipeline-note">Contrato com a construtora registra a venda. Contrato com a Caixa confirma 100% acumulado e finaliza o processo. Movimentações não podem ser desfeitas.</p><button type="submit">Salvar movimentação</button></form>`}<p id="pipelineDialogFeedback" role="status"></p><section><h3>Histórico de movimentações</h3><div id="pipelineEvents">Carregando…</div></section>`;
  dialog.querySelector('[data-close]').onclick=()=>{if(!saving)dialog.close();};if(!dialog.open)dialog.showModal();
  const form=$('pipelineMove');if(form){const sync=()=>{const stage=Number($('pipelineStage').value);$('halfWrap').hidden=stage<3||stage===5;};$('pipelineStage').onchange=sync;sync();form.onsubmit=save;}
  try{const {eventos}=await ApiClient.get(`/api/esteira/${id}/eventos`);if(selected?.id!==id)return;$('pipelineEvents').innerHTML=eventos.map(e=>`<p><strong>${esc(stages[e.etapa])}</strong> · ${e.comissao_recebida}% recebido<br><small>${esc(date(e.criado_em))} · ${esc(e.usuario||'Usuário removido')}</small></p>`).join('');}catch(e){if(selected?.id===id)$('pipelineEvents').textContent=e.message;}
 }
 async function save(event){event.preventDefault();if(saving||!selected)return;saving=true;const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{await ApiClient.patch(`/api/esteira/${selected.id}`,{etapa:Number($('pipelineStage').value),versao:selected.versao,meia_comissao:!$('halfWrap').hidden&&$('pipelineHalf').checked});dialog.close();await load();}
  catch(e){$('pipelineDialogFeedback').textContent=e.message+' Feche e atualize o quadro antes de tentar novamente.';}
  finally{saving=false;button.disabled=false;}
 }
 $('pipelineFilters').onsubmit=e=>{e.preventDefault();load();};
 for(const id of ['pipelineWallet','pipelineBroker'])$(id).onchange=()=>load();
 $('pipelineBoard').onclick=e=>{const card=e.target.closest('[data-deal]');if(card)open(Number(card.dataset.deal));};
 $('pipelineBoard').ondragstart=e=>{const card=e.target.closest('[data-deal]');if(!card)return;dragged=Number(card.dataset.deal);e.dataTransfer.setData('text/plain',String(dragged));};
 $('pipelineBoard').ondragover=e=>{const column=e.target.closest('[data-stage]'),deal=deals.find(d=>d.id===dragged);if(column&&deal&&Number(column.dataset.stage)===deal.etapa+1)e.preventDefault();};
 $('pipelineBoard').ondrop=e=>{e.preventDefault();const column=e.target.closest('[data-stage]'),deal=deals.find(d=>d.id===dragged);if(column&&deal&&Number(column.dataset.stage)===deal.etapa+1)open(deal.id,deal.etapa+1);dragged=null;};
 $('pipelineBoard').ondragend=()=>{dragged=null;};
 dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();});dialog.addEventListener('close',()=>{selected=null;previousFocus?.focus();});
 load(true);
});
