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
         \x20   help       Muestra esta ayuda\n\
         \n\
         Se iran agregando comandos por modulo: launcher, rgb, sensors."
    );
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
