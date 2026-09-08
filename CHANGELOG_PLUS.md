# Changelog de GitHub Desktop Plus

Cambios propios de [FernandoAle00/desktop](https://github.com/FernandoAle00/desktop),
integrados en [feat/commit-search](https://github.com/FernandoAle00/desktop/tree/feat/commit-search).

Este registro cubre los 32 commits entre la base de upstream
[`b17e06dd0f`](https://github.com/desktop/desktop/commit/b17e06dd0f0d9a45807eb39a51d223f52eb14da9)
y [`007781e31f`](https://github.com/FernandoAle00/desktop/commit/007781e31f),
del 27 de agosto al 6 de septiembre de 2026. Las fechas corresponden al historial
Git; no son números ni fechas de releases publicadas.

El código de Plus está en la rama indicada. Publicar este documento en
`development` no incorpora allí las funcionalidades. El archivo
[changelog.json](changelog.json) conserva el historial de releases de upstream.
Los prototipos y los cambios de ramas locales todavía no integrados quedan fuera
de este registro.

## 2026-09-06

- La opción existente para abrir un commit en GitHub ahora aparece primera en el menú contextual como **Open Commit on GitHub**. Se deshabilita para commits locales, repositorios sin GitHub o vistas sin un manejador de apertura. Incluye GitHub Enterprise y tests del menú. [Commit 007781e31f](https://github.com/FernandoAle00/desktop/commit/007781e31fa3ee6d4de8689480e4c1398e213ef7).

## 2026-09-05

- Drag and drop en el selector para reordenar repositorios y moverlos a grupos personalizados. El orden persiste al reiniciar. Se agregan indicadores de inserción y las acciones **Move Up** y **Move Down** al menú contextual. Recent mantiene su orden independiente y los grupos automáticos conservan la pertenencia por origen. [Commit 89f253c255](https://github.com/FernandoAle00/desktop/commit/89f253c255aefcca37f2ebb3d2dea6920fcb939c).

- Inicio de sesión mediante **Connect GitHub CLI**, con validación de la cuenta activa y almacenamiento de credenciales propio de Plus, independiente del GitHub Desktop original y del canal de compilación. Se excluyen las variables de entorno que sobrescriben tokens y se evitan tokens en los mensajes de error. Incluye documentación y tests de autenticación. [Commit 1d3e8dc6f3](https://github.com/FernandoAle00/desktop/commit/1d3e8dc6f3f5a42438841fce3d4e740c3fc886c6).

- Se alinean los nombres del icono tradicional y del icono nativo de macOS en la configuración del bundle. [Commit b869f1a08e](https://github.com/FernandoAle00/desktop/commit/b869f1a08ef0218bab2a1c2b9c81abdd4442de0f).

- Icono nativo de macOS con variante grafito para modo oscuro, catálogo de recursos compilado, script de compilación y workflow para generar los recursos del icono. [Commit 25eb115ce2](https://github.com/FernandoAle00/desktop/commit/25eb115ce2e0d41e1a3a8833686999853532c440).

- Identidad visual de Plus con icono plateado y negro, recursos SVG, ICNS e ICO, y ajustes del build para usar iconos prerenderizados sin exigir Xcode completo para una compilación local. [Commit 606952a3f1](https://github.com/FernandoAle00/desktop/commit/606952a3f14a53bc65804df3b40e52be838b473e).

- Ajustes de los paneles clásicos y del tema oscuro: fondo negro, contraste, bordes, separación de paneles y presentación del historial y del detalle de commit. [Commit c798596466](https://github.com/FernandoAle00/desktop/commit/c798596466fd65ef5f678e62525f11fe04cd597b).

## 2026-09-03

- La fila de búsqueda del historial se alinea visualmente con el filtro de archivos de Changes. [Commit d6c3cccd59](https://github.com/FernandoAle00/desktop/commit/d6c3cccd592487f1924924a6ee637a8519b48e4a).

- Grupos personalizados de repositorios. El menú contextual permite crear un grupo, asignar un repositorio a un grupo existente o quitar la asignación. La pertenencia se guarda en la base local; el selector muestra los grupos y distingue nombres repetidos. [Commit d0b8a92419](https://github.com/FernandoAle00/desktop/commit/d0b8a92419b55429e9b1bb41911c3235df7f3e69).

## 2026-08-28

- La lista de stashes puede plegarse y desplegarse desde su encabezado. [Commit cfed764026](https://github.com/FernandoAle00/desktop/commit/cfed7640267d72898bdbe990a2079fa198318a3a).

- Corrección del singular y plural del contador de stashes. [Commit e19d82b183](https://github.com/FernandoAle00/desktop/commit/e19d82b18353686df3a161aff9cef5b9b08b9db0).

- El diálogo de blame puede redimensionarse y permite destacar las líneas de un autor. [Commit d6d7dc5a1a](https://github.com/FernandoAle00/desktop/commit/d6d7dc5a1a952d25493d15401b617c0ca34fc3d9).

- Se corrige el texto de la acción de blame para identificarla como **Blame File**. [Commit 74844de951](https://github.com/FernandoAle00/desktop/commit/74844de9518e7db5f19cc12b69167fdc255724de).

- La búsqueda por archivo encuentra coincidencias en cualquier parte del árbol de directorios. [Commit 0671fb9d8e](https://github.com/FernandoAle00/desktop/commit/0671fb9d8ece3e7813d0929f96b6eec10be16937).

- Limpieza de la integración de las ramas de funcionalidades: eliminación de imports duplicados y de enlaces a node_modules que habían quedado versionados. [Commit 264342ae51](https://github.com/FernandoAle00/desktop/commit/264342ae51ecac58264eb2e012a19b4b1223f3e7).

- Rebase interactivo desde el historial, con selección de acciones **pick**, **squash**, **fixup**, **reword** y **drop** por commit. Incluye el diálogo de edición y la integración con el flujo de operaciones de varios commits y resolución de conflictos. [Commit b808e71c90](https://github.com/FernandoAle00/desktop/commit/b808e71c90fe86a1ad951e904dfbed44815ccc05).

- Gestión de todos los stashes del repositorio, incluidos los creados fuera de Desktop. Se agregan listado, creación, selección, inspección del diff y acciones **Apply**, **Pop** y descarte. Apply conserva la entrada y Pop la elimina después de restaurarla, con identificación de las entradas creadas por Desktop. [Commit ae4199d546](https://github.com/FernandoAle00/desktop/commit/ae4199d54620cc1ede5b0d3c3dc8d5526bc81dd7).

- Comparación de dos commits arbitrarios desde el historial, con lista de archivos y diff entre ambos estados. [Commit d0969d9bb9](https://github.com/FernandoAle00/desktop/commit/d0969d9bb956f88590396b9dd8b2d717a5d64ef7).

- Vista de blame por archivo para consultar autoría línea por línea, con acceso desde las listas de archivos de Changes y History. [Commit 0b60d206c8](https://github.com/FernandoAle00/desktop/commit/0b60d206c85cb3bd653d68f35c7bc5722603231d).

- Historial de un archivo individual en un diálogo, accesible desde las listas de archivos de Changes y History. [Commit ca09b4611d](https://github.com/FernandoAle00/desktop/commit/ca09b4611d4248ba0bacdaa648b4de485167c915).

- La búsqueda de commits incorpora modos por autor, archivo y contenido agregado o eliminado en los diffs, además de la búsqueda por mensaje. Cada modo tiene su propio texto de búsqueda y mensaje sin resultados. [Commit 6a51781a24](https://github.com/FernandoAle00/desktop/commit/6a51781a24cb7d19ed25edfba9205fc4ec2e53ce).

- Grafo de commits junto a la lista del historial para representar las relaciones entre commits y sus padres. [Commit 2efd75d2e1](https://github.com/FernandoAle00/desktop/commit/2efd75d2e19c80c17ae6643beadaff1c4e05e430).

## 2026-08-27

- El detalle del commit se puede redimensionar arrastrando cualquier punto de su borde inferior. [Commit fafbdd3fbb](https://github.com/FernandoAle00/desktop/commit/fafbdd3fbb0d68f97fa15023dbc34d6748b12198).

- Barras de desplazamiento finas y consistentes en la aplicación, incluido el editor de diffs. [Commit 2257200425](https://github.com/FernandoAle00/desktop/commit/225720042574d186f9d7022e769551f8eb7925d5).

- Acción **Copy Commit Summary** en el menú contextual del historial para copiar el título de un commit. [Commit 68f828996c](https://github.com/FernandoAle00/desktop/commit/68f828996c98c6e6162cf104c52e464d7f1571c1).

- Altura ajustable del cuerpo del commit en el panel de detalle del historial. [Commit e3f963278e](https://github.com/FernandoAle00/desktop/commit/e3f963278e2a958bb4fd299448b8ae811dbf4c48).

- Los títulos largos del detalle de commit se distribuyen en varias líneas en lugar de quedar recortados. [Commit 06c03c8f35](https://github.com/FernandoAle00/desktop/commit/06c03c8f354467393b8e9f27d5d0f0a67b066ff6).

- El campo de descripción al redactar un commit puede redimensionarse verticalmente. [Commit 4d35587e17](https://github.com/FernandoAle00/desktop/commit/4d35587e17f5716ebe5ecf44953cbab166268b89).

- El fork se compila como **GitHub Desktop Plus**, con identificador de aplicación propio y actualizaciones automáticas desactivadas. [Commit 841a37ae02](https://github.com/FernandoAle00/desktop/commit/841a37ae0288dfa7d987b3caa3709298ea4a00c0).

- Primera revisión visual de la estructura de la app: barra de herramientas, pestañas, listas, campos de texto y paneles. Los ajustes posteriores del 5 de septiembre refinan esta presentación. [Commit da50418492](https://github.com/FernandoAle00/desktop/commit/da50418492653772215357a8d1c4da0c991ff909).

- Primera revisión de colores, tema oscuro, elevación, transiciones, botones, diálogos y popovers. [Commit 1ac947118d](https://github.com/FernandoAle00/desktop/commit/1ac947118d5b8a5ef89f3e265b5202d1033a9443).

- Búsqueda de commits por mensaje desde el historial, con actualización del filtro y de los resultados por repositorio. [Commit 4f80be0418](https://github.com/FernandoAle00/desktop/commit/4f80be0418e33b40bf6e92e8c57e552bf7eaad80).

