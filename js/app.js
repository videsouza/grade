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

// Simulação de turmas cadastradas no banco de dados (Secretaria)
const bancoTurmasMock = [
    { id: 101, nome: "6º Ano A (Manhã)" },
    { id: 102, nome: "6º Ano B (Manhã)" },
    { id: 103, nome: "7º Ano A (Manhã)" },
    { id: 104, nome: "8º Ano A (Tarde)" },
    { id: 105, nome: "9º Ano A (Tarde)" }
];

function abrirModalTurmas() {
    const select = document.getElementById('selectTurmasDisponiveis');
    select.innerHTML = ''; // Limpa antes de renderizar
    
    // Filtra para mostrar apenas turmas que ainda NÃO foram adicionadas ao cenário
    const filtradas = bancoTurmasMock.filter(bt => !estadoGlobal.turmas_selecionadas.includes(bt.id));
    
    if (filtradas.length === 0) {
        select.innerHTML = '<option value="">Todas as turmas já foram vinculadas</option>';
    } else {
        filtradas.forEach(turma => {
            select.innerHTML += `<option value="${turma.id}">${turma.nome}</option>`;
        });
    }
    
    document.getElementById('modalTurmas').classList.add('active');
}

function fecharModalTurmas() {
    document.getElementById('modalTurmas').classList.remove('active');
}

function confirmarInclusaoTurma() {
    const select = document.getElementById('selectTurmasDisponiveis');
    const idSelecionado = parseInt(select.value);
    
    if (!idSelecionado) {
        fecharModalTurmas();
        return;
    }

    // Adiciona o ID ao array global
    estadoGlobal.turmas_selecionadas.push(idSelecionado);
    
    fecharModalTurmas();
    renderizarTabelaTurmas();
}

function removerTurmaCenario(id) {
    // Remove do array global
    estadoGlobal.turmas_selecionadas = estadoGlobal.turmas_selecionadas.filter(tId => tId !== id);
    renderizarTabelaTurmas();
}

function renderizarTabelaTurmas() {
    const tbody = document.getElementById('tabelaTurmasCenario');
    const msgValidacao = document.getElementById('msgValidacaoTurma');
    tbody.innerHTML = '';

    if (estadoGlobal.turmas_selecionadas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="empty-state">Nenhum registro encontrado</td></tr>`;
        return;
    }

    msgValidacao.style.display = 'none'; // Oculta o erro caso tenha itens

    // Varre as turmas selecionadas buscando os nomes no nosso Mock
    estadoGlobal.turmas_selecionadas.forEach(id => {
        const dadosTurma = bancoTurmasMock.find(bt => bt.id === id);
        if (dadosTurma) {
            tbody.innerHTML += `
                <tr>
                    <td>${dadosTurma.nome}</td>
                    <td>
                        <button class="btn-danger-icon" onclick="removerTurmaCenario(${id})">🗑 Excluir</button>
                    </td>
                </tr>
            `;
        }
    });
}

function salvarPasso2() {
    const msgValidacao = document.getElementById('msgValidacaoTurma');
    
    if (estadoGlobal.turmas_selecionadas.length === 0) {
        msgValidacao.style.display = 'block';
        return;
    }

    console.log("Passo 2 Salvo - Turmas vinculadas:", estadoGlobal.turmas_selecionadas);
    nextStep(3); // Vai para a matriz curricular
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
