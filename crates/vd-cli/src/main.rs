//! Banco de pruebas de `vd-core`.
//!
//! Existe para validar el nucleo contra hardware real **antes** de que exista
//! la interfaz grafica: cambiar de dispositivo de audio de verdad, leer la
//! sesion SMTC de verdad, reproducir una macro de verdad.
//!
//! El criterio de "Fase 1 terminada" (ver `docs/MIGRACION-RUST.md`) es que este
//! binario pueda ejecutar cualquier accion de un `deck-config.json` real.

use anyhow::Result;

fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let cmd: Vec<&str> = args.iter().map(String::as_str).collect();

    match cmd.as_slice() {
        ["paths"] => cmd_paths(),
        ["config"] => cmd_config(),
        ["backups"] => cmd_backups(),
        ["audio"] | ["audio", "list"] => cmd_audio_list(),
        ["audio", "set", id] => cmd_audio_set(id),
        ["media"] | ["media", "now"] => cmd_media_now(),
        ["media", "diagnose"] => {
            println!("{}", vd_core::media::diagnose());
            Ok(())
        }
        ["media", cmd] => cmd_media_control(cmd),
        ["rgb"] | ["rgb", "scan"] => cmd_rgb_scan(),
        ["rgb", "probe"] => cmd_rgb_probe(),
        ["rgb", "set", color] => cmd_rgb_set(color),
        ["rgb", "openrgb"] => {
            use vd_core::rgb::{openrgb::PUERTO, OpenRgb};
            match OpenRgb::conectar("127.0.0.1", PUERTO) {
                Ok(mut c) => {
                    let lista = c.listar()?;
                    println!("{} dispositivo(s) via OpenRGB:", lista.len());
                    for d in &lista {
                        println!("  {:>2}  {:<40} {} LED(s)", d.indice, d.nombre, d.leds);
                    }
                }
                Err(e) => {
                    println!("{e}");
                    println!(
                        "
Abri OpenRGB y activa su servidor SDK (Settings -> Enable Server)."
                    );
                }
            }
            Ok(())
        }
        ["rgb", "openrgb", color] => {
            use vd_core::rgb::{openrgb::PUERTO, OpenRgb};
            let mut c = OpenRgb::conectar("127.0.0.1", PUERTO)?;
            let h = color.trim_start_matches('#');
            let rgb = (
                u8::from_str_radix(&h[0..2], 16)?,
                u8::from_str_radix(&h[2..4], 16)?,
                u8::from_str_radix(&h[4..6], 16)?,
            );
            for d in c.listar()? {
                match c.pintar(d.indice, rgb) {
                    Ok(n) => println!("  {:<40} {n} LED(s) pintados", d.nombre),
                    Err(e) => println!("  {:<40} fallo: {e}", d.nombre),
                }
            }
            Ok(())
        }
        ["rgb", "modos"] => {
            use vd_core::rgb::{openrgb::PUERTO, OpenRgb};
            let mut c = OpenRgb::conectar("127.0.0.1", PUERTO)?;
            for d in c.listar()? {
                println!("{:>2}  {} ({} LEDs)", d.indice, d.nombre, d.leds);
                for m in &d.modos {
                    let activo = if m.indice == d.modo_activo { "*" } else { " " };
                    println!("      {activo} {:>2}  {}", m.indice, m.nombre);
                }
            }
            println!("\n(* = modo activo)");
            Ok(())
        }
        ["rgb", "modo", nombre] => cmd_rgb_modo(nombre, None),
        ["rgb", "modo", nombre, color] => cmd_rgb_modo(nombre, Some(color)),
        ["rgb", "perfiles"] => {
            use vd_core::rgb::{openrgb::PUERTO, OpenRgb};
            let mut c = OpenRgb::conectar("127.0.0.1", PUERTO)?;
            let lista = c.perfiles()?;
            if lista.is_empty() {
                println!("OpenRGB no tiene ningun perfil guardado.");
            }
            for p in lista {
                println!("  {p}");
            }
            Ok(())
        }
        ["rgb", "perfil", nombre] => {
            use vd_core::rgb::{openrgb::PUERTO, OpenRgb};
            let mut c = OpenRgb::conectar("127.0.0.1", PUERTO)?;
            c.cargar_perfil(nombre)?;
            println!("Perfil \"{nombre}\" cargado.");
            Ok(())
        }
        ["notify"] => {
            avisar_del_acceso_directo();
            vd_core::notify::notificar("VirtualDeck", "Prueba de notificacion")?;
            println!("Notificacion enviada.");
            Ok(())
        }
        ["notify", titulo] => {
            avisar_del_acceso_directo();
            vd_core::notify::notificar(titulo, "")?;
            println!("Notificacion enviada.");
            Ok(())
        }
        ["notify", titulo, cuerpo] => {
            avisar_del_acceso_directo();
            vd_core::notify::notificar(titulo, cuerpo)?;
            println!("Notificacion enviada.");
            Ok(())
        }
        ["captura"] => {
            vd_core::launcher::open_path("ms-screenclip:")?;
            println!("Herramienta de recorte de Windows abierta.");
            Ok(())
        }
        ["rgb", "release"] => {
            vd_core::rgb::AuraController::open()?.release()?;
            println!("Controlador devuelto a su modo de efectos propio.");
            Ok(())
        }
        ["brillo"] => {
            match vd_core::launcher::brightness() {
                Some(v) => println!("Brillo actual: {v}%"),
                None => println!("Ninguna pantalla informa su brillo."),
            }
            Ok(())
        }
        ["brillo", nivel] => {
            let n: i64 = nivel.parse().unwrap_or(50);
            let aplicadas = vd_core::launcher::set_brightness(n)?;
            println!("Brillo {n}% aplicado a {aplicadas} pantalla(s).");
            if aplicadas == 0 {
                println!("(ninguna pantalla acepto el cambio: puede no soportar DDC/CI)");
            }
            Ok(())
        }
        ["macro", "record"] => cmd_macro_record(5),
        ["macro", "record", secs] => cmd_macro_record(secs.parse().unwrap_or(5)),
        ["macro", "play", archivo] => cmd_macro_play(archivo, 3),
        ["macro", "play", archivo, espera] => cmd_macro_play(archivo, espera.parse().unwrap_or(3)),
        ["sensors"] | ["sensors", "list"] => cmd_sensors_list(None),
        ["sensors", "list", filtro] => cmd_sensors_list(Some(filtro)),
        ["sensors", "get", id] => cmd_sensors_get(id),
        ["sensors", "status"] => cmd_sensors_status(),
        ["sensors", "watch"] => cmd_sensors_watch(10),
        ["sensors", "watch", secs] => cmd_sensors_watch(secs.parse().unwrap_or(10)),
        ["run"] | ["run", "list"] => cmd_run_list(),
        ["run", "dry", id] => cmd_run(id, true),
        ["run", id] => cmd_run(id, false),
        ["silencio"] => {
            println!(
                "Silencio: {}",
                if vd_core::launcher::is_muted()? {
                    "activado"
                } else {
                    "desactivado"
                }
            );
            Ok(())
        }
        ["silencio", "on"] => {
            vd_core::launcher::set_muted(true)?;
            println!("Silencio activado.");
            Ok(())
        }
        ["silencio", "off"] => {
            vd_core::launcher::set_muted(false)?;
            println!("Silencio desactivado.");
            Ok(())
        }
        ["clima"] => cmd_clima(false),
        ["clima", "force"] => cmd_clima(true),
        ["log"] | ["log", "show"] => cmd_log_show(),
        ["log", "test"] => cmd_log_test(),
        ["log", "clear"] => {
            vd_core::log::clear();
            println!("Registro vaciado.");
            Ok(())
        }
        [] | ["help"] | ["--help"] | ["-h"] => {
            print_help();
            Ok(())
        }
        other => {
            eprintln!("Comando desconocido: {}\n", other.join(" "));
            print_help();
            std::process::exit(2);
        }
    }
}

