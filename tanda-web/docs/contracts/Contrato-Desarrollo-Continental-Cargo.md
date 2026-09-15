# CONTRATO DE DESARROLLO, ENTREGA Y CESIÓN DE DERECHOS DE SOFTWARE

**Continental Cargo Workspace (Tanda) — Sistema web y aplicación Android**

> **Aviso:** Este documento es un borrador contractual preparado para revisión por las partes y, preferiblemente, por un abogado/contador. No constituye asesoría legal.

**Fecha del contrato:** _________________  
**Lugar:** _________________

---

![Continental Cargo Logistics Company](../manuals/images/logo-continental-cargo.png)

---

## 1. Partes

**EL PRESTADOR**

| Campo | Dato |
|---|---|
| Nombre completo | Daniel Esteban Caro Álvarez |
| Documento de identidad | _________________ |
| Domicilio | _________________ |
| Correo electrónico | _________________ |
| Teléfono | _________________ |

En adelante, el **“Prestador”**.

**EL CLIENTE**

| Campo | Dato |
|---|---|
| Nombre / firmante | Carlos Saicedo |
| En representación de | Continental Cargo (Logistics Company / razón social: _________________) |
| Documento / ABN u otro | _________________ |
| Domicilio | _________________ |
| Correo electrónico | _________________ |
| Teléfono | _________________ |
| Calidad del firmante | Representante autorizado |

En adelante, el **“Cliente”**.

El Prestador y el Cliente se denominan conjuntamente las **“Partes”**.

---

## 2. Objeto

El Prestador ha desarrollado y entrega al Cliente el sistema de operaciones de fuerza laboral y cumplimiento conocido como **Continental Cargo Workspace (Tanda)**, que incluye:

1. La **aplicación web** (administración, empleado, kiosko/PWA, inspecciones, contabilidad operativa y módulos relacionados).
2. La **aplicación móvil Android** (APK para instalación, incluyendo el flujo operativo Continental Inspect / inspecciones).
3. El **código fuente**, materiales técnicos, documentación y manuales asociados.
4. La configuración del **proyecto Firebase**, el **despliegue en Vercel** (según el estado al momento de la entrega) y el **dominio** `continentalcargo.online`.

El detalle del alcance construido figura en el **Anexo A**. El inventario de entregables figura en el **Anexo B**. Los costos de infraestructura figuran en el **Anexo C**.

---

## 3. Alcance incluido y excluido

### 3.1 Incluido en el precio (USD 12.000)

- Sistema web completo según Anexo A y Anexo B.
- APK Android para instalación (sideload / distribución interna).
- Código fuente del/los repositorio(s) del proyecto.
- Manual de empleado y manual de administrador (en el estado disponible a la fecha de entrega; el de administrador podrá completarse dentro del periodo de garantía si aún está en curso).
- Acceso **master** a la web.
- Dominio `.online` (`continentalcargo.online`), sujeto a renovación anual (costo de registrador a cargo del Cliente según Anexo C).
- Proyecto Firebase y despliegue Vercel en las condiciones de las cláusulas 7 y 8.

### 3.2 Excluido (salvo acuerdo escrito aparte)

- Aplicación **iOS** / App Store (se negociará posteriormente por costos de cuenta Apple Developer, builds, pruebas y publicación).
- Publicación en **Google Play Store** (cuenta developer, revisión y políticas de la tienda).
- Desarrollo de **funcionalidades nuevas** no existentes a la fecha de firma (change requests).
- Capacitación presencial in situ; se incluyen como máximo **dos (2) sesiones remotas** de onboarding de hasta 60 minutos cada una, previo acuerdo de agenda. Horas adicionales se cotizan aparte.
- Contenido de negocio del Cliente (textos legales propios, políticas internas, datos maestros incorrectos, etc.).
- Hardware, tablets, impresoras, redes locales del almacén o dispositivos NFC/QR físicos.

---

## 4. Precio y forma de pago

