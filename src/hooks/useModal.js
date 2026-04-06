import { useState, useCallback } from 'react'

export function useModal() {
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', defaultValue: '', resolve: null })

  const requestPrompt = useCallback((title, defaultValue = '') => {
    return new Promise(resolve => setModal({ isOpen: true, type: 'prompt', title, message: '', defaultValue, resolve }))
  }, [])

  const requestConfirm = useCallback((title, message) => {
    return new Promise(resolve => setModal({ isOpen: true, type: 'confirm', title, message, defaultValue: '', resolve }))
  }, [])

  const showAlert = useCallback((title, message) => {
    setModal({ isOpen: true, type: 'alert', title, message, defaultValue: '', resolve: null })
  }, [])

  const handleModalAction = (isConfirm) => {
    if (modal.resolve) {
      if (modal.type === 'prompt') {
        const inputVal = document.getElementById('custom-modal-input')?.value
        modal.resolve(isConfirm ? inputVal : null)
      } else {
        modal.resolve(isConfirm)
      }
    }
    setModal(m => ({ ...m, isOpen: false }))
  }

  return { modal, requestPrompt, requestConfirm, showAlert, handleModalAction }
}