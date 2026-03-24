import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

/** Typed dispatch — use instead of plain `useDispatch()` */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()

/** Typed selector — use instead of plain `useSelector()` */
export const useAppSelector = useSelector.withTypes<RootState>()
