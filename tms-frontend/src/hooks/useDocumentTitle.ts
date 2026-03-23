import { useEffect } from 'react'

const APP_NAME = 'TMS'

/**
 * Sets document.title to `"<title> | TMS"` while the calling component is mounted.
 * Restores the default title on unmount.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
    return () => {
      document.title = APP_NAME
    }
  }, [title])
}
