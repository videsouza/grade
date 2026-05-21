// ============================================================================
// 1. VARIÁVEIS GLOBAIS E NAVEGAÇÃO
// ============================================================================

let currentStep = 1;

// O "pacote" que vai acumular todos os dados
const estadoGlobal = {
    cenario: { nome: "", dias_semana: [], periodos: [] },
    turmas_selecionadas: [],
    matrizes_curriculares: [],
    disponibilidades_professores: []
};

function updateStepper(step) {
    document.querySelectorAll('.step-indicator').forEach(el => el.classList.remove('active'));
    const indicadorAtual = document.getElementById(`ind-${step}`);
    if (indicadorAtual) {
        indicadorAtual.classList.add('active');
    }
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

// ============================================================================
// 2. LÓGICA DA TELA 1 (CENÁRIO)
// ============================================================================

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

// Quando a página carrega, insere os 5 horários padrão da manhã
window.onload = () => {
    adicionarPeriodo("07:00", "07:50");
    adicionarPeriodo("07:50", "08:40");
    adicionarPeriodo("08:40", "09:30");
    adicionarPeriodo("09:45", "10:35");
    adicionarPeriodo("10:35", "11:25");
};

function salvarPasso1() {
    const nome = document.getElementById('nomeCenario').value;
    if (!nome) {
        alert("Por favor, preencha o nome do cenário.");
        return;
    }

    const checkboxes = document.querySelectorAll('input[name="dias"]:checked');
    const dias = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (dias.length === 0) {
        alert("Selecione pelo menos um dia da semana.");
        return;
    }

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

    estadoGlobal.cenario.nome = nome;
    estadoGlobal.cenario.dias_semana = dias;
    estadoGlobal.cenario.periodos = periodos;

    console.log("Passo 1 Salvo:", estadoGlobal.cenario);
    nextStep(2);
}

// ============================================================================
// 3. LÓGICA DA TELA 2 (TURMAS)
// ============================================================================

// ============================================================================
// SISTEMA DE CADASTROS DINÂMICOS (Conectado ao Banco de Dados Python)
// ============================================================================

let bancoTurmas = [];
let bancoDisciplinas = [];
let bancoProfessores = [];

// 1. Busca os dados reais do servidor Python quando a página carrega
async function carregarCadastrosDoBanco() {
    try {
        const resTurmas = await fetch("/api/turmas");
        bancoTurmas = await resTurmas.json();

        const resDisc = await fetch("/api/disciplinas");
        bancoDisciplinas = await resDisc.json();

        const resProf = await fetch("/api/professores");
        bancoProfessores = await resProf.json();

        renderizarListasDeCadastro();
    } catch (error) {
        console.error("Erro ao carregar do banco de dados:", error);
    }
}

// 2. Envia o novo dado para o servidor Python salvar
async function adicionarCadastro(tipo) {
    let input, endpoint;

    if (tipo === 'turma') {
        input = document.getElementById('novaTurmaNome');
        endpoint = "/api/turmas";
    } else if (tipo === 'disciplina') {
        input = document.getElementById('novaDisciplinaNome');
        endpoint = "/api/disciplinas";
    } else if (tipo === 'professor') {
        input = document.getElementById('novoProfessorNome');
        endpoint = "/api/professores";
    }

    const nome = input.value.trim();
    if (!nome) return;

    input.disabled = true; // Trava o campo enquanto salva

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: nome })
        });
        
        if (response.ok) {
            // Se salvou com sucesso, busca a lista atualizada do banco
            await carregarCadastrosDoBanco();
            input.value = ""; 
        } else {
            alert("Erro ao salvar no servidor.");
        }
    } catch (error) {
        alert("Falha de comunicação com a API.");
    } finally {
        input.disabled = false;
    }
}

// 3. Deleta o dado real no banco
async function removerCadastro(tipo, id) {
    // Adicionamos uma confirmação por segurança
    if (!confirm("Tem certeza que deseja excluir este registro?")) {
        return;
    }

    let endpoint;
    if (tipo === 'turma') endpoint = `/api/turmas/${id}`;
    else if (tipo === 'disciplina') endpoint = `/api/disciplinas/${id}`;
    else if (tipo === 'professor') endpoint = `/api/professores/${id}`;

    try {
        const response = await fetch(endpoint, { 
            method: "DELETE" 
        });
        
        if (response.ok) {
            // Se apagou com sucesso no servidor, busca a lista atualizada
            await carregarCadastrosDoBanco();
        } else {
            alert("Erro ao tentar excluir no servidor.");
        }
    } catch (error) {
        alert("Falha de comunicação com a API.");
    }
}

