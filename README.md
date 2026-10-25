# Gasti

Aplicación web para controlar gastos personales y suscripciones, hecha con HTML, CSS y JavaScript sin frameworks. Los datos se guardan solo en `localStorage` del navegador (moneda COP, zona horaria America/Bogota por defecto).

## Estructura

```
Gasti/
├── README.md
└── Proyecto prueba 1/
    ├── index.html   # Estructura de la página, iconos SVG y contenedores
    ├── script.js    # Lógica, almacenamiento, cálculos y vistas
    └── style.css    # Estilos (tema oscuro, tarjetas, gráficos, modales)
```

Para usarla, abre `Proyecto prueba 1/index.html` en el navegador.

## Funcionalidades

### Panel principal
- Gastado hoy, esta semana (desde el lunes) y este mes, con la cantidad de gastos.
- Presupuesto mensual con barra de progreso.
- Dinero disponible: ingresos − gastos del mes − costo mensual de suscripciones activas.
- Gráfico de los últimos 7 días y distribución por categoría (donut).
- Movimientos recientes, próximas renovaciones y gastos hormiga (compras de hasta $20.000 en 30 días, con repeticiones).

### Gastos
- Registro con valor, descripción, categoría, fecha y hora, método de pago y notas, con validación.
- Edición, eliminación con confirmación, búsqueda y filtro por categoría.

### Suscripciones
- Nombre, precio, frecuencia (semanal, mensual, anual), próxima renovación y estado (activa o cancelada).
- Aviso configurable: el mismo día, 1, 3 o 7 días antes. Una suscripción pasa a "próxima" cuando faltan esos días o menos.
- Al pasar la fecha de renovación, avanza sola al siguiente ciclo.
- El aviso por defecto de Configuración se aplica a las suscripciones nuevas.

### Estadísticas
- Evolución mensual (6 meses) y comparación con el mes anterior.
- Categorías con más consumo (top 4) y donut del mes.
- Costo mensual de suscripciones y su porcentaje frente al gasto total estimado.

### Notificaciones y Configuración
- Avisos dentro de la app, generados al abrirla (no hay envío push real).
- Perfil, ingresos, presupuesto, tipos de aviso, cerrar sesión y borrar datos locales.
- Opción de cargar datos de ejemplo.

## Cambios recientes
- Añadido el total semanal al panel.
- Corregido el cálculo de "Disponible" (antes multiplicaba las suscripciones por 0).
- Corregido el umbral de alerta (antes sumaba 4 días al aviso elegido).
- Renovación automática de fechas vencidas.
- "Recordar por defecto" aplicado a suscripciones nuevas.

## Pendiente
- Conectar Supabase: login real, tablas con RLS y sincronización en la nube entre dispositivos. La capa `Store` de `script.js` está aislada para poder reemplazarla. Con Supabase usa solo la anon key y RLS, nunca claves secretas.
- Notificaciones push y recordatorios reales.