document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('dtube_token');
    if (!token) return window.location.replace("index.html");

    const payloadBase64 = token.split('.')[1];
    const myUserId = JSON.parse(atob(payloadBase64)).id;

    const fileFeed = document.getElementById('file-feed');

    let currentParent = 'root';
if (window.location.search.includes('?parent=')) {
    currentParent = decodeURIComponent(window.location.search.split('?parent=')[1]);
}

    document.getElementById('upload-nav-btn')?.addEventListener('click', () => {
        window.location.href = `upload.html?parent=${currentParent}`;
    });

    document.getElementById('create-folder-btn')?.addEventListener('click', () => {
        const box = document.getElementById('folder-box');
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
        fileFeed.style.marginTop = box.style.display === 'none' ? '100px' : '20px';
    });

    document.getElementById('submit-folder')?.addEventListener('click', async () => {
        const foldername = document.getElementById('folder-name-input').value;
        if(!foldername) return;

        await fetch('http://localhost:8000/createfolder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ foldername: foldername, parent: currentParent })
        });
        window.location.reload(); 
    });

    const response = await fetch(`http://localhost:8000/files/mine?parent=${currentParent}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Failed to fetch");
    const allFiles = await response.json();
    
    const file = [];
    for(let i=0; i<allFiles.length; i++) {
        if(allFiles[i].parent === currentParent) {
            file.push(allFiles[i]);
        }
    }

    fileFeed.innerHTML = "";
    
    if (currentParent !== 'root') {
        fileFeed.innerHTML += `<button onclick="window.location.href='myfiles.html'" style="background-color: #ef4444; width: 150px; margin-bottom: 20px;">↑ Back to root</button><br>`;
    }

    if (file.length === 0) {
        fileFeed.innerHTML += "<h3 style='color: white; text-align: center; width: 100%; margin-top: 50px;'>You didnt upload any files here!</h3>";
        return;
    }

    let max=file[0].filename.length;
    for(let i=0;i<file.length;i++){
        if(file[i].filename.length>max) max=file[i].filename.length;
    }
    let space=" ";
    for(let j=0;j<max;j++) space+=" ";
    let d = "<h1><pre>FILENAME"+space+"   DATE    "+" SIZE "+"</pre></h1>\n";
    
    fileFeed.innerHTML += d;

    for(let i=0;i<file.length;i++){
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card';
        fileCard.style.cursor = 'pointer';
        
        let g=max-file[i].filename.length;
        let gap=" ";
        for(let i=0;i<g-2;i++) gap+=" ";

        if (file[i].type === 0) {
            fileCard.innerHTML = `
                <div class="video-info" style="background-color: #334155; padding: 10px; border-radius: 5px;">
                    <h3 style="color: #f59e0b;">📁 <pre style="display:inline;">${file[i].filename}</pre></h3>
                </div>
            `;
            fileCard.onclick = () => {
                window.location.href = `myfiles.html?parent=${file[i].filename}`;
            };
        } else {
            fileCard.innerHTML = `
                <div class="video-info" id="info-${file[i].file_id} download=${file[i].filename}>">
                    <a href="http://localhost:8000/files/${file[i].filename}" download=${file[i].filename}>
                    <h3><pre>${file[i].filename} ${gap} ${file[i].upload.split('T')[0]}     ${file[i].filesize}MB</pre></h3>
                    </a>
                </div>
            `;
        }
        fileFeed.appendChild(fileCard);
    }
});