export type Screen = 'idle' | 'initial' | 'confirmed_safe' | 'dispatch_status'

export interface Zone {
  id: string
  polygon: {
    type: 'Polygon'
    coordinates: number[][][]
  }
}
