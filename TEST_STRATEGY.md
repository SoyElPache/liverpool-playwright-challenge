# Test Strategy

## Qué no automatizaría y por qué

No automatizaría todos los flujos posibles del sitio de Liverpool como pruebas E2E.

Los escenarios relacionados con contenido altamente dinámico, promociones temporales, recomendaciones personalizadas o elementos controlados por terceros pueden generar pruebas costosas y poco estables.

La automatización E2E debe concentrarse en flujos críticos para el negocio, como búsqueda, filtrado, ordenamiento, carrito y checkout.

La lógica de negocio más específica debería cubrirse en niveles inferiores, como pruebas de API o componentes.

## Manejo de CAPTCHA y mecanismos anti-bot

Los CAPTCHA y mecanismos anti-bot no deben intentar evadirse desde las pruebas automatizadas.

Durante la ejecución en GitHub Actions se detectó que Liverpool responde con:

`Access Denied`

antes de cargar la aplicación cuando el test se ejecuta desde un runner público de GitHub.

El mismo flujo funciona correctamente desde un entorno local.

Esto indica una restricción de infraestructura o protección del sitio, no un fallo funcional del flujo automatizado.

En un entorno real propondría alguna de las siguientes soluciones:

- utilizar un self-hosted runner desde una red autorizada;
- solicitar allowlisting de las IP utilizadas por CI;
- disponer de un ambiente de testing sin mecanismos anti-bot;
- ejecutar pruebas de API o pruebas mockeadas en CI y reservar el E2E real para un entorno autorizado.

## Riesgos de flakiness y mitigaciones

Los principales riesgos son:

- tiempos variables de respuesta;
- contenido dinámico;
- cambios en selectores;
- llamadas de red asíncronas;
- protección anti-bot.

Las mitigaciones utilizadas incluyen locators semánticos de Playwright, esperas basadas en estado, interceptación explícita de respuestas HTTP y validaciones sobre elementos visibles.

Se evita utilizar pausas fijas con `waitForTimeout`.

## CI con 50 o más suites

Con una suite grande dividiría las pruebas por dominio funcional y nivel de criticidad.

Las pruebas rápidas y estables se ejecutarían en cada pull request.

Las pruebas E2E más pesadas podrían dividirse entre workers o shards de Playwright y ejecutarse en paralelo.

También separaría smoke, regression y pruebas dependientes de servicios externos para evitar que una dependencia externa bloquee toda la pipeline.

Los reportes, screenshots y traces se conservarían como artifacts para facilitar el análisis de fallos.