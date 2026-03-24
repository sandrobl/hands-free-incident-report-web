import { useEffect, useState, useRef, ImgHTMLAttributes } from 'react';
import { useApi } from '../hooks/useApi';

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export default function AuthedImg({ src, ...rest }: Props) {
  const { authImgFetch }              = useApi();
  const [objectUrl, setObjectUrl]     = useState<string | null>(null);
  const currentUrlRef                 = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    authImgFetch(src).then(url => {
      if (!cancelled && url) {
        currentUrlRef.current = url;
        setObjectUrl(url);
      }
    });

    return () => {
      cancelled = true;
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    };
  // authImgFetch is stable (useCallback over stable getToken); src is the meaningful dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!objectUrl) return null;
  return <img src={objectUrl} {...rest} />;
}
