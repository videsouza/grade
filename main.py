from fastapi import FastAPI
from pydantic import BaseModel
from ortools.sat.python import cp_model

app = FastAPI()

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
    
    # 1. CRIANDO AS VARIÁVEIS
    for index_matriz, matriz in enumerate(dados.matrizes_curriculares):
        turma_id = matriz["turma_id"]
        for dia in dias:
            for periodo in periodos:
                nome_var = f"X_m{index_matriz}_t{turma_id}_d{dia}_p{periodo}"
                variaveis[(turma_id, index_matriz, dia, periodo)] = modelo.NewBoolVar(nome_var)

    # ====================================================================
    # 2. RESTRIÇÕES RÍGIDAS (Hard Constraints)
    # ====================================================================
    
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

    # R3: A carga horária da disciplina DEVE ser cumprida rigorosamente
    for index_matriz, matriz in enumerate(dados.matrizes_curriculares):
        turma_id = matriz["turma_id"]
        carga_exigida = matriz["carga_horaria"]
        
        # Somamos todas as variáveis de todos os dias e períodos para esta disciplina
        todas_aulas_desta_disciplina = [
            variaveis[(turma_id, index_matriz, dia, periodo)]
            for dia in dias
            for periodo in periodos
        ]
        # A soma de todas as vezes que a aula ocorre tem que ser exatamente a carga exigida
        modelo.Add(sum(todas_aulas_desta_disciplina) == carga_exigida)

    # R4: Respeitar o tempo livre / indisponibilidade do professor
    # Mapeamos as indisponibilidades para acesso rápido
    mapa_indisp = {p["professor_id"]: p["indisponibilidades"] for p in dados.disponibilidades_professores}
    
    for index_matriz, matriz in enumerate(dados.matrizes_curriculares):
        prof_id = matriz["professor_id"]
        turma_id = matriz["turma_id"]
        
        if prof_id in mapa_indisp:
            for bloqueio in mapa_indisp[prof_id]:
                dia_bloqueado = bloqueio["dia"]
                periodo_bloqueado = bloqueio["periodo"]
                
                # Se esse dia/período existir no cenário, travamos a variável em zero (0)
                if dia_bloqueado in dias and periodo_bloqueado in periodos:
                    modelo.Add(variaveis[(turma_id, index_matriz, dia_bloqueado, periodo_bloqueado)] == 0)

    # ====================================================================

    return {
        "status": "sucesso", 
        "mensagem": "Matemática montada: Variáveis e todas as Restrições Rígidas (Conflitos, Carga Horária e Indisponibilidade) foram aplicadas com sucesso!"
    }
