//! Reconocimiento de dispositivos RGB conectados por USB HID.
//!
//! Sirve para decidir, con datos y no con suposiciones, que hardware puede
//! controlarse de forma nativa (Nivel 1) y cual necesita OpenRGB (Nivel 2).

use super::RgbError;

/// Fabricantes cuyos controladores RGB nos interesan.
///
/// Los VID salen del registro oficial de USB-IF.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RgbVendor {
    /// ASUS — controladores Aura, incluidos los de placa madre por USB.
    Asus,
    DeepCool,
    Corsair,
    Razer,
    Logitech,
    SteelSeries,
    Nzxt,
    Msi,
    Gigabyte,
    Zotac,
    Cooler,
    Thermaltake,
    /// Fabricante no reconocido.
    Unknown,
}

impl RgbVendor {
    fn from_vid(vid: u16) -> Self {
        match vid {
            0x0B05 => Self::Asus,
            0x3633 => Self::DeepCool,
            0x1B1C => Self::Corsair,
            0x1532 => Self::Razer,
            0x046D => Self::Logitech,
            0x1038 => Self::SteelSeries,
            0x1E71 => Self::Nzxt,
            0x1462 => Self::Msi,
            0x1044 => Self::Gigabyte,
            0x19DA => Self::Zotac,
            0x2516 => Self::Cooler,
            0x264A => Self::Thermaltake,
            _ => Self::Unknown,
        }
    }

    /// Nombre para mostrar.
    pub fn name(&self) -> &'static str {
        match self {
            Self::Asus => "ASUS",
            Self::DeepCool => "DeepCool",
            Self::Corsair => "Corsair",
            Self::Razer => "Razer",
            Self::Logitech => "Logitech",
            Self::SteelSeries => "SteelSeries",
            Self::Nzxt => "NZXT",
            Self::Msi => "MSI",
            Self::Gigabyte => "Gigabyte",
            Self::Zotac => "ZOTAC",
            Self::Cooler => "Cooler Master",
            Self::Thermaltake => "Thermaltake",
            Self::Unknown => "(desconocido)",
        }
    }
}

/// Que tipo de dispositivo parece ser, segun el fabricante y el producto.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeviceKind {
    /// Controlador Aura de placa madre por USB. **El hallazgo importante**: si
    /// aparece uno, los headers ARGB de la placa se controlan por HID y no hace
    /// falta driver de kernel.
    AuraUsb,
    /// Refrigeracion liquida / bomba con LED.
    Cooler,
    /// Periferico (teclado, raton, headset).
    Peripheral,
    /// Reconocido como de un fabricante RGB, sin clasificar.
    Other,
}

/// Un dispositivo HID encontrado.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HidDeviceInfo {
    pub vendor_id: u16,
    pub product_id: u16,
    pub vendor: RgbVendor,
    pub manufacturer: String,
    pub product: String,
    pub kind: DeviceKind,
    /// Numero de interfaz. Los controladores RGB suelen vivir en una interfaz
    /// distinta a la que usa el teclado o el raton para escribir.
    pub interface: i32,
}

fn classify(vendor: RgbVendor, product: &str) -> DeviceKind {
    let p = product.to_lowercase();

    if vendor == RgbVendor::Asus && (p.contains("aura") || p.contains("led controller")) {
        return DeviceKind::AuraUsb;
    }
    if p.contains("cooler") || p.contains("aio") || p.contains("pump") || p.contains("water") {
        return DeviceKind::Cooler;
    }
    if p.contains("keyboard")
        || p.contains("mouse")
        || p.contains("headset")
        || p.contains("teclado")
    {
        return DeviceKind::Peripheral;
    }
    DeviceKind::Other
}

/// Enumera los dispositivos HID cuyo fabricante reconocemos como relevante
/// para RGB.
///
/// Se filtran los desconocidos porque una maquina tipica tiene decenas de
/// dispositivos HID (teclado, raton, receptores, paneles tactiles) que no
/// aportan nada al diagnostico.
pub fn scan() -> Result<Vec<HidDeviceInfo>, RgbError> {
    let api = hidapi::HidApi::new()?;

    let mut out: Vec<HidDeviceInfo> = api
        .device_list()
        .filter_map(|d| {
            let vendor = RgbVendor::from_vid(d.vendor_id());
            if vendor == RgbVendor::Unknown {
                return None;
            }
            let product = d.product_string().unwrap_or_default().to_string();
            Some(HidDeviceInfo {
                vendor_id: d.vendor_id(),
                product_id: d.product_id(),
                vendor,
                manufacturer: d.manufacturer_string().unwrap_or_default().to_string(),
                product,
                kind: classify(vendor, d.product_string().unwrap_or_default()),
                interface: d.interface_number(),
            })
        })
        .collect();

    // Un mismo dispositivo aparece una vez por interfaz; se deduplica por
    // (vid, pid, interfaz) y se ordena para que la salida sea estable.
    out.sort_by_key(|d| (d.vendor_id, d.product_id, d.interface));
    out.dedup_by_key(|d| (d.vendor_id, d.product_id, d.interface));
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reconoce_los_fabricantes_por_vid() {
        assert_eq!(RgbVendor::from_vid(0x0B05), RgbVendor::Asus);
        assert_eq!(RgbVendor::from_vid(0x3633), RgbVendor::DeepCool);
        assert_eq!(RgbVendor::from_vid(0x1038), RgbVendor::SteelSeries);
        assert_eq!(RgbVendor::from_vid(0xFFFF), RgbVendor::Unknown);
    }

    #[test]
    fn identifica_un_controlador_aura_usb() {
        // Es el caso que decide si la placa necesita driver de kernel o no.
        assert_eq!(
            classify(RgbVendor::Asus, "AURA LED Controller"),
            DeviceKind::AuraUsb
        );
        assert_eq!(
            classify(RgbVendor::Asus, "ROG AURA Core"),
            DeviceKind::AuraUsb
        );
    }

    #[test]
    fn el_escaneo_no_falla_en_esta_maquina() {
        // Puede devolver una lista vacia (maquina sin RGB reconocido), pero la
        // enumeracion HID en si no debe romperse.
        assert!(scan().is_ok(), "la enumeracion HID fallo");
    }
}
