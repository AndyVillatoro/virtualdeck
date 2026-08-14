//! `IPolicyConfig`: la interfaz COM **no documentada** que Windows usa para
//! cambiar el dispositivo de audio predeterminado.
//!
//! # Por que esto es delicado
//!
//! Microsoft nunca documento esta interfaz, asi que no hay bindings oficiales:
//! el orden de la vtable tiene que coincidir **exactamente** con el de Windows
//! o las llamadas caen en el metodo equivocado (y en el peor caso corrompen la
//! pila). Los IIDs y el orden que hay aca vienen del codigo de la version
//! Electron (`electron/main/audio.ts`), que esta verificado funcionando en
//! Windows 10 y 11, y coinciden con los del crate `com-policy-config`.
//!
//! Un error historico del proyecto: usar el **CLSID** `870AF99C-…` como si
//! fuera el IID de la interfaz. Son cosas distintas —
//! `PolicyConfigClient` es la coclass, `IPolicyConfig` es la interfaz— y
//! confundirlos hace que `QueryInterface` devuelva `E_NOINTERFACE`.
//!
//! # Estrategia
//!
//! Solo se llama a `SetDefaultEndpoint`. Los demas slots de la vtable se
//! declaran como punteros opacos: no hace falta tiparlos porque nunca se
//! invocan, y todos los punteros a funcion miden lo mismo, asi que el layout
//! se mantiene correcto. Menos superficie para equivocarse.

use std::ffi::c_void;
use std::ptr;

use windows::core::{Interface, GUID, HRESULT, PCWSTR};
use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_ALL};
use windows_core::IUnknown;

/// Coclass `PolicyConfigClient`. **No** es el IID de la interfaz.
const CLSID_POLICY_CONFIG_CLIENT: GUID = GUID::from_u128(0x870af99c_171d_4f9e_af0d_e63df40c2bc9);

/// `IPolicyConfig` moderna (Windows 7+).
const IID_POLICY_CONFIG: GUID = GUID::from_u128(0xf8679f50_850a_41cf_9c72_430f290290c8);

/// `IPolicyConfigVista`. Algunas builds solo exponen esta; su vtable es igual a
/// la moderna **menos** `ResetDeviceFormat`, que en Vista no existe.
const IID_POLICY_CONFIG_VISTA: GUID = GUID::from_u128(0x568b9108_44bf_40b4_9006_86afe5b5a620);

/// Slot de vtable que no usamos. Es un puntero a funcion opaco: ocupa el lugar
/// correcto sin comprometernos con una firma que no necesitamos.
type OpaqueSlot = *const c_void;

/// Firma real del unico metodo que llamamos.
type SetDefaultEndpointFn =
    unsafe extern "system" fn(this: *mut c_void, device_id: PCWSTR, role: u32) -> HRESULT;

/// Vtable de `IPolicyConfig` (variante moderna).
#[repr(C)]
struct PolicyConfigVtbl {
    // IUnknown
    query_interface: OpaqueSlot,
    add_ref: OpaqueSlot,
    release: unsafe extern "system" fn(this: *mut c_void) -> u32,
    // IPolicyConfig
    get_mix_format: OpaqueSlot,
    get_device_format: OpaqueSlot,
    reset_device_format: OpaqueSlot, // <- ausente en la variante Vista
    set_device_format: OpaqueSlot,
    get_processing_period: OpaqueSlot,
    set_processing_period: OpaqueSlot,
    get_share_mode: OpaqueSlot,
    set_share_mode: OpaqueSlot,
    get_property_value: OpaqueSlot,
    set_property_value: OpaqueSlot,
    set_default_endpoint: SetDefaultEndpointFn,
    set_endpoint_visibility: OpaqueSlot,
}

/// Vtable de `IPolicyConfigVista`: identica salvo que no tiene
/// `ResetDeviceFormat`, con lo cual todo lo posterior se corre un slot.
#[repr(C)]
struct PolicyConfigVistaVtbl {
    query_interface: OpaqueSlot,
    add_ref: OpaqueSlot,
    release: unsafe extern "system" fn(this: *mut c_void) -> u32,
    get_mix_format: OpaqueSlot,
    get_device_format: OpaqueSlot,
    set_device_format: OpaqueSlot,
    get_processing_period: OpaqueSlot,
    set_processing_period: OpaqueSlot,
    get_share_mode: OpaqueSlot,
    set_share_mode: OpaqueSlot,
    get_property_value: OpaqueSlot,
    set_property_value: OpaqueSlot,
    set_default_endpoint: SetDefaultEndpointFn,
    set_endpoint_visibility: OpaqueSlot,
}

/// Cual de las dos interfaces respondio al `QueryInterface`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PolicyConfigFlavor {
    /// `IPolicyConfig` (Windows 7+).
    Modern,
    /// `IPolicyConfigVista`.
    Vista,
}