fn print_help() {
    println!(
        "vd-cli — banco de pruebas de VirtualDeck core\n\
         \n\
         USO:\n    vd-cli <comando>\n\
         \n\
         COMANDOS:\n\
         \x20   paths      Muestra las rutas de datos (config, backups, logs, imagenes)\n\
         \x20   config     Carga la configuracion real y muestra un resumen\n\
         \x20   backups    Lista los backups de configuracion existentes\n\
         \x20   audio list Lista los dispositivos de salida de audio\n\
         \x20   audio set <id|nombre>\n\
         \x20              Cambia el dispositivo predeterminado (acepta id o nombre parcial)\n\
         \x20   media now  Muestra que se esta reproduciendo\n\
         \x20   media play-pause|next|prev|stop|shuffle|repeat\n\
         \x20              Controla la reproduccion\n\
         \x20   media diagnose\n\
         \x20              Estado de SMTC sesion por sesion\n\
         \x20   macro record [segundos]\n\
         \x20              Graba teclado y raton (5 s por defecto) a macro.json\n\
         \x20   macro play <archivo> [espera]\n\
         \x20              Reproduce una macro tras N segundos (3 por defecto,\n\
         \x20              para que puedas enfocar la ventana destino)\n\
         \x20   rgb scan   Lista los dispositivos RGB que se ven por USB HID\n\
         \x20   rgb openrgb [#RRGGBB]\n\
         \x20              Lista via OpenRGB, o pinta todo de ese color\n\
         \x20   rgb modos  Lista los modos de cada dispositivo (* = el activo)\n\
         \x20   rgb modo <nombre> [#RRGGBB]\n\
         \x20              Aplica un modo por nombre (basta con parte)\n\
         \x20   rgb perfiles / rgb perfil <nombre>\n\
         \x20              Lista o carga un perfil guardado en OpenRGB\n\
         \x20   notify [titulo] [cuerpo]\n\
         \x20              Muestra una notificacion del sistema\n\
         \x20   captura    Abre la herramienta de recorte de Windows\n\
         \x20   brillo [nivel]\n\
         \x20              Lee o fija el brillo de las pantallas (DDC/CI)\n\
         \x20   sensors list [filtro]\n\
         \x20              Lista los sensores (filtro: texto libre sobre id/nombre)\n\
         \x20   sensors get <id>\n\
         \x20              Lee un sensor concreto por su id\n\
         \x20   sensors status\n\
         \x20              Estado de los dos niveles (nativo y LHM opcional)\n\
         \x20   sensors watch [segundos]\n\
         \x20              Refresca en vivo CPU/GPU (10 s por defecto)\n\
         \x20   run list   Lista los botones con accion del deck-config real\n\
         \x20   run <id>   Ejecuta ese boton de verdad (acepta id parcial)\n\
         \x20   run dry <id>\n\
         \x20              Muestra que haria, sin ejecutar nada\n\
         \x20   clima [force]\n\
         \x20              Consulta el clima actual (force ignora la cache)\n\
         \x20   log show|test|clear\n\
         \x20              Muestra, prueba o vacia el registro\n\
         \x20   help       Muestra esta ayuda\n\
         \n\
         Fase 1 completa: `run` ejecuta cualquier accion del deck-config real."
    );
}

