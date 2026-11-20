# Plan y acuerdos de Orion

Este archivo guarda lo que Rosario fue decidiendo, lo que quedó pendiente y
el plan del tutorial. **Leelo antes de trabajar en Orion** y actualizalo
cuando cambie algo.

## Quién y cómo

- **Orion Propiedades** es una inmobiliaria de Uruguay. **Rosario** es la CEO y fundadora.
- Responderle en **español rioplatense**, claro y sin tecnicismos.
- En las decisiones del equipo participan **César** y **Huillen**.
- Forma de trabajo:
  1. Cada pedido se hace en la rama de la sesión.
  2. Se prueba localmente (Postgres + `next build` / `next start` + Playwright).
  3. Se abre un PR a `main` y se hace squash-merge. Rosario pidió que lo haga Claude ("hacelo vos").
- Desde la sesión en la nube **no se puede entrar a producción** (Railway). Por eso:
  - cada PR aclara "No probado en producción";
  - a Rosario se le dice cómo verificarlo ella.

## Decisiones vigentes

### Roles y permisos (`src/lib/permisos.ts`)

- Los roles son **CEO**, **Administrador**, **Líder** y **Agente**.
- Cada usuario ve su propio rol y a la gente que tiene debajo (`equipoVisible`). La jerarquía sale de `usuarios.teamLeaderId` ("Responsable").
- Solo la CEO puede:
  - aprobar usuarios, cambiar roles o responsables y eliminar usuarios;
  - entrar a Ajustes y editar contenido;
  - editar comisiones a mano;
  - usar "Entrar como".
- El Administrador ve los contactos solo de su equipo.
- **Entrar como**: lo que se hace queda a nombre del usuario y se marca en Actividad como "hecho por Rosario (Entrar como)".

### Comisiones (`src/lib/comisiones.ts`)

- **Escala automática de agentes** (según facturación acumulada):

  | Nivel | Desde | Comisión |
  |---|---|---|
  | Agente | USD 0 | 40 % |
  | Asesor | USD 10.000 | 45 % |
  | Ejecutivo | USD 20.000 | 50 % |

- **Reparto DEFINITIVO** (acordado por Rosario con César y Huillen, nov. 2026), en `calcularReparto()`. Todos los % son sobre la comisión total:
  - **Empresa: 10 % fijo**, nunca baja (`PORCENTAJE_GASTOS_EMPRESA`).
  - **Agente:** su escala (40 / 45 / 50).
  - **Team leader:** su % sobre el equipo (`usuarios.porcentaje_lider`). César, "team leader especial", 25 %; un líder nuevo, 10 % (`PORCENTAJE_LIDER_DEFECTO`). Solo la CEO lo ve y lo cambia en Usuarios.
  - **Administración (Huillen) y Dirección (Rosario):** se reparten por mitades lo que queda.
  - **Escalas:** el agente sube 5 % y esos 5 % los ceden los de arriba. El líder baja 2,5 % (`BAJA_LIDER_POR_ESCALA`) y Administración y Dirección 1,25 % cada una; sin líder, 2,5 % cada una.

  | Equipo | Agente 40 | Asesor 45 | Ejecutivo 50 |
  |---|---|---|---|
  | César (25 %) | César 25 · Huillen 12,5 · Rosario 12,5 | 22,5 · 11,25 · 11,25 | 20 · 10 · 10 |
  | Líder nuevo (10 %) | líder 10 · 20 · 20 | 7,5 · 18,75 · 18,75 | 5 · 17,5 · 17,5 |
  | Huillen o Rosario (directo) | Huillen 25 · Rosario 25 | 22,5 · 22,5 | 20 · 20 |

  - **Si vende un líder:** cobra como agente (su nivel) más su % de líder.
  - **Si venden Huillen o Rosario:** **45 % y 45 %** para las dos, más el 10 % de la empresa, sin importar quién vendió (acuerdo original entre ellas). La parte de quien vendió va como "Comisión agente (operación propia…)", así cuenta para su objetivo del mes.
  - Si falta la Administradora o la CEO, su parte va a la otra. La diferencia de redondeo (1 dólar) va a la línea de la CEO; la de la empresa queda exacta.
  - La escala se cuenta por la facturación acumulada desde que entró (no se reinicia por año).
  - Al arrancar, los Team leaders que ya existían quedaron con 25 % (marca `comisiones-lider-25`).
