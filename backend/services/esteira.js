const ETAPAS=['Documentação','Aprovação de Crédito','Validação de Fluxo','Contrato assinado Construtora','Aguardando Caixa','Contrato assinado Caixa'];
const DOCS=['identidade','endereco','renda','estado_civil','outro'];
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function id(value){const n=Number(value);if(!Number.isSafeInteger(n)||n<=0)fail('Identificador inválido.');return n;}
function money(value,{positive=false}={}){
 if(!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(String(value)))fail('Valor monetário inválido. Use até duas casas decimais.');
 const [whole,part='']=String(value).split('.');const cents=Number(whole)*100+Number(part.padEnd(2,'0'));
 if(positive&&cents<=0)fail('Informe um valor maior que zero.');return cents;
}
const decimal=cents=>(cents/100).toFixed(2);
function date(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value))||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail('Data inválida.');return value;}
function text(value,max=4000){if(typeof value!=='string'||value.length>max)fail('Texto inválido ou muito longo.');return value.trim();}
function transition(current,body){
 const etapa=body.etapa??current.etapa;
 if(!Number.isInteger(etapa)||etapa<0||etapa>5)fail('Etapa inválida.');
 if(body.versao!==current.versao)fail('Negociação atualizada por outra pessoa. Atualize a ficha.',409);
 if(etapa<current.etapa||etapa>current.etapa+1)fail('Avance uma etapa por vez.');
 if(etapa!==current.etapa&&current.status_comercial!=='ativo')fail('Resolva o status excepcional antes de avançar.');
 if(etapa>=2&&current.etapa<2&&current.credito_status!=='aprovado')fail('A aprovação administrativa do crédito é obrigatória.',403);
 return etapa;
}
function metrics(rows){let vgv=0,prev=0,received=0;for(const r of rows){vgv+=money(r.valor_venda||'0');prev+=money(r.comissao_prevista||'0');received+=money(r.recebido||'0');}
 return {em_andamento:rows.filter(r=>r.etapa<5&&['ativo','condicionado'].includes(r.status_comercial)).length,vendidos:rows.filter(r=>r.venda_id).length,finalizados:rows.filter(r=>r.assinatura_caixa).length,vgv:decimal(vgv),a_receber:decimal(prev-received),recebidas:decimal(received)};
}
function fileType(buffer){if(buffer.subarray(0,5).toString()==='%PDF-')return 'application/pdf';if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'image/jpeg';fail('Envie um PDF, JPEG ou PNG válido.');}
module.exports={ETAPAS,DOCS,fail,id,money,decimal,date,text,transition,metrics,fileType};