/// Aplica un modo a todos los dispositivos que OpenRGB vea.
fn cmd_rgb_modo(nombre: &str, color: Option<&str>) -> Result<()> {
    use vd_core::rgb::{openrgb::PUERTO, OpenRgb};

    let rgb = match color {
        Some(c) => {
            let h = c.trim_start_matches('#');
            Some((
                u8::from_str_radix(&h[0..2], 16)?,
                u8::from_str_radix(&h[2..4], 16)?,
                u8::from_str_radix(&h[4..6], 16)?,
            ))
        }
        None => None,
    };

    let mut c = OpenRgb::conectar("127.0.0.1", PUERTO)?;
    for d in c.listar()? {
        match c.aplicar_modo(d.indice, nombre, rgb, None) {
            Ok(aplicado) => println!("  {:<40} modo \"{aplicado}\"", d.nombre),
            Err(e) => println!("  {:<40} {e}", d.nombre),
        }
    }
    Ok(())
}

/// Avisa antes de notificar, porque la primera vez deja un acceso directo.
fn avisar_del_acceso_directo() {
    if let Some(ruta) = vd_core::notify::ruta_registro() {
        if !ruta.exists() {
            println!(
                "Nota: para poder notificar, Windows exige un acceso directo con el\n\
                 identificador de la aplicacion. Se va a crear en:\n  {}\n\
                 Se puede borrar despues sin romper nada.\n",
                ruta.display()
            );
        }
    }
}

fn cmd_paths() -> Result<()> {
    use vd_core::config;

    println!(
        "Directorio de datos : {}",
        config::user_data_dir()?.display()
    );
    println!("Configuracion       : {}", config::config_path()?.display());
    println!("Backups             : {}", config::backups_dir()?.display());
    println!("Logs                : {}", config::logs_dir()?.display());
    println!("Imagenes            : {}", config::images_dir()?.display());

    let cfg = config::config_path()?;
    println!(
        "\nEstado: {}",
        if cfg.exists() {
            "hay una configuracion de VirtualDeck existente en esta maquina."
        } else {
            "no hay configuracion previa (instalacion limpia)."
        }
    );
    Ok(())
}