- **Comisión entera o compartida** (en la reserva, `src/lib/reparto-reserva.ts`, `reservas/campos-reparto.tsx`):
  - **Entera:** la cerró un solo agente. Un agente queda él mismo; la CEO puede elegir a cualquiera. Se muestra su líder ("Líder: César" o "Equipo de Huillen").
  - **Compartida:** se elige el agente que aportó la propiedad y el que aportó el comprador o inquilino, cada uno con su líder.
  - **¿Quién paga?:** las dos puntas, solo el comprador/inquilino o solo el vendedor/propietario.
    - Compartida y pagan las dos: cada agente se lleva **la punta que aportó** (la del vendedor/propietario el de la propiedad, la otra el del cliente).
    - Compartida y paga una sola punta: **mitad y mitad**.
    - Después, cada parte se reparte con las reglas de arriba, según el líder de ese agente. Al concepto se le agrega "· compartida · punta vendedora", "· mitad…", etc.
  - **Con otra inmobiliaria** (`OTRA_INMOBILIARIA`): se carga el nombre de la inmobiliaria (obligatorio), qué aportó Orion (la propiedad o el cliente) y el agente de Orion, que se guarda en `agente_propiedad_id`.
    - Si pagan las dos puntas, Orion se queda con **su punta**; si paga una sola, con **la mitad** (`divisionConOtraInmobiliaria()`).
    - Solo la parte de Orion genera comisiones. La de la otra inmobiliaria se muestra en la reserva ("Orion USD … · Inmobiliaria X USD …"), pero no se registra en Comisiones.
  - En alquileres se cargan por separado lo que paga el propietario y lo que paga el inquilino. `comision_total_usd` queda como la suma.
  - Las reservas viejas cuentan como entera del agente que las cargó; en alquileres, el total se toma como pagado por el inquilino.
  - En cada reserva aparece el resumen del reparto y, mientras no se generaron las comisiones, el botón **Cambiar** (`guardarReparto*`).
  - Los formularios de reserva se envían con `onSubmit` + `startTransition(formAction)` y no con `action=`. Así, si hay un error al guardar, no se borra lo ya escrito: React 19 limpia el formulario después de un `action=`.
  - Una reserva compartida la ven y la mueven los dos agentes y sus jefes. La reserva queda a nombre del agente de la propiedad.
- **Privacidad del reparto** (`src/lib/comisiones-texto.ts`, decisión de Rosario): **cada uno ve sus propios porcentajes, no los de los demás.** La CEO ve todo.
  - En sus propias líneas, César ve su % de líder y Huillen el suyo.
  - La escala de los agentes (40 / 45 / 50) la ve todo el que vea esa línea.
  - En una línea ajena que no es de agente se muestra solo "Comisión como team leader", "Comisión de dirección" o "Comisión por operación propia", sin %.
  - En Usuarios, el % de líder lo edita solo la CEO. El líder ve el suyo, sin poder cambiarlo; nadie más lo recibe.
  - En Mis finanzas, la nota de la comisión va completa, porque son las propias.
- La pantalla Comisiones muestra:
  - "Mis comisiones" por separado;
  - un resumen por usuario con buscador por nombre;
  - el detalle de cada persona;
  - los "Gastos de la empresa" (solo la CEO).

### Actividad (`src/lib/registro-actividad.ts`, `/actividad`)

- Las acciones importantes llaman a `registrar()`.
- La CEO ve a todos y Líder/Admin solo a su equipo. Los agentes no tienen acceso.
- **Si se agrega una acción nueva importante, registrarla también.**

