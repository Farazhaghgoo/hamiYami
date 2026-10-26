/*
 * Fictional demo catalog. Every neighborhood, cook, meal and availability figure here is invented
 * to demonstrate the product. None of it describes real people, places, approvals or demand.
 *
 * Only three dishes have photos (licensed stock, see README.md → Images). The others deliberately
 * have no photo and show a neutral placeholder instead of an unrelated image.
 */
import type { CookProfile, Meal, Neighborhood } from "@/domain/catalog";

export const PILOT_NEIGHBORHOOD_ID = "nb-borgo-lavanda";

export const neighborhoods: Neighborhood[] = [
  {
    id: PILOT_NEIGHBORHOOD_ID,
    name: "Borgo Lavanda",
    isPilot: true,
    pickupPoints: [
      { id: "pp-tigli", area: { it: "Zona Piazza dei Tigli", en: "Piazza dei Tigli area" } },
      { id: "pp-mercato", area: { it: "Vicino al mercato coperto", en: "Near the covered market" } },
      { id: "pp-parco", area: { it: "Zona Parco Nord", en: "Parco Nord area" } },
    ],
  },
  {
    id: "nb-rione-melograno",
    name: "Rione Melograno",
    isPilot: false,
    pickupPoints: [],
  },
];

export const DEMO_COOK_ID = "cook-marta";

export const cooks: CookProfile[] = [
  {
    id: DEMO_COOK_ID,
    displayName: "Marta",
    neighborhoodId: PILOT_NEIGHBORHOOD_ID,
    pickupPointId: "pp-tigli",
    cookingStyle: {
      it: "Cucina di casa emiliana: pasta fresca, ragù cotto a lungo e piatti al forno.",
      en: "Home-style Emilian cooking: fresh pasta, slow-cooked ragù and baked dishes.",
    },
    bio: {
      it: "Marta è un personaggio inventato per questa demo. Il suo profilo mostra come un cuoco potrebbe presentare la propria cucina ai vicini.",
      en: "Marta is a character invented for this demo. Her profile shows how a cook could introduce their cooking to neighbors.",
    },
    isFictional: true,
    completedChecks: [],
  },
  {
    id: "cook-luca",
    displayName: "Luca",
    neighborhoodId: PILOT_NEIGHBORHOOD_ID,
    pickupPointId: "pp-mercato",
    cookingStyle: {
      it: "Verdure di stagione, minestre e piatti al forno semplici.",
      en: "Seasonal vegetables, soups and simple baked dishes.",
    },
    bio: {
      it: "Luca è un personaggio inventato per questa demo. Il suo menu d'esempio ruota intorno alle verdure del mercato.",
      en: "Luca is a character invented for this demo. His sample menu is built around market vegetables.",
    },
    isFictional: true,
    completedChecks: [],
  },
  {
    id: "cook-amina",
    displayName: "Amina",
    neighborhoodId: PILOT_NEIGHBORHOOD_ID,
    pickupPointId: "pp-parco",
    cookingStyle: {
      it: "Legumi e spezie dosate con delicatezza, spesso in piatti vegetali.",
      en: "Pulses and gently used spices, often in plant-based dishes.",
    },
    bio: {
      it: "Amina è un personaggio inventato per questa demo. Il suo menu d'esempio mostra piatti a base di legumi.",
      en: "Amina is a character invented for this demo. Her sample menu shows dishes built on pulses.",
    },
    isFictional: true,
    completedChecks: [],
  },
];

