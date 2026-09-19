---
name: mimo-fallback
description: Protocolo de conmutación cuando el modelo primario mimo-v2.5-free falla por límites (100 req/día, HTTP 429) o cuando la tarea es [privado]. Documenta el fallback opencode-go/mimo-v2.5 (zero-retention, de pago) y confirma que Gemini vía agy queda como tercer bucket. Úsalo ante errores 429/rate-limit, mensajes [privado], o preguntas sobre qué modelo usar para una tarea.
---

# mimo-fallback: conmutación de modelo en OpenCode

Cuando `mimo-v2.5-free` (primario) se corta, se cambia a `opencode-go/mimo-v2.5` (fallback de pago). Gemini vía agy es un tercer bucket independiente y **no se toca**.

## 1. Buckets de modelo

| | Primario | Fallback | Tercero |
|---|---|---|---|
| Modelo | `mimo-v2.5-free` | `opencode-go/mimo-v2.5` | Gemini vía agy (`agy-gemini.ps1`) |
| Coste | Gratis | De pago ($0.14 / $0.28 por M tok, cap $60) | Gratis (cuota Antigravity aparte) |
| Contexto | 1M ctx | 1M ctx | variable según gema |
| Retención | **Entrena** con tus prompts | **Zero-retention** | Entrena (no mandar `[privado]`) |
| Límites | 100 req/día → **HTTP 429** | ~50-100k req (techo del cap $60) | cuota Antigravity |
| Calidad | Referencia | Misma calidad que primario | equivalente P1/P2 |

## 2. Cuándo cambiar al fallback

Cambiar a `opencode-go/mimo-v2.5` si ocurre **cualquiera** de estas:

1. Error **HTTP 429** (`Too Many Requests`) o mensaje de *rate limit* del provider.
2. Se agotaron las **100 requests diarias** del plan free (el 429 es la señal típica).
3. El mensaje contiene **`[privado]`**: por privacidad, el free entrena, así que se usa sí o sí el bucket zero-retention aunque pierda calidad (excepción de AGENTS.md).
4. El trabajo encaja en la excepción de *priorizar mejor resultado*: el fallback tiene la misma calidad, así que degradar el resultado no es excusa para quedarse en free.

No cambiar por calidad: ambos modelos son el mismo `mimo-v2.5` (la variante free y la de pago comparten motor).

## 3. Cómo cambiar

### Opción A — opencode.json (persistente)

En `opencode.json`, campo `model` (actualmente en la raíz del repo):

```json
{
  "model": "opencode-go/mimo-v2.5"
}
```

Para volver al primario gratis:

```json
{
  "model": "mimo-v2.5-free"
}
```

> Regla del proyecto: no tocar `opencode.json` fuera de este cambio puntual de `model` (ver §5).

### Opción B — variable de entorno (efímera, sin editar archivos)

PowerShell:

```powershell
$env:OPENCODE_MODEL = "opencode-go/mimo-v2.5"
opencode
```

O en una sesión: `$env:OPENCODE_MODEL = "mimo-v2.5-free"` para revertir.

### Opción C — comando del TUI de OpenCode

En la sesión abierta, `/models` y elegir el id del provider (`opencode-go/mimo-v2.5` o `mimo-v2.5-free`). Útil para cambiar solo la tarea actual sin persistir.

### Verificación

- Confirmar el modelo activo con `/models` o `opencode models` en la terminal.
- Tras el cambio, reejecutar la tarea que falló con 429.
- Auditoría de cuota: `opencode-go/` **cobra**; `opencode/` free **no cobra** (AGENTS.md §2b).

## 4. Revertir

El fallback es de pago con cap $60; pasada la ventana de 429 (suelen ser ventanas de horas o al reset diario), **volver al primario gratis** con la Opción A/B/C para no consumir cuota:

1. Esperar a que el límite diario se resete (el 429 desaparece solo).
2. Poner `"model": "mimo-v2.5-free"` en `opencode.json` (o `$env:OPENCODE_MODEL = "mimo-v2.5-free"`).
3. Confirmar con `/models`.

## 5. No tocar (reglas de este skill)

- `opencode.json`: no cambiar nada más que el campo `model` cuando aplique.
- `.opencode/agents/mimo-worker.md`: configuración del agente, intacta.
- `bin/agy-gemini.ps1`: integración Gemini intacta.
- Gemini vía agy **queda intacto como tercer bucket**: si mimo free da 429 **y** no se quiere gastar el fallback de pago, se puede delegar a agy (`agy-gemini.ps1`) con cuota aparte. El orden sugerido: `mimo-v2.5-free` → `opencode-go/mimo-v2.5` → agy.

## 6. Resumen de decisión

| Situación | Modelo |
|---|---|
| Funciona normal | `mimo-v2.5-free` |
| 429 / rate-limit / 100 req agotadas | `opencode-go/mimo-v2.5` |
| Mensaje `[privado]` | `opencode-go/mimo-v2.5` (zero-retention) |
| 429 + no gastar de pago | Gemini vía agy (tercer bucket) |