### 4.1 Precio total

El precio total del desarrollo y entrega descritos en este Contrato es de:

**USD 12.000 (doce mil dólares de los Estados Unidos de América).**

Salvo indicación contraria por escrito, el precio se entiende **neto**; impuestos, retenciones o GST aplicables según la jurisdicción se añadirán o retendrán conforme a la ley.

### 4.2 Forma de pago (completar)

| Concepto | Monto (USD) | Fecha / condición |
|---|---|---|
| Anticipo | ________ | ________ |
| Pago intermedio / hito | ________ | ________ |
| Saldo final | ________ | Contra entrega formal tras pago total |
| **Total** | **12.000** | |

Método de pago: _________________ (transferencia / PayPal / otro).  
Cuenta / datos bancarios del Prestador: _________________.

### 4.3 Condición esencial

La **cesión definitiva de propiedad intelectual**, la **entrega del código fuente completa**, la **migración de Firebase/Vercel** a cuentas del Cliente y la **transferencia del dominio** se realizan **únicamente tras el pago total acreditado** del precio de USD 12.000.

Hasta ese momento, el Cliente dispone de una **licencia de uso limitada, no exclusiva y no transferible** del sistema en producción para su operación ordinaria.

### 4.4 Mora

El retraso en pagos superior a _____ días habilita al Prestador a suspender soporte no crítico y/o el acceso administrativo que aún gestione, previa notificación por escrito con _____ días de anticipación, sin perjuicio del cobro de lo adeudado.

---

## 5. Entregables y aceptación

### 5.1 Entregables

Conforme al **Anexo B**, incluyendo como mínimo:

- Acceso master web.
- APK Android instalable.
- Código fuente (repositorio(s) o archivo exportado).
- Proyecto Firebase (reglas, estructura, datos operativos existentes).
- Despliegue Vercel / URL de producción.
- Dominio `continentalcargo.online`.
- Manual de empleado y manual de administrador.
- Plantillas de variables de entorno **sin secretos**.

### 5.2 Aceptación

El Cliente dispondrá de **diez (10) días hábiles** desde la notificación de entrega formal para reportar defectos bloqueantes por escrito. Transcurrido ese plazo sin observaciones sustanciales, o tras la corrección de los defectos reportados en garantía, se entenderá **aceptada** la entrega.

---

## 6. Propiedad intelectual y código fuente

1. Todo el software, código fuente, diseños de UI, documentación, scripts, reglas de Firebase, assets propios del proyecto y materiales creados por el Prestador para este sistema se **ceden al Cliente** en propiedad plena **una vez acreditado el pago total**.
2. Quedan excluidos de la cesión: herramientas genéricas del Prestador, librerías de terceros (open source / comerciales) y marcas de terceros, que se rigen por sus respectivas licencias.
3. El Cliente será titular de los **datos de negocio** introducidos en el sistema (empleados, turnos, inspecciones, etc.).
4. Hasta el pago total, el Prestador retiene la titularidad del código y otorga la licencia de uso prevista en la cláusula 4.3.

---

## 7. Hosting temporal (Firebase y Vercel) y migración

### 7.1 Situación temporal

El proyecto **Firebase** y el despliegue en **Vercel** permanecen **temporalmente** en cuentas del Prestador hasta el pago total, para mantener la continuidad operativa.

### 7.2 Migración post-pago

Tras el pago total y la recepción de las **cuentas destino** del Cliente (Firebase / Google Cloud, Vercel, DNS/registrador, Resend u otros), el Prestador realizará la migración en un plazo de **quince (15) días hábiles**, salvo fuerza mayor o demora del Cliente.

Si el Cliente no proporciona cuentas o accesos en un plazo de **treinta (30) días** desde el pago total, el Prestador podrá mantener el hosting temporal facturando el passthrough de costos (Anexo C) y un cargo administrativo razonable por demora, o suspender el servicio previa notificación.

### 7.3 Vercel

