const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function fixture({admin=true, saved=null, blocked=false}={}) {
    class Element {
        constructor(){this.classes=new Set();this.attrs={};this.childNodes=[];this.events={};this.queries={};this.textContent='Início';this.classList={contains:v=>this.classes.has(v),toggle:(v,on)=>on?this.classes.add(v):this.classes.delete(v)};}
        append(child){this.childNodes.push(child);}
        querySelector(key){return this.queries[key] ||= new Element();}
        setAttribute(k,v){this.attrs[k]=v;}
        getAttribute(k){return this.attrs[k];}
        hasAttribute(k){return Object.hasOwn(this.attrs,k);}
        addEventListener(name,fn){this.events[name]=fn;}
    }
    const body=new Element(),header=new Element(),nav=new Element(),item=new Element();
    const icon=new Element(),label=new Element();item.childNodes=[icon,label];item.queries.i=icon;
    nav.querySelectorAll=()=>[item];if(admin)body.classes.add('admin-command');
    let ready=[], mediaChange, storageChange, stored=saved, logout=0, query;
    const media={matches:true,addEventListener:(name,fn)=>{mediaChange=fn;}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../frontend/js/desktop-sidebar.js'),'utf8'),{
        document:{body,getElementById:()=>null,addEventListener:(name,fn)=>{ready.push(fn);},querySelector:selector=>selector.includes('header-inner')?header:nav,createElement:()=>new Element()},
        localStorage:{getItem(){if(blocked)throw Error();return stored;},setItem(k,v){if(blocked)throw Error();stored=v;}},
        window:{matchMedia:q=>{query=q;return media;},addEventListener:(name,fn)=>{storageChange=fn;}},ApiClient:{logout:()=>{logout++;}}
    });ready.forEach(fn=>fn());
    return {body,header,item,get stored(){return stored;},get logout(){return logout;},query,
        resize(matches){media.matches=matches;mediaChange();},storage(value){storageChange({key:'prospect-sidebar-collapsed',newValue:value});}};
}
test('admin recolhe, persiste escolha e mantém nomes acessíveis nos ícones',()=>{
    const f=fixture();const toggle=f.header.childNodes[0];
    assert.equal(f.query,'(min-width: 901px)');assert.equal(f.body.classes.has('ps-desktop'),true);
    assert.equal(toggle.attrs['aria-expanded'],'true');assert.equal(f.item.attrs['aria-label'],'Início');
    toggle.events.click();assert.equal(f.body.classes.has('ps-collapsed'),true);assert.equal(f.stored,'true');
    assert.equal(toggle.attrs['aria-label'],'Expandir navegação');
    assert.equal(fixture({saved:f.stored}).body.classes.has('ps-collapsed'),true);
    f.resize(false);assert.equal(f.body.classes.has('ps-desktop'),false);
    f.resize(true);assert.equal(f.body.classes.has('ps-collapsed'),true);
    f.storage('false');assert.equal(f.body.classes.has('ps-collapsed'),false);
});
test('corretor usa breakpoint próprio e sair chama logout existente uma vez',()=>{
    const f=fixture({admin:false});assert.equal(f.query,'(min-width: 1025px)');
    f.header.childNodes[1].querySelector('button').events.click();assert.equal(f.logout,1);
});
test('armazenamento bloqueado não impede recolher ou expandir',()=>{
    const f=fixture({blocked:true});const toggle=f.header.childNodes[0];
    toggle.events.click();assert.equal(f.body.classes.has('ps-collapsed'),true);
    toggle.events.click();assert.equal(f.body.classes.has('ps-collapsed'),false);
});

test('tema acompanha Minha Conta no mobile e retorna ao local desktop sem recriar controle',()=>{
 const callbacks=[];let change;
 const home={append(node){node.parentNode=this;}},header={};
 const control={parentNode:home,nextSibling:null};
 const avatar={before(node){node.parentNode=header;}};
 const media={matches:true,addEventListener:(name,fn)=>change=fn};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../frontend/js/desktop-sidebar.js'),'utf8'),{
  document:{body:{classList:{contains:()=>false}},querySelector:()=>null,addEventListener:(_,fn)=>callbacks.push(fn),getElementById:id=>id==='themeControl'?control:avatar},
  window:{matchMedia:()=>media}
 });
 callbacks.forEach(fn=>fn());assert.equal(control.parentNode,header);
 media.matches=false;change();assert.equal(control.parentNode,home);
 media.matches=true;change();assert.equal(control.parentNode,header);
});
