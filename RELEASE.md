# Guía de Release

Pasos exactos para sacar una versión nueva de VirtualDeck. Para detalles del workflow general ver [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Pre-flight checklist

Antes de empezar el release:

- [ ] Estás en `main` con `git pull` reciente.
- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npm run build:installer` funciona (build limpio).
- [ ] Probaste el build en una máquina/perfil limpio (al menos las features tocadas).
- [ ] No hay PRs pendientes que deberían entrar en este release.

---

## Decidir el bump

Mirá los commits desde el último tag:

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

Aplicá la regla:

| Si hay al menos un commit... | Bump |
|---|---|
| Con `BREAKING CHANGE:` en el footer | **MAJOR** (`X.0.0`) |
| Con tipo `feat:` | **MINOR** (`0.X.0`) |
| Con tipo `fix:` o `perf:` (sin `feat`) | **PATCH** (`0.0.X`) |
| Solo `chore:`, `docs:`, `style:`, `test:` | (no hace falta release) |

Versión actual: revisá `package.json` campo `version`.

---

## Comandos paso a paso

Reemplazá `0.X.Y` por la versión nueva en todo lo que sigue.

### 1. Bumpear versión

```bash
# Editar package.json: "version": "0.X.Y"
# (o usar npm version, pero a mano queda más controlado)

# Sincronizar package-lock.json
npm install --package-lock-only
```

### 2. Actualizar CHANGELOG.md

Agregar al **inicio** del archivo (después del header), una nueva sección con la fecha de hoy:

```markdown
## [0.X.Y] — YYYY-MM-DD

### Added
- ...

### Fixed
- ...

### Changed
- ...
```

Solo incluí las categorías que apliquen: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, `Internal`.

Para listar los commits desde el último tag y armar las entradas:

```bash
git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:"- %s" --no-merges
```

### 3. Commit del bump

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): bump $(git describe --tags --abbrev=0 | sed 's/^v//') -> 0.X.Y"
git push origin main
```

### 4. Tag

```bash
git tag -a v0.X.Y -m "VirtualDeck v0.X.Y"
git push origin v0.X.Y
```

### 5. Build del instalador

```bash
npm run build:installer
# Output: dist/VirtualDeck-Setup-0.X.Y.exe
```

Verificá el tamaño y la fecha:

```bash
ls -la dist/VirtualDeck-Setup-0.X.Y.exe
```

### 6. Crear release en GitHub

```bash
# Si gh está en PATH:
gh release create v0.X.Y \
  "dist/VirtualDeck-Setup-0.X.Y.exe" \
  --title "VirtualDeck v0.X.Y" \
  --notes-file <(awk '/^## \[0.X.Y\]/{flag=1; next} /^## \[/{flag=0} flag' CHANGELOG.md)

# Si gh no está en PATH (Windows típico):
"/c/Program Files/GitHub CLI/gh.exe" release create v0.X.Y \
  "dist/VirtualDeck-Setup-0.X.Y.exe" \
  --title "VirtualDeck v0.X.Y" \
  --notes-file <(awk '/^## \[0.X.Y\]/{flag=1; next} /^## \[/{flag=0} flag' CHANGELOG.md)
```

El `awk` extrae solo la sección de la versión `0.X.Y` del CHANGELOG.

### 7. Verificar

- [ ] Abrí https://github.com/AndyVillatoro/virtualdeck/releases/tag/v0.X.Y → release publicado con el `.exe`.
- [ ] Descargá el `.exe` desde GitHub e instalalo en una VM/perfil limpio para validar que el binario está bien.
- [ ] Confirmá que el tag apunta al commit correcto: `git log -1 v0.X.Y --oneline`.

---

## Post-release

- [ ] Avisar a usuarios (si tenés Discord/changelog público/etc).
- [ ] Cerrar issues que se resolvieron en este release (`gh issue close N --comment "Fixed in v0.X.Y"`).
- [ ] Si encontrás un bug crítico justo después: ver "Hotfix" abajo.

---

## Hotfix (release de emergencia)

Si después de un release sale un bug crítico:

```bash
# 1. Branch desde el tag más reciente
git checkout -b fix/descripcion-bug v0.X.Y

# 2. Aplicar el fix mínimo, commit
git commit -m "fix: descripción"

# 3. Bump PATCH (0.X.Y → 0.X.(Y+1))
# Editar package.json + CHANGELOG.md

git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): bump 0.X.Y -> 0.X.(Y+1)"

# 4. Mergear a main
git checkout main
git merge --no-ff fix/descripcion-bug
git push

# 5. Tag + release como en el flujo normal
git tag -a v0.X.(Y+1) -m "VirtualDeck v0.X.(Y+1) hotfix"
git push origin v0.X.(Y+1)

npm run build:installer
gh release create v0.X.(Y+1) "dist/VirtualDeck-Setup-0.X.(Y+1).exe" \
  --title "VirtualDeck v0.X.(Y+1)" --notes "Hotfix: ..."
```

---

## Rollback de release

Si publicaste un release roto:

```bash
# 1. Borrar el release de GitHub (no borra el tag)
gh release delete v0.X.Y --yes

# 2. Borrar el tag local y remoto
git tag -d v0.X.Y
git push origin :refs/tags/v0.X.Y

# 3. Revertir el commit del bump
git revert <SHA-del-commit-bump>
git push

# 4. Actualizar CHANGELOG.md removiendo la sección
# 5. Notificar a usuarios afectados
```

---

## Troubleshooting

### `npm run build:installer` falla con "rebuilding native dependencies"
- Asegurate de que `uiohook-napi` está en `dependencies` (no en `devDependencies`).
- Verificá que `package.json → build.asarUnpack` incluye `node_modules/uiohook-napi/**`.

### El tag ya existe
```bash
# Si querés reusar el mismo número de versión (no recomendado):
git tag -d v0.X.Y
git push origin :refs/tags/v0.X.Y
# Ahora podés crear el tag de nuevo
```

### El `.exe` quedó muy grande (>100MB)
- Verificá que `build.files` no incluya `node_modules` enteros.
- Confirmá que `build.asarUnpack` solo tiene los módulos nativos necesarios.
- Mirá `dist/builder-debug.yml` para ver qué se empaquetó.

### `gh` pide auth de nuevo
```bash
gh auth login
# Seguir prompts: GitHub.com → HTTPS → web browser → pegar código
```
