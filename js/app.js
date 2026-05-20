let currentStep = 1;

function updateStepper(step) {
    // Remove classe ativa de todos
    document.querySelectorAll('.step-indicator').forEach(el => el.classList.remove('active'));
    // Adiciona classe ativa no passo atual
    document.getElementById(`ind-${step}`).classList.add('active');
}

function nextStep(step) {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    updateStepper(step);
}

function prevStep(step) {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    updateStepper(step);
}

async function gerarGradeFinal() {
    // Mantém o código do fetch que já criamos
    alert("Iniciando processamento no backend...");
}

function nextStep(step) {
    document.getElementById(`step${currentStep}`).style.display = 'none';
    currentStep = step;
    document.getElementById(`step${currentStep}`).style.display = 'block';
}

function prevStep(step) {
    document.getElementById(`step${currentStep}`).style.display = 'none';
    currentStep = step;
    document.getElementById(`step${currentStep}`).style.display = 'block';
}

async function gerarGradeFinal() {
    // Aqui você coletaria os dados de todos os steps
    const payload = {
        cenario: { dias_semana: [1, 2, 3, 4, 5], periodos: [{ordem: 1}, {ordem: 2}] },
        turmas_selecionadas: [1],
        matrizes_curriculares: [{ turma_id: 1, disciplina_id: 1, professor_id: 1, carga_horaria: 2 }],
        disponibilidades_professores: []
    };

    try {
        const response = await fetch("/api/gerar-grade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (data.status === "sucesso") {
            alert("Grade gerada! Verifique o console.");
            console.log(data.grade);
        } else {
            alert("Erro: " + data.mensagem);
        }
    } catch (e) {
        alert("Erro ao conectar no servidor");
    }
}
