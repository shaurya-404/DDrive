document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('dtube_token');
        window.location.replace('index.html'); 
    });