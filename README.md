# Ping Ping Pong

Ping pong arcade 3D con estilo cartoon, física de efecto real, frijolitos personalizables y multijugador online.

## Jugar
- **Online (GitHub Pages):** abre el enlace del juego en Chrome o Edge.
- **En local:** doble clic en **`Jugar.bat`** (servidor Node.js en `http://localhost:5173`).
  No se puede abrir `index.html` directamente: los módulos ES necesitan http.

### Modos
- **Contra la CPU**: 1 contra 1 o 2 contra 2 (con compañero CPU), al mejor de 1/3/5 juegos, a 5/7/11/21 puntos (prelobby).
- **Online**: 1 contra 1 o 2 contra 2 con hasta 4 jugadores; los huecos libres los ocupa la CPU.

### Escenarios
Antes de cada partido (prelobby) eliges entre **10 sedes**, con vista previa en directo detrás del menú, o **Aleatorio**:
Parque · Favela (morro con casitas y cometas) · Playa · Estadio Ponglímpico (la ola y pebetero) · El Infierno (lava y diablillos) ·
Azotea de un rascacielos · Base Lunar · Polo Norte (pingüinos y auroras) · Fondo del Mar · Discoteca Neón.
En online manda el escenario del anfitrión.

### Rachas
3, 5 o 7 puntos seguidos te dan un poder que activas cuando quieras con **F** (también Q/E en clásico, **B** en el mando o tocando la tarjeta). Dura 2–3 puntos:
- ×3: **Mareo** (al rival le da vueltas la cabeza y le baila el brazo) · **Bola fantasma** (invisible a medio vuelo)
- ×5: **¡En llamas!** (tu pala crece, la del rival encoge) · **Bola loca** (zigzag por el aire)
- ×7: **Congelado** (el rival, en un bloque de hielo) · **Pala imán** (todo te sale perfecto)

### Perfil y progreso
- La primera vez el juego pide tu **nombre** y lo guarda (perfil con partidos, victorias y nivel).
- **Pongcoins**: solo las gana quien gana el partido (Normal a 11 = 5; más difícil o más largo, algo más).
  Todo cuesta **5**, lo que da un partido normal ganado. Al empezar regalamos 10.
- **Vestidor**: la mayoría de prendas y outfits están bloqueados. Puedes probártelos y comprarlos ahí mismo;
  comprar un outfit desbloquea todas sus prendas.
- **Taller**: árbol de habilidades del frijolito (Agilidad, Fuerza, Reflejos, Alcance) y **3 palas**
  personalizables (nombre, tipo, color y mejoras de Velocidad, Efecto, Control y Remate). 5 niveles por rama.
- Todo se guarda en el navegador (localStorage).

### Multijugador online
*Menú → Online*:
1. Uno pulsa **Crear sala**, elige **Privada** o **Pública** → recibe un código de 5 letras (o copia el enlace).
2. El otro pulsa **Unirse** y escribe el código, abre el enlace o elige la sala en **Salas públicas**.
3. El anfitrión pulsa **Empezar partido**. Al terminar, *Revancha* cuando ambos la pidan.

**Salas públicas sin servidor:** el primer navegador que abre *Online* reclama un ID fijo de PeerJS y hace de
tablón (directorio). Los anfitriones de salas públicas se registran en él y quien busca partida recibe la lista.
Si ese navegador se cierra, otro reclama el ID en unos segundos y las salas se vuelven a anunciar solas
(latido cada 4 s). Limitación: solo aparecen salas mientras su anfitrión tiene el juego abierto.

Funciona entre navegadores, sin servidores propios ni coste:
- **WebRTC P2P** (PeerJS): los datos van directos de un jugador al otro.
- Señalización gratuita de PeerJS + STUN de Google + TURN gratuito de PeerJS para redes restrictivas.
- **Autoridad por turnos:** quien recibe la bola decide en su máquina si la devuelve (sin lag en tus
  golpes) y envía solo el estado de la bola en el golpe; la física es determinista y ambos simulan
  el mismo vuelo. Los puntos los arbitra quien recibe. Cada jugador se ve en el lado cercano: los
  mensajes se giran 180° en Y al recibirlos.

### Controles
Dos estilos de juego (*Menú → Estilo de juego*):

| Clásico | Mano libre |
|---|---|
| Ratón: apuntar en la mesa rival (retícula) | Ratón: mueve la pala (brazo elástico, alcance 1,15 m) |
| Clic izq./der.: liftado / cortado (mantener = potencia) | Swing ↑ liftado · ↓ cortado · ↔ curva; velocidad del swing = potencia |
| Soltar cuando el anillo se cierre | Clic izq./der. (o Q/E): girar la pala ← / → (dirección + curva extra) |
| Sacudir el ratón al soltar: curva | Anillo guía: verde = pala centrada con la bola |

