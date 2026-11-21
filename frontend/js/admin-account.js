document.addEventListener('DOMContentLoaded', () => {
    const header=document.querySelector('.header-inner');
    const account=document.querySelector('.header-user');
    header.insertBefore(document.querySelector('.admin-nav'),account);
    account.querySelector('.user-info').hidden=true;
    const toolbar=document.createElement('header');toolbar.className='cc-top cc-account-toolbar';
    toolbar.innerHTML='<h1>Minha Conta</h1>';toolbar.append(account);
    document.querySelector('.admin-main').prepend(toolbar);
});
