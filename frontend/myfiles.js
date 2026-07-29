document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('dtube_token');
    if (!token) return window.location.replace("index.html");

    const payloadBase64 = token.split('.')[1];
    const myUserId = JSON.parse(atob(payloadBase64)).id;

    const fileFeed = document.getElementById('file-feed');

    //try {
        const response = await fetch('http://localhost:8000/files/mine', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to fetch");
        const file = await response.json();
        if (file.length === 0) {
            fileFeed.innerHTML = "<h3 style='color: white; text-align: center; width: 100%; margin-top: 50px;'>You didnt upload any files!</h3>";
            return;
        }
        let max=file[0].length;
        for(let i=0;i<file.length;i++){
            if(file[i].length>max) max=file[i].length;
        }
        let space=" ";
        for(let j=0;j<max;j++) space+=" ";
        let d = "<h1><pre>FILENAME"+space+"   DATE    "+" SIZE "+"</pre></h1>\n";
        fileFeed.innerHTML = "";
        fileFeed.innerHTML += d;
        for(let i=0;i<file.length;i++){
            const fileCard = document.createElement('div');
            fileCard.className = 'file-card';
            fileCard.style.cursor = 'pointer';
            const fileurl = `http://localhost:8000/videos/${file[i].filename}`;
            let currentspace=" ";
            fileCard.innerHTML = `
                <div class="video-info" id="info-${file[i].file_id} download=${file[i].filename}>">
                    <a href="http://localhost:8000/videos/${file[i].filename}" download=${file[i].filename}>
                    <h3><pre>${file[i].filename} ${file[i].upload} ${file[i].filesize}MB</pre></h3>
                    </a>
                </div>
            `;
            fileFeed.appendChild(fileCard);
            // fileCard.onclick = () => {
                
            // };
            //const deleteBtn = document.createElement('button');
            // deleteBtn.className = 'delete-btn';
            // deleteBtn.innerText = 'Delete';
            
            // deleteBtn.onclick = async (e) => {
            //     e.stopPropagation(); 
            //     if (confirm("confirm deelte?")) {
            //         const delRes = await fetch(`http://localhost:8000/videos/${video.id}`, {
            //             method: 'DELETE',
            //             headers: { 'Authorization': `Bearer ${token}` }
            //         });
            //         if (delRes.ok) {
            //             videoCard.remove();
            //             if (videoFeed.children.length === 0) {
            //                 videoFeed.innerHTML = "<h3 style='color: white; text-align: center; width: 100%; margin-top: 50px;'>You have no more videos.</h3>";
            //             }
            //         } else {
            //             const errData = await delRes.json();
            //             alert("Could not delete: " + errData.message);
            //         }
            //     }
            // };
            //document.getElementById(`info-${video.id}`).appendChild(deleteBtn);

        }

    // } catch (error) {
    //     fileFeed.innerHTML = "<p style='color: #ff0000; text-align: center;'>Server error!</p>";
    // }
});