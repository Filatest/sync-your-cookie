declare global {
  interface Window {
    __INC_SYNC__?: {
      refreshIncognitoStorage?: () => void;
    };
  }
}
export { };