**Mando** (Xbox, PlayStation o compatible; pulsa un botón para que el navegador lo detecte):

| | Clásico | Mano libre |
|---|---|---|
| Stick derecho | Apunta | Mueve la pala (rápido = swing) |
| RT / A · LT / X | Liftado · cortado (mantener = potencia) | — |
| LB / RB | Curva al soltar | Girar la pala |
| Stick izquierdo | Moverte en modo manual (si no, también apunta / mueve la pala) | |

Y cámara · View cambiar estilo · Menu pausa · cruceta y L3/R3 emotes. En los menús: cruceta/stick para moverte, A elegir, B volver, LB/RB cambiar de sección.

Comunes: **Tab** cambia entre Clásico y Mano libre en pleno partido (también desde la pausa) · 1–6 emotes · bola alta = smash · rueda = distancia de cámara (al tope, 1ª persona) · WASD mover (modo manual) · Esc pausa · M sonido · P (o H) ocultar controles.

## Dirección de arte: «Hinomaru»
Síntesis de dos referencias elegidas entre cuatro propuestas:
- **Estructura del constructivismo** (Lissitzky, Rodchenko, carteles de la Spartakiada): un gran círculo rojo
  que sangra por la esquina con el logo, el menú en **escalera de barras negras a −15°**, la **cuña roja**
  que señala la opción elegida, el 3D visto por una **ventana con marco negro** sobre papel crema y las
  **cintas cruzadas** para los puntos.
- **Voz del manga deportivo** (*Ping Pong* de Taiyō Matsumoto, spokon): Dela Gothic One, katakana como
  segunda capa (しあい, たいせん…), tramas de puntos, selección por inversión a negro y onomatopeyas (ドン!).

El círculo rojo une ambas: es el sol (hinomaru), la bola y el círculo constructivista.
Tintas: rojo , amarillo , negro  y papel . Tipos: Dela Gothic One, Zen Kaku Gothic New y Jost.
Ángulos: −15° para la estructura, −6° para cintas y avisos. Sin gradientes, brillos ni sombras.

## Motor y arquitectura
- **Three.js r169** (local en `vendor/`), WebGL, sombras PCF, materiales toon + contorno *inverted hull*.
- **Física propia** a 240 Hz: gravedad, arrastre, efecto Magnus (ω × v), rebote con fricción que acopla efecto y velocidad, red y suelo.
- **Reglas** de tenis de mesa: bote en campo rival, doble bote, red, fuera, saque cada 2 puntos, ventaja de 2.

```
index.html          HUD y pantallas (HTML/CSS)
css/style.css       estilo de la interfaz
src/config.js       medidas, física, dificultades, paleta
src/physics.js      física pura de la bola + predicción + solver de tiros
src/game.js         reglas, golpeo, saque, IA, sincronización online (sin render)
src/models.js       materiales toon, piezas con contorno, mesa, bola, cielo
src/character.js    frijolitos procedurales personalizables + rivales CPU + color rival
src/arena.js        pista, gradas con afición instanciada por equipo y cambio de escenario
src/stages.js       los 10 escenarios (cielo, luces, decorado animado)
src/gamepad.js      lectura del mando (Gamepad API)
src/referee.js      juez de silla con gestos y gags (señala, censura, se cae, se duerme)
src/fx.js           estela, sombra, anillos, estrellas, confeti, retícula
src/audio.js        sonido sintetizado (WebAudio)
src/ui.js           menú principal, selectores, vestidor (con tienda), ayuda, panel de controles
src/progress.js     perfil, Pongcoins, desbloqueos, habilidades y las 3 palas (localStorage)
src/workshop.js     Taller: árboles de habilidades del frijolito y de cada pala
src/lobby.js        salas públicas: tablón P2P que se traspasa entre navegadores
src/net.js          conexión P2P (PeerJS / WebRTC)
src/online.js       sala online: crear/unirse, código, enlace, saludo, ping
src/main.js         render, cámara, entrada, HUD, bucle
vendor/             three.js, GLTFLoader, PeerJS (sin dependencias externas)
server.js           servidor estático local (Jugar.bat)
```

Depuración: `?debug=play&ff=6` (CPU vs CPU con avance rápido) · `?debug=bot&host=1` / `?debug=bot&sala=CÓDIGO` (bots online).