/// Carga la config real (migrandola si hace falta) y resume su contenido.
/// Sirve para verificar de un vistazo que el modelo de Rust entiende el JSON
/// que dejo la version Electron.
fn cmd_config() -> Result<()> {
    use vd_core::config;

    let Some(cfg) = config::load()? else {
        println!("No hay configuracion previa en esta maquina (instalacion limpia).");
        return Ok(());
    };

    println!(
        "Version de schema : {} (actual: {})",
        cfg.config_version
            .map(|v| v.to_string())
            .unwrap_or_else(|| "sin especificar".into()),
        config::CURRENT_CONFIG_VERSION
    );
    println!("Acento            : {}", cfg.accent);
    println!("Fondo             : {}", cfg.wallpaper);
    println!("Idioma            : {:?}", cfg.language);
    println!("Tema              : {:?}", cfg.theme);
    println!(
        "Perfiles          : {}",
        cfg.profiles.as_ref().map_or(0, Vec::len)
    );
    println!(
        "Variables         : {}",
        cfg.state.as_ref().map_or(0, |s| s.len())
    );

    println!("\nPaginas ({}):", cfg.pages.len());
    for (i, p) in cfg.pages.iter().enumerate() {
        let usados = cfg
            .buttons_of_page(i as i64)
            .filter(|b| !b.is_empty())
            .count();
        let total = cfg.buttons_of_page(i as i64).count();
        println!(
            "  {i}. {:<16} grilla {}x{}  ·  {usados}/{total} botones configurados",
            p.name,
            p.columns(),
            p.rows()
        );
    }

    // Conteo por tipo de accion: la forma mas directa de ver que tipos tiene
    // que soportar el motor de acciones para esta instalacion.
    let mut tipos: std::collections::BTreeMap<String, usize> = Default::default();
    for b in cfg
        .buttons
        .iter()
        .filter(|b| !b.action.action_type.is_none())
    {
        *tipos
            .entry(format!("{:?}", b.action.action_type))
            .or_default() += 1;
    }
    if !tipos.is_empty() {
        println!("\nAcciones en uso:");
        for (tipo, n) in &tipos {
            println!("  {tipo:<16} x{n}");
        }
    }

    Ok(())
}

/// Lista los dispositivos de salida de audio.
fn cmd_audio_list() -> Result<()> {
    let devices = vd_core::audio::list_devices()?;
    if devices.is_empty() {
        println!("No se encontraron dispositivos de salida activos.");
        return Ok(());
    }

    println!("{} dispositivo(s) de salida:\n", devices.len());
    for d in &devices {
        println!("  {} {}", if d.is_default { "●" } else { "○" }, d.name);
        println!("    {}", d.id);
    }
    println!("\n● = predeterminado actual");
    Ok(())
}

/// Cambia el dispositivo predeterminado. Acepta un id completo o un nombre
/// (exacto o parcial), igual que la accion `audio-device` del deck.
fn cmd_audio_set(needle: &str) -> Result<()> {
    use vd_core::audio;

    // Un id de Windows siempre empieza con '{'; cualquier otra cosa se trata
    // como nombre, que es lo que un humano va a escribir en la CLI.
    let device = if needle.starts_with('{') {
        audio::list_devices()?
            .into_iter()
            .find(|d| d.id == needle)
            .ok_or_else(|| anyhow::anyhow!("no hay ningun dispositivo con id {needle}"))?
    } else {
        audio::find_device_by_name(needle)?
    };

    if device.is_default {
        println!("\"{}\" ya era el predeterminado.", device.name);
        return Ok(());
    }

    println!("Cambiando a \"{}\"...", device.name);
    audio::set_default_device(&device.id)?;
    println!(
        "OK — verificado: el predeterminado ahora es \"{}\".",
        device.name
    );
    Ok(())
}

/// Muestra que se esta reproduciendo.
fn cmd_media_now() -> Result<()> {
    use vd_core::media;

    let Some(np) = media::now_playing() else {
        println!("No hay nada reproduciendose (ni por SMTC ni por titulos de ventana).");
        return Ok(());
    };

    println!("Titulo   : {}", np.title);
    if !np.artist.is_empty() {
        println!("Artista  : {}", np.artist);
    }
    println!("Estado   : {:?}", np.status);
    println!(
        "Fuente   : {}",
        if np.source.is_empty() {
            "(desconocida)"
        } else {
            &np.source
        }
    );
    match &np.thumbnail {
        Some(t) => println!("Caratula : {} ({} bytes)", t.mime, t.bytes.len()),
        None => println!("Caratula : (sin caratula)"),
    }
    Ok(())
}

/// Envia un comando de control de reproduccion.
fn cmd_media_control(cmd: &str) -> Result<()> {
    use vd_core::media::{self, MediaCommand};

    match cmd {
        "shuffle" => {
            let activo = media::toggle_shuffle()?;
            println!(
                "Aleatorio: {}",
                if activo { "activado" } else { "desactivado" }
            );
        }
        "repeat" => {
            let modo = media::cycle_repeat()?;
            println!("Repeticion: {modo:?}");
        }
        otro => {
            let comando = match otro {
                "play-pause" => MediaCommand::PlayPause,
                "next" => MediaCommand::Next,
                "prev" => MediaCommand::Prev,
                "stop" => MediaCommand::Stop,
                _ => anyhow::bail!(
                    "comando de media desconocido: {otro}. \
                     Validos: now, play-pause, next, prev, stop, shuffle, repeat, diagnose"
                ),
            };
            media::control(comando)?;
            println!("OK — {otro}");
        }
    }
    Ok(())
}

