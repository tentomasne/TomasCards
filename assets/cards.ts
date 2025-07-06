export interface Card {
    id: string
    name: string
    popular?: boolean
    logo: any 
    type: 'barcode' | 'qrcode'
    country?: Array<string>
    color: string
  }
  
  export const POPULAR_CARDS: Card[] = [
    {
      id: 'kaufland',
      name: 'Kaufland',
      type: 'barcode',
      color: '#E4002B',
      popular: true,
      logo: require('./logos/kaufland.png'),
    },
    {
      id: 'tesco',
      name: 'Tesco',
      type: 'barcode',
      color: '#00539F',
      popular: true,
      logo: require('./logos/tesco.png'),
    },
    {
      id: 'billa',
      name: 'Billa',
      type: 'barcode',
      color: '#FFD700',
      popular: true,
      logo: require('./logos/billa.png'),
    },
    {
      id: 'albert',
      name: 'Albert',
      type: 'qrcode',
      color: '#0078D7',
      popular: false,
      logo: require('./logos/albert.png'),
    },
    {
      id: 'lidl',
      name: 'Lidl',
      type: 'qrcode',
      color: '#00509E',
      popular: true,
      logo: require('./logos/lidl.png'),
    },
    {
      id: 'penny',
      name: 'Penny Market',
      type: 'barcode',
      color: '#E30613',
      popular: false,
      logo: require('./logos/penny.png'),
    },
    {
      id: 'coopjednota',
      name: 'Coop Jednota',
      type: 'barcode',
      color: '#009245',
      popular: true,
      logo: require('./logos/coopjednota.png'),
    }
  ]
  