El despliegue actual se contempla en el **plan gratuito** de Vercel, sujeto a límites del proveedor. El uso comercial o el excedente de cuota puede requerir **plan Pro** u otro pago — a cargo del Cliente (Anexo C).

---

## 8. Dominio `.online`

1. Se entrega / transfiere el dominio **`continentalcargo.online`** al Cliente (o se configura DNS a su registrador) tras el pago total.
2. La **renovación anual** del dominio y cualquier fee del registrador son a cargo del Cliente.
3. El Prestador no garantiza la disponibilidad perpetua del nombre de dominio ante el registrador; sí gestiona la transferencia razonable dentro del proceso de migración.

---

## 9. Garantía (3 meses)

### 9.1 Cobertura

Durante **tres (3) meses** contados desde la fecha de aceptación (o desde la entrega formal si no hay objeciones), el Prestador:

- Corregirá **bugs** y fallos de funcionamiento de lo ya entregado.
- Realizará **mejoras mínimas** sobre funcionalidades **existentes** (ajustes de UX menores, correcciones de flujo, estabilización), a criterio razonable del Prestador.

### 9.2 No incluido en garantía

- Nuevas funcionalidades o módulos.
- Rediseños mayores.
- Integraciones nuevas con terceros no existentes a la fecha de firma.
- Problemas causados por: mal uso, modificación del código por terceros, borrado de datos por el Cliente, cambios de configuración indebidos, fallos de proveedores (Firebase, Vercel, Resend, DNS, ISP), dispositivos defectuosos, red local, o contenido ilegal/incorrecto cargado por usuarios.

### 9.3 Change requests

Toda funcionalidad nueva se cotizará por escrito (alcance, plazo, precio) y solo se inicia tras aprobación del Cliente. Queda sujeto a revisión de carga de trabajo y prioridad.

---

## 10. Costos de infraestructura (passthrough)

1. El Cliente asume el costo de consumo de **Firebase**, **Resend**, **dominio**, **EAS/Expo**, **Vercel** (si deja de ser gratuito) y cualquier otro servicio necesario para operar el sistema.
2. Mientras las facturas estén a nombre del Prestador, este cobrará al Cliente el **importe íntegro de la factura** (passthrough, **sin markup**), con copia o resumen del consumo.
3. Tras la migración a cuentas del Cliente, el Cliente paga directamente a los proveedores.
4. Los límites orientativos y riesgos de cobro constan en el **Anexo C**. Dichos límites pueden cambiar según el proveedor; prevalece la tarifa vigente publicada por cada servicio.

---

## 11. Mantenimiento post-garantía

### 11.1 Plan opcional

Finalizados los 3 meses de garantía, el Prestador podrá prestar **administración, mantenimiento, soporte remoto y mejoramiento progresivo** del sistema por:

**USD 70 (setenta dólares) por semana.**

Este plan **no se activa automáticamente**: requiere **aceptación escrita** del Cliente (addendum, email de confirmación o firma en el cuadro de aceptación del Anexo D).

### 11.2 Incluye (orientativo)

- Soporte remoto **24/7** para incidencias operativas razonables.
- Monitoreo básico y respuesta a caídas / errores reportados.
- Mantenimiento correctivo y mejoras progresivas de lo existente (no proyectos nuevos grandes).
- Coordinación de renovaciones / avisos de consumo cuando las cuentas sigan mediadas por el Prestador.

### 11.3 No incluye

- Desarrollos de envergadura (nuevos módulos); se cotizan aparte.
- Presencia física en sitio.
- Costos de terceros (Anexo C), que se facturan aparte o los paga el Cliente directamente.

### 11.4 Terminación del plan

Cualquiera de las Partes podrá dar por terminado el plan de mantenimiento con **quince (15) días** de preaviso escrito. Al terminar: cesa el soporte 24/7; el Cliente conserva el código y datos de su propiedad; el Prestador entrega accesos que aún gestione en un plazo razonable.

