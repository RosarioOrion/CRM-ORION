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

- **Reparto PROVISORIO** (constantes `PORCENTAJE_*`):

  | Parte | % |
  |---|---|
  | Agente | 40 (o según su nivel) |
  | Gastos de la empresa | 10 (fijo, línea sin beneficiario) |
  | Líder | 20 |
  | Administrador | 15 |
  | CEO | 15 |

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
- Más adelante, con presupuesto: voz natural paga (ElevenLabs u otra) o audios MP3 pregrabados por capítulo.

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

1. **Porcentajes finales de comisiones.** Rosario los define después de la reunión con César y Huillen.
   - Problema a resolver: con un agente en 45 % o 50 %, el reparto provisorio suma **105 % / 110 %**.
   - Hay que acordar de dónde sale la diferencia.
   - Se cambia en las constantes de `src/lib/comisiones.ts`.
2. **Tutorial del CRM** (ver abajo). Se hace cuando Rosario diga que la primera etapa de Orion está cerrada.

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