### Circuito de captación (`src/lib/captacion-flujo.ts`, `/captaciones`)

- **Llamando (48 hs):** el agente llama (📞) o escribe por WhatsApp (💬), con los mensajes "Captación…" que la CEO edita en Mensajes WhatsApp.
- **No respondió** → 1er seguimiento (48 hs) → 2do seguimiento (48 hs) → se borra.
- **Respondió:**
  - "por ahora no" → **S8** (semanal × 8);
  - quiere probar solo, dio exclusividad a otra empresa o no aceptó la tasación → **S12** (mensual × 12);
  - nos autorizó → si es alquiler, **Para publicar**; si es venta, **Tasando**.
- **S8 / S12:** cada seguimiento hay que hacerlo (llamar o escribir) y marcarlo, con **48 hs de margen**.
  - Al terminar S8 se puede pasar a S12; si no, se borra.
  - Al terminar S12 se borra.
- **Tasando (7 días, +3 una sola vez con "Necesito 3 días más"; si vence, se borra):** la tasación se hace desde la tarjeta, o se vincula una ya hecha en Tasaciones. Se marca si se **entregó al propietario** o fue de **uso interno**. Después: autorizó → Para publicar; no aceptó → S12.
- **Tasación hecha desde Tasaciones** (`src/lib/captacion-tasacion.ts`): se vincula sola a la captación en Tasando si no hay dudas. Condiciones:
  - mismo agente;
  - misma zona o dirección;
  - mismo tipo;
  - hecha después de cargar la captación;
  - una sola candidata.

  Se revisa al guardar la tasación, al abrir Captaciones y en el Plan del día. Si hay más de una posible, el agente la elige en la tarjeta. El aviso de Tasando desaparece recién al marcar entregada o uso interno y autorizó o no aceptó.
- **Lo vencido va a la Papelera** (30 días, recuperable). El contacto también, si se creó para esa captación y no tiene nada más; así el número queda libre.
  - Revisión automática cada 15 min, y también al abrir Captaciones.
  - Si hubo llamada o WhatsApp pero no se marcó el resultado, pasa solo al siguiente seguimiento.
- Las captaciones que ya existían arrancaron con 7 días de margen.
- **Plan del día (Inicio):** sección "🚀 Captaciones" con lo que toca hoy. Incluye:
  - primer contacto y seguimientos de 48 hs;
  - S8/S12 cuando llega la fecha;
  - fin de S8;
  - Tasando.

  Lo urgente (menos de 12 hs para borrarse) va primero y en rojo.

### Filosofía (`src/lib/filosofia.ts`)

- El texto de Rosario (3 párrafos + 4 compromisos) se cargó una vez en **Ajustes → Filosofía**.
- Se muestra como **Lección 1: Cómo trabajamos en Orion** arriba de Capacitación, leyendo lo que haya en Ajustes.
- "Cómo lo cumplís con Orion" (compromiso → herramienta) está fijo en el código (`COMPROMISOS_EN_ORION`) y aparece si hay exactamente 4 compromisos.
- Para el tutorial: es el **capítulo 1** del manual.

### Tasación profesional (`src/lib/tasacion-pro.ts`)

- **Base:** el método de puntajes de Rosario (Imperium): dinámicos −10%, ±5% por punto de estado y de ubicación (1 a 4).
- **Tipos y unidad de medida:**
  - Apartamento, Oficina, Casa, Dúplex/PH, Local, Galpón → m² ponderados;
  - Terreno → m² de terreno;
  - Chacra, Campo → hectáreas.
- **Superficie ponderada:**

  | Superficie | Cuenta al |
  |---|---|
  | Cubierta | 100 % |
  | Semicubierta | 50 % |
  | Descubierta | 30 % |
  | Terreno libre en casas, zona urbana | 10 % |
  | Terreno libre en casas, zona balnearia o suburbana (por defecto en Canelones, Maldonado y Rocha) | 15 % |

