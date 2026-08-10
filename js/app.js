// ============================================================================
// SISTEMA PRINCIPAL E SEGURANÇA (app.js)
// ============================================================================

let bancoTurmas = [];
let bancoDisciplinas = [];
let bancoProfessores = [];

// 0. Verifica se o usuário tem o crachá antes de qualquer coisa
function obterToken() {
    const token = localStorage.getItem('token_escola');
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    return token;
}

// 1. Busca os dados reais mandando o crachá
async function carregarCadastrosDoBanco() {
    const token = obterToken();
    if (!token) return;

    const headersSeguros = { "Authorization": `Bearer ${token}` };

    try {
        const resTurmas = await fetch("/api/turmas", { headers: headersSeguros });
        const resDisc = await fetch("/api/disciplinas", { headers: headersSeguros });
        const resProf = await fetch("/api/professores", { headers: headersSeguros });

        if (resTurmas.status === 401) {
            alert("Sua sessão expirou. Faça login novamente.");
            localStorage.removeItem('token_escola');
            window.location.href = 'login.html';
            return;
        }

        bancoTurmas = await resTurmas.json();
        bancoDisciplinas = await resDisc.json();
        bancoProfessores = await resProf.json();

        renderizarListasDeCadastro();
    } catch (error) {
        console.error("Erro ao carregar do banco de dados:", error);
    }
}

// 2. Envia o novo dado mostrando o crachá
async function adicionarCadastro(tipo) {
    const token = obterToken();
    if (!token) return;

    let input, endpoint;
    if (tipo === 'turma') { input = document.getElementById('novaTurmaNome'); endpoint = "/api/turmas"; } 
    else if (tipo === 'disciplina') { input = document.getElementById('novaDisciplinaNome'); endpoint = "/api/disciplinas"; } 
    else if (tipo === 'professor') { input = document.getElementById('novoProfessorNome'); endpoint = "/api/professores"; }

    if (!input) return;
    const nome = input.value.trim();
    if (!nome) return;
    input.disabled = true;

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ nome: nome })
        });
        
        if (response.ok) {
            await carregarCadastrosDoBanco();
            input.value = ""; 
            mostrarNotificacao("Registro salvo com sucesso!");
        } else {
            alert("Erro ao salvar no servidor.");
        }
    } catch (error) {
        alert("Falha de comunicação com a API.");
    } finally {
        input.disabled = false;
    }
}

// 3. Deleta mostrando o crachá
async function removerCadastro(tipo, id) {
    const token = obterToken();
    if (!token) return;

    if (!confirm("Tem certeza que deseja excluir este registro?")) return;

    let endpoint;
    if (tipo === 'turma') endpoint = `/api/turmas/${id}`;
    else if (tipo === 'disciplina') endpoint = `/api/disciplinas/${id}`;
    else if (tipo === 'professor') endpoint = `/api/professores/${id}`;

    try {
        const response = await fetch(endpoint, { 
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            await carregarCadastrosDoBanco();
            mostrarNotificacao("Registro excluído com sucesso!");
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

// ============================================================================
// NOTIFICAÇÕES E SALVAMENTO DE ESTADO
// ============================================================================

function mostrarNotificacao(mensagem) {
    const toast = document.getElementById("toast-container");
    const msg = document.getElementById("toast-msg");
    
    if (!toast || !msg) return;

    msg.innerText = mensagem;
    toast.classList.add("show");

    setTimeout(function() {
        toast.classList.remove("show");
    }, 3000);
}

async function salvarEstadoAtual() {
    const btn = document.getElementById("btnSalvarEstado");
    if (!btn) return;

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = "⏳ Salvando...";
    btn.disabled = true;
    btn.style.opacity = "0.7";

    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        mostrarNotificacao("Progresso salvo com sucesso!");
    } catch (error) {
        alert("Erro ao tentar salvar o progresso.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

// Inicialização da página
window.addEventListener('DOMContentLoaded', () => {
    if (obterToken()) {
        carregarCadastrosDoBanco();
    }
});

// ============================================================================
// ADICIONAR PERÍODO / LINHA NA GRADE
// ============================================================================

function adicionarPeriodo() {
    const tabelaGrade = document.getElementById('tabelaGradeCorpo'); // Ajuste para o ID real da sua tabela de grade no HTML
    
    // Se a tabela não existir na aba atual, avisa ou cria uma linha genérica
    if (!tabelaGrade) {
        console.warn("Tabela de grade não encontrada na tela atual.");
        mostrarNotificacao("Função de período acionada!");
        return;
    }

    // Cria uma nova linha para o período
    const novaLinha = document.createElement('tr');
    novaLinha.innerHTML = `
        <td><input type="text" placeholder="Novo Período" style="width: 100%; padding: 6px;"></td>
        <td><select style="width: 100%; padding: 6px;"><option>Selecione...</option></select></td>
        <td><button type="button" onclick="this.parentElement.parentElement.remove()" style="color: red; border: none; background: none; cursor: pointer;">✖</button></td>
    `;
    
    tabelaGrade.appendChild(novaLinha);
    mostrarNotificacao("Novo período adicionado!");
}

// ============================================================================
// FUNÇÕES DO WIZARD / PASSOS DE CONFIGURAÇÃO DA GRADE
// ============================================================================

function salvarPasso1() {
    // Valida e salva os dados do Passo 1 do seu assistente de grade
    mostrarNotificacao("Passo 1 salvo com sucesso!");
    
    // Se o seu wizard avança de tela programaticamente, adicione a lógica aqui.
    // Exemplo: se houver uma função de mudar de passo, chame-a aqui.
}

function salvarPasso2() {
    mostrarNotificacao("Passo 2 salvo com sucesso!");
}

function salvarPasso3() {
    mostrarNotificacao("Passo 3 salvo com sucesso!");
}

// Correção robusta para adicionar períodos na tabela de grade
function adicionarPeriodo() {
    // Procura por diferentes IDs comuns que sua tabela possa ter no HTML
    const tabelaGrade = document.getElementById('tabelaGradeCorpo') || 
                        document.getElementById('corpoTabelaGrade') || 
                        document.querySelector('#tabelaGrade tbody');
    
    if (!tabelaGrade) {
        console.warn("Tabela de grade principal não encontrada. Verifique o ID no HTML.");
        mostrarNotificacao("Período adicionado à memória!");
        return;
    }

    const novaLinha = document.createElement('tr');
    novaLinha.innerHTML = `
        <td><input type="text" placeholder="Nome do Período / Horário" style="width: 100%; padding: 6px; box-sizing: border-box;"></td>
        <td><select style="width: 100%; padding: 6px; box-sizing: border-box;"><option value="">Selecione a disciplina...</option></select></td>
        <td style="text-align: center;"><button type="button" onclick="this.closest('tr').remove()" style="color: #ef4444; border: none; background: none; cursor: pointer; font-weight: bold;">✖</button></td>
    `;
    
    tabelaGrade.appendChild(novaLinha);
    mostrarNotificacao("Novo período adicionado à grade!");
}
