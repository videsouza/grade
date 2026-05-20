from fastapi import FastAPI
from pydantic import BaseModel
from ortools.sat.python import cp_model

app = FastAPI()

# Definição do formato de dados que o FastAPI espera receber do seu Front-end (JS)
class PayloadGrade(BaseModel):
    cenario: dict
    turmas_selecionadas: list
    matrizes_curriculares: list
    disponibilidades_professores: list

@app.post("/api/gerar-grade")
def gerar_grade(dados: PayloadGrade):
    # 1. Inicializa o modelo matemático do Google OR-Tools
    modelo = cp_model.CpModel()
    
    # 2. Extrai os limites de tempo (dimensões da tabela)
    dias = dados.cenario["dias_semana"]  # Ex: [1, 2, 3, 4, 5]
    periodos = [p["ordem"] for p in dados.cenario["periodos"]]  # Ex: [1, 2, 3, 4, 5, 6]
    
    # 3. Dicionário que vai guardar TODAS as nossas variáveis de decisão
    variaveis = {}
    
    # 4. Criação das variáveis booleanas em loops estruturados
    # Varremos cada matriz curricular (que já vincula Turma + Disciplina + Professor)
    for index_matriz, matriz in enumerate(dados.matrizes_curriculares):
        turma_id = matriz["turma_id"]
        
        # Para esta linha da matriz, criamos uma caixinha (0 ou 1) para cada dia e período
        for dia in dias:
            for periodo in periodos:
                
                # Criamos um nome único para a variável ajudar no debug se der erro
                nome_var = f"X_matriz{index_matriz}_t{turma_id}_d{dia}_p{periodo}"
                
                # Registramos a variável booleana no modelo do Google
                variaveis[(turma_id, index_matriz, dia, periodo)] = modelo.NewBoolVar(nome_var)
                
    # 5. Retorno provisório para testar se a criação de variáveis correu bem
    total_variaveis = len(variaveis)
    return {
        "status": "sucesso", 
        "mensagem": f"Tabuleiro montado! Criadas {total_variaveis} variáveis booleanas de decisão com sucesso.",
        "quantidade_variaveis": total_variaveis
    }