- **Ajustes automáticos:**

  | Ajuste | Valor |
  |---|---|
  | Tamaño | exponente 0,15, tope ±10 % |
  | Garaje | ±5 % por garaje, solo si se cargó en el comparable |
  | Piscina | ±5 % |
  | Esquina | ±8 % |
  | CONEAT | (sujeto ÷ comparable) ^ 0,6 |

- **Resultado:**
  - valor probable de cierre;
  - rango (± la dispersión de la muestra, entre 5 % y 20 %);
  - precio sugerido de publicación (cierre ÷ 0,9);
  - confiabilidad:
    - Alta: dispersión ≤ 12 % y al menos 1 cierre;
    - Media: dispersión ≤ 20 %;
    - Baja: el resto.
  - se marcan los comparables que se alejan más de 25 % de la mediana.
- Las tasaciones viejas (sin `detalle`) se siguen mostrando con el método anterior.
- **Editar** (`/tasaciones/[id]/editar`): la puede editar quien la hizo o la CEO. Al guardar una vieja, pasa al método nuevo.
- **Base de tasaciones:**
  - "Sugerir comparables" trae también las tasaciones anteriores de todo el equipo (mismo tipo, barrio y ±25 % de superficie), como "📐 Tasación previa": sin el −10 % y sin contar como cierre.
  - La lista de Tasaciones se puede filtrar por tipo y por barrio.
- **Rentabilidad y valor por renta (`src/lib/rentabilidad.ts`):**
  - **Calculadora** en `/tasaciones/rentabilidad`:
    - "¿Cuánto rinde?": rentabilidad bruta, neta, neta después de IRPF y años de recupero;
    - "¿Cuánto vale por su renta?": valor a la tasa elegida ±1 %.
  - Montos en USD, o en pesos con cotización.
  - Gastos del dueño: contribución, primaria, otros, mantenimiento %, administración % y vacancia.
  - IRPF: 12 % sobre lo cobrado menos contribución, primaria y administración.
  - **En la tasación**, sección opcional "Está alquilada":
    - valor = renta neta ÷ tasa (sugerida por tipo: local 7,5 %, apartamento 5,5 %, casa 5 %);
    - si hay renta, se puede guardar sin comparables;
    - con los dos métodos, el valor final es el promedio (conciliado). Se guarda en `detalle.renta`.
  - Las tasas de referencia son orientativas y están en `TASAS_REFERENCIA`.
- **Iluminación y ventilación:** puntaje 1–4 en apartamentos, casas y locales. Ajusta ±4 % por punto, solo si se cargó en el comparable.
- **Datos para el informe** (`detalle.ficha`): propietario, teléfono, padrón, dormitorios, baños, antigüedad y descripción. No entran en el cálculo.
- **Informe para el propietario** (`/informe-tasacion/[id]`, botón "📄 Informe"):
  - página sin menú, siempre en colores claros, A4. Tiene dos botones: **⬇️ Descargar PDF** (se arma en el navegador con html-to-image + jsPDF, bloque por bloque, sin cortar secciones) y **🖨️ Imprimir**;
  - incluye: portada con el logo (`public/brand/orion-logo-informe.jpg`), valor, rango y publicación, la propiedad, gráfico "dónde se ubica en el mercado" con los comparables reales, por qué importa el precio de salida, el método, la tabla de comparables, los 4 compromisos, la firma del agente y un aviso de que no es una tasación oficial ni pericial.
  - Las "estadísticas" son las de la propia muestra; no se inventaron cifras de mercado externas. Si Rosario pasa datos con fuente, se pueden sumar.

### Mis finanzas y Money Day (`src/lib/finanzas.ts`, `/finanzas`)

