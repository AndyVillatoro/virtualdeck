---
description: >
  Agente para trabajo pesado en repos grandes (~1M tokens context).
  Uso: tareas de arquitectura, refactorizaciones extensas, síntesis
  multi-archivo, code review profundo. Preferido sobre explore
  cuando la tarea requiere coherencia a largo plazo.
model: opencode/mimo-v2.5-free
mode: subagent
---

# mimo-worker — Agente de trabajo pesado (1M ctx)

## Modelo primario

**opencode/mimo-v2.5-free** — 1M context window, sin costo.
Configurado en agent.explore del opencode.json global
(~/.config/opencode/opencode.json).

## Modelo fallback

**opencode-go/mimo-v2.5** — misma arquitectura, provider Go
(zero-retention, cuenta contra cuota opencode-go/).

### Cuándo cambiar al fallback

Cambiar manualmente la propiedad model en este archivo a
opencode-go/mimo-v2.5 cuando se detecte:

1. **HTTP 429 (Rate Limit)** — el provider free bloquea requests.
2. **Mensaje de error** tipo rate_limit_exceeded,
   quota_exceeded, o daily limit reached.
3. **100 requests/dia agotados** — cuota diaria del tier free.

### Como cambiar

En ~/.config/opencode/opencode.json, actualizar:

    "agent": {
      "explore": {
        "model": "opencode-go/mimo-v2.5"   // <-- fallback activo
      }
    }

O bien, editar la linea model: en este mismo archivo .md.

### Cuando volver al primario

Cuando el rate limit se haya reseteado (generalmente a las 00:00 UTC),
revertir a opencode/mimo-v2.5-free.

## Regla de delegacion (AGENTS.md)

    Prioridad de capacidad:
    1. pickle        — arquitectura dura, drafts, review, docs
    2. mimo-worker   — repos grandes (1M ctx) <-- ESTE AGENTE
    3. zen-muse-free — coding en paralelo / segunda opinion
    4. lightning-exec — micro-tareas, schema estricto
    5. ling-fin      — solo finanzas
    6. go-flash      — bulk / alternativo Go

## Privacidad

- opencode/mimo-v2.5-free: free tier, prompts pueden usarse para entrenamiento.
- opencode-go/mimo-v2.5: zero-retention, no entrena.
- Si el mensaje contiene [privado]: usar fallback Go aunque pierda calidad.

## Auditoria de cuota

- opencode/ (free): no cobra, tiene rate limit ~100 req/dia.
- opencode-go/: cobra, sin rate limit estricto (pero si cuota de credito).
- agy (Gemini): bucket aparte, no aplica aqui.

## Nota tecnica

OpenCode NO soporta campo "fallback" nativo en AgentConfig.
El schema (https://opencode.ai/config.json) solo ofrece "variant"
que es para configuraciones alternativas del mismo modelo, no para
cambiar de provider/modelo. Por eso el fallback es documental +
cambio manual en opencode.json o en este archivo .md.
