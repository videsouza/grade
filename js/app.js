// O "pacote" que vai acumular todos os dados
const estadoGlobal = {
    cenario: { nome: "", dias_semana: [], periodos: [] },
    turmas_selecionadas: [],
    matrizes_curriculares: [],
    disponibilidades_professores: []
};

// Controle de Períodos Dinâmicos
let contadorPeriodos = 0;

function adicionarPeriodo(inicio = "", fim = "") {
    contadorPeriodos++;
    const tbody = document.getElementById('listaPeriodos');
    const tr = document.createElement('tr');
    tr.id = `periodo-${contadorPeriodos}`;
    
    tr.innerHTML = `
        <td>${contadorPeriodos}ª Aula</td>
        <td><input type="time" class="time-input inicio" value="${inicio}" required></td>
        <td><input type="time" class="time-input fim" value="${fim}" required></td>
    `;
    tbody.appendChild(tr);
}

// Inicializa a tela com 5 aulas padrão para facilitar a vida do usuário
window.onload = () => {
    adicionarPeriodo("07:00", "07:50");
    adicionarPeriodo("07:50", "08:40");
    adicionarPeriodo("08:40", "09:30");
    adicionarPeriodo("09:45", "10:35");
    adicionarPeriodo("10:35", "11:25");
};

// Quando clica em "Avançar" na Tela 1
function salvarPasso1() {
    const nome = document.getElementById('nomeCenario').value;
    if (!nome) {
        alert("Por favor, preencha o nome do cenário.");
        return;
    }

    // Coleta os dias marcados
    const checkboxes = document.querySelectorAll('input[name="dias"]:checked');
    const dias = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (dias.length === 0) {
        alert("Selecione pelo menos um dia da semana.");
        return;
    }

    // Coleta os períodos
    const linhas = document.querySelectorAll('#listaPeriodos tr');
    const periodos = [];
    
    linhas.forEach((linha, index) => {
        const inicio = linha.querySelector('.inicio').value;
        const fim = linha.querySelector('.fim').value;
        periodos.push({
            ordem: index + 1,
            inicio: inicio,
            fim: fim
        });
    });

    // Salva no nosso pacote global
    estadoGlobal.cenario.nome = nome;
    estadoGlobal.cenario.dias_semana = dias;
    estadoGlobal.cenario.periodos = periodos;

    console.log("Passo 1 Salvo:", estadoGlobal.cenario);
    
    // Avança visualmente para a Tela 2
    nextStep(2);
}

// (Mantenha as funções nextStep, prevStep e updateStepper que já estavam aqui)

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
