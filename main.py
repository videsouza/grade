from fastapi import FastAPI
from pydantic import BaseModel
from ortools.sat.python import cp_model
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI()

import sqlite3
from pydantic import BaseModel

# ============================================================================
# 1. CONFIGURAÇÃO DO BANCO DE DADOS (SQLite)
# ============================================================================

def init_db():
    # Conecta (ou cria se não existir) o arquivo do banco de dados
    conn = sqlite3.connect("banco_escola.db")
    cursor = conn.cursor()
    
    # Cria as tabelas caso seja a primeira vez rodando
    cursor.execute("CREATE TABLE IF NOT EXISTS turmas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS disciplinas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS professores (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT)")
    
    conn.commit()
    conn.close()

# Roda a inicialização assim que o servidor subir
init_db()

# Modelo de dados que o FastAPI vai esperar receber do Frontend
class ItemCadastro(BaseModel):
    nome: str

def get_db_connection():
    conn = sqlite3.connect("banco_escola.db")
    conn.row_factory = sqlite3.Row # Permite acessar as colunas pelo nome
    return conn

# 1. SERVIR ARQUIVOS ESTÁTICOS (JS e CSS)
# Isso permite que seu HTML encontre seus arquivos de script e estilo
app.mount("/js", StaticFiles(directory="js"), name="js")
app.mount("/css", StaticFiles(directory="css"), name="css")

# 2. ROTA RAIZ (Quando alguém acessa o site sem nada na frente)
@app.get("/")
def read_root():
    return FileResponse("index.html")

# --- MANTENHA A SUA ROTA DE API ABAIXO ---
# ... (seu código da função gerar_grade aqui) ...

class PayloadGrade(BaseModel):
    cenario: dict
    turmas_selecionadas: list
    matrizes_curriculares: list
    disponibilidades_professores: list

# ============================================================================
# 2. ROTAS DE CADASTRO BÁSICO (API)
# ============================================================================

# --- TURMAS ---
@app.get("/api/turmas")
def listar_turmas():
    conn = get_db_connection()
    turmas = conn.execute("SELECT id, nome FROM turmas").fetchall()
    conn.close()
    return [{"id": t["id"], "nome": t["nome"]} for t in turmas]

@app.post("/api/turmas")
def criar_turma(item: ItemCadastro):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO turmas (nome) VALUES (?)", (item.nome,))
    conn.commit()
    novo_id = cursor.lastrowid
    conn.close()
    return {"id": novo_id, "nome": item.nome}

# --- DISCIPLINAS ---
@app.get("/api/disciplinas")
def listar_disciplinas():
    conn = get_db_connection()
    disciplinas = conn.execute("SELECT id, nome FROM disciplinas").fetchall()
    conn.close()
    return [{"id": d["id"], "nome": d["nome"]} for d in disciplinas]

@app.post("/api/disciplinas")
def criar_disciplina(item: ItemCadastro):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO disciplinas (nome) VALUES (?)", (item.nome,))
    conn.commit()
    novo_id = cursor.lastrowid
    conn.close()
    return {"id": novo_id, "nome": item.nome}

# --- PROFESSORES ---
@app.get("/api/professores")
def listar_professores():
    conn = get_db_connection()
    professores = conn.execute("SELECT id, nome FROM professores").fetchall()
    conn.close()
    return [{"id": p["id"], "nome": p["nome"]} for p in professores]

@app.post("/api/professores")
def criar_professor(item: ItemCadastro):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO professores (nome) VALUES (?)", (item.nome,))
    conn.commit()
    novo_id = cursor.lastrowid
    conn.close()
    return {"id": novo_id, "nome": item.nome}

# --- ROTAS DE EXCLUSÃO (DELETE) ---

