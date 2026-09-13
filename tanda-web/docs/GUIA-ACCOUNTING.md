# Guía del módulo Accounting (para Daniel)

Documento interno en español para entender **al 100 %** qué hace Accounting, cómo se configura, cómo se usa día a día, y qué entregables genera (incluido lo que pidió Holly).

Ruta en la app: **Finance → Accounting** (`/accounting`).

---

## 1. Para qué sirve este módulo

Accounting no es “solo un informe”. Su objetivo es:

1. Tomar las **horas reales** (fichajes / attendance + turnos) de empleados de fuerza laboral.
2. Calcular dos lados económicos:
   - **Pay** = lo que cuesta el trabajo (salario / wage expense).
   - **Charge** = lo que se factura al **cliente** (site).
3. Generar **entregables** listos para operar:
   - Facturas / cargos a cliente
   - Timesheets para clientes
   - Journals / bills para Xero
   - Pack de análisis por cliente / sede / empleado
   - Resúmenes de margen (Charge − Pay)

En pocas palabras: **regla de pago + tarifas + horas = números + CSV**.

---

## 2. Conceptos clave (léelos primero)

| Concepto | Qué es en la práctica |
|---|---|
| **Client / Site / Location** | Es la **misma entidad**. En Settings se llama **Clients**; en Accounting a veces “Client” o “site”. Cada warehouse/cliente (JAS, etc.) es un `Location`. |
| **Staff / Employee** | Empleado de **fuerza laboral** (`role = empleado`). Las cuentas admin/master/kiosk **no** son staff de payroll. |
| **Pay** | Costo laboral (lo que “pagamos” / expense). |
| **Charge** | Monto a cobrar al cliente. |
| **Margin** | Charge − Pay. |
| **Time band** | Franja horaria del día (ej. Early morning 00:00–06:00, Afternoon 18:00–24:00). Una sesión de trabajo se **parte** en bandas. |
| **Day type** | Tipo de día: weekday / Saturday / Sunday / Public holiday. |
| **Rate card / matriz** | Tabla **día × banda** con tarifas en **$** o **%**. |
| **Hourly rate** | Tarifa base del empleado ($/hora). Si las celdas están en %, casi todo se calcula desde aquí. |
| **Weekly close** | Congelar la semana (snapshot). Los números dejan de cambiar aunque lleguen fichajes nuevos. |

---

## 3. Mapa de la pantalla (4 pestañas)

### 3.1 Overview

- Estado de la **última semana** (Open / Closed).
- Totales Pay / Charge / Margin.
- Alertas de configuración (matrices vacías, staff sin rate, clientes sin charge card, etc.).
- Atajos a Setup / Weekly close / Exports.

Úsala como “tablero de salud”: ¿está todo listo para cerrar y exportar?

### 3.2 Setup

Aquí se configura **todo lo que no son horas**. Tiene dos bloques grandes:

1. **Pay and charge rules** (reglas de compañía)
2. **Rate cards** (tarifas Staff / Clients / Company defaults)

### 3.3 Weekly close

- Eliges el periodo (semana).
- Revisas excepciones y desglose por client/staff.
- **Close week** = congela cifras.
- **Reopen week** = vuelve a cálculo en vivo.

### 3.4 Exports

- Descarga de CSV (Xero, timesheet, journal, charge pack, summary).
- Análisis avanzado (vistas y agrupaciones).

**Flujo recomendado:** Setup → (operación con fichajes reales) → Weekly close → Exports.

---

## 4. Permisos (por qué a Holly le falló Export)

Accounting es un módulo **opt-in**: el rol debe tener el módulo **Accounting** marcado.

Además hay 3 acciones:

| Acción | Nombre en Roles | Para qué |
|---|---|---|
| (módulo) Accounting | Ver Accounting | Entrar a `/accounting` |
| `updateRules` | Edit pay rules, bands, and holidays | Editar reglas de compañía + Company defaults + reopen week |
| `updateRates` | Edit staff and site rate cards | Editar tarifas Staff y Clients |
| `export` | Export accounting reports (CSV) | Descargar exports; también permite **Close week** |

Si alguien ve Accounting pero:

- no tiene `export` → en Exports aparece **“No export permission”** (exactamente lo que vio Holly);
- no tiene `updateRates` → no puede guardar tarifas de staff/cliente;
- no tiene `updateRules` → no puede tocar bandas/reglas/Xero settings.

**Master** bypasea todo.

---

## 5. Setup profundo

### 5.1 Pay and charge rules (compañía)

Ruta: **Accounting → Setup → Pay and charge rules**

#### Week rules

- Día de inicio de semana.
- Redondeo de horas (`2dp`, none, nearest minutes).

#### Minimums and leave

- **Min pay hours** / **Min charge hours**: mínimos por sesión o por día.
- Si alguien trabaja 2 h y el mínimo es 4, el sistema puede **completar** hasta 4 (según reglas).
- Opción de pagar leave aprobado + horas de leave por día.

