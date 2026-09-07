# Liverpool Playwright Challenge

Proyecto de automatización E2E desarrollado con **Playwright + TypeScript** para validar un flujo de búsqueda de productos en el sitio de Liverpool.

El objetivo del proyecto es demostrar no solamente la automatización de una interfaz web, sino también la validación de información entre la **UI y el backend**, generación de evidencias y ejecución mediante **CI/CD con GitHub Actions**.

---

## Objetivo

Automatizar el siguiente flujo:

1. Navegar al sitio de Liverpool.
2. Buscar `playstation 5`.
3. Filtrar los resultados por color **Blanco**.
4. Ordenar los productos por **Menor precio**.
5. Obtener los primeros 5 productos mostrados en la UI.
6. Extraer nombre y precio de cada producto.
7. Interceptar la respuesta del servicio utilizado por Liverpool para obtener los resultados.
8. Comparar los productos mostrados en UI contra los productos recibidos desde la API.
9. Validar que al menos 3 de los primeros 5 productos de la UI estén presentes en la respuesta del backend.
10. Generar un reporte HTML y evidencias en caso de fallo.

---

## Tecnologías utilizadas

- Playwright
- TypeScript
- Node.js
- Git
- GitHub
- GitHub Actions
- HTML Reporter de Playwright

---

## Estructura del proyecto

```text
liverpool-playwright-challenge/
├── .github/
│   └── workflows/
│       └── test.yml
├── tests/
│   └── liverpool-search.spec.ts
├── playwright.config.ts
├── package.json
├── package-lock.json
├── README.md
└── TEST_STRATEGY.md
```

### ¿Qué contiene cada archivo?

**`tests/liverpool-search.spec.ts`**

Contiene el escenario automatizado principal. Desde este test se realiza la navegación, búsqueda, filtrado, ordenamiento, extracción de productos e interceptación de la respuesta de red.

**`playwright.config.ts`**

Contiene la configuración general de Playwright, incluyendo navegador, screenshots, traces, retries y reporter HTML.

**`.github/workflows/test.yml`**

Define el pipeline de GitHub Actions encargado de instalar las dependencias y ejecutar las pruebas automáticamente.

**`TEST_STRATEGY.md`**

Describe la estrategia de pruebas, riesgos de flakiness, manejo de CAPTCHA/anti-bot y una propuesta para escalar la automatización.

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/SoyElPache/liverpool-playwright-challenge.git
```

Entrar al proyecto:

```bash
cd liverpool-playwright-challenge
```

### 2. Instalar dependencias

```bash
npm ci
```

`npm ci` instala exactamente las versiones registradas en `package-lock.json`, lo cual ayuda a mantener ejecuciones reproducibles.

### 3. Instalar Chromium para Playwright

```bash
npx playwright install chromium
```

En Linux, si también se necesitan las dependencias del sistema:

```bash
npx playwright install --with-deps chromium
```

---

## Ejecución de pruebas

### Headless

Ejecución normal sin mostrar el navegador:

```bash
npx playwright test
```

Este es el modo utilizado normalmente en CI/CD.

### Headed

Para observar visualmente cómo Playwright ejecuta el escenario:

```bash
npx playwright test --headed
```

Este modo resulta especialmente útil durante el desarrollo y debugging.

### Ejecutar únicamente el escenario de Liverpool

```bash
npx playwright test tests/liverpool-search.spec.ts
```

### Modo UI de Playwright

```bash
npx playwright test --ui
```

Permite ejecutar y analizar los tests desde la interfaz gráfica de Playwright.

---

## Flujo automatizado

El test comienza navegando a:

```text
Liverpool → Home
```

Después localiza el buscador utilizando un locator semántico de Playwright:

```ts
page.getByRole('textbox', {
  name: /Buscar por producto/i,
});
```

Se realiza la búsqueda:

```text
playstation 5
```

Posteriormente se aplica:

```text
Color → Blanco
Ordenamiento → Menor precio
```

Una vez cargados los resultados, se obtienen las primeras cinco tarjetas de producto y se extraen sus nombres y precios.

---

## Interceptación de API

Además de validar la interfaz gráfica, el test escucha las respuestas de red generadas durante el flujo.

La petición relevante identificada es:

```text
POST /api/plp/search
```

Playwright espera la respuesta correspondiente mediante `waitForResponse`.

Ejemplo simplificado:

```ts
const [searchResponse] = await Promise.all([
  page.waitForResponse(
    response =>
      response.url().includes('/api/plp/search') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  ),

  page.getByRole('option', {
    name: 'Menor precio',
  }).click(),
]);
```

Se utiliza `Promise.all` para comenzar a escuchar la respuesta **antes de realizar la acción que la provoca**.

Esto evita perder la petición por comenzar a escuchar demasiado tarde.

---

## Validación UI vs API

La respuesta del backend se convierte a JSON y se extraen los productos disponibles.

De cada producto se consideran principalmente:

```text
productId
title
salePrice
```

Por otra parte, desde la interfaz se obtienen los primeros cinco productos visibles.

Antes de comparar nombres se normalizan los textos para reducir diferencias irrelevantes provocadas por mayúsculas, minúsculas o espacios.

Finalmente se valida que al menos:

```text
3 de 5 productos
```

mostrados en la UI puedan encontrarse en los datos recibidos desde el backend.

También se registran en consola las discrepancias encontradas, incluyendo diferencias de precio.

---

## ¿Por qué validar UI y API?

Una prueba únicamente visual podría comprobar que existen productos en pantalla, pero no necesariamente que la información mostrada corresponda correctamente con la información proporcionada por el backend.

Al comparar ambas capas podemos detectar problemas como:

- productos recibidos por backend que no aparecen correctamente en UI;
- nombres inconsistentes;
- precios diferentes entre frontend y backend;
- información incompleta;
- errores en la transformación de datos.

Esto amplía la cobertura del escenario sin necesidad de crear otro flujo E2E independiente.

---

## Reporte HTML

Playwright genera automáticamente un reporte HTML después de ejecutar las pruebas.

Para abrirlo:

```bash
npx playwright show-report
```

El reporte permite revisar:

- tests ejecutados;
- duración;
- pasos;
- errores;
- screenshots;
- traces y evidencias disponibles.

---

## Screenshots y traces

El proyecto está configurado para generar evidencias cuando ocurre un fallo.

Los screenshots permiten observar el estado visual de la aplicación.

Los traces de Playwright permiten analizar información adicional de la ejecución, incluyendo acciones, navegación, DOM y solicitudes de red.

Esto reduce el tiempo necesario para diagnosticar fallos, especialmente cuando ocurren dentro de CI.

---

## CI/CD con GitHub Actions

El proyecto contiene:

```text
.github/workflows/test.yml
```

El workflow realiza automáticamente:

```text
Checkout del repositorio
        ↓
