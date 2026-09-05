"""
Taller 1 - Parte III: Implementacion en Python
Agente que navega una cuadricula de laboratorio con obstaculos y
terreno de mayor consumo energetico (T), hasta alcanzar la zona
de entrega (G).
"""

# ------------------------------------------------------------------
# Mapa de la cuadricula (mismo mapa de la Parte II).
# Se representa como una lista de listas: cada fila es una lista de
# caracteres. Usamos filas y columnas empezando en 0 porque el propio
# enunciado usa ese formato en la traza: "Estado: (0, 0)".
# ------------------------------------------------------------------
MAPA = [
    ['I', '.', '.', '#', '.'],
    ['.', '#', '.', '#', '.'],
    ['.', '#', '.', 'T', '.'],
    ['.', '.', '.', '#', '.'],
    ['#', '#', '.', '.', 'G'],
]


class EntornoCuadricula:
    """
    Representa el laboratorio: es quien "conoce" el mapa.
    La separamos del robot a proposito, siguiendo el diagrama del
    taller (Entorno -> Percepcion -> Agente -> Accion): el entorno
    solo responde preguntas sobre el mapa, no decide nada por si
    mismo. Esto evita mezclar "las reglas del mundo" con
    "el comportamiento del robot".
    """

    def __init__(self, mapa):
        self.mapa = mapa
        self.filas = len(mapa)
        self.columnas = len(mapa[0])
        # Buscamos automaticamente donde estan 'I' y 'G' en vez de
        # escribir sus coordenadas a mano, para que el codigo siga
        # funcionando aunque cambien de posicion en el mapa.
        self.posicion_inicial = self._buscar_celda('I')
        self.posicion_objetivo = self._buscar_celda('G')

    def _buscar_celda(self, simbolo):
        # Recorremos todo el mapa celda por celda hasta encontrar
        # el simbolo pedido ('I' o 'G').
        for f in range(self.filas):
            for c in range(self.columnas):
                if self.mapa[f][c] == simbolo:
                    return (f, c)
        # Si no se encuentra, es un error de datos (el mapa esta mal
        # formado), asi que avisamos con un mensaje claro.
        raise ValueError(f"No se encontro la celda '{simbolo}' en el mapa")

    def dentro_de_limites(self, pos):
        # Antes de preguntar que hay en una celda, hay que verificar
        # que esa celda exista de verdad dentro de la cuadricula.
        f, c = pos
        return 0 <= f < self.filas and 0 <= c < self.columnas

    def contenido(self, pos):
        """
        Dice que hay en una celda: libre, obstaculo, costosa,
        objetivo, o borde si la celda ni siquiera existe.

        Esta funcion es la UNICA que conoce los simbolos crudos del
        mapa ('#', 'T', 'G', '.'). El resto del programa nunca lee
        el mapa directamente, siempre pregunta aqui. Asi, si un dia
        cambian los simbolos del mapa, solo hay que tocar esta
        funcion.
        """
        if not self.dentro_de_limites(pos):
            return 'borde'  # la celda no existe: se saldria del mapa
        f, c = pos
        valor = self.mapa[f][c]
        if valor == '#':
            return 'obstaculo'
        if valor == 'T':
            return 'costosa'
        if valor == 'G':
            return 'objetivo'
        # Cualquier otro simbolo ('.' o 'I') se trata como libre,
        # porque 'I' es solo la marca de donde arranca el robot,
        # no una restriccion de movimiento.
        return 'libre'


