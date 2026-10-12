import requests
import schedule
import time

# --- CONFIGURAÇÃO DO TELEGRAM ---
TELEGRAM_TOKEN = "8648959740:AAEqc1oqSg6BMgx6J1ANSDrzsMwu7GlV6ew"
CHAT_ID = "8982271853"

# --- CONFIGURAÇÃO DA LOCALIZAÇÃO (Samouco / Alcochete) ---
LATITUDE = 38.7563
LONGITUDE = -8.9793

def enviar_mensagem_telegram(mensagem):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": CHAT_ID,
        "text": mensagem,
        "parse_mode": "Markdown"
    }
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print("Mensagem enviada com sucesso para o Telegram!")
        else:
            print(f"Erro ao enviar mensagem: {response.text}")
    except Exception as e:
        print(f"Exceção ao ligar ao Telegram: {e}")

def obter_previsao_e_recomendar():
    url = f"https://api.open-meteo.com/v1/forecast?latitude={LATITUDE}&longitude={LONGITUDE}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto"
    
    try:
        res = requests.get(url).json()
        temp_max = res['daily']['temperature_2m_max'][0]
        temp_min = res['daily']['temperature_2m_min'][0]
        chuva = res['daily']['precipitation_sum'][0]

        # Lógica de Recomendação de Vestuário
        recomendacao = []
        
        if temp_max > 22:
            recomendacao.append("👕 Roupa leve (T-shirt / calções ou calças finas).")
        elif 15 <= temp_max <= 22:
            recomendacao.append("🧥 Camisola leve ou casaco de meia-estação.")
        else:
            recomendacao.append("🥶 Casaco quente e agasalho.")

        if chuva > 1.0:
            recomendacao.append("☔ Não te esqueças do guarda-chuva ou casaco impermeável!")

        mensagem = (
            f"☀️ Bom dia! Previsão do Tempo para Hoje\n\n"
            f"🌡️ Temp. Máxima: {temp_max}°C\n"
            f"❄️ Temp. Mínima: {temp_min}°C\n"
            f"🌧️ Precipitação: {chuva} mm\n\n"
            f"💡 Recomendação: " + " ".join(recomendacao)
        )
        
        enviar_mensagem_telegram(mensagem)

    except Exception as e:
        print(f"Erro ao obter previsão meteorológica: {e}")

# Enviar uma mensagem de teste IMEDIATAMENTE ao iniciar
print("A testar envio imediato...")
obter_previsao_e_recomendar()

# Agendar para enviar todos os dias às 07:30
schedule.every().day.at("07:30").do(obter_previsao_e_recomendar)

print("Bot ativo! Ficará a aguardar todos os dias pelas 07:30 AM...")

while True:
    schedule.run_pending()
    time.sleep(30)