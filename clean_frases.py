import json
import os
import re

def clean_frases():
    base_path = "/home/ubuntu/Frases-de-Messias"
    input_file = os.path.join(base_path, "frases.json")
    
    with open(input_file, "r", encoding="utf-8") as f:
        frases = json.load(f)
    
    cleaned_frases = []
    for item in frases:
        texto = item.get("texto", "")
        
        # Padrão a ser removido: ". Frase inspiradora X: siga em frente com coragem, sabedoria e determinação."
        # Também tratamos variações sem o ponto inicial ou com pequenas diferenças
        cleaned_text = re.sub(r'\.?\s*Frase inspiradora \d+: siga em frente com coragem, sabedoria e determinação\.?', '', texto)
        
        # Remover espaços extras no início e fim
        cleaned_text = cleaned_text.strip()
        
        # Se o texto ficou vazio ou apenas com pontuação, mantemos o original ou tratamos
        if not cleaned_text:
            cleaned_text = texto
            
        item["texto"] = cleaned_text
        cleaned_frases.append(item)
        
    with open(input_file, "w", encoding="utf-8") as f:
        json.dump(cleaned_frases, f, ensure_ascii=False, indent=2)
        
    print(f"Limpeza concluída. {len(cleaned_frases)} frases processadas.")

if __name__ == "__main__":
    clean_frases()
