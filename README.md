# Ping Ping Pong

Ping pong arcade 3D con estilo cartoon, física de efecto real, frijolitos personalizables y multijugador online.

## Jugar
- **Online (GitHub Pages):** abre el enlace del juego en Chrome o Edge.
- **En local:** doble clic en **`Jugar.bat`** (servidor Node.js en `http://localhost:5173`).
  No se puede abrir `index.html` directamente: los módulos ES necesitan http.

### Multijugador online
*Menú → Online*:
1. Uno pulsa **Crear sala** → recibe un código de 5 letras (o copia el enlace de invitación).
2. El otro pulsa **Unirse**, escribe el código (o abre el enlace) → se conectan.
3. El anfitrión pulsa **Empezar partido**. Al terminar, *Revancha* cuando ambos la pidan.

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

Comunes: bola alta = smash · rueda = distancia de cámara (al tope, 1ª persona) · WASD mover (modo manual) · P/Esc pausa · M sonido · H ocultar controles.

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
src/arena.js        estadio: gradas laterales con afición instanciada por equipo
src/fx.js           estela, sombra, anillos, estrellas, confeti, retícula
src/audio.js        sonido sintetizado (WebAudio)
src/ui.js           menú principal, selectores, vestidor, ayuda, panel de controles
src/net.js          conexión P2P (PeerJS / WebRTC)
src/online.js       sala online: crear/unirse, código, enlace, saludo, ping
src/main.js         render, cámara, entrada, HUD, bucle
vendor/             three.js, GLTFLoader, PeerJS (sin dependencias externas)
server.js           servidor estático local (Jugar.bat)
```

Depuración: `?debug=play&ff=6` (CPU vs CPU con avance rápido) · `?debug=bot&host=1` / `?debug=bot&sala=CÓDIGO` (bots online).
