//! Mete el icono y los datos de versión dentro del ejecutable.
//!
//! Sin esto el `.exe` sale con el icono genérico de Windows y sin ninguna
//! información en «Propiedades»: se ve como un binario suelto, no como una
//! aplicación. El icono importa además porque el acceso directo del menú Inicio
//! y la ventana lo heredan de aquí.

fn main() {
    // El recurso solo existe en Windows; en cualquier otro sistema esto no hace
    // nada y la compilación sigue.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }

    // El icono vive en `assets/` y no en `build/`, que está en .gitignore: allí
    // lo genera un script de Node, y la migración existe precisamente para no
    // necesitar Node. Copiado aquí, un clon limpio compila sin nada más.
    let icono = "assets/icon.ico";
    println!("cargo:rerun-if-changed={icono}");
    println!("cargo:rerun-if-changed=build.rs");

    let mut recurso = winresource::WindowsResource::new();
    recurso.set_icon(icono);
    recurso.set("ProductName", "VirtualDeck");
    recurso.set("FileDescription", "VirtualDeck");
    recurso.set("CompanyName", "Andy Villatoro");
    recurso.set(
        "LegalCopyright",
        "© Andy Villatoro. Todos los derechos reservados.",
    );

    if let Err(e) = recurso.compile() {
        // No es motivo para romper la compilación: sin recurso el binario
        // funciona igual, solo que feo. Pero se avisa, porque un instalador con
        // el icono genérico es un defecto que se cuela sin que nadie lo note.
        println!("cargo:warning=no se pudo incrustar el icono ni la version: {e}");
    }
}
