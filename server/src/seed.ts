// Демо-каталог обжарочной. Для реального клиента замените на его товары.
import type { Category } from './types.ts';

export const seedCategories: Category[] = [
  { id: 'coffee', name: 'Кофе' },
  { id: 'drip', name: 'Дрип-пакеты' },
  { id: 'tea', name: 'Чай' },
  { id: 'gear', name: 'Для заваривания' }
];

export const seedProducts = [
  { categoryId: 'coffee', name: 'Эфиопия Иргачеффе', description: 'Яркий и чайный: бергамот, жасмин, лимонная цедра. Светлая обжарка для фильтра.', unit: '250 г', price: 990, emoji: '☕', color: '#f3d9b1', inStock: true },
  { categoryId: 'coffee', name: 'Колумбия Супремо', description: 'Сбалансированный: молочный шоколад, орех, карамель. Подходит для эспрессо и турки.', unit: '250 г', price: 790, emoji: '☕', color: '#e6c49f', inStock: true },
  { categoryId: 'coffee', name: 'Кения АА', description: 'Сочная кислотность: чёрная смородина, грейпфрут, тростниковый сахар.', unit: '250 г', price: 1150, emoji: '☕', color: '#efc7b8', inStock: true },
  { categoryId: 'coffee', name: 'Бразилия Сантос', description: 'Плотный и сладкий: какао, жареный фундук. Хорош с молоком.', unit: '1 кг', price: 2490, emoji: '☕', color: '#d9b994', inStock: true },
  { categoryId: 'coffee', name: 'Гватемала Антигуа', description: 'Специи, тёмный шоколад, яблоко. Временно нет в наличии.', unit: '250 г', price: 890, emoji: '☕', color: '#dcc3a8', inStock: false },
  { categoryId: 'drip', name: 'Дрип-набор «Ассорти»', description: '10 дрип-пакетов пяти сортов: удобно в офисе и в дороге.', unit: '10 шт', price: 650, emoji: '🫖', color: '#cfe0d0', inStock: true },
  { categoryId: 'drip', name: 'Дрип «Эфиопия»', description: 'Иргачеффе в дрип-пакетах: заварите прямо в кружке.', unit: '10 шт', price: 590, emoji: '🫖', color: '#d7e6cf', inStock: true },
  { categoryId: 'tea', name: 'Улун «Молочный»', description: 'Сливочный аромат, мягкий вкус. Можно заваривать до 5 раз.', unit: '100 г', price: 540, emoji: '🍵', color: '#d6e8c8', inStock: true },
  { categoryId: 'tea', name: 'Пуэр Шу 2018', description: 'Землистый и глубокий, с нотами сухофруктов.', unit: '100 г', price: 720, emoji: '🍵', color: '#c9d6b8', inStock: true },
  { categoryId: 'gear', name: 'Воронка V60', description: 'Керамическая воронка для пуровера на 1–2 чашки.', unit: '1 шт', price: 1890, emoji: '⚗️', color: '#d8dbe8', inStock: true },
  { categoryId: 'gear', name: 'Фильтры для V60', description: 'Бумажные фильтры, 100 штук.', unit: '100 шт', price: 490, emoji: '📄', color: '#e4e2dc', inStock: true },
  { categoryId: 'gear', name: 'Ручная кофемолка', description: 'Стальные жернова, 40 ступеней помола.', unit: '1 шт', price: 4990, emoji: '⚙️', color: '#d3d6db', inStock: true }
];