- **ULTRA PRIVADO** (decisión de Rosario): cada usuario ve solo lo suyo. No lo ve la CEO ni se ve con "Entrar como" (muestra "Mis finanzas es privado"). **No se registra en Actividad.**
- **Alineado con el Manual Orion, Bloque 3 (capítulos 15 a 19, escritos por Rosario).** Decisión de Rosario: cada agente lee el manual y **decide su propio reparto**. Orion es solo la **planilla para registrar y presupuestar**: no impone porcentajes ni tiene calculadora de reparto.
- Los agentes de Orion Propiedades cobran su comisión **neta, sin IVA**. El capítulo 16 está escrito para un agente que factura; se le sugirió a Rosario un recuadro aclaratorio.
- **Movimientos:** ingresos y gastos en $U o USD, con las **5 categorías del capítulo 17**:
  1. Fijos personales;
  2. Variables personales;
  3. Negocio;
  4. Impuestos y aportes;
  5. Ahorro e inversión: **colchón** (capítulo 18), **fondo de emergencia** (capítulo 19) y ahorro.
- Las claves de las categorías viejas se mantienen.
- Las **comisiones cobradas** en Orion entran solas como ingreso en USD (`comision_id`, una sola vez). Si se borran, quedan ocultas y no vuelven.
- **Cotización del dólar por mes** (`finanzas_meses.cotizacion`): todo se ve en pesos.
- **Presupuesto** por categoría e ingreso esperado por mes.
- **Money Day: el ÚLTIMO DÍA de cada mes** (día fijo, decisión de Rosario). Pasos:
  1. balance contra el presupuesto;
  2. consejos descriptivos que remiten a los capítulos, sin metas propias;
  3. plan del mes siguiente.

  Al guardar, cierra el mes.
- **Plan del día:**
  - el último día muestra "💵 Hoy es tu Money Day";
  - los primeros 7 días, si el mes anterior quedó sin cerrar, avisa que está pendiente;
  - nunca muestra montos.
- La guía de la pantalla resume y remite a los capítulos 15 a 19 (están en Capacitación).

### Índice del Manual en Capacitación (`src/lib/manual-indice.ts`)

- El Manual Orion tiene los capítulos 0 a 57 y los anexos A a J (68 materiales). Rosario pasó las tablas en `Instrucciones_Code_Indice_Capacitacion.md`:
  - Tabla A: bloques;
  - Tabla B: áreas por tema;
  - Tabla C: nombres.
- **Etapa 1 (hecha):**
  - columnas `clase` (CAPITULO, ANEXO u OTRO), `numero`, `orden`, `bloque` y `areas` (jsonb) en `documentos_capacitacion`;
  - tabla `capacitacion_areas`, editable por la CEO en `/capacitacion/areas`;
  - al arrancar, `completarIndiceCapacitacion()` completa los materiales con `clase` vacía leyendo el número del título ("CAP. 27-", "CAP 20-", "1 -", "ANEXO C-"). No pisa lo editado a mano;
  - en Subir y Editar, los campos se sugieren desde el título.
- **Etapa 2 (hecha):**
  - Capacitación tiene 3 pestañas:
    - **Por tema** (principal): tarjetas de áreas con la cantidad de materiales; `?area=` muestra la lista;
    - **Por bloque**: orden de lectura;
    - **Todo**: buscador por título, ordenado Cap. 0–57 y después Anexos A–J.
  - Los materiales se muestran como "Cap. 27 · Prospección y captación" (`nombreMaterial`, con los nombres de la Tabla C).
  - La Lección 1 (filosofía) queda cerrada por defecto.