#### Time bands (compañía)

Defaults de fábrica:

- Early morning: `00:00` → `06:00`
- Afternoon: `18:00` → `24:00`

Lo que **no** aparece en esa lista pero sí usa el motor:

- **Base** = horario “normal” fuera de las bandas especiales.
- **Overtime** = horas que cruzan umbrales OT.

Ejemplo: turno 04:00–12:00

- 04:00–06:00 → Early morning  
- 06:00–12:00 → Base  

Puedes cambiar Early morning a `02:00–05:00` o `01:00–08:00` si el negocio lo pide.

#### Day types

Filas de la matriz:

- Monday to Friday  
- Saturday  
- Sunday  
- Public holiday  

#### Overtime

- Daily (ej. > 8 h/día → overtime)
- Weekly (ej. > 38 h/semana → overtime)

#### Public holidays

Fechas. Opcionalmente limitadas a ciertos clients; si no eliges ninguno = aplica a todos.

#### Allowances

Montos fijos (por hora o por sesión) en pay, charge o ambos.

#### Employment types & GL

Tipos (Full Time, Part Time, Casual, Contractor…) + códigos contables para journal / Xero bills (expense / payable). Super % es informativo.

#### Xero export settings

Valores que **rellenan** los CSV (no hardcodeados):

- Sales: account code, tax type, prefix, due days, plantilla de descripción (`{period}`, `{site}`)
- Bills: tax, prefix, contact (por staff o compartido), fallback account, descripción (`{period}`, `{staff}`)
- **Location tracking** (lo pedido por Holly):  
  - Activa TrackingName1 / TrackingOption1  
  - Nombre de categoría (debe coincidir con Xero, normalmente `Location`)  
  - La **opción** sale del **State** del client (NSW / QLD / VIC…)

---

### 5.2 Rate cards

Ruta: **Accounting → Setup → Rate cards**

#### Staff (lado Pay)

Para cada empleado:

1. Employment type  
2. **Base hourly rate ($)** ← crítico  
3. Min pay hours / effective from (opcional)  
4. Matriz día × banda  

**Cómo se resuelve el $ de pay de una celda:**

1. Si el staff tiene override en esa celda → úsala  
2. Si no → Company default pay matrix  
3. Si la celda es:
   - **$** → ese monto/hora  
   - **%** → `hourlyRate × (percent / 100)`  
4. Si no hay celda → cae al `hourlyRate` (aparece excepción *Fallback rate*)

**Ejemplo pay**

- Alex hourly = `$30`
- Weekday / Base = `100%` → $30/h  
- Weekday / Early morning = `125%` → $37.50/h  
- Saturday / Base = `150%` → $45/h  

Si Alex tiene hourly = `$0` y todo está en %, **todo el pay sale $0**.

#### Clients (lado Charge)

Para cada client/site:

1. Min charge hours / effective from  
2. **Client time bands** (opcional)  
3. Matriz de charge  

**Client time bands**

- Vacío = hereda bandas de la compañía.  
- Con valores = ese client usa **sus** bandas (ej. early morning 02:00–05:00 solo para ese warehouse).

**Cómo se resuelve charge**

1. Celda del client si existe  
2. Si no → Company default charge matrix  
3. Si es `%`, primero se arma una base “weekday charge” y luego se aplica el % de la celda (sobre esa base / lógica del motor).

**Ejemplo charge**

- Company weekday base charge efectiva ≈ $45/h (150% de un hourly $30, según defaults)  
- Early morning charge `125%` de esa base → más alto que base  
- Puedes poner un client en **$ fijos** (ej. $55/h siempre) sin depender del hourly del staff.

#### Company defaults

Matrices pay y charge por defecto para quien no tenga override.

Defaults de fábrica están en **%** (pensados para editarse al award real).

---

## 6. De dónde salen las horas

El cálculo usa:

- Fichajes de attendance (check-in / out, breaks)
- Contexto de turnos / location cuando aplica
- Solo empleados **payroll-eligible** (fuerza laboral activa)

Por eso el bug de “poder fichar al admin Accounting” era grave: esa cuenta **no** es un empleado operativo con hourly rate real.

**Correcto:** crear staff real → fichar / manual record a ese staff → calcular.

---

## 7. Ejemplo de punta a punta (como lo probaría Holly)

### Preparación (una vez)

1. **Roles** (Settings → Access roles):  
   Accounting + Edit rates + Edit rules + Export.
2. **Settings → Clients**: crear/editar clients con **State** = NSW / QLD / VIC (para Xero tracking).
3. **Accounting → Setup → Pay and charge rules**:  
   - Ajustar time bands (si early morning no es 00:00–06:00)  
   - Day types / OT / holidays  
   - Xero codes + Location tracking ON (categoría `Location`)
4. **Rate cards → Company defaults**: ajustar % o $.
5. **Rate cards → Staff**: empleado real con hourly rate > 0.
6. **Rate cards → Clients**: charge matrix y, si hace falta, client time bands.

### Semana de prueba