class AgenteCuadricula:
    """
    Representa al robot: sabe donde esta y usa al entorno para
    decidir que puede hacer.
    """

    # Diccionario que traduce cada accion en cuanto cambia la fila
    # y la columna. Usamos un diccionario (no un if/elif largo)
    # porque asi podemos recorrer las 4 acciones con un solo for,
    # tanto en percibir() como en acciones_validas().
    ACCIONES = {
        'arriba':    (-1, 0),   # sube una fila
        'abajo':     (1, 0),    # baja una fila
        'izquierda': (0, -1),   # resta una columna
        'derecha':   (0, 1),    # suma una columna
    }

    def __init__(self, entorno):
        self.entorno = entorno
        self.posicion = entorno.posicion_inicial
        self.costo_total = 0  # el robot "carga" su costo acumulado

    # ================================================================
    # 3.1 Percepcion (6 puntos)
    # ================================================================
    def percibir(self):
        """
        Retorna la posicion actual y el estado de las 4 celdas
        vecinas.

        Por que asi: el enunciado dice explicitamente que el robot
        "percibe su posicion y las celdas adyacentes", asi que la
        percepcion debe reflejar EXACTAMENTE eso: nada de vecinos en
        diagonal, nada de "ver" toda la cuadricula de una vez (eso
        rompería la idea de observabilidad parcial que vimos en la
        Parte I).
        """
        f, c = self.posicion
        vecinos = {}
        for nombre, (df, dc) in self.ACCIONES.items():
            # Sumamos el desplazamiento de cada direccion a la
            # posicion actual, y le preguntamos al entorno que hay
            # ahi. El robot nunca lee el mapa directamente.
            vecinos[nombre] = self.entorno.contenido((f + df, c + dc))
        return {'posicion': self.posicion, 'vecinos': vecinos}

    # ================================================================
    # 3.2 Acciones validas (6 puntos)
    # ================================================================
    def acciones_validas(self):
        """
        Devuelve solo las acciones que se pueden ejecutar ahora
        mismo (evita salirse del mapa y evita los obstaculos).

        Por que asi: reutilizamos percibir() en vez de volver a
        calcular los vecinos, para no repetir la misma logica dos
        veces (si mañana cambia como se calculan los vecinos, solo
        hay que arreglarlo en un lugar). Una accion es valida si la
        celda de destino NO es obstaculo y NO es borde; puede ser
        libre, costosa (T) o el objetivo (G) -- todas esas SI se
        pueden pisar, solo cambian el costo o terminan el recorrido.
        """
        percepcion = self.percibir()
        validas = []
        for accion, contenido_vecino in percepcion['vecinos'].items():
            if contenido_vecino not in ('obstaculo', 'borde'):
                validas.append(accion)
        return validas

    # ================================================================
    # 3.3 Transicion (7 puntos)
    # ================================================================
    def aplicar_accion(self, accion):
        print(f"Intentando aplicar accion '{accion}' desde {self.posicion}...")
        print(f"posicion antes de moverme: {self.posicion}")

        """
        Mueve al robot SOLO si la accion es valida. Si no lo es, el
        estado no cambia y se retorna False.

        Por que asi: el enunciado pide explicitamente "actualizar el
        estado UNICAMENTE cuando la accion sea valida". Por eso lo
        primero que hacemos es volver a preguntar acciones_validas()
        y verificar que la accion pedida este en esa lista, ANTES de
        tocar self.posicion. Esto evita que el robot termine en una
        posicion imposible (encima de un obstaculo o fuera del mapa).
        """
        if accion not in self.acciones_validas():
           
            return False  # accion invalida: no se mueve, no hay error

        # Calculamos la nueva posicion sumando el desplazamiento de
        # la accion elegida.
        df, dc = self.ACCIONES[accion]
        f, c = self.posicion
        nueva_posicion = (f + df, c + dc)
       


        # ============================================================
        # 3.5 Costo (5 puntos)
        # ============================================================
        # Por que el costo se calcula AQUI y no en otro metodo: el
        # costo depende de a que celda se ENTRA, y ese dato (el
        # contenido de la celda destino) ya lo tenemos disponible en
        # este mismo paso, justo antes de mover al robot. Calcularlo
        # en otro lugar obligaria a volver a consultar el entorno.
        contenido_destino = self.entorno.contenido(nueva_posicion)
       
        costo_paso = 3 if contenido_destino == 'costosa' else 1
        print(f"costo de este paso: {costo_paso}")
        self.costo_total += costo_paso  # se acumula, nunca se resetea
        print(f"costo total acumulado: {self.costo_total}")


        # Solo ahora, despues de validar y de cobrar el costo,
        # actualizamos la posicion real del robot.
        self.posicion = nueva_posicion
        print(f"posicion actualizada a: {self.posicion}")
        return True

    # ================================================================
    # 3.4 Objetivo (4 puntos)
    # ================================================================
    def es_objetivo(self):
        """
        Verifica si la posicion actual es la zona de entrega.

        Por que asi: a proposito es la funcion mas simple de todas.
        Su unico trabajo es responder verdadero/falso comparando la
        posicion actual contra la posicion de 'G' que el entorno ya
        encontro en el mapa. No debe "adivinar" ni calcular rutas,
        solo reconocer si ya se llego.
        """
        return self.posicion == self.entorno.posicion_objetivo


