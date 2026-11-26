const fs=require('node:fs/promises'),path=require('node:path');
async function migrate(pool,{dryRun=false}={}){
 const client=await pool.connect();try{
  await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='10s'");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('prospect_migrations'))");
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (nome TEXT PRIMARY KEY, aplicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const dir=path.join(__dirname,'../database/migrations'),applied=[];
  for(const name of (await fs.readdir(dir)).filter(n=>n.endsWith('.sql')).sort()){
   if((await client.query('SELECT 1 FROM schema_migrations WHERE nome=$1',[name])).rows.length)continue;
   await client.query(await fs.readFile(path.join(dir,name),'utf8'));await client.query('INSERT INTO schema_migrations(nome) VALUES($1)',[name]);applied.push(name);
  }
  // Completa inclusões feitas pelo deploy anterior durante a transição de versão.
  await client.query('UPDATE negociacoes n SET corretor_id=l.corretor_id,lista_id=l.lista_id FROM leads l WHERE n.lead_id=l.id AND n.lista_id IS NULL');
  await client.query(dryRun?'ROLLBACK':'COMMIT');return applied;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
module.exports={migrate};
if(require.main===module){const {pool}=require('../config/db');migrate(pool,{dryRun:process.argv.includes('--dry-run')}).then(names=>console.log(JSON.stringify({dryRun:process.argv.includes('--dry-run'),migrations:names}))).catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());}