export const meals: Meal[] = [
  {
    id: "meal-lasagna",
    cookId: DEMO_COOK_ID,
    title: { it: "Lasagna al ragù", en: "Lasagna with ragù" },
    description: {
      it: "Pasta fresca all'uovo a strati con ragù cotto a lungo e besciamella cremosa, gratinata fino a dorare i bordi.",
      en: "Fresh egg pasta layered with slow-cooked ragù and creamy béchamel, baked until golden at the edges.",
    },
    portion: { it: "Circa 350 g, una porzione da cena", en: "About 350 g, one dinner portion" },
    portionSize: { amount: 350, unit: "g" },
    ingredients: {
      it: "Pasta fresca all'uovo (farina di grano tenero, uova), ragù di manzo e maiale (pomodoro, cipolla, carota, sedano), besciamella (latte, burro, farina di grano tenero), Parmigiano Reggiano.",
      en: "Fresh egg pasta (soft wheat flour, eggs), beef and pork ragù (tomato, onion, carrot, celery), béchamel (milk, butter, soft wheat flour), Parmigiano Reggiano.",
    },
    allergens: ["gluten", "eggs", "milk", "celery"],
    mayContain: [],
    dietary: [],
    image: {
      src: "/assets/images/lasagna-800.webp",
      width: 800,
      height: 600,
      alt: {
        it: "Una teglia di lasagna dorata e fumante con una fogliolina di basilico, accanto a del pane croccante",
        en: "A dish of golden, bubbling baked lasagna topped with a sprig of basil, next to crusty bread",
      },
    },
  },
  {
    id: "meal-polpette",
    cookId: DEMO_COOK_ID,
    title: { it: "Polpette al sugo", en: "Meatballs in tomato sauce" },
    description: {
      it: "Polpette di manzo cotte lentamente nel sugo di pomodoro, con una fetta di pane fatto in casa.",
      en: "Beef meatballs simmered slowly in tomato sauce, with a slice of homemade bread.",
    },
    portion: { it: "Sei polpette con sugo e pane, circa 400 g", en: "Six meatballs with sauce and bread, about 400 g" },
    portionSize: { amount: 400, unit: "g" },
    ingredients: {
      it: "Carne macinata di manzo, pane (farina di grano tenero), uova, Parmigiano Reggiano, prezzemolo, aglio, passata di pomodoro, cipolla, olio extravergine d'oliva.",
      en: "Minced beef, bread (soft wheat flour), eggs, Parmigiano Reggiano, parsley, garlic, tomato passata, onion, extra virgin olive oil.",
    },
    allergens: ["gluten", "eggs", "milk"],
    mayContain: [],
    dietary: ["pork_free"],
    image: null,
  },
  {
    id: "meal-peperoni",
    cookId: "cook-luca",
    title: { it: "Peperoni ripieni", en: "Stuffed peppers" },
    description: {
      it: "Peperoni dolci ripieni di riso, pomodoro, erbe aromatiche e formaggio, gratinati al forno.",
      en: "Sweet peppers filled with rice, tomato, herbs and cheese, baked until golden.",
    },
    portion: { it: "Due mezzi peperoni, circa 350 g", en: "Two pepper halves, about 350 g" },
    portionSize: { amount: 350, unit: "g" },
    ingredients: {
      it: "Peperoni rossi e gialli, riso, pomodoro, cipolla, mozzarella, Parmigiano Reggiano, uovo, aglio, prezzemolo, basilico, olio extravergine d'oliva.",
      en: "Red and yellow peppers, rice, tomato, onion, mozzarella, Parmigiano Reggiano, egg, garlic, parsley, basil, extra virgin olive oil.",
    },
    allergens: ["milk", "eggs"],
    mayContain: [],
    dietary: ["vegetarian", "pork_free"],
    image: {
      src: "/assets/images/stuffed-800.webp",
      width: 800,
      height: 600,
      alt: {
        it: "Peperoni rossi e gialli ripieni, coperti di formaggio fuso e dorato, in una pirofila di vetro",
        en: "Red and yellow peppers, stuffed and topped with browned melted cheese, in a glass baking dish",
      },
    },
  },
  {
    id: "meal-minestrone",
    cookId: "cook-luca",
    title: { it: "Minestrone di stagione", en: "Seasonal minestrone" },
    description: {
      it: "Una minestra densa di verdure di stagione, fagioli borlotti e pastina.",
      en: "A thick soup of seasonal vegetables, borlotti beans and small pasta.",
    },
    portion: { it: "Una ciotola da circa 450 ml", en: "One bowl, about 450 ml" },
    portionSize: { amount: 450, unit: "ml" },
    ingredients: {
      it: "Fagioli borlotti, carote, sedano, zucchine, patate, cavolo, pomodoro, cipolla, pastina di semola di grano duro, olio extravergine d'oliva.",
      en: "Borlotti beans, carrots, celery, courgette, potato, cabbage, tomato, onion, small durum wheat pasta, extra virgin olive oil.",
    },
    allergens: ["gluten", "celery"],
    mayContain: [],
    dietary: ["vegetarian", "vegan", "pork_free"],
    image: null,
  },
  {
    id: "meal-curry",
    cookId: "cook-amina",
    title: { it: "Curry di ceci e verdure", en: "Chickpea and vegetable curry" },
    description: {
      it: "Ceci e verdure di stagione cotti in un sugo di pomodoro cremoso e delicatamente speziato.",
      en: "Chickpeas and seasonal vegetables simmered in a gently spiced, creamy tomato sauce.",
    },
    portion: { it: "Circa 400 g, con riso basmati", en: "About 400 g, with basmati rice" },
    portionSize: { amount: 400, unit: "g" },
    ingredients: {
      it: "Ceci, zucca, cavolo nero, pomodori, cipolla, latte di cocco, aglio, zenzero, semi di senape, cumino, curcuma, coriandolo, riso basmati.",
      en: "Chickpeas, butternut squash, kale, tomatoes, onion, coconut milk, garlic, ginger, mustard seeds, cumin, turmeric, coriander, basmati rice.",
    },
    allergens: ["mustard"],
    mayContain: [],
    dietary: ["vegetarian", "vegan", "pork_free"],
    image: {
      src: "/assets/images/curry-800.webp",
      width: 800,
      height: 600,
      alt: {
        it: "Una ciotola bianca di curry di ceci con zucca e cavolo nero, con mezzo limone su un tavolo di legno",
        en: "A white bowl of chickpea curry with squash and kale, with half a lemon on a wooden table",
      },
    },
  },
  {
    id: "meal-lenticchie",
    cookId: "cook-amina",
    title: { it: "Zuppa di lenticchie rosse", en: "Red lentil soup" },
    description: {
      it: "Lenticchie rosse cotte con carota e cumino, rifinite con una spruzzata di limone.",
      en: "Red lentils cooked with carrot and cumin, finished with a squeeze of lemon.",
    },
    portion: { it: "Una ciotola da circa 450 ml", en: "One bowl, about 450 ml" },
    portionSize: { amount: 450, unit: "ml" },
    ingredients: {
      it: "Lenticchie rosse, carota, cipolla, sedano, aglio, cumino, curcuma, limone, olio extravergine d'oliva.",
      en: "Red lentils, carrot, onion, celery, garlic, cumin, turmeric, lemon, extra virgin olive oil.",
    },
    allergens: ["celery"],
    mayContain: ["mustard"],
    dietary: ["vegetarian", "vegan", "pork_free"],
    image: null,
  },
];
