const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function fixture(short = false) {
    class Element {
        constructor() { this.children=[];this.dataset={};this.attributes={};this.events={};this.queries={};this.classes=new Set();this.textContent='';this.classList={contains:v=>this.classes.has(v),toggle:(v,on)=>on?this.classes.add(v):this.classes.delete(v)}; }
        append(el){this.children.push(el);}
        querySelector(selector){return this.queries[selector] ||= new Element();}
        setAttribute(k,v){this.attributes[k]=v;}
        getAttribute(k){return this.attributes[k];}
        removeAttribute(k){delete this.attributes[k];}
        addEventListener(name,fn){(this.events[name] ||= []).push(fn);}
        click(){for(const fn of this.events.click||[])fn({target:this});}
        cloneNode(){return new Element();}
        showModal(){this.open=true;}
        close(){this.open=false;}
    }
    const nav=new Element(),body=new Element();let ready,breakpoint;
    const items=(short?['dashboard','whatsapp']:['dashboard','upload','categorias','listas','empreendimentos','corretores','whatsapp']).map(key=>{
        const item=new Element();item.dataset.tab=key;item.textContent=key;
        item.querySelector('span').textContent=key;
        item.clicks=0;item.addEventListener('click',()=>{item.clicks++;items.forEach(i=>i.classList.toggle('active',i===item));});return item;
    });
    items[0].classes.add('active');nav.children=[...items];nav.querySelectorAll=()=>items;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../frontend/js/admin-mobile-nav.js'),'utf8'),{
        document:{addEventListener:(name,fn)=>{ready=fn;},querySelector:()=>nav,createElement:()=>new Element(),body},
        window:{matchMedia:()=>({addEventListener:(name,fn)=>{breakpoint=fn;}})}
    });ready();return {items,nav,body,breakpoint};
}
test('barra compacta preserva destinos e executa o handler original ao escolher Mais',()=>{
    const f=fixture();const more=f.nav.children.at(-1),dialog=f.body.children[0];
    assert.deepEqual(f.items.filter(i=>i.dataset.mobilePrimary==='true').map(i=>i.dataset.tab),['dashboard','listas','corretores']);
    const menu=dialog.querySelector('.cc-mobile-menu');assert.equal(menu.children.length,4);
    more.click();assert.equal(dialog.open,true);
    menu.children[0].click();assert.equal(dialog.open,false);assert.equal(f.items[1].clicks,1);
    assert.equal(more.classList.contains('active'),true);
    f.items[3].click();assert.equal(more.classList.contains('active'),false);
    more.click();f.breakpoint({matches:false});assert.equal(dialog.open,false);
    menu.children.at(-1).click();assert.equal(f.items.at(-1).clicks,1);
});
test('navegação curta não cria menu redundante nem oculta destinos',()=>{
    const f=fixture(true);assert.equal(f.nav.children.length,2);assert.equal(f.body.children.length,0);
    assert.ok(f.items.every(i=>i.dataset.mobilePrimary===undefined));
});
