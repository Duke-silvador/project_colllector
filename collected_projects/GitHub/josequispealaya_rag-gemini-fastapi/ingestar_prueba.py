from src.vector_store import add_document, search_context
from src.generator import generate_answer

# (Los documentos ya están indexados en ChromaDB de la corrida anterior, 
# pero si dejás estas líneas no pasa nada, las reescribe/ignora)
add_document(
    doc_id="stm32_uart_config", 
    text="Para configurar la transmisión UART en la placa STM32F411CEU6 Black Pill, es necesario habilitar el reloj del periférico USART1 y configurar los pines PA9 (TX) y PA10 (RX) en modo función alternativa (AF7)."
)

add_document(
    doc_id="rtems_intro", 
    text="RTEMS (Real-Time Executive for Multiprocessor Systems) es un sistema operativo de tiempo real de código abierto, diseñado para aplicaciones integradas en sistemas espaciales, como el software de vuelo de nanosatélites."
)

pregunta = "¿Qué pines uso para transmitir datos por puerto serie en la Black Pill?"
print(f"\nPregunta: {pregunta}")

print("Buscando contexto en ChromaDB...")
contexto_encontrado = search_context(pregunta, n_results=1)

print("\n--- Contexto recuperado ---")
print(contexto_encontrado)
print("---------------------------\n")

print("Generando respuesta con Gemini 3.5 Flash Lite...")
respuesta = generate_answer(pregunta, contexto_encontrado)

print("\n--- Respuesta del Asistente ---")
print(respuesta)
print("-------------------------------")