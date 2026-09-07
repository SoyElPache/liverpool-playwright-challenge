import { test, expect } from '@playwright/test';

test('buscar playstation 5 en Liverpool', async ({ page }) => {
  // Navegar a Liverpool
  await page.goto('https://www.liverpool.com.mx/tienda/home', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  // Detectar si Liverpool bloquea el entorno de CI
  const accessDenied = page.getByRole('heading', {
    name: 'Access Denied',
  });

  if (await accessDenied.isVisible().catch(() => false)) {
    test.skip(
      true,
      'Liverpool bloquea los runners públicos de GitHub Actions con Access Denied. El E2E real debe ejecutarse localmente o desde un runner autorizado.'
    );
  }

  // Localizar el buscador
  const searchInput = page.getByRole('textbox', {
    name: /Buscar por producto/i,
  });

  await searchInput.waitFor({
    state: 'visible',
    timeout: 30000,
  });

  // Buscar Playstation 5
  await searchInput.fill('playstation 5');
  await searchInput.press('Enter');

  // Localizar tarjetas de productos
  const productCards = page.locator(
    '[data-testid$="-card-card-link"]'
  );

  // Esperar a que existan resultados
  await expect(productCards.first()).toBeVisible({
    timeout: 30000,
  });

  // Filtrar por color Blanco
  const whiteFilter = page.getByTestId(
    'fjE0OlY6QmxhbmNvfn4jZmZmZmZm-inner'
  );

  await whiteFilter.click();

  // Abrir ordenamiento
  const sortButton = page.getByTestId(
    'dropdown-sorting-button'
  );

  await sortButton.click();

  // Interceptar la respuesta de búsqueda al ordenar por menor precio
  const [searchResponse] = await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes('/api/plp/search') &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      {
        timeout: 30000,
      }
    ),

    page.getByRole('option', {
      name: 'Menor precio',
    }).click(),
  ]);

  // Convertir respuesta de API a JSON
  const apiData = await searchResponse.json();

  console.log(
    '\nAPI interceptada:',
    searchResponse.url()
  );

  // Guardar productos encontrados en la API
  const apiProducts: {
    productId: string;
    title: string;
    price: number;
  }[] = [];

  // Buscar productos dentro de la respuesta JSON
  function findProducts(data: any) {
    if (Array.isArray(data)) {
      for (const item of data) {
        findProducts(item);
      }

      return;
    }

    if (data && typeof data === 'object') {
      if (
        data.productId &&
        data.title &&
        data.priceInfo?.salePrice !== undefined
      ) {
        apiProducts.push({
          productId: String(data.productId),
          title: data.title,
          price: data.priceInfo.salePrice,
        });
      }

      for (const value of Object.values(data)) {
        findProducts(value);
      }
    }
  }

  findProducts(apiData);

  console.log(
    'Productos encontrados en API:',
    apiProducts.length
  );

  // Guardar productos encontrados en UI
  const uiProducts: {
    name: string;
    price: number;
  }[] = [];

  const totalProducts = await productCards.count();

  console.log(
    '\nProductos encontrados en UI:',
    totalProducts
  );

  console.log('\nPrimeros 5 productos UI:\n');

  // Validar que existan al menos 5 productos
  expect(totalProducts).toBeGreaterThanOrEqual(5);

  // Extraer los primeros 5 productos
  for (let i = 0; i < 5; i++) {
    const card = productCards.nth(i);

    const text = await card.innerText();

    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const name = lines[1];

    // Buscar la línea que contiene el precio
    const priceText = lines.find(line =>
      line.startsWith('$')
    );

    /*
     * Algunos productos muestran precio promocional y precio anterior
     * dentro de la misma línea.
     *
     * Ejemplo:
     * $53900$1,49900
     *
     * Esta expresión toma únicamente el primer precio mostrado.
     */
    const priceMatch = priceText?.match(
      /^\$([\d,]+?)(\d{2})(?=\$|\s|-|$)/
    );

    const price = priceMatch
      ? Number(
          `${priceMatch[1].replace(/,/g, '')}.${priceMatch[2]}`
        )
      : NaN;

    uiProducts.push({
      name,
      price,
    });

    console.log(
      `${i + 1}. ${name} - $${price}`
    );
  }

  // Normalizar nombres para realizar comparación
  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  let matches = 0;

  console.log('\nComparación UI vs API:\n');

  // Comparar productos de UI contra productos de API
  for (const uiProduct of uiProducts) {
    const apiMatch = apiProducts.find(apiProduct =>
      normalizeText(apiProduct.title).includes(
        normalizeText(uiProduct.name)
      )
    );

    // Producto no encontrado en backend
    if (!apiMatch) {
      console.log(
        `❌ No encontrado en API: ${uiProduct.name}`
      );

      continue;
    }

    // Producto encontrado pero con diferencia de precio
    if (apiMatch.price !== uiProduct.price) {
      console.log(
        `⚠️ Diferencia de precio: ${uiProduct.name}`
      );

      console.log(
        `   UI: $${uiProduct.price}`
      );

      console.log(
        `   API: $${apiMatch.price}`
      );

      continue;
    }

    // Producto y precio coinciden
    matches++;

    console.log(
      `✅ Coincide: ${uiProduct.name} - $${uiProduct.price}`
    );
  }

  console.log(
    `\nCoincidencias encontradas: ${matches}/5`
  );

  // El reto solicita al menos 3 coincidencias de los primeros 5 productos
  expect(matches).toBeGreaterThanOrEqual(3);
});