impl std::fmt::Display for PolicyConfigFlavor {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PolicyConfigFlavor::Modern => write!(f, "IPolicyConfig"),
            PolicyConfigFlavor::Vista => write!(f, "IPolicyConfigVista"),
        }
    }
}

/// Puntero COM vivo a `IPolicyConfig` o `IPolicyConfigVista`.
///
/// Libera la referencia al soltarse.
pub struct PolicyConfig {
    raw: *mut c_void,
    flavor: PolicyConfigFlavor,
}

impl PolicyConfig {
    /// Crea la coclass y pide la interfaz, probando primero la moderna.
    ///
    /// # Errores
    /// Si `CoCreateInstance` falla o ninguna de las dos interfaces responde.
    pub fn new() -> windows::core::Result<Self> {
        // SAFETY: CLSID valido; pedimos IUnknown, que toda coclass expone.
        let unknown: IUnknown =
            unsafe { CoCreateInstance(&CLSID_POLICY_CONFIG_CLIENT, None, CLSCTX_ALL)? };

        for (iid, flavor) in [
            (&IID_POLICY_CONFIG, PolicyConfigFlavor::Modern),
            (&IID_POLICY_CONFIG_VISTA, PolicyConfigFlavor::Vista),
        ] {
            let mut raw: *mut c_void = ptr::null_mut();
            // SAFETY: `raw` es un puntero valido donde alojar la interfaz.
            let hr = unsafe { unknown.query(iid, &mut raw) };
            if hr.is_ok() && !raw.is_null() {
                return Ok(Self { raw, flavor });
            }
        }

        // E_NOINTERFACE
        Err(windows::core::Error::from(HRESULT(0x8000_4002u32 as i32)))
    }

    /// Que variante se obtuvo. Util para diagnostico.
    pub fn flavor(&self) -> PolicyConfigFlavor {
        self.flavor
    }

    /// Marca `device_id` como endpoint predeterminado para un rol.
    ///
    /// Roles: 0 = Console, 1 = Multimedia, 2 = Communications.
    ///
    /// Devuelve el `HRESULT` crudo en vez de `Result` porque quien llama
    /// necesita distinguir codigos concretos para diagnosticar.
    pub fn set_default_endpoint(&self, device_id: PCWSTR, role: u32) -> HRESULT {
        // SAFETY: `raw` apunta a una interfaz viva obtenida por QueryInterface,
        // y la vtable respeta el layout documentado arriba. El slot invocado es
        // el mismo en ambas variantes gracias a las structs separadas.
        unsafe {
            match self.flavor {
                PolicyConfigFlavor::Modern => {
                    let vtbl = *(self.raw as *const *const PolicyConfigVtbl);
                    ((*vtbl).set_default_endpoint)(self.raw, device_id, role)
                }
                PolicyConfigFlavor::Vista => {
                    let vtbl = *(self.raw as *const *const PolicyConfigVistaVtbl);
                    ((*vtbl).set_default_endpoint)(self.raw, device_id, role)
                }
            }
        }
    }
}

impl Drop for PolicyConfig {
    fn drop(&mut self) {
        if self.raw.is_null() {
            return;
        }
        // SAFETY: `Release` esta en el mismo slot (2) en ambas vtables.
        unsafe {
            let vtbl = *(self.raw as *const *const PolicyConfigVtbl);
            ((*vtbl).release)(self.raw);
        }
        self.raw = ptr::null_mut();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn los_identificadores_com_coinciden_con_los_de_la_version_electron() {
        // Estos valores estan verificados funcionando en Windows 10/11. Si
        // alguien los cambia sin querer, el cambio de dispositivo deja de
        // funcionar en silencio, que es exactamente el bug que motivo este
        // modulo. Ver electron/main/audio.ts.
        assert_eq!(
            format!("{CLSID_POLICY_CONFIG_CLIENT:?}").to_lowercase(),
            "870af99c-171d-4f9e-af0d-e63df40c2bc9"
        );
        assert_eq!(
            format!("{IID_POLICY_CONFIG:?}").to_lowercase(),
            "f8679f50-850a-41cf-9c72-430f290290c8"
        );
        assert_eq!(
            format!("{IID_POLICY_CONFIG_VISTA:?}").to_lowercase(),
            "568b9108-44bf-40b4-9006-86afe5b5a620"
        );
    }

    #[test]
    fn la_vtable_vista_tiene_un_slot_menos() {
        // La diferencia entre ambas variantes es ResetDeviceFormat. Si esta
        // relacion se rompe, set_default_endpoint apunta al metodo equivocado.
        use std::mem::size_of;
        assert_eq!(
            size_of::<PolicyConfigVtbl>() - size_of::<PolicyConfigVistaVtbl>(),
            size_of::<OpaqueSlot>()
        );
    }
}
