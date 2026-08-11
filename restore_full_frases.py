import json
import os
import re

def restore_full():
    # Caminho do arquivo original enviado pelo usuário
    original_file = "/home/ubuntu/upload/DOC-20260802-WA0033"
    target_file = "/home/ubuntu/Frases-de-Messias/frases.json"
    
    with open(original_file, "r", encoding="utf-8") as f:
        frases = json.load(f)
    
    restored_frases = []
    for item in frases:
        texto = item.get("texto", "")
        
        # Limpeza cirúrgica: remove apenas ". Frase inspiradora X:" 
        # Mantendo o restante da frase mesmo que pareça repetitivo, para garantir o volume de 1200
        cleaned_text = re.sub(r'\.?\s*Frase inspiradora \d+:', '', texto)
        
        # Opcional: remover o sufixo genérico se o usuário quiser algo mais limpo, 
        # mas aqui vamos manter o máximo possível para não perder o "volume" solicitado.
        # Se a frase for "Nunca desista. Frase inspiradora 1: siga em frente...", 
        # o resultado será "Nunca desista siga em frente..."
        
        cleaned_text = cleaned_text.strip()
        
        # Garantir que campos essenciais existam
        new_item = {
            "categoria": item.get("categoria", "Geral"),
            "texto": cleaned_text,
            "autor": "Messias"
        }
        restored_frases.append(new_item)
        
    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(restored_frases, f, ensure_ascii=False, indent=2)
        
    print(f"Restauração concluída. Total de frases preparadas: {len(restored_frases)}")

if __name__ == "__main__":
    restore_full()
