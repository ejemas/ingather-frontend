import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import './Toast.css';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

let toastIdCounter = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
    }, []);

    const showToast = useCallback((message, type = 'success') => {
        const id = ++toastIdCounter;
        setToasts(prev => [...prev, { id, message, type, exiting: false }]);
        setTimeout(() => removeToast(id), 4000);
        return id;
    }, [removeToast]);

    const showConfirm = useCallback((message, onConfirm, onCancel) => {
        setConfirmDialog({ message, onConfirm, onCancel });
    }, []);

    const handleConfirm = useCallback(() => {
        if (confirmDialog?.onConfirm) confirmDialog.onConfirm();
        setConfirmDialog(null);
    }, [confirmDialog]);

    const handleCancel = useCallback(() => {
        if (confirmDialog?.onCancel) confirmDialog.onCancel();
        setConfirmDialog(null);
    }, [confirmDialog]);

    const toast = useMemo(() => ({
        success: (msg) => showToast(msg, 'success'),
        error: (msg) => showToast(msg, 'error'),
        info: (msg) => showToast(msg, 'info'),
        warning: (msg) => showToast(msg, 'warning'),
        confirm: (msg, onConfirm, onCancel) => showConfirm(msg, onConfirm, onCancel),
    }), [showToast, showConfirm]);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
                ))}
            </div>
            {confirmDialog && (
                <div className="confirm-overlay" onClick={handleCancel}>
                    <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                        <div className="confirm-icon">⚠️</div>
                        <p className="confirm-message">{confirmDialog.message}</p>
                        <div className="confirm-actions">
                            <button className="confirm-btn confirm-cancel" onClick={handleCancel}>Cancel</button>
                            <button className="confirm-btn confirm-ok" onClick={handleConfirm}>Yes, Continue</button>
                        </div>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onClose }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
    }, []);

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️',
    };

    return (
        <div className={`toast-item toast-${toast.type} ${visible && !toast.exiting ? 'toast-enter' : ''} ${toast.exiting ? 'toast-exit' : ''}`}>
            <span className="toast-icon">{icons[toast.type]}</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={onClose}>×</button>
        </div>
    );
}
