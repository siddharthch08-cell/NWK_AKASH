import Image, { type ImageProps } from 'next/image'

type ExternalImageProps = Omit<ImageProps, 'height' | 'loader' | 'unoptimized' | 'width'> & {
  height?: number
  width?: number
}

/**
 * Renders administrator-provided remote images without proxying arbitrary URLs
 * through the server-side image optimizer. Dimensions prevent layout shift;
 * Next.js still supplies lazy loading and async decoding by default.
 */
export function ExternalImage({ alt, height = 720, width = 1280, ...props }: ExternalImageProps) {
  return <Image {...props} alt={alt} height={height} width={width} unoptimized />
}