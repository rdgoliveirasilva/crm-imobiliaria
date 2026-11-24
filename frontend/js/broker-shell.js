/* Navegação e tema compartilhados nas páginas internas do corretor. */
(() => {
    if (AuthSession.getItem('sr_tipo') === 'admin') return;
    document.documentElement.classList.add('corretor-desktop-theme');
    document.addEventListener('DOMContentLoaded', () => {
        if (document.body.classList.contains('admin-command')) return;
        const body=document.body,header=document.querySelector('.header-inner'),main=document.querySelector('.app-main');
        if(!header||!main)return;
        body.classList.add('mobile-premium','broker-inner-shell');
        if(!document.querySelector('.desktop-sidebar-nav')){
            const nav=document.createElement('nav');nav.className='desktop-sidebar-nav';nav.setAttribute('aria-label','Navegação principal desktop');
            nav.innerHTML='<a href="corretor.html"><i class="fas fa-house"></i> Início</a><button type="button" disabled><i class="fas fa-layer-group"></i><span>Esteira Comercial<small>Em breve</small></span></button><button type="button" disabled><i class="fas fa-chart-simple"></i><span>Vendas<small>Em breve</small></span></button><a href="empreendimentos.html"><i class="far fa-building"></i> Empreendimentos</a>';
            header.insertBefore(nav,document.querySelector('.header-user'));
        }
        if(!document.querySelector('.mobile-bottom-nav')){
            const mobile=document.createElement('nav');mobile.className='mobile-only mobile-bottom-nav';mobile.setAttribute('aria-label','Navegação principal');
            mobile.innerHTML='<a href="corretor.html"><i class="fas fa-house"></i><span>Início</span></a><button type="button" disabled><i class="fas fa-layer-group"></i><span>Esteira</span></button><a href="prospeccao.html?visao=geral" class="mobile-prospect"><i class="fas fa-bolt"></i><span>Prospecção</span></a><button type="button" disabled><i class="fas fa-chart-simple"></i><span>Vendas</span></button><a href="empreendimentos.html"><i class="far fa-building"></i><span>Empreendimentos</span></a>';body.append(mobile);
        }
        const account=document.querySelector('.header-user');
        const toolbar=document.createElement('div');toolbar.className='broker-inner-toolbar';
        const title=document.createElement('h1');title.textContent=body.classList.contains('prospeccao-page')?'Prospecção':body.classList.contains('conta-page')?'Minha Conta':'Empreendimentos';
        toolbar.append(title,account);main.before(toolbar);
        const selector=document.getElementById('carteiraSelectorWrap');
        if(selector){main.before(selector);if(!body.classList.contains('prospeccao-page'))selector.append(document.getElementById('themeControl'));}
        if(body.classList.contains('prospeccao-page')){
            const workspace=document.createElement('div');workspace.className='broker-prospect-workspace';
            const progress=document.getElementById('progressBar');
            main.before(workspace);
            [toolbar,progress,selector,main].filter(Boolean).forEach(element=>workspace.append(element));
        }
        document.querySelectorAll('.header-inner .btn-back-header').forEach(button=>button.remove());
    });
})();