- **Etapa 3 (hecha):** buscador dentro de los PDF (`src/lib/capacitacion-texto.ts`).
  - El texto de cada página se extrae con pdf.js en el servidor (`serverExternalPackages: ["pdfjs-dist"]` en `next.config.ts`) y se guarda en `capacitacion_paginas`: `texto` y `busqueda` (en minúsculas y sin tildes).
  - Se extrae al subir o reemplazar un PDF, y al arrancar en segundo plano para los que tienen `texto_indexado_en` vacío. Si falla, se reintenta en el próximo arranque.
  - La búsqueda va desde el inicio de una palabra ("iva" no encuentra "positiva").
  - Los resultados se agrupan por capítulo, con la página y un fragmento resaltado. `/capacitacion/[id]?pagina=N&q=` abre el visor en esa página, marcada en dorado.
  - **Los materiales que son solo un link (Drive) no se pueden buscar**: hay que subir el PDF a Orion. Un PDF escaneado (imagen, sin texto) tampoco.

### Leer en voz alta en Capacitación (`src/lib/lectura-voz.ts`, `capacitacion/[id]/escuchar.tsx`)

- Pedido de Rosario: escuchar un capítulo mientras trabaja, **gratis**.
- Usa la voz que trae el celular o la computadora (Web Speech API, `speechSynthesis`). No hay servicio pago ni claves.
- Lee el texto ya extraído del PDF (`capacitacion_paginas`). Solo aparece en materiales con PDF subido a Orion y con texto (no en links de Drive ni en PDF escaneados).
- `textoParaLeer()` limpia el texto:
  - une las palabras cortadas con guion;
  - arregla títulos con letras separadas ("Afirmación del capítulo", "Manual Orion");
  - saca números de página, viñetas y emojis.
- `partesParaLeer()` corta el texto en partes de unas 220 letras: algunas voces se cortan solas con textos largos.
- Controles:
  - ▶ / ⏸ / ⏹ y ⏮ ⏭ por página;
  - arranca en la página abierta (`?pagina=`);
  - voz (prefiere es-UY/es-AR, después latinoamericanas y España) y velocidad, que se recuerdan en el navegador.
- **Pausa = cortar y retomar en la misma parte**, porque `pause()` falla en varios celulares.
- Pide mantener la pantalla encendida (Wake Lock). En el celular puede cortarse si se bloquea la pantalla o se cambia de app.
- Si el capítulo tiene **audio grabado**, se muestra el audio y no la lectura automática.
- Más adelante, con presupuesto: voz natural paga (ElevenLabs u otra).

### Audio grabado de los capítulos (`src/lib/capacitacion-audio.ts`, tabla `capacitacion_audios`)

- Rosario va a grabar los capítulos con su voz. Ideal: **1 audio por capítulo**; si es largo, **varias partes** que se escuchan seguidas.
- **Máximo 80 MB por archivo** (`AUDIO_MAX_BYTES`). Con la grabadora del celular en calidad normal (~0,5–1 MB por minuto) entra un capítulo de 1 h o más. En calidad alta (~2 MB/min), unos 40 min.
- **Subir:** solo la CEO, en ✏️ Editar → "🎙️ Audio del capítulo" (o el botón 🎙️ del visor).
  - Se sube **de a pedazos de 4 MB** (`PUT /api/capacitacion/[id]/audio/[audioId]?desde=`), con 3 reintentos; al final `?fin=1` lo marca completo.
  - Las subidas que quedaron por la mitad se borran después de un día.
  - Si se eligen varios archivos juntos, se ordenan por nombre ("parte 1", "parte 2"…).
- **Guardado:** en la base (bytea con `STORAGE EXTERNAL`). El GET responde por pedazos (Range, de hasta 2 MB), así se puede adelantar y anda en iPhone.
  - Ojo: ocupa lugar en la base de Railway (unos 15–30 MB por capítulo).
- **Escuchar** (todos los usuarios con sesión):
  - reproductor arriba del PDF; si hay varias partes, pasa sola a la siguiente;
  - velocidad 1x / 1,25x / 1,5x / 0,9x;
  - "seguí desde donde quedaste" (en el navegador);
  - título en la pantalla bloqueada (Media Session). Sigue sonando con el celular bloqueado.
- En el índice, los materiales con audio llevan "🎙️ Audio", y en la vista Todo hay un filtro "🎙️ Con audio".
- Al borrar un material se borran sus audios.

