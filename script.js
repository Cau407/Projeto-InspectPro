document.addEventListener('DOMContentLoaded', () => {
    const homeView = document.getElementById('homeView');
    const fiscalView = document.getElementById('fiscalView');
    const gestorView = document.getElementById('gestorView');
    const visitanteView = document.getElementById('visitanteView');
    const homeBtn = document.getElementById('homeBtn');
    const fiscalBtn = document.getElementById('fiscalBtn');
    const gestorBtn = document.getElementById('gestorBtn');
    const visitanteBtn = document.getElementById('visitanteBtn');
    const currentDate = document.getElementById('currentDate');
    const currentLocation = document.getElementById('currentLocation');
    const currentTime = document.getElementById('currentTime');
    const copyPreviousBtn = document.getElementById('copyPrevious');
    const droForm = document.getElementById('droForm');
    const rftForm = document.getElementById('rftForm');
    const gestorRelatoriosList = document.getElementById('gestorRelatoriosList');
    const visitanteRelatoriosList = document.getElementById('visitanteRelatoriosList');
    const notification = document.getElementById('notification');
    const mainNav = document.getElementById('mainNav');
    const userInfo = document.getElementById('userInfo');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginForm = document.getElementById('loginFormElement');
    const registerForm = document.getElementById('registerFormElement');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const closeModal = document.querySelector('.close');

    showView(homeView);

    let currentUser = null;
    let currentEditIndex = null;

    const droSignaturePad = new SignaturePad(document.getElementById('droSignature'));
    const rftSignaturePad = new SignaturePad(document.getElementById('rftSignature'));

    document.getElementById('clearDroSignature').addEventListener('click', () => droSignaturePad.clear());
    document.getElementById('clearRftSignature').addEventListener('click', () => rftSignaturePad.clear());

    function showView(view) {
        [homeView, fiscalView, gestorView, visitanteView].forEach(v => v.style.display = 'none');
        view.style.display = 'block';
    }

    function updateNavigation() {
        if (currentUser) {
            mainNav.style.display = 'none';
            userInfo.style.display = 'block';
            welcomeMessage.textContent = `Bem-vindo, ${currentUser.username} (${currentUser.role})`;
        } else {
            mainNav.style.display = 'flex';
            userInfo.style.display = 'none';
        }
    }

    homeBtn.addEventListener('click', () => showView(homeView));
    fiscalBtn.addEventListener('click', () => showView(fiscalView));
    gestorBtn.addEventListener('click', () => {
        showView(gestorView);
        updateGestorInfo();
        loadGestorRelatorios();
    });
    visitanteBtn.addEventListener('click', () => {
        showView(visitanteView);
        loadVisitanteRelatorios();
    });

    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        updateNavigation();
        showView(homeView);
    });

    function updateGestorInfo() {
        const now = new Date();
        currentDate.textContent = now.toLocaleDateString();
        currentTime.textContent = now.toLocaleTimeString();

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                currentLocation.textContent = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
            }, function(error) {
                currentLocation.textContent = "Não foi possível obter a localização";
                showNotification("Erro ao obter localização", "error");
            });
        } else {
            currentLocation.textContent = "Geolocalização não suportada";
            showNotification("Geolocalização não suportada neste dispositivo", "warning");
        }
    }

    function loadGestorRelatorios() {
        const relatorios = JSON.parse(localStorage.getItem('relatorios')) || [];
        gestorRelatoriosList.innerHTML = relatorios.map((rel, index) => 
            `<li>
                <strong>${rel.tipo}</strong> - ${rel.data} - ${rel.local} - ${rel.hora}
                <p>${rel.descricao.substring(0, 50)}...</p>
                ${rel.imagem ? `<img src="${rel.imagem}" alt="Imagem do relatório" class="report-image">` : ''}
                ${rel.assinatura ? `<img src="${rel.assinatura}" alt="Assinatura" class="report-image">` : ''}
                <button class="generate-pdf-btn" onclick="generatePDF(${index})">Gerar PDF</button>
                <button class="edit-report-btn" onclick="openEditModal(${index})">Editar</button>
            </li>`
        ).join('');
    }

    function loadVisitanteRelatorios() {
        const relatorios = JSON.parse(localStorage.getItem('relatorios')) || [];
        visitanteRelatoriosList.innerHTML = relatorios.map((rel, index) => 
            `<li>
                <strong>${rel.tipo}</strong> - ${rel.data}
                <button class="generate-pdf-btn" onclick="generatePDF(${index})">Gerar PDF</button>
            </li>`
        ).join('');
    }

    copyPreviousBtn.addEventListener('click', () => {
        const relatorios = JSON.parse(localStorage.getItem('relatorios')) || [];
        if (relatorios.length > 0) {
            const lastReport = relatorios[relatorios.length - 1];
            document.getElementById('droDescription').value = lastReport.descricao;
            document.getElementById('droLocation').value = lastReport.local;
            showNotification("Dados do último relatório copiados", "success");
        } else {
            showNotification("Nenhum relatório anterior encontrado", "warning");
        }
    });

    function handleFormSubmit(e, formType) {
        e.preventDefault();
        const description = e.target.querySelector('textarea[id$="Description"]').value;
        const location = e.target.querySelector('input[id$="Location"]')?.value;
        const progress = e.target.querySelector('input[id$="Progress"]')?.value;
        const issues = e.target.querySelector('textarea[id$="Issues"]')?.value;
        const imageInput = e.target.querySelector('input[type="file"]');
        const signaturePad = formType === 'DRO' ? droSignaturePad : rftSignaturePad;
        
        if (description && (formType === 'DRO' ? location : progress)) {
            const now = new Date();
            const newReport = {
                tipo: formType,
                data: now.toLocaleDateString(),
                hora: now.toLocaleTimeString(),
                local: location,
                descricao: description,
                progresso: progress,
                problemas: issues,
                assinatura: signaturePad.isEmpty() ? null : signaturePad.toDataURL()
            };

            if (imageInput.files.length > 0) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    newReport.imagem = event.target.result;
                    saveReport(newReport);
                };
                reader.readAsDataURL(imageInput.files[0]);
            } else {
                saveReport(newReport);
            }
        } else {
            showNotification("Por favor, preencha todos os campos obrigatórios", "error");
        }
    }

    droForm.addEventListener('submit', (e) => handleFormSubmit(e, 'DRO'));
    rftForm.addEventListener('submit', (e) => handleFormSubmit(e, 'RFT'));

    function saveReport(report) {
        const relatorios = JSON.parse(localStorage.getItem('relatorios')) || [];
        relatorios.push(report);
        localStorage.setItem('relatorios', JSON.stringify(relatorios));
        droForm.reset();
        rftForm.reset();
        droSignaturePad.clear();
        rftSignaturePad.clear();
        showNotification(`${report.tipo} salvo com sucesso!`, "success");
    }

    function showNotification(message, type = 'info') {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    // Auth tabs
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            authTabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tabName}Form`).classList.add('active');
        });
    });

    // User registration
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const role = document.getElementById('registerRole').value;

        const users = JSON.parse(localStorage.getItem('users')) || [];
        if (users.some(user => user.username === username)) {
            showNotification("Nome de usuário já existe", "error");
            return;
        }

        users.push({ username, password, role });
        localStorage.setItem('users', JSON.stringify(users));
        showNotification("Registro realizado com sucesso", "success");
        registerForm.reset();
    });

    // User login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            currentUser = user;
            updateNavigation();
            showView(document.getElementById(`${user.role}View`));
            showNotification(`Bem-vindo, ${user.username}!`, "success");
        } else {
            showNotification("Usuário ou senha inválidos", "error");
        }
    });

    // Tab switching for fiscal view
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tabName}Tab`).classList.add('active');
        });
    });

    // PDF Generation
    window.generatePDF = function(index) {
        const relatorios = JSON.parse(localStorage.getItem('relatorios')) || [];
        const report = relatorios[index];

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(`Relatório ${report.tipo}`, 14, 22);
        doc.setFontSize(12);
        doc.text(`Data: ${report.data}`, 14, 30);
        doc.text(`Hora: ${report.hora}`, 14, 38);
        if (report.local) doc.text(`Local: ${report.local}`, 14, 46);
        doc.text(`Descrição:`, 14, 54);
        const splitDescription = doc.splitTextToSize(report.descricao, 180);
        doc.text(splitDescription, 14, 62);
        
        let yPosition = 62 + splitDescription.length * 7;

        if (report.progresso) {
            doc.text(`Progresso: ${report.progresso}%`, 14, yPosition);
            yPosition += 8;
        }
        
        if (report.problemas) {
            doc.text(`Problemas:`, 14, yPosition);
            const splitProblems = doc.splitTextToSize(report.problemas, 180);
            doc.text(splitProblems, 14, yPosition + 8);
            yPosition += 8 + splitProblems.length * 7;
        }

        if (report.imagem) {
            doc.addImage(report.imagem, 'JPEG', 14, yPosition, 180, 100);
            yPosition += 104;
        }

        if (report.assinatura) {
            doc.addImage(report.assinatura, 'PNG', 14, yPosition, 50, 25);
        }

        doc.save(`relatorio_${report.tipo}_${report.data.replace(/\//g, '-')}.pdf`);
    };

    // Edit report
    window.openEditModal = function(index) {
        currentEditIndex = index;
        const relatorios = JSON.parse(localStorage.getItem('relatorios')) || [];
        const report = relatorios[index];

        document.getElementById('editDescription').value = report.descricao;
        document.getElementById('editLocation').value = report.local || '';
        document.getElementById('editProgress').value = report.progresso || '';
        document.getElementById('editIssues').value = report.problemas || '';

        editModal.style.display = 'block';
    };

    closeModal.onclick = function() {
        editModal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target == editModal) {
            editModal.style.display = 'none';
        }
    };

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const relatorios = JSON.parse(localStorage.getItem('relatorios')) || [];
        const updatedReport = relatorios[currentEditIndex];

        updatedReport.descricao = document.getElementById('editDescription').value;
        updatedReport.local = document.getElementById('editLocation').value;
        updatedReport.progresso = document.getElementById('editProgress').value;
        updatedReport.problemas = document.getElementById('editIssues').value;

        relatorios[currentEditIndex] = updatedReport;
        localStorage.setItem('relatorios', JSON.stringify(relatorios));

        editModal.style.display = 'none';
        loadGestorRelatorios();
        showNotification("Relatório atualizado com sucesso", "success");
    });

    // Inicialmente, mostra a visão inicial
    updateNavigation();
});