import { test, expect } from '@playwright/test';

test('buscar playstation 5 en Liverpool', async ({ page }) => {
  // Navegar al sitio
  await page.goto('https://www.liverpool.com.mx/tienda/home', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  // Detectar bloqueo del sitio en CI
  const accessDenied = page.getByRole('heading', {
    name: 'Access Denied',
  });

  if (await accessDenied.isVisible().catch(() => false)) {
    throw new Error(
      'Liverpool bloqueó el acceso desde el entorno de ejecución. ' +
      'La página devolvió Access Denied antes de cargar la aplicación.'
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

  // Interceptar respuesta de la API al ordenar por menor precio
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

  // Convertir respuesta a JSON
  const apiData = await searchResponse.json();

  console.log(
    '\nAPI interceptada:',
    searchResponse.url()
  );

  // Productos encontrados en la API
  const apiProducts: {
    productId: string;
    title: string;
    price: number;
  }[] = [];

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

  // Productos encontrados en UI
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

  expect(totalProducts).toBeGreaterThanOrEqual(5);

  for (let i = 0; i < 5; i++) {
    const card = productCards.nth(i);

    const text = await card.innerText();

    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const name = lines[1];

    const priceText = lines.find(line =>
      line.startsWith('$')
    );

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

  // Normalizar texto
  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  let matches = 0;

  console.log('\nComparación UI vs API:\n');

  for (const uiProduct of uiProducts) {
    const apiMatch = apiProducts.find(apiProduct =>
      normalizeText(apiProduct.title).includes(
        normalizeText(uiProduct.name)
      )
    );

    if (!apiMatch) {
      console.log(
        `❌ No encontrado en API: ${uiProduct.name}`
      );

      continue;
    }

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

    matches++;

    console.log(
      `✅ Coincide: ${uiProduct.name} - $${uiProduct.price}`
    );
  }

  console.log(
    `\nCoincidencias encontradas: ${matches}/5`
  );

  expect(matches).toBeGreaterThanOrEqual(3);
});