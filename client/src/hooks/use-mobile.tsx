/**
 * ========================================================================
 * MOBILE DETECTION HOOK - HOOK DETECT MOBILE DEVICE
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Hook để detect screen size và xác định xem đang ở mobile device hay không.
 * Sử dụng window.matchMedia API để responsive design.
 */
import * as React from "react"

// Breakpoint cho mobile screens (< 768px theo Tailwind md breakpoint)
const MOBILE_BREAKPOINT = 768

/**
 * Hook detect mobile screen size
 * 
 * Features:
 * - Sử dụng matchMedia API cho performance tốt
 * - Listen resize events để update real-time
 * - Return boolean để dễ sử dụng trong components
 * 
 * Initial state: undefined → prevent hydration mismatch
 * Subsequently: true/false based on screen width
 * 
 * @returns boolean - true nếu screen width < 768px (mobile)
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Create media query để track screen size changes
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Event handler cho window resize
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Listen cho media query changes
    mql.addEventListener("change", onChange)
    
    // Set initial value
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Cleanup listener on unmount
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Convert undefined → false để đảm bảo boolean return type
  return !!isMobile
}
