export interface Card {
    id: string
    name: string
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
      logo: require('./logos/kaufland.png'),
    },
  ]
  