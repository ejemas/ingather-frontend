import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function Opener({ onConfirm, onCancel }) {
  const toast = useToast();
  return <button type="button" onClick={() => toast.confirm('You need to confirm your email address.', onConfirm, onCancel, { title: 'Verify your email first', confirmLabel: 'Verify email', cancelLabel: 'Not now' })}>open</button>;
}

test('the confirm pop-up shows its own title and buttons and runs the choice', () => {
  const onConfirm = jest.fn();
  render(<ToastProvider><Opener onConfirm={onConfirm} /></ToastProvider>);
  fireEvent.click(screen.getByText('open'));
  expect(screen.getByRole('alertdialog', { name: 'Verify your email first' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
  expect(onConfirm).toHaveBeenCalled();
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

test('Escape and "Not now" close it without confirming', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(<ToastProvider><Opener onConfirm={onConfirm} onCancel={onCancel} /></ToastProvider>);
  fireEvent.click(screen.getByText('open'));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onCancel).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('open'));
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  expect(onCancel).toHaveBeenCalledTimes(2);
  expect(onConfirm).not.toHaveBeenCalled();
});
