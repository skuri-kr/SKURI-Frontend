import type {RenderersProps as BaseRenderersProps} from 'react-native-render-html';

declare module 'react-native-render-html' {
  interface RenderersProps {
    img?: BaseRenderersProps['img'] & {
      onImagePress?: (uri: string) => void;
      onImageLoaded?: (payload: { url: string; width: number; height: number }) => void;
    };
  }
}
