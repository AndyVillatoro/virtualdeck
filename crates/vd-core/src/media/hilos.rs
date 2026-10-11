//! Ejecucion en hilos MTA con y sin limite de espera.

/// Ejecuta trabajo de WinRT en un hilo con apartamento **MTA**.
///
/// # Por que hace falta
///
/// SMTC devuelve operaciones asincronas de WinRT y aqui se esperan de forma
/// bloqueante. Eso funciona en un hilo MTA, donde la finalizacion llega por el
/// pool de hilos de COM.
///
/// En un hilo **STA** con bomba de mensajes —como el hilo principal de
/// Electron— se **cuelga para siempre**: la finalizacion tiene que despacharse
/// en ese mismo hilo, y ese hilo esta bloqueado esperandola. El proceso entero
/// deja de responder y Windows ofrece cerrarlo.
///
/// Costaba encontrarlo porque desde Node suelto funciona: su hilo principal no
/// impone esa restriccion. Solo aparece dentro de Electron.
///
/// Se crea un hilo por llamada. Crear un hilo cuesta microsegundos, frente a
/// los 150-400 ms que costaba lanzar PowerShell para lo mismo, asi que no
/// compensa la complejidad de mantener uno vivo con su canal.
pub(super) fn en_hilo_mta<T, F>(trabajo: F) -> Option<T>
where
    T: Send + 'static,
    F: FnOnce() -> T + Send + 'static,
{
    std::thread::spawn(move || {
        // SAFETY: inicializacion estandar. Si el hilo ya tuviera apartamento
        // —no lo tiene, es nuevo— devolveria RPC_E_CHANGED_MODE y se ignora.
        unsafe {
            let _ = windows::Win32::System::Com::CoInitializeEx(
                None,
                windows::Win32::System::Com::COINIT_MULTITHREADED,
            );
        }
        trabajo()
    })
    .join()
    .ok()
}

/// Igual que `en_hilo_mta`, pero se rinde pasado un tiempo.
///
/// `join()` sobre el hilo no se puede limitar, asi que la respuesta viaja por
/// un canal y se espera con `recv_timeout`. Si vence, el hilo se queda ahi
/// colgado —no hay forma de matar un hilo bloqueado en COM— pero **quien llama
/// vuelve**, que es lo que importa: al otro lado esta el hilo principal de
/// Electron y bloquearlo congela la aplicacion entera.
///
/// Solo lo usa el diagnostico. El resto de llamadas consultan **una** sesion,
/// la activa, y esa responde o falla; el diagnostico recorre **todas**, y basta
/// con que una aplicacion haya dejado una sesion zombi para que su
/// `TryGetMediaPropertiesAsync` no termine nunca. Se encontro asi: pulsando el
/// boton "?" del panel de musica con Edge reproduciendo.
pub(super) fn en_hilo_mta_con_limite<T, F>(trabajo: F, limite: std::time::Duration) -> Option<T>
where
    T: Send + 'static,
    F: FnOnce() -> T + Send + 'static,
{
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        // SAFETY: igual que arriba — hilo nuevo, sin apartamento previo.
        unsafe {
            let _ = windows::Win32::System::Com::CoInitializeEx(
                None,
                windows::Win32::System::Com::COINIT_MULTITHREADED,
            );
        }
        // Si el receptor ya se rindio, el envio falla y no pasa nada.
        let _ = tx.send(trabajo());
    });
    rx.recv_timeout(limite).ok()
}