### Imprimir ejercicios (`src/lib/paginas-imprimibles.ts`, `capacitacion/[id]/imprimir-paginas.tsx`)

- Pedido de Rosario: no imprimir el manual entero, sino **solo los ejercicios**. Alcanza con que funcione en la computadora.
- Botón **"🖨️ Imprimir ejercicios"** en el visor de cada material con PDF subido a Orion. Lo ven todos los usuarios.
- Se detectan solas en el texto del buscador:
  - **Ejercicios:** "Ejercicio N · Título". No cuenta las menciones del tipo "en el Ejercicio 2".
  - **Autoevaluación:** el título con "Puntuá…".
  - **Checklist:** el título con ☐.

  No cuentan las menciones del índice del capítulo. Además se pueden sumar otras páginas a mano ("3, 8-9").
- Imprime **solo esas páginas**: las dibuja con pdf.js a ~200 dpi y las imprime desde un marco oculto, en A4, una por hoja. En el cuadro de impresión también se puede elegir "Guardar como PDF".

### Fotos para Marketplace en el celular (`propiedades/[id]/preparar-marketplace.tsx`)

- En el celular, "📲 Guardar en la galería" usa el menú de compartir (`navigator.share`).
- **Chrome en Android acepta hasta 10 archivos y unos 50 MB por vez.** Con más, falla sin avisar; antes ese error se tomaba como "cerró el menú" y no pasaba nada.
- Ahora las fotos se comparten **en tandas de hasta 10** (y 45 MB): un botón por tanda ("Guardar fotos 1 a 10", "11 a 13"). Cada tanda necesita su propio toque, porque el celular lo exige.
- Si el menú falla por otra cosa, aparece la grilla **"Guardar de a una"**: se mantiene apretada cada foto y se elige "Guardar imagen". También está el link para abrirla a mano.
- En la computadora sigue el .zip.

### Frase del día en el Inicio (`src/lib/frase-del-dia.ts`)

- Tarjeta "✨ Frase del día" arriba del Inicio: frase, "🎯 Acción de hoy" y link al capítulo (abre en la página).
- **Fuente:** la "AFIRMACIÓN DEL CAPÍTULO" y la "Acción asociada" del final de cada capítulo del manual. Se leen del texto ya extraído por el buscador (`capacitacion_paginas`); el título viene con letras espaciadas ("A F I R M A C I Ó N…").
- También suma las **frases propias** que carga la CEO en `/capacitacion/frases` (tabla `frases_inicio`).
- Es la misma frase para todo el equipo y cambia a la medianoche de Uruguay, rotando por la lista.
- **Base de frases de autores** (`src/lib/frases-semilla.ts`, pedido de Rosario): unas 320 frases que se cargan una sola vez en `frases_inicio` (`origen='SEMILLA'`, marca `frases-semilla` en `datos_cargados`). Categorías: Mentalidad, Filosofía oriental, Kaizen y hábitos, Estoicos y clásicos, Ventas y personas, Dinero, Refranes y proverbios.
  - Libros incluidos, entre otros: *Piense y hágase rico*, *Los 7 hábitos*, *Padre rico, padre pobre*, *Mente millonaria*, *Si lo crees, lo creas*, *Vendes o vendes* / *10X*, *Cómo ganar amigos*, *Hábitos atómicos*, *El vendedor más grande del mundo*, *Los cuatro acuerdos*, *El hombre más rico de Babilonia*, Tao Te Ching, Analectas, Dhammapada, Sun Tzu, Musashi, Marco Aurelio, Séneca, Epicteto.
  - **Regla:** solo frases que están en la obra o el autor indicado (traducción libre). Las citas famosas mal atribuidas quedan afuera; los refranes van como refranes.
  - La tarjeta muestra "— Autor, Obra" y la categoría.