@app.delete("/api/turmas/{item_id}")
def deletar_turma(item_id: int):
    conn = get_db_connection()
    conn.execute("DELETE FROM turmas WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"status": "sucesso"}

@app.delete("/api/disciplinas/{item_id}")
def deletar_disciplina(item_id: int):
    conn = get_db_connection()
    conn.execute("DELETE FROM disciplinas WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"status": "sucesso"}

@app.delete("/api/professores/{item_id}")
def deletar_professor(item_id: int):
    conn = get_db_connection()
    conn.execute("DELETE FROM professores WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"status": "sucesso"}

@app.post("/api/gerar-grade")
def gerar_grade(dados: PayloadGrade):
    modelo = cp_model.CpModel()
    
    dias = dados.cenario["dias_semana"]
    periodos = [p["ordem"] for p in dados.cenario["periodos"]]
    variaveis = {}
    
    # 1. CRIANDO AS VARIÁVEIS
    for index_matriz, matriz in enumerate(dados.matrizes_curriculares):
        turma_id = matriz["turma_id"]
        for dia in dias:
            for periodo in periodos:
                nome_var = f"X_m{index_matriz}_t{turma_id}_d{dia}_p{periodo}"
                variaveis[(turma_id, index_matriz, dia, periodo)] = modelo.NewBoolVar(nome_var)

    # 2. RESTRIÇÕES RÍGIDAS (Hard Constraints)
    professores_ids = set([m["professor_id"] for m in dados.matrizes_curriculares])
    turmas_ids = dados.turmas_selecionadas
    
    for dia in dias:
        for periodo in periodos:
            # R1: Um professor não pode dar duas aulas ao mesmo tempo
            for prof_id in professores_ids:
                aulas_do_prof = [
                    variaveis[(matriz["turma_id"], index_matriz, dia, periodo)]
                    for index_matriz, matriz in enumerate(dados.matrizes_curriculares)
                    if matriz["professor_id"] == prof_id
                ]
                if aulas_do_prof:
                    modelo.AddAtMostOne(aulas_do_prof)
                    
            # R2: Uma turma não pode ter duas aulas ao mesmo tempo
            for turma_id in turmas_ids:
                aulas_da_turma = [
                    variaveis[(turma_id, index_matriz, dia, periodo)]
                    for index_matriz, matriz in enumerate(dados.matrizes_curriculares)
                    if matriz["turma_id"] == turma_id
                ]
                if aulas_da_turma:
                    modelo.AddAtMostOne(aulas_da_turma)

    # R3: A carga horária da disciplina DEVE ser cumprida
    for index_matriz, matriz in enumerate(dados.matrizes_curriculares):
        turma_id = matriz["turma_id"]
        carga_exigida = matriz["carga_horaria"]
        
        todas_aulas_desta_disciplina = [
            variaveis[(turma_id, index_matriz, dia, periodo)]
            for dia in dias for periodo in periodos
        ]
        modelo.Add(sum(todas_aulas_desta_disciplina) == carga_exigida)

    # R4: Respeitar a indisponibilidade do professor
    mapa_indisp = {p["professor_id"]: p["indisponibilidades"] for p in dados.disponibilidades_professores}
    for index_matriz, matriz in enumerate(dados.matrizes_curriculares):
        prof_id = matriz["professor_id"]
        turma_id = matriz["turma_id"]
        if prof_id in mapa_indisp:
            for bloqueio in mapa_indisp[prof_id]:
                dia_bloqueado = bloqueio["dia"]
                periodo_bloqueado = bloqueio["periodo"]
                if dia_bloqueado in dias and periodo_bloqueado in periodos:
                    modelo.Add(variaveis[(turma_id, index_matriz, dia_bloqueado, periodo_bloqueado)] == 0)

    # R5: Máximo de aulas por dia (NMAP)
    for index_matriz, matriz in enumerate(dados.matrizes_curriculares):
        turma_id = matriz["turma_id"]
        max_por_dia = matriz.get("max_aulas_dia", 2) 
        
        for dia in dias:
            aulas_neste_dia = [
                variaveis[(turma_id, index_matriz, dia, periodo)]
                for periodo in periodos
            ]
            modelo.Add(sum(aulas_neste_dia) <= max_por_dia)

    # R6: Aulas Geminadas (Dobradinhas)
    for index_matriz, matriz in enumerate(dados.matrizes_curriculares):
        turma_id = matriz["turma_id"]
        # Pega a regra do JSON. Se for 2, o sistema entende que não pode haver aula isolada.
        geminadas = matriz.get("aulas_geminadas", 1) 
        
        if geminadas == 2:
            for dia in dias:
                # Precisamos usar o índice do período para saber quem vem antes e quem vem depois
                for i in range(len(periodos)):
                    periodo_atual = periodos[i]
                    var_atual = variaveis[(turma_id, index_matriz, dia, periodo_atual)]
                    
                    vizinhos = []
                    # Se NÃO for o primeiro período do dia, pegamos o período anterior
                    if i > 0:
                        periodo_anterior = periodos[i - 1]
                        vizinhos.append(variaveis[(turma_id, index_matriz, dia, periodo_anterior)])
                        
                    # Se NÃO for o último período do dia, pegamos o próximo período
                    if i < len(periodos) - 1:
                        periodo_proximo = periodos[i + 1]
                        vizinhos.append(variaveis[(turma_id, index_matriz, dia, periodo_proximo)])
                    
                    # A Mágica: Se var_atual for 1 (teve aula), a soma dos vizinhos tem que ser pelo menos 1 (teve aula grudada).
                    # Equação: var_atual <= vizinho_anterior + vizinho_proximo
                    modelo.Add(var_atual <= sum(vizinhos))

  
    # ====================================================================
    # 3. O SOLVER (Processamento e Extração)
    # ====================================================================
    
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60.0 
    
    status = solver.Solve(modelo)
    
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        grade_final = []
        
        for (turma_id, index_matriz, dia, periodo), var in variaveis.items():
            if solver.Value(var) == 1:
                matriz = dados.matrizes_curriculares[index_matriz]
                grade_final.append({
                    "turma_id": turma_id,
                    "dia": dia,
                    "periodo": periodo,
                    "disciplina_id": matriz.get("disciplina_id", "Desconhecida"),
                    "professor_id": matriz["professor_id"]
                })
        
        return {
            "status": "sucesso", 
            "mensagem": "Grade gerada com sucesso!",
            "total_aulas_alocadas": len(grade_final),
            "grade": grade_final
        }
    else:
        return {
            "status": "erro", 
            "mensagem": "Inviável. O algoritmo não conseguiu encontrar uma combinação possível com as regras atuais."
        }
