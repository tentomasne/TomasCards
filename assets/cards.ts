export interface Card {
    id: string
    name: string
    popular?: boolean
    logo: any 
    type: 'barcode' | 'qrcode'
    color: string
  }
  
  export const POPULAR_CARDS: Card[] = [
    {
      id: 'kaufland',
      name: 'Kaufland',
      type: 'barcode',
      color: 'red',
      popular: false,
      logo: require('./logos/kaufland.png'),
    },
    {
      id: 'tesco',
      name: 'Tesco',
      type: 'barcode',
      color: 'blue',
      popular: true,
      logo: require('./logos/tesco.png'),
    }
  ]
  