function renderizarListasDeCadastro() {
    const ulTurmas = document.getElementById('listaCadTurmas');
    const ulDisc = document.getElementById('listaCadDisciplinas');
    const ulProf = document.getElementById('listaCadProfessores');

    if(!ulTurmas || !ulDisc || !ulProf) return; 

    ulTurmas.innerHTML = bancoTurmas.map(i => `<li style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom:1px solid #ddd; padding-bottom:5px;">${i.nome} <span style="color:red; cursor:pointer;" onclick="removerCadastro('turma', ${i.id})">✖</span></li>`).join('');
    ulDisc.innerHTML = bancoDisciplinas.map(i => `<li style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom:1px solid #ddd; padding-bottom:5px;">${i.nome} <span style="color:red; cursor:pointer;" onclick="removerCadastro('disciplina', ${i.id})">✖</span></li>`).join('');
    ulProf.innerHTML = bancoProfessores.map(i => `<li style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom:1px solid #ddd; padding-bottom:5px;">${i.nome} <span style="color:red; cursor:pointer;" onclick="removerCadastro('professor', ${i.id})">✖</span></li>`).join('');
}

// Controle das Abas Principais
function mostrarAba(aba) {
    if (aba === 'cadastros') {
        document.getElementById('aba-cadastros').style.display = 'block';
        document.getElementById('aba-grade').style.display = 'none';
        renderizarListasDeCadastro();
    } else {
        document.getElementById('aba-cadastros').style.display = 'none';
        document.getElementById('aba-grade').style.display = 'block';
    }
}

// Quando a página abrir, vai lá no Python buscar os dados
window.addEventListener('DOMContentLoaded', carregarCadastrosDoBanco);

// Inicia as listas assim que a página abre
window.addEventListener('DOMContentLoaded', renderizarListasDeCadastro);

function abrirModalTurmas() {
    const select = document.getElementById('selectTurmasDisponiveis');
    select.innerHTML = ''; 
    
    const filtradas = bancoTurmas.filter(bt => !estadoGlobal.turmas_selecionadas.includes(bt.id));
    
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

    estadoGlobal.turmas_selecionadas.push(idSelecionado);
    fecharModalTurmas();
    renderizarTabelaTurmas();
}

