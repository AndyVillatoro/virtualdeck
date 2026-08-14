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
