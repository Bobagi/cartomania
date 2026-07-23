/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface PlayerSeedData {
  username: string;
  passwordHash: string;
  role: UserRole;
}

interface CardSeedInput {
  number: number;
  code: string;
  name: string;
  description: string;
  imageUrl: string;
  magic: number;
  might: number;
  fire: number;
}

const createPlayerUpsertArgs = (player: PlayerSeedData) => ({
  where: { username: player.username },
  update: player,
  create: player,
});

async function main() {
  // ---------- Senhas (podem vir do ambiente) ----------
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';
  const ALICE_PASSWORD = process.env.ALICE_PASSWORD ?? 'alice123';

  // Refuse the weak demo defaults on a production deploy — the repo is public, so
  // shipping with admin123/alice123 would hand out a known ADMIN login.
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ADMIN_PASSWORD || !process.env.ALICE_PASSWORD) {
      throw new Error(
        'Refusing to seed with default demo passwords in production. Set ADMIN_PASSWORD and ALICE_PASSWORD in the environment.',
      );
    }
  }

  const [adminHash, aliceHash] = await Promise.all([
    bcrypt.hash(ADMIN_PASSWORD, 10),
    bcrypt.hash(ALICE_PASSWORD, 10),
  ]);

  // ---------- Usuários ----------
  // Admin padrão (username: admin)
  await prisma.player.upsert(
    createPlayerUpsertArgs({
      username: 'admin',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
    }),
  );

  // Usuário de exemplo (id e username: alice) para bater com sua UI
  await prisma.player.upsert(
    createPlayerUpsertArgs({
      username: 'alice',
      passwordHash: aliceHash,
      role: UserRole.USER,
    }),
  );

  console.log('✅ Users seeded: admin, alice');

  // ---------- Coleções ----------
  const dracomaniaCollection = await prisma.collection.upsert({
    where: { slug: 'dracomania' },
    update: {
      name: 'Dracomania',
      description: 'Dracomania collection by Elma Chips.',
      manufacturer: 'Elma Chips',
      releaseDate: new Date('1996-01-01'),
      totalCards: 32,
      imageUrl: 'images/cards/dracomania.png',
    },
    create: {
      slug: 'dracomania',
      name: 'Dracomania',
      description: 'Dracomania collection by Elma Chips.',
      manufacturer: 'Elma Chips',
      releaseDate: new Date('1996-01-01'),
      totalCards: 32,
      imageUrl: 'images/cards/dracomania.png',
    },
  });

  console.log('✅ Collections seeded: Dracomania');

  // ---------- Cartas ----------
  const dracomaniaCards: CardSeedInput[] = [
    {
      number: 1,
      code: 'master_dragon',
      name: 'Master Dragon',
      description: 'Supreme dragon that commands all others.',
      imageUrl: 'images/cards/1.png',
      magic: 22,
      might: 18,
      fire: 29,
    },
    {
      number: 2,
      code: 'golden_dragon',
      name: 'Golden Dragon',
      description: 'Radiant dragon armored in molten gold.',
      imageUrl: 'images/cards/2.png',
      magic: 16,
      might: 24,
      fire: 28,
    },
    {
      number: 3,
      code: 'silver_dragon',
      name: 'Silver Dragon',
      description: 'Swift dragon whose scales shine like silver.',
      imageUrl: 'images/cards/3.png',
      magic: 15,
      might: 21,
      fire: 27,
    },
    {
      number: 4,
      code: 'bronze_dragon',
      name: 'Bronze Dragon',
      description: 'Guardian dragon forged from bronze armor.',
      imageUrl: 'images/cards/4.png',
      magic: 14,
      might: 20,
      fire: 26,
    },
    {
      number: 5,
      code: 'copper_dragon',
      name: 'Copper Dragon',
      description: 'Ancient dragon with copper-plated wings.',
      imageUrl: 'images/cards/5.png',
      magic: 13,
      might: 19,
      fire: 25,
    },
    {
      number: 6,
      code: 'white_dragon',
      name: 'White Dragon',
      description: 'Frozen dragon that breathes icy flames.',
      imageUrl: 'images/cards/6.png',
      magic: 21,
      might: 15,
      fire: 22,
    },
    {
      number: 7,
      code: 'black_dragon',
      name: 'Black Dragon',
      description: 'Shadow dragon cloaked in midnight scales.',
      imageUrl: 'images/cards/7.png',
      magic: 19,
      might: 17,
      fire: 24,
    },
    {
      number: 8,
      code: 'red_dragon',
      name: 'Red Dragon',
      description: 'Ferocious dragon that scorches the battlefield.',
      imageUrl: 'images/cards/8.png',
      magic: 20,
      might: 16,
      fire: 23,
    },
    {
      number: 9,
      code: 'blue_dragon',
      name: 'Blue Dragon',
      description: 'Storm-breathing dragon wrapped in sapphire mist.',
      imageUrl: 'images/cards/9.png',
      magic: 18,
      might: 13,
      fire: 21,
    },
    {
      number: 10,
      code: 'green_dragon',
      name: 'Green Dragon',
      description: 'Forest guardian who commands emerald winds.',
      imageUrl: 'images/cards/10.png',
      magic: 17,
      might: 14,
      fire: 20,
    },
    {
      number: 11,
      code: 'knight',
      name: 'Knight',
      description: 'Valiant knight sworn to protect the realm.',
      imageUrl: 'images/cards/11.png',
      magic: 10,
      might: 23,
      fire: 15,
    },
    {
      number: 12,
      code: 'colossus',
      name: 'Colossus',
      description: 'Towering sentinel built from living stone.',
      imageUrl: 'images/cards/12.png',
      magic: 0,
      might: 30,
      fire: 0,
    },
    {
      number: 13,
      code: 'sorceress',
      name: 'Sorceress',
      description: 'Mystic heroine mastering ancient rituals.',
      imageUrl: 'images/cards/13.png',
      magic: 28,
      might: 2,
      fire: 19,
    },
    {
      number: 14,
      code: 'warrioress',
      name: 'Warrioress',
      description: 'Fearless warrior leading the front line.',
      imageUrl: 'images/cards/14.png',
      magic: 14,
      might: 22,
      fire: 12,
    },
    {
      number: 15,
      code: 'warrior',
      name: 'Warrior',
      description: 'Hardened veteran wielding twin blades.',
      imageUrl: 'images/cards/15.png',
      magic: 12,
      might: 25,
      fire: 10,
    },
    {
      number: 16,
      code: 'hero',
      name: 'Hero',
      description: 'Legendary champion of countless battles.',
      imageUrl: 'images/cards/16.png',
      magic: 12,
      might: 27,
      fire: 15,
    },
    {
      number: 17,
      code: 'werewolf',
      name: 'Werewolf',
      description: 'Lupine hunter striking under the full moon.',
      imageUrl: 'images/cards/17.png',
      magic: 15,
      might: 21,
      fire: 13,
    },
    {
      number: 18,
      code: 'mage',
      name: 'Mage',
      description: 'Arcane scholar who bends fire to their will.',
      imageUrl: 'images/cards/18.png',
      magic: 29,
      might: 4,
      fire: 17,
    },
    {
      number: 19,
      code: 'merlin',
      name: 'Merlin',
      description: 'Iconic wizard of legend and lore.',
      imageUrl: 'images/cards/19.png',
      magic: 30,
      might: 0,
      fire: 0,
    },
    {
      number: 20,
      code: 'mummy',
      name: 'Mummy',
      description: 'Cursed guardian wrapped in eternal linen.',
      imageUrl: 'images/cards/20.png',
      magic: 15,
      might: 24,
      fire: 0,
    },
    {
      number: 21,
      code: 'pegasus',
      name: 'Pegasus',
      description: 'Winged steed soaring across the skies.',
      imageUrl: 'images/cards/21.png',
      magic: 23,
      might: 12,
      fire: 12,
    },
    {
      number: 22,
      code: 'sorcerer',
      name: 'Sorcerer',
      description: 'Devout caster channeling celestial fire.',
      imageUrl: 'images/cards/22.png',
      magic: 26,
      might: 5,
      fire: 18,
    },
    {
      number: 23,
      code: 'shadow',
      name: 'Shadow',
      description: 'Ethereal apparition from the void.',
      imageUrl: 'images/cards/23.png',
      magic: 23,
      might: 10,
      fire: 1,
    },
    {
      number: 24,
      code: 'barbarian',
      name: 'Barbarian',
      description: 'Savage warrior of the frozen north.',
      imageUrl: 'images/cards/24.png',
      magic: 11,
      might: 29,
      fire: 8,
    },
    {
      number: 25,
      code: 'viking',
      name: 'Viking',
      description: 'Seafaring raider with indomitable spirit.',
      imageUrl: 'images/cards/25.png',
      magic: 13,
      might: 28,
      fire: 6,
    },
    {
      number: 26,
      code: 'witch',
      name: 'Witch',
      description: 'Enigmatic witch weaving hexes and fire.',
      imageUrl: 'images/cards/26.png',
      magic: 27,
      might: 3,
      fire: 16,
    },
    {
      number: 27,
      code: 'elf',
      name: 'Elf',
      description: 'Agile archer gifted with timeless grace.',
      imageUrl: 'images/cards/27.png',
      magic: 25,
      might: 6,
      fire: 14,
    },
    {
      number: 28,
      code: 'angel',
      name: 'Angel',
      description: 'Radiant herald wielding holy light.',
      imageUrl: 'images/cards/28.png',
      magic: 24,
      might: 1,
      fire: 7,
    },
    {
      number: 29,
      code: 'lava_giant',
      name: 'Lava Giant',
      description: 'Molten behemoth born from volcanoes.',
      imageUrl: 'images/cards/29.png',
      magic: 0,
      might: 0,
      fire: 30,
    },
    {
      number: 30,
      code: 'skeleton',
      name: 'Skeleton',
      description: 'Reanimated warrior rattling with malice.',
      imageUrl: 'images/cards/30.png',
      magic: 15,
      might: 20,
      fire: 2,
    },
    {
      number: 31,
      code: 'ogre',
      name: 'Ogre',
      description: 'Brutish ogre relying on raw power.',
      imageUrl: 'images/cards/31.png',
      magic: 16,
      might: 21,
      fire: 4,
    },
    {
      number: 32,
      code: 'unicorn',
      name: 'Unicorn',
      description: 'Mythic unicorn that heals the land.',
      imageUrl: 'images/cards/32.png',
      magic: 25,
      might: 13,
      fire: 7,
    },
  ];

  await prisma.card.createMany({
    data: dracomaniaCards.map((card) => ({
      ...card,
      collectionId: dracomaniaCollection.id,
    })),
    skipDuplicates: true,
  });

  console.log('✅ Cards inserted');

  // ---------- Traduções das cartas (pt / es) ----------
  // The base Card row holds the canonical English text; these populate the
  // CardTranslation side table per (card, locale). Idempotent via upsert.
  const cardTranslations: Record<
    string,
    Record<string, { name: string; description: string }>
  > = {
    master_dragon: {
      pt: {
        name: 'Dragão Mestre',
        description: 'Dragão supremo que comanda todos os outros.',
      },
      es: {
        name: 'Dragón Maestro',
        description: 'Dragón supremo que comanda a todos los demás.',
      },
    },
    golden_dragon: {
      pt: {
        name: 'Dragão Dourado',
        description: 'Dragão radiante coberto de ouro fundido.',
      },
      es: {
        name: 'Dragón Dorado',
        description: 'Dragón radiante revestido de oro fundido.',
      },
    },
    silver_dragon: {
      pt: {
        name: 'Dragão Prateado',
        description: 'Dragão veloz cujas escamas brilham como prata.',
      },
      es: {
        name: 'Dragón Plateado',
        description: 'Dragón veloz cuyas escamas brillan como la plata.',
      },
    },
    bronze_dragon: {
      pt: {
        name: 'Dragão de Bronze',
        description: 'Dragão guardião forjado em armadura de bronze.',
      },
      es: {
        name: 'Dragón de Bronce',
        description: 'Dragón guardián forjado con armadura de bronce.',
      },
    },
    copper_dragon: {
      pt: {
        name: 'Dragão de Cobre',
        description: 'Dragão ancião com asas revestidas de cobre.',
      },
      es: {
        name: 'Dragón de Cobre',
        description: 'Dragón anciano con alas recubiertas de cobre.',
      },
    },
    white_dragon: {
      pt: {
        name: 'Dragão Branco',
        description: 'Dragão gélido que cospe chamas geladas.',
      },
      es: {
        name: 'Dragón Blanco',
        description: 'Dragón helado que exhala llamas heladas.',
      },
    },
    black_dragon: {
      pt: {
        name: 'Dragão Negro',
        description: 'Dragão das sombras coberto por escamas da meia-noite.',
      },
      es: {
        name: 'Dragón Negro',
        description: 'Dragón de las sombras cubierto de escamas de medianoche.',
      },
    },
    red_dragon: {
      pt: {
        name: 'Dragão Vermelho',
        description: 'Dragão feroz que incinera o campo de batalha.',
      },
      es: {
        name: 'Dragón Rojo',
        description: 'Dragón feroz que calcina el campo de batalla.',
      },
    },
    blue_dragon: {
      pt: {
        name: 'Dragão Azul',
        description:
          'Dragão que cospe tempestades, envolto em névoa de safira.',
      },
      es: {
        name: 'Dragón Azul',
        description:
          'Dragón que exhala tormentas, envuelto en niebla de zafiro.',
      },
    },
    green_dragon: {
      pt: {
        name: 'Dragão Verde',
        description: 'Guardião da floresta que comanda ventos de esmeralda.',
      },
      es: {
        name: 'Dragón Verde',
        description: 'Guardián del bosque que comanda vientos de esmeralda.',
      },
    },
    knight: {
      pt: {
        name: 'Cavaleiro',
        description: 'Cavaleiro valente que jurou proteger o reino.',
      },
      es: {
        name: 'Caballero',
        description: 'Caballero valiente que juró proteger el reino.',
      },
    },
    colossus: {
      pt: {
        name: 'Colosso',
        description: 'Sentinela colossal feito de pedra viva.',
      },
      es: {
        name: 'Coloso',
        description: 'Centinela colosal construido de piedra viva.',
      },
    },
    sorceress: {
      pt: {
        name: 'Feiticeira',
        description: 'Heroína mística que domina rituais ancestrais.',
      },
      es: {
        name: 'Hechicera',
        description: 'Heroína mística que domina rituales ancestrales.',
      },
    },
    warrioress: {
      pt: {
        name: 'Guerreira',
        description: 'Guerreira destemida que lidera a linha de frente.',
      },
      es: {
        name: 'Guerrera',
        description: 'Guerrera intrépida que lidera la primera línea.',
      },
    },
    warrior: {
      pt: {
        name: 'Guerreiro',
        description: 'Veterano experiente empunhando lâminas gêmeas.',
      },
      es: {
        name: 'Guerrero',
        description: 'Veterano curtido que empuña espadas gemelas.',
      },
    },
    hero: {
      pt: {
        name: 'Herói',
        description: 'Campeão lendário de incontáveis batalhas.',
      },
      es: {
        name: 'Héroe',
        description: 'Campeón legendario de incontables batallas.',
      },
    },
    werewolf: {
      pt: {
        name: 'Lobisomem',
        description: 'Caçador lupino que ataca sob a lua cheia.',
      },
      es: {
        name: 'Hombre Lobo',
        description: 'Cazador lobuno que ataca bajo la luna llena.',
      },
    },
    mage: {
      pt: {
        name: 'Mago',
        description: 'Erudito arcano que dobra o fogo à sua vontade.',
      },
      es: {
        name: 'Mago',
        description: 'Erudito arcano que doblega el fuego a su voluntad.',
      },
    },
    merlin: {
      pt: {
        name: 'Merlin',
        description: 'Mago icônico de lendas e histórias.',
      },
      es: {
        name: 'Merlín',
        description: 'Mago icónico de leyendas y relatos.',
      },
    },
    mummy: {
      pt: {
        name: 'Múmia',
        description: 'Guardião amaldiçoado envolto em linho eterno.',
      },
      es: {
        name: 'Momia',
        description: 'Guardián maldito envuelto en lino eterno.',
      },
    },
    pegasus: {
      pt: { name: 'Pégaso', description: 'Corcel alado que cruza os céus.' },
      es: { name: 'Pegaso', description: 'Corcel alado que surca los cielos.' },
    },
    sorcerer: {
      pt: {
        name: 'Feiticeiro',
        description: 'Conjurador devoto que canaliza fogo celestial.',
      },
      es: {
        name: 'Hechicero',
        description: 'Hechicero devoto que canaliza fuego celestial.',
      },
    },
    shadow: {
      pt: { name: 'Sombra', description: 'Aparição etérea vinda do vazio.' },
      es: {
        name: 'Sombra',
        description: 'Aparición etérea surgida del vacío.',
      },
    },
    barbarian: {
      pt: {
        name: 'Bárbaro',
        description: 'Guerreiro selvagem do norte gélido.',
      },
      es: {
        name: 'Bárbaro',
        description: 'Guerrero salvaje del norte helado.',
      },
    },
    viking: {
      pt: {
        name: 'Viking',
        description: 'Saqueador dos mares de espírito indomável.',
      },
      es: {
        name: 'Vikingo',
        description: 'Saqueador de los mares con espíritu indomable.',
      },
    },
    witch: {
      pt: {
        name: 'Bruxa',
        description: 'Bruxa enigmática que tece maldições e fogo.',
      },
      es: {
        name: 'Bruja',
        description: 'Bruja enigmática que teje maleficios y fuego.',
      },
    },
    elf: {
      pt: {
        name: 'Elfo',
        description: 'Arqueiro ágil dotado de graça atemporal.',
      },
      es: {
        name: 'Elfo',
        description: 'Arquero ágil dotado de una gracia atemporal.',
      },
    },
    angel: {
      pt: {
        name: 'Anjo',
        description: 'Arauto radiante que empunha a luz sagrada.',
      },
      es: {
        name: 'Ángel',
        description: 'Heraldo radiante que empuña la luz sagrada.',
      },
    },
    lava_giant: {
      pt: {
        name: 'Gigante de Lava',
        description: 'Colosso de lava nascido dos vulcões.',
      },
      es: {
        name: 'Gigante de Lava',
        description: 'Coloso de lava nacido de los volcanes.',
      },
    },
    skeleton: {
      pt: {
        name: 'Esqueleto',
        description: 'Guerreiro reanimado que chocalha com malícia.',
      },
      es: {
        name: 'Esqueleto',
        description: 'Guerrero reanimado que traquetea con malicia.',
      },
    },
    ogre: {
      pt: {
        name: 'Ogro',
        description: 'Ogro brutal que depende da força bruta.',
      },
      es: {
        name: 'Ogro',
        description: 'Ogro brutal que confía en la fuerza bruta.',
      },
    },
    unicorn: {
      pt: {
        name: 'Unicórnio',
        description: 'Unicórnio mítico que cura a terra.',
      },
      es: {
        name: 'Unicornio',
        description: 'Unicornio mítico que sana la tierra.',
      },
    },
  };

  const seededCards = await prisma.card.findMany({
    where: { collectionId: dracomaniaCollection.id },
    select: { id: true, code: true },
  });
  const cardIdByCode = new Map(seededCards.map((card) => [card.code, card.id]));

  let translationCount = 0;
  for (const [code, byLocale] of Object.entries(cardTranslations)) {
    const cardId = cardIdByCode.get(code);
    if (!cardId) continue;
    for (const [locale, value] of Object.entries(byLocale)) {
      await prisma.cardTranslation.upsert({
        where: { cardId_locale: { cardId, locale } },
        update: { name: value.name, description: value.description },
        create: {
          cardId,
          locale,
          name: value.name,
          description: value.description,
        },
      });
      translationCount += 1;
    }
  }

  console.log(`✅ Card translations seeded: ${translationCount}`);
}

main()
  .catch((caughtError: any) => {
    const errorToLog =
      caughtError instanceof Error
        ? caughtError
        : new Error(String(caughtError));
    console.error(errorToLog);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