- Las frases (manual + autores + propias) se mezclan con un orden fijo (hash del texto) para que no salgan en bloques.
- En `/capacitacion/frases` la CEO filtra por categoría, busca por frase, autor o libro, borra cualquier frase y suma propias con autor, obra y categoría.
- Si no hay nada cargado, usa 3 frases de respaldo escritas para Orion.

## Pendientes

Orden acordado con Rosario (nov. 2026):

1. **Copia de seguridad de los datos (próximo, "mañana arrancamos con el 1").** Hoy todo vive en una sola base de Railway (contactos, propiedades con fotos, manual, audios) y no hay copias ni forma de exportar.
   - Botón **"Descargar respaldo"** solo para la CEO: contactos, propiedades, reservas y comisiones en Excel o CSV.
   - Revisar si el plan de Railway hace copias automáticas; si no, sumar una copia semanal.
2. **Qué pasa después del cierre** (Cap. 42, firma y fidelización):
   - aviso de vencimiento de contratos de alquiler (unos 60 días antes; la reserva ya guarda `duracion_meses`);
   - seguimiento después de la escritura (7 días, 1 mes, 1 año) para pedir testimonio y referidos, con mensajes de WhatsApp;
   - marcar a los clientes que cerraron como "Cliente Orion".
3. **Vencimiento de autorizaciones y exclusividades**: cargar la fecha de fin y avisar antes de que venza.
4. **Embudo del negocio para la CEO**: captaciones → publicadas → reservas → cierres, con el tiempo de cada paso. Antes, revisar qué muestra hoy `/productividad` para no duplicarlo.
5. **Tutorial del CRM** (ver abajo). Se hace cuando Rosario diga que la primera etapa de Orion está cerrada. Estimación que se le dio: muestra de 1 capítulo (~2 h), manual PDF (4–6 h), videos (5–8 h), guía dentro de Orion opcional (3–4 h).

## Plan del tutorial (acordado con Rosario)

Objetivo: que Rosario **no tenga que grabar nada**. Por ahora, **todo gratis**.

### Etapa 1 (cuando Rosario dé por cerrada la primera etapa)

1. **Manual en PDF** con capturas reales, paso a paso.
   - Separado por rol: **Agente** y **Líder / Administrador / CEO**.
   - Pensado también para mandar por WhatsApp a un agente nuevo.
2. **Videos cortos (2–3 min) con subtítulos, sin voz.**
   - Se graban solos con Playwright (`recordVideo`) mientras Orion se usa automáticamente.
   - Llevan flechas o resaltados de dónde tocar.
   - Los subtítulos se queman en el video (ffmpeg o un cartel superpuesto en la página).
3. Temas sugeridos, uno por video y capítulo:
   1. Primer ingreso e Inicio (Plan del día, Objetivo del mes, Mis propiedades)
   2. Contactos: cargar, roles, seguimiento, contacto frío
   3. Captar: verificar teléfono → captación → pasar a propiedad
   4. Propiedades y Pipeline (seguimiento del lunes, ajuste de precio)
   5. Agenda y visitas
   6. Búsquedas, coincidencias y consultas
   7. Reservas y comisiones (escala)
   8. Solo jefes: equipo, Comisiones por usuario, Actividad, Usuarios, "Entrar como" (CEO)

### Reglas

- **Siempre con datos de prueba inventados**, en una base local. Nunca datos ni clientes reales.
- Grabar desde la versión actual de Orion. Si una pantalla cambia, se regenera ese video o capítulo.

### Etapa 2 (más adelante)

- Cada mejora nueva se anuncia en **Novedades** (`/novedades`) con un mini tutorial: 2–3 capturas o un video corto.
- Cuando Rosario pueda pagar complementos:
  - **voz natural rioplatense** en los videos (servicio pago tipo ElevenLabs; la clave se pide con el formulario seguro, nunca por chat);
  - **guía dentro de Orion**: cartelitos la primera vez que entra un usuario y un botón "Ver tutorial".
