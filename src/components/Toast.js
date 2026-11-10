import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
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
        // Keep at most three on screen; the oldest goes first.
        setToasts(prev => [...prev.slice(-2), { id, message, type, exiting: false }]);
        // Problems stay a little longer so there is time to read them.
        setTimeout(() => removeToast(id), type === 'error' || type === 'warning' ? 6000 : 4000);
        return id;
    }, [removeToast]);

    // options: { title, confirmLabel, cancelLabel, tone: 'primary' | 'danger' | 'neutral' }
    const showConfirm = useCallback((message, onConfirm, onCancel, options = {}) => {
        setConfirmDialog({ message, onConfirm, onCancel, ...options });
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
        confirm: (msg, onConfirm, onCancel, options) => showConfirm(msg, onConfirm, onCancel, options),
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
                <ConfirmDialog dialog={confirmDialog} onConfirm={handleConfirm} onCancel={handleCancel} />
            )}
        </ToastContext.Provider>
    );
}

const CONFIRM_ICONS = {
    primary: <path d="M12 8v5M12 16h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />,
    danger: <path d="M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />,
    neutral: <path d="M12 8v5M12 16h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />,
};

function ConfirmDialog({ dialog, onConfirm, onCancel }) {
    const dialogRef = useRef(null);
    const tone = CONFIRM_ICONS[dialog.tone] ? dialog.tone : 'primary';

    useEffect(() => {
        dialogRef.current?.focus();
        const onKey = (event) => { if (event.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel]);

    return (
        <div className="ig-cf-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
            <div className="ig-cf" ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="ig-cf-title" aria-describedby="ig-cf-message">
                <span className={`ig-cf-icon is-${tone}`} aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{CONFIRM_ICONS[tone]}</svg>
                </span>
                <h2 id="ig-cf-title">{dialog.title || 'Are you sure?'}</h2>
                <p id="ig-cf-message">{dialog.message}</p>
                <div className="ig-cf-actions">
                    <button type="button" className="ig-cf-btn is-ghost" onClick={onCancel}>{dialog.cancelLabel || 'Cancel'}</button>
                    <button type="button" className={`ig-cf-btn is-${tone}`} onClick={onConfirm}>{dialog.confirmLabel || 'Continue'}</button>
                </div>
            </div>
        </div>
    );
}

const TOAST_ICONS = {
    success: <path d="M5 12l5 5 9-10" />,
    error: <path d="M7 7l10 10M17 7L7 17" />,
    warning: <path d="M12 6v8M12 18h.01" />,
    info: <path d="M12 11v7M12 6h.01" />,
};

function ToastItem({ toast, onClose }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
    }, []);

    const type = TOAST_ICONS[toast.type] ? toast.type : 'info';
    const urgent = type === 'error' || type === 'warning';

    return (
        <div
            className={`toast-item toast-${type} ${visible && !toast.exiting ? 'toast-enter' : ''} ${toast.exiting ? 'toast-exit' : ''}`}
            role={urgent ? 'alert' : 'status'}
            aria-live={urgent ? 'assertive' : 'polite'}
        >
            <span className="toast-icon" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{TOAST_ICONS[type]}</svg>
            </span>
            <span className="toast-message">{toast.message}</span>
            <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss">×</button>
        </div>
    );
}
