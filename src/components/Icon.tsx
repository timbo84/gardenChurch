import React from 'react'
import IoniconLib from 'react-native-vector-icons/Ionicons'

type Props = {
  name: string
  size?: number
  color?: string
  style?: object
}

export default function Icon({ name, size = 16, color = '#6B7280', style }: Props) {
  return <IoniconLib name={name} size={size} color={color} style={style} />
}
