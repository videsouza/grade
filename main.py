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
    turmas = dados.turmas_selecionadas
    
    return {
        "status": "sucesso", 
        "mensagem": f"Modelo instanciado para {len(turmas)} turmas, {len(dias)} dias e {len(periodos)} períodos.",
        "grade": []
    }
