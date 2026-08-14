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
         \x20   help       Muestra esta ayuda\n\
         \n\
         Se iran agregando comandos por modulo: audio, media, macro, rgb, sensors."
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
