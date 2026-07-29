document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('dtube_token');
    if (!token) return window.location.replace("index.html");

    let parentFolder = 'root';
    if (window.location.search.includes('?parent=')) {
        parentFolder = decodeURIComponent(window.location.search.split('?parent=')[1]);
    }
    document.getElementById('upload-parent').value = parentFolder;

    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('upload-status');
    const uploadBtn = document.getElementById('upload-btn');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        uploadBtn.innerText = "Uploading...";
        uploadBtn.disabled = true;

        const formData = new FormData();
        formData.append('parent', document.getElementById('upload-parent').value);
        formData.append('uploaded_file', document.getElementById('upload-file').files[0]);

        try {
            const response = await fetch('http://localhost:8000/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                uploadStatus.innerHTML = "<p style='color: #16ff01;'>Upload successful! Redirecting...</p>";
                setTimeout(() => window.location.href = `myfiles.html?parent=${parentFolder}`, 1500);
            } else {
                const data = await response.json();
                uploadStatus.innerHTML = `<p style='color: #ff0000;'>${data.message || "Upload failed."}</p>`;
                uploadBtn.innerText = "upload a file";
                uploadBtn.disabled = false;
            }
        } catch (err) {
            uploadStatus.innerHTML = "<p style='color: #ff0000;'>Server error.</p>";
            uploadBtn.innerText = "upload a file";
            uploadBtn.disabled = false;
        }
    });
});