---

## 12. Manuales y accesos

El Prestador entrega:

- **Manual de empleado** (móvil / uso workforce).
- **Manual de administrador** (escritorio / operación admin).
- Usuario / rol **master** en la web.
- **APK Android** para instalación en dispositivos del Cliente.

La actualización de manuals por cambios mayores posteriores a la garantía se rige por el plan de mantenimiento o change request.

---

## 13. Confidencialidad y datos

1. Las Partes guardarán confidencialidad sobre credenciales, código no público, datos de empleados y secretos comerciales.
2. El Prestador no usará datos del Cliente para fines ajenos al proyecto.
3. Durante la garantía, el Prestador realizará respaldos razonables según las herramientas disponibles (export / snapshots practicables). Tras la migración, la política de backup es responsabilidad del Cliente, salvo que el plan de mantenimiento la incluya expresamente.
4. El Prestador no será responsable de pérdida de datos causada por acciones del Cliente o de terceros proveedores fuera de su control razonable.

---

## 14. Limitación de responsabilidad

Salvo dolo o culpa grave, la responsabilidad agregada del Prestador frente al Cliente por este Contrato no excederá el monto total efectivamente pagado por el Cliente al Prestador en los **doce (12) meses** anteriores al reclamo (o el precio del Contrato si aún no hubiere transcurrido un año). No se responden daños indirectos, lucro cesante o pérdida de oportunidad.

---

## 15. Fuerza mayor

Ninguna Parte será responsable por incumplimientos debidos a causas fuera de su control razonable (desastres, fallos masivos de cloud, guerras, cambios legales abruptos, etc.), debiendo notificar y mitigar en lo posible.

---

## 16. Terminación

1. Por cumplimiento: pago total + entrega + aceptación.
2. Por incumplimiento grave no subsanado en **quince (15) días** desde notificación escrita.
3. Efectos: lo pagado por trabajo ya realizado no es reembolsable salvo acuerdo; el código no se cede si no hay pago total; los datos del Cliente se exportarán en formato razonable a solicitud.

---

## 17. Ley aplicable y disputas

Este Contrato se rige por las leyes de:

**_________________ (completar: p. ej. New South Wales, Australia / otra jurisdicción).**

Las Partes intentarán resolver disputas de buena fe en **quince (15) días**. Si no hay acuerdo, se someterán a los tribunales / mediación de: _________________.

---

## 18. Disposiciones generales

- Este documento y sus Anexos A–D constituyen el acuerdo completo sobre la materia.
- Modificaciones solo por escrito firmado (o email inequívoco de ambas Partes).
- Si alguna cláusula es inválida, el resto permanece vigente.
- Firmas electrónicas / escaneadas se aceptan como válidas entre las Partes.

---

## Firmas

| Prestador | Cliente |
|---|---|
| _______________________________ | _______________________________ |
| Daniel Esteban Caro Álvarez | Carlos Saicedo |
| Fecha: ________ | Por Continental Cargo |
| | Fecha: ________ |

---

# ANEXO A — Historial de desarrollo y alcance construido

**Naturaleza:** inventario contractual de lo desarrollado y cubierto por el precio de USD 12.000. **No** constituye timesheet adicional facturable.

### A.1 Evidencia de esfuerzo

| Concepto | Valor |
|---|---|
| Periodo de desarrollo (repo) | 29 mayo 2026 – 15 septiembre 2026 (aprox. 3,5 meses calendario) |
| Actividad en repositorio | ~293 commits; autor principal Daniel Caro |
| Intensidad aproximada (commits/mes) | may 19 · jun 137 · jul 28 · ago 20 · sep 89 |
| Esfuerzo estimado declarado | **~600 horas-hombre** (diseño, desarrollo, integración, pruebas manuales, despliegue y documentación) |

### A.2 Fases