# ------------------------------------------------------------------
# 3.6 Ejecucion (7 puntos)
# ------------------------------------------------------------------
def ejecutar_secuencia(agente, secuencia):
    """
    Corre una secuencia de acciones e imprime la traza pedida por
    el enunciado.

    Por que esta funcion no es un metodo de la clase: ejecutar()
    "dirige" al agente desde afuera (le va dando acciones una por
    una), no es algo que el agente decida por si mismo -- en este
    taller la secuencia ya viene dada, no hay busqueda todavia.
    """
    # Se imprime el estado inicial ANTES de mover nada, tal como
    # muestra el formato de traza del enunciado ("Paso 0 | ...").
    print(f"Paso 0 | Estado: {agente.posicion} | Costo: {agente.costo_total}")

    for paso, accion in enumerate(secuencia, start=1):
        # Mostramos la percepcion y las acciones validas ANTES de
        # ejecutar el movimiento, porque asi es como decidiria un
        # agente real: primero percibe, despues actua.
        percepcion = agente.percibir()
        validas = agente.acciones_validas()

        print(f"Percepcion: {percepcion}")
        print(f"Acciones validas: {validas}")
        print(f"Accion elegida: {accion}")

        exito = agente.aplicar_accion(accion)

        if not exito:
            # Aqui es donde cumplimos el requisito de "no finalizar
            # por errores no controlados": en vez de dejar que el
            # programa truene, detectamos la accion invalida
            # nosotros mismos y avisamos con un mensaje claro.
            print(f"Accion invalida ('{accion}'). Ejecucion detenida sin error.")
            return

        print(f"Paso {paso} | Estado: {agente.posicion} | Costo: {agente.costo_total}")

        if agente.es_objetivo():
            # Nos detenemos apenas se cumple el objetivo, tal como
            # pide el enunciado ("detenerse al alcanzar el
            # objetivo").
            print(f"Objetivo alcanzado | Costo total: {agente.costo_total}")
            return

    # Si la secuencia se acaba y nunca se llego a 'G', tambien lo
    # informamos con claridad en vez de terminar en silencio.
    print(f"Secuencia terminada sin alcanzar el objetivo | Costo total: {agente.costo_total}")


# ------------------------------------------------------------------
# Casos de prueba obligatorios
# ------------------------------------------------------------------
if __name__ == '__main__':
    entorno = EntornoCuadricula(MAPA)

    # Caso 1: un camino completo y valido, sin pasar por T, que
    # demuestra el funcionamiento normal de punta a punta.
    print("=== Caso 1: secuencia valida que alcanza el objetivo ===")
    agente = AgenteCuadricula(entorno)
    secuencia_1 = ['abajo', 'abajo', 'abajo', 'derecha', 'derecha', 'abajo', 'derecha', 'derecha']
    ejecutar_secuencia(agente, secuencia_1)

    # Caso 2: intenta seguir de frente contra la pared en (0,3).
    # Verifica que acciones_validas() y aplicar_accion() rechacen
    # correctamente un obstaculo.
    print("\n=== Caso 2: secuencia que intenta atravesar un obstaculo ===")
    agente = AgenteCuadricula(entorno)
    secuencia_2 = ['derecha', 'derecha', 'derecha']  # (0,3) es '#'
    ejecutar_secuencia(agente, secuencia_2)

    # Caso 3: intenta moverse "arriba" desde la fila 0. Verifica que
    # el limite de la cuadricula (borde) tambien se respete.
    print("\n=== Caso 3: secuencia que intenta salir de la cuadricula ===")
    agente = AgenteCuadricula(entorno)
    secuencia_3 = ['arriba']  # no hay celda arriba de la fila 0
    ejecutar_secuencia(agente, secuencia_3)

    # Caso 4: pasa deliberadamente por la celda T, para que se vea
    # el salto de costo (+3 en vez de +1) en la traza impresa.
    print("\n=== Caso 4: secuencia que pasa por la celda T y evidencia el cambio de costo ===")
    agente = AgenteCuadricula(entorno)
    secuencia_4 = ['derecha', 'derecha', 'abajo', 'abajo', 'derecha']  # entra a (2,3) = T
    ejecutar_secuencia(agente, secuencia_4)