/// Enumera los dispositivos HID que podrian controlarse de forma nativa.
fn cmd_rgb_scan() -> Result<()> {
    use vd_core::rgb::{self, DeviceKind};

    let dispositivos = rgb::scan()?;
    if dispositivos.is_empty() {
        println!("No se encontraron dispositivos HID de fabricantes RGB conocidos.");
        println!("Eso NO significa que no tengas RGB: puede estar todo detras del");
        println!("SMBus de la placa, que no aparece como HID.");
        return Ok(());
    }

    println!("{} dispositivo(s) HID relevantes:\n", dispositivos.len());
    for d in &dispositivos {
        let etiqueta = match d.kind {
            DeviceKind::AuraUsb => "  <-- CONTROLADOR AURA USB (¡se puede sin driver!)",
            DeviceKind::Cooler => "  (refrigeracion)",
            DeviceKind::Peripheral => "  (periferico)",
            DeviceKind::Other => "",
        };
        println!(
            "  {} — {}{}",
            d.vendor.name(),
            if d.product.is_empty() {
                "(sin nombre)"
            } else {
                &d.product
            },
            etiqueta
        );
        println!(
            "    VID:PID {:04X}:{:04X}  interfaz {}",
            d.vendor_id, d.product_id, d.interface
        );
    }

    let hay_aura = dispositivos.iter().any(|d| d.kind == DeviceKind::AuraUsb);
    println!(
        "\n{}",
        if hay_aura {
            "Hay un controlador Aura USB: los headers ARGB de la placa se pueden\n\
             manejar por HID, sin driver de kernel ni permisos de administrador."
        } else {
            "No se detecto un controlador Aura USB. El RGB de la placa\n\
             probablemente va por SMBus, que si necesita driver de kernel."
        }
    );
    Ok(())
}

/// Interroga al controlador Aura. Operacion de SOLO LECTURA: no toca las luces.
fn cmd_rgb_probe() -> Result<()> {
    use vd_core::rgb::AuraController;

    println!("Colecciones HID del controlador Aura:\n");
    for e in vd_core::rgb::aura::endpoints()? {
        println!(
            "  PID {:04X}  interfaz {}  usage_page {:#06X}  usage {:#06X}",
            e.product_id, e.interface, e.usage_page, e.usage
        );
        println!(
            "    reports -> entrada {}  salida {}  feature {}",
            e.input_len, e.output_len, e.feature_len
        );
    }

    println!("\nInterrogando (solo lectura)...\n");
    let ctrl = AuraController::open()?;
    let (quizas, log) = ctrl.probe_verbose();

    println!("Bitacora de intentos:");
    for linea in &log {
        println!("  {linea}");
    }
    println!();

    let Some(info) = quizas else {
        println!("El controlador no respondio. La bitacora de arriba indica por que.");
        return Ok(());
    };

    println!("Product ID : {:04X}", info.product_id);
    println!(
        "Firmware   : {}",
        if info.firmware.is_empty() {
            "(sin respuesta legible)"
        } else {
            &info.firmware
        }
    );
    println!("Transporte : {:?}", info.transport);

    if info.config_table.is_empty() {
        println!("Tabla de configuracion: sin respuesta.");
    } else {
        println!(
            "\nTabla de configuracion ({} bytes):",
            info.config_table.len()
        );
        for (i, trozo) in info.config_table.chunks(16).enumerate() {
            let hex: Vec<String> = trozo.iter().map(|b| format!("{b:02X}")).collect();
            println!("  {:02X}: {}", i * 16, hex.join(" "));
        }
    }
    Ok(())
}

/// Pinta toda la iluminacion Aura de un color.
///
/// Sobrescribe el efecto que estuviera activo. Es volatil: no se guarda en la
/// memoria del controlador, asi que un reinicio devuelve el perfil de ASUS.
fn cmd_rgb_set(color: &str) -> Result<()> {
    use vd_core::rgb::{AuraController, Rgb};

    let c = Rgb::parse(color).ok_or_else(|| {
        anyhow::anyhow!(
            "color invalido: {color:?}. Use #RRGGBB o: negro, blanco, rojo, verde, azul"
        )
    })?;

    let ctrl = AuraController::open()?;
    ctrl.set_all(c)?;

    println!(
        "Aplicado #{:02X}{:02X}{:02X} a {} canal(es).",
        c.r,
        c.g,
        c.b,
        AuraController::CHANNELS
    );
    println!("(volatil: al reiniciar vuelve tu perfil de ASUS)");
    Ok(())
}

