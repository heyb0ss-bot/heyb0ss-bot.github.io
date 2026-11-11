# Índice de Placa O'Leary

Herramienta web interactiva para calcular el Índice de Placa O'Leary de un paciente.

## Uso
1. Abre la página en el navegador.
2. Marca las superficies dentales (V, P/L, M, D) que presenten placa haciendo clic en cada triángulo.
3. Excluye dientes ausentes con el botón "Excluir" si corresponde.
4. El porcentaje se calcula automáticamente en tiempo real, considerando solo las superficies de los dientes no excluidos.

## Demo
🔗 [Ver la página](https://tu-usuario.github.io/nombre-del-repo/)

## Tecnología
Archivo HTML autocontenido (HTML + CSS + JavaScript), sin dependencias ni backend.

---

# 🎬 EditaYa: editor de video para Android

Editor de video para el celular, al estilo de las apps de edición rápida: importa clips y fotos, córtalos, agrega texto, stickers, música, filtros y transiciones, y exporta en formato vertical u horizontal.

- **Web / PWA:** `editor/` (se publica en `https://heyb0ss-bot.github.io/editor/`). En Chrome para Android usa *Menú › Instalar app*.
- **APK nativa:** `android/`, un contenedor Kotlin + WebView que empaqueta el editor y funciona sin conexión. GitHub Actions la compila en cada push (pestaña *Actions › Android APK › Artifacts › EditaYa-apk*).

## Funciones
| Área | Qué hace |
|---|---|
| Línea de tiempo | Cabezal central, pellizco para zoom y miniaturas; pistas de video, texto y audio |
| Clips | Dividir, recortar con manijas, duplicar, reordenar y eliminar |
| Velocidad / volumen | 0.1×–5× y 0–200 %; fundido de entrada y salida en la música |
| Filtros y ajustes | 14 filtros; brillo, contraste, saturación, temperatura, tono y viñeta |
| Encuadre | Ajustar o llenar, zoom, rotar, espejo y mover arrastrando en la vista previa |
| Transiciones | Fundido, destello, zoom, deslizar y desenfoque |
| Texto y stickers | 5 fuentes, colores, sombra, contorno o caja, y animaciones (pop, aparecer, subir, máquina de escribir) |
| Formato | 9:16, 16:9, 1:1, 4:5, 3:4 y 4:3; fondo desenfocado o de color |
| Exportar | MP4 (o WebM según el dispositivo) a 720p o 1080p y 24/30/60 fps; guardar en Galería › Movies/EditaYa o compartir |
| Proyecto | Deshacer y rehacer; el proyecto se guarda solo y se recupera al reabrir la app |

## Compilar la APK localmente
Necesitas el Android SDK (Android Studio) y JDK 17:
```bash
cd android
./gradlew assembleDebug        # app/build/outputs/apk/debug/app-debug.apk
```
La tarea `copyWebAssets` copia `editor/` dentro de los assets del APK de forma automática.

**Requisitos:** Android 10 o superior. La exportación se hace en tiempo real (un video de 30 s tarda unos 30 s), con la app abierta.