1. Generar horas (app / kiosk / manual record al **empleado**, no al admin).
2. **Weekly close**: revisar excepciones.
3. Si OK → **Close week**.
4. **Exports**:
   - Xero sales invoices → 1 línea por client/site (con Tracking Location = state)
   - Xero bills → pay (con tracking, se parte por staff+site)
   - Client timesheet CSV
   - Charge pack / Journal / Summary

### Números de ejemplo (ilustrativo)

Alex, $30/h, lunes 04:00–12:00 (8 h), sin OT extra:

| Tramo | Horas | Pay rate | Pay $ |
|---|---:|---:|---:|
| Early morning 04–06 | 2 | 125% = 37.50 | 75.00 |
| Base 06–12 | 6 | 100% = 30.00 | 180.00 |
| **Total pay** | 8 | | **255.00** |

Charge depende de la matriz del client / company (no tiene por qué ser el mismo %).

---

## 8. Entregables (qué “usos” tiene cada archivo)

| Entrega | Uso de negocio |
|---|---|
| **Xero sales invoices** | Importar cargos a clientes en Xero (ingresos). Tracking Location = estado. |
| **Xero bills** | Importar gastos de wages/contractor en Xero. |
| **Client timesheet CSV** | Adjuntar / enviar al cliente el detalle de horas y montos. |
| **Charge pack** | Pack interno: desglose por site y bandas para análisis/facturación. |
| **Journal** | Asientos por employment type (débito/crédito GL). |
| **Summary** | Vista agregada pay/charge/margin según filtros. |

---

## 9. Xero Location tracking (pedido de Holly)

Holly en Xero tiene:

- Tracking category: **Location**
- Options: **NSW**, **QLD**, **VIC**

En Tanda:

1. **Settings → Clients → State** = NSW/QLD/VIC…  
2. **Accounting → Setup → Xero export settings → Location tracking**  
   - Enabled  
   - Category name = `Location` (igual que en Xero)

Al exportar:

- Sales: cada línea de client lleva `TrackingName1=Location`, `TrackingOption1=NSW` (o el state del client).
- Bills: con tracking ON, el pay se **divide por sede** para poder etiquetar el estado del gasto.

Sin state en el client, la opción de tracking va vacía (Xero puede rechazar o dejar sin tracking).

---

## 10. Por qué salía $0 (caso Holly)

Causas típicas, en orden de probabilidad:

1. **Hourly rate = 0** + matrices en **%** → % de 0 = 0.  
2. Fichaje hecho sobre cuenta **admin** (`accounting@…`) por el bug del manual record.  
3. Rol **sin** `updateRates` / `updateRules` → no pudo configurar tarifas.  
4. Rol **sin** `export` → “No export permission”.  
5. Celda en **$** puesta en 0.  
6. Semana sin horas válidas (sesiones incompletas sin check-out).

Checklist rápido:

- [ ] Empleado real (no admin)  
- [ ] Hourly rate > 0  
- [ ] Company defaults o overrides con sentido  
- [ ] Client charge matrix  
- [ ] Permisos rates + rules + export  
- [ ] State del client si vas a Xero tracking  

---

## 11. Excepciones que verás en Weekly close

| Excepción | Significado |
|---|---|
| Incomplete | Sesión sin cerrar (falta check-out) |
| Min pay / Min charge | Se aplicó mínimo de horas |
| Overtime | Horas clasificadas como OT |
| Fallback rate | Se usó hourly base porque faltaba celda |
| No site card | Client sin matriz propia (puede seguir cobrando por company defaults; es warning) |

---

## 12. Qué NO es este módulo

- No reemplaza la app de Continental Inspect (inspecciones de carga).  
- No es el portal del cliente (PIN / portal es otro flujo).  
- No inventa horas: si no hay attendance/sesiones, no hay pay/charge.  
- No configura Xero dentro de Xero: solo **genera CSV** alineados a plantillas + tracking.

---

## 13. Mini glosario UI (inglés en pantalla → significado)

| En la app | En español |
|---|---|
| Rate cards | Tarjetas / matrices de tarifas |
| Company defaults | Defaults de la compañía |
| Weekly close | Cierre semanal |
| Charge pack | Pack de cobro por site |
| Employment type | Tipo de contratación |
| Tracking category | Categoría de seguimiento en Xero |
| Staff requests | Centro de solicitudes (leave / late / no-show) — módulo aparte |

---

## 14. Orden mental para explicárselo a Holly

1. **Permisos** correctos en su rol.  
2. **Clients** con State.  
3. **Rules** (bandas, OT, Xero).  
4. **Hourly + matrices**.  
5. **Horas de un empleado real**.  
6. **Close week**.  
7. **Export** y validar contra un histórico suyo.

Si envía histórico (horas + tarifas esperadas + totales), se puede validar el motor celda por celda.

---

*Documento interno Tanda — módulo Accounting. Actualizado con Location tracking (State en Clients + columnas Tracking en CSV Xero) y time bands por client.*
