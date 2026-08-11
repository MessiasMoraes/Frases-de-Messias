import json
import os

def deduplicate():
    base_path = "/home/ubuntu/Frases-de-Messias"
    input_file = os.path.join(base_path, "frases.json")
    
    with open(input_file, "r", encoding="utf-8") as f:
        frases = json.load(f)
    
    seen = set()
    unique_frases = []
    
    for item in frases:
        # Criar uma chave única baseada no texto e categoria
        key = (item.get("texto", "").strip(), item.get("categoria", "").strip())
        if key not in seen:
            unique_frases.append(item)
            seen.add(key)
            
    with open(input_file, "w", encoding="utf-8") as f:
        json.dump(unique_frases, f, ensure_ascii=False, indent=2)
        
    print(f"Deduplicação concluída. Total de frases únicas: {len(unique_frases)}")

if __name__ == "__main__":
    deduplicate()
