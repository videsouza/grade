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
    modelo = cp_model.CpModel()
    
    dias = dados.cenario["dias_semana"]
    periodos = [p["ordem"] for p in dados.cenario["periodos"]]
    
    variaveis = {}
    
    # 1. CRIANDO AS VARIÁVEIS (O Tabuleiro)
    for index_matriz, matriz in enumerate(dados.matrizes_curriculares):
        turma_id = matriz["turma_id"]
        for dia in dias:
            for periodo in periodos:
                nome_var = f"X_matriz{index_matriz}_t{turma_id}_d{dia}_p{periodo}"
                variaveis[(turma_id, index_matriz, dia, periodo)] = modelo.NewBoolVar(nome_var)
                
    # ====================================================================
    # 2. RESTRIÇÕES RÍGIDAS (Hard Constraints)
    # ====================================================================
    
    # R1: Um professor não pode dar duas aulas ao mesmo tempo.
    # Primeiro, descobrimos quem são todos os professores únicos na matriz
    professores_ids = set([m["professor_id"] for m in dados.matrizes_curriculares])
    
    for prof_id in professores_ids:
        for dia in dias:
            for periodo in periodos:
                aulas_do_prof_neste_momento = []
                
                # Procuramos todas as variáveis que pertencem a este professor
                for index_matriz, matriz in enumerate(dados.matrizes_curriculares):
                    if matriz["professor_id"] == prof_id:
                        turma_id = matriz["turma_id"]
                        aulas_do_prof_neste_momento.append(
                            variaveis[(turma_id, index_matriz, dia, periodo)]
                        )
                
                # A mágica acontece aqui:
                modelo.AddAtMostOne(aulas_do_prof_neste_momento)
                
    # ====================================================================
                
    return {
        "status": "sucesso", 
        "mensagem": "Variáveis criadas e restrição de conflito de professor aplicada!"
    }
