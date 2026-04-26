import { Linking, Alert } from 'react-native'

export async function openMailto(url: string, fallbackEmail?: string) {
  try {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      const email = fallbackEmail || url.replace(/^mailto:/, '').split('?')[0]
      Alert.alert(
        'No Email App Found',
        `Please send an email to:\n${email}`,
        [{ text: 'OK' }]
      )
    }
  } catch {
    const email = fallbackEmail || url.replace(/^mailto:/, '').split('?')[0]
    Alert.alert(
      'No Email App Found',
      `Please send an email to:\n${email}`,
      [{ text: 'OK' }]
    )
  }
}