| Fase | Periodo | Entregables principales |
|---|---|---|
| 1. Fundación | may–jun 2026 | Auth Firebase, dashboard admin, CRUD empleados, base de asistencia y horarios, shell web Next.js |
| 2. Operación workforce | jun–jul 2026 | Kiosk/PWA, fichaje, leave requests, anuncios, roles/permisos, portal empleado |
| 3. Compliance y media | ago–sep 2026 | Inspecciones de carga (web + flujo mobile/Continental Inspect), Storage de media, portal de clientes/inspecciones |
| 4. Contabilidad y geofence | sep 2026 | Módulo accounting (rates, min hours, exports), geofence/mapas Leaflet, NFC/QR, notificaciones, cursos/help, manuals |
| 5. Cierre de entrega | sep 2026 | Manual empleado (+ admin), dominio `.online`, despliegue Vercel, APK Android |

### A.3 Inventario funcional (checklist)

**Administración**

- Dashboard con métricas y widgets configurables.
- Asistencia: registros, edición, justificaciones de tardanza/ausencia, alertas.
- Horarios: asignación de turnos, notificaciones/email de asignación, confirmación de asistencia por el empleado.
- Empleados: CRUD, invitación, documentos, foto, permisos y roles admin.
- Anuncios, leave approvals, issue reports, help tutorials.
- Inspecciones: listado, alta/edición, búsqueda, filtros, export CSV/PDF según corresponda.
- Settings: ubicaciones (CRUD + geofence), kioskos, roles, purge operativo, portal, notificaciones.

**Empleado**

- Overview: employee ID, hours & earnings, next shift, week preview.
- My records / worked shifts (bloques de trabajo).
- My schedule + confirmación de asistencia.
- My leave (vacaciones / permisos / time off + historial).
- My courses (seguimiento: link a plataforma externa, evidencia, marcar completado, aprobación admin).
- My profile (datos personales obligatorios → aprobación admin).
- Announcements, report issue, help, notificaciones (campana + activación push).

**Kiosk**

- Time clock con PIN de 4 dígitos.
- Geofence aprox. **200 m** respecto a la ubicación de trabajo.
- Foto / verificación según configuración.
- Historial local de punches (con poda/retención configurada).
- NFC o QR si el administrador lo habilita.

**Inspections / Continental Inspect (Android)**

- Identificación ULD/AWB, categorías de carga, cliente.
- Detalle de cargo (conservación, food type, peso, cajas, temperatura, daños).
- Transporte de salida (placa, conductor, empresa).
- Evidencia foto/video + GPS al guardar.
- APK Android para operación en campo.

**Accounting**

- Rate cards / matrices de tarifas.
- Mínimos de horas de pago y cargo.
- Vistas y exports orientados a nómina/cobro (guía Holly / accounting).

**Infraestructura y docs**

- Firebase Auth, Firestore, Storage.
- Hosting aplicación en Vercel.
- Email transaccional (Resend) donde esté configurado.
- Web Push (VAPID).
- Dominio `continentalcargo.online`.
- Documentación técnica y manuals de usuario.

### A.4 Cláusula de alcance temporal

El Anexo A describe el sistema objeto del Contrato **a la fecha de firma**. Mejoras posteriores fuera de garantía se rigen por **change request** o por el **plan de mantenimiento** (cláusula 11).

---

# ANEXO B — Inventario de entregables

| # | Entregable | Estado / nota |
|---|---|---|
| 1 | Código fuente (repo(s) o export) | Tras pago total |
| 2 | Acceso master web | A la entrega / aceptación |
| 3 | APK Android instalable | Incluida; no Play Store |
| 4 | Proyecto Firebase (datos + rules) | Migración post-pago |
| 5 | Despliegue Vercel / URL prod | Migración post-pago |
| 6 | Dominio `continentalcargo.online` | Transferencia post-pago |
| 7 | Manual de empleado | Incluido |
| 8 | Manual de administrador | Incluido (puede cerrarse en garantía) |
| 9 | Plantilla `.env.example` sin secretos | Incluida |
| 10 | Credenciales de servicios a migrar | Checklist en migración |
| 11 | Guía accounting (Holly) si aplica | Documentación existente |

