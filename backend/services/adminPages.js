const fs = require('node:fs/promises');
const path = require('node:path');
const pages = {'/admin-carteiras.html':['listas','Carteiras'], '/admin-corretores.html':['corretores','Corretores'], '/admin-empreendimentos.html':['empreendimentos','Empreendimentos'], '/admin-conta.html':['conta','Minha Conta']};
// Páginas independentes com layout e formulários compartilhados: nenhuma cópia de regras de negócio.
function renderPage(admin, account, page, title) {
    if (page === 'conta') {
        const header=admin.match(/<header class="app-header">[\s\S]*?<\/header>/)[0];
        const nav=admin.match(/<nav class="admin-nav"[\s\S]*?<\/nav>/)[0].replace('nav-tab active','nav-tab');
        return account.replace('<html lang="pt-BR">','<html lang="pt-BR" class="admin-desktop-theme">')
            .replace(/<title>.*?<\/title>/,'<title>Prospect - Minha Conta</title>')
            .replace(/<link rel="stylesheet" href="css\/(corretor-theme|corretor-pages-mobile)\.css">/g,'')
            .replace('</head>', '<link rel="stylesheet" href="css/corretor-theme-tokens.css"><link rel="stylesheet" href="css/admin-command.css"><link rel="stylesheet" href="css/desktop-sidebar.css"><link rel="stylesheet" href="css/admin-account.css"></head>')
            .replace(/<body class="[^"]*">/,'<body class="conta-page admin-page admin-command">')
            .replace(/<header class="app-header">[\s\S]*?<\/header>/,header+nav)
            .replace('<main class="app-main">','<main class="admin-main">')
            .replace('</body>','<script src="js/admin-account.js"></script><script src="js/admin-mobile-nav.js"></script><script src="js/desktop-sidebar.js"></script></body>');
    }
    return admin.replace('data-admin-page="dashboard"',`data-admin-page="${page}"`)
        .replace(/<title>.*?<\/title>/,`<title>Prospect - ${title}</title>`)
        .replace('class="nav-tab active"','class="nav-tab"')
        .replace(`class="nav-tab" data-tab="${page}"`,`class="nav-tab active" data-tab="${page}"`)
        .replace('class="tab-panel active" id="tab-dashboard"','class="tab-panel" id="tab-dashboard"')
        .replace(`class="tab-panel" id="tab-${page}"`,`class="tab-panel active" id="tab-${page}"`);
}
function registerAdminPages(app, frontend) {
    for (const [url,[page,title]] of Object.entries(pages)) app.get(url,async(req,res,next)=>{
        try {
            const [admin,account]=await Promise.all([fs.readFile(path.join(frontend,'admin.html'),'utf8'),page==='conta'?fs.readFile(path.join(frontend,'conta.html'),'utf8'):Promise.resolve('')]);
            res.type('html').send(renderPage(admin,account,page,title));
        } catch(error) { next(error); }
    });
}
module.exports={registerAdminPages,renderPage,pages};
