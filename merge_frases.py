import json
import os

def merge_frases():
    base_path = "/home/ubuntu/Frases-de-Messias"
    
    # Carregar frases atuais
    with open(os.path.join(base_path, "frases.json"), "r", encoding="utf-8") as f:
        frases_atuais = json.load(f)
    
    # Carregar frases novas
    with open(os.path.join(base_path, "frases_novas.json"), "r", encoding="utf-8") as f:
        frases_novas = json.load(f)
    
    # Normalizar as frases novas para o formato esperado (remover campos extras se necessário)
    # O script importar.js usa: categoria, texto, autor (opcional), imagem (opcional)
    frases_novas_formatadas = []
    for item in frases_novas:
        nova_frase = {
            "categoria": item.get("categoria"),
            "texto": item.get("texto"),
            "autor": item.get("autor", "Messias")
        }
        frases_novas_formatadas.append(nova_frase)
    
    # Mesclar (evitando duplicatas exatas de texto)
    textos_existentes = {f["texto"] for f in frases_atuais}
    frases_adicionadas = 0
    
    for f in frases_novas_formatadas:
        if f["texto"] not in textos_existentes:
            frases_atuais.append(f)
            textos_existentes.add(f["texto"])
            frases_adicionadas += 1
            
    # Salvar o novo arquivo frases.json
    with open(os.path.join(base_path, "frases.json"), "w", encoding="utf-8") as f:
        json.dump(frases_atuais, f, ensure_ascii=False, indent=2)
        
    print(f"Sucesso! {frases_adicionadas} novas frases foram adicionadas ao frases.json.")
    print(f"Total de frases agora: {len(frases_atuais)}")

if __name__ == "__main__":
    merge_frases()