function removerTurmaCenario(id) {
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

    msgValidacao.style.display = 'none'; 

    estadoGlobal.turmas_selecionadas.forEach(id => {
        const dadosTurma = bancoTurmas.find(bt => bt.id === id);
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
    carregarSelectsMatriz();
    nextStep(3);
}

// ============================================================================
// 3.5 LÓGICA DA TELA 3 (MATRIZ CURRICULAR)
// ============================================================================



let contadorIdMatriz = 0; // Para gerar um ID único para cada linha adicionada

// Esta função prepara os "selects" da Tela 3
function carregarSelectsMatriz() {
    // 1. Carrega as Turmas (apenas as que foram selecionadas no Passo 2)
    const selectTurma = document.getElementById('matrizTurma');
    selectTurma.innerHTML = '<option value="">Selecione...</option>';
    estadoGlobal.turmas_selecionadas.forEach(id => {
        const turma = bancoTurmas.find(t => t.id === id);
        if (turma) selectTurma.innerHTML += `<option value="${turma.id}">${turma.nome}</option>`;
    });

    // 2. Carrega as Disciplinas
    const selectDisc = document.getElementById('matrizDisciplina');
    selectDisc.innerHTML = '<option value="">Selecione...</option>';
    bancoDisciplinas.forEach(d => {
        selectDisc.innerHTML += `<option value="${d.id}">${d.nome}</option>`;
    });

    // 3. Carrega os Professores
    const selectProf = document.getElementById('matrizProfessor');
    selectProf.innerHTML = '<option value="">Selecione...</option>';
    bancoProfessores.forEach(p => {
        selectProf.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
    });
}

function adicionarLinhaMatriz() {
    const turmaId = parseInt(document.getElementById('matrizTurma').value);
    const disciplinaId = parseInt(document.getElementById('matrizDisciplina').value);
    const professorId = parseInt(document.getElementById('matrizProfessor').value);
    const cargaHoraria = parseInt(document.getElementById('matrizCarga').value);
    const maxDia = parseInt(document.getElementById('matrizMaxDia').value);
    const geminadas = parseInt(document.getElementById('matrizGeminada').value);

    if (!turmaId || !disciplinaId || !professorId || isNaN(cargaHoraria)) {
        alert("Preencha Turma, Disciplina, Professor e Carga Horária.");
        return;
    }

    contadorIdMatriz++;
    const novaRegra = {
        _id_temp: contadorIdMatriz, // Apenas para controle no front-end
        turma_id: turmaId,
        disciplina_id: disciplinaId,
        professor_id: professorId,
        carga_horaria: cargaHoraria,
        max_aulas_dia: maxDia,
        aulas_geminadas: geminadas
    };

    estadoGlobal.matrizes_curriculares.push(novaRegra);
    
    // Limpa alguns campos para facilitar a próxima inserção
    document.getElementById('matrizDisciplina').value = "";
    document.getElementById('matrizCarga').value = "5";
    
    renderizarTabelaMatriz();
}

function removerLinhaMatriz(idTemp) {
    estadoGlobal.matrizes_curriculares = estadoGlobal.matrizes_curriculares.filter(m => m._id_temp !== idTemp);
    renderizarTabelaMatriz();
}

function renderizarTabelaMatriz() {
    const tbody = document.getElementById('tabelaMatriz');
    const msgValidacao = document.getElementById('msgValidacaoMatriz');
    tbody.innerHTML = '';

    if (estadoGlobal.matrizes_curriculares.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Nenhuma disciplina vinculada</td></tr>`;
        return;
    }

    msgValidacao.style.display = 'none';

    estadoGlobal.matrizes_curriculares.forEach(regra => {
        const turma = bancoTurmas.find(t => t.id === regra.turma_id)?.nome || "Desconhecida";
        const disc = bancoDisciplinas.find(d => d.id === regra.disciplina_id)?.nome || "Desconhecida";
        const prof = bancoProfessores.find(p => p.id === regra.professor_id)?.nome || "Desconhecido";

        tbody.innerHTML += `
            <tr>
                <td>${turma}</td>
                <td>${disc}</td>
                <td>${prof}</td>
                <td>${regra.carga_horaria} aulas</td>
                <td>
                    <button class="btn-danger-icon" onclick="removerLinhaMatriz(${regra._id_temp})">🗑 Excluir</button>
                </td>
            </tr>
        `;
    });
}

function salvarPasso3() {
    const msgValidacao = document.getElementById('msgValidacaoMatriz');
    
    if (estadoGlobal.matrizes_curriculares.length === 0) {
        msgValidacao.style.display = 'block';
        return;
    }

    console.log("Passo 3 Salvo - Matriz:", estadoGlobal.matrizes_curriculares);
    
    // --> NOVA LINHA AQUI <-- Prepara a grade da Tela 4
    prepararTela4();
    
    nextStep(4);
}

// ============================================================================
// 4. LÓGICA DA TELA 4 E ENVIO PARA O BACKEND
// ============================================================================

const nomesDias = {1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta", 6: "Sábado", 7: "Domingo"};

function prepararTela4() {
    const select = document.getElementById('selectProfDisponibilidade');
    select.innerHTML = '';
    
    // Pega apenas os professores que foram utilizados na matriz curricular (Passo 3)
    const profsNaMatriz = [...new Set(estadoGlobal.matrizes_curriculares.map(m => m.professor_id))];
    
    if (profsNaMatriz.length === 0) {
        select.innerHTML = '<option value="">Nenhum professor na matriz</option>';
        document.getElementById('containerGradeDisponibilidade').innerHTML = '';
        return;
    }

    profsNaMatriz.forEach(id => {
        const prof = bancoProfessores.find(p => p.id === id);
        if (prof) select.innerHTML += `<option value="${prof.id}">${prof.nome}</option>`;
    });

    // Desenha a grade para o primeiro professor da lista
    mudarProfessorDisponibilidade();
}

function mudarProfessorDisponibilidade() {
    const profId = parseInt(document.getElementById('selectProfDisponibilidade').value);
    if (!profId) return;
    desenharGradeDisponibilidade(profId);
}

function desenharGradeDisponibilidade(profId) {
    const container = document.getElementById('containerGradeDisponibilidade');
    const dias = estadoGlobal.cenario.dias_semana;
    const periodos = estadoGlobal.cenario.periodos;

    let html = '<table class="data-table tabela-interativa"><thead><tr><th>Horário</th>';
    
    dias.forEach(dia => { html += `<th>${nomesDias[dia] || 'Dia '+dia}</th>`; });
    html += '</tr></thead><tbody>';

    periodos.forEach(periodo => {
        html += `<tr><td><strong>${periodo.ordem}ª Aula</strong><br><small>${periodo.inicio} - ${periodo.fim}</small></td>`;
        
        dias.forEach(dia => {
            // Verifica se este bloco já está marcado como indisponível no estado global
            let bloqueado = false;
            const profDisp = estadoGlobal.disponibilidades_professores.find(dp => dp.professor_id === profId);
            if (profDisp) {
                bloqueado = profDisp.indisponibilidades.some(ind => ind.dia === dia && ind.periodo === periodo.ordem);
            }
            
            const classe = bloqueado ? 'celula-horario bloqueado' : 'celula-horario';
            const texto = bloqueado ? 'Indisponível' : 'Livre';
            
            html += `<td class="${classe}" onclick="toggleDisponibilidade(this, ${profId}, ${dia}, ${periodo.ordem})">${texto}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function toggleDisponibilidade(celula, profId, dia, periodo) {
    let profDisp = estadoGlobal.disponibilidades_professores.find(dp => dp.professor_id === profId);
    if (!profDisp) {
        profDisp = { professor_id: profId, indisponibilidades: [] };
        estadoGlobal.disponibilidades_professores.push(profDisp);
    }

    const indexBloqueio = profDisp.indisponibilidades.findIndex(ind => ind.dia === dia && ind.periodo === periodo);

    if (indexBloqueio >= 0) {
        // Estava bloqueado -> Fica Livre
        profDisp.indisponibilidades.splice(indexBloqueio, 1);
        celula.classList.remove('bloqueado');
        celula.innerText = 'Livre';
    } else {
        // Estava livre -> Fica Bloqueado
        profDisp.indisponibilidades.push({ dia: dia, periodo: periodo, tipo: "Indisponível" });
        celula.classList.add('bloqueado');
        celula.innerText = 'Indisponível';
    }
}


function renderizarGradePronta(gradeFinal) {
    // Esconde a Tela 4 e mostra a Tela 5
    document.getElementById('step4').classList.remove('active');
    document.getElementById('step5').classList.add('active');

    const container = document.getElementById('tabelasResultado');
    container.innerHTML = '';

    // Descobre quais turmas têm aulas nessa grade
    const turmasIds = [...new Set(gradeFinal.map(a => a.turma_id))];

    const dias = estadoGlobal.cenario.dias_semana;
    const periodos = estadoGlobal.cenario.periodos;

    // Para cada turma, desenhamos uma tabela
    turmasIds.forEach(tId => {
        const turmaNome = bancoTurmas.find(t => t.id === tId)?.nome || `Turma ${tId}`;
        
        let html = `<h3 style="margin-top: 30px; color: var(--primary-color); border-bottom: 2px solid var(--border-color); padding-bottom: 10px;">${turmaNome}</h3>`;
        html += '<table class="data-table tabela-interativa" style="margin-top: 15px;"><thead><tr><th>Horário</th>';

        // Cabeçalho dos dias
        dias.forEach(dia => { html += `<th>${nomesDias[dia]}</th>`; });
        html += '</tr></thead><tbody>';

        // Linhas dos períodos (horários)
        periodos.forEach(periodo => {
            html += `<tr><td><strong>${periodo.ordem}ª Aula</strong></td>`;
            
            dias.forEach(dia => {
                // Procura se o algoritmo colocou alguma aula para essa turma, nesse dia e horário
                const aula = gradeFinal.find(a => a.turma_id === tId && a.dia === dia && a.periodo === periodo.ordem);
                
                if (aula) {
                    const discNome = bancoDisciplinas.find(d => d.id === aula.disciplina_id)?.nome || 'Disciplina';
                    const profNome = bancoProfessores.find(p => p.id === aula.professor_id)?.nome || 'Professor';
                    
                    html += `<td style="background-color: #e3f2fd; border: 1px solid #90caf9;">
                        <strong style="color: #0d47a1;">${discNome}</strong><br>
                        <small style="color: #1565c0;">${profNome}</small>
                    </td>`;
                } else {
                    html += `<td style="color: #ccc;">-</td>`; // Janela livre
                }
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML += html;
    });
}

// O GRANDE MOMENTO: Envio para o Python
async function gerarGradeFinal() {
    const btn = document.getElementById('btnFinalizar');
    const textoOriginal = btn.innerText;
    btn.innerText = "Calculando Matemática... Aguarde";
    btn.disabled = true;

    try {
        console.log("Enviando pacote para o servidor:", estadoGlobal);
        
        const response = await fetch("/api/gerar-grade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(estadoGlobal)
        });

        const data = await response.json();

        if (data.status === "sucesso") {
            renderizarGradePronta(data.grade);
        } else {
            alert("O algoritmo não conseguiu fechar a grade. Motivo: " + data.mensagem);
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert("Erro de comunicação com o servidor.");
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
}