**No se entregan** en el precio base: cuenta Apple Developer, publicación iOS, publicación Google Play, cuentas de pago de terceros ya a nombre del Cliente.

---

# ANEXO C — Costos de infraestructura y límites orientativos

> Los cupos “gratuitos” de los proveedores cambian. Las cifras son **orientativas** a la fecha del borrador. El Cliente paga siempre el consumo real según factura del proveedor.

### C.1 Passthrough

Mientras el Prestador figure como titular de facturación, cobrará al Cliente el **100 % del importe** de:

- Firebase / Google Cloud  
- Resend (u otro email)  
- Dominio / DNS  
- Vercel (si aplica cobro)  
- Expo EAS u otros builds  
- Cualquier otro servicio imprescindible acordado por escrito  

**Sin markup.** El fee semanal de mantenimiento (cláusula 11) es **independiente** de este passthrough.

### C.2 Tabla de servicios

| Servicio | Uso en el sistema | Orientación free / tipico | Qué genera cobro |
|---|---|---|---|
| **Firebase Authentication** | Login admin/empleado | Plan Spark: cuota diaria de autenticaciones (orden de decenas de miles/día en free; verificar vigente) | Excesos; proyecto en Blaze |
| **Cloud Firestore** | Datos operativos | Free: almacenamiento ~1 GiB; lecturas/escrituras/borrados diarios limitados (p. ej. orden 50k/20k/20k — verificar vigente) | Dashboards, sync en tiempo real, alto volumen de inspections/attendance |
| **Firebase Storage** | Fotos/videos de inspecciones y evidencias | Free: ~5 GiB almacenamiento y descarga diaria limitada (verificar vigente) | **Principal riesgo de costo** con video/fotos |
| **Vercel** | Hosting Next.js | Hobby: free con límites de build, bandwidth y uso no comercial estricto | Plan **Pro** típico para producción comercial; bandwidth/team |
| **Resend** | Emails (turnos, invites, announcements) | Free tier por cantidad de emails/mes (p. ej. orden 3.000/mes — verificar vigente) | Volumen alto; dominio remitente |
| **Dominio `.online`** | `continentalcargo.online` | **Siempre de pago** | Renovación anual típica ~USD 30–50 (según registrador) + DNS |
| **Web Push (VAPID)** | Notificaciones | Sin costo de plataforma | — |
| **OpenStreetMap / Leaflet** | Mapas geofence | Fair use gratuito | Tile provider pago si se escala mucho |
| **Expo EAS** | Rebuilds de APK Android | Cuota free limitada de builds | Builds frecuentes / plan pago |
| **Google Play Console** | Publicación store (excluida) | Fee único developer | Solo si se acuerda aparte |
| **Apple Developer** | iOS futuro (excluido) | ~USD 99/año | Solo si se negocia iOS |

### C.3 Responsabilidad del Cliente

El Cliente reconoce que el crecimiento de usuarios, media (video) y tráfico puede hacer insuficiente el free tier y generar facturas mensuales variables. El Prestador avisará cuando detecte tendencia de sobrecosto, sin asumir el pago de esos consumos.

---

# ANEXO D — Aceptación del plan de mantenimiento (opcional)

El Cliente **acepta** / **no acepta** (tachar lo que no corresponda) el plan de mantenimiento post-garantía:

- **USD 70 / semana**
- Soporte remoto 24/7 según cláusula 11
- Inicio: el día siguiente al vencimiento de la garantía de 3 meses, o fecha: ________
- Facturación: semanal / quincenal / mensual (agrupada): ________

Firma Cliente: _________________ Fecha: ________  
Firma Prestador: _________________ Fecha: ________

---

*Fin del Contrato y Anexos — Continental Cargo Workspace (Tanda).*
