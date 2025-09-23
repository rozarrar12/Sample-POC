import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "absolute"
    textArea.style.left = "-999999px"
    document.body.prepend(textArea)
    textArea.select()
    try {
      document.execCommand("copy")
    } catch (error) {
      console.error("Failed to copy text: ", error)
    } finally {
      textArea.remove()
    }
    return Promise.resolve()
  }
}