/// Graba una macro durante N segundos y la guarda en macro.json.
fn cmd_macro_record(segundos: u64) -> Result<()> {
    use std::io::Write;
    use vd_core::macros;

    println!("Grabando teclado y raton durante {segundos} s...");
    println!("(todo lo que teclees y cliquees en CUALQUIER ventana queda registrado)\n");

    macros::start_recording()?;
    for restante in (1..=segundos).rev() {
        print!("\r  {restante} s ");
        let _ = std::io::stdout().flush();
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
    let pasos = macros::stop_recording()?;
    println!("\r            \r");

    if pasos.is_empty() {
        println!("No se capturo ningun evento.");
        return Ok(());
    }

    println!("{} paso(s) capturados:", pasos.len());
    for (i, p) in pasos.iter().enumerate().take(20) {
        let detalle = match (&p.value, p.x, p.y) {
            (Some(v), _, _) => v.clone(),
            (None, Some(x), Some(y)) => format!("clic en ({x}, {y})"),
            _ => String::new(),
        };
        println!(
            "  {:>2}. {:?} {detalle} (+{} ms)",
            i + 1,
            p.step_type,
            p.delay_ms.unwrap_or(0)
        );
    }
    if pasos.len() > 20 {
        println!("  ... y {} mas", pasos.len() - 20);
    }

    std::fs::write("macro.json", serde_json::to_string_pretty(&pasos)?)?;
    println!("\nGuardado en macro.json — reproducilo con: vd-cli macro play macro.json");
    Ok(())
}

/// Reproduce una macro desde un archivo JSON, tras una cuenta regresiva.
///
/// La espera existe porque una macro le escribe a la ventana enfocada: hay que
/// darle tiempo al usuario para poner el foco donde corresponde. En la app real
/// ese rol lo cumple el hack de blur de la ventana antes de ejecutar.
fn cmd_macro_play(archivo: &str, espera: u64) -> Result<()> {
    use std::io::Write;
    use vd_core::config::model::MacroStep;
    use vd_core::macros;

    let texto = std::fs::read_to_string(archivo)
        .map_err(|e| anyhow::anyhow!("no se pudo leer {archivo}: {e}"))?;
    let pasos: Vec<MacroStep> = serde_json::from_str(&texto)?;

    println!("{} paso(s). Enfoca la ventana destino...", pasos.len());
    for restante in (1..=espera).rev() {
        print!("\r  reproduciendo en {restante} s ");
        let _ = std::io::stdout().flush();
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
    println!("\r                          \r");

    macros::play(&pasos, 1)?;
    println!("OK — macro reproducida.");
    Ok(())
}

/// Lista los backups de configuracion, del mas reciente al mas viejo.
fn cmd_backups() -> Result<()> {
    use vd_core::config;

    let backups = config::list_backups()?;
    if backups.is_empty() {
        println!("No hay backups de configuracion.");
        return Ok(());
    }

    println!(
        "{} backup(s), del mas reciente al mas viejo:\n",
        backups.len()
    );
    for b in &backups {
        println!("  {:<44} {:>7} bytes", b.filename, b.size_bytes);
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// sensors
// ---------------------------------------------------------------------------

/// Construye el lector aplicando los ajustes del `deck-config.json` real, para
/// que el nivel 2 (LHM) se active exactamente igual que lo hara la aplicacion.
fn sensores_configurados() -> vd_core::sensors::Sensors {
    let mut s = vd_core::sensors::Sensors::new();
    if let Ok(Some(cfg)) = vd_core::config::load() {
        if let Some(ajustes) = cfg.sensors.as_ref() {
            s.configure(ajustes);
        }
    }
    s
}

fn etiqueta_fuente(f: vd_core::sensors::SensorSource) -> &'static str {
    use vd_core::sensors::SensorSource::*;
    match f {
        Native => "nativo",
        Nvml => "nvml",
        Lhm => "lhm",
    }
}

fn cmd_sensors_list(filtro: Option<&str>) -> Result<()> {
    let mut s = sensores_configurados();
    let filtro_bajo = filtro.map(str::to_lowercase);

    // Dos muestras: el trafico de red y la carga por nucleo son tasas, y una
    // tasa necesita dos puntos en el tiempo. Con una sola lectura la red no
    // aparece y la CPU sale con el promedio desde el arranque del proceso.
    // La aplicacion no necesita esto porque consulta de forma continua; un
    // comando de una sola pasada, si.
    s.list(true);
    std::thread::sleep(std::time::Duration::from_millis(600));

    let lista: Vec<_> = s
        .list(true)
        .iter()
        .filter(|x| match &filtro_bajo {
            None => true,
            Some(f) => {
                x.id.to_lowercase().contains(f)
                    || x.name.to_lowercase().contains(f)
                    || x.hardware.to_lowercase().contains(f)
            }
        })
        .cloned()
        .collect();

    if lista.is_empty() {
        println!("Sin sensores que coincidan.");
        return Ok(());
    }

    let mut hardware_actual = String::new();
    for x in &lista {
        if x.hardware != hardware_actual {
            hardware_actual = x.hardware.clone();
            println!("\n{hardware_actual}  [{:?}]", x.category);
        }
        println!(
            "  {:<28} {:>10.1} {:<5} {:<7} {}",
            x.name,
            x.value,
            x.unit,
            etiqueta_fuente(x.source),
            x.id
        );
    }
    println!("\n{} sensores.", lista.len());
    Ok(())
}

fn cmd_sensors_get(id: &str) -> Result<()> {
    let mut s = sensores_configurados();
    match s.get(id) {
        Some(x) => {
            println!("{} = {} {}", x.name, x.value, x.unit);
            println!("  hardware : {}", x.hardware);
            println!("  categoria: {:?}", x.category);
            println!("  tipo     : {:?}", x.kind);
            println!("  fuente   : {}", etiqueta_fuente(x.source));
            if let (Some(mn), Some(mx)) = (x.min, x.max) {
                println!("  rango    : {mn} .. {mx}");
            }
        }
        None => println!("No existe ningun sensor con id '{id}'."),
    }
    Ok(())
}

fn cmd_sensors_status() -> Result<()> {
    let mut s = sensores_configurados();
    let st = s.status();

    println!("NIVEL 1 — nativo (siempre disponible)");
    println!("  sensores de sistema: {}", st.native_count);
    if st.nvml_devices.is_empty() {
        println!(
            "  GPU NVIDIA         : no disponible{}",
            st.nvml_error
                .as_deref()
                .map(|e| format!(" ({e})"))
                .unwrap_or_default()
        );
    } else {
        for (i, d) in st.nvml_devices.iter().enumerate() {
            println!("  GPU NVIDIA {i}       : {d}");
        }
    }

    println!("\nNIVEL 2 — LibreHardwareMonitor (opcional)");
    println!(
        "  habilitado : {}",
        if st.lhm_enabled { "si" } else { "no" }
    );
    println!(
        "  conectado  : {}",
        if st.lhm_connected { "si" } else { "no" }
    );
    println!("  sensores   : {}", st.lhm_count);
    if let Some(e) = &st.lhm_error {
        println!("  error      : {e}");
    }
    if !st.lhm_enabled {
        println!(
            "\n  Nota: sin nivel 2 no hay temperatura de CPU, voltajes ni\n\
             \x20 ventiladores de placa — requieren driver de kernel."
        );
    }
    Ok(())
}

/// Refresca en vivo. Sirve para comprobar que los valores **se mueven**: una
/// lectura suelta puede parecer correcta y estar congelada.
fn cmd_sensors_watch(segundos: u64) -> Result<()> {
    use std::time::{Duration, Instant};

    let mut s = sensores_configurados();
    let interesantes = [
        "/native/cpu/load",
        "/native/memory/load",
        "/nvml/0/temperature",
        "/nvml/0/load",
        "/nvml/0/power",
        "/nvml/0/fan/0",
    ];

    println!("Observando {segundos} s (Ctrl+C para cortar)\n");
    let inicio = Instant::now();
    while inicio.elapsed().as_secs() < segundos {
        let mut linea = String::new();
        for id in &interesantes {
            if let Some(x) = s.get(id) {
                linea.push_str(&format!("{}={:.0}{}  ", x.name, x.value, x.unit));
            }
        }
        println!("{linea}");
        std::thread::sleep(Duration::from_millis(1100));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// clima y registro
// ---------------------------------------------------------------------------

fn cmd_clima(force: bool) -> Result<()> {
    let mut w = vd_core::weather::Weather::new();
    let t = std::time::Instant::now();
    match w.get(force) {
        Some(d) => {
            let lugar = if d.city.is_empty() {
                d.country.clone()
            } else {
                format!("{}, {}", d.city, d.country)
            };
            println!("{lugar}");
            println!("  temperatura : {} C", d.temp);
            println!("  condicion   : codigo WMO {}", d.code);
            println!(
                "  consulta    : {:.0} ms",
                t.elapsed().as_secs_f64() * 1000.0
            );
        }
        None => {
            println!("No se pudo obtener el clima.");
            println!("Puede ser falta de red, o que los tres proveedores de geo-IP");
            println!("esten rechazando peticiones ahora mismo.");
        }
    }
    Ok(())
}

fn cmd_log_show() -> Result<()> {
    match vd_core::log::log_path() {
        Some(p) => println!("Archivo: {}\n", p.display()),
        None => println!("No se pudo determinar la ruta del registro.\n"),
    }
    let texto = vd_core::log::read_recent(16 * 1024);
    if texto.trim().is_empty() {
        println!("(vacio)");
    } else {
        print!("{texto}");
    }
    Ok(())
}

/// Escribe una entrada de cada nivel y la vuelve a leer. Comprueba de punta a
/// punta que el registro escribe donde dice y que lo escrito se recupera intacto
/// —acentos incluidos, que es donde fallaba la version con PowerShell—.
fn cmd_log_test() -> Result<()> {
    use vd_core::log::{self, Level};

    log::info("cli", "prueba de registro: nivel informativo");
    log::warn("cli", "prueba de registro: advertencia");
    log::write_meta(
        Level::Error,
        "cli",
        "prueba con acentos y ñ, y un dato adjunto",
        Some(&serde_json::json!({ "modulo": "log", "ok": true })),
    );

    let texto = log::read_recent(4096);
    let escribio = texto.contains("prueba con acentos y ñ");
    println!(
        "{}",
        if escribio {
            "OK: las tres entradas se escribieron y se pudieron releer."
        } else {
            "FALLO: no se encontro lo que se acaba de escribir."
        }
    );
    for linea in texto
        .lines()
        .rev()
        .take(3)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
    {
        println!("  {linea}");
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// motor de acciones
// ---------------------------------------------------------------------------

/// Convierte el estado guardado en la config al que usa el motor.
fn estado_de(cfg: &vd_core::config::model::DeckConfig) -> vd_core::actions::State {
    cfg.state
        .clone()
        .map(|m| m.into_iter().collect())
        .unwrap_or_default()
}

/// Lista los botones que tienen algo que ejecutar, con su id.
fn cmd_run_list() -> Result<()> {
    let Some(cfg) = vd_core::config::load()? else {
        println!("No hay configuracion en esta maquina.");
        return Ok(());
    };

    let mut n = 0;
    for b in &cfg.buttons {
        if b.action.action_type.is_none() && b.actions.is_none() {
            continue;
        }
        let pasos = b.actions.as_ref().map_or(1, Vec::len);
        println!(
            "  {:<38} pag {}  {:<22} {}",
            b.id,
            b.page,
            format!("{:?}", b.action.action_type),
            if pasos > 1 {
                format!("{} — secuencia de {pasos} pasos", b.label)
            } else {
                b.label.clone()
            }
        );
        n += 1;
    }
    println!("\n{n} botones con accion. Ejecutar con: vd-cli run <id>");
    Ok(())
}

/// Ejecuta el botón indicado del `deck-config.json` real.
///
/// Este comando **es** el criterio de "Fase 1 terminada": el núcleo puede
/// ejecutar cualquier acción de una configuración de verdad sin abrir una
/// ventana.
fn cmd_run(id: &str, seco: bool) -> Result<()> {
    let Some(cfg) = vd_core::config::load()? else {
        println!("No hay configuracion en esta maquina.");
        return Ok(());
    };

    // Se acepta un id parcial: los ids reales son largos y escribirlos enteros
    // a mano es incomodo.
    let Some(b) = cfg.buttons.iter().find(|b| b.id == id || b.id.contains(id)) else {
        println!("No hay ningun boton cuyo id contenga '{id}'.");
        println!("Usa 'vd-cli run list' para verlos.");
        return Ok(());
    };

    let secuencia: Vec<_> = match &b.actions {
        Some(v) if !v.is_empty() => v.clone(),
        _ => vec![b.action.clone()],
    };

    println!("Boton  : {} ({})", b.label, b.id);
    println!("Pasos  : {}", secuencia.len());
    for (i, a) in secuencia.iter().enumerate() {
        println!("  {}. {:?}", i + 1, a.action_type);
    }

    if seco {
        println!("\n(simulacion: no se ejecuto nada)");
        return Ok(());
    }

    println!("\nEjecutando...\n");
    let t = std::time::Instant::now();
    let r = vd_core::actions::run_sequence(&secuencia, &estado_de(&cfg));

    println!(
        "Resultado : {}",
        if r.ok { "correcto" } else { "con errores" }
    );
    println!("Duracion  : {:.0} ms", t.elapsed().as_secs_f64() * 1000.0);
    if let Some(e) = &r.error {
        println!("Error     : {e}");
    }
    if !r.for_ui.is_empty() {
        println!("Para la UI: {}", r.for_ui.join(", "));
    }

    // Solo se muestran las variables que cambiaron: el estado completo puede ser
    // largo y lo interesante es el efecto de esta ejecucion.
    let previo = estado_de(&cfg);
    let cambios: Vec<_> = r
        .state
        .iter()
        .filter(|(k, v)| previo.get(*k) != Some(*v))
        .collect();
    if !cambios.is_empty() {
        println!("\nVariables modificadas:");
        for (k, v) in cambios {
            println!("  {k} = {v}");
        }
        println!("\n(no se guardaron en disco: el motor no escribe la configuracion)");
    }
    Ok(())
}
