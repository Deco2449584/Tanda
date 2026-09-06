export function isRemotePhotoUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}
