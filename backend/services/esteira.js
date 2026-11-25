const ETAPAS=['Documentação','Aprovação de Crédito','Validação Fluxo','Contrato assinado Construtora','Aguardando Caixa','Contrato assinado Caixa'];
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function transition(current,body){
 const etapa=body.etapa;
 if(!Number.isInteger(etapa)||etapa<0||etapa>5)fail('Etapa inválida.');
 if(body.versao!==current.versao)fail('Esta negociação foi atualizada. Recarregue antes de continuar.',409);
 if(etapa<current.etapa||etapa>current.etapa+1)fail('Avance uma etapa por vez. Etapas concluídas não podem ser desfeitas.');
 if(body.meia_comissao!==undefined&&typeof body.meia_comissao!=='boolean')fail('Informe o recebimento da meia comissão corretamente.');
 if(body.meia_comissao&&etapa<3)fail('Meia comissão disponível a partir do contrato com a construtora.');
 const comissao=etapa===5?100:Math.max(current.comissao_recebida,body.meia_comissao?50:0);
 return {etapa,comissao,changed:etapa!==current.etapa||comissao!==current.comissao_recebida};
}
module.exports={ETAPAS,transition,fail};
