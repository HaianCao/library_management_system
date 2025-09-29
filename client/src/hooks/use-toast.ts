/**
 * ========================================================================
 * TOAST NOTIFICATION SYSTEM - HỆ THỐNG THÔNG BÁO TOAST
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Hook quản lý toast notifications với reducer pattern.
 * Sử dụng global state và timeout management cho auto-dismiss.
 * Based on shadcn/ui toast component.
 */
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

/**
 * ========================================================================
 * CONFIGURATION - CẤU HÌNH
 * ========================================================================
 */

const TOAST_LIMIT = 1                     // Chỉ hiển thị 1 toast tại một thời điểm
const TOAST_REMOVE_DELAY = 1000000       // Delay rất lớn → manual dismiss only

/**
 * ========================================================================
 * TYPES - ĐỊNH NGHĨA TYPES
 * ========================================================================
 */

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

// Action types cho reducer pattern
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

/**
 * ========================================================================
 * ID GENERATION - TẠO ID
 * ========================================================================
 */

let count = 0

/**
 * Generate unique ID cho mỗi toast
 * Sử dụng counter với safe integer limit để tránh overflow
 */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

/**
 * Reducer actions cho toast state management
 */
type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

/**
 * Global state structure cho toast system
 */
interface State {
  toasts: ToasterToast[]
}

/**
 * ========================================================================
 * TIMEOUT MANAGEMENT - QUẢN LÝ TIMEOUT
 * ========================================================================
 */

// Map để track timeouts cho auto-dismiss của từng toast
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Thêm toast vào queue để auto-remove sau delay
 * Sử dụng setTimeout để schedule removal
 * 
 * @param toastId - ID của toast cần remove
 */
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return                                // Đã có timeout cho toast này
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

/**
 * ========================================================================
 * REDUCER FUNCTION - HÀM REDUCER
 * ========================================================================
 */

/**
 * Reducer function quản lý toast state với 4 action types
 * 
 * Actions:
 * - ADD_TOAST: Thêm toast mới, giới hạn theo TOAST_LIMIT
 * - UPDATE_TOAST: Update properties của toast đã tồn tại
 * - DISMISS_TOAST: Bắt đầu dismiss process (set open=false, schedule remove)
 * - REMOVE_TOAST: Remove toast khỏi state hoàn toàn
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        // Thêm toast mới vào đầu array, slice để tuân thủ TOAST_LIMIT
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        // Update toast với matching ID, merge properties
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // Side effect: Schedule removal sau delay
      // TODO: Có thể extract thành separate action để pure function
      if (toastId) {
        addToRemoveQueue(toastId)         // Dismiss specific toast
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)      // Dismiss tất cả toasts
        })
      }

      return {
        ...state,
        // Set open=false để trigger close animation
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],                     // Clear tất cả toasts
        }
      }
      return {
        ...state,
        // Remove specific toast khỏi array
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

/**
 * ========================================================================
 * GLOBAL STATE MANAGEMENT - QUẢN LÝ STATE GLOBAL
 * ========================================================================
 */

// Array của callback functions để notify components khi state thay đổi
const listeners: Array<(state: State) => void> = []

// Global state outside của React component tree
let memoryState: State = { toasts: [] }

/**
 * Dispatch action và notify tất cả listeners
 * 
 * @param action - Action object để update state
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)                 // Notify các components subscribing
  })
}

/**
 * ========================================================================
 * TOAST CREATION FUNCTION - HÀM TẠO TOAST
 * ========================================================================
 */

type Toast = Omit<ToasterToast, "id">

/**
 * Main function để tạo và hiển thị toast notification
 * 
 * @param props - Toast properties (title, description, variant, etc.)
 * @returns Object với id, dismiss, và update functions
 */
function toast({ ...props }: Toast) {
  const id = genId()

  // Helper function để update toast đã tồn tại
  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  
  // Helper function để dismiss toast này
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  // Dispatch ADD_TOAST để hiển thị toast
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()              // Auto-dismiss khi user close
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

/**
 * ========================================================================
 * REACT HOOK - HOOK REACT
 * ========================================================================
 */

/**
 * React hook để access toast state và functions
 * 
 * Features:
 * - Subscribe/unsubscribe tự động với global state
 * - Return current toasts array
 * - Provide toast function để tạo toasts mới
 * - Provide dismiss function để dismiss toasts
 * 
 * @returns Object chứa toasts array và utility functions
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    // Subscribe component này với global state changes
    listeners.push(setState)
    
    // Cleanup subscription on unmount
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,                             // toasts array từ state
    toast,                                // Function để tạo toast mới
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
