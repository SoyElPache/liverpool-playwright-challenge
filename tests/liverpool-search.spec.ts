import { test, expect } from '@playwright/test';

test('buscar playstation 5 en Liverpool', async ({ page }) => {
  // Navegar a Liverpool
  await page.goto('https://www.liverpool.com.mx/tienda/home');

  // Localizar el buscador
  const searchInput = page.getByRole('textbox', {
    name: /Buscar por producto/i,
  });

  // Buscar Playstation 5
  await searchInput.fill('playstation 5');
  await searchInput.press('Enter');

  /*
    Esperamos directamente a que aparezcan productos.

    Esto es más estable en CI que depender del cambio de URL
    o de un encabezado específico.
  */
  await page.waitForLoadState('domcontentloaded');

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

  // Abrir el menú de ordenamiento
  const sortButton = page.getByTestId(
    'dropdown-sorting-button'
  );

  await sortButton.click();

  /*
    Escuchamos la respuesta de la API al mismo tiempo
    que seleccionamos "Menor precio".

    Promise.all evita que Playwright pierda la respuesta
    por empezar a escuchar demasiado tarde.
  */
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

  // Convertir la respuesta de la API a JSON
  const apiData = await searchResponse.json();

  console.log(
    '\nAPI interceptada:',
    searchResponse.url()
  );

  /*
    Aquí almacenaremos los productos encontrados
    dentro de la respuesta de la API.
  */
  const apiProducts: {
    productId: string;
    title: string;
    price: number;
  }[] = [];

  /*
    La respuesta JSON contiene varios niveles.

    Esta función recorre el JSON hasta encontrar objetos
    que tengan productId, title y salePrice.
  */
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

  // Buscar productos dentro de la respuesta
  findProducts(apiData);

  console.log(
    'Productos encontrados en API:',
    apiProducts.length
  );

  /*
    Aquí guardaremos los primeros cinco productos
    mostrados en la interfaz.
  */
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

  // Validar que existan al menos cinco productos
  expect(totalProducts).toBeGreaterThanOrEqual(5);

  // Extraer los primeros cinco productos
  for (let i = 0; i < 5; i++) {
    const card = productCards.nth(i);

    const text = await card.innerText();

    /*
      Convertimos el contenido de la tarjeta
      en líneas independientes.
    */
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const name = lines[1];

    // Encontrar la línea donde comienza el precio
    const priceText = lines.find(line =>
      line.startsWith('$')
    );

    /*
      Liverpool puede mostrar precios así:

      $44900

      o productos con descuento así:

      $53900$1,49900

      Esta expresión toma solamente el primer precio.
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

  /*
    Normalizamos los textos antes de compararlos.

    Ejemplo:
    "Consola PS5"
    "consola ps5"

    serán tratados de manera equivalente.
  */
  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  let matches = 0;

  console.log('\nComparación UI vs API:\n');

  /*
    Comparamos cada producto mostrado en UI
    contra los productos recibidos desde la API.
  */
  for (const uiProduct of uiProducts) {
    const apiMatch = apiProducts.find(apiProduct =>
      normalizeText(apiProduct.title).includes(
        normalizeText(uiProduct.name)
      )
    );

    // Producto no encontrado en la respuesta
    if (!apiMatch) {
      console.log(
        `❌ No encontrado en API: ${uiProduct.name}`
      );

      continue;
    }

    // El producto existe pero el precio es diferente
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

  /*
    Requisito del challenge:

    Al menos 3 de los primeros 5 productos mostrados
    en UI deben coincidir con la respuesta de la API.
  */
  expect(matches).toBeGreaterThanOrEqual(3);
});