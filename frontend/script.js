let max_question_id_val;

document.addEventListener('DOMContentLoaded', async function () {
    try {
        const apiAnahtari = 'test'; // Bu sabit, backenddeki API_KEY ile aynı olmalı
        const response = await fetch(`https://bilgehane-api.fly.dev/getsqlinfo/${apiAnahtari}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        
        // Kategorileri ve alt kategorileri doldurma
        populateCategoryAndSubcategory(data);
        console.log(data.max_question_id);
        max_question_id_val = data.max_question_id + 10;
        
    } catch (error) {
        console.error('Veri alınırken hata oluştu:', error);
    }
});

function populateCategoryAndSubcategory(data) {
    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');

    // Kategorileri doldurma
    data.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.category_name;
        categorySelect.appendChild(option);
    });

    // Kategori seçildiğinde ilgili alt kategorileri gösterme
    categorySelect.addEventListener('change', function () {
        const selectedCategoryId = parseInt(categorySelect.value);
        
        // Alt kategorileri temizleme
        subcategorySelect.innerHTML = '';

        // Seçilen kategoriye göre alt kategorileri doldurma
        const filteredSubcategories = data.subcategories.filter(sub => sub.maincat_id === selectedCategoryId);
        filteredSubcategories.forEach(subcategory => {
            const option = document.createElement('option');
            option.value = subcategory.id;
            option.textContent = subcategory.subcategory_name;
            subcategorySelect.appendChild(option);
        });
    });

    // İlk kategori seçildiğinde, ilgili alt kategorileri gösterme
    if (categorySelect.value) {
        const event = new Event('change');
        categorySelect.dispatchEvent(event);
    }
}

document.getElementById('soruForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const category = document.getElementById('category').value;
    const subcategory = document.getElementById('subcategory').value;
    const languageSelect = document.getElementById('language_select').value.split(',');
    const language_id = languageSelect[0];
    const language = languageSelect[1];
    const num_questions = parseInt(document.getElementById('num_questions').value);
    const mainTopic = document.getElementById('topic').value;
    let questionid = max_question_id_val;
    const VECTOR_STORE_ID = document.getElementById('VECTOR_STORE_ID').value;
    const apiAnahtari = 'test';
    document.getElementById('resultsHeader').style.display = 'block';

    const resultDiv = document.getElementById('resultLabels');
    const loadingSpinner = document.getElementById('loadingSpinner');
    resultDiv.innerHTML = '';
    loadingSpinner.style.display = 'block';

    try {
        // İlk olarak alt konuları al
        const subtopicsResponse = await fetch(`https://bilgehane-api.fly.dev/subtopics/${apiAnahtari}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                category,
                subcategory,
                language_id,
                topic: mainTopic,
                VECTOR_STORE_ID,
                language
            })
        });
        const subtopicsData = await subtopicsResponse.json();
        const subtopics = subtopicsData.subtopics;

        resultDiv.innerHTML += `<br> <p> ➡️ Alt konular başarıyla alındı. Şimdi sorular üretilecek.</p>`;

        let remainingQuestions = num_questions;
        let subtopicIndex = 0;

        while (remainingQuestions > 0) {
            const currentTopic = subtopics[subtopicIndex % subtopics.length];
            const questionsForTopic = Math.min(36, remainingQuestions);

            resultDiv.innerHTML += `<br> <p> ➡️ Şu anda "${currentTopic}" konusu için sorular üretiliyor...</p>`;

            for (let i = 0; i < questionsForTopic; i += 12) {
                const questionsInThisBatch = Math.min(12, questionsForTopic - i);

                const response = await fetch(`https://bilgehane-api.fly.dev/analiz/${apiAnahtari}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        category,
                        subcategory,
                        language_id,
                        num_questions: questionsInThisBatch,
                        topic: currentTopic,
                        questionid,
                        VECTOR_STORE_ID,
                        language
                    })
                });
                const data = await response.json();

                if (data.results && data.results.affectedRows > 0) {
                    const successLabel = document.createElement('div');
                    successLabel.className = 'badge bg-success';
                    successLabel.textContent = `✅ ${questionsInThisBatch} soru ${questionid} ID'den itibaren "${currentTopic}" konusu için başarıyla üretildi.`;
                    resultDiv.appendChild(successLabel);
                    resultDiv.appendChild(document.createElement('br'));
                } else if (data.message) {
                    const errorLabel = document.createElement('div');
                    errorLabel.className = 'badge bg-danger';
                    errorLabel.textContent = `⛔️ Hata: ${data.message}`;
                    resultDiv.appendChild(errorLabel);
                    resultDiv.appendChild(document.createElement('br'));
                }

                questionid += questionsInThisBatch;
            }

            remainingQuestions -= questionsForTopic;
            subtopicIndex++;

            if (subtopicIndex % subtopics.length === 0 && remainingQuestions > 0) {
                resultDiv.innerHTML += `<p> ⚙️ Tüm alt konular tamamlandı. Liste baştan başlıyor...</p>`;
            }
        }

        loadingSpinner.style.display = 'none';
        startConfetti();
        setTimeout(stopConfetti, 5000);

    } catch (error) {
        console.error('Error:', error);
        const errorLabel = document.createElement('div');
        errorLabel.className = 'badge bg-danger';
        errorLabel.textContent = `Hata: ${error.message}`;
        resultDiv.appendChild(errorLabel);
        loadingSpinner.style.display = 'none';
    }
});

let uploadedFiles = [];

document.addEventListener('DOMContentLoaded', function() {
    const uploadButton = document.getElementById('uploadButton');
    const uploadModalElement = document.getElementById('uploadModal');
    const uploadModal = new bootstrap.Modal(uploadModalElement);
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const uploadFilesButton = document.getElementById('uploadFiles');
    const uploadResult = document.getElementById('uploadResult');
    const dismissButtons = uploadModalElement.querySelectorAll('[data-bs-dismiss="modal"]');

    let uploadedFiles = [];

    uploadButton.addEventListener('click', () => uploadModal.show());

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    dropArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        uploadedFiles = Array.from(files);
        fileList.innerHTML = uploadedFiles.map(file => `<p>${file.name}</p>`).join('');
    }

    uploadFilesButton.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("Dosya yükleme başlatılıyor...");

        if (uploadedFiles.length === 0) {
            alert('Lütfen dosya seçin');
            return;
        }

        // Düğmeleri devre dışı bırak ve yükleniyor mesajını göster
        uploadFilesButton.disabled = true;
        dismissButtons.forEach(button => button.disabled = true);
        uploadResult.style.display = 'block';
        uploadResult.textContent = 'Dosyalar yükleniyor...';

        const formData = new FormData();
        uploadedFiles.forEach(file => {
            formData.append('pdfs', file);
        });
        formData.append('VECTOR_STORE_ID', document.getElementById('VECTOR_STORE_ID').value);

        try {
            console.log("Sunucuya istek gönderiliyor...");
            const response = await fetch('https://bilgehane-api.fly.dev/upload-pdfs/test', {
                method: 'POST',
                body: formData,
                mode: 'cors',
                credentials: 'same-origin'
            });

            console.log("Sunucu yanıtı alındı:", response);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log("Sunucu yanıtı (JSON):", result);
            uploadResult.textContent = result.message;
            
            if (result.vectorStoreId) {
                document.getElementById('VECTOR_STORE_ID').value = result.vectorStoreId;
            }

            // Başarılı yükleme durumunda modal'ı kapatma işlemini kullanıcıya bırak
            dismissButtons.forEach(button => button.disabled = false);

        } catch (error) {
            console.log(error);
            //uploadResult.textContent = 'Hata: ' + error.message;
        } finally {
            // İşlem tamamlandığında düğmeleri tekrar etkinleştir
            uploadFilesButton.disabled = false;
            dismissButtons.forEach(button => button.disabled = false);
        }
    });

    // Modal kapanırken dosya listesini ve sonuç mesajını temizle
    uploadModalElement.addEventListener('hidden.bs.modal', function () {
        fileList.innerHTML = '';
        uploadResult.style.display = 'none';
        uploadResult.textContent = '';
        uploadedFiles = [];
    });
});


// Konfeti animasyonu için fonksiyonlar
function startConfetti() {
    const confettiCanvas = document.getElementById('confetti-canvas');
    confettiCanvas.style.display = 'block';
    const confettiSettings = { target: 'confetti-canvas', max: 100, size: 1.5 };
    const confetti = new ConfettiGenerator(confettiSettings);
    confetti.render();
}

function stopConfetti() {
    const confettiCanvas = document.getElementById('confetti-canvas');
    confettiCanvas.style.display = 'none';
    const confetti = new ConfettiGenerator({ target: 'confetti-canvas' });
    confetti.clear();
}