//! Traducción de la interfaz.
//!
//! # Cómo funciona
//!
//! El **español es el idioma fuente**: los literales del código están en
//! español y [`t`] los traduce al inglés cuando hace falta. No hay claves
//! abstractas tipo `boton.guardar`, que obligan a saltar a otro archivo para
//! entender qué dice la pantalla.
//!
//! El idioma es un ajuste de proceso, no algo que se pase por parámetro a cada
//! función de dibujo: cambia una vez al arrancar y quizá una vez más si el
//! usuario lo toca. Plumbing por siete módulos para eso sería ruido.
//!
//! # La red de seguridad
//!
//! Con una tabla en vez de un `struct` de campos, olvidar una traducción no da
//! error de compilación. Por eso el test [`tests::no_faltan_traducciones`] lee
//! **el propio código fuente** de las pantallas, busca cada `t("…")` y comprueba
//! que esté en la tabla. Es lo que sustituye a la comprobación del compilador.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::LazyLock;

use vd_core::config::model::Language;

static INGLES: AtomicBool = AtomicBool::new(false);

/// Fija el idioma a partir de la configuración.
///
/// `System` mira la variable de entorno que Windows expone para el idioma de la
/// interfaz. Ante la duda queda el español, que es el idioma fuente.
pub fn configurar(lang: Option<Language>) {
    let ingles = match lang {
        Some(Language::En) => true,
        Some(Language::Es) => false,
        Some(Language::System) | None => idioma_del_sistema_es_ingles(),
    };
    INGLES.store(ingles, Ordering::Relaxed);
}

fn idioma_del_sistema_es_ingles() -> bool {
    // No merece la pena una llamada a Win32 para esto: si el sistema no es
    // español, se ofrece inglés, que es el otro idioma que existe.
    std::env::var("LANG")
        .or_else(|_| std::env::var("LANGUAGE"))
        .map(|l| !l.to_lowercase().starts_with("es"))
        // Sin variables de entorno (lo normal en Windows), se asume español.
        .unwrap_or(false)
}

pub fn en_ingles() -> bool {
    INGLES.load(Ordering::Relaxed)
}

/// Traduce una cadena. Devuelve la original si el idioma es español.
pub fn t(es: &'static str) -> &'static str {
    if !en_ingles() {
        return es;
    }
    TABLA.get(es).copied().unwrap_or(es)
}

/// Traduce y sustituye marcadores con nombre.
///
/// `format!` exige un literal, asi que no sirve para una cadena que sale de una
/// tabla en tiempo de ejecucion. Esta funcion hace el reemplazo a mano:
///
/// ```ignore
/// tf("No se pudo guardar: {e}", &[("{e}", &error.to_string())])
/// ```
///
/// Los marcadores llevan nombre —`{e}`, `{n}`— y no posicion, porque el orden de
/// las palabras cambia entre idiomas y `{}` posicional se prestaria a barajarlos
/// sin darse cuenta.
pub fn tf(es: &'static str, args: &[(&str, &str)]) -> String {
    let mut salida = t(es).to_string();
    for (marcador, valor) in args {
        salida = salida.replace(marcador, valor);
    }
    salida
}

static TABLA: LazyLock<HashMap<&'static str, &'static str>> =
    LazyLock::new(|| PARES.iter().copied().collect());

/// Traducciones, agrupadas por pantalla para que se puedan revisar en contexto.
const PARES: &[(&str, &str)] = &[
    // --- pantalla principal ---
    ("Editar", "Edit"),
    ("Listo", "Done"),
    ("Ajustes", "Settings"),
    (
        "En modo edicion, pulsar un boton lo configura en vez de ejecutarlo",
        "In edit mode, clicking a button configures it instead of running it",
    ),
    ("{} en curso", "{} running"),
    ("Sin variables", "No variables"),
    ("{n} variable(s)", "{n} variable(s)"),
    ("No se pudo leer la configuración", "Could not read the configuration"),
    ("No hay ninguna configuración", "There is no configuration"),
    // --- bandeja ---
    ("Mostrar VirtualDeck", "Show VirtualDeck"),
    ("Ocultar", "Hide"),
    ("Salir", "Quit"),
    // --- avisos ---
    ("Guardado", "Saved"),
    ("No se pudo guardar: {e}", "Could not save: {e}"),
    ("Pendiente de la interfaz: {}", "Pending in the interface: {}"),
    (
        "Grabando: usa el teclado y el raton, luego pulsa Detener",
        "Recording: use the keyboard and mouse, then press Stop",
    ),
    ("No se pudo empezar a grabar: {e}", "Could not start recording: {e}"),
    ("No se pudo detener la grabacion: {e}", "Could not stop recording: {e}"),
    (
        "Grabacion descartada: se cambio de boton mientras grababa",
        "Recording discarded: the selected button changed while recording",
    ),
    (
        "Macro grabada: {n} paso(s). Recuerda guardar.",
        "Macro recorded: {n} step(s). Remember to save.",
    ),
    // --- editor: estructura ---
    ("Editar botón", "Edit button"),
    ("Guardar", "Save"),
    ("Descartar", "Discard"),
    ("Vaciar", "Clear"),
    ("Deja el botón sin acción ni etiqueta", "Leaves the button with no action or label"),
    ("Apariencia", "Appearance"),
    ("Etiqueta", "Label"),
    ("Segunda línea", "Second line"),
    ("Icono", "Icon"),
    ("Ninguno", "None"),
    ("Fondo", "Background"),
    ("Texto", "Text"),
    ("Acción", "Action"),
    ("Quitar", "Remove"),
    ("{actual} (desconocido)", "{actual} (unknown)"),
    ("{t:?} (no editable aquí)", "{t:?} (not editable here)"),
    // --- editor: tipos de accion ---
    ("Sin acción", "No action"),
    ("Abrir aplicación", "Open application"),
    ("Abrir URL", "Open URL"),
    ("Abrir acceso directo", "Open shortcut"),
    ("Ejecutar script", "Run script"),
    ("Cambiar dispositivo de audio", "Change audio device"),
    ("Enviar atajo de teclado", "Send keyboard shortcut"),
    ("Escribir texto", "Type text"),
    ("Copiar al portapapeles", "Copy to clipboard"),
    ("Fijar volumen", "Set volume"),
    ("Subir volumen", "Volume up"),
    ("Bajar volumen", "Volume down"),
    ("Silenciar", "Mute"),
    ("Fijar brillo", "Set brightness"),
    ("Reproducir / pausar", "Play / pause"),
    ("Pista siguiente", "Next track"),
    ("Pista anterior", "Previous track"),
    ("Cerrar proceso", "Kill process"),
    ("Llamar a un webhook", "Call a webhook"),
    ("Fijar variable", "Set variable"),
    ("Incrementar variable", "Increment variable"),
    ("Macro grabada", "Recorded macro"),
    // --- editor: campos de accion ---
    ("Ruta del ejecutable", "Executable path"),
    ("Argumentos", "Arguments"),
    ("Ruta del acceso directo", "Shortcut path"),
    ("Script", "Script"),
    ("Guardar salida en la variable", "Save output to variable"),
    ("Nombre del dispositivo", "Device name"),
    ("Basta con parte del nombre.", "Part of the name is enough."),
    ("Combinación", "Combination"),
    ("Por ejemplo: Ctrl+Shift+M", "For example: Ctrl+Shift+M"),
    ("Volumen (%)", "Volume (%)"),
    ("Brillo (%)", "Brightness (%)"),
    ("Nombre del proceso", "Process name"),
    ("Cuerpo", "Body"),
    ("Variable", "Variable"),
    ("Valor", "Value"),
    ("Incremento", "Increment"),
    ("Repetir", "Repeat"),
    ("Grabada: {}", "Recorded: {}"),
    // --- editor: widgets ---
    ("Widget", "Widget"),
    (
        "Sustituye a la etiqueta por algo vivo. El boton sigue siendo pulsable.",
        "Replaces the label with live data. The button is still clickable.",
    ),
    ("Reloj", "Clock"),
    ("Clima", "Weather"),
    ("Reproduccion", "Playback"),
    ("Sensor", "Sensor"),
    ("Elegir sensor", "Choose sensor"),
    ("Todavia no hay lecturas", "No readings yet"),
    ("{} (no disponible ahora)", "{} (not available right now)"),
    ("Unidad (vacio = la del sensor)", "Unit (empty = the sensor's)"),
    (
        "Umbrales: el valor cambia de color al pasarlos",
        "Thresholds: the value changes colour when crossed",
    ),
    ("Advertencia", "Warning"),
    ("Critico", "Critical"),
    ("Prefijo", "Prefix"),
    ("Sufijo", "Suffix"),
    // --- secuencia y macros ---
    ("Secuencia", "Sequence"),
    (
        "Varios pasos, en orden. Cada uno puede esperar o repetirse.",
        "Several steps, in order. Each one can wait or repeat.",
    ),
    ("+ Añadir paso", "+ Add step"),
    ("Grabar macro", "Record macro"),
    ("Detener ({} s)", "Stop ({} s)"),
    ("Graba teclado y raton de todo el sistema", "Records keyboard and mouse system-wide"),
    ("Esperar", "Wait"),
    ("Solo si el paso anterior fue bien", "Only if the previous step succeeded"),
    ("sin pasos", "no steps"),
    ("{teclas} tecla(s)", "{teclas} key(s)"),
    ("{clics} clic(s)", "{clics} click(s)"),
    ("{} paso(s)", "{} step(s)"),
    // --- paginas ---
    ("Página", "Page"),
    ("Página {}", "Page {}"),
    ("Rejilla", "Grid"),
    ("+ Nueva página", "+ New page"),
    ("Borrar página", "Delete page"),
    ("Tiene que quedar al menos una página", "At least one page must remain"),
    // --- ajustes ---
    ("Acento", "Accent"),
    ("Tema", "Theme"),
    ("Idioma", "Language"),
    ("Sistema", "System"),
    ("Claro", "Light"),
    ("Oscuro", "Dark"),
    ("Sensores", "Sensors"),
    (
        "{nativos} sensores disponibles sin instalar nada (CPU, memoria, disco, red, GPU).",
        "{nativos} sensors available with nothing to install (CPU, memory, disk, network, GPU).",
    ),
    (
        "Usar LibreHardwareMonitor si está corriendo",
        "Use LibreHardwareMonitor if it is running",
    ),
    (
        "Añade temperatura del procesador, voltajes y ventiladores de la placa.\nRequiere tener LibreHardwareMonitor abierto con su servidor web activo.",
        "Adds CPU temperature, voltages and motherboard fans.\nRequires LibreHardwareMonitor running with its web server enabled.",
    ),
    ("Host", "Host"),
    ("Puerto", "Port"),
    (
        "Los cambios se aplican al reiniciar la aplicación.",
        "Changes take effect when the application restarts.",
    ),
    ("Arrancar con Windows", "Start with Windows"),
    (
        "Añade una entrada en el registro del usuario. No pide permisos de administrador.",
        "Adds an entry to the user registry. No administrator rights needed.",
    ),
    ("No se pudo cambiar el arranque: {e}", "Could not change startup: {e}"),
    ("Diagnóstico", "Diagnostics"),
    ("Abrir carpeta de datos", "Open data folder"),
    ("No se pudo abrir la carpeta: {e}", "Could not open the folder: {e}"),
    ("No se pudo localizar la carpeta: {e}", "Could not locate the folder: {e}"),
    ("Copiar registro", "Copy log"),
    (
        "Copia las últimas líneas del log, para adjuntar a un reporte",
        "Copies the last lines of the log, to attach to a report",
    ),
    ("No se pudo copiar: {e}", "Could not copy: {e}"),
    (
        "{backups} copia(s) de seguridad de la configuración",
        "{backups} configuration backup(s)",
    ),
    ("Leer en voz alta", "Read aloud"),
    ("Color RGB", "RGB colour"),
    ("Color (#RRGGBB)", "Colour (#RRGGBB)"),
    ("Requiere OpenRGB abierto con su servidor activo.", "Requires OpenRGB running with its server enabled."),
    ("Usa las voces que tengas instaladas en Windows.", "Uses the voices installed in Windows."),
    // --- perfiles ---
    ("Perfiles", "Profiles"),
    (
        "Un perfil guarda las páginas, los botones y el acento. Al cambiar de perfil, los cambios del actual se guardan en él.",
        "A profile stores the pages, buttons and accent. When switching profiles, changes to the current one are saved into it.",
    ),
    ("Cargar este perfil", "Load this profile"),
    ("Borrar perfil", "Delete profile"),
    ("Todavía no hay perfiles guardados", "No profiles saved yet"),
    ("Nombre del perfil", "Profile name"),
    ("Guardar deck actual", "Save current deck"),
    // --- ramas ---
    ("Si la variable", "If the variable"),
    ("Entonces", "Then"),
    ("Si no", "Otherwise"),
    ("Comparar con", "Compare with"),
    ("+ Añadir acción", "+ Add action"),
    ("está vacía", "is empty"),
    ("no está vacía", "is not empty"),
    ("contiene", "contains"),
    ("Ramificación", "Branch"),
    ("Cuenta atrás", "Countdown"),
    ("Espera (ms)", "Wait (ms)"),
    ("Acciones tras la espera", "Actions after the wait"),
    // --- carpetas ---
    ("← Volver", "← Back"),
    ("Esta carpeta está vacía", "This folder is empty"),
    ("Carpeta de botones", "Button folder"),
    ("Botones de dentro", "Buttons inside"),
    ("+ Añadir botón", "+ Add button"),
    // --- widgets en la rejilla ---
    ("sin clima", "no weather"),
    ("nada sonando", "nothing playing"),
    ("no disponible", "not available"),
    ("sin sensor", "no sensor"),
    ("sin variable", "no variable"),
    // --- clima ---
    ("Despejado", "Clear"),
    ("Casi despejado", "Mostly clear"),
    ("Parcialmente nublado", "Partly cloudy"),
    ("Nublado", "Cloudy"),
    ("Niebla", "Fog"),
    ("Llovizna", "Drizzle"),
    ("Lluvia", "Rain"),
    ("Nieve", "Snow"),
    ("Chubascos", "Showers"),
    ("Chubascos de nieve", "Snow showers"),
    ("Tormenta", "Thunderstorm"),
];

#[cfg(test)]
mod tests {
    use super::*;

    /// Código fuente de las pantallas, para poder auditar las llamadas a [`t`].
    const FUENTES: &[(&str, &str)] = &[
        ("app.rs", include_str!("app.rs")),
        ("bandeja.rs", include_str!("bandeja.rs")),
        ("datos.rs", include_str!("datos.rs")),
        ("pantallas/ajustes.rs", include_str!("pantallas/ajustes.rs")),
        ("pantallas/editor.rs", include_str!("pantallas/editor.rs")),
        ("pantallas/paginas.rs", include_str!("pantallas/paginas.rs")),
        (
            "pantallas/principal.rs",
            include_str!("pantallas/principal.rs"),
        ),
        (
            "pantallas/secuencia.rs",
            include_str!("pantallas/secuencia.rs"),
        ),
        ("pantallas/widgets.rs", include_str!("pantallas/widgets.rs")),
    ];

    /// Saca los literales de cada `t("…")` de un fuente.
    ///
    /// Acepta espacios y saltos de linea entre `t(` y la comilla: rustfmt parte
    /// las llamadas largas, y buscar solo `t("` dejaria esas sin auditar. Ese
    /// punto ciego existio y dejo pasar una cadena de verdad.
    fn claves_usadas(fuente: &str) -> Vec<String> {
        let mut claves = Vec::new();
        let mut resto = fuente;
        while let Some(i) = resto.find("t(") {
            // `t(` tiene que ser la funcion, no el final de otro identificador
            // como `format!(` o `print!(`.
            let antes = resto[..i].chars().next_back();
            let es_llamada = !antes.is_some_and(|c| c.is_alphanumeric() || c == '_');
            resto = &resto[i + 2..];

            if !es_llamada {
                continue;
            }
            // Saltar el espacio en blanco que rustfmt haya metido.
            let tras_espacios = resto.trim_start();
            let Some(sin_comilla) = tras_espacios.strip_prefix('"') else {
                continue;
            };
            resto = sin_comilla;
            // El literal termina en la primera comilla no escapada.
            let mut fin = None;
            let bytes = resto.as_bytes();
            let mut j = 0;
            while j < bytes.len() {
                if bytes[j] == b'\\' {
                    j += 2;
                    continue;
                }
                if bytes[j] == b'"' {
                    fin = Some(j);
                    break;
                }
                j += 1;
            }
            if let Some(f) = fin {
                claves.push(resto[..f].to_string());
            }
        }
        claves
    }

    /// Aplica los escapes de Rust a un literal sacado del codigo fuente.
    ///
    /// El caso que importa es la **continuacion de linea**: una barra al final
    /// de la linea se come el salto y el sangrado de la siguiente. Es un idioma
    /// normal en Rust para partir cadenas largas, y sin tratarlo el auditor
    /// comparaba contra un texto que en tiempo de ejecucion no existe.
    fn desescapar(literal: &str) -> String {
        let mut salida = String::with_capacity(literal.len());
        let mut chars = literal.chars().peekable();
        while let Some(c) = chars.next() {
            if c != '\\' {
                salida.push(c);
                continue;
            }
            match chars.next() {
                Some('n') => salida.push('\n'),
                Some('t') => salida.push('\t'),
                Some('"') => salida.push('"'),
                Some('\\') => salida.push('\\'),
                // Continuacion: se descartan el salto y el sangrado siguiente.
                Some('\n') => {
                    while chars.peek().is_some_and(|c| c.is_whitespace()) {
                        chars.next();
                    }
                }
                Some(otro) => salida.push(otro),
                None => break,
            }
        }
        salida
    }

    #[test]
    fn la_continuacion_de_linea_se_resuelve() {
        // Es justo el caso que dejo pasar una cadena de verdad.
        assert_eq!(desescapar("uno.\\n\\\n            dos"), "uno.\ndos");
        assert_eq!(desescapar("sin escapes"), "sin escapes");
        assert_eq!(desescapar("con\\ncorte"), "con\ncorte");
    }

    #[test]
    fn no_faltan_traducciones() {
        // Es la red de seguridad que sustituye al compilador: con una tabla en
        // vez de un struct de campos, olvidar una traduccion no da error de
        // compilacion. Este test lee el codigo fuente de las pantallas y
        // comprueba que cada `t("…")` tenga su entrada.
        let mut faltan = Vec::new();
        for (archivo, fuente) in FUENTES {
            for clave in claves_usadas(fuente) {
                let real = desescapar(&clave);
                if !TABLA.contains_key(real.as_str()) {
                    faltan.push(format!("  {archivo}: {clave:?}"));
                }
            }
        }
        assert!(
            faltan.is_empty(),
            "hay {} cadena(s) sin traduccion en la tabla:\n{}",
            faltan.len(),
            faltan.join("\n")
        );
    }

    #[test]
    fn no_hay_claves_repetidas() {
        // Una repetida silenciaria a la anterior sin avisar.
        let mut vistas = std::collections::HashSet::new();
        for (es, _) in PARES {
            assert!(vistas.insert(*es), "la clave {es:?} esta repetida");
        }
    }

    #[test]
    fn ninguna_traduccion_esta_vacia() {
        for (es, en) in PARES {
            assert!(!en.trim().is_empty(), "{es:?} no tiene traduccion");
        }
    }

    #[test]
    fn las_traducciones_conservan_los_marcadores() {
        // Si una traduccion pierde un `{e}` o un `{}`, el `format!` de Rust no
        // compilaria o mostraria el texto sin el dato. Se comprueba que el
        // conjunto de marcadores coincida.
        for (es, en) in PARES {
            let marcadores = |s: &str| -> Vec<String> {
                let mut v = Vec::new();
                let mut resto = s;
                while let Some(i) = resto.find('{') {
                    resto = &resto[i..];
                    if let Some(j) = resto.find('}') {
                        v.push(resto[..=j].to_string());
                        resto = &resto[j + 1..];
                    } else {
                        break;
                    }
                }
                v.sort();
                v
            };
            assert_eq!(
                marcadores(es),
                marcadores(en),
                "los marcadores no coinciden entre {es:?} y {en:?}"
            );
        }
    }

    #[test]
    fn tf_sustituye_los_marcadores() {
        INGLES.store(false, Ordering::Relaxed);
        assert_eq!(
            tf("No se pudo guardar: {e}", &[("{e}", "disco lleno")]),
            "No se pudo guardar: disco lleno"
        );

        INGLES.store(true, Ordering::Relaxed);
        assert_eq!(
            tf("No se pudo guardar: {e}", &[("{e}", "disk full")]),
            "Could not save: disk full"
        );
        INGLES.store(false, Ordering::Relaxed);
    }

    #[test]
    fn en_espanol_devuelve_la_cadena_original() {
        INGLES.store(false, Ordering::Relaxed);
        assert_eq!(t("Guardar"), "Guardar");
        // Una cadena que no esta en la tabla tampoco falla.
        assert_eq!(t("no existe en la tabla"), "no existe en la tabla");
    }

    #[test]
    fn en_ingles_traduce() {
        INGLES.store(true, Ordering::Relaxed);
        assert_eq!(t("Guardar"), "Save");
        // Sin entrada se devuelve el español, que es mejor que nada.
        assert_eq!(t("no existe en la tabla"), "no existe en la tabla");
        INGLES.store(false, Ordering::Relaxed);
    }
}