Configuración de Node.js
        ↓
Instalación de dependencias
        ↓
Instalación de Chromium
        ↓
Ejecución de Playwright
        ↓
Generación del reporte
        ↓
Carga del reporte como artifact
```

El objetivo es que las pruebas puedan ejecutarse de forma reproducible fuera de la computadora del desarrollador.

---

## Limitación encontrada en GitHub Actions

Durante las pruebas se identificó una diferencia entre la ejecución local y la ejecución desde runners públicos de GitHub Actions.

Localmente el escenario puede acceder correctamente a Liverpool.

Sin embargo, desde el runner público de GitHub Actions el sitio puede responder:

```text
Access Denied
```

antes de cargar la aplicación.

El snapshot obtenido durante la ejecución mostró que la página entregada al runner correspondía a una página de bloqueo del CDN/protección anti-bot y no al sitio normal de Liverpool.

Por esta razón, el buscador nunca llega a existir en el DOM y Playwright termina esperando el elemento.

Este comportamiento representa una **restricción externa del ambiente de ejecución**, no un problema que pueda solucionarse aumentando los timeouts del test.

El escenario incluye una validación para detectar este comportamiento y producir un error más descriptivo.

---

## ¿Cómo resolvería esta limitación en un proyecto real?

No intentaría evadir CAPTCHA, WAF, CDN o mecanismos anti-bot desde la automatización.

En un ambiente empresarial consideraría alternativas como:

- utilizar un ambiente de QA autorizado;
- solicitar allowlisting para la infraestructura de CI;
- utilizar un self-hosted runner autorizado;
- ejecutar pruebas de API independientes en CI;
- utilizar mocks cuando el objetivo del test no requiera validar el servicio externo;
- reservar determinadas pruebas E2E para ambientes controlados.

La decisión dependería de qué riesgo queremos cubrir con cada prueba.

Más detalles se encuentran en:

```text
TEST_STRATEGY.md
```

---

## Decisiones de automatización

### ¿Por qué Playwright?

Playwright permite trabajar con UI y red dentro de la misma herramienta.

Para este escenario resulta especialmente útil por funcionalidades como:

```text
Locators
Auto-waiting
Network interception
Screenshots
Tracing
HTML reports
CI integration
```

### ¿Por qué evitar `waitForTimeout()`?

Los tiempos fijos pueden generar pruebas lentas e inestables.

En su lugar, el proyecto espera condiciones reales, por ejemplo:

```ts
await expect(productCards.first()).toBeVisible();
```

o respuestas específicas:

```ts
page.waitForResponse(...)
```

La prueba continúa cuando ocurre la condición esperada y no simplemente después de esperar una cantidad arbitraria de segundos.

### ¿Por qué no aumentar el timeout cuando CI mostró Access Denied?

Porque Playwright no estaba esperando una aplicación lenta.

La aplicación **nunca había sido entregada al navegador**.

Esperar 30, 60 o 120 segundos no solucionaría un bloqueo del servidor.

Primero se debe identificar la causa del fallo y después decidir si corresponde modificar el test, la aplicación o la infraestructura.

---

## Estrategia de pruebas

La estrategia completa está documentada en:

```text
TEST_STRATEGY.md
```

Incluye:

- qué escenarios no automatizaría;
- manejo de CAPTCHA y mecanismos anti-bot;
- riesgos de flakiness;
- mitigaciones;
- estrategia para CI;
- escalabilidad para suites de 50 o más pruebas.

---

## Autor

**Alberto Pacheco**

QA Automation / IT Engineer

Proyecto desarrollado como ejercicio técnico de automatización utilizando Playwright y